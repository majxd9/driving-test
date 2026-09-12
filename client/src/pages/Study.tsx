import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question, QuestionCategory } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';

const THEME: Record<QuestionCategory,{name:string;head:string;soft:string;text:string}>={Ser:{name:'قواعد السير',head:'bg-brand',soft:'bg-brand-soft',text:'text-brand'},Ishara:{name:'الإشارات المرورية',head:'bg-signs',soft:'bg-signs-soft',text:'text-signs'},Mechanic:{name:'الميكانيك',head:'bg-mek',soft:'bg-mek-soft',text:'text-mek'}};

export default function Study(){
 const {category}=useParams<{category:QuestionCategory}>(); const navigate=useNavigate(); const [questions,setQuestions]=useState<Question[]>([]); const [index,setIndex]=useState(0); const [answers,setAnswers]=useState<Record<number,number>>({}); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const preloaded=useRef(new Set<string>()); const theme=THEME[category as QuestionCategory];
 useEffect(()=>{if(!category)return;setLoading(true);setError('');setIndex(0);setAnswers({});api.getQuestions(category).then(setQuestions).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[category]);
 useEffect(()=>{questions.slice(index,index+3).forEach(q=>{if(!q.imageUrl||preloaded.current.has(q.imageUrl))return;preloaded.current.add(q.imageUrl);const img=new Image();img.src=q.imageUrl;});},[questions,index]);
 if(loading)return <Loading text="جارِ تجهيز الأسئلة..."/>; if(error)return <Empty text={error}/>; const q=questions[index]; if(!q)return <Empty text="لا توجد أسئلة بهذا القسم بعد"/>;
 const chosen=answers[q.id]; const answered=Object.keys(answers).length; const correct=questions.filter(x=>answers[x.id]===x.correctAnswerIndex).length;
 const choose=(i:number)=>{if(chosen===undefined)setAnswers(a=>({...a,[q.id]:i}));};
 return <div className="min-h-screen">
   <header className={`${theme.head} sticky top-0 z-20 text-white shadow-lg`}><div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3"><button onClick={()=>navigate('/')} className="icon-button">→</button><div className="flex-1"><p className="font-bold text-sm">{theme.name}</p><p className="text-[11px] text-white/70">{answered} مجاب • {correct} صحيح</p></div><div className="question-jump"><input key={index} defaultValue={index+1} min={1} max={questions.length} type="number" onKeyDown={e=>{if(e.key==='Enter'){const n=Number(e.currentTarget.value);setIndex(Math.min(Math.max(n-1,0),questions.length-1));}}}/><span>/ {questions.length}</span></div></div><div className="progress"><span style={{width:`${((index+1)/questions.length)*100}%`}}/></div></header>
   <main className="max-w-3xl mx-auto px-4 py-6">
     <div className="question-card exam-question-card study-question-card">
       {q.imageUrl && <OptimizedImage src={q.imageUrl} alt={`صورة توضيحية للسؤال ${q.id}`} priority={index===0} sizes="(max-width: 768px) 92vw, 560px" className="question-image" objectFit="contain"/>}
       <div className="question-number">السؤال {index+1}</div><h1 className="exam-question-title">{q.text}</h1>
       <div className="exam-answer-list space-y-3">{q.options.map((opt,i)=>{const correctAnswer=i===q.correctAnswerIndex;const selected=i===chosen;let cls='answer-option';if(chosen!==undefined){if(correctAnswer)cls+=' correct';else if(selected)cls+=' wrong';}return <button key={i} onClick={()=>choose(i)} disabled={chosen!==undefined} className={cls}><span className="answer-letter">{['أ','ب','ج','د'][i]}</span><span>{opt}</span>{chosen!==undefined&&correctAnswer&&<span className="mr-auto">✓</span>}</button>})}</div>
       {chosen!==undefined&&q.explanation&&<div className={`explanation ${theme.soft} ${theme.text}`}><b>لماذا؟</b><p>{q.explanation}</p></div>}
       {chosen!==undefined&&<DiagramRenderer question={q}/>}
       <div className="exam-nav-actions flex gap-3 mt-6"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="secondary-cta flex-1">→ السابق</button><button disabled={index===questions.length-1} onClick={()=>setIndex(i=>i+1)} className={`${theme.head} text-white rounded-2xl py-3.5 font-bold flex-1 disabled:opacity-40`}>التالي ←</button></div>
     </div>
   </main>
 </div>;
}
function Loading({text}:{text:string}){return <div className="min-h-screen flex items-center justify-center text-muted"><div className="loading-dot"/>{text}</div>}
function Empty({text}:{text:string}){return <div className="min-h-screen flex items-center justify-center px-5 text-muted text-center">{text}</div>}
