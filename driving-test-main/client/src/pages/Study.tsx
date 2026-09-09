import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Question, QuestionCategory } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';

const THEME: Record<QuestionCategory, { name: string; head: string; soft: string; text: string }> = {
  Ser: { name: 'قواعد السير', head: 'bg-brand', soft: 'bg-brand-soft', text: 'text-brand' },
  Ishara: { name: 'الإشارات المرورية', head: 'bg-signs', soft: 'bg-signs-soft', text: 'text-signs' },
  Mechanic: { name: 'الميكانيك', head: 'bg-mek', soft: 'bg-mek-soft', text: 'text-mek' },
};

export default function Study() {
  const { category } = useParams<{ category: QuestionCategory }>();
  const navigate = useNavigate();
  const theme = THEME[category as QuestionCategory] || THEME.Ser;
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
      .then((items) => {
        const clean = items
          .filter((q) => q && typeof q.text === 'string')
          .filter((q) => Array.isArray(q.options) && q.options.length === 4 && q.options.every((x) => typeof x === 'string' && x.trim()))
          .filter((q) => Number.isInteger(q.correctAnswerIndex) && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4);
        if (!clean.length) throw new Error('لا توجد أسئلة مكتملة بهذا القسم.');
        setQuestions(clean);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الأسئلة'))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    const urls = questions.slice(index, index + 3).map((q) => q.imageUrl).filter(Boolean) as string[];
    urls.forEach((url) => {
      if (preloaded.current.has(url)) return;
      preloaded.current.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    });
  }, [questions, index]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const correctCount = useMemo(
    () => questions.reduce((sum, q, i) => sum + (answers[i] === q.correctAnswerIndex ? 1 : 0), 0),
    [answers, questions],
  );
  const q = questions[index];
  const imageUrl = getQuestionImageUrl(q, category);

  if (loading) return <Loading text="جارِ تجهيز الأسئلة..." />;
  if (error) return <Empty text={error} />;
  if (!q) return <Empty text="لا توجد أسئلة بهذا القسم بعد" />;

  const chosen = answers[index];
  const isLast = index === questions.length - 1;
  const choose = (optionIndex: number) => {
    if (chosen !== undefined) return;
    setAnswers((previous) => ({ ...previous, [index]: optionIndex }));
  };

  const goNext = () => {
    if (chosen === undefined) return;
    if (isLast) return;
    setIndex((current) => current + 1);
  };

  return (
    <div className="min-h-screen pb-6">
      <header className={`${theme.head} sticky top-0 z-30 text-white shadow-lg`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="icon-button" aria-label="العودة">→</button>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm truncate">{theme.name}</p>
              <p className="text-[11px] text-white/75 mt-0.5">تدرّب سؤالاً بعد سؤال</p>
            </div>
            <div className="study-counter">
              <strong>{index + 1}</strong><span>/ {questions.length}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mt-3 text-[11px] text-white/80">
            <span>{answeredCount} مجاب</span>
            <span>{correctCount} صحيح</span>
            <span>{answeredCount - correctCount} يحتاج مراجعة</span>
          </div>
          <div className="progress mt-3"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex justify-between items-center gap-3 mb-4">
          <span className={`${theme.soft} ${theme.text} rounded-full px-3 py-1.5 text-xs font-black`}>السؤال {index + 1}</span>
        </div>

        <div className="question-card question-card-enhanced">
          {imageUrl && (
            <div className={`question-media-frame ${category === 'Mechanic' ? 'mechanic-media' : ''}`}>
              <OptimizedImage
                src={imageUrl}
                alt={`صورة توضيحية للسؤال ${index + 1}`}
                priority={index < 2}
                sizes="(max-width: 768px) 94vw, 720px"
                className="question-media-image"
                objectFit="contain"
              />
            </div>
          )}

          <h1 className="question-title">{q.text}</h1>

          <div className="space-y-3">
            {q.options.map((option, optionIndex) => {
              const isCorrect = optionIndex === q.correctAnswerIndex;
              const isSelected = optionIndex === chosen;
              let className = 'answer-option';
              if (chosen !== undefined) {
                if (isCorrect) className += ' correct';
                else if (isSelected) className += ' wrong';
              }
              return (
                <button
                  key={`${index}-${optionIndex}`}
                  onClick={() => choose(optionIndex)}
                  disabled={chosen !== undefined}
                  className={className}
                >
                  <span className="answer-letter">{['أ', 'ب', 'ج', 'د'][optionIndex] || optionIndex + 1}</span>
                  <span className="answer-text">{option}</span>
                  {chosen !== undefined && isCorrect && <span className="answer-check">✓</span>}
                </button>
              );
            })}
          </div>

          {chosen !== undefined && q.explanation && (
            <div className={`explanation ${theme.soft} ${theme.text}`}>
              <b>لماذا؟</b>
              <p>{q.explanation}</p>
            </div>
          )}

          {chosen !== undefined && <DiagramRenderer question={q} />}

          <div className="study-actions">
            <button
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
              className="secondary-cta"
            >
              السابق →
            </button>
            <button
              disabled={chosen === undefined || isLast}
              onClick={goNext}
              className={`${theme.head} text-white rounded-2xl py-3.5 font-black disabled:opacity-40`}
            >
              {isLast ? 'انتهى القسم' : 'التالي ←'}
            </button>
          </div>

          {chosen === undefined && (
            <p className="hint-text">اختر إجابة أولاً لتفعيل زر «التالي» حتى لا يتم تخطي أسئلة بدون حل.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return <div className="min-h-screen flex items-center justify-center text-muted"><div className="loading-dot" />{text}</div>;
}
function Empty({ text }: { text: string }) {
  return <div className="min-h-screen flex items-center justify-center px-5 text-muted text-center">{text}</div>;
}

function getQuestionImageUrl(question: Question, category?: QuestionCategory) {
  const url = question?.imageUrl || '';
  if (category === 'Mechanic') {
    const match = url.match(/(?:^|\/)sign_(210|211|212|213|214|215|216|217|218|219|220|221|222|223|224|225|226|227|228|229|230|231|232|233|234|235)\.webp$/i);
    if (match) return `/mechanic/mechanic_${match[1]}.webp`;
  }
  return url;
}
