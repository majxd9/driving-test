import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question, QuestionCategory } from '../types';

const THEME: Record<QuestionCategory, { name: string; head: string; soft: string; text: string }> = {
  Ser: { name: 'أسئلة قواعد السير', head: 'bg-brand', soft: 'bg-brand-soft', text: 'text-brand' },
  Ishara: { name: 'أسئلة الإشارات', head: 'bg-signs', soft: 'bg-signs-soft', text: 'text-signs' },
  Mechanic: { name: 'أسئلة الميكانيك', head: 'bg-mek', soft: 'bg-mek-soft', text: 'text-mek' },
};

export default function Study() {
  const { category } = useParams<{ category: QuestionCategory }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const theme = THEME[category as QuestionCategory];

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    setAnswers({});
    setIndex(0);
    api
      .getQuestions(category as QuestionCategory)
      .then(setQuestions)
      .finally(() => setLoading(false));
  }, [category]);

  const preloaded = useRef<Set<string>>(new Set());

  // تحميل مسبق لصور الأسئلة الجاية (الحالي + 3 بعده) مشان لما يضغط "التالي" تطلع الصورة فوراً بدون انتظار
  useEffect(() => {
    const upcoming = questions.slice(index, index + 4);
    upcoming.forEach((qq) => {
      if (qq.imageUrl && !preloaded.current.has(qq.imageUrl)) {
        preloaded.current.add(qq.imageUrl);
        const img = new Image();
        img.src = qq.imageUrl;
      }
    });
  }, [questions, index]);

  const q = questions[index];
  const chosen = q ? answers[q.id] : undefined;

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter((qq) => answers[qq.id] === qq.correctAnswerIndex).length;
  const wrongCount = answeredCount - correctCount;

  function choose(i: number) {
    if (!q || answers[q.id] !== undefined) return;
    setAnswers((a) => ({ ...a, [q.id]: i }));
  }

  function next() {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }

  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  function jumpTo(n: number) {
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(Math.round(n) - 1, 0), questions.length - 1);
    setIndex(clamped);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">...جارِ التحميل</div>;
  }

  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        لا توجد أسئلة بهذا القسم بعد
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className={`${theme.head} sticky top-0 z-10 text-white`}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="font-semibold text-sm flex-1">{theme.name}</span>
          <span className="flex items-center gap-1 text-xs opacity-90">
            <input
              key={index}
              type="number"
              inputMode="numeric"
              min={1}
              max={questions.length}
              defaultValue={index + 1}
              onKeyDown={(e) => {
                if (e.key === 'Enter') jumpTo(Number(e.currentTarget.value));
              }}
              onBlur={(e) => jumpTo(Number(e.target.value))}
              aria-label="الانتقال إلى سؤال رقم"
              className="w-11 text-center rounded-md bg-white/15 text-white outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span>/ {questions.length}</span>
          </span>
        </div>
        <div className="px-4 pb-2.5 -mt-1 flex items-center gap-4 text-xs text-white/85">
          <span>✔ {correctCount} صح</span>
          <span>✘ {wrongCount} خطأ</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="bg-surface rounded-xl2 border border-line overflow-hidden">
          <div className="p-5">
            {q.imageUrl && (
              <div className="w-full max-w-[220px] aspect-square mx-auto mb-4 rounded-xl border border-line bg-paper flex items-center justify-center overflow-hidden">
                <img src={q.imageUrl} alt="إشارة" className="w-full h-full object-contain p-3" />
              </div>
            )}

            <p className="text-[17px] font-bold text-ink leading-relaxed text-center mb-5">
              {q.text}
            </p>

            <div className="space-y-2.5">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctAnswerIndex;
                const isChosen = i === chosen;
                let style = 'bg-paper border-line';
                if (chosen !== undefined) {
                  if (isCorrect) style = `${theme.soft} border-current ${theme.text}`;
                  else if (isChosen) style = 'bg-exam-soft border-exam text-exam';
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={chosen !== undefined}
                    className={`w-full text-right rounded-xl border-[1.5px] px-4 py-3.5 flex items-center gap-3 transition-colors ${style}`}
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                      {['أ', 'ب', 'ج', 'د'][i]}
                    </span>
                    <span className="flex-1 leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>

            {chosen !== undefined && q.explanation && (
              <div className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${theme.soft} ${theme.text}`}>
                {q.explanation}
              </div>
            )}
          </div>

          <div className="flex border-t border-line">
            <button
              onClick={next}
              disabled={index === questions.length - 1}
              className={`flex-1 py-3.5 font-semibold text-white ${theme.head} disabled:opacity-40`}
            >
              التالي ←
            </button>
            <button
              onClick={prev}
              disabled={index === 0}
              className="flex-1 py-3.5 font-semibold text-muted bg-paper disabled:opacity-40"
            >
              → السابق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
