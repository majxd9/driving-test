import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question, QuestionCategory } from '../types';
import OptimizedImage, { resolveQuestionImageUrl } from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';
import SpiritTrafficSignal from '../components/SpiritTrafficSignal';
import type { SpiritTrafficState } from '../components/SpiritTrafficSignal';
import { ensureImageReady, preloadImages } from '../utils/imagePreload';
import { playAnswerFeedback } from '../utils/answerFeedbackAudio';

const THEME: Record<QuestionCategory, { name: string; accent: string; soft: string }> = {
  Ser: { name: 'قواعد السير', accent: '#2DD4BF', soft: 'rgba(45,212,191,.12)' },
  Ishara: { name: 'الإشارات المرورية', accent: '#60A5FA', soft: 'rgba(96,165,250,.12)' },
  Mechanic: { name: 'الميكانيك', accent: '#F59E0B', soft: 'rgba(245,158,11,.12)' },
};

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export default function Study() {
  const { category } = useParams<{ category: QuestionCategory }>();
  const navigate = useNavigate();
  const theme = THEME[category as QuestionCategory] ?? THEME.Ser;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState('1');
  const [signalState, setSignalState] = useState<SpiritTrafficState>('pending');
  const navigationLockRef = useRef(false);
  const signalTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!category) return;
    if (signalTimerRef.current !== null) window.clearTimeout(signalTimerRef.current);
    setSignalState('pending');
    setLoading(true);
    setError('');
    setIndex(0);
    setAnswers({});
    setJumpOpen(false);
    setJumpValue('1');
    api.getQuestions(category)
      .then(async (items) => {
        setQuestions(items);
        const firstThree = items.slice(0, 3).map(q => resolveQuestionImageUrl(q.imageUrl)).filter(Boolean);
        if (firstThree[0]) await ensureImageReady(firstThree[0], 1400);
        preloadImages(firstThree.slice(1), 2);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الأسئلة.'))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    const sources = questions.slice(index, index + 3).map(q => resolveQuestionImageUrl(q.imageUrl)).filter(Boolean);
    preloadImages(sources, 3);
    if (signalTimerRef.current !== null) window.clearTimeout(signalTimerRef.current);
    setSignalState('pending');
  }, [questions, index]);

  useEffect(() => () => {
    if (signalTimerRef.current !== null) window.clearTimeout(signalTimerRef.current);
  }, []);

  const goTo = useCallback(async (nextIndex: number) => {
    if (navigationLockRef.current || nextIndex < 0 || nextIndex >= questions.length || nextIndex === index) return;
    navigationLockRef.current = true;
    setNavigating(true);
    const src = resolveQuestionImageUrl(questions[nextIndex]?.imageUrl);
    if (src) await ensureImageReady(src, 1200);
    setIndex(nextIndex);
    setNavigating(false);
    navigationLockRef.current = false;
  }, [index, questions]);

  const jumpToQuestion = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requested = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(requested) || requested < 1 || requested > questions.length) return;
    setJumpOpen(false);
    await goTo(requested - 1);
  }, [goTo, jumpValue, questions.length]);

  if (loading) return <div className="study-premium-loading">جارِ تجهيز التدريب...</div>;
  if (error) return <div className="study-premium-loading">{error}</div>;
  const q = questions[index];
  if (!q) return <div className="study-premium-loading">لا توجد أسئلة بهذا القسم.</div>;

  const chosen = answers[q.id];
  const answered = Object.keys(answers).length;
  const correct = questions.filter(x => answers[x.id] === x.correctAnswerIndex).length;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const isLast = index === questions.length - 1;
  const explanationNeeded = chosen !== undefined && Boolean(q.explanation);

  const choose = (i: number) => {
    if (chosen !== undefined) return;
    const isCorrect = i === q.correctAnswerIndex;
    setAnswers(current => ({ ...current, [q.id]: i }));
    playAnswerFeedback(isCorrect);
    setSignalState(isCorrect ? 'correct' : 'wrong');
    if (signalTimerRef.current !== null) window.clearTimeout(signalTimerRef.current);
  };

  return (
    <div className="study-premium" style={{ '--study-accent': theme.accent, '--study-soft': theme.soft } as React.CSSProperties} dir="rtl">
      <header className="study-premium-header">
        <button className="study-premium-back" onClick={() => navigate('/')} aria-label="العودة">‹</button>
        <div className="study-premium-brand">
          <span className="study-premium-kicker">تدريب تفاعلي</span>
          <strong>{theme.name}</strong>
          <small>{answered} مجاب · {correct} صحيح</small>
        </div>
        <div className="study-premium-counter-wrap">
          <button type="button" className="study-premium-counter" aria-label={`السؤال ${index + 1} من ${questions.length}. اضغط للانتقال إلى سؤال آخر`} aria-expanded={jumpOpen} onClick={() => { setJumpValue(String(index + 1)); setJumpOpen(open => !open); }}>
            <b>{index + 1}</b><span>من {questions.length}</span>
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
      </header>

      <div className="study-premium-progress"><span style={{ width: `${progress}%` }} /></div>

      <main className="study-premium-stage" style={{ minHeight: 0, overflow: 'hidden' }}>
        <section className="study-premium-card" style={{ display: 'grid', gridTemplateRows: '22px minmax(100px, 22dvh) minmax(58px, 11dvh) minmax(0, 1fr) 0px 0px 50px', height: 'calc(100dvh - 300px)', maxHeight: 'calc(100dvh - 300px)', minHeight: 0, overflow: 'hidden', gap: 5, boxSizing: 'border-box' }}>
          <SpiritTrafficSignal state={signalState} />
          <div className="study-premium-meta" style={{ minHeight: 0, overflow: 'hidden' }}>
            <div><span className="live-dot" /> سؤال {index + 1}</div>
            <span>{chosen === undefined ? 'اختر إجابة' : 'تمت الإجابة'}</span>
          </div>

          {q.imageUrl ? (
            <div className="study-premium-image" style={{ height: '100%', minHeight: 0, maxHeight: '22dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <OptimizedImage src={q.imageUrl} alt={`صورة السؤال ${q.id}`} priority sizes="(max-width: 700px) 96vw, 760px" className="study-premium-image-el" objectFit="contain" />
            </div>
          ) : (
            <div className="study-premium-no-image" style={{ height: '100%', minHeight: 0, maxHeight: '22dvh', overflow: 'hidden' }}><span>سؤال نظري</span></div>
          )}

          <div className="study-premium-question" style={{ minHeight: 0, maxHeight: '11dvh', overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 'clamp(14px, 3.8vw, 19px)', lineHeight: 1.4, fontWeight: 850, padding: '3px 12px', boxSizing: 'border-box' }}>{q.text}</div>

          <div className="study-premium-answers" style={{ '--option-count': q.options.length, display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: `repeat(${q.options.length}, minmax(0, 1fr))`, height: '100%', minHeight: 0, maxHeight: '100%', overflow: 'hidden', gap: 6, padding: 0 } as React.CSSProperties}>
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctAnswerIndex;
              const isChosen = i === chosen;
              let state = '';
              if (chosen !== undefined) state = isCorrect ? 'is-correct' : isChosen ? 'is-wrong' : 'is-muted';
              return (
                <button key={i} type="button" disabled={chosen !== undefined} onClick={() => choose(i)} className={`study-premium-option ${state}`} style={{ width: '100%', height: '100%', minHeight: 0, maxHeight: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box', padding: '7px 10px', overflow: 'hidden', transform: 'none' }}>
                  <span className="study-premium-letter">{LETTERS[i]}</span>
                  <span className="study-premium-option-text" style={{ minWidth: 0, maxWidth: '100%', fontSize: 'clamp(12px, 3.35vw, 15px)', lineHeight: 1.35, fontWeight: 750, whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>{opt}</span>
                  {chosen !== undefined && isCorrect && <span className="study-premium-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className={`study-premium-explanation ${explanationNeeded ? '' : 'is-empty'}`} aria-hidden={!explanationNeeded}>
            {explanationNeeded ? <><b>الشرح</b><span>{q.explanation}</span></> : <span>&nbsp;</span>}
          </div>
          <div className="study-premium-diagram"><DiagramRenderer question={q} /></div>

          <nav className="study-premium-actions" aria-label="التنقل بين الأسئلة" style={{ minHeight: 0, height: 50, overflow: 'hidden' }}>
            <button onClick={() => void goTo(index - 1)} disabled={index === 0 || navigating} className="study-premium-action ghost">السابق</button>
            <button onClick={() => void goTo(index + 1)} disabled={isLast || navigating} className="study-premium-action next">{navigating ? 'جارٍ التجهيز…' : isLast ? 'انتهى القسم' : 'السؤال التالي'} <span>←</span></button>
          </nav>
        </section>
      </main>
    </div>
  );
}
