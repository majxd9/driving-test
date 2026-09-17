import { CSSProperties, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OptimizedImage from '../components/OptimizedImage';
import SiteGuide from '../components/SiteGuide';
import SpiritLights from '../components/SpiritLights';
import SpiritHorn from '../components/SpiritHorn';

const SAMPLE_QUESTIONS = [
  { text: 'ما معنى هذه الإشارة؟', imageUrl: '/signs/sign_03.webp', options: ['منحدر خطر','طريق ضيق من جهتين','طريق زلقة','منعطف مزدوج، الأول باتجاه اليسار'], correct: 3, explanation: 'تحذّر الإشارة من منعطفين متتاليين، الأول باتجاه اليسار.' },
  { text: 'البقعة العمياء بالنسبة لسائق المركبة هي:', options: ['منطقة كثيفة الضباب','منطقة ضمن نطاق المرايا','منطقة غير مضاءة ليلاً','منطقة خارج نطاق المرايا'], correct: 3, explanation: 'هي المنطقة التي لا تظهر في أي من مرايا المركبة.' },
  { text: 'عند تقاطع خالٍ من الإشارات تكون الأفضلية للسائق الذي:', options: ['تكون جهته اليسرى مفتوحة','تكون جهته اليمنى مفتوحة','يصل أولاً','تكون جهته اليمنى مغلقة'], correct: 1, explanation: 'عند غياب الإشارات، تكون الأفضلية للمركبة القادمة من اليمين وفق القاعدة المعتمدة في التدريب.' },
  { text: 'عند بدء انزلاق مؤخرة المركبة، ما التصرف الأكثر أماناً؟', options: ['الفرملة بقوة وتوجيه المقود عكس الانزلاق','رفع القدم عن دواسة الوقود وتوجيه المقود مع اتجاه الانزلاق','إطفاء المحرك فوراً','شد فرامل اليد'], correct: 1, explanation: 'التعامل الهادئ مع المقود وإزالة السبب الذي يزيد الانزلاق يساعدان على استعادة السيطرة.' },
  { text: 'ما الهدف الأساسي من مسند الرأس؟', options: ['إراحة الرأس فقط','زيادة راحة المقعد','تحسين شكل المقعد','تقليل احتمال إصابة الرقبة عند صدمة من الخلف'], correct: 3, explanation: 'المسند المضبوط بشكل صحيح يقلّل خطر إصابات الرقبة عند الصدمات الخلفية.' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userName,setUserName]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [loginSuccess,setLoginSuccess]=useState(false);
  const [showSample,setShowSample]=useState(false);
  const [sampleIndex,setSampleIndex]=useState(0);
  const [sampleAnswers,setSampleAnswers]=useState<Record<number,number>>({});

  async function handleSubmit(e:FormEvent){
    e.preventDefault();
    if (busy) return;
    setError(null); setLoginSuccess(false); setBusy(true);
    try {
      await login(userName.trim(),password);
      setLoginSuccess(true);
      await new Promise<void>(resolve => window.setTimeout(resolve, 260));
      navigate('/',{replace:true});
    }
    catch(err){ setLoginSuccess(false); setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول حالياً.'); }
    finally { setBusy(false); }
  }

  const sample=SAMPLE_QUESTIONS[sampleIndex];
  const chosen=sampleAnswers[sampleIndex];
  const sampleScore=SAMPLE_QUESTIONS.reduce((n,q,i)=>n+(sampleAnswers[i]===q.correct?1:0),0);
  const closeSample=()=>{setShowSample(false);setSampleIndex(0);setSampleAnswers({});};
  const credentialLength = userName.length + password.length;
  const driveDistance = Math.min(132, 8 + credentialLength * 5.5);
  const signalState = loginSuccess ? 'green' : credentialLength > 0 ? 'amber' : 'red';

  return <div className="login-v2" dir="rtl">
    <div className="login-v2-glow one"/><div className="login-v2-glow two"/>
    <main className="login-v2-wrap">
      <section className="login-v2-showcase">
        <div className="login-v2-brand"><span>ر</span><div><strong>رخصتي</strong><small>منصة تدريب لاختبار القيادة</small></div></div>
        <div className="login-v2-copy"><span className="login-v2-kicker">استعد قبل يوم الامتحان</span><h1>تدرّب بذكاء.<br/><b>ادخل الاختبار بثقة.</b></h1><p>تدرّب على القواعد والإشارات والميكانيك، ثم اختبر مستواك بمحاكاة كاملة مع مراجعة واضحة لأخطائك.</p></div>
        <div className="login-v2-features"><div><b>01</b><span><strong>تدريب منظم</strong><small>قسّم المراجعة حسب القسم الذي تحتاجه</small></span></div><div><b>02</b><span><strong>محاكاة واقعية</strong><small>٣٠ سؤالاً مع عداد زمني واضح</small></span></div><div><b>03</b><span><strong>مراجعة دقيقة</strong><small>شاهد أخطاءك والإجابة الصحيحة بعد الاختبار</small></span></div></div>
      </section>
      <section className="login-v2-panel">
        <div className="spirit-login-scene">
          <div className="spirit-login-road" aria-hidden="true" />
          <div className="spirit-login-dust" aria-hidden="true" />
          <div className="spirit-login-smoke" aria-hidden="true" />
          <div className={`spirit-login-car ${busy ? 'is-go ' : ''}${credentialLength > 0 || busy ? 'is-moving' : ''}`} style={{'--login-car-x': `${driveDistance}px`} as CSSProperties} data-progress={credentialLength} aria-hidden="true" />
          <div className="spirit-headlight-glow spirit-beam" aria-hidden="true" />
          <div className="spirit-login-signal" data-state={signalState} aria-label={signalState === 'green' ? 'تم تسجيل الدخول بنجاح' : signalState === 'amber' ? 'بيانات تسجيل الدخول قيد الإدخال' : 'بانتظار بيانات تسجيل الدخول'}>
            <span className="spirit-signal-light red" />
            <span className="spirit-signal-light amber" />
            <span className="spirit-signal-light green" />
            <small className="spirit-signal-label">READY</small>
          </div>
          <div className="login-spirit-controls">
            <SpiritLights className="login-spirit-lights" />
            <SpiritHorn />
          </div>
        </div>
        <div className="login-v2-panel-head"><span className="login-v2-mini-dot"/> دخول آمن إلى حسابك</div>
        <div className="login-v2-title"><span>مرحباً بعودتك</span><h2>تسجيل الدخول</h2><p>أدخل بيانات حسابك للمتابعة إلى التدريب والاختبارات.</p></div>
        <form onSubmit={handleSubmit} className="login-v2-form">
          <label>اسم المستخدم<input value={userName} onChange={e=>{setUserName(e.target.value);setLoginSuccess(false);}} required autoFocus placeholder="أدخل اسم المستخدم" autoComplete="username" autoCapitalize="none" spellCheck={false}/></label>
          <label>كلمة المرور<input value={password} onChange={e=>{setPassword(e.target.value);setLoginSuccess(false);}} type="password" required placeholder="أدخل كلمة المرور" autoComplete="current-password"/></label>
          {error&&<div className="login-v2-error" role="alert">{error}</div>}
          <button type="submit" disabled={busy} className={`login-v2-submit ${busy?'is-moving':''}`}>{busy?'جارٍ تسجيل الدخول…':'تسجيل الدخول'}<span>←</span></button>
        </form>
        <div className="login-v2-divider"><span>تجربة سريعة</span></div>
        <button type="button" onClick={()=>setShowSample(true)} className="login-v2-trial"><span className="trial-icon">✦</span><span><strong>تصفح مثالاً من الاختبار</strong><small>٥ أسئلة تجريبية • بدون إنشاء حساب</small></span><b>←</b></button>
        <div className="login-v2-guide"><SiteGuide /></div>
        <p className="login-v2-footnote">لن تُحفظ إجابات التجربة ضمن حسابك.</p>
      </section>
    </main>
    {showSample&&<div className="modal-backdrop" onClick={closeSample}><div className="guide-modal w-full max-w-lg" onClick={e=>e.stopPropagation()} dir="rtl"><button className="modal-close" onClick={closeSample} aria-label="إغلاق">×</button><div className="flex items-center justify-between gap-3 mb-5 pl-10"><div><p className="eyebrow">تجربة سريعة</p><h2 className="text-xl font-black text-ink mt-1">٥ أسئلة تجريبية</h2></div><div className="rounded-xl bg-brand-soft text-brand px-3 py-2 text-xs font-bold whitespace-nowrap">{sampleScore}/{sampleIndex+1}</div></div><div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden"><div className="h-full bg-brand transition-all" style={{width:`${((sampleIndex+1)/SAMPLE_QUESTIONS.length)*100}%`}}/></div>{sample.imageUrl&&<div className="w-full max-w-[210px] aspect-square mx-auto mb-4 rounded-2xl border border-line bg-paper overflow-hidden"><OptimizedImage src={sample.imageUrl} alt="صورة السؤال" priority sizes="210px"/></div>}<p className="text-xs text-muted mb-2">السؤال {sampleIndex+1} من {SAMPLE_QUESTIONS.length}</p><h3 className="text-base font-black text-ink leading-relaxed mb-4">{sample.text}</h3><div className="space-y-2">{sample.options.map((option,i)=>{const isChosen=chosen===i;const revealed=chosen!==undefined;const isCorrect=i===sample.correct;return <button key={i} type="button" onClick={()=>setSampleAnswers(prev=>({...prev,[sampleIndex]:i}))} className={`w-full text-right rounded-xl border px-3 py-3 flex items-center gap-2 transition-colors ${revealed&&isCorrect?'bg-brand-soft border-brand':revealed&&isChosen?'bg-exam-soft border-exam':isChosen?'bg-brand-soft border-brand':'bg-paper border-line hover:border-brand'}`}><span className="w-7 h-7 shrink-0 rounded-lg bg-white/10 grid place-items-center text-xs font-bold">{['أ','ب','ج','د'][i]}</span><span className="text-sm text-ink leading-snug">{option}</span></button>})}</div>{chosen!==undefined&&<div className={`mt-4 rounded-xl p-3 text-sm leading-relaxed ${chosen===sample.correct?'bg-brand-soft text-brand':'bg-exam-soft text-exam'}`}><b>{chosen===sample.correct?'إجابة صحيحة ✓':`الإجابة الصحيحة: ${['أ','ب','ج','د'][sample.correct]}`}</b><p className="mt-1 text-ink">{sample.explanation}</p></div>}<div className="flex gap-2 mt-5"><button type="button" disabled={sampleIndex===0} onClick={()=>setSampleIndex(i=>i-1)} className="flex-1 py-3 rounded-xl font-semibold text-muted bg-paper border border-line disabled:opacity-40">السابق</button>{sampleIndex<SAMPLE_QUESTIONS.length-1?<button type="button" onClick={()=>setSampleIndex(i=>i+1)} className="flex-1 py-3 rounded-xl font-bold text-white bg-brand">التالي</button>:<button type="button" onClick={closeSample} className="flex-1 py-3 rounded-xl font-bold text-white bg-exam">إغلاق</button>}</div></div></div>}
  </div>;
}
