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
  const [questions,setQuestions]=useState<Question[]>([]); const [answers,setAnswers]=useState<Record<number,number>>({});
  const [current,setCurrent]=useState(0); const [seconds,setSeconds]=useState(DURATION); const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState<string|null>(null); const [imageExpanded,setImageExpanded]=useState(false); const finishedRef=useRef(false);
  const loadExam=useCallback(async()=>{const id=Number(modelId)||1;setLoading(true);setLoadError(null);try{const picked=await api.getExamQuestions(id);if(picked.length!==30)throw new Error('تعذر تجهيز ٣٠ سؤالاً للاختبار.');setQuestions(picked);setAnswers({});setCurrent(0);setSeconds(DURATION);finishedRef.current=false;}catch(err){setLoadError(err instanceof Error?err.message:'تعذر تحميل الأسئلة.');}finally{setLoading(false);}},[modelId]);
  useEffect(()=>{void loadExam();},[loadExam]);
  useEffect(()=>{questions.slice(current,current+2).forEach(q=>{if(q.imageUrl){const img=new Image();img.decoding='async';img.src=q.imageUrl;}});},[questions,current]);
  useEffect(()=>{setImageExpanded(false);},[current]);
  const finish=useCallback(()=>{if(finishedRef.current||!questions.length)return;finishedRef.current=true;let correct=0;const reviewQuestions=questions.map(question=>{const chosen=answers[question.id];if(chosen===question.correctAnswerIndex)correct++;return{question,chosen:chosen??null};});const answered=Object.keys(answers).length;const wrongQuestionIds=reviewQuestions.filter(x=>x.chosen!==null&&x.chosen!==x.question.correctAnswerIndex).map(x=>x.question.id);api.submitExamAttempt({modelId:Number(modelId)||1,total:questions.length,correct,answered,wrongQuestionIds}).catch(()=>{});navigate('/result',{state:{correct,total:questions.length,answered,reviewQuestions,modelId:Number(modelId)||1}});},[answers,questions,navigate,modelId]);
  useEffect(()=>{if(loading)return;const timer=setInterval(()=>setSeconds(s=>{if(s<=1){clearInterval(timer);finish();return 0;}return s-1;}),1000);return()=>clearInterval(timer);},[loading,finish]);
  if(loading)return <div className="exam-v3-loading"><div className="exam-v3-skeleton"/><div className="exam-v3-skeleton short"/></div>;
  if(loadError||!questions.length)return <div className="exam-v3-loading"><div className="exam-v3-error-card"><div className="login-v3-logo">ر</div><h1>تعذر تحضير الاختبار</h1><p>{loadError??'لم يتم العثور على أسئلة.'}</p><button onClick={loadExam} className="exam-v3-primary">إعادة المحاولة</button></div></div>;
  const q=questions[current]; const mm=String(Math.floor(seconds/60)).padStart(2,'0'); const ss=String(seconds%60).padStart(2,'0'); const answered=Object.keys(answers).length;
  return <main className="exam-v3" dir="rtl">
    <header className="exam-v3-header"><div className="exam-v3-head-inner"><button onClick={()=>navigate('/models')} className="exam-v3-back">→</button><div className="exam-v3-title"><span>اختبار القيادة</span><strong>النموذج {modelId}</strong></div><div className={`exam-v3-timer ${seconds<=60?'urgent':''}`}><small>الوقت المتبقي</small><b>{mm}:{ss}</b></div></div><div className="exam-v3-progress"><span style={{width:`${((current+1)/questions.length)*100}%`}}/></div></header>
    <section className="exam-v3-main">
      <div className="exam-v3-meta"><div><b>السؤال {current+1}</b><span>/ {questions.length}</span></div><span>{answered} مجاب</span></div>
      <article className="exam-v3-card">
        {q.imageUrl&&<div className="exam-v3-image"><OptimizedImage src={q.imageUrl} alt={`صورة السؤال ${q.id}`} priority={current===0} sizes="(max-width: 800px) 94vw, 760px" className="w-full h-full object-contain"/><button type="button" onClick={()=>setImageExpanded(true)} className="exam-v3-zoom">تكبير</button></div>}
        <h1 className="exam-v3-question">{q.text}</h1>
        <div className="exam-v3-options">{q.options.map((opt,i)=><button key={i} type="button" onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`exam-v3-option ${answers[q.id]===i?'selected':''}`}><span>{['أ','ب','ج','د','هـ','و'][i]}</span><b>{opt}</b></button>)}</div>
        <DiagramRenderer question={q}/>
        <div className="exam-v3-actions"><button onClick={()=>setCurrent(c=>Math.max(c-1,0))} disabled={current===0} className="exam-v3-secondary">السابق</button>{current===questions.length-1?<button onClick={finish} className="exam-v3-finish">إنهاء الاختبار</button>:<button onClick={()=>setCurrent(c=>c+1)} className="exam-v3-primary">التالي <span>←</span></button>}</div>
      </article>
      <div className="exam-v3-quick"><span>التقدم</span><b>{answered} / {questions.length}</b><button onClick={finish}>إنهاء وعرض النتيجة</button></div>
    </section>
    {imageExpanded&&q.imageUrl&&<div className="exam-v3-modal" onClick={()=>setImageExpanded(false)}><div className="exam-v3-modal-inner"><OptimizedImage src={q.imageUrl} alt={`الصورة المكبرة للسؤال ${q.id}`} sizes="100vw" className="max-w-full max-h-full object-contain rounded-xl"/><button onClick={()=>setImageExpanded(false)}>×</button></div></div>}
  </main>;
}
