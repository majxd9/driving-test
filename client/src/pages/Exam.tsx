import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';

const DURATION = 15 * 60;

export default function Exam() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(DURATION);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const finishedRef = useRef(false);

  const loadExam = useCallback(async () => {
    const id = Number(modelId) || 1;
    setLoading(true);
    setLoadError(null);
    try {
      const picked = await api.getExamQuestions(id);
      if (picked.length !== 30) throw new Error('تعذر تجهيز ٣٠ سؤالاً للاختبار.');
      setQuestions(picked);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'تعذر تحميل الأسئلة.');
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => { void loadExam(); }, [loadExam]);

  // نحمّل الحالي + السؤالين التاليين فقط. باقي الصور تعتمد على lazy loading والمتصفح يخزنها في الكاش.
  useEffect(() => {
    questions.slice(current, current + 3).forEach((qq) => {
      if (qq.imageUrl) {
        const img = new Image();
        img.decoding = 'async';
        img.src = qq.imageUrl;
      }
    });
  }, [questions, current]);

  const finish = useCallback(() => {
    if (finishedRef.current || !questions.length) return;
    finishedRef.current = true;
    let correct = 0;
    const reviewQuestions = questions.map((question) => {
      const chosen = answers[question.id];
      if (chosen === question.correctAnswerIndex) correct++;
      return { question, chosen: chosen ?? null };
    });
    const answered = Object.keys(answers).length;
    const wrongQuestionIds = reviewQuestions
      .filter((item) => item.chosen !== null && item.chosen !== item.question.correctAnswerIndex)
      .map((item) => item.question.id);

    api.submitExamAttempt({
      modelId: Number(modelId) || 1,
      total: questions.length,
      correct,
      answered,
      wrongQuestionIds,
    }).catch(() => {});

    navigate('/result', {
      state: { correct, total: questions.length, answered, reviewQuestions, modelId: Number(modelId) || 1 },
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
    return <div className="min-h-screen flex items-center justify-center px-5"><div className="question-card w-full max-w-lg"><div className="skeleton h-72 rounded-2xl" /><div className="skeleton h-6 rounded-lg mt-5" /><div className="skeleton h-12 rounded-xl mt-4" /><div className="skeleton h-12 rounded-xl mt-2" /></div></div>;
  }

  if (loadError || !questions.length) {
    return <div className="min-h-screen flex items-center justify-center px-5"><div className="question-card w-full max-w-md text-center"><h1 className="text-xl font-black mb-2">تعذر تحضير الاختبار</h1><p className="text-muted text-sm leading-relaxed">{loadError ?? 'لم يتم العثور على أسئلة.'}</p><button onClick={loadExam} className="primary-cta mt-5 w-full">إعادة المحاولة</button></div></div>;
  }

  const q = questions[current];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const timerUrgent = seconds <= 60;

  return (
    <div className="min-h-screen">
      <div className="exam-topbar">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div><p className="text-xs opacity-70">السؤال {current + 1} من {questions.length}</p><p className="text-sm font-semibold">نموذج {modelId}</p></div>
          <div className={`timer-chip ${timerUrgent ? 'urgent' : ''}`}>{mm}:{ss}</div>
        </div>
        <div className="progress"><span style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
        <div className="flex flex-wrap gap-1.5 px-4 py-3 max-w-2xl mx-auto">
          {questions.map((qq, i) => <button key={qq.id} onClick={() => setCurrent(i)} aria-label={`السؤال ${i + 1}`} className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center border ${i === current ? 'border-brand text-brand' : answers[qq.id] !== undefined ? 'bg-brand border-brand text-white' : 'border-white/20 text-white/50'}`}>{i + 1}</button>)}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="question-card">
          {q.imageUrl && <div className="question-image"><OptimizedImage src={q.imageUrl} alt={`صورة توضيحية للسؤال ${q.id}`} priority={current === 0} sizes="(max-width: 640px) 90vw, 420px" className="w-full h-full" /></div>}
          <p className="question-number">سؤال {current + 1}</p>
          <h1>{q.text}</h1>
          <div className="space-y-2.5">
            {q.options.map((opt, i) => <button key={i} onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))} className={`answer-option ${answers[q.id] === i ? 'selected' : ''}`}><span className="answer-letter">{['أ','ب','ج','د','هـ','و'][i]}</span><span className="flex-1 leading-snug">{opt}</span></button>)}
          </div>
          <DiagramRenderer question={q} />
          <div className="flex gap-2.5 mt-5"><button onClick={() => setCurrent((c) => Math.max(c - 1, 0))} disabled={current === 0} className="flex-1 py-3 rounded-xl font-semibold text-muted bg-paper border border-line disabled:opacity-40">→ السابق</button><button onClick={() => setCurrent((c) => Math.min(c + 1, questions.length - 1))} disabled={current === questions.length - 1} className="flex-1 py-3 rounded-xl font-bold text-white bg-signs disabled:opacity-40">التالي ←</button></div>
        </div>
        <button onClick={finish} className="w-full mt-4 py-3.5 rounded-xl font-bold text-white bg-exam">إنهاء الاختبار وعرض النتيجة</button>
      </div>
    </div>
  );
}
