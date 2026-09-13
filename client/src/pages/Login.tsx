import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OptimizedImage from '../components/OptimizedImage';
import SiteGuide from '../components/SiteGuide';
import '../login-v3.css';

const SAMPLE_QUESTIONS = [
  { text: 'ما معنى هذه الإشارة؟', imageUrl: '/signs/sign_03.webp', options: ['منحدر خطر','طريق ضيق من جهتين','طريق زلقة','منعطف مزدوج الأول يساري'], correct: 3, explanation: 'هذه الإشارة تحذر من منعطفين متتاليين، الأول باتجاه اليسار.' },
  { text: 'البقعة العمياء بالنسبة لسائق المركبة هي:', options: ['منطقة كثيفة الضباب','منطقة ضمن نطاق المرايا','منطقة غير مضاءة ليلاً','منطقة خارج نطاق المرايا'], correct: 3, explanation: 'هي المنطقة التي لا تغطيها أي من المرايا.' },
  { text: 'عند تقاطع خالٍ من الإشارات تكون الأفضلية للسائق الذي:', options: ['يكون يساره مفتوحاً','يكون يمينه مفتوحاً','يصل أولاً','يكون يمينه مغلقاً'], correct: 1, explanation: 'القاعدة الافتراضية هي إعطاء الأفضلية للمركبة القادمة من اليمين.' },
  { text: 'في حال انزلقت مركبتك، ما ردة الفعل الأولى الأكثر أماناً؟', options: ['الفرملة بقوة وتوجيه المقود عكس الانزلاق','عدم الضغط على الفرامل وتوجيه المقود مع اتجاه انزلاق المؤخرة','الفرملة بقوة وتوجيه المقود مع الانزلاق','إطفاء المحرك فوراً'], correct: 1, explanation: 'التوجيه مع اتجاه انزلاق المؤخرة يساعد على استعادة الاتزان.' },
  { text: 'إن الهدف من مسند الرأس خلف رأس الراكب هو:', options: ['إراحة الرأس فقط','استخدامه كوسادة','تحسين شكل المقعد','تقليل إصابة الرقبة عند صدمة من الخلف'], correct: 3, explanation: 'يقلل مسند الرأس خطر إصابة الرقبة عند الصدمة من الخلف.' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userName,setUserName]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [showSample,setShowSample]=useState(false);
  const [sampleIndex,setSampleIndex]=useState(0);
  const [sampleAnswers,setSampleAnswers]=useState<Record<number,number>>({});

  async function handleSubmit(e:FormEvent){
    e.preventDefault(); setError(null); setBusy(true);
    try { await login(userName,password); navigate('/'); }
    catch(err){ setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول'); }
    finally { setBusy(false); }
  }

  const sample=SAMPLE_QUESTIONS[sampleIndex];
  const chosen=sampleAnswers[sampleIndex];
  const sampleScore=SAMPLE_QUESTIONS.reduce((n,q,i)=>n+(sampleAnswers[i]===q.correct?1:0),0);
  const closeSample=()=>{setShowSample(false);setSampleIndex(0);setSampleAnswers({});};

  return <div className="login-v2" dir="rtl">
    <div className="login-v2-glow one"/><div className="login-v2-glow two"/>
    <main className="login-v2-wrap">
      <section className="login-v2-showcase">
        <div className="login-v2-brand"><span>ر</span><div><strong>رخصتي</strong><small>تدريب القيادة الذكي</small></div></div>
        <div className="login-v2-copy"><span className="login-v2-kicker">استعد للاختبار بثقة</span><h1>كل ما تحتاجه<br/><b>قبل امتحان القيادة.</b></h1><p>تدرّب على الأسئلة والصور، راجع أخطاءك، وخض اختبارات محاكاة بدون تعقيد.</p></div>
        <div className="login-v2-features">
          <div><b>01</b><span><strong>أسئلة واقعية</strong><small>صور وإشارات مرورية واضحة</small></span></div>
          <div><b>02</b><span><strong>اختبارات محاكاة</strong><small>اختبر نفسك بوقت محدد</small></span></div>
          <div><b>03</b><span><strong>مراجعة الأخطاء</strong><small>اعرف أين أخطأت بعد الاختبار</small></span></div>
        </div>
      </section>

      <section className="login-v2-panel">
        <div className="login-v2-panel-head"><span className="login-v2-mini-dot"/> حسابك جاهز للعودة؟</div>
        <div className="login-v2-title"><span>تسجيل الدخول</span><h2>مرحباً بعودتك 👋</h2><p>سجّل دخولك وتابع تدريبك من حيث توقفت.</p></div>
        <form onSubmit={handleSubmit} className="login-v2-form">
          <label>اسم المستخدم<input value={userName} onChange={e=>setUserName(e.target.value)} required autoFocus placeholder="مثال: ahmad2026" autoComplete="username"/></label>
          <label>كلمة المرور<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required placeholder="أدخل كلمة المرور" autoComplete="current-password"/></label>
          {error&&<div className="login-v2-error">{error}</div>}
          <button type="submit" disabled={busy} className="login-v2-submit">{busy?'جارِ الدخول...':'دخول الحساب'}<span>←</span></button>
        </form>
        <div className="login-v2-divider"><span>أو</span></div>
        <button type="button" onClick={()=>setShowSample(true)} className="login-v2-trial"><span className="trial-icon">✦</span><span><strong>جرّب قبل الدخول</strong><small>٥ أسئلة مجانية • بدون تسجيل</small></span><b>←</b></button>
        <div className="login-v2-guide"><SiteGuide /></div>
        <p className="login-v2-footnote">بياناتك تبقى لحسابك ولا تحفظ نتيجة التجربة المجانية.</p>
      </section>
    </main>

    {showSample&&<div className="modal-backdrop" onClick={closeSample}><div className="guide-modal w-full max-w-lg" onClick={e=>e.stopPropagation()} dir="rtl">
      <button className="modal-close" onClick={closeSample} aria-label="إغلاق">×</button>
      <div className="flex items-center justify-between gap-3 mb-5 pl-10"><div><p className="eyebrow">تجربة سريعة</p><h2 className="text-xl font-black text-ink mt-1">٥ أسئلة قبل التسجيل</h2></div><div className="rounded-xl bg-brand-soft text-brand px-3 py-2 text-xs font-bold whitespace-nowrap">{sampleScore}/{sampleIndex+1}</div></div>
      <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden"><div className="h-full bg-brand transition-all" style={{width:`${((sampleIndex+1)/SAMPLE_QUESTIONS.length)*100}%`}}/></div>
      {sample.imageUrl&&<div className="w-full max-w-[210px] aspect-square mx-auto mb-4 rounded-2xl border border-line bg-paper overflow-hidden"><OptimizedImage src={sample.imageUrl} alt="عينة سؤال" priority sizes="210px"/></div>}
      <p className="text-xs text-muted mb-2">السؤال {sampleIndex+1} من {SAMPLE_QUESTIONS.length}</p><h3 className="text-base font-black text-ink leading-relaxed mb-4">{sample.text}</h3>
      <div className="space-y-2">{sample.options.map((option,i)=>{const isChosen=chosen===i;const revealed=chosen!==undefined;const isCorrect=i===sample.correct;return <button key={i} type="button" onClick={()=>setSampleAnswers(prev=>({...prev,[sampleIndex]:i}))} className={`w-full text-right rounded-xl border px-3 py-3 flex items-center gap-2 transition-colors ${revealed&&isCorrect?'bg-brand-soft border-brand':revealed&&isChosen?'bg-exam-soft border-exam':isChosen?'bg-brand-soft border-brand':'bg-paper border-line hover:border-brand'}`}><span className="w-7 h-7 shrink-0 rounded-lg bg-white/10 grid place-items-center text-xs font-bold">{['أ','ب','ج','د'][i]}</span><span className="text-sm text-ink leading-snug">{option}</span></button>})}</div>
      {chosen!==undefined&&<div className={`mt-4 rounded-xl p-3 text-sm leading-relaxed ${chosen===sample.correct?'bg-brand-soft text-brand':'bg-exam-soft text-exam'}`}><b>{chosen===sample.correct?'إجابة صحيحة ✓':`الإجابة الصحيحة: ${['أ','ب','ج','د'][sample.correct]}`}</b><p className="mt-1 text-ink">{sample.explanation}</p></div>}
      <div className="flex gap-2 mt-5"><button type="button" disabled={sampleIndex===0} onClick={()=>setSampleIndex(i=>i-1)} className="flex-1 py-3 rounded-xl font-semibold text-muted bg-paper border border-line disabled:opacity-40">السابق</button>{sampleIndex<SAMPLE_QUESTIONS.length-1?<button type="button" onClick={()=>setSampleIndex(i=>i+1)} className="flex-1 py-3 rounded-xl font-bold text-white bg-brand">التالي</button>:<button type="button" onClick={closeSample} className="flex-1 py-3 rounded-xl font-bold text-white bg-exam">إغلاق</button>}</div>
    </div></div>}
  </div>;
}
