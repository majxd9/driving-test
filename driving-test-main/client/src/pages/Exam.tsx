import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Question } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';

const DURATION = 15 * 60;
const PASS_SCORE = 25;

function selectExamQuestions(all: Question[], modelId: number) {
  const valid = all.filter((q) => q.options.length === 4 && q.options.every((option) => option.trim()) && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4);
  const groups = {
    Ser: valid.filter((q) => q.category === 'Ser'),
    Ishara: valid.filter((q) => q.category === 'Ishara'),
    Mechanic: valid.filter((q) => q.category === 'Mechanic'),
  };

  const pickDeterministic = (items: Question[], count: number, seed: number) => {
    if (!items.length) return [];
    const offset = (Math.max(seed, 1) - 1) % items.length;
    const rotated = [...items.slice(offset), ...items.slice(0, offset)];
    const step = Math.max(1, Math.floor(items.length / Math.max(count, 1)));
    const picked: Question[] = [];
    let cursor = 0;
    const used = new Set<number>();
    while (picked.length < Math.min(count, rotated.length) && used.size < rotated.length) {
      const index = cursor % rotated.length;
      if (!used.has(index)) {
        picked.push(rotated[index]);
        used.add(index);
      }
      cursor += step;
      if (cursor > rotated.length * 3) cursor = used.size;
    }
    return picked;
  };

  const ser = pickDeterministic(groups.Ser, 12, modelId);
  const ishara = pickDeterministic(groups.Ishara, 12, modelId * 7);
  const mechanic = pickDeterministic(groups.Mechanic, 6, modelId * 11);
  return [...ser, ...ishara, ...mechanic].slice(0, 30);
}

export default function Exam() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(DURATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const finishedRef = useRef(false);
  const preloaded = useRef(new Set<string>());

  useEffect(() => {
    const seed = Number(modelId) || 1;
    Promise.all([api.getQuestions('Ser'), api.getQuestions('Ishara'), api.getQuestions('Mechanic')])
      .then(([ser, ish, mek]) => {
        const selected = selectExamQuestions([...ser, ...ish, ...mek], seed);
        if (selected.length < 30) throw new Error('لا يمكن تجهيز نموذج كامل من بنك الأسئلة الحالي.');
        setQuestions(selected);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تجهيز الاختبار'))
      .finally(() => setLoading(false));
  }, [modelId]);

  useEffect(() => {
    questions.slice(current, current + 3).forEach((q) => {
      if (!q.imageUrl || preloaded.current.has(q.imageUrl)) return;
      preloaded.current.add(q.imageUrl);
      const img = new Image();
      img.decoding = 'async';
      img.src = q.imageUrl;
    });
  }, [questions, current]);

  const finish = useCallback(() => {
    if (finishedRef.current || !questions.length) return;
    finishedRef.current = true;
    const correct = questions.reduce((sum, q, index) => sum + (answers[index] === q.correctAnswerIndex ? 1 : 0), 0);
    const answered = Object.keys(answers).length;
    api.submitExamResult({ modelId: Number(modelId) || 1, total: questions.length, correct, answered }).catch(() => {});
    navigate('/result', { state: { correct, total: questions.length, answered } });
  }, [answers, modelId, navigate, questions]);

  useEffect(() => {
    if (loading || error) return;
    const timer = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          clearInterval(timer);
          finish();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, error, finish]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const q = questions[current];
  const imageUrl = getQuestionImageUrl(q);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted">جارِ تجهيز الاختبار...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-muted px-6 text-center">{error}</div>;
  if (!q) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const timerUrgent = seconds <= 60;

  return (
    <div className="min-h-screen pb-8 bg-paper">
      <div className="bg-surface text-white sticky top-0 z-30 border-b border-line/80">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/models')} className="icon-button">→</button>
            <div className="flex-1">
              <p className="text-[11px] text-white/60">نموذج {modelId}</p>
              <p className="text-sm font-black">السؤال {current + 1} من {questions.length}</p>
            </div>
            <div className={`exam-timer ${timerUrgent ? 'urgent' : ''}`}>{mm}:{ss}</div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/65 mt-2">
            <span>{answeredCount} مجاب</span>
          </div>
        </div>
        <div className="h-1 bg-white/10"><div className="h-1 bg-brand transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap gap-1.5">
          {questions.map((qq, index) => (
            <button
              key={`${qq.id}-${index}`}
              onClick={() => setCurrent(index)}
              className={`exam-number ${index === current ? 'current' : answers[index] !== undefined ? 'answered' : ''}`}
              aria-label={`السؤال ${index + 1}`}
            >{index + 1}</button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-5">
        <div className="exam-card">
          {imageUrl && (
            <div className={`exam-media-frame ${q.category === 'Mechanic' ? 'mechanic-media' : ''}`}>
              <OptimizedImage
                src={imageUrl}
                alt={`صورة السؤال ${current + 1}`}
                priority={current < 2}
                sizes="(max-width: 768px) 94vw, 720px"
                className="exam-media-image"
                objectFit="contain"
              />
            </div>
          )}

          <p className="exam-question-text">{q.text}</p>

          <div className="space-y-2.5">
            {q.options.map((option, optionIndex) => (
              <button
                key={optionIndex}
                onClick={() => setAnswers((previous) => ({ ...previous, [current]: optionIndex }))}
                className={`exam-answer ${answers[current] === optionIndex ? 'selected' : ''}`}
              >
                <span className="answer-letter">{['أ', 'ب', 'ج', 'د'][optionIndex] || optionIndex + 1}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>

          {answers[current] !== undefined && <DiagramRenderer question={q} />}

          <div className="study-actions mt-6">
            <button disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))} className="secondary-cta">السابق →</button>
            {current === questions.length - 1 ? (
              <button onClick={finish} className="bg-exam text-white rounded-2xl py-3.5 font-black">إنهاء الاختبار</button>
            ) : (
              <button onClick={() => setCurrent((value) => value + 1)} className="bg-brand text-white rounded-2xl py-3.5 font-black">التالي ←</button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function getQuestionImageUrl(question: Question) {
  const url = question?.imageUrl || '';
  if (question?.category === 'Mechanic') {
    const match = url.match(/(?:^|\/)sign_(210|211|212|213|214|215|216|217|218|219|220|221|222|223|224|225|226|227|228|229|230|231|232|233|234|235)\.webp$/i);
    if (match) return `/mechanic/mechanic_${match[1]}.webp`;
  }
  return url;
}
