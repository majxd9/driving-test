import { useEffect, useState } from 'react';
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
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const theme = THEME[category as QuestionCategory];

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    api
      .getQuestions(category as QuestionCategory)
      .then(setQuestions)
      .finally(() => setLoading(false));
  }, [category]);

  const q = questions[index];

  function choose(i: number) {
    if (selected !== null) return;
    setSelected(i);
  }

  function next() {
    setSelected(null);
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }

  function prev() {
    setSelected(null);
    setIndex((i) => Math.max(i - 1, 0));
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
      <div className={`${theme.head} sticky top-0 z-10 text-white px-4 py-3.5 flex items-center gap-3`}>
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="font-semibold text-sm flex-1">{theme.name}</span>
        <span className="text-xs opacity-90">
          {index + 1} / {questions.length}
        </span>
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
                const isChosen = i === selected;
                let style = 'bg-paper border-line';
                if (selected !== null) {
                  if (isCorrect) style = `${theme.soft} border-current ${theme.text}`;
                  else if (isChosen) style = 'bg-exam-soft border-exam text-exam';
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={selected !== null}
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

            {selected !== null && q.explanation && (
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
