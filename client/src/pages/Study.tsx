import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question, QuestionCategory } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';
import '../study-premium.css';

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
  const preloaded = useRef(new Set<string>());

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    setError('');
    setIndex(0);
    setAnswers({});
    api.getQuestions(category)
      .then(setQuestions)
      .catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الأسئلة.'))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    questions.slice(index, index + 3).forEach(q => {
      if (!q.imageUrl || preloaded.current.has(q.imageUrl)) return;
      preloaded.current.add(q.imageUrl);
      const img = new Image();
      img.decoding = 'async';
      img.src = q.imageUrl;
    });
  }, [questions, index]);

  if (loading) return <div className="study-premium-loading">جارِ تجهيز التدريب...</div>;
  if (error) return <div className="study-premium-loading">{error}</div>;
  const q = questions[index];
  if (!q) return <div className="study-premium-loading">لا توجد أسئلة بهذا القسم.</div>;

  const chosen = answers[q.id];
  const answered = Object.keys(answers).length;
  const correct = questions.filter(x => answers[x.id] === x.correctAnswerIndex).length;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const isLast = index === questions.length - 1;

  const choose = (i: number) => {
    if (chosen !== undefined) return;
    setAnswers(current => ({ ...current, [q.id]: i }));
  };
  const next = () => setIndex(i => Math.min(i + 1, questions.length - 1));
  const prev = () => setIndex(i => Math.max(i - 1, 0));

  return (
    <div className="study-premium" style={{ '--study-accent': theme.accent, '--study-soft': theme.soft } as React.CSSProperties} dir="rtl">
      <header className="study-premium-header">
        <button className="study-premium-back" onClick={() => navigate('/')} aria-label="العودة">‹</button>
        <div className="study-premium-brand">
          <span className="study-premium-kicker">تدريب تفاعلي</span>
          <strong>{theme.name}</strong>
          <small>{answered} مجاب · {correct} صحيح</small>
        </div>
        <div className="study-premium-counter" aria-label="عداد الأسئلة">
          <b>{index + 1}</b><span>من {questions.length}</span>
        </div>
      </header>

      <div className="study-premium-progress"><span style={{ width: `${progress}%` }} /></div>

      <main className="study-premium-stage">
        <section className="study-premium-card">
          <div className="study-premium-meta">
            <div><span className="live-dot" /> سؤال {index + 1}</div>
            <span>{chosen === undefined ? 'اختر إجابة' : 'تمت الإجابة'}</span>
          </div>

          {q.imageUrl ? (
            <div className="study-premium-image">
              <OptimizedImage src={q.imageUrl} alt={`صورة السؤال ${q.id}`} priority={index === 0} sizes="(max-width: 700px) 96vw, 760px" className="study-premium-image-el" />
            </div>
          ) : (
            <div className="study-premium-no-image"><span>سؤال نظري</span></div>
          )}

          <div className="study-premium-question">{q.text}</div>

          <div className="study-premium-answers">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctAnswerIndex;
              const isChosen = i === chosen;
              let state = '';
              if (chosen !== undefined) state = isCorrect ? 'is-correct' : isChosen ? 'is-wrong' : 'is-muted';
              return (
                <button key={i} type="button" disabled={chosen !== undefined} onClick={() => choose(i)} className={`study-premium-option ${state}`}>
                  <span className="study-premium-letter">{LETTERS[i]}</span>
                  <span className="study-premium-option-text">{opt}</span>
                  {chosen !== undefined && isCorrect && <span className="study-premium-check">✓</span>}
                </button>
              );
            })}
          </div>

          {chosen !== undefined && q.explanation && (
            <div className="study-premium-explanation">
              <b>لماذا؟</b>
              <span>{q.explanation}</span>
            </div>
          )}
          <div className="study-premium-diagram"><DiagramRenderer question={q} /></div>

          <nav className="study-premium-actions" aria-label="التنقل بين الأسئلة">
            <button onClick={prev} disabled={index === 0} className="study-premium-action ghost">السابق</button>
            <button onClick={next} disabled={isLast} className="study-premium-action next">تخطي السؤال <span>←</span></button>
          </nav>
        </section>
      </main>
    </div>
  );
}
