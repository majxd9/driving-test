import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';

const DURATION = 15 * 60;
const PASS_SCORE = 25;
const EXAM_SIZE = 30;
const letters = ['أ','ب','ج','د','هـ','و'];

function seededShuffle<T extends { id: number }>(items: T[], seed: number): T[] {
  const copy=[...items]; let state=(seed*9301+49297)%233280;
  const random=()=>{state=(state*9301+49297)%233280;return state/233280;};
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
const pick=(items:Question[],count:number,seed:number)=>seededShuffle(items,seed).slice(0,count);

export default function Exam(){
  const {modelId}=useParams(); const navigate=useNavigate();
  const [questions,setQuestions]=useState<Question[]>([]); const [answers,setAnswers]=useState<Record<number,number>>({});
  const [current,setCurrent]=useState(0); const [seconds,setSeconds]=useState(DURATION); const [loading,setLoading]=useState(true);
  const [error,setError]=useState(''); const [completed,setCompleted]=useState(false); const [saved,setSaved]=useState(true); const finished=useRef(false);

  useEffect(()=>{let cancelled=false; const seed=Math.max(1,Number(modelId)||1);
    Promise.all([api.getQuestions('Ser'),api.getQuestions('Ishara'),api.getQuestions('Mechanic')]).then(([ser,ish,mek])=>{
      if(cancelled)return; if(ser.length<12||ish.length<12||mek.length<6)throw new Error('الأسئلة المتاحة حالياً لا تكفي لبناء نموذج كامل من 30 سؤالاً.');
      const picked=[...pick(ser,12,seed*11+1),...pick(ish,12,seed*17+2),...pick(mek,6,seed*23+3)];
      if(picked.length!==EXAM_SIZE)throw new Error('تعذر تجهيز الاختبار كاملاً.'); setQuestions(picked);
    }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'تعذر تحميل الاختبار.')}).finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[modelId]);

  useEffect(()=>{questions.slice(current,current+5).forEach(q=>[q.imageUrl,q.diagramUrl].forEach(u=>{if(u){const i=new Image();i.src=u;}}))},[questions,current]);

  const finish=useCallback(async()=>{
    if(finished.current||questions.length!==EXAM_SIZE)return; finished.current=true;
    const correct=questions.filter(q=>answers[q.id]===q.correctAnswerIndex).length; const answered=Object.keys(answers).length;
    try{await api.submitExamResult({modelId:Number(modelId)||1,total:EXAM_SIZE,correct,answered});setSaved(true)}catch{setSaved(false)} setCompleted(true);
  },[answers,questions,modelId]);

  useEffect(()=>{if(loading||error||completed||questions.length!==EXAM_SIZE)return; const timer=setInterval(()=>setSeconds(s=>{if(s<=1){clearInterval(timer);void finish();return 0}return s-1}),1000); return()=>clearInterval(timer)},[loading,error,completed,questions.length,finish]);
  if(loading)return <div className="min-h-screen flex items-center justify-center text-muted">...جارِ تحضير الاختبار</div>;
  if(error||questions.length!==EXAM_SIZE)return <div className="min-h-screen flex items-center justify-center px-5"><div className="bg-surface rounded-[28px] border border-line p-6 text-center max-w-md"><p className="text-exam font-bold mb-4">{error||'لا توجد أسئلة كافية.'}</p><button onClick={()=>navigate('/models')} className="primary-cta w-full">العودة للنماذج</button></div></div>;

  const correct=questions.filter(q=>answers[q.id]===q.correctAnswerIndex).length; const answered=Object.keys(answers).length; const wrong=questions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!==q.correctAnswerIndex).length; const unanswered=EXAM_SIZE-answered;
  if(completed)return <div className="min-h-screen flex items-start justify-center px-5 py-10"><div className="w-full max-w-lg bg-surface rounded-[28px] border border-line p-6 text-center shadow-2xl"><div className={`mx-auto w-20 h-20 rounded-3xl grid place-items-center text-3xl font-black mb-4 ${correct>=PASS_SCORE?'bg-brand-soft text-brand':'bg-exam-soft text-exam'}`}>✓</div><p className="text-xs text-muted">انتهت الأسئلة</p><h1 className="text-2xl font-black text-ink mt-1">خلص الاختبار ✓</h1><p className="text-sm text-muted mt-2 mb-6">أجبت {answered} من {EXAM_SIZE} سؤالاً.</p><div className="grid grid-cols-3 gap-2.5 mb-5"><div className="bg-paper rounded-2xl border border-line p-3"><strong className="block text-2xl text-brand">{correct}</strong><span className="text-xs text-muted">صح</span></div><div className="bg-paper rounded-2xl border border-line p-3"><strong className="block text-2xl text-exam">{wrong}</strong><span className="text-xs text-muted">خطأ</span></div><div className="bg-paper rounded-2xl border border-line p-3"><strong className="block text-2xl text-muted">{unanswered}</strong><span className="text-xs text-muted">بدون جواب</span></div></div><div className={`rounded-2xl p-3 mb-5 ${correct>=PASS_SCORE?'bg-brand-soft text-brand':'bg-exam-soft text-exam'}`}><b>{correct>=PASS_SCORE?'ناجح':'غير ناجح'}</b><p className="text-xs mt-1 opacity-80">حد النجاح {PASS_SCORE} من {EXAM_SIZE}</p></div>{!saved&&<p className="text-xs text-exam mb-4">لم نتمكن من حفظ النتيجة على الخادم الآن، لكن نتيجة الاختبار ومراجعة أخطائك ظاهرة لك.</p>}<button onClick={()=>navigate('/result',{state:{correct,total:EXAM_SIZE,answered,wrongQuestions:questions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!==q.correctAnswerIndex).map(q=>({question:q,chosen:answers[q.id]})),unansweredQuestions:questions.filter(q=>answers[q.id]===undefined)}})} className="w-full primary-cta mb-2">عرض النتيجة ومراجعة الأخطاء</button><button onClick={()=>navigate('/models')} className="w-full secondary-cta py-3.5">العودة للنماذج</button></div></div>;

  const q=questions[current]; const mm=String(Math.floor(seconds/60)).padStart(2,'0'); const ss=String(seconds%60).padStart(2,'0');
  return <div className="min-h-screen"><div className="bg-surface text-white sticky top-0 z-10"><div className="px-4 py-3 flex items-center justify-between gap-4"><div><p className="text-xs opacity-70">السؤال {current+1} من {EXAM_SIZE}</p><p className="text-sm font-semibold">نموذج {modelId} • {answered} مجاب</p></div><div className={`rounded-lg px-3.5 py-1.5 font-mono font-bold text-lg ${seconds<=60?'bg-exam animate-pulse':'bg-white/10'}`}>{mm}:{ss}</div></div><div className="h-1 bg-white/10"><div className="h-1 bg-brand transition-all" style={{width:`${((current+1)/EXAM_SIZE)*100}%`}}/></div><div className="flex flex-wrap gap-1.5 px-4 py-3 max-w-lg mx-auto">{questions.map((qq,i)=><button key={qq.id} onClick={()=>setCurrent(i)} className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border ${i===current?'border-brand text-brand':answers[qq.id]!==undefined?'bg-brand border-brand text-white':'border-white/20 text-white/50'}`}>{i+1}</button>)}</div></div><div className="max-w-lg mx-auto px-4 py-5"><div className="question-card"><div className="question-number">السؤال {current+1}</div>{q.imageUrl&&<div className="question-image"><OptimizedImage src={q.imageUrl} alt="صورة توضيحية للسؤال" priority={current<2} sizes="(max-width:768px) 92vw,560px" className="w-full h-full min-h-[220px] max-h-[400px]" objectFit="contain"/></div>}<h1>{q.text}</h1><div className="space-y-2.5">{q.options.map((opt,i)=><button key={i} onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`answer-option ${answers[q.id]===i?'correct':''}`}><span className="answer-letter">{letters[i]??i+1}</span><span className="flex-1">{opt}</span></button>)}</div><DiagramRenderer question={q}/><div className="flex gap-2.5 mt-5"><button onClick={()=>current===EXAM_SIZE-1?void finish():setCurrent(c=>c+1)} className="flex-1 py-3 rounded-xl font-semibold text-white bg-signs">{current===EXAM_SIZE-1?'إنهاء الاختبار ✓':'التالي ←'}</button><button onClick={()=>setCurrent(c=>Math.max(c-1,0))} disabled={current===0} className="flex-1 py-3 rounded-xl font-semibold text-muted bg-paper border border-line disabled:opacity-40">→ السابق</button></div></div></div></div>;
}
