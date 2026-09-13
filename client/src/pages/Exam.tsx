import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';
import '../login-v3.css';

const DURATION = 15 * 60;

export default function Exam() {
  const { modelId } = useParams(); const navigate = useNavigate();
  const [questions,setQuestions]=useState<Question[]>([]); const [answers,setAnswers]=useState<Record<number,number>>({}); const [current,setCurrent]=useState(0); const [seconds,setSeconds]=useState(DURATION); const [loading,setLoading]=useState(true); const [loadError,setLoadError]=useState<string|null>(null); const [imageExpanded,setImageExpanded]=useState(false); const finishedRef=useRef(false);
  const loadExam=useCallback(async()=>{const id=Number(modelId)||1;setLoading(true);setLoadError(null);try{const picked=await api.getExamQuestions(id);if(picked.length!==30)throw new Error('تعذر تجهيز ٣٠ سؤالاً للاختبار.');setQuestions(picked);setAnswers({});setCurrent(0);setSeconds(DURATION);finishedRef.current=false;}catch(err){setLoadError(err instanceof Error?err.message:'تعذر تحميل الأسئلة.');}finally{setLoading(false);}},[modelId]);
  useEffect(()=>{void loadExam();},[loadExam]); useEffect(()=>{questions.slice(current,current+2).forEach(q=>{if(q.imageUrl){const img=new Image();img.decoding='async';img.src=q.imageUrl;}});},[questions,current]); useEffect(()=>{setImageExpanded(false);},[current]);
  const finish=useCallback(()=>{if(finishedRef.current||!questions.length)return;finishedRef.current=true;let correct=0;const reviewQuestions=questions.map(question=>{const chosen=answers[question.id];if(chosen===question.correctAnswerIndex)correct++;return{question,chosen:chosen??null};});const answered=Object.keys(answers).length;const wrongQuestionIds=reviewQuestions.filter(x=>x.chosen!==null&&x.chosen!==x.question.correctAnswerIndex).map(x=>x.question.id);api.submitExamAttempt({modelId:Number(modelId)||1,total:questions.length,correct,answered,wrongQuestionIds}).catch(()=>{});navigate('/result',{state:{correct,total:questions.length,answered,reviewQuestions,modelId:Number(modelId)||1}});},[answers,questions,navigate,modelId]);
  useEffect(()=>{if(loading)return;const timer=setInterval(()=>setSeconds(s=>{if(s<=1){clearInterval(timer);finish();return 0;}return s-1;}),1000);return()=>clearInterval(timer);},[loading,finish]);
  if(loading)return <div className="page-shell flex items-center justify-center px-4"><div className="surface-panel w-full max-w-xl p-5"><div className="skeleton h-44 rounded-2xl"/></div></div>;
  if(loadError||!questions.length)return <div className="page-shell flex items-center justify-center px-5"><div className="surface-panel w-full max-w-md text-center p-7"><div className="brand-mark mx-auto mb-4">ر</div><h1 className="text-xl font-black mb-2">تعذر تحضير الاختبار</h1><p className="text-muted text-sm leading-relaxed">{loadError??'لم يتم العثور على أسئلة.'}</p><button onClick={loadExam} className="primary-cta mt-5 w-full">إعادة المحاولة</button></div></div>;
  const q=questions[current];const mm=String(Math.floor(seconds/60)).padStart(2,'0');const ss=String(seconds%60).padStart(2,'0');
  return <div className="exam-page">
    <header className="exam-header"><div className="max-w-6xl mx-auto px-3 sm:px-5 py-3 flex items-center gap-3"><button onClick={()=>navigate('/models')} className="icon-button" aria-label="العودة">→</button><div className="flex-1 min-w-0"><p className="font-black text-ink text-sm">اختبار القيادة</p></div><div className={`exam-timer ${seconds<=60?'urgent':''}`}>{mm}:{ss}</div></div><div className="progress"><span style={{width:`${((current+1)/questions.length)*100}%`}}/></div></header>
    <main className="max-w-6xl mx-auto w-full px-3 sm:px-5 py-3 sm:py-5"><div className="exam-layout">
      <section className="surface-panel exam-card p-3 sm:p-5">
        {q.imageUrl&&<div className="exam-image-frame"><OptimizedImage src={q.imageUrl} alt={`صورة السؤال ${q.id}`} priority={current===0} sizes="(max-width: 900px) 94vw, 700px" className="w-full h-full object-contain"/></div>}
        <h1 className="exam-question-title">{q.text}</h1><div className="exam-answer-grid">{q.options.map((opt,i)=><button key={i} onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`answer-option ${answers[q.id]===i?'selected':''}`}><span className="answer-letter">{['أ','ب','ج','د','هـ','و'][i]}</span><span className="flex-1 leading-relaxed text-right">{opt}</span></button>)}</div><DiagramRenderer question={q}/><div className="flex gap-2 mt-4"><button onClick={()=>setCurrent(c=>Math.max(c-1,0))} disabled={current===0} className="secondary-cta flex-1 py-3">السابق</button>{current===questions.length-1?<button onClick={finish} className="primary-cta flex-1 py-3">إنهاء</button>:<button onClick={()=>setCurrent(c=>c+1)} className="primary-cta flex-1 py-3">التالي ←</button>}</div>
      </section>
    </div></main>
    {imageExpanded&&q.imageUrl&&<div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3" onClick={()=>setImageExpanded(false)}><OptimizedImage src={q.imageUrl} alt={`الصورة المكبرة للسؤال ${q.id}`} sizes="100vw" className="max-w-full max-h-full object-contain rounded-xl"/></div>}
  </div>;
}
