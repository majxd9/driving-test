import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question, QuestionCategory } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';
import '../login-v3.css';

const THEME: Record<QuestionCategory,{name:string;head:string;accent:string}>={Ser:{name:'قواعد السير',head:'bg-brand',accent:'brand'},Ishara:{name:'الإشارات المرورية',head:'bg-signs',accent:'signs'},Mechanic:{name:'الميكانيك',head:'bg-mek',accent:'mek'}};
const LETTERS=['أ','ب','ج','د','هـ','و'];

export default function Study(){
 const {category}=useParams<{category:QuestionCategory}>(); const navigate=useNavigate();
 const [questions,setQuestions]=useState<Question[]>([]); const [index,setIndex]=useState(0); const [answers,setAnswers]=useState<Record<number,number>>({}); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const preloaded=useRef(new Set<string>()); const theme=THEME[category as QuestionCategory];
 useEffect(()=>{if(!category)return;setLoading(true);setError('');setIndex(0);setAnswers({});api.getQuestions(category).then(setQuestions).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[category]);
 useEffect(()=>{questions.slice(index,index+3).forEach(q=>{if(!q.imageUrl||preloaded.current.has(q.imageUrl))return;preloaded.current.add(q.imageUrl);const img=new Image();img.decoding='async';img.src=q.imageUrl;});},[questions,index]);
 if(loading)return <Loading text="جارِ تجهيز الأسئلة..."/>; if(error)return <Empty text={error}/>; const q=questions[index]; if(!q)return <Empty text="لا توجد أسئلة بهذا القسم بعد"/>;
 const chosen=answers[q.id]; const answered=Object.keys(answers).length; const correct=questions.filter(x=>answers[x.id]===x.correctAnswerIndex).length;
 const goNext=()=>setIndex(i=>Math.min(i+1,questions.length-1));
 const goPrev=()=>setIndex(i=>Math.max(i-1,0));
 const skip=()=>goNext();
 const choose=(i:number)=>{if(chosen===undefined)setAnswers(a=>({...a,[q.id]:i}));};
 return <div className={`exam-page-v2 study-page-v3 ${theme.accent}`} dir="rtl">
   <header className="study-topbar-v3">
     <button onClick={()=>navigate('/')} className="study-home-btn" aria-label="العودة">‹</button>
     <div className="study-heading-v3"><strong>{theme.name}</strong><span>{answered} مجاب · {correct} صحيح</span></div>
     <div className="study-counter-v3"><b>{index+1}</b><span>/ {questions.length}</span></div>
   </header>
   <div className="study-progress-v3"><span style={{width:`${questions.length ? ((index+1)/questions.length)*100 : 0}%`}}/></div>
   <main className="study-stage-v3"><section className="study-card-v3">
     <div className="study-card-head-v3"><span>السؤال {index+1}</span><span>{chosen===undefined?'اختر إجابة أو تخطَّ السؤال':'تمت الإجابة'}</span></div>
     {q.imageUrl && <div className="study-image-v3"><OptimizedImage src={q.imageUrl} alt={`صورة السؤال ${q.id}`} priority={index===0} sizes="(max-width: 700px) 92vw, 760px" className="w-full h-full object-contain"/></div>}
     <div className="study-question-v3">{q.text}</div>
     <div className="study-answers-v3">{q.options.map((opt,i)=>{const correctAnswer=i===q.correctAnswerIndex;const selected=i===chosen;let cls='study-option-v3';if(chosen!==undefined){if(correctAnswer)cls+=' selected';else if(selected)cls+=' wrong';}return <button key={i} type="button" onClick={()=>choose(i)} disabled={chosen!==undefined} className={cls}><span className="study-letter-v3">{LETTERS[i]}</span><span className="study-option-text-v3">{opt}</span>{chosen!==undefined&&correctAnswer&&<span className="study-check">✓</span>}</button>})}</div>
     {chosen!==undefined&&q.explanation&&<div className="study-explanation-v3"><b>التوضيح</b><span>{q.explanation}</span></div>}
     {chosen!==undefined&&<DiagramRenderer question={q}/>} 
     <div className="study-actions-v3"><button type="button" disabled={index===0} onClick={goPrev} className="study-action-v3 secondary">السابق</button><button type="button" onClick={skip} disabled={index===questions.length-1} className="study-action-v3 skip">تخطي السؤال</button><button type="button" onClick={goNext} disabled={index===questions.length-1} className="study-action-v3 next">التالي</button></div>
   </section></main>
 </div>;
}
function Loading({text}:{text:string}){return <div className="page-shell flex items-center justify-center text-muted"><div className="loading-dot"/>{text}</div>}
function Empty({text}:{text:string}){return <div className="page-shell flex items-center justify-center px-5 text-muted text-center">{text}</div>}
