import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, resolveApiUrl } from '../api/client';
import { Question, QuestionCategory } from '../types';
import OptimizedImage, { resolveQuestionImageUrl } from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';
import { shouldShowQuestionImageBeforeAnswer } from '../utils/questionImages';
import SpiritTrafficSignal from '../components/SpiritTrafficSignal';
import type { SpiritTrafficState } from '../components/SpiritTrafficSignal';
import { playAnswerFeedback } from '../utils/answerFeedbackAudio';
import { preloadImage } from '../utils/imagePreload';
import { getQuestionAudioSource, preloadQuestionAudio } from '../utils/questionAudio';
import { getCachedQuestionAudioPromptSource, playQuestionAudioPrompt, preloadQuestionAudioPrompt, stopQuestionAudioPrompt } from '../utils/questionAudioPrompts';

const THEME: Record<QuestionCategory, { name: string; accent: string; soft: string }> = {
  Ser: { name: 'قواعد السير', accent: '#2DD4BF', soft: 'rgba(45,212,191,.12)' },
  Ishara: { name: 'الإشارات المرورية', accent: '#60A5FA', soft: 'rgba(96,165,250,.12)' },
  Mechanic: { name: 'الميكانيك', accent: '#F59E0B', soft: 'rgba(245,158,11,.12)' },
};

const OPTION_NUMBERS = ['١', '٢', '٣', '٤', '٥', '٦'];

