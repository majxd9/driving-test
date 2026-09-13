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
  const [imageExpanded, setImageExpanded] = useState(false);
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

  useEffect(() => {
    questions.slice(current, current + 3).forEach((qq) => {
      if (qq.imageUrl) {
        const img = new Image();
        img.decoding = 'async';
        img.src = qq.imageUrl;
      }
    });
  }, [questions, current]);

  useEffect(() => { setImageExpanded(false); }, [current]);

  useEffect(() => {
    if (!imageExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [imageExpanded]);

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
    return <div className="h-[100dvh] flex items-center justify-center px-4 overflow-hidden"><div className="question-card w-full max-w-lg"><div className="skeleton h-48 rounded-2xl" /><div className="skeleton h-6 rounded-lg mt-4" /><div className="skeleton h-11 rounded-xl mt-3" /><div className="skeleton h-11 rounded-xl mt-2" /></div></div>;
  }

  if (loadError || !questions.length) {
    return <div className="h-[100dvh] flex items-center justify-center px-5 overflow-hidden"><div className="question-card w-full max-w-md text-center"><h1 className="text-xl font-black mb-2">تعذر تحضير الاختبار</h1><p className="text-muted text-sm leading-relaxed">{loadError ?? 'لم يتم العثور على أسئلة.'}</p><button onClick={loadExam} className="primary-cta mt-5 w-full">إعادة المحاولة</button></div></div>;
  }

  const q = questions[current];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const timerUrgent = seconds <= 60;

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col">
      <div className="exam-topbar shrink-0">
        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
          <div><p className="text-[10px] opacity-70">السؤال {current + 1} من {questions.length}</p><p className="text-[11px] font-semibold">نموذج {modelId}</p></div>
          <div className={`timer-chip ${timerUrgent ? 'urgent' : ''}`}>{mm}:{ss}</div>
        </div>
        <div className="progress"><span style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
        <div className="flex flex-wrap gap-1 px-3 py-1.5 max-w-2xl mx-auto">
          {questions.map((qq, i) => (
            <button key={qq.id} onClick={() => setCurrent(i)} aria-label={`السؤال ${i + 1}`} className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[8px] font-bold flex items-center justify-center border ${i === current ? 'border-brand text-brand' : answers[qq.id] !== undefined ? 'bg-brand border-brand text-white' : 'border-white/20 text-white/50'}`}>{i + 1}</button>
          ))}
        </div>
      </div>

      <main className="flex-1 min-h-0 w-full max-w-lg mx-auto px-2 sm:px-4 py-2 overflow-hidden flex flex-col">
        <div className="question-card exam-question-card flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4">
          {q.imageUrl && (
            <div className="shrink-0 mb-1.5">
              <div className="relative w-full h-[16dvh] sm:h-[22dvh] max-h-[220px] rounded-xl overflow-hidden bg-black/5 border border-line">
                <OptimizedImage src={q.imageUrl} alt={`صورة توضيحية للسؤال ${q.id}`} priority={current === 0} sizes="(max-width: 640px) 96vw, 420px" className="w-full h-full object-contain p-0.5" />
                <button type="button" onClick={() => setImageExpanded(true)} className="absolute bottom-1.5 left-1.5 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center text-lg shadow-lg border border-white/20" aria-label="تكبير الصورة">+</button>
              </div>
            </div>
          )}

          <div className="shrink-0">
            <p className="question-number text-[10px]">سؤال {current + 1}</p>
            <h1 className="exam-question-title text-[14px] sm:text-base leading-5 sm:leading-6 line-clamp-3">{q.text}</h1>
          </div>

          <div className="exam-answer-list space-y-1.5 mt-2 flex-1 min-h-0 overflow-hidden">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))} className={`answer-option min-h-[38px] sm:min-h-[43px] py-1.5 px-2.5 text-[13px] sm:text-sm ${answers[q.id] === i ? 'selected' : ''}`}>
                <span className="answer-letter shrink-0">{['أ', 'ب', 'ج', 'د', 'هـ', 'و'][i]}</span>
                <span className="flex-1 leading-tight text-right line-clamp-2">{opt}</span>
              </button>
            ))}
          </div>

          <div className="shrink-0 mt-1"><DiagramRenderer question={q} /></div>

          <div className="exam-nav-actions shrink-0 flex gap-2 mt-2">
            <button onClick={() => setCurrent((c) => Math.max(c - 1, 0))} disabled={current === 0} className="flex-1 py-2 sm:py-2.5 rounded-xl text-sm font-semibold text-muted bg-paper border border-line disabled:opacity-40">→ السابق</button>
            <button onClick={() => setCurrent((c) => Math.min(c + 1, questions.length - 1))} disabled={current === questions.length - 1} className="flex-1 py-2 sm:py-2.5 rounded-xl text-sm font-bold text-white bg-signs disabled:opacity-40">التالي ←</button>
          </div>
        </div>

        <button onClick={finish} className="shrink-0 w-full mt-1.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-exam">إنهاء الاختبار وعرض النتيجة</button>
      </main>

      {imageExpanded && q.imageUrl && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setImageExpanded(false)}>
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <OptimizedImage src={q.imageUrl} alt={`الصورة المكبرة للسؤال ${q.id}`} sizes="100vw" className="max-w-full max-h-full object-contain rounded-xl" />
            <button type="button" onClick={() => setImageExpanded(false)} className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/70 text-white text-xl flex items-center justify-center border border-white/20" aria-label="إغلاق الصورة">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
