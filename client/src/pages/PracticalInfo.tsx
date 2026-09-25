import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';

type MainLightKey = 'off' | 'position' | 'auto' | 'low' | 'high' | 'frontFog' | 'rearFog';
type SignalKey = 'left' | 'right' | 'hazard';
type ControlGroup = 'ring' | 'lever';
type Perspective = 'driver' | 'external';

type LightItem = {
  key: MainLightKey;
  title: string;
  subtitle: string;
  short: string;
  action: string;
  use: string;
  caution: string;
};

type Scenario = {
  id: string;
  tag: string;
  title: string;
  control: MainLightKey | SignalKey;
  driverTitle: string;
  externalTitle: string;
  goal: string;
  steps: string[];
  note: string;
};

const MAIN_LIGHTS: LightItem[] = [
  { key: 'off', title: 'إيقاف', subtitle: 'OFF', short: 'لا توجد إنارة مختارة من الحلقة.', action: 'لف الحلقة إلى وضع OFF.', use: 'وضع الحلقة الأساسي. قد تبقى وظائف أخرى حسب تجهيز السيارة.', caution: 'ترتيب الأوضاع يختلف حسب الشركة والموديل.' },
  { key: 'position', title: 'أضواء الموضع', subtitle: 'POSITION', short: 'تجعل المركبة أوضح عند ضعف الإضاءة المحيطة.', action: 'لف الحلقة إلى رمز أضواء الموضع.', use: 'هدفها الأساسي أن تُرى المركبة، لا أن تنير الطريق أمامك.', caution: 'لا تعتمد عليها وحدها لرؤية الطريق ليلاً.' },
  { key: 'auto', title: 'أوتوماتيك', subtitle: 'AUTO', short: 'السيارة تقرر تشغيل المصابيح وفق تجهيزها وحساساتها.', action: 'لف الحلقة إلى AUTO إذا كانت السيارة مجهزة به.', use: 'تترك قرار تشغيل بعض المصابيح للنظام.', caution: 'سلوك AUTO يختلف بين السيارات.' },
  { key: 'low', title: 'الضوء المنخفض', subtitle: 'LOW BEAM', short: 'حزمة قريبة من سطح الطريق لتقليل إبهار الآخرين.', action: 'لف الحلقة إلى رمز الضوء المنخفض.', use: 'إنارة الطريق أمامك مع توجيه الحزمة إلى الأسفل. المشهد يستخدم 30 متراً كمسافة تعليمية تقريبية.', caution: 'الرقم في المشهد توضيحي؛ الرؤية والسرعة وحالة الطريق هي الأساس.' },
  { key: 'high', title: 'الضوء العالي', subtitle: 'HIGH BEAM', short: 'حزمة بعيدة للرؤية على طريق مظلم وخالٍ من مستخدمي الطريق.', action: 'ادفع الذراع للأمام في الأنظمة التي تستخدم هذه الحركة.', use: 'يساعد على رؤية أبعد عندما لا يوجد مستخدم طريق قد يتأذى من الضوء.', caution: 'عند ظهور مركبة مقابلة أو احتمال إبهارها، اخفض العالي.' },
  { key: 'frontFog', title: 'ضباب أمامي', subtitle: 'FRONT FOG', short: 'إنارة منخفضة تساعد على إبقاء تفاصيل الطريق أوضح في الرؤية السيئة.', action: 'فعّل الضباب الأمامي إذا كانت السيارة مجهزة به.', use: 'المشهد يوضح الفرق بين الضوء المنتشر داخل الضباب والحزمة المنخفضة قرب سطح الطريق.', caution: 'المصباح لا يعوض عن خفض السرعة وزيادة مسافة الأمان.' },
  { key: 'rearFog', title: 'ضباب خلفي', subtitle: 'REAR FOG', short: 'يجعل المركبة أوضح لمن خلفك عندما تكون الرؤية سيئة جداً.', action: 'فعّل الضباب الخلفي عند الحاجة وفي السيارة المجهزة به.', use: 'وظيفته الأساسية أن تُرى المركبة من الخلف.', caution: 'شدته عالية؛ أوقفه عند تحسن الرؤية.' },
];

const RING_LIGHTS = MAIN_LIGHTS.filter(item => item.key !== 'high');

const SIGNAL_ITEMS = [
  { key: 'right' as const, title: 'غماز يمين', subtitle: 'UP ↑', short: 'إشارة إلى نيتك بالانعطاف أو تغيير المسار نحو اليمين.', action: 'ارفع الذراع للأعلى.', use: 'جزء من مناورة كاملة تبدأ بمراقبة الطريق والمسار.', caution: 'الغماز ينبه الآخرين ولا يمنحك أولوية وحده.' },
  { key: 'left' as const, title: 'غماز يسار', subtitle: 'DOWN ↓', short: 'إشارة إلى نيتك بالانعطاف أو تغيير المسار نحو اليسار.', action: 'اخفض الذراع للأسفل.', use: 'استخدمه بعد التأكد من أن المناورة آمنة.', caution: 'مرآة → نقطة عمياء → غماز → انتقال تدريجي.' },
  { key: 'hazard' as const, title: 'التحذير الرباعي', subtitle: 'HAZARD', short: 'يشغل إشارات التحذير للجهتين معاً.', action: 'اضغط زر التحذير الرباعي المنفصل.', use: 'للتنبيه إلى توقف أو حالة تجعل المركبة تحتاج تحذيراً واضحاً.', caution: 'هو مختلف عن غماز الانعطاف.' },
];

const SCENARIOS: Scenario[] = [
  { id: 'low', tag: 'الضوء المنخفض', title: 'ليل مزدحم · حزمة قريبة وموجهة للأسفل', control: 'low', driverTitle: 'من منظور السائق: الطريق مضاء قريباً أمامك.', externalTitle: 'من الخارج: الحزمة منخفضة ولا تصعد إلى مستوى عيني السائق المقابل.', goal: 'فهم أن الضوء المنخفض يبحث عن رؤية مناسبة مع تقليل الإبهار، لا عن أقصى مدى ممكن.', steps: ['طريق ليلي مع حركة مرور', 'حزمة مائلة نحو سطح الطريق', 'مدى تعليمي يقارب 30 م', 'تجنب إضاءة وجه السائق المقابل'], note: 'الرسم تعليمي لتوضيح اتجاه الحزمة، وليس قياساً ضوئياً لطراز سيارة محدد.' },
  { id: 'high', tag: 'الضوء العالي', title: 'طريق خارجي مظلم · مدى أبعد ثم خفض فوري', control: 'high', driverTitle: 'من منظور السائق: مدى رؤية أطول على طريق مظلم.', externalTitle: 'من الخارج: عند ظهور مركبة مقابلة يجب ألا تبقى الحزمة باتجاهها.', goal: 'تعلم التحول بين العالي والمنخفض حسب وجود مستخدم طريق مقابل.', steps: ['طريق خارجي مظلم', 'تفعيل العالي', 'ظهور مركبة مقابلة', 'خفض العالي والعودة للمنخفض'], note: 'اضغط زر «أظهر سيارة مقابلة» داخل المشهد لترى التغيير التعليمي.' },
  { id: 'fog', tag: 'أضواء الضباب', title: 'ضباب كثيف · جدار أبيض مقابل طريق أوضح', control: 'frontFog', driverTitle: 'من منظور السائق: الضوء المرتفع يتشتت داخل الضباب، والحزمة المنخفضة تبقى أقرب للطريق.', externalTitle: 'من الخارج: الحزمة المنخفضة تتحرك قرب سطح الطريق بدلاً من الارتفاع داخل الضباب.', goal: 'تمييز تشتت الضوء داخل الضباب عن توزيع منخفض وموجّه قرب الطريق.', steps: ['ضباب كثيف', 'انتشار الضوء يضعف التباين', 'حزمة منخفضة قرب الطريق', 'سرعة أقل ومسافة توقف أكبر'], note: 'الضباب يحد الرؤية مهما كان نوع المصباح؛ القيادة الآمنة تعتمد أيضاً على السرعة.' },
  { id: 'position', tag: 'أضواء الموضع', title: 'غسق · الهدف أن تُرى المركبة', control: 'position', driverTitle: 'من منظور السائق: هذه ليست إنارة طريق بعيدة.', externalTitle: 'من الخارج: حدود المركبة تصبح أوضح في الإضاءة المحيطة الضعيفة.', goal: 'حفظ الفرق: Position = أن تُرى، وليس أن ترى الطريق لمسافة طويلة.', steps: ['غسق أو إضاءة محيطة ضعيفة', 'مركبة متوقفة بأمان', 'إظهار حدود المركبة', 'لا تعتمد عليها لإنارة الطريق'], note: 'التشغيل الفعلي يعتمد على السيارة والأنظمة والظروف.' },
  { id: 'signals', tag: 'الغمازات', title: 'تقاطع · الإشارة تسبق المناورة', control: 'right', driverTitle: 'من منظور السائق: فحص ثم إشارة ثم مناورة.', externalTitle: 'من الخارج: السائقون الآخرون يرون إشارة الاتجاه قبل الحركة.', goal: 'ربط الغماز بتسلسل القيادة بدلاً من اعتباره أمراً منفصلاً عن فحص الطريق.', steps: ['راقب التقاطع', 'حدد اتجاه المناورة', 'استخدم الغماز المناسب', 'نفّذ عندما يكون آمناً'], note: 'الغماز وسيلة تواصل مع مستخدمي الطريق.' },
  { id: 'hazard', tag: 'التحذير الرباعي', title: 'كتف الطريق · توقف طارئ', control: 'hazard', driverTitle: 'من منظور السائق: حالة توقف غير اعتيادية تحتاج تحذيراً.', externalTitle: 'من الخارج: الإشارات الأربع تجعل المركبة واضحة للاتجاهين.', goal: 'تمييز التحذير الرباعي عن الغماز الذي يحدد اتجاهاً واحداً.', steps: ['توقف بأمان قدر الإمكان', 'اجعل المركبة واضحة', 'فعّل التحذير عند الحاجة', 'اتخذ الإجراء الآمن التالي'], note: 'هذا المثال يشرح فكرة التحذير العام حول مركبة متوقفة.' },
  { id: 'rear', tag: 'الفرامل والرجوع', title: 'الخلفية · الأحمر للفرامل والأبيض للرجوع', control: 'rearFog', driverTitle: 'من منظور السائق: تغيّر حالة السيارة هو الذي يشغّل هذه الوظائف.', externalTitle: 'من الخلف: الأحمر يوضح الكبح، والأبيض يكشف منطقة الرجوع للخلف.', goal: 'تمييز الأضواء التي تتفاعل مع حالة السيارة بدلاً من مقبض الإنارة.', steps: ['ضغط الفرامل → أحمر قوي', 'اختيار الرجوع → أبيض', 'راقب ما يراه من خلفك', 'استخدم وضع السيارة الصحيح'], note: 'المشهد يشرح الوظيفة البصرية ولا يفترض وجود زر مستقل لهذه الأضواء.' },
];