export default function Study() {
  const { category } = useParams<{ category: QuestionCategory }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const theme = THEME[category as QuestionCategory] ?? THEME.Ser;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState('1');
  const [signalState, setSignalState] = useState<SpiritTrafficState>('pending');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContinuousRef = useRef(false);
  const audioModeRef = useRef<'question' | 'enabled-prompt' | 'disabled-prompt' | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [failedAiImageId, setFailedAiImageId] = useState<number | null>(null);
  const [showDiagram, setShowDiagram] = useState(true);
  const [introAudioPlaying, setIntroAudioPlaying] = useState(false);
  const [introAudioMessage, setIntroAudioMessage] = useState<string | null>(null);
  const [adminImageBusy, setAdminImageBusy] = useState<'hide' | 'delete' | null>(null);
  const [adminImageToolsFor, setAdminImageToolsFor] = useState<'original' | 'ai' | null>(null);

  useEffect(() => {
    if (!category) return;

    let active = true;

    setSignalState('pending');
    setLoading(true);
    setError('');
    setIndex(0);
    setAnswers({});
    setJumpOpen(false);
    setJumpValue('1');

    preloadQuestionAudioPrompt('question-audio-first-entry');
    preloadQuestionAudioPrompt('question-audio-enabled');
    preloadQuestionAudioPrompt('question-audio-disabled');

    api.getQuestions(category)
      .then((items) => {
        if (active) setQuestions(items);
      })
      .catch(e => {
        if (active) {
          setError(e instanceof Error ? e.message : 'تعذر تحميل الأسئلة.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category]);

  useEffect(() => {
    setSignalState('pending');
    setFailedAiImageId(null);
    setAdminImageBusy(null);
    setAdminImageToolsFor(null);
    setShowExplanatoryImage(true);
    setShowDiagram(true);
  }, [index]);

  const currentAudioPath = questions[index]?.audioUrl ?? null;
  const currentAudioUrl = currentAudioPath ? resolveApiUrl(currentAudioPath) : null;
  const playSystemPromptOnMainAudio = useCallback(async (
    key: 'question-audio-enabled' | 'question-audio-disabled'
  ) => {
    const audio = audioRef.current;
    if (!audio) return false;

    const source =
      getCachedQuestionAudioPromptSource(key) ??
      resolveApiUrl(`/api/questions/audio-prompt/${key}`);

    audioModeRef.current = key === 'question-audio-enabled' ? 'enabled-prompt' : 'disabled-prompt';
    audio.pause();
    audio.src = source;
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

  const nextAudioPath = questions[index + 1]?.audioUrl ?? null;
  const nextAudioUrl = nextAudioPath ? resolveApiUrl(nextAudioPath) : null;

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

    return () => {
      active = false;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [currentAudioUrl, nextAudioUrl]);



  useEffect(() => {
    const nextQuestion = questions[index + 1];
    if (!nextQuestion) return;

    const isVisualCategory = category === 'Ishara' || category === 'Mechanic';
    if (nextQuestion.imageUrl && (isVisualCategory || shouldShowQuestionImageBeforeAnswer(nextQuestion))) {
      const imageUrl = resolveQuestionImageUrl(nextQuestion.imageUrl);
      if (imageUrl) void preloadImage(imageUrl, 'auto');
    }

    if (nextQuestion.aiImageUrl) {
      void preloadImage(resolveApiUrl(nextQuestion.aiImageUrl), 'auto');
    }
  }, [index, questions]);

  const goTo = useCallback((nextIndex: number) => {
    setIndex(currentIndex => {
      if (
        nextIndex < 0 ||
        nextIndex >= questions.length ||
        nextIndex === currentIndex
      ) return currentIndex;

      // التنقل يعتمد على آخر قيمة فعلية للحالة، وليس على render سابق.
      // هذا يمنع فقدان ضغطة التالي/السابق عند النقر السريع أو أثناء إعادة الرسم.
      return nextIndex;
    });
  }, [questions.length]);

  const jumpToQuestion = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requested = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(requested) || requested < 1 || requested > questions.length) return;
    setJumpOpen(false);
    goTo(requested - 1);
  }, [goTo, jumpValue, questions.length]);

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

  if (loading) return <div className="ui-audio-welcome" dir="rtl" role="status" aria-live="polite"><section className="ui-audio-welcome__panel" aria-labelledby="study-audio-welcome-title"><span className="ui-audio-welcome__mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg></span><p className="ui-audio-welcome__eyebrow">{theme.name}</p><h1 id="study-audio-welcome-title">جاهز للانطلاق؟</h1><p className="ui-audio-welcome__copy">اضغط تشغيل الصوت إذا رغبت بسماع إرشادات قصيرة قبل البدء.</p><div className="ui-audio-welcome__controls"><button type="button" className={`ui-audio-welcome__play ${introAudioPlaying ? 'is-playing' : 'is-pulsing'}`} onClick={introAudioPlaying ? stopIntroAudio : playIntroAudio} aria-pressed={introAudioPlaying}>{introAudioPlaying ? '■ إيقاف الصوت' : '▶ تشغيل الصوت'}</button></div><p className="ui-audio-welcome__status" role="status" aria-live="polite">{introAudioMessage ?? (introAudioPlaying ? 'يتم تشغيل الإرشادات الصوتية الآن.' : 'اضغط الزر للاستماع.')}</p></section></div>;

  if (error) return <div className="study-premium-loading" role="alert">{error}</div>;

  const q = questions[index];
  if (!q) return <div className="study-premium-loading">لا توجد أسئلة بهذا القسم.</div>;

  const chosen = answers[q.id];
  const isVisualCategory = category === 'Ishara' || category === 'Mechanic';
  const showImage = Boolean(
    q.imageUrl && (
      isVisualCategory ||
      chosen !== undefined ||
      shouldShowQuestionImageBeforeAnswer(q)
    )
  );
  const answered = Object.keys(answers).length;
  const correct = questions.filter(x => answers[x.id] === x.correctAnswerIndex).length;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const isLast = index === questions.length - 1;
  const explanationNeeded = chosen !== undefined && Boolean(q.explanation);
  const showOriginalImage = Boolean(q.imageUrl && showImage);
  const hasOriginalImage = Boolean(q.imageUrl);
  const hasExplanatoryImage = Boolean(q.aiImageUrl && failedAiImageId !== q.id);
  const showAiImageForStudent = hasExplanatoryImage;
  const hasDiagram = Boolean(q.diagramUrl && q.diagramType);
  const hasOriginalMediaSlot = showOriginalImage || (hasOriginalImage && (hasExplanatoryImage || hasDiagram));
  const mediaTileCount = Number(hasOriginalMediaSlot) + Number(hasExplanatoryImage) + Number(hasDiagram);
  const mediaLayoutClass = mediaTileCount >= 3 ? 'has-three-media' : mediaTileCount === 2 ? 'has-two-images' : '';

  const hideAiImageForAdmin = async () => {
    if (!q.aiImageUrl || adminImageBusy) return;
    setAdminImageBusy('hide');
    try {
      await api.admin.hideAiImageReview(q.id);
      setQuestions(current => current.map(item => item.id === q.id ? { ...item, aiImageUrl: null } : item));
      setFailedAiImageId(q.id);
      setAdminImageToolsFor(null);
    } finally {
      setAdminImageBusy(null);
    }
  };

  const deleteAiImageForAdmin = async () => {
    if (!q.aiImageUrl || adminImageBusy) return;
    if (!window.confirm('حذف صورة AI من هذا السؤال؟')) return;
    setAdminImageBusy('delete');
    try {
      await api.admin.deleteAiImageReview(q.id);
      setQuestions(current => current.map(item => item.id === q.id ? { ...item, aiImageUrl: null } : item));
      setFailedAiImageId(q.id);
      setAdminImageToolsFor(null);
    } finally {
      setAdminImageBusy(null);
    }
  };

  const hideOriginalImageForAdmin = async () => {
    if (!q.imageUrl || adminImageBusy) return;
    setAdminImageBusy('hide');
    try {
      await api.admin.hideQuestionImage(q.id);
      setQuestions(current => current.map(item => item.id === q.id ? { ...item, imageUrl: null } : item));
      setAdminImageToolsFor(null);
    } finally {
      setAdminImageBusy(null);
    }
  };

  const removeOriginalImageForAdmin = async () => {
    if (!q.imageUrl || adminImageBusy) return;
    if (!window.confirm('إزالة الصورة الأصلية من هذا السؤال؟')) return;
    setAdminImageBusy('delete');
    try {
      await api.admin.removeQuestionImage(q.id);
      setQuestions(current => current.map(item => item.id === q.id ? { ...item, imageUrl: null } : item));
      setAdminImageToolsFor(null);
    } finally {
      setAdminImageBusy(null);
    }
  };

  const choose = (answerIndex: number) => {
    if (chosen !== undefined) return;
    const isCorrect = answerIndex === q.correctAnswerIndex;
    setAnswers(current => ({ ...current, [q.id]: answerIndex }));
    setSignalState(isCorrect ? 'correct' : 'wrong');
    void playAnswerFeedback(isCorrect);
  };

  return (
    <div
      className="study-premium"
      style={{ '--study-accent': theme.accent, '--study-soft': theme.soft } as React.CSSProperties}
      dir="rtl"
    >
      <header className="study-premium-header">
        <button className="study-premium-back" onClick={() => navigate('/app')} aria-label="العودة">‹</button>

        <div className="study-premium-brand">
          <span className="study-premium-kicker">تدريب تفاعلي</span>
          <strong>{theme.name}</strong>
          <small>{answered} مجاب · {correct} صحيح</small>
        </div>

        <div className="question-audio-nav study-top" role="group" aria-label="التحكم بالصوت">
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
            audio?.pause();
            if (audio) audio.currentTime = 0;
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

        <div className="study-premium-counter-wrap">
          <button
            type="button"
            className="study-premium-counter"
            aria-label={`السؤال ${index + 1} من ${questions.length}. اضغط للانتقال إلى سؤال آخر`}
            aria-expanded={jumpOpen}
            onClick={() => {
              setJumpValue(String(index + 1));
              setJumpOpen(open => !open);
            }}
          >
            <b>{index + 1}</b><span>من {questions.length}</span>
          </button>

          {jumpOpen && (
            <div className="question-jump-popover">
              <form onSubmit={(event) => void jumpToQuestion(event)}>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={questions.length}
                  value={jumpValue}
                  onChange={event => setJumpValue(event.target.value.replace(/\D/g, ''))}
                  autoFocus
                  aria-label="رقم السؤال"
                />
                <button type="submit">انتقال</button>
              </form>
              <small>اكتب رقم السؤال من 1 إلى {questions.length}</small>
            </div>
          )}
        </div>
      </header>

      <div className="study-premium-progress"><span style={{ width: `${progress}%` }} /></div>


      <main className="study-premium-stage">
        <section className={`study-premium-card ${explanationNeeded ? 'has-explanation' : 'no-explanation'}`}>
          <SpiritTrafficSignal state={signalState} />

          <div className="study-premium-meta">
            <div><span className="live-dot" /> سؤال {index + 1}</div>
            <span>{chosen === undefined ? 'اختر إجابة' : 'تمت الإجابة'}</span>
          </div>

          {(showOriginalImage || hasExplanatoryImage || hasDiagram) ? (
            <div className={`study-premium-images ${mediaLayoutClass}`}>
              {showOriginalImage && (
                <div className="study-premium-image">
                  <div
                    className={`study-premium-image-inner-admin ${isAdmin && adminImageToolsFor === 'original' ? 'is-open' : ''}`}
                    onClick={() => {
                      if (isAdmin) setAdminImageToolsFor(current => current === 'original' ? null : 'original');
                    }}
                  >
                    <OptimizedImage
                      src={resolveQuestionImageUrl(q.imageUrl)}
                      alt={`الصورة الأصلية للسؤال ${q.id}`}
                      sizes="(max-width:700px) 96vw, 760px"
                      className="study-premium-image-el"
                      objectFit="contain"
                      priority
                      showError
                    />
                    {isAdmin && adminImageToolsFor === 'original' && (
                      <div className="study-admin-ai-tools" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => void hideOriginalImageForAdmin()} disabled={adminImageBusy !== null}>
                          {adminImageBusy === 'hide' ? '...' : 'إخفاء'}
                        </button>
                        <button type="button" className="danger" onClick={() => void removeOriginalImageForAdmin()} disabled={adminImageBusy !== null}>
                          {adminImageBusy === 'delete' ? '...' : 'إزالة من السؤال'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!showOriginalImage && hasOriginalImage && (hasExplanatoryImage || hasDiagram) && <div className="study-premium-image original-image-pending" aria-hidden="true"><span>تظهر الصورة الأصلية بعد الإجابة</span></div>}
              {showAiImageForStudent ? (
                <div
                  className={`study-premium-image ai-secondary ${isAdmin && adminImageToolsFor === 'ai' ? 'admin-tools-open' : ''}`}
                  onClick={() => {
                    if (isAdmin) setAdminImageToolsFor(current => current === 'ai' ? null : 'ai');
                  }}
                >
                  <span className="ai-image-label" aria-label="صورة توضيحية">توضيحية</span>
                  <OptimizedImage
                    src={resolveApiUrl(q.aiImageUrl!)}
                    alt="شرح بصري تعليمي AI"
                    sizes="(max-width:700px) 96vw, 760px"
                    className="study-premium-image-el"
                    objectFit="contain"
                    priority
                    onError={() => setFailedAiImageId(q.id)}
                    showError={false}
                  />
                  {isAdmin && adminImageToolsFor === 'ai' && (
                    <div className="study-admin-ai-tools" onClick={(event) => event.stopPropagation()}>
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
                <div className="study-premium-image study-premium-diagram-tile">
                  <button type="button" className="diagram-visibility-toggle" onClick={() => setShowDiagram(value => !value)} aria-pressed={!showDiagram}>
                    {showDiagram ? 'إخفاء الرسم' : 'إظهار الرسم'}
                  </button>
                  {showDiagram ? <DiagramRenderer question={q} /> : <div className="diagram-hidden-placeholder">الرسم التوضيحي مخفي</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="study-premium-no-image" aria-hidden="true" />
          )}

          <div className={`study-premium-explanation ${explanationNeeded ? '' : 'is-empty'}`} data-has-explanation={Boolean(q.explanation)} aria-hidden={!explanationNeeded}>
            {explanationNeeded ? (
              <>
                <b>الشرح</b>
                <span>{q.explanation}</span>
              </>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>

          <div className="study-premium-question">{q.text}</div>

          <div
            className="study-premium-answers"
            style={{ '--option-count': q.options.length } as React.CSSProperties}
          >
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctAnswerIndex;
              const isChosen = i === chosen;
              let state = '';
              if (chosen !== undefined) {
                state = isCorrect ? 'is-correct' : isChosen ? 'is-wrong' : 'is-muted';
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={chosen !== undefined}
                  onClick={() => choose(i)}
                  className={`study-premium-option ${state}`}
                >
                  <span className="study-premium-letter">{OPTION_NUMBERS[i] ?? String(i + 1)}</span>
                  <span className="study-premium-option-text">{opt}</span>
                  {chosen !== undefined && isCorrect && <span className="study-premium-check">✓</span>}
                </button>
              );
            })}
          </div>

        </section>
      </main>

      <nav className="study-premium-actions study-navigation-portal" aria-label="التنقل بين الأسئلة">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className="study-premium-action ghost">
          السابق
        </button>
        <button type="button" onClick={() => goTo(index + 1)} disabled={isLast} className="study-premium-action next">
          {isLast ? 'انتهى القسم' : 'السؤال التالي'} <span>←</span>
        </button>
      </nav>

    </div>
  );
}
