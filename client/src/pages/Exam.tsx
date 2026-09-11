import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';

const DURATION = 15 * 60;
const PASS_SCORE = 25;

export default function Exam() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(DURATION);
  const [loading, setLoading] = useState(true);
  const finishedRef = useRef(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([api.getQuestions('Ser'), api.getQuestions('Ishara'), api.getQuestions('Mechanic')]).then(
      ([ser, ish, mek]) => {
        const seed = Number(modelId) || 1;
        // Seeded shuffle: يعطي كل نموذج 30 سؤالاً بالضبط، بدون اعتماد على
        // فلترة قد تنتج 28/29 سؤالاً بسبب قسمة غير متساوية.
        const pick = (arr: Question[], n: number, salt: number) => {
          const copy = [...arr];
          let state = (seed * 2654435761 + salt * 1013904223) >>> 0;
          for (let i = copy.length - 1; i > 0; i--) {
            state = (Math.imul(state ^ (state >>> 16), 2246822519) + 3266489917) >>> 0;
            const j = state % (i + 1);
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          return copy.slice(0, n);
        };
        const picked = [
          ...pick(ser, 12, 11),
          ...pick(ish, 12, 23),
          ...pick(mek, 6, 37),
        ];
        if (picked.length !== 30) throw new Error('تعذر تجهيز ٣٠ سؤالاً للاختبار.');
        setQuestions(picked);
        setLoading(false);
      }
    ).catch((err) => {
      setLoadError(err instanceof Error ? err.message : 'تعذر تحميل الأسئلة.');
      setLoading(false);
    });
  }, [modelId]);

  // الامتحان صغير وكل الأسئلة معروفة من البداية، فبنحمّل كل صوره مسبقاً بالخلفية
  // مشان التنقل بين الأسئلة (بالترتيب أو بالضغط على رقم مباشرة) يطلع فوراً
  useEffect(() => {
    questions.slice(current, current + 3).forEach((qq) => {
      if (qq.imageUrl) { const img = new Image(); img.src = qq.imageUrl; }
    });
  }, [questions, current]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    let correct = 0;
    const wrongQuestions: { question: Question; chosen: number }[] = [];
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswerIndex) correct++;
      else if (answers[q.id] !== undefined) wrongQuestions.push({ question: q, chosen: answers[q.id] });
    });
    const answered = Object.keys(answers).length;
    api.submitExamAttempt({
      modelId: Number(modelId) || 1,
      total: questions.length,
      correct,
      answered,
      wrongQuestionIds: wrongQuestions.map((w) => w.question.id),
    }).catch(() => {});
    navigate('/result', {
      state: { correct, total: questions.length, answered, wrongQuestions },
    });
  }, [answers, questions, navigate, modelId]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, finish]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">...جارِ التحضير</div>;
  }

  const q = questions[current];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const timerUrgent = seconds <= 60;

  return (
    <div className="min-h-screen">
      <div className="bg-surface text-white sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70">السؤال {current + 1} من {questions.length}</p>
            <p className="text-sm font-semibold">نموذج {modelId}</p>
          </div>
          <div
            className={`rounded-lg px-3.5 py-1.5 font-mono font-bold text-lg ${
              timerUrgent ? 'bg-exam animate-pulse' : 'bg-white/10'
            }`}
          >
            {mm}:{ss}
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <div
            className="h-1 bg-brand transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 py-3 max-w-lg mx-auto">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border ${
                i === current
                  ? 'border-brand text-brand'
                  : answers[qq.id] !== undefined
                  ? 'bg-brand border-brand text-white'
                  : 'border-white/20 text-white/50'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="bg-surface rounded-xl2 border border-line p-5">
          {q.imageUrl && (
            <div className="w-full max-w-[200px] aspect-square mx-auto mb-4 rounded-xl border border-line bg-paper flex items-center justify-center overflow-hidden">
              <OptimizedImage src={q.imageUrl} alt={`صورة توضيحية للسؤال ${q.id}`} priority={current < 2} className="w-full h-full p-3" />
            </div>
          )}
          <p className="text-[17px] font-bold text-ink leading-relaxed text-center mb-5">{q.text}</p>

          <div className="space-y-2.5">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                className={`w-full text-right rounded-xl border-[1.5px] px-4 py-3.5 flex items-center gap-3 transition-colors ${
                  answers[q.id] === i ? 'bg-brand-soft border-brand text-brand' : 'bg-paper border-line'
                }`}
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                  {['أ', 'ب', 'ج', 'د'][i]}
                </span>
                <span className="flex-1 leading-snug">{opt}</span>
              </button>
            ))}
          </div>

          <DiagramRenderer question={q} />

          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => setCurrent((c) => Math.min(c + 1, questions.length - 1))}
              disabled={current === questions.length - 1}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-signs disabled:opacity-40"
            >
              التالي ←
            </button>
            <button
              onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
              disabled={current === 0}
              className="flex-1 py-3 rounded-xl font-semibold text-muted bg-paper border border-line disabled:opacity-40"
            >
              → السابق
            </button>
          </div>
        </div>

        <button
          onClick={finish}
          className="w-full mt-4 py-3.5 rounded-xl font-bold text-white bg-exam"
        >
          إنهاء الاختبار
        </button>
      </div>
    </div>
  );
}
