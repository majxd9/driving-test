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
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getQuestions('Ser'), api.getQuestions('Ishara'), api.getQuestions('Mechanic')]).then(([ser, ish, mek]) => {
      if (cancelled) return;
      const seed = Number(modelId) || 1;
      const pick = (arr: Question[], n: number) => {
        const copy = [...arr]; let state = (seed * 2654435761 + n * 997) >>> 0;
        for (let i = copy.length - 1; i > 0; i--) { state = (state * 1664525 + 1013904223) >>> 0; const j = state % (i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
        return copy.slice(0, n);
      };
      setQuestions([...pick(ser, 12), ...pick(ish, 12), ...pick(mek, 6)]);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [modelId]);

  useEffect(() => {
    questions.slice(current, current + 3).forEach(q => { if (q.imageUrl) { const img = new Image(); img.src = q.imageUrl; } });
  }, [questions, current]);

  const finish = useCallback(() => {
    if (finishedRef.current || !questions.length) return;
    finishedRef.current = true;
    const review = questions.map(q => ({ id:q.id, text:q.text, options:q.options, userAnswer:answers[q.id] ?? null, correctAnswer:q.correctAnswerIndex, explanation:q.explanation || '', imageUrl:q.imageUrl || null, category:q.category }));
    const correct = review.filter(r => r.userAnswer === r.correctAnswer).length;
    const answered = review.filter(r => r.userAnswer !== null).length;
    api.submitExamResult({ modelId:Number(modelId) || 1, total:questions.length, correct, answered }).catch(() => {});
    navigate('/result', { state:{ correct, total:questions.length, answered, review } });
  }, [answers, questions, navigate, modelId]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => setSeconds(s => { if (s <= 1) { clearInterval(timer); finish(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(timer);
  }, [loading, finish]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted">...جارِ التحضير</div>;
  if (!questions.length) return <div className="min-h-screen flex items-center justify-center text-exam">تعذر تحميل أسئلة الاختبار. حاول مرة أخرى.</div>;
  const q = questions[current], isLast = current === questions.length - 1;
  const mm = String(Math.floor(seconds/60)).padStart(2,'0'), ss = String(seconds%60).padStart(2,'0');
  return <div className="min-h-screen">
    <div className="bg-surface text-white sticky top-0 z-10 shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between"><div><p className="text-xs opacity-70">السؤال {current+1} من {questions.length}</p><p className="text-sm font-semibold">نموذج {modelId}</p></div><div className={`rounded-lg px-3.5 py-1.5 font-mono font-bold text-lg ${seconds<=60?'bg-exam animate-pulse':'bg-white/10'}`}>{mm}:{ss}</div></div>
      <div className="h-1 bg-white/10"><div className="h-1 bg-brand transition-all" style={{width:`${((current+1)/questions.length)*100}%`}}/></div>
      <div className="flex flex-wrap gap-1.5 px-4 py-3 max-w-lg mx-auto">{questions.map((qq,i)=><button key={qq.id} onClick={()=>setCurrent(i)} className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border ${i===current?'border-brand text-brand':answers[qq.id]!==undefined?'bg-brand border-brand text-white':'border-white/20 text-white/50'}`}>{i+1}</button>)}</div>
    </div>
    <div className="max-w-lg mx-auto px-4 py-5"><div className="bg-surface rounded-xl2 border border-line p-5">
      {q.imageUrl && <div className="w-full max-w-[560px] min-h-[240px] max-h-[430px] mx-auto mb-5 rounded-2xl border border-line bg-paper flex items-center justify-center overflow-hidden p-3"><OptimizedImage src={q.imageUrl} alt={`صورة توضيحية للسؤال ${q.id}`} priority={current<2} sizes="(max-width: 768px) 92vw, 560px" className="w-full h-full min-h-[220px] max-h-[400px]" objectFit="contain"/></div>}
      <p className="text-[17px] font-bold text-ink leading-relaxed text-center mb-5">{q.text}</p>
      <div className="space-y-2.5">{q.options.map((opt,i)=><button key={i} onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`w-full text-right rounded-xl border-[1.5px] px-4 py-3.5 flex items-center gap-3 transition-colors ${answers[q.id]===i?'bg-brand-soft border-brand text-brand':'bg-paper border-line'}`}><span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{['أ','ب','ج','د'][i]}</span><span className="flex-1 leading-snug">{opt}</span></button>)}</div>
      <DiagramRenderer question={q}/>
      <div className="flex gap-2.5 mt-5"><button onClick={()=>isLast?finish():setCurrent(c=>c+1)} className="flex-1 py-3 rounded-xl font-semibold text-white bg-signs">{isLast?'إنهاء الاختبار ✓':'التالي ←'}</button><button onClick={()=>setCurrent(c=>Math.max(c-1,0))} disabled={current===0} className="flex-1 py-3 rounded-xl font-semibold text-muted bg-paper border border-line disabled:opacity-40">→ السابق</button></div>
    </div><button onClick={finish} className="w-full mt-4 py-3.5 rounded-xl font-bold text-white bg-exam">إنهاء الاختبار الآن</button></div>
  </div>;
}