function LightIcon({ type, className = '' }: { type: MainLightKey | SignalKey | 'brake' | 'reverse' | 'sun'; className?: string }) {
  const props = { className, viewBox: '0 0 96 64', fill: 'none', 'aria-hidden': true } as const;
  const stroke = 'currentColor';
  if (type === 'left' || type === 'right') return <svg {...props}><path d={type === 'right' ? 'M13 32h52M53 16l20 16-20 16' : 'M83 32H31M43 16 23 32l20 16'} stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'hazard') return <svg {...props}><path d="m48 8 36 48H12Z" stroke={stroke} strokeWidth="4" strokeLinejoin="round" /><path d="M48 24v15M48 45v2" stroke={stroke} strokeWidth="4" strokeLinecap="round" /></svg>;
  if (type === 'brake') return <svg {...props}><rect x="17" y="15" width="62" height="34" rx="11" stroke={stroke} strokeWidth="3" /><rect x="24" y="22" width="18" height="20" rx="5" fill={stroke} opacity=".9" /><rect x="54" y="22" width="18" height="20" rx="5" fill={stroke} opacity=".9" /></svg>;
  if (type === 'reverse') return <svg {...props}><rect x="16" y="16" width="64" height="32" rx="10" stroke={stroke} strokeWidth="3" /><path d="m28 35 9-8 8 13 8-11 13 7" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'sun') return <svg {...props}><circle cx="48" cy="32" r="10" stroke={stroke} strokeWidth="3" /><path d="M48 9v7M48 48v7M25 32h-7M78 32h-7M32 16l-5-5M64 48l5 5M32 48l-5 5M64 16l5-5" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'off') return <svg {...props}><circle cx="37" cy="32" r="9" stroke={stroke} strokeWidth="3"/><path d="M20 32h-8M54 32h26M37 13V6M37 58v-7" stroke={stroke} strokeWidth="3" strokeLinecap="round"/></svg>;
  if (type === 'position') return <svg {...props}><path d="M10 19h24c8 0 12 5 15 13H10z" stroke={stroke} strokeWidth="3"/><path d="M60 16v32M72 20v24M84 24v16" stroke={stroke} strokeWidth="3" strokeLinecap="round"/></svg>;
  if (type === 'auto') return <svg {...props}><circle cx="38" cy="32" r="10" stroke={stroke} strokeWidth="3"/><path d="M38 10v-5M38 59v-5M16 32H9M67 32h-7M22 16l-5-5M54 48l5 5M22 48l-5 5M54 16l5-5" stroke={stroke} strokeWidth="3" strokeLinecap="round"/><text x="70" y="38" fill={stroke} fontSize="14" fontWeight="900">A</text></svg>;
  if (type === 'low') return <svg {...props}><path d="M10 15h25c8 0 13 7 16 17H10z" stroke={stroke} strokeWidth="3"/><path d="m61 20 22 7M61 31l22 7M61 42l16 5" stroke={stroke} strokeWidth="3" strokeLinecap="round"/></svg>;
  if (type === 'high') return <svg {...props}><path d="M10 15h25c8 0 13 7 16 17H10z" stroke={stroke} strokeWidth="3"/><path d="M61 13h27M61 25h27M61 37h27M61 49h27" stroke={stroke} strokeWidth="3" strokeLinecap="round"/></svg>;
  if (type === 'frontFog' || type === 'rearFog') return <svg {...props}><path d="M10 15h25c8 0 13 7 16 17H10z" stroke={stroke} strokeWidth="3"/><path d={type === 'frontFog' ? 'm61 18 22 7M61 30h27M61 42 82 35' : 'm61 18-22 7M61 30H34M61 42 40 35'} stroke={stroke} strokeWidth="3" strokeLinecap="round"/><path d="M84 9c-8 7 8 11 0 19s8 11 0 20" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/></svg>;
  return <svg {...props}><path d="M10 15h25c8 0 13 7 16 17H10z" stroke={stroke} strokeWidth="3"/><path d="M61 12h28M61 25h28M61 38h20" stroke={stroke} strokeWidth="3" strokeLinecap="round"/></svg>;
}

function ExplanationCard({ title, item, signal }: { title: string; item?: LightItem; signal?: (typeof SIGNAL_ITEMS)[number] }) {
  const action = signal?.action || item?.action || '';
  const use = signal?.use || item?.use || '';
  const caution = signal?.caution || item?.caution || '';
  const icon = signal?.key || item?.key || 'low';
  return (
    <aside className="explanation-card" aria-live="polite">
      <div className="explanation-icon"><LightIcon type={icon} /></div>
      <div className="explanation-copy"><span>شرح مباشر</span><h3>{title}</h3><p className="explanation-action">{action}</p></div>
      <div className="explanation-detail"><small>متى ولماذا؟</small><p>{use}</p></div>
      <div className="explanation-detail caution"><small>انتبه</small><p>{caution}</p></div>
    </aside>
  );
}

function Dashboard({ mainLight, signal }: { mainLight: MainLightKey; signal: SignalKey | null }) {
  const items = [
    { key: 'left', label: 'يسار', icon: 'left' as const, active: signal === 'left' || signal === 'hazard', tone: 'amber' },
    { key: 'right', label: 'يمين', icon: 'right' as const, active: signal === 'right' || signal === 'hazard', tone: 'amber' },
    { key: 'low', label: 'منخفض', icon: 'low' as const, active: mainLight === 'low', tone: 'green' },
    { key: 'high', label: 'عالي', icon: 'high' as const, active: mainLight === 'high', tone: 'blue' },
    { key: 'fog', label: 'ضباب', icon: 'frontFog' as const, active: mainLight === 'frontFog', tone: 'green' },
    { key: 'rearFog', label: 'ضباب خلفي', icon: 'rearFog' as const, active: mainLight === 'rearFog', tone: 'amber' },
  ];
  return (
    <section className="dashboard-card" aria-live="polite">
      <div className="dashboard-copy"><span>لوحة العدادات</span><strong>الحركة أصبحت رمزاً واضحاً.</strong><small>الأخضر للمنخفض، الأزرق للعالي، والكهرماني للإشارات.</small></div>
      <div className="dashboard-grid">{items.map(item => <div key={item.key} className={'dashboard-item ' + item.tone + (item.active ? ' is-active' : '')}><LightIcon type={item.icon}/><span>{item.label}</span></div>)}</div>
    </section>
  );
}


function RingSymbol({ type, active }: { type: MainLightKey; active: boolean }) {
  const c = active ? '#eafffb' : '#88969b';
  const glow = active ? '#8ee9de' : '#172126';
  const common = { stroke: c, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };
  if (type === 'off') return <g><circle r="7" fill={glow} opacity=".35"/><circle r="7" {...common}/><path d="M0 -15V-9M0 9V15M-15 0H-9M9 0h6" {...common}/></g>;
  if (type === 'position') return <g><path d="M-15 -6h10c5 0 7 3 8 7h-18z" {...common}/><path d="M6 -8V8M12 -6v12M18 -4v8" {...common}/></g>;
  if (type === 'auto') return <g><circle cx="-5" cy="0" r="7" {...common}/><path d="M-5 -14v4M-5 10v4M-19 0h4M9 0h4M-15 -10l3 3M5 7l3 3M-15 10l3-3M5 -7l3-3" {...common}/><text x="8" y="4" fill={c} fontSize="8" fontWeight="900">A</text></g>;
  if (type === 'low') return <g><path d="M-16 -7h9c5 0 8 4 9 8h-18z" {...common}/><path d="m7 -5 9 3M7 2l9 3M7 9l7 2" {...common}/></g>;
  if (type === 'frontFog') return <g><path d="M-16 -7h9c5 0 8 4 9 8h-18z" {...common}/><path d="m6 -5 10 3M6 2h12M6 9l10-3" {...common}/><path d="M16 -10c-4 4 4 7 0 11s4 7 0 11" {...common}/></g>;
  return <g><path d="M-16 -7h9c5 0 8 4 9 8h-18z" {...common}/><path d="m-6 -5 -10 3M-6 2h-12M-6 9l-10-3" {...common}/><path d="M-16 -10c4 4-4 7 0 11s-4 7 0 11" {...common}/></g>;
}

