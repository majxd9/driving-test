import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question } from '../types';
import OptimizedImage, { resolveQuestionImageUrl } from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';
import { ensureImageReady, preloadImages } from '../utils/imagePreload';

const DURATION = 15 * 60;
const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

const UiIcon = ({name}:{name:'back'|'next'|'finish'|'check'}) => {
  const common={width:19,height:19,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(name==='back') return <svg {...common}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>;
  if(name==='next') return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  if(name==='finish') return <svg {...common}><path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
};

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
  const [navigating, setNavigating] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState('1');
  const finishedRef = useRef(false);
  const navigationLockRef = useRef(false);

  const loadExam = useCallback(async () => {
    const id = Number(modelId) || 1;
    setLoading(true);
    setLoadError(null);
    try {
      const picked = await api.getExamQuestions(id);
      if (picked.length !== 30) throw new Error('تعذر تجهيز ٣٠ سؤالاً للاختبار.');
      setQuestions(picked); setAnswers({}); setCurrent(0); setSeconds(DURATION); setJumpOpen(false); setJumpValue('1');
      finishedRef.current = false; navigationLockRef.current = false;
      const firstThree = picked.slice(0, 3).map(q => resolveQuestionImageUrl(q.imageUrl)).filter(Boolean);
      const first = firstThree[0]; if (first) await ensureImageReady(first, 1600); preloadImages(firstThree.slice(1), 2);
    } catch (err) { setLoadError(err instanceof Error ? err.message : 'تعذر تحميل الأسئلة.'); }
    finally { setLoading(false); }
  }, [modelId]);

  useEffect(() => { void loadExam(); }, [loadExam]);
  useEffect(() => { const sources=questions.slice(current,current+3).map(q=>resolveQuestionImageUrl(q.imageUrl)).filter(Boolean); preloadImages(sources,3); }, [questions,current]);
  useEffect(() => { setImageExpanded(false); }, [current]);

  const finish = useCallback(() => {
    if (finishedRef.current || !questions.length) return;
    finishedRef.current = true;
    let correct = 0;
    const reviewQuestions = questions.map(question => { const chosen=answers[question.id]; if(chosen===question.correctAnswerIndex) correct++; return {question,chosen:chosen??null}; });
    const answered=Object.keys(answers).length;
    const wrongQuestionIds=reviewQuestions.filter(x=>x.chosen!==null&&x.chosen!==x.question.correctAnswerIndex).map(x=>x.question.id);
    api.submitExamAttempt({modelId:Number(modelId)||1,total:questions.length,correct,answered,wrongQuestionIds}).catch(()=>{});
    navigate('/result',{state:{correct,total:questions.length,answered,reviewQuestions,modelId:Number(modelId)||1}});
  },[answers,questions,navigate,modelId]);

  const goToQuestion = useCallback(async (nextIndex:number) => {
    if(navigationLockRef.current||nextIndex===current||nextIndex<0||nextIndex>=questions.length)return;
    navigationLockRef.current=true; setNavigating(true);
    const src=resolveQuestionImageUrl(questions[nextIndex]?.imageUrl); if(src) await ensureImageReady(src,1200);
    setCurrent(nextIndex); setNavigating(false); navigationLockRef.current=false;
  },[current,questions]);

  const jumpToQuestion = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requested = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(requested) || requested < 1 || requested > questions.length) return;
    setJumpOpen(false);
    await goToQuestion(requested - 1);
  }, [goToQuestion, jumpValue, questions.length]);

  useEffect(()=>{if(loading)return;const timer=setInterval(()=>{setSeconds(s=>{if(s<=1){clearInterval(timer);finish();return 0;}return s-1;});},1000);return()=>clearInterval(timer);},[loading,finish]);

  if(loading)return <div className="page-shell flex items-center justify-center px-4"><div className="surface-panel w-full max-w-xl p-5"><div className="skeleton h-44 rounded-2xl"/><p className="text-center text-muted text-sm mt-4">جارِ تجهيز أول صورة للاختبار...</p></div></div>;
  if(loadError||!questions.length)return <div className="page-shell flex items-center justify-center px-5"><div className="surface-panel w-full max-w-md text-center p-7"><div className="brand-mark mx-auto mb-4">ر</div><h1 className="text-xl font-black mb-2">تعذر تحضير الاختبار</h1><p className="text-muted text-sm leading-relaxed">{loadError??'لم يتم العثور على أسئلة.'}</p><button onClick={loadExam} className="primary-cta mt-5 w-full">إعادة المحاولة</button></div></div>;

  const q=questions[current]; const mm=String(Math.floor(seconds/60)).padStart(2,'0'); const ss=String(seconds%60).padStart(2,'0'); const isLast=current===questions.length-1;
  const selectedAnswer = answers[q.id];
  const isCorrectSelection = selectedAnswer !== undefined && selectedAnswer === q.correctAnswerIndex;
  const explanationNeeded = selectedAnswer !== undefined && Boolean(q.explanation);
  return <div className="exam-page-v2" dir="rtl">
    <header className="exam-topbar-v2">
      <button onClick={()=>navigate('/models')} className="exam-back-v2" aria-label="العودة"><UiIcon name="back"/></button>
      <div className="exam-title-v2">
        <strong>اختبار القيادة</strong>
        <div className="exam-question-counter-wrap">
          <button type="button" className="exam-question-counter" aria-label={`السؤال ${current + 1} من ${questions.length}. اضغط للانتقال إلى سؤال آخر`} aria-expanded={jumpOpen} onClick={() => { setJumpValue(String(current + 1)); setJumpOpen(open => !open); }}>
            السؤال {current + 1} من {questions.length} · انتقال سريع
          </button>
          {jumpOpen && (
            <div className="question-jump-popover">
              <form onSubmit={(event) => void jumpToQuestion(event)}>
                <input inputMode="numeric" pattern="[0-9]*" min={1} max={questions.length} value={jumpValue} onChange={event => setJumpValue(event.target.value.replace(/\D/g, ''))} autoFocus aria-label="رقم السؤال" />
                <button type="submit">انتقال</button>
              </form>
              <small>اكتب رقم السؤال من 1 إلى {questions.length}</small>
            </div>
          )}
        </div>
      </div>
      <div className={`exam-timer-v2 ${seconds<=60?'urgent':''}`} aria-label={`الوقت المتبقي ${mm}:${ss}`}>{mm}:{ss}</div>
    </header>
    <div className="exam-progress-v2"><span style={{width:`${((current+1)/questions.length)*100}%`}}/></div>
    <main className="exam-stage-v2"><section className="exam-card-v2">
      <div className="exam-scroll-v2">
        <div className="exam-image-slot-v2">{q.imageUrl?<button type="button" className="exam-image-v2" onClick={()=>setImageExpanded(true)} aria-label="تكبير صورة السؤال"><OptimizedImage src={q.imageUrl} alt={`صورة السؤال ${q.id}`} priority sizes="(max-width: 700px) 92vw, 720px" className="w-full h-full" objectFit="contain"/></button>:<div className="exam-image-placeholder-v2" aria-hidden="true"/>}</div>
        <div className="exam-question-v2"><span className="exam-question-label">السؤال {current+1}</span>{q.text}</div>
        <div className="exam-answers-v2">{q.options.map((opt,i)=><button key={i} type="button" onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`exam-option-v2 ${answers[q.id]===i?'selected':''} ${answers[q.id]===i&&isCorrectSelection?'is-correct':''} ${answers[q.id]===i?'is-selected':''}`}><span className="exam-option-letter-v2">{LETTERS[i]}</span><span className="exam-option-text-v2">{opt}</span>{answers[q.id]===i&&<UiIcon name="check"/>}</button>)}</div>
        {explanationNeeded && (<div className="exam-answer-explanation-v2" role="status" aria-live="polite"><div className="exam-answer-explanation-title-v2"><UiIcon name="check"/><span>{q.category === 'Ishara' ? 'شرح الإشارة' : 'الشرح'}</span></div><p>{q.explanation}</p></div>)}
        <DiagramRenderer question={q}/>
      </div>
      <div className="exam-actions-v2">
        <button type="button" onClick={()=>void goToQuestion(current-1)} disabled={current===0||navigating} className="exam-action-v2 secondary"><UiIcon name="back"/><span>السابق</span></button>
        <button type="button" onClick={finish} className="exam-action-v2 finish"><UiIcon name="finish"/><span>إنهاء الاختبار</span></button>
        <button type="button" onClick={()=>isLast?finish():void goToQuestion(current+1)} disabled={navigating} className="exam-action-v2 next"><span>{navigating?'جارٍ التجهيز…':isLast?'عرض النتيجة':'التالي'}</span><UiIcon name="next"/></button>
      </div>
    </section></main>
    {imageExpanded&&q.imageUrl&&<div className="exam-image-modal-v2" onClick={()=>setImageExpanded(false)}><OptimizedImage src={q.imageUrl} alt={`الصورة المكبرة للسؤال ${q.id}`} priority sizes="100vw" className="max-w-full max-h-full" objectFit="contain"/></div>}
  </div>;
}
