import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question, QuestionCategory } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';
import '../login-v3.css';

const THEME: Record<QuestionCategory,{name:string;head:string}>={Ser:{name:'قواعد السير',head:'bg-brand'},Ishara:{name:'الإشارات المرورية',head:'bg-signs'},Mechanic:{name:'الميكانيك',head:'bg-mek'}};
const LETTERS=['أ','ب','ج','د','هـ','و'];

export default function Study(){
 const {category}=useParams<{category:QuestionCategory}>(); const navigate=useNavigate(); const [questions,setQuestions]=useState<Question[]>([]); const [index,setIndex]=useState(0); const [answers,setAnswers]=useState<Record<number,number>>({}); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const preloaded=useRef(new Set<string>()); const theme=THEME[category as QuestionCategory];
 useEffect(()=>{if(!category)return;setLoading(true);setError('');setIndex(0);setAnswers({});api.getQuestions(category).then(setQuestions).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[category]);
 useEffect(()=>{questions.slice(index,index+3).forEach(q=>{if(!q.imageUrl||preloaded.current.has(q.imageUrl))return;preloaded.current.add(q.imageUrl);const img=new Image();img.decoding='async';img.src=q.imageUrl;});},[questions,index]);
 if(loading)return <Loading text="جارِ تجهيز الأسئلة..."/>; if(error)return <Empty text={error}/>; const q=questions[index]; if(!q)return <Empty text="لا توجد أسئلة بهذا القسم بعد"/>;
 const chosen=answers[q.id]; const answered=Object.keys(answers).length; const correct=questions.filter(x=>answers[x.id]===x.correctAnswerIndex).length;
 const choose=(i:number)=>{if(chosen===undefined)setAnswers(a=>({...a,[q.id]:i}));};
 return <div className="exam-page-v2 study-page-v2" dir="rtl">
   <header className={`${theme.head} study-topbar-v2`}><button onClick={()=>navigate('/')} className="exam-back-v2" aria-label="العودة">‹</button><div className="exam-title-v2"><strong>{theme.name}</strong><span>{answered} مجاب • {correct} صحيح</span></div><div className="study-score-v2">{answered} مجاب</div></header>
   <div className="exam-progress-v2"><span style={{width:`${questions.length ? ((index+1)/questions.length)*100 : 0}%`}}/></div>
   <main className="exam-stage-v2"><section className="exam-card-v2 study-card-v2">
     {q.imageUrl && <div className="exam-image-v2"><OptimizedImage src={q.imageUrl} alt={`صورة السؤال ${q.id}`} priority={index===0} sizes="(max-width: 700px) 94vw, 760px" className="w-full h-full object-contain"/></div>}
     <div className="exam-question-v2"><span className="study-question-label">السؤال {index+1}</span>{q.text}</div>
     <div className="exam-answers-v2">{q.options.map((opt,i)=>{const correctAnswer=i===q.correctAnswerIndex;const selected=i===chosen;let cls='exam-option-v2';if(chosen!==undefined){if(correctAnswer)cls+=' selected';else if(selected)cls+=' wrong';}return <button key={i} type="button" onClick={()=>choose(i)} disabled={chosen!==undefined} className={cls}><span className="exam-option-letter-v2">{LETTERS[i]}</span><span className="exam-option-text-v2">{opt}</span>{chosen!==undefined&&correctAnswer&&<span className="study-check">✓</span>}</button>})}</div>
     {chosen!==undefined&&q.explanation&&<div className="study-explanation-v2"><b>لماذا؟</b><span>{q.explanation}</span></div>}
     {chosen!==undefined&&<DiagramRenderer question={q}/>}
     <div className="exam-actions-v2 study-actions-v2"><button type="button" disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="exam-action-v2 secondary">السابق</button><button type="button" onClick={()=>setIndex(i=>Math.min(i+1,questions.length-1))} disabled={index===questions.length-1} className="exam-action-v2 next">{index===questions.length-1?'الأخير':'التالي'}</button></div>
   </section></main>
 </div>;
}
function Loading({text}:{text:string}){return <div className="page-shell flex items-center justify-center text-muted"><div className="loading-dot"/>{text}</div>}
function Empty({text}:{text:string}){return <div className="page-shell flex items-center justify-center px-5 text-muted text-center">{text}</div>}