function CockpitHandle({
  mainLight, signal, movement, onRingCycle, onLever, onHazard,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
  movement: 'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard';
  onRingCycle: () => void;
  onLever: (movement: 'left' | 'right' | 'push' | 'pull') => void;
  onHazard: () => void;
}) {
  const dragRef = useRef<{ zone: 'ring' | 'lever'; x: number; y: number; fired: boolean } | null>(null);
  const suppressClick = useRef(false);
  const ringIndex = Math.max(0, RING_LIGHTS.findIndex(item => item.key === mainLight));
  const ringAngle = -22 + ringIndex * 37;

  const beginDrag = (zone: 'ring' | 'lever', e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { zone, x: e.clientX, y: e.clientY, fired: false };
    suppressClick.current = false;
  };
  const moveDrag = (zone: 'ring' | 'lever', e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.zone !== zone || d.fired) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (zone === 'ring' && Math.abs(dx) > 24) {
      d.fired = true; suppressClick.current = true; onRingCycle(); return;
    }
    if (zone === 'lever') {
      if (Math.abs(dy) > 24) {
        d.fired = true; suppressClick.current = true; onLever(dy < 0 ? 'right' : 'left');
      } else if (Math.abs(dx) > 24) {
        d.fired = true; suppressClick.current = true; onLever(dx > 0 ? 'push' : 'pull');
      }
    }
  };
  const endDrag = () => { dragRef.current = null; };
  const clickRing = () => { if (suppressClick.current) { suppressClick.current = false; return; } onRingCycle(); };
  const clickLever = () => { if (suppressClick.current) { suppressClick.current = false; return; } onLever(signal === 'right' ? 'left' : 'right'); };

  const leverTransform =
    movement === 'left' ? 'translate(0 14) rotate(4 710 204)' :
    movement === 'right' ? 'translate(0 -14) rotate(-4 710 204)' :
    movement === 'push' ? 'translate(24 0)' :
    movement === 'pull' ? 'translate(-24 0)' : 'translate(0 0)';

  const currentLabel = signal === 'left' ? 'غماز يسار' : signal === 'right' ? 'غماز يمين' : signal === 'hazard' ? 'تحذير رباعي' : MAIN_LIGHTS.find(item => item.key === mainLight)?.title || 'الإنارة';

  return (
    <section className="handle-card">
      <div className="handle-header">
        <div><span className="eyebrow">02 · المقبض التفاعلي</span><h3>اسحب الجزء نفسه. لا تحتاج لحفظ الأسهم.</h3><p>اسحب الحلقة أفقياً لتغيير وضع الإنارة، والذراع ↑↓ للغماز أو ↔ للعالي والوميض. على الكمبيوتر استخدم الفأرة.</p></div>
        <div className="handle-state"><span>الوضع الحالي</span><strong>{currentLabel}</strong></div>
      </div>

      <div className="handle-stage">
        <svg viewBox="0 0 900 560" className="handle-svg" role="img" aria-label="رسم متجهي واقعي لمقبض الإنارة والغمازات مع يد تمسك به">
          <defs>
            <linearGradient id="cockpitBg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#12252d"/><stop offset=".55" stopColor="#050b10"/><stop offset="1" stopColor="#020508"/></linearGradient>
            <linearGradient id="stalkMetal" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b5c1c5"/><stop offset=".16" stopColor="#68757b"/><stop offset=".55" stopColor="#2b373c"/><stop offset="1" stopColor="#0a1014"/></linearGradient>
            <linearGradient id="ringMetal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e1e7e9"/><stop offset=".24" stopColor="#8b979b"/><stop offset=".58" stopColor="#374249"/><stop offset="1" stopColor="#0b1216"/></linearGradient>
            <linearGradient id="rubberGrip" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#526066"/><stop offset=".5" stopColor="#202a2f"/><stop offset="1" stopColor="#070c10"/></linearGradient>
            <radialGradient id="skin" cx=".32" cy=".22" r=".95"><stop stopColor="#e1aa83"/><stop offset=".50" stopColor="#b97a5b"/><stop offset="1" stopColor="#684133"/></radialGradient>
            <filter id="handleShadow"><feDropShadow dx="0" dy="26" stdDeviation="23" floodColor="#000" floodOpacity=".65"/></filter>
            <pattern id="microTexture" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 10 10 0M3 12 12 3" stroke="#fff" strokeOpacity=".025" strokeWidth="1"/></pattern>
          </defs>
          <rect width="900" height="560" rx="30" fill="url(#cockpitBg)"/>
          <path d="M0 418Q220 336 450 365t450 42v153H0Z" fill="#0b151a"/>
          <ellipse cx="446" cy="425" rx="360" ry="50" fill="#000" opacity=".35"/>
          <g filter="url(#handleShadow)">
            <path d="M105 407C232 322 351 278 500 250c86-16 160-35 252-60" stroke="#05090d" strokeWidth="118" strokeLinecap="round"/>
            <path d="M105 390C232 306 351 262 500 234c86-16 160-35 252-60" stroke="url(#stalkMetal)" strokeWidth="91" strokeLinecap="round"/>
            <path d="M105 369C232 291 352 245 500 217c90-16 164-34 252-58" stroke="#f3f8f8" strokeOpacity=".15" strokeWidth="12" strokeLinecap="round"/>
            <path d="M104 391C230 309 352 268 500 238c86-16 161-34 253-61" stroke="url(#microTexture)" strokeWidth="84" strokeLinecap="round"/>
            <g transform={'rotate(' + ringAngle + ' 537 218)'}>
              <rect x="405" y="138" width="264" height="160" rx="55" fill="#070c0f" stroke="#d6e0e2" strokeOpacity=".22" strokeWidth="5"/>
              <rect x="420" y="152" width="234" height="132" rx="46" fill="url(#ringMetal)" stroke="#f7fbfc" strokeOpacity=".15" strokeWidth="3"/>
              <rect x="432" y="164" width="210" height="108" rx="38" fill="#121b20"/>
              <path d="M439 218h196" stroke="#eef6f6" strokeOpacity=".10" strokeWidth="2"/>
              {RING_LIGHTS.map((item, index) => (
                <g key={item.key} transform={'translate(' + (447 + index * 37) + ' 218)'}>
                  <circle r="17" fill="#080f13" stroke={item.key === mainLight ? '#a5f3e8' : '#77858a'} strokeOpacity={item.key === mainLight ? '.95' : '.45'} strokeWidth="2"/>
                  <RingSymbol type={item.key} active={item.key === mainLight}/>
                </g>
              ))}
              <rect x="529" y="135" width="16" height="25" rx="8" fill="#8ae6dc"/>
            </g>
            <g transform={leverTransform}>
              <path d="M675 156 792 132c25-5 44 10 41 34l-13 58c-4 21-24 34-46 29l-119-30Z" fill="url(#rubberGrip)" stroke="#b1bdc0" strokeOpacity=".22" strokeWidth="4"/>
              <path d="M736 151l54-11M733 174l59-12M729 197l57-11M724 220l52-10" stroke="#e4ecee" strokeOpacity=".13" strokeWidth="6" strokeLinecap="round"/>
              <rect x="774" y="145" width="33" height="100" rx="16" fill="#11191d" stroke="#c7d0d3" strokeOpacity=".16" strokeWidth="2"/>
              <text x="790" y="176" textAnchor="middle" fill="#eef7f5" fontSize="9" fontWeight="900">LOW</text>
              <text x="790" y="195" textAnchor="middle" fill="#eef7f5" fontSize="9" fontWeight="900">FOG</text>
            </g>
            <g opacity=".98">
              <path d="M625 121c27-9 63 0 82 19 13 12 20 32 13 47-7 16-31 18-50 9l-50-25c-16-8-12-40 5-50Z" fill="url(#skin)" stroke="#f6c7a2" strokeOpacity=".20" strokeWidth="3"/>
              <path d="M647 136c20-9 43-2 57 12M639 151c19-7 37-2 53 10M635 168c16-5 32 0 46 8" stroke="#4e3025" strokeOpacity=".46" strokeWidth="4" strokeLinecap="round"/>
              <path d="M661 183c18 6 31 2 43-7l16 27c-11 14-31 18-49 10l-27-13Z" fill="url(#skin)" opacity=".96"/>
              <path d="M691 124c12 1 24 7 30 15" stroke="#f7d1b3" strokeOpacity=".28" strokeWidth="5" strokeLinecap="round"/>
            </g>
          </g>
          <g fontFamily="Arial,sans-serif" fontWeight="900">
            <rect x="36" y="34" width="274" height="58" rx="19" fill="#061218" stroke="#fff" strokeOpacity=".08"/><circle cx="62" cy="63" r="10" fill="#86e4da"/><text x="83" y="68" fill="#dff6f2" fontSize="14">الحلقة = تدوير لاختيار الإنارة</text>
            <rect x="36" y="468" width="354" height="58" rx="19" fill="#061218" stroke="#fff" strokeOpacity=".08"/><circle cx="62" cy="497" r="10" fill="#b8c1c4"/><text x="83" y="502" fill="#dff6f2" fontSize="14">الذراع = ↑ ↓ غماز · ↔ العالي والوميض</text>
            <rect x="616" y="34" width="246" height="58" rx="19" fill="#061218" stroke="#fff" strokeOpacity=".08"/><circle cx="642" cy="63" r="10" fill="#f1bd74"/><text x="663" y="68" fill="#dff6f2" fontSize="14">زر مستقل = تحذير رباعي</text>
          </g>
          <g transform="translate(620 350)"><circle cx="56" cy="56" r="54" fill="#070e12" stroke="#f1bd74" strokeOpacity=".35" strokeWidth="3"/><path d="m56 27 26 43H30Z" stroke="#f1bd74" strokeWidth="4" strokeLinejoin="round"/><path d="M56 40v14M56 61v2" stroke="#f1bd74" strokeWidth="4" strokeLinecap="round"/></g>
        </svg>

        <button type="button" className="handle-hotspot ring-zone" onPointerDown={e => beginDrag('ring', e)} onPointerMove={e => moveDrag('ring', e)} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={clickRing} aria-label="لف حلقة الإنارة"><span>اسحب لتدوير الحلقة</span></button>
        <button type="button" className="handle-hotspot lever-zone" onPointerDown={e => beginDrag('lever', e)} onPointerMove={e => moveDrag('lever', e)} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={clickLever} aria-label="تحريك ذراع الغمازات والعالي"><span>اسحب الذراع</span></button>
        <button type="button" className="handle-hotspot hazard-zone" onClick={onHazard} aria-label="تشغيل التحذير الرباعي"><span>△</span></button>
      </div>

      <div className="handle-actions">
        <button type="button" className={movement === 'ring' ? 'active' : ''} onClick={onRingCycle}><b>↻</b><span>لف الحلقة</span><small>اختيار الإنارة</small></button>
        <button type="button" className={movement === 'right' ? 'active' : ''} onClick={() => onLever('right')}><b>↑</b><span>يمين</span><small>ارفع الذراع</small></button>
        <button type="button" className={movement === 'left' ? 'active' : ''} onClick={() => onLever('left')}><b>↓</b><span>يسار</span><small>اخفض الذراع</small></button>
        <button type="button" className={movement === 'push' ? 'active' : ''} onClick={() => onLever('push')}><b>→</b><span>العالي</span><small>ادفع للأمام</small></button>
        <button type="button" className={movement === 'pull' ? 'active' : ''} onClick={() => onLever('pull')}><b>←</b><span>الوميض</span><small>اسحب للحظة</small></button>
        <button type="button" className={movement === 'hazard' ? 'active hazard' : 'hazard'} onClick={onHazard}><b>△</b><span>الرباعي</span><small>زر مستقل</small></button>
      </div>
      <Dashboard mainLight={mainLight} signal={signal}/>
    </section>
  );
}

