import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, resolveApiUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ExamSessionQuestion } from '../types';
import DiagramRenderer from '../components/DiagramRenderer';
import OptimizedImage, { resolveQuestionImageUrl } from '../components/OptimizedImage';
import { shouldShowQuestionImageBeforeAnswer } from '../utils/questionImages';
import { getQuestionAudioSource, preloadQuestionAudio } from '../utils/questionAudio';
import { getCachedQuestionAudioPromptSource, playQuestionAudioPrompt, preloadQuestionAudioPrompt, stopQuestionAudioPrompt } from '../utils/questionAudioPrompts';

const DURATION = 15 * 60;
const OPTION_NUMBERS = ['١', '٢', '٣', '٤', '٥', '٦'];

const UiIcon = ({name}:{name:'back'|'next'|'finish'|'check'}) => {
  const common={width:19,height:19,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(name==='back') return <svg {...common}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>;
  if(name==='next') return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  if(name==='finish') return <svg {...common}><path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
};

export default function Exam() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [questions, setQuestions] = useState<ExamSessionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(DURATION);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState('1');
  const finishedRef = useRef(false);
  const questionsRef = useRef<ExamSessionQuestion[]>([]);
  const answersRef = useRef<Record<number, number>>({});
  const loadSequenceRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioContinuousRef = useRef(false);
  const audioModeRef = useRef<'question' | 'enabled-prompt' | 'disabled-prompt' | null>(null);
  const [adminImageBusy, setAdminImageBusy] = useState<'approve' | 'reject' | 'hide' | 'delete' | null>(null);
  const [showDiagram, setShowDiagram] = useState(true);
  const [adminImageToolsFor, setAdminImageToolsFor] = useState<'original' | 'ai' | null>(null);
  const [introAudioPlaying, setIntroAudioPlaying] = useState(false);
  const [introAudioMessage, setIntroAudioMessage] = useState<string | null>(null);

  questionsRef.current = questions;
  answersRef.current = answers;

  const loadExam = useCallback(async () => {
    const id = Number(modelId) || 1;
    const sequence = ++loadSequenceRef.current;
    setLoading(true);
    setLoadError(null);
    setAttemptId(null);
    setExpiresAt(null);

    try {
      const session = await api.startExamAttempt(id);
      if (sequence !== loadSequenceRef.current) return;
      if (session.questions.length !== 30) throw new Error('تعذر تجهيز ٣٠ سؤالاً للاختبار.');

      setQuestions(session.questions);
      setAnswers(session.answers);
      const firstUnanswered = session.questions.findIndex(
        question => session.answers[question.id] === undefined
      );
      setCurrent(firstUnanswered >= 0 ? firstUnanswered : 0);
      setExpiresAt(session.expiresAt);
      setSeconds(Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000)));
      setAttemptId(session.attemptId);
      setJumpOpen(false);
      setJumpValue('1');
      questionsRef.current = session.questions;
      answersRef.current = session.answers;
      finishedRef.current = false;
    } catch (err) {
      if (sequence === loadSequenceRef.current) {
        setLoadError(err instanceof Error ? err.message : 'تعذر تحميل الاختبار.');
      }
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  }, [modelId]);

  useEffect(() => { void loadExam(); }, [loadExam]);

  useEffect(() => {
    setShowExplanatoryImage(true);
    setShowDiagram(true);
    setAdminImageToolsFor(null);
  }, [current]);

  useEffect(() => {
    preloadQuestionAudioPrompt('question-audio-first-entry');
    preloadQuestionAudioPrompt('question-audio-enabled');
    preloadQuestionAudioPrompt('question-audio-disabled');
  }, []);


  const finish = useCallback(async () => {
    const currentAttemptId = attemptId;
    const currentAnswers = answersRef.current;
    if (finishedRef.current || !currentAttemptId || !questionsRef.current.length) return;

    finishedRef.current = true;

    try {
      const submission = await api.submitExamAttempt(currentAttemptId, currentAnswers);
      try { sessionStorage.setItem('driving:last-result-attempt-id', String(submission.id)); } catch { /* storage may be unavailable */ }
      navigate('/result', {
        state: {
          correct: submission.correct,
          total: submission.total,
          answered: submission.answered,
          reviewQuestions: submission.reviewQuestions.map(item => ({
            question: {
              id: item.id,
              text: item.text,
              options: item.options,
              correctAnswerIndex: item.correctAnswerIndex,
              explanation: item.explanation,
              imageUrl: item.imageUrl,
              aiImageUrl: item.aiImageUrl,
              diagramType: item.diagramType,
              diagramUrl: item.diagramUrl,
              diagramTitle: item.diagramTitle,
              diagramDescription: item.diagramDescription,
            },
            chosen: item.chosenAnswerIndex,
          })),
          modelId: submission.modelId,
        },
      });
    } catch (err) {
      finishedRef.current = false;
      setLoadError(err instanceof Error ? err.message : 'تعذر حفظ نتيجة الاختبار.');
    }
  }, [attemptId, navigate]);

  const playSystemPromptOnMainAudio = useCallback(async (key: 'question-audio-enabled' | 'question-audio-disabled') => {
    const audio = audioRef.current;
    if (!audio) return false;
    audioModeRef.current = key === 'question-audio-enabled' ? 'enabled-prompt' : 'disabled-prompt';
    audio.pause();
    audio.src = getCachedQuestionAudioPromptSource(key) ?? resolveApiUrl(`/api/questions/audio-prompt/${key}`);
    audio.preload = 'auto';
    audio.load();
    audio.currentTime = 0;
    try {
      await audio.play();
      setAudioPlaying(true);
      setAudioError(null);
      return true;
    } catch (error) {
      audioModeRef.current = null;
      setAudioPlaying(false);
      setAudioError(error instanceof Error ? error.message : 'تعذر تشغيل رسالة الصوت.');
      return false;
    }
  }, []);

  const currentAudioPath = questions[current]?.audioUrl ?? null;
  const currentAudioUrl = currentAudioPath ? resolveApiUrl(currentAudioPath) : null;
  const nextAudioPath = questions[current + 1]?.audioUrl ?? null;
  const nextAudioUrl = nextAudioPath ? resolveApiUrl(nextAudioPath) : null;
  const nextQuestionImageUrl = questions[current + 1]?.imageUrl
    ? resolveQuestionImageUrl(questions[current + 1].imageUrl)
    : null;
  const nextQuestionAiImageUrl = questions[current + 1]?.aiImageUrl
    ? resolveApiUrl(questions[current + 1].aiImageUrl!)
    : null;

  const playCurrentQuestionAudio = useCallback(async (url: string | null) => {
    const audio = audioRef.current;
    if (!audio || !url || !audioContinuousRef.current || url !== currentAudioUrl) return false;
    try {
      const source = await getQuestionAudioSource(url);
      if (!audioContinuousRef.current || url !== currentAudioUrl) return false;
      if (audio.src !== source) {
        audio.src = source;
        audio.preload = 'auto';
        audio.load();
      }
      audio.currentTime = 0;
      audioModeRef.current = 'question';
      await audio.play();
      setAudioPlaying(true);
      setAudioError(null);
      return true;
    } catch (error) {
      setAudioPlaying(false);
      setAudioError(error instanceof Error ? error.message : 'تعذر تشغيل ملف صوت السؤال.');
      return false;
    }
  }, [currentAudioUrl]);

  useEffect(() => {

    const audio = audioRef.current;
    if (!audio) return;

    let active = true;
    setAudioReady(false);
    setAudioPlaying(false);
    setAudioError(null);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    if (currentAudioUrl) {
      preloadQuestionAudio(currentAudioUrl);
      void getQuestionAudioSource(currentAudioUrl)
        .then(source => {
          if (!active) return;
          audio.src = source;
          audio.preload = 'auto';
          audio.load();
          setAudioReady(true);
          if (audioContinuousRef.current) {
            audioModeRef.current = 'question';
            audio.currentTime = 0;
            void audio.play()
              .then(() => { setAudioPlaying(true); setAudioError(null); })
              .catch(error => { setAudioPlaying(false); setAudioError(error instanceof Error ? error.message : 'تعذر تشغيل ملف صوت السؤال.'); });
          }
        })
        .catch(error => {
          if (!active) return;
          setAudioError(error instanceof Error ? error.message : String(error));
        });
    } else {
      setAudioError('لا يوجد صوت لهذا السؤال.');
    }

    preloadQuestionAudio(nextAudioUrl);
    if (nextQuestionImageUrl) {
      const image = new Image();
      image.decoding = 'async';
      image.src = nextQuestionImageUrl;
    }
    if (nextQuestionAiImageUrl) {
      const image = new Image();
      image.decoding = 'async';
      image.src = nextQuestionAiImageUrl;
    }

    return () => {
      active = false;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [currentAudioUrl, nextAudioUrl, nextQuestionImageUrl, nextQuestionAiImageUrl]);



  // Keep answer taps responsive: store choices in memory and submit once at the end.
  const chooseAnswer = useCallback((selectedAnswerIndex: number) => {
    const question = questionsRef.current[current];
    if (!question || !attemptId || finishedRef.current) return;
    const nextAnswers = { ...answersRef.current, [question.id]: selectedAnswerIndex };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
  }, [attemptId, current]);

  const goToQuestion = useCallback((nextIndex:number) => {
    setCurrent(currentIndex => {
      if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= questions.length) return currentIndex;
      return nextIndex;
    });
  }, [questions.length]);

  const jumpToQuestion = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requested = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(requested) || requested < 1 || requested > questions.length) return;
    setJumpOpen(false);
    goToQuestion(requested - 1);
  }, [goToQuestion, jumpValue, questions.length]);

  useEffect(() => {
    if (loading || !expiresAt) return;

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining <= 0) void finish();
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [loading, expiresAt, finish]);

  const playIntroAudio = () => {
    setIntroAudioMessage(null);
    void playQuestionAudioPrompt('question-audio-first-entry', () => {
      setIntroAudioPlaying(false);
      setIntroAudioMessage(null);
    }).then(played => {
      setIntroAudioPlaying(played);
      if (!played) setIntroAudioMessage('تعذر تشغيل الصوت. اضغط الزر للمحاولة مجدداً.');
    });
  };
  const stopIntroAudio = () => {
    stopQuestionAudioPrompt();
    setIntroAudioPlaying(false);
    setIntroAudioMessage(null);
  };

  if (loading) return <div className="ui-audio-welcome is-exam" dir="rtl" role="status" aria-live="polite"><section className="ui-audio-welcome__panel" aria-labelledby="exam-audio-welcome-title"><span className="ui-audio-welcome__mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg></span><p className="ui-audio-welcome__eyebrow">اختبار القيادة</p><h1 id="exam-audio-welcome-title">جاهز للانطلاق؟</h1><p className="ui-audio-welcome__copy">اضغط تشغيل الصوت إذا رغبت بسماع إرشادات قصيرة قبل البدء.</p><div className="ui-audio-welcome__controls"><button type="button" className={`ui-audio-welcome__play ${introAudioPlaying ? 'is-playing' : 'is-pulsing'}`} onClick={introAudioPlaying ? stopIntroAudio : playIntroAudio} aria-pressed={introAudioPlaying}>{introAudioPlaying ? '■ إيقاف الصوت' : '▶ تشغيل الصوت'}</button></div><p className="ui-audio-welcome__status" role="status" aria-live="polite">{introAudioMessage ?? (introAudioPlaying ? 'يتم تشغيل الإرشادات الصوتية الآن.' : 'اضغط الزر للاستماع.')}</p></section></div>;

  if(loadError||!questions.length)return <div className="page-shell flex items-center justify-center px-5"><div className="surface-panel w-full max-w-md text-center p-7"><div className="brand-mark mx-auto mb-4">ر</div><h1 className="text-xl font-black mb-2">تعذر تحضير الاختبار</h1><p className="text-muted text-sm leading-relaxed">{loadError??'لم يتم العثور على أسئلة.'}</p><button onClick={loadExam} className="primary-cta mt-5 w-full">إعادة المحاولة</button></div></div>;

  const q=questions[current]; const mm=String(Math.floor(seconds/60)).padStart(2,'0'); const ss=String(seconds%60).padStart(2,'0'); const isLast=current===questions.length-1;
  const showOriginalQuestionImage = Boolean(q.imageUrl && (isAdmin || shouldShowQuestionImageBeforeAnswer(q)));
  const hasDiagram = Boolean(q.diagramUrl && q.diagramType);
  const mediaTileCount = Number(Boolean(q.imageUrl)) + Number(Boolean(q.aiImageUrl)) + Number(hasDiagram);
  const mediaLayoutClass = mediaTileCount >= 3 ? 'has-three-media' : mediaTileCount === 2 ? 'has-two-images' : '';

  const hideOriginalImageForAdmin = async () => {
    if (!isAdmin || !q.imageUrl || adminImageBusy) return;
    setAdminImageBusy('hide');
    try {
      await api.admin.hideQuestionImage(q.id);
      setQuestions(items => items.map(item => item.id === q.id ? { ...item, imageUrl: null } : item));
      setAdminImageToolsFor(null);
    } finally {
      setAdminImageBusy(null);
    }
  };
  const removeOriginalImageForAdmin = async () => {
    if (!isAdmin || !q.imageUrl || adminImageBusy) return;
    if (!window.confirm('إزالة الصورة الأصلية من هذا السؤال؟')) return;
    setAdminImageBusy('delete');
    try {
      await api.admin.removeQuestionImage(q.id);
      setQuestions(items => items.map(item => item.id === q.id ? { ...item, imageUrl: null } : item));
      setAdminImageToolsFor(null);
    } finally {
      setAdminImageBusy(null);
    }
  };

  const updateCurrentAiImage = (next: string | null) => {
    setQuestions(items => items.map(item => item.id === q.id ? { ...item, aiImageUrl: next } : item));
  };
  const approveAiImageForAdmin = async () => {
    if (!isAdmin || !q.aiImageUrl || adminImageBusy) return;
    setAdminImageBusy('approve');
    try { await api.admin.approveAiImageReview(q.id); } finally { setAdminImageBusy(null); }
  };
  const rejectAiImageForAdmin = async () => {
    if (!isAdmin || !q.aiImageUrl || adminImageBusy) return;
    setAdminImageBusy('reject');
    try { await api.admin.rejectAiImageReview(q.id); updateCurrentAiImage(null); } finally { setAdminImageBusy(null); }
  };
  const hideAiImageForAdmin = async () => {
    if (!isAdmin || !q.aiImageUrl || adminImageBusy) return;
    setAdminImageBusy('hide');
    try { await api.admin.hideAiImageReview(q.id); updateCurrentAiImage(null); } finally { setAdminImageBusy(null); }
  };
  const deleteAiImageForAdmin = async () => {
    if (!isAdmin || !q.aiImageUrl || adminImageBusy) return;
    if (!window.confirm('حذف صورة AI من هذا السؤال؟')) return;
    setAdminImageBusy('delete');
    try { await api.admin.deleteAiImageReview(q.id); updateCurrentAiImage(null); } finally { setAdminImageBusy(null); }
  };
  const selectedAnswer = answers[q.id];
  // الصورة الأصلية تبقى خاضعة لسياسة الإخفاء الحالية، وصورة AI تعرض فقط إذا كانت مولدة مسبقاً.
  return <div className="exam-page-v2" dir="rtl">
    <header className="exam-topbar-v2">
      <button onClick={()=>navigate('/models')} className="exam-back-v2" aria-label="العودة"><UiIcon name="back"/></button>
      <div className="exam-title-v2">
        <strong>اختبار القيادة</strong>
        <div className="exam-question-counter-wrap">
          <button
            type="button"
            className="exam-question-counter"
            aria-label={`السؤال ${current + 1} من ${questions.length}. اضغط للانتقال إلى سؤال آخر`}
            aria-expanded={jumpOpen}
            onClick={() => { setJumpValue(String(current + 1)); setJumpOpen(open => !open); }}
          >
            <span className="exam-counter-label">السؤال</span>
            <b className="exam-counter-current">{current + 1}</b>
            <span className="exam-counter-divider">/</span>
            <b className="exam-counter-total">{questions.length}</b>
            <span className="exam-counter-jump">انتقال</span>
          </button>
          {jumpOpen && (
            <div className="question-jump-popover">
              <form onSubmit={(event) => void jumpToQuestion(event)}>
                <input inputMode="numeric" pattern="[0-9]*" min={1} max={questions.length} value={jumpValue} onChange={event => setJumpValue(event.target.value.replace(/\D/g, ''))} autoFocus aria-label="رقم السؤال" />
                <button type="submit">انتقال</button>
              </form>
              <small>اكتب رقم السؤال من 1 إلى {questions.length}</small>
            </div>
          )}
        </div>
      </div>
      <div className={`exam-timer-v2 ${seconds<=60?'urgent':''}`} aria-label={`الوقت المتبقي ${mm}:${ss}`}>{mm}:{ss}</div>
    </header>
    <div className="exam-progress-v2"><span style={{width:`${((current+1)/questions.length)*100}%`}}/></div>


    <main className="exam-stage-v2"><section className="exam-card-v2">
      {loadError && (
        <div className="surface-panel px-4 py-3 text-sm text-center text-muted" role="alert">
          {loadError}
        </div>
      )}
      <div className="question-audio-nav exam-inside" role="group" aria-label="التحكم بالصوت">
            <button
              type="button"
              className={"question-audio-nav__audio play " + (audioPlaying ? "playing" : "")}
              disabled={!currentAudioUrl || !audioReady}
              onClick={() => {
                stopQuestionAudioPrompt();
                setAudioError(null);
                if (audioContinuousRef.current) {
                  void playCurrentQuestionAudio(currentAudioUrl);
                  return;
                }
                audioContinuousRef.current = true;
                setAudioEnabled(true);
                void playSystemPromptOnMainAudio('question-audio-enabled');
              }}
              aria-label="تشغيل الصوت"
              title="تشغيل الصوت"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l5 4V6L7 10H4Zm11.2-.8a4 4 0 0 1 0 5.6M17.7 7.2a7.4 7.4 0 0 1 0 9.6"/></svg>
            </button>
            <button
              type="button"
              className="question-audio-nav__audio stop"
              onClick={() => {
                stopQuestionAudioPrompt();
                audioContinuousRef.current = false;
                setAudioEnabled(false);
                setAudioError(null);
                audioModeRef.current = null;
                const audio = audioRef.current;
                if (audio) {
                  audio.pause();
                  audio.currentTime = 0;
                }
                setAudioPlaying(false);
                void playSystemPromptOnMainAudio('question-audio-disabled');
              }}
              aria-label="إيقاف الصوت"
              title="إيقاف الصوت"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4Z"/><path d="m4 4 16 16"/></svg>
            </button>
            <div className={"question-audio-nav__status " + (audioError ? "error" : audioPlaying ? "ready" : "prompt")}>
              {audioError ? audioError : audioPlaying ? (audioModeRef.current === 'disabled-prompt' ? "جارٍ تشغيل رسالة الإيقاف" : "الصوت سيبقى شغال حتى تضغط إيقاف") : audioEnabled ? "الصوت مفعّل وسيعمل مع السؤال التالي" : "اضغط زر التشغيل للاستماع"}
            </div>
            <audio
              ref={audioRef}
              preload="auto"
              onEnded={() => {
                if (audioModeRef.current === 'enabled-prompt') {
                  audioModeRef.current = null;
                  if (audioContinuousRef.current) void playCurrentQuestionAudio(currentAudioUrl);
                  else setAudioPlaying(false);
                  return;
                }
                if (audioModeRef.current === 'disabled-prompt') {
                  audioModeRef.current = null;
                  setAudioPlaying(false);
                  return;
                }
                audioModeRef.current = null;
                setAudioPlaying(false);
              }}
              onError={() => {
                setAudioPlaying(false);
                setAudioError('تعذر تشغيل ملف الصوت على هذا الجهاز.');
              }}
            />
          </div>
      <div className="exam-scroll-v2">
        <div className={`exam-image-slot-v2 ${mediaLayoutClass}`}>
          {showOriginalQuestionImage ? (
            <div
              className={`exam-question-image-frame original-frame ${isAdmin && adminImageToolsFor === 'original' ? 'admin-tools-open' : ''}`}
              onClick={() => { if (isAdmin) setAdminImageToolsFor(currentTools => currentTools === 'original' ? null : 'original'); }}
              onKeyDown={event => { if (isAdmin && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setAdminImageToolsFor(currentTools => currentTools === 'original' ? null : 'original'); } }}
              role={isAdmin ? 'button' : undefined}
              tabIndex={isAdmin ? 0 : undefined}
              aria-label={isAdmin ? 'اضغط لعرض أدوات تحرير الصورة الأصلية' : undefined}
              title={isAdmin ? 'اضغط لعرض أدوات تحرير الصورة الأصلية' : undefined}
            >
              <OptimizedImage
                src={resolveQuestionImageUrl(q.imageUrl)}
                alt="الصورة الأصلية للسؤال"
                className="h-full w-full"
                priority
                objectFit="contain"
                sizes="(max-width:700px) 46vw, 380px"
              />
              {isAdmin && adminImageToolsFor === 'original' && (
                <div className="exam-admin-ai-tools" onClick={event => event.stopPropagation()}>
                  <button type="button" onClick={() => void hideOriginalImageForAdmin()} disabled={adminImageBusy !== null}>
                    {adminImageBusy === 'hide' ? '...' : 'إخفاء'}
                  </button>
                  <button type="button" className="danger" onClick={() => void removeOriginalImageForAdmin()} disabled={adminImageBusy !== null}>
                    {adminImageBusy === 'delete' ? '...' : 'إزالة الصورة'}
                  </button>
                </div>
              )}
            </div>
          ) : q.imageUrl ? (
            <div className="exam-question-image-frame original-image-pending" aria-hidden="true"><span>الصورة مخفية حتى لا تكشف الإجابة</span></div>
          ) : null}
          {q.aiImageUrl ? (
            <div
              className={`exam-question-image-frame ai-frame ${isAdmin && adminImageToolsFor === 'ai' ? 'admin-tools-open' : ''}`}
              onClick={() => { if (isAdmin) setAdminImageToolsFor(currentTools => currentTools === 'ai' ? null : 'ai'); }}
              onKeyDown={event => { if (isAdmin && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setAdminImageToolsFor(currentTools => currentTools === 'ai' ? null : 'ai'); } }}
              role={isAdmin ? 'button' : undefined}
              tabIndex={isAdmin ? 0 : undefined}
              aria-label={isAdmin ? 'اضغط لعرض أدوات تحرير الصورة التوضيحية' : undefined}
              title={isAdmin ? 'اضغط لعرض أدوات تحرير الصورة التوضيحية' : undefined}
            >
              <div className="ai-image-label" aria-label="صورة توضيحية">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m5 17 4-4 3 3 3-4 4 5"/></svg>
                <span>{isAdmin ? 'صورة AI — مراجعة الإدارة' : 'صورة توضيحية'}</span>
              </div>
              <OptimizedImage
                src={resolveApiUrl(q.aiImageUrl)}
                alt="شرح بصري تعليمي للسؤال"
                className="h-full w-full"
                objectFit="contain"
                priority
                sizes="(max-width:700px) 96vw, 760px"
              />
              {isAdmin && adminImageToolsFor === 'ai' && (
                <div className="exam-admin-ai-tools" onClick={event => event.stopPropagation()}>
                  <button type="button" onClick={() => void approveAiImageForAdmin()} disabled={adminImageBusy !== null}>
                    {adminImageBusy === 'approve' ? '...' : 'موافقة'}
                  </button>
                  <button type="button" className="danger" onClick={() => void rejectAiImageForAdmin()} disabled={adminImageBusy !== null}>
                    {adminImageBusy === 'reject' ? '...' : 'رفض'}
                  </button>
                  <button type="button" onClick={() => void hideAiImageForAdmin()} disabled={adminImageBusy !== null}>
                    {adminImageBusy === 'hide' ? '...' : 'إخفاء'}
                  </button>
                  <button type="button" className="danger" onClick={() => void deleteAiImageForAdmin()} disabled={adminImageBusy !== null}>
                    {adminImageBusy === 'delete' ? '...' : 'حذف'}
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {hasDiagram && (
            <div className="exam-question-image-frame exam-diagram-frame">
              <button type="button" className="diagram-visibility-toggle" onClick={() => setShowDiagram(value => !value)} aria-pressed={!showDiagram}>
                {showDiagram ? 'إخفاء الرسم' : 'إظهار الرسم'}
              </button>
              {showDiagram ? <DiagramRenderer question={q} /> : <div className="diagram-hidden-placeholder">الرسم التوضيحي مخفي</div>}
            </div>
          )}
          {!mediaTileCount && <div className="exam-image-placeholder-v2" aria-hidden="true" />}
        </div>
        <div className="exam-question-v2"><span className="exam-question-label">السؤال {current+1}</span>{q.text}</div>
        <div className="exam-answers-v2" style={{ '--option-count': q.options.length } as React.CSSProperties}>{q.options.map((opt,i)=><button key={i} type="button" onClick={() => void chooseAnswer(i)} disabled={finishedRef.current} className={`exam-option-v2 ${answers[q.id]===i?'selected':''}`}><span className="exam-option-letter-v2">{OPTION_NUMBERS[i] ?? String(i + 1)}</span><span className="exam-option-text-v2">{opt}</span>{answers[q.id]===i&&<UiIcon name="check"/>}</button>)}</div>
      </div>
      <div className="exam-actions-v2">
        <button type="button" onClick={() => goToQuestion(current - 1)} disabled={current === 0} className="exam-action-v2 secondary"><UiIcon name="back"/><span>السابق</span></button>
        <button type="button" onClick={() => void finish()} className="exam-action-v2 finish"><UiIcon name="finish"/><span>إنهاء الاختبار</span></button>
        <button type="button" onClick={() => isLast ? void finish() : goToQuestion(current + 1)} className="exam-action-v2 next"><span>{isLast ? 'عرض النتيجة' : 'التالي'}</span><UiIcon name="next"/></button>
      </div>
    </section></main>

  </div>;
}
