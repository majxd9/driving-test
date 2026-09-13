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
    return (
      <div className="h-[100dvh] overflow-hidden bg-[#06090d] text-white flex items-center justify-center px-4 font-mono">
        <div className="w-full max-w-xl border border-cyan-400/20 bg-[#0b1118] p-5 shadow-[0_0_70px_rgba(34,211,238,0.08)]">
          <div className="text-[10px] tracking-[0.35em] text-cyan-300/60 mb-3">NEO TEST // SYSTEM BOOT</div>
          <div className="h-2 bg-white/5 overflow-hidden"><div className="h-full w-2/3 bg-cyan-300 animate-pulse" /></div>
          <div className="mt-4 text-xs text-white/45">جاري تجهيز وحدة الاختبار...</div>
        </div>
      </div>
    );
  }

  if (loadError || !questions.length) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-[#06090d] text-white flex items-center justify-center px-5">
        <div className="w-full max-w-md border border-red-400/30 bg-[#0b1118] p-6 text-center shadow-[0_0_70px_rgba(248,113,113,0.08)]">
          <div className="text-xs tracking-[0.3em] text-red-300/70 mb-3">SYSTEM FAULT</div>
          <h1 className="text-xl font-black mb-2">تعذر تحضير الاختبار</h1>
          <p className="text-white/55 text-sm leading-relaxed">{loadError ?? 'لم يتم العثور على أسئلة.'}</p>
          <button onClick={loadExam} className="mt-5 w-full py-3 bg-cyan-300 text-[#061016] font-black">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const timerUrgent = seconds <= 60;
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-[#06090d] text-white selection:bg-cyan-300 selection:text-black" dir="rtl">
      <div className="relative shrink-0 border-b border-cyan-300/10 bg-[#080d13]/95 shadow-[0_10px_45px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-cyan-300 to-transparent opacity-70" />
        <div className="h-10 px-3 sm:px-5 flex items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
            <span className="text-[10px] tracking-[0.18em] text-cyan-200/80">NEO TEST</span>
            <span className="hidden sm:inline text-[9px] text-white/25">// DRIVING SIMULATION</span>
          </div>
          <div className={`px-2.5 py-1 border text-xs font-black tracking-widest ${timerUrgent ? 'border-red-400/60 text-red-300 bg-red-400/10 animate-pulse' : 'border-cyan-300/20 text-cyan-200 bg-cyan-300/5'}`}>
            T-{mm}:{ss}
          </div>
          <div className="text-[9px] text-white/35">MODEL {modelId}</div>
        </div>
        <div className="h-1 bg-white/5"><span className="block h-full bg-cyan-300 shadow-[0_0_14px_#67e8f9] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        <div className="h-8 px-3 sm:px-5 flex items-center gap-1 overflow-hidden" aria-label="التنقل بين الأسئلة">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              aria-label={`السؤال ${i + 1}`}
              className={`relative shrink-0 w-5 h-5 text-[8px] font-mono font-bold border transition-colors ${
                i === current ? 'border-cyan-300 bg-cyan-300 text-[#061016] shadow-[0_0_12px_rgba(103,232,249,0.35)]' :
                answers[qq.id] !== undefined ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' :
                'border-white/10 bg-white/[0.02] text-white/30 hover:border-white/30 hover:text-white/70'
              }`}
            >{String(i + 1).padStart(2, '0')}</button>
          ))}
        </div>
      </div>

      <main className="relative flex-1 min-h-0 w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-3 overflow-hidden flex flex-col">
        <div className="absolute -top-24 -left-24 w-56 h-56 rounded-full bg-cyan-400/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-2 sm:gap-3 overflow-hidden">
          <section className="min-h-0 flex flex-col border border-cyan-300/10 bg-[#0a1017] shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
            <div className="h-7 shrink-0 px-3 flex items-center justify-between border-b border-white/5 font-mono text-[9px]">
              <span className="text-cyan-300/55 tracking-[0.2em]">QUESTION FEED</span>
              <span className="text-white/25">NODE {String(current + 1).padStart(2, '0')}</span>
            </div>

            <div className="flex-1 min-h-0 p-2.5 sm:p-4 flex flex-col overflow-hidden">
              {q.imageUrl && (
                <div className="shrink-0 mb-2">
                  <div className="relative w-full h-[17dvh] sm:h-[21dvh] max-h-[210px] min-h-[92px] overflow-hidden border border-cyan-300/15 bg-[#05080c]">
                    <div className="absolute inset-0 pointer-events-none z-10 border border-white/[0.03]" />
                    <div className="absolute top-1 left-1 w-5 h-5 border-l border-t border-cyan-300/50 z-20" />
                    <div className="absolute bottom-1 right-1 w-5 h-5 border-r border-b border-cyan-300/50 z-20" />
                    <OptimizedImage src={q.imageUrl} alt={`صورة توضيحية للسؤال ${q.id}`} priority={current === 0} sizes="(max-width: 1024px) 96vw, 800px" className="w-full h-full object-contain p-1" />
                    <button type="button" onClick={() => setImageExpanded(true)} className="absolute bottom-1.5 left-1.5 z-30 w-7 h-7 bg-black/75 border border-white/15 text-cyan-200 text-sm" aria-label="تكبير الصورة">+</button>
                  </div>
                </div>
              )}

              <div className="shrink-0 border-r-2 border-cyan-300/60 pr-2.5 py-0.5">
                <p className="text-[9px] font-mono tracking-[0.2em] text-cyan-300/55 mb-1">QUERY {String(current + 1).padStart(2, '0')} / 30</p>
                <h1 className="text-[14px] sm:text-lg font-black leading-6 sm:leading-7 line-clamp-3">{q.text}</h1>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                    aria-pressed={answers[q.id] === i}
                    className={`group relative min-h-[38px] sm:min-h-[44px] px-2.5 py-1.5 text-[12px] sm:text-sm text-right border flex items-center gap-2 overflow-hidden transition-all duration-150 ${
                      answers[q.id] === i
                        ? 'border-cyan-300 bg-cyan-300 text-[#061016] shadow-[0_0_22px_rgba(103,232,249,0.16)]'
                        : 'border-white/10 bg-[#080d13] text-white/75 hover:border-cyan-300/40 hover:bg-cyan-300/[0.04]'
                    }`}
                  >
                    <span className={`shrink-0 w-7 h-7 grid place-items-center font-mono font-black text-[10px] border ${answers[q.id] === i ? 'border-[#061016]/30 bg-[#061016]/10' : 'border-white/10 text-cyan-200/70'}`}>{['A', 'B', 'C', 'D', 'E', 'F'][i]}</span>
                    <span className="flex-1 leading-tight line-clamp-2">{opt}</span>
                    <span className="absolute left-0 top-0 h-full w-0.5 bg-cyan-300 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>

              <div className="shrink-0 mt-1"><DiagramRenderer question={q} /></div>
            </div>

            <div className="shrink-0 h-12 px-2.5 sm:px-4 border-t border-white/5 bg-[#080d13] flex gap-2 items-center">
              <button onClick={() => setCurrent((c) => Math.max(c - 1, 0))} disabled={current === 0} className="h-8 px-4 border border-white/10 text-xs font-bold text-white/55 hover:text-white hover:border-white/25 disabled:opacity-25">→ السابق</button>
              <div className="flex-1 text-center font-mono text-[9px] text-white/25">SELECT ONE // CONTINUE</div>
              <button onClick={() => setCurrent((c) => Math.min(c + 1, questions.length - 1))} disabled={current === questions.length - 1} className="h-8 px-5 bg-cyan-300 text-[#061016] text-xs font-black hover:bg-cyan-200 disabled:opacity-25">التالي ←</button>
            </div>
          </section>

          <aside className="hidden lg:flex min-h-0 flex-col gap-2 overflow-hidden font-mono">
            <div className="border border-cyan-300/10 bg-[#0a1017] p-3">
              <div className="text-[9px] tracking-[0.2em] text-white/30 mb-2">MISSION STATUS</div>
              <div className="flex items-end justify-between">
                <div><div className="text-3xl font-black text-cyan-200">{String(current + 1).padStart(2, '0')}</div><div className="text-[9px] text-white/30">CURRENT NODE</div></div>
                <div className="text-right"><div className="text-lg font-black text-white/80">{Object.keys(answers).length}<span className="text-white/20">/30</span></div><div className="text-[9px] text-white/30">ANSWERED</div></div>
              </div>
              <div className="mt-3 h-1 bg-white/5"><span className="block h-full bg-emerald-300" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} /></div>
            </div>

            <div className={`border p-4 ${timerUrgent ? 'border-red-400/40 bg-red-400/[0.04]' : 'border-cyan-300/10 bg-[#0a1017]'}`}>
              <div className="text-[9px] tracking-[0.2em] text-white/30 mb-2">CHRONO</div>
              <div className={`text-4xl font-black tracking-wider ${timerUrgent ? 'text-red-300' : 'text-cyan-200'}`}>{mm}:{ss}</div>
              <div className="mt-2 text-[9px] text-white/25">TIME REMAINING</div>
            </div>

            <div className="flex-1 min-h-0 border border-cyan-300/10 bg-[#0a1017] p-3 overflow-hidden">
              <div className="text-[9px] tracking-[0.2em] text-white/30 mb-2">NAVIGATION MATRIX</div>
              <div className="grid grid-cols-5 gap-1">
                {questions.map((qq, i) => (
                  <button key={qq.id} onClick={() => setCurrent(i)} className={`h-7 text-[9px] font-black border ${i === current ? 'border-cyan-300 bg-cyan-300 text-[#061016]' : answers[qq.id] !== undefined ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-white/5 text-white/30 hover:border-white/20'}`}>{i + 1}</button>
                ))}
              </div>
            </div>

            <button onClick={finish} className="h-10 shrink-0 border border-red-300/30 bg-red-300/[0.06] text-red-200 text-xs font-black hover:bg-red-300/10">إنهاء الاختبار // SUBMIT</button>
          </aside>
        </div>

        <button onClick={finish} className="lg:hidden shrink-0 w-full mt-1.5 h-9 border border-red-300/30 bg-red-300/[0.06] text-red-200 text-[11px] font-black">إنهاء الاختبار // SUBMIT</button>
      </main>

      {imageExpanded && q.imageUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setImageExpanded(false)}>
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <OptimizedImage src={q.imageUrl} alt={`الصورة المكبرة للسؤال ${q.id}`} sizes="100vw" className="max-w-full max-h-full object-contain" />
            <button type="button" onClick={() => setImageExpanded(false)} className="absolute top-2 right-2 w-10 h-10 bg-black/80 border border-cyan-300/30 text-cyan-200 text-xl" aria-label="إغلاق الصورة">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