function ControlPanel({
  group, setGroup, mainLight, signal, flashActive, onMain, onSignal, onFlash,
}: {
  group: ControlGroup;
  setGroup: (value: ControlGroup) => void;
  mainLight: MainLightKey;
  signal: SignalKey | null;
  flashActive: boolean;
  onMain: (value: MainLightKey) => void;
  onSignal: (value: SignalKey) => void;
  onFlash: () => void;
}) {
  const activeSignal = SIGNAL_ITEMS.find(item => item.key === signal);
  const activeLight = MAIN_LIGHTS.find(item => item.key === mainLight) || MAIN_LIGHTS[3];

  return (
    <section className="control-panel">
      <div className="control-panel-head">
        <div><span className="eyebrow">01 · اختَر</span><h3>وظيفة واحدة في كل مرة</h3><p>اختر وظيفة أو تعامل معها مباشرة من المقبض. الشرح يظهر هنا بدون نقل الصفحة.</p></div>
        <div className="selection-pill"><i />{activeSignal?.title || (flashActive ? 'وميض العالي' : activeLight.title)}</div>
      </div>

      <div className="control-tabs">
        <button type="button" className={group === 'ring' ? 'active' : ''} onClick={() => setGroup('ring')}>① حلقة الإنارة</button>
        <button type="button" className={group === 'lever' ? 'active' : ''} onClick={() => setGroup('lever')}>② الذراع</button>
      </div>

      <div className="control-grid">
        {group === 'ring' ? RING_LIGHTS.map(item => (
          <button key={item.key} type="button" className={mainLight === item.key && !signal && !flashActive ? 'selected' : ''} onClick={() => onMain(item.key)}>
            <span className="control-icon"><LightIcon type={item.key}/></span>
            <span className="control-copy"><b>{item.title}</b><small>{item.subtitle}</small><em>{item.short}</em></span>
            <span className="control-arrow">›</span>
          </button>
        )) : (
          <>
            <button type="button" className={signal === 'right' ? 'selected' : ''} onClick={() => onSignal('right')}><span className="control-icon big-arrow">↑</span><span className="control-copy"><b>غماز يمين</b><small>ارفع الذراع</small><em>إشارة الاتجاه</em></span><span className="control-arrow">›</span></button>
            <button type="button" className={signal === 'left' ? 'selected' : ''} onClick={() => onSignal('left')}><span className="control-icon big-arrow">↓</span><span className="control-copy"><b>غماز يسار</b><small>اخفض الذراع</small><em>إشارة الاتجاه</em></span><span className="control-arrow">›</span></button>
            <button type="button" className={mainLight === 'high' && !flashActive ? 'selected' : ''} onClick={() => onMain('high')}><span className="control-icon big-arrow">→</span><span className="control-copy"><b>الضوء العالي</b><small>ادفع للأمام</small><em>مدى رؤية بعيد</em></span><span className="control-arrow">›</span></button>
            <button type="button" className={flashActive ? 'selected' : ''} onClick={onFlash}><span className="control-icon big-arrow">←</span><span className="control-copy"><b>وميض العالي</b><small>اسحب للحظة</small><em>ومضة سريعة</em></span><span className="control-arrow">›</span></button>
          </>
        )}
      </div>

      <button type="button" className={signal === 'hazard' ? 'hazard-control selected' : 'hazard-control'} onClick={() => onSignal('hazard')}>
        <span className="control-icon"><LightIcon type="hazard"/></span><span className="control-copy"><b>التحذير الرباعي</b><small>زر مستقل · الاتجاهان معاً</small><em>تحذير عام للمركبة</em></span><span className="control-arrow">›</span>
      </button>

      <div className="desktop-explanation">
        <ExplanationCard title={activeSignal?.title || (flashActive ? 'وميض العالي' : activeLight.title)} item={!activeSignal && !flashActive ? activeLight : undefined} signal={activeSignal}/>
      </div>
    </section>
  );
}

function CurrentScene({ mainLight, signal, flashActive, perspective, oncoming, setOncoming }: { mainLight: MainLightKey; signal: SignalKey | null; flashActive: boolean; perspective: Perspective; oncoming: boolean; setOncoming: (v: boolean) => void }) {
  const mode = signal === 'hazard' ? 'hazard' : signal ? 'signal' : flashActive ? 'flash' : mainLight;
  const night = mode !== 'position';
  return (
    <div className="result-scene-wrap">
      {perspective === 'driver' ? (
        <svg className="current-scene-svg" viewBox="0 0 900 470" role="img" aria-label="منظور السائق من المشهد التدريبي">
          <defs>
            <linearGradient id="currentSky" x1="0" y1="0" x2="0" y2="1"><stop stopColor={night ? '#07151d' : '#38554f'}/><stop offset="1" stopColor={night ? '#10232b' : '#273e39'}/></linearGradient>
            <linearGradient id="currentRoad" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2a3c42"/><stop offset="1" stopColor="#0a1115"/></linearGradient>
            <filter id="currentBlur"><feGaussianBlur stdDeviation="17"/></filter>
          </defs>
          <rect width="900" height="470" fill="url(#currentSky)"/>
          {mode === 'position' ? <><rect y="278" width="900" height="192" fill="#1d3535"/><circle cx="735" cy="84" r="54" fill="#e1e6cf" opacity=".24"/><path d="M0 336h900" stroke="#c2ceca" strokeOpacity=".15" strokeWidth="4"/><image href="/spirit/car-rear.svg" x="336" y="232" width="228" height="126"/><circle cx="405" cy="302" r="9" fill="#d8e5ac"/><circle cx="495" cy="302" r="9" fill="#d8e5ac"/></> : <><path d="M0 470 210 126h480L900 470Z" fill="url(#currentRoad)"/><path d="M450 130v340" stroke="#dcebea" strokeOpacity=".25" strokeWidth="4" strokeDasharray="24 18"/></>}
          {mode === 'low' || mode === 'flash' ? <><path d="M450 310 245 220M450 310 655 220" stroke="#fff1b3" strokeOpacity=".40" strokeWidth="55" strokeLinecap="round" filter="url(#currentBlur)"/><path d="M450 311 266 228M450 311 634 228" stroke="#fff2b4" strokeOpacity=".38" strokeWidth="12" strokeLinecap="round"/><text x="54" y="405" fill="#d7eee9" fontSize="16" fontWeight="900">حزمة قريبة · مثال ≈ 30 م</text></> : null}
          {mode === 'high' && <><path d="M450 310 62 86M450 310 838 86" stroke="#fff1b1" strokeOpacity=".18" strokeWidth="90" strokeLinecap="round" filter="url(#currentBlur)"/><path d="M450 310 72 76M450 310 828 76" stroke="#fff3b7" strokeOpacity=".34" strokeWidth="11" strokeLinecap="round"/>{oncoming && <g><circle cx="666" cy="150" r="29" fill="#f8fbf9" opacity=".9"/><circle cx="666" cy="150" r="55" fill="#fff7db" opacity=".16" filter="url(#currentBlur)"/><rect x="54" y="54" width="340" height="70" rx="20" fill="#251718" stroke="#ff9da2" strokeOpacity=".38"/><text x="79" y="83" fill="#ffd9d8" fontSize="19" fontWeight="900">مركبة مقابلة · خفّض العالي</text><text x="79" y="105" fill="#d9bcbc" fontSize="12">لتجنب إبهار السائق المقابل</text></g>}</>}
          {mode === 'frontFog' && <><rect x="0" y="82" width="900" height="58" fill="#eef6f1" fillOpacity=".16"/><rect x="0" y="180" width="900" height="48" fill="#eef6f1" fillOpacity=".14"/><rect x="0" y="260" width="900" height="36" fill="#eef6f1" fillOpacity=".11"/><path d="M450 312 255 270M450 312 645 270" stroke="#fff2b4" strokeOpacity=".24" strokeWidth="54" strokeLinecap="round" filter="url(#currentBlur)"/><path d="M450 313 274 277M450 313 626 277" stroke="#fff3ba" strokeOpacity=".36" strokeWidth="10" strokeLinecap="round"/><rect x="54" y="54" width="385" height="70" rx="20" fill="#dfe9e5" fillOpacity=".09" stroke="#edf6f1" strokeOpacity=".18"/><text x="79" y="84" fill="#eff7f3" fontSize="19" fontWeight="900">ضباب · التشتت يقلل التباين</text><text x="79" y="106" fill="#c8d3d1" fontSize="12">حزمة منخفضة وقرب أكبر من سطح الطريق</text></>}
          {mode === 'signal' && <g><path d="M0 270h900M450 0v470" stroke="#dce9e7" strokeOpacity=".14" strokeWidth="6" strokeDasharray="24 18"/><image href="/spirit/car-front.svg" x="338" y="285" width="224" height="142"/><circle cx={signal === 'left' ? 395 : 505} cy="326" r="12" fill="#f4ae57"/><path d="M450 350c0-66 60-97 143-106" stroke="#87e5da" strokeWidth="15" strokeLinecap="round" fill="none"/><path d="m585 243 23 15-26 8Z" fill="#87e5da"/><rect x="54" y="54" width="335" height="70" rx="20" fill="#061117" stroke="#86e4da" strokeOpacity=".25"/><text x="79" y="84" fill="#c1f3eb" fontSize="19" fontWeight="900">تقاطع · الإشارة تسبق المناورة</text><text x="79" y="106" fill="#9db1b0" fontSize="12">مرآة → غماز → تموضع → انعطاف</text></g>}
          {mode === 'hazard' && <g><path d="M0 302h900" stroke="#9baaaa" strokeOpacity=".16" strokeWidth="4"/><image href="/spirit/car-rear.svg" x="338" y="226" width="224" height="132"/><circle cx="405" cy="293" r="14" fill="#f4ae57"/><circle cx="495" cy="293" r="14" fill="#f4ae57"/><circle cx="450" cy="220" r="44" fill="#f1bd74" fillOpacity=".07" stroke="#f1bd74" strokeOpacity=".34" strokeWidth="3"/><path d="m450 195 21 37h-42Z" stroke="#f1bd74" strokeWidth="4" strokeLinejoin="round"/><rect x="54" y="54" width="350" height="70" rx="20" fill="#211b13" stroke="#f1bd74" strokeOpacity=".28"/><text x="79" y="84" fill="#f4d2a7" fontSize="19" fontWeight="900">كتف الطريق · تحذير رباعي</text><text x="79" y="106" fill="#d6bda0" fontSize="12">الاتجاهان معاً لتوضيح الخطر</text></g>}
          {mode === 'rearFog' && <g><path d="M0 302h900" stroke="#95a7a8" strokeOpacity=".15" strokeWidth="4"/><image href="/spirit/car-rear.svg" x="338" y="226" width="224" height="132"/><ellipse cx="450" cy="298" rx="125" ry="46" fill="#ffcc6a" fillOpacity=".14" filter="url(#currentBlur)"/><circle cx="405" cy="293" r="14" fill="#ffca6b"/><circle cx="495" cy="293" r="14" fill="#ffca6b"/></g>}
          <rect x="24" y="422" width="852" height="26" rx="13" fill="#02070a" opacity=".82"/><text x="45" y="440" fill="#b5c5c3" fontSize="11">{mode === 'high' && oncoming ? 'ظهرت مركبة مقابلة: اخفض العالي.' : mode === 'low' ? 'حزمة منخفضة ومركزة على الطريق.' : mode === 'frontFog' ? 'ضباب: الإضاءة لا تلغي الحاجة لتخفيف السرعة.' : mode === 'position' ? 'أضواء الموضع: الهدف إبراز المركبة في الإضاءة الضعيفة.' : 'المشهد يتغير مباشرة حسب الحركة المختارة.'}</text>
        </svg>
      ) : (
        <div className="external-vehicle-stage">
          <div className="scene-backdrop-label">{mainLight === 'position' ? 'غسق' : mainLight === 'high' ? 'طريق ليلي' : mainLight === 'frontFog' ? 'ضباب' : signal ? 'تقاطع / توقف' : 'نتيجة الحركة'}</div>
          <img src={signal === 'hazard' || mainLight === 'rearFog' ? '/spirit/car-rear.svg' : '/spirit/car-front.svg'} className="external-car" alt="" aria-hidden="true"/>
          {(mainLight === 'low' || mainLight === 'high' || mainLight === 'frontFog' || flashActive) && <><span className="beam-pool left"/><span className="beam-pool right"/></>}
          {mainLight === 'low' && <div className="distance-tag low">حزمة منخفضة · ≈ 30 م</div>}
          {mainLight === 'high' && <><div className="distance-tag high">مدى بعيد</div>{oncoming && <div className="oncoming-chip">مركبة مقابلة · خفض العالي</div>}</>}
          {mainLight === 'frontFog' && <div className="distance-tag fog">حزمة قريبة من سطح الطريق</div>}
          {mainLight === 'position' && <div className="distance-tag position">الهدف: أن تُرى المركبة</div>}
          {signal && <><span className={'signal-dot left ' + (signal === 'right' ? 'dim' : '')}/><span className={'signal-dot right ' + (signal === 'left' ? 'dim' : '')}/></>}
          {mainLight === 'rearFog' && <span className="rear-fog-pool"/>}
          {mainLight === 'position' && <div className="position-halo"/>}
        </div>
      )}
      {perspective === 'driver' && mode === 'high' && <button type="button" className="scene-bottom-toggle" onClick={() => setOncoming(!oncoming)}>{oncoming ? 'إخفاء المركبة المقابلة' : 'أظهر مركبة مقابلة'}</button>}
    </div>
  );
}

function ScenarioVisual({ scenario, perspective }: { scenario: Scenario; perspective: Perspective }) {
  const [oncoming, setOncoming] = useState(scenario.id === 'high');
  const icon = scenario.control;
  const controlLabel = scenario.control === 'hazard' ? 'رباعي' : scenario.control === 'right' ? 'يمين' : scenario.control === 'left' ? 'يسار' : MAIN_LIGHTS.find(item => item.key === scenario.control)?.title || '';
  return (
    <article className="scenario-visual">
      <div className="scenario-media"><ScenarioSvg scenario={scenario} perspective={perspective} oncoming={oncoming} setOncoming={setOncoming}/><span className="scenario-tag">{scenario.tag}</span></div>
      <div className="scenario-content">
        <div className="scenario-meta"><span><LightIcon type={icon}/>{controlLabel}</span><b>تجربة تعليمية</b></div>
        <h3>{scenario.title}</h3><p>{scenario.goal}</p>
        <div className="scenario-steps">{scenario.steps.map((step, i) => <div key={step}><b>{i + 1}</b><span>{step}</span></div>)}</div>
        <div className="scenario-note">{scenario.note}</div>
      </div>
    </article>
  );
}

function ScenarioSvg({ scenario, perspective, oncoming, setOncoming }: { scenario: Scenario; perspective: Perspective; oncoming: boolean; setOncoming: (value: boolean) => void }) {
  const id = 'scene_' + scenario.id + '_' + perspective;
  const night = scenario.id !== 'position' && scenario.id !== 'signals';
  const title = perspective === 'driver' ? scenario.driverTitle : scenario.externalTitle;

  if (perspective === 'driver') {
    return (
      <div className="scenario-svg-frame">
        <svg className="scenario-svg" viewBox="0 0 900 470" role="img" aria-label={title}>
          <defs>
            <linearGradient id={id + '_sky'} x1="0" y1="0" x2="0" y2="1"><stop stopColor={night ? '#031018' : '#405a53'}/><stop offset="1" stopColor={night ? '#12272f' : '#263f3a'}/></linearGradient>
            <linearGradient id={id + '_road'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#34484d"/><stop offset=".45" stopColor="#16262c"/><stop offset="1" stopColor="#060c10"/></linearGradient>
            <filter id={id + '_blur'}><feGaussianBlur stdDeviation="18"/></filter>
            <filter id={id + '_soft'}><feGaussianBlur stdDeviation="7"/></filter>
            <linearGradient id={id + '_lowBeam'} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#fff5c7" stopOpacity=".62"/>
              <stop offset=".35" stopColor="#fff1ad" stopOpacity=".28"/>
              <stop offset=".78" stopColor="#fff1ad" stopOpacity=".08"/>
              <stop offset="1" stopColor="#fff1ad" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <rect width="900" height="470" fill={'url(#' + id + '_sky)'}/>
          {scenario.id === 'position' ? (
            <>
              <circle cx="728" cy="88" r="58" fill="#edf0d6" opacity=".32"/>
              <circle cx="650" cy="105" r="24" fill="#e4eee1" opacity=".08"/>
              <rect y="278" width="900" height="192" fill="#203a38"/>
              <path d="M0 343h900" stroke="#becbc5" strokeOpacity=".14" strokeWidth="4"/>
              <rect x="94" y="252" width="7" height="92" fill="#65736f"/><rect x="799" y="252" width="7" height="92" fill="#65736f"/>
              <image href="/spirit/car-rear.svg" x="336" y="225" width="228" height="128"/>
              <ellipse cx="450" cy="300" rx="165" ry="78" fill="#e3edb7" opacity=".08"/>
              <circle cx="405" cy="293" r="11" fill="#e3edb7"/><circle cx="495" cy="293" r="11" fill="#e3edb7"/>
              <rect x="52" y="48" width="390" height="76" rx="21" fill="#172624" stroke="#dce8b0" strokeOpacity=".30"/>
              <text x="78" y="78" fill="#eef4db" fontSize="20" fontWeight="900">أضواء الموضع · غسق</text>
              <text x="78" y="102" fill="#c0c9b5" fontSize="12">الهدف: أن تُرى المركبة بوضوح، لا أن ترى الطريق بعيداً</text>
            </>
          ) : scenario.id === 'signals' ? (
            <>
              <rect width="900" height="470" fill="#1c3738"/>
              <path d="M0 296h900M450 0v470" stroke="#e7f0ed" strokeOpacity=".16" strokeWidth="9" strokeDasharray="28 18"/>
              <path d="M70 106h220v68H70M610 106h220v68H610" fill="none" stroke="#496264" strokeOpacity=".50" strokeWidth="4"/>
              <image href="/spirit/car-front.svg" x="337" y="286" width="226" height="144"/>
              <image href="/spirit/car-front.svg" x="100" y="195" width="120" height="78" opacity=".64"/>
              <path d="M450 350c0-76 68-112 156-121" fill="none" stroke="#87e5da" strokeWidth="16" strokeLinecap="round"/>
              <path d="m606 220 25 16-28 9Z" fill="#87e5da"/>
              <circle cx="511" cy="326" r="15" fill="#f4ae57"/><circle cx="511" cy="326" r="28" fill="#f4ae57" opacity=".11"/>
              <rect x="52" y="48" width="410" height="76" rx="21" fill="#061217" stroke="#86e4da" strokeOpacity=".27"/>
              <text x="78" y="78" fill="#c4f3eb" fontSize="20" fontWeight="900">تقاطع · الإشارة قبل الحركة</text>
              <text x="78" y="102" fill="#a1b4b2" fontSize="12">راقب → أشر → تموضع → نفّذ عندما يكون آمناً</text>
            </>
          ) : scenario.id === 'fog' ? (
            <>
              <path d="M0 470 212 132h476L900 470Z" fill={'url(#' + id + '_road)'}/>
              <path d="M450 136v334" stroke="#e3efee" strokeOpacity=".20" strokeWidth="4" strokeDasharray="25 18"/>
              <rect x="0" y="65" width="900" height="78" fill="#eef7f3" fillOpacity=".15"/>
              <rect x="0" y="166" width="900" height="68" fill="#eef7f3" fillOpacity=".13"/>
              <rect x="0" y="257" width="900" height="42" fill="#eef7f3" fillOpacity=".10"/>
              <g opacity=".20" fill="#ffffff"><circle cx="88" cy="115" r="22"/><circle cx="207" cy="92" r="15"/><circle cx="332" cy="166" r="19"/><circle cx="575" cy="111" r="17"/><circle cx="745" cy="169" r="22"/></g>
              <path d="M450 316 140 235M450 316 760 235" stroke="#fff7de" strokeOpacity=".20" strokeWidth="74" strokeLinecap="round" filter={'url(#' + id + '_blur)'}/>
              <path d="M450 318 270 284M450 318 630 284" stroke="#fff2b5" strokeOpacity=".40" strokeWidth="11" strokeLinecap="round"/>
              <image href="/spirit/car-front.svg" x="367" y="232" width="166" height="107"/>
              <rect x="52" y="48" width="430" height="76" rx="21" fill="#dfe9e5" fillOpacity=".09" stroke="#edf5f0" strokeOpacity=".20"/>
              <text x="78" y="78" fill="#eef7f2" fontSize="20" fontWeight="900">ضباب · الرؤية تنخفض والتشتت يرتفع</text>
              <text x="78" y="102" fill="#c5d1cf" fontSize="12">حزمة منخفضة قرب سطح الطريق + سرعة ومسافة أمان مناسبتان</text>
            </>
          ) : (
            <>
              <path d="M0 470 212 132h476L900 470Z" fill={'url(#' + id + '_road)'}/>
              <path d="M450 136v334" stroke="#e3efee" strokeOpacity=".22" strokeWidth="4" strokeDasharray="25 18"/>
              {scenario.id === 'low' && <>
                {/* LOW BEAM — driver view: right-hand traffic, opposing vehicle stays in its lane. */}
                <g aria-label="مشهد الضوء المنخفض">
                  {/* Road geometry: narrow horizon, widening toward the camera. */}
                  <path d="M0 470 245 132H655L900 470Z" fill={'url(#' + id + '_road)'}/>
                  <path d="M245 132H655" stroke="#718286" strokeOpacity=".22" strokeWidth="3"/>
                  <path d="M245 132 0 470M655 132 900 470" stroke="#91a1a2" strokeOpacity=".18" strokeWidth="5"/>
                  {/* Centre line sits left of the camera because this is the right-hand lane. */}
                  <path d="M431 140 340 470" stroke="#dfe8e5" strokeOpacity=".30" strokeWidth="4" strokeDasharray="25 20"/>
                  <path d="M286 151 36 470M614 151 864 470" stroke="#b8c5c4" strokeOpacity=".16" strokeWidth="3" strokeDasharray="18 24"/>
                  {/* Reflective roadside markers establish depth without clutter. */}
                  <g opacity=".72">
                    <rect x="205" y="180" width="5" height="55" rx="2" fill="#829294"/>
                    <circle cx="207" cy="176" r="8" fill="#d8e6df" opacity=".18"/>
                    <rect x="693" y="180" width="5" height="55" rx="2" fill="#829294"/>
                    <circle cx="695" cy="176" r="8" fill="#d8e6df" opacity=".18"/>
                    <rect x="107" y="270" width="7" height="82" rx="3" fill="#718083"/>
                    <rect x="786" y="270" width="7" height="82" rx="3" fill="#718083"/>
                  </g>

                  {/* Car ahead: rear view, same direction, in our right-hand lane. */}
                  <image href="/spirit/car-rear.svg" x="510" y="166" width="118" height="76" opacity=".92"/>
                  <ellipse cx="540" cy="219" rx="8" ry="5" fill="#ff4352" opacity=".78"/>
                  <ellipse cx="598" cy="219" rx="8" ry="5" fill="#ff4352" opacity=".78"/>

                  {/* Oncoming vehicle: front view, correctly facing the driver, in the opposing lane. */}
                  <image href="/spirit/car-front.svg" x="282" y="170" width="104" height="68" opacity=".94"/>
                  <ellipse cx="305" cy="212" rx="7" ry="5" fill="#fff6cf" opacity=".72"/>
                  <ellipse cx="363" cy="212" rx="7" ry="5" fill="#fff6cf" opacity=".72"/>

                  {/* Low-beam illumination: starts at the two headlamps and falls onto the road. */}
                  <path d="M500 374 L555 374 L614 238 L550 225 Z" fill={'url(#' + id + '_lowBeam)'} opacity=".88"/>
                  <path d="M515 374 L575 374 L632 247 L570 229 Z" fill={'url(#' + id + '_lowBeam)'} opacity=".72"/>
                  <path d="M500 374 L342 291 L430 265 L558 359 Z" fill="#fff2b1" opacity=".10" filter={'url(#' + id + '_blur)'}/>
                  <path d="M530 374 L390 292 L462 268 L582 357 Z" fill="#fff3ba" opacity=".24"/>
                  {/* The beam remains below the oncoming driver's eye line. */}
                  <path d="M272 203H397" stroke="#ef9da2" strokeOpacity=".40" strokeWidth="2" strokeDasharray="7 7"/>
                  <text x="274" y="193" fill="#ffd2d5" fontSize="11" fontWeight="800">مستوى عين السائق المقابل</text>
                  <path d="M510 360 C486 331 459 311 425 291" fill="none" stroke="#8de4da" strokeOpacity=".65" strokeWidth="2.5"/>
                  <text x="420" y="280" textAnchor="middle" fill="#bfeee8" fontSize="11" fontWeight="900">الحزمة تهبط إلى سطح الطريق</text>

                  {/* Approximate teaching distance. */}
                  <path d="M405 250V314M405 250H492M405 314H492" stroke="#86e4da" strokeOpacity=".52" strokeWidth="2"/>
                  <rect x="414" y="263" width="76" height="35" rx="17" fill="#071318" stroke="#86e4da" strokeOpacity=".25"/>
                  <text x="452" y="286" textAnchor="middle" fill="#c8f3ed" fontSize="14" fontWeight="900">≈ 30 م</text>

                  {/* Dashboard / hood framing the driver perspective. */}
                  <path d="M0 408 Q160 371 315 398 Q450 421 585 398 Q740 371 900 408V470H0Z" fill="#050b0f" opacity=".96"/>
                  <path d="M0 408 Q160 371 315 398 Q450 421 585 398 Q740 371 900 408" fill="none" stroke="#34454a" strokeWidth="3" opacity=".75"/>
                  <path d="M350 470 Q380 420 450 416 Q520 420 550 470" fill="#091117" stroke="#2b3e44" strokeWidth="3"/>
                  <circle cx="450" cy="449" r="16" fill="#101d23" stroke="#53666a" strokeWidth="3"/>
                  <circle cx="450" cy="449" r="5" fill="#86e4da" opacity=".75"/>

                  {/* Minimal educational header inside the scene. */}
                  <g>
                    <rect x="36" y="34" width="392" height="76" rx="20" fill="#061117" stroke="#86e4da" strokeOpacity=".28"/>
                    <circle cx="64" cy="62" r="8" fill="#86e4da"/>
                    <text x="84" y="68" fill="#c9f3ed" fontSize="19" fontWeight="900">LOW BEAM · الضوء المنخفض</text>
                    <text x="84" y="91" fill="#9fb6b3" fontSize="11.5">رؤية الطريق أمامك مع إبقاء الحزمة منخفضة</text>
                  </g>
                  <g>
                    <rect x="594" y="34" width="270" height="76" rx="20" fill="#201618" stroke="#ff9fa5" strokeOpacity=".28"/>
                    <text x="620" y="67" fill="#ffd8db" fontSize="16" fontWeight="900">السيارة المقابلة</text>
                    <text x="620" y="90" fill="#d2b6b9" fontSize="11">لا يصل الضوء إلى مستوى عينيها</text>
                  </g>
                </g>
              </>}
              {scenario.id === 'high' && <>
                <path d="M450 316 60 70M450 316 840 70" stroke="#fff1b1" strokeOpacity=".20" strokeWidth="106" strokeLinecap="round" filter={'url(#' + id + '_blur)'}/>
                <path d="M450 316 68 64M450 316 832 64" stroke="#fff3b7" strokeOpacity=".35" strokeWidth="12" strokeLinecap="round"/>
                <g opacity=".70"><path d="M126 275 154 140M774 275 746 140" stroke="#6b7b80" strokeOpacity=".35" strokeWidth="4"/><path d="M154 140l-18 8M746 140l18 8" stroke="#6b7b80" strokeOpacity=".35" strokeWidth="4"/></g>
                {oncoming && <g><image href="/spirit/car-front.svg" x="636" y="93" width="126" height="83" transform="rotate(180 699 134)"/><ellipse cx="699" cy="145" rx="64" ry="40" fill="#fff5ca" opacity=".16" filter={'url(#' + id + '_blur)'}/><path d="M450 316 660 172" stroke="#fff0c2" strokeOpacity=".30" strokeWidth="27" strokeLinecap="round"/><rect x="52" y="48" width="410" height="76" rx="21" fill="#2b191b" stroke="#ff9fa5" strokeOpacity=".40"/><text x="78" y="78" fill="#ffd9d8" fontSize="20" fontWeight="900">مركبة مقابلة · إبهار</text><text x="78" y="102" fill="#d9babc" fontSize="12">اخفض العالي وأعد المنخفض</text></g>}
                {!oncoming && <rect x="52" y="48" width="350" height="76" rx="21" fill="#061218" stroke="#86e4da" strokeOpacity=".26"/>}
                <g onClick={() => setOncoming(!oncoming)} cursor="pointer"><rect x="690" y="50" width="165" height="50" rx="16" fill="#071217" stroke="#fff" strokeOpacity=".12"/><text x="712" y="81" fill="#d5e4e1" fontSize="12" fontWeight="900">{oncoming ? 'إخفاء السيارة' : 'أظهر سيارة مقابلة'}</text></g>
              </>}
            </>
          )}

          <rect x="24" y="422" width="852" height="26" rx="13" fill="#02070a" opacity=".84"/>
          <text x="45" y="440" fill="#b8c7c5" fontSize="11">{title}</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="scenario-svg-frame">
      <svg className="scenario-svg" viewBox="0 0 900 470" role="img" aria-label={title}>
        <defs>
          <linearGradient id={id + '_bg'} x1="0" y1="0" x2="0" y2="1"><stop stopColor={night ? '#041019' : '#294946'}/><stop offset="1" stopColor={night ? '#0b1c23' : '#1e3532'}/></linearGradient>
          <filter id={id + '_blur'}><feGaussianBlur stdDeviation="16"/></filter>
        </defs>
        <rect width="900" height="470" fill={'url(#' + id + '_bg)'}/>
        <path d="M0 360Q225 248 450 286T900 360v110H0Z" fill="#0d2329"/>
        {scenario.id === 'low' && <>
          <image href="/spirit/car-front.svg" x="337" y="270" width="226" height="144"/>
          <path d="M450 326 128 184M450 326 772 184" stroke="#fff2b2" strokeOpacity=".13" strokeWidth="102" strokeLinecap="round" filter={'url(#' + id + '_blur)'}/>
          <path d="M450 326 120 174M450 326 780 174" stroke="#fff3b4" strokeOpacity=".30" strokeWidth="11" strokeLinecap="round"/>
          <path d="M184 178V330M716 178V330" stroke="#607175" strokeOpacity=".32" strokeWidth="4"/>
          <rect x="52" y="48" width="410" height="76" rx="21" fill="#071117" stroke="#86e4da" strokeOpacity=".28"/>
          <text x="78" y="78" fill="#c1f2eb" fontSize="20" fontWeight="900">المنخفض · الحزمة تهبط للطريق</text><text x="78" y="102" fill="#9db1b0" fontSize="12">من الخارج ترى الفرق بين ضوء مناسب للطريق وضوء يزعج المقابل</text>
        </>}
        {scenario.id === 'high' && <>
          <image href="/spirit/car-front.svg" x="337" y="270" width="226" height="144"/>
          <path d="M450 326 50 98M450 326 850 98" stroke="#fff0b2" strokeOpacity=".16" strokeWidth="110" strokeLinecap="round" filter={'url(#' + id + '_blur)'}/>
          <path d="M450 326 42 88M450 326 858 88" stroke="#fff3b5" strokeOpacity=".31" strokeWidth="12" strokeLinecap="round"/>
          {oncoming && <g><image href="/spirit/car-front.svg" x="640" y="95" width="120" height="80" transform="rotate(180 700 135)"/><ellipse cx="700" cy="145" rx="62" ry="38" fill="#fff4c9" opacity=".15" filter={'url(#' + id + '_blur)'}/><rect x="52" y="48" width="410" height="76" rx="21" fill="#281819" stroke="#f09ea4" strokeOpacity=".36"/><text x="78" y="78" fill="#ffd9d8" fontSize="20" fontWeight="900">السائق المقابل يرى إبهاراً</text><text x="78" y="102" fill="#d6babb" fontSize="12">اضغط لإخفاء المركبة ثم قارن الحزمة</text></g>}<g onClick={() => setOncoming(!oncoming)} cursor="pointer"><rect x="690" y="48" width="165" height="50" rx="16" fill="#071117" stroke="#fff" strokeOpacity=".10"/><text x="712" y="79" fill="#d5e2df" fontSize="12" fontWeight="900">{oncoming ? 'إخفاء السيارة' : 'أظهر سيارة مقابلة'}</text></g>
        </>}
        {scenario.id === 'fog' && <>
          <rect x="0" y="76" width="900" height="76" fill="#eef6f2" fillOpacity=".14"/><rect x="0" y="178" width="900" height="55" fill="#eef6f2" fillOpacity=".11"/>
          <image href="/spirit/car-front.svg" x="338" y="273" width="224" height="145"/>
          <path d="M450 326 148 382M450 326 752 382" stroke="#fff7df" strokeOpacity=".17" strokeWidth="78" strokeLinecap="round" filter={'url(#' + id + '_blur)'}/>
          <path d="M450 326 205 381M450 326 695 381" stroke="#fff2b6" strokeOpacity=".39" strokeWidth="11" strokeLinecap="round"/>
          <rect x="52" y="48" width="430" height="76" rx="21" fill="#e6efeb" fillOpacity=".08" stroke="#eef5f0" strokeOpacity=".20"/>
          <text x="78" y="78" fill="#eef7f3" fontSize="20" fontWeight="900">ضباب · قارن الضوء المرتفع والمنخفض</text><text x="78" y="102" fill="#c5d1cf" fontSize="12">الهدف: إبقاء الحزمة أقرب لسطح الطريق وتقليل التشتت في المثال</text>
        </>}
        {scenario.id === 'position' && <>
          <circle cx="730" cy="92" r="58" fill="#e7ead7" opacity=".24"/><path d="M0 304h900" stroke="#aebbb6" strokeOpacity=".15" strokeWidth="4"/>
          <image href="/spirit/car-rear.svg" x="337" y="234" width="226" height="136"/><ellipse cx="450" cy="305" rx="175" ry="78" fill="#e3edb7" opacity=".08"/>
          <circle cx="405" cy="302" r="10" fill="#dbe8af"/><circle cx="495" cy="302" r="10" fill="#dbe8af"/>
          <rect x="52" y="48" width="420" height="76" rx="21" fill="#162321" stroke="#d9e5b0" strokeOpacity=".30"/><text x="78" y="78" fill="#edf4dc" fontSize="20" fontWeight="900">غسق · أن تُرى المركبة</text><text x="78" y="102" fill="#bec8b5" fontSize="12">وضوح حدود السيارة في الإضاءة المحيطة الضعيفة</text>
        </>}
        {scenario.id === 'signals' && <>
          <path d="M0 304h900M450 0v470" stroke="#dbe8e5" strokeOpacity=".15" strokeWidth="8" strokeDasharray="28 18"/>
          <image href="/spirit/car-front.svg" x="337" y="285" width="226" height="144"/><image href="/spirit/car-front.svg" x="108" y="200" width="116" height="76" opacity=".66"/>
          <path d="M450 350c62-8 116-44 147-104" fill="none" stroke="#87e5da" strokeWidth="16" strokeLinecap="round"/><path d="m597 214 23 15-27 8Z" fill="#87e5da"/>
          <circle cx="510" cy="326" r="15" fill="#f4ae57"/><circle cx="510" cy="326" r="28" fill="#f4ae57" opacity=".10"/>
          <rect x="52" y="48" width="430" height="76" rx="21" fill="#071117" stroke="#87e5da" strokeOpacity=".26"/><text x="78" y="78" fill="#c0f3eb" fontSize="20" fontWeight="900">تقاطع · الإشارة تُرى قبل الحركة</text><text x="78" y="102" fill="#9db1b0" fontSize="12">الآخرون يحتاجون وقتاً لقراءة نيتك</text>
        </>}
        {scenario.id === 'hazard' && <>
          <path d="M0 312h900" stroke="#aab8b7" strokeOpacity=".18" strokeWidth="4"/><path d="M0 368h900" stroke="#243c43" strokeWidth="54"/>
          <image href="/spirit/car-rear.svg" x="332" y="220" width="236" height="140"/><image href="/spirit/car-front.svg" x="95" y="263" width="108" height="70" opacity=".60"/><image href="/spirit/car-front.svg" x="698" y="255" width="112" height="72" opacity=".60"/>
          <circle cx="405" cy="291" r="16" fill="#f4ae57"/><circle cx="495" cy="291" r="16" fill="#f4ae57"/><circle cx="450" cy="220" r="54" fill="#f1bd74" fillOpacity=".065" stroke="#f1bd74" strokeOpacity=".34" strokeWidth="3"/>
          <path d="m450 191 24 43h-48Z" stroke="#f1bd74" strokeWidth="4"/>
          <rect x="52" y="48" width="410" height="76" rx="21" fill="#211b13" stroke="#f1bd74" strokeOpacity=".30"/><text x="78" y="78" fill="#f4d4aa" fontSize="20" fontWeight="900">كتف الطريق · رباعي</text><text x="78" y="102" fill="#d8c1a4" fontSize="12">الإشارات الأربع تحذر القادمين من الاتجاهين</text>
        </>}
        {scenario.id === 'rear' && <>
          <path d="M0 312h900" stroke="#98aaac" strokeOpacity=".16" strokeWidth="4"/><image href="/spirit/car-rear.svg" x="332" y="215" width="236" height="142"/>
          <circle cx="405" cy="292" r="22" fill="#ff4052"/><circle cx="495" cy="292" r="22" fill="#ff4052"/>
          <circle cx="405" cy="292" r="39" fill="#ff4354" opacity=".15" filter={'url(#' + id + '_blur)'}/><circle cx="495" cy="292" r="39" fill="#ff4354" opacity=".15" filter={'url(#' + id + '_blur)'}/>
          <path d="M450 357 350 430M450 357 550 430" stroke="#f7fbf4" strokeOpacity=".43" strokeWidth="40" strokeLinecap="round"/>
          <rect x="52" y="48" width="430" height="76" rx="21" fill="#071117" stroke="#fff" strokeOpacity=".11"/><text x="78" y="78" fill="#ffe8e9" fontSize="20" fontWeight="900">الخلفية · الأحمر للفرامل والأبيض للرجوع</text><text x="78" y="102" fill="#b9c7c5" fontSize="12">وظيفتان مختلفتان تظهران بوضوح خلف السيارة</text>
        </>}
        <rect x="24" y="422" width="852" height="26" rx="13" fill="#02070a" opacity=".84"/><text x="45" y="440" fill="#b8c7c5" fontSize="11">{title}</text>
      </svg>
    </div>
  );
}

function AutomaticLights() {
  return (
    <section id="automatic" className="automatic-section">
      <div className="section-title"><div><span className="eyebrow">03 · أضواء مرتبطة بحالة السيارة</span><h2>ليست كل الإشارات من المقبض.</h2><p>بعض الأضواء تتغير عندما تتغير حالة السيارة نفسها.</p></div></div>
      <div className="automatic-grid">
        <article><div className="auto-icon red"><LightIcon type="brake"/></div><div><span>STOP</span><h3>أضواء الفرامل</h3><p>تضيء عند ضغط دواسة الفرامل، ولا تحتاج اختيارها من حلقة الإنارة.</p></div></article>
        <article><div className="auto-icon white"><LightIcon type="reverse"/></div><div><span>REVERSE</span><h3>ضوء الرجوع للخلف</h3><p>يعمل عند اختيار الرجوع في المركبة المجهزة به، ويكشف المنطقة خلف السيارة.</p></div></article>
        <article><div className="auto-icon green"><LightIcon type="sun"/></div><div><span>DRL</span><h3>أضواء النهار</h3><p>قد تعمل تلقائياً أثناء النهار في السيارات المجهزة بها.</p></div></article>
      </div>
      <div className="memory-rule"><b>قاعدة الحفظ</b><span>أحياناً أنت تغيّر حالة السيارة، والسيارة هي التي تشغّل الضوء المناسب.</span></div>
    </section>
  );
}

export default function PracticalInfo() {
  const navigate = useNavigate();
  const [mainLight, setMainLight] = useState<MainLightKey>('low');
  const [signal, setSignal] = useState<SignalKey | null>(null);
  const [movement, setMovement] = useState<'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard'>('ring');
  const [controlGroup, setControlGroup] = useState<ControlGroup>('ring');
  const [perspective, setPerspective] = useState<Perspective>('external');
  const [flashActive, setFlashActive] = useState(false);
  const [flashCount, setFlashCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [oncoming, setOncoming] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previous = {
      rootOverflowY: root.style.overflowY,
      bodyOverflowY: body.style.overflowY,
      bodyOverflowX: body.style.overflowX,
    };
    root.style.overflowY = 'auto';
    body.style.overflowY = 'auto';
    body.style.overflowX = 'hidden';
    root.classList.add('practical-info-v2-active');
    return () => {
      root.style.overflowY = previous.rootOverflowY;
      body.style.overflowY = previous.bodyOverflowY;
      body.style.overflowX = previous.bodyOverflowX;
      root.classList.remove('practical-info-v2-active');
    };
  }, []);

  useEffect(() => {
    if (!flashActive) return;
    const timer = window.setTimeout(() => {
      setFlashActive(false);
      setMovement('pull');
    }, 720);
    return () => window.clearTimeout(timer);
  }, [flashActive]);

  const playClick = (force = false) => {
    if ((!soundEnabled && !force) || typeof window === 'undefined') return;
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = audioRef.current || new AudioCtor();
      audioRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.075);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.065, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.018, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

      const tick = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tick.type = 'square';
      tick.frequency.setValueAtTime(230, now);
      tickGain.gain.setValueAtTime(0.025, now);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      tick.connect(tickGain);
      tickGain.connect(ctx.destination);
      tick.start(now);
      tick.stop(now + 0.04);
    } catch {
      // Audio is an enhancement only.
    }
  };

  const chooseMain = (key: MainLightKey) => {
    playClick();
    setMainLight(key); setSignal(null); setFlashActive(false);
    setMovement(key === 'high' ? 'push' : 'ring');
    setMobileSheetOpen(true);
    setOncoming(key === 'high');
  };
  const chooseSignal = (key: SignalKey) => {
    playClick();
    setSignal(key); setFlashActive(false); setMovement(key);
    setMobileSheetOpen(true);
  };
  const triggerFlash = () => {
    playClick();
    setSignal(null); setMovement('pull'); setFlashCount(value => value + 1); setFlashActive(true); setMobileSheetOpen(true);
  };
  const cycleRing = () => {
    const currentIndex = RING_LIGHTS.findIndex(item => item.key === mainLight);
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    chooseMain(RING_LIGHTS[(safeIndex + 1) % RING_LIGHTS.length].key);
  };
  const applyLever = (action: 'left' | 'right' | 'push' | 'pull') => {
    setControlGroup('lever');
    if (action === 'left' || action === 'right') chooseSignal(action);
    else if (action === 'push') chooseMain('high');
    else triggerFlash();
  };

  const activeLight = MAIN_LIGHTS.find(item => item.key === mainLight) || MAIN_LIGHTS[3];
  const activeSignal = SIGNAL_ITEMS.find(item => item.key === signal);
  const currentTitle = activeSignal?.title || (flashActive ? 'وميض العالي' : activeLight.title);
  const currentItem = activeSignal ? undefined : (flashActive ? undefined : activeLight);
  const cssVars = { '--lesson-offset': '0px' } as CSSProperties;

  return (
    <div className="practical-v2" dir="rtl" style={cssVars}>
      <header className="practical-header">
        <div className="practical-header-inner">
          <button type="button" className="back-button" onClick={() => navigate('/')} aria-label="العودة للرئيسية">→</button>
          <div className="brand-lockup"><span>مركز التدريب العملي</span><strong>أضواء السيارة والغمازات</strong></div>
          <div className="progress-status"><i />درس تفاعلي</div>
        </div>
      </header>

      <main className="practical-main">
        <section className="hero-lesson">
          <div className="hero-copy"><span className="eyebrow">تعلمها بصرياً · حركة ← رمز ← موقف</span><h1>افهم الضوء قبل أن تحفظ الرمز.</h1><p>اختر وظيفة، جرّب الحركة من المقبض، شاهد رمز لوحة العدادات، ثم ثبت المعلومة داخل مشهد طريق واضح. الصفحة مصممة للتعلّم الهادئ وليس للاستعراض.</p></div>
          <div className="hero-map"><span><b>01</b> حركة</span><i>→</i><span><b>02</b> رمز</span><i>→</i><span><b>03</b> موقف</span></div>
        </section>

        <section className="lesson-shell">
          <nav className="lesson-section-nav" aria-label="أقسام الدرس"><a href="#simulator">01 · المحاكي</a><a href="#scenes">02 · المشاهد</a><a href="#automatic">03 · أضواء السيارة</a></nav>

          <section id="simulator" className="simulator-section">
            <div className="section-title">
              <div><span className="eyebrow">المحاكي الأساسي</span><h2>اختر، حرّك، ثم شاهد النتيجة فوراً.</h2><p>الشرح يبقى في نفس السياق. لا يوجد نقل تلقائي بعيد عن الزر الذي ضغطته.</p></div>
              <div className="sound-control"><button type="button" onClick={() => setSoundEnabled(value => { const next = !value; if (next) playClick(true); return next; })} aria-label={soundEnabled ? 'إيقاف صوت التفاعل' : 'تشغيل واختبار صوت التفاعل'}>{soundEnabled ? '♪' : '×'}</button><span>{soundEnabled ? 'صوت التفاعل' : 'الصوت مغلق'}</span>{flashCount > 0 && <b>{flashCount}× وميض</b>}</div>
            </div>

            <div className="simulator-layout">
              <ControlPanel group={controlGroup} setGroup={setControlGroup} mainLight={mainLight} signal={signal} flashActive={flashActive} onMain={chooseMain} onSignal={chooseSignal} onFlash={triggerFlash}/>
              <CockpitHandle mainLight={mainLight} signal={signal} movement={movement} onRingCycle={cycleRing} onLever={applyLever} onHazard={() => chooseSignal('hazard')}/>
            </div>

            <div className="result-heading"><span>03</span><div><b>شاهد الأثر على السيارة</b><small>بدّل بين منظور السائق والمنظور الخارجي داخل نفس القسم.</small></div></div>

            <section className="vehicle-lab">
              <div className="vehicle-lab-head">
                <div><span className="eyebrow">النتيجة التعليمية</span><h3>{currentTitle}</h3><p>{perspective === 'driver' ? 'ماذا ترى من مكان السائق؟' : 'ماذا ترى السيارات الأخرى؟'}</p></div>
                <div className="view-switch"><button type="button" className={perspective === 'driver' ? 'active' : ''} onClick={() => setPerspective('driver')}>منظور السائق</button><button type="button" className={perspective === 'external' ? 'active' : ''} onClick={() => setPerspective('external')}>منظور خارجي</button></div>
              </div>
              {perspective === 'external' && mainLight === 'high' && <button type="button" className="inline-scene-control" onClick={() => setOncoming(!oncoming)}>{oncoming ? 'السيارة المقابلة ظاهرة' : 'أظهر سيارة مقابلة'}</button>}
              <CurrentScene mainLight={mainLight} signal={signal} flashActive={flashActive} perspective={perspective} oncoming={oncoming} setOncoming={setOncoming}/>
            </section>

            <div className="safety-note"><b>مهم</b><span>المقبض الفعلي وترتيب الوظائف يختلفان بحسب الشركة والموديل. هذه الصفحة تشرح الفكرة الشائعة للتدريب ولا تستبدل دليل سيارة محددة.</span></div>
          </section>

          {mobileSheetOpen && <div className="mobile-explanation" role="dialog" aria-label="شرح الوظيفة المختارة"><button type="button" aria-label="إغلاق الشرح" onClick={() => setMobileSheetOpen(false)}>×</button><ExplanationCard title={currentTitle} item={currentItem} signal={activeSignal}/></div>}

          <section id="scenes" className="scenes-section">
            <div className="section-title scenes-title"><div><span className="eyebrow">المشاهد التدريبية</span><h2>موقف واحد يثبت المعلومة.</h2><p>كل مشهد متاح من منظور السائق ومن الخارج. على مشهد العالي يمكنك إظهار مركبة مقابلة لرؤية فكرة الإبهار.</p></div><div className="perspective-switch"><button type="button" className={perspective === 'driver' ? 'active' : ''} onClick={() => setPerspective('driver')}>السائق</button><button type="button" className={perspective === 'external' ? 'active' : ''} onClick={() => setPerspective('external')}>خارجي</button></div></div>
            <div className="scenario-grid">{SCENARIOS.map(scenario => <ScenarioVisual key={scenario.id} scenario={scenario} perspective={perspective}/>)}</div>
          </section>

          <AutomaticLights/>
        </section>

        <footer className="page-footer-note"><b>تذكّر</b><span>الأيقونة تساعدك على الحفظ، لكن دليل السيارة وقواعد الطريق هما المرجع عند قيادة مركبة محددة.</span></footer>
      </main>
    </div>
  );
}
