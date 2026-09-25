import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const dragRef = useRef<{ zone: 'ring' | 'lever'; x: number; y: number } | null>(null);
  const suppressClick = useRef<'ring' | 'lever' | null>(null);

  const ringIndex = Math.max(0, RING_LIGHTS.findIndex(item => item.key === mainLight));
  const ringAngle = movement === 'ring' ? -2 : 0;
  const currentLabel =
    signal === 'left' ? 'غماز يسار' :
    signal === 'right' ? 'غماز يمين' :
    signal === 'hazard' ? 'تحذير رباعي' :
    MAIN_LIGHTS.find(item => item.key === mainLight)?.title || 'الإنارة';

  const ringSymbols = RING_LIGHTS.map((item, index) => {
    const angle = (index * 34) - (ringIndex * 34);
    const rad = angle * Math.PI / 180;
    const scaleY = Math.max(0.28, Math.cos(rad));
    const y = 216 + 48 * Math.sin(rad);
    const opacity = Math.max(0.22, 0.28 + 0.72 * Math.pow(scaleY, 1.4));
    const isActive = index === ringIndex;
    return (
      <g key={item.key} className="handle-ring-mark" transform={'translate(220 ' + y + ') scale(1 ' + scaleY + ')'} opacity={opacity}>
        <g transform="translate(2 2)" color="#000" opacity=".34">
          <RingSymbol type={item.key} active={false} />
        </g>
        <g transform="translate(-15 -15) scale(.70)" color={isActive ? '#f2fffc' : '#c5d1d3'} opacity={isActive ? 1 : .86}>
          <RingSymbol type={item.key} active={isActive} />
        </g>
      </g>
    );
  });

  const ringGrooves = Array.from({ length: 15 }, (_, i) => {
    const y = 164 + i * 7.1;
    return <line key={i} x1="168" x2="272" y1={y} y2={y} stroke="#000" strokeOpacity={i % 3 === 0 ? '.28' : '.14'} strokeWidth={i % 3 === 0 ? '1.5' : '1'} />;
  });

  const fogSymbols = [
    { key: 'frontFog' as const, y: 203, active: mainLight === 'frontFog' },
    { key: 'rearFog' as const, y: 229, active: mainLight === 'rearFog' },
  ];

  const beginDrag = (zone: 'ring' | 'lever', e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { zone, x: e.clientX, y: e.clientY };
    suppressClick.current = null;
  };

  const moveDrag = (zone: 'ring' | 'lever', e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.zone !== zone) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

    suppressClick.current = zone;
    dragRef.current = null;

    if (zone === 'ring') {
      onRingCycle();
      return;
    }

    if (Math.abs(dy) >= Math.abs(dx)) {
      onLever(dy < 0 ? 'right' : 'left');
    } else {
      onLever(dx > 0 ? 'push' : 'pull');
    }
  };

  const endDrag = () => { dragRef.current = null; };

  const clickRing = () => {
    if (suppressClick.current === 'ring') {
      suppressClick.current = null;
      return;
    }
    onRingCycle();
  };

  const clickLever = () => {
    if (suppressClick.current === 'lever') {
      suppressClick.current = null;
      return;
    }
    onLever(signal === 'right' ? 'left' : 'right');
  };

  const leverTransform =
    movement === 'right' ? 'translate(0 -10) rotate(-3 636 216)' :
    movement === 'left' ? 'translate(0 10) rotate(3 636 216)' :
    movement === 'push' ? 'translate(17 -5) rotate(-1 636 216)' :
    movement === 'pull' ? 'translate(-17 5) rotate(1 636 216)' :
    'translate(0 0)';

  const u = (name: string) => 'url(#' + uid + name + ')';

  return (
    <section className="handle-card">
      <div className="handle-header">
        <div>
          <span className="eyebrow">02 · المقبض التفاعلي</span>
          <h3>تعلّم المقبض بيدك</h3>
          <p>المس الحلقة لتغيير الإنارة، واسحب الذراع ↑↓ للغماز أو ↔ للعالي والوميض. لا توجد مناطق تحكم منفصلة فوق الرسم.</p>
        </div>
        <div className="handle-state"><span>الوضع الحالي</span><strong>{currentLabel}</strong></div>
      </div>

      <div className="handle-stage">
        <svg viewBox="0 0 720 420" className="handle-svg" role="img" aria-label="مقبض أضواء وغمازات واقعي مبسط مع مناطق لمس مباشرة">
          <defs>
            <radialGradient id={uid + 'bg'} cx=".46" cy=".42" r=".78">
              <stop offset="0" stopColor="#193b45" />
              <stop offset=".42" stopColor="#0b222b" />
              <stop offset="1" stopColor="#03080b" />
            </radialGradient>
            <linearGradient id={uid + 'housing'} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4a5961" />
              <stop offset=".16" stopColor="#28363e" />
              <stop offset=".55" stopColor="#111c22" />
              <stop offset="1" stopColor="#05090c" />
            </linearGradient>
            <linearGradient id={uid + 'shaft'} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#aebdc2" />
              <stop offset=".12" stopColor="#6d7e87" />
              <stop offset=".32" stopColor="#35454e" />
              <stop offset=".68" stopColor="#172228" />
              <stop offset="1" stopColor="#090f13" />
            </linearGradient>
            <linearGradient id={uid + 'ring'} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#98a7ac" />
              <stop offset=".10" stopColor="#66777f" />
              <stop offset=".28" stopColor="#3c4c55" />
              <stop offset=".58" stopColor="#202c32" />
              <stop offset=".82" stopColor="#0f171b" />
              <stop offset="1" stopColor="#060a0d" />
            </linearGradient>
            <linearGradient id={uid + 'fog'} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8b9ba1" />
              <stop offset=".2" stopColor="#55666e" />
              <stop offset=".52" stopColor="#27353c" />
              <stop offset="1" stopColor="#0a1014" />
            </linearGradient>
            <linearGradient id={uid + 'rubber'} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b6a72" />
              <stop offset=".18" stopColor="#35434a" />
              <stop offset=".50" stopColor="#1b272d" />
              <stop offset="1" stopColor="#080d11" />
            </linearGradient>
            <linearGradient id={uid + 'chrome'} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6f8189" />
              <stop offset=".45" stopColor="#f4f8f9" />
              <stop offset="1" stopColor="#7d8f96" />
            </linearGradient>
            <radialGradient id={uid + 'glow'}>
              <stop offset="0" stopColor="#74e7d4" stopOpacity=".28" />
              <stop offset="1" stopColor="#74e7d4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={uid + 'hazardGlow'}>
              <stop offset="0" stopColor="#ff5d63" stopOpacity=".96" />
              <stop offset="1" stopColor="#ff5d63" stopOpacity="0" />
            </radialGradient>
            <filter id={uid + 'shadow'} x="-25%" y="-45%" width="160%" height="190%">
              <feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#000" floodOpacity=".68" />
            </filter>
            <filter id={uid + 'soft'} x="-30%" y="-50%" width="160%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <clipPath id={uid + 'ringClip'}>
              <rect x="151" y="154" width="133" height="124" rx="30" />
            </clipPath>
            <clipPath id={uid + 'fogClip'}>
              <rect x="283" y="176" width="46" height="80" rx="14" />
            </clipPath>
          </defs>

          <rect width="720" height="420" rx="26" fill={u('bg')} />

          {/* cockpit / steering column context */}
          <path d="M-40 373Q170 322 365 346t395 58v50H-40Z" fill="#04090c" opacity=".96" />
          <path d="M520 60Q608 30 699 62" stroke="#e8f9f6" strokeOpacity=".045" strokeWidth="28" strokeLinecap="round" />
          <ellipse cx="360" cy="335" rx="310" ry="30" fill="#000" opacity=".33" filter={u('soft')} />

          {/* fixed steering column housing */}
          <g>
            <path d="M590 75Q592 56 610 52H686Q704 56 705 74V350Q701 369 684 372H610Q593 368 590 350Z" fill={u('housing')} stroke="#010507" strokeWidth="3" />
            <path d="M605 75H690" stroke="#fff" strokeOpacity=".10" strokeWidth="3" strokeLinecap="round" />
            <path d="M602 132H694M602 302H694" stroke="#000" strokeOpacity=".34" strokeWidth="4" />
            <rect x="615" y="108" width="50" height="204" rx="24" fill="#060b0e" stroke="#fff" strokeOpacity=".04" />
            <path d="M625 132V290" stroke="#9fb0b5" strokeOpacity=".08" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* rigid stalk: only this group moves, not the ring independently */}
          <g className="handle-lever-body" transform={leverTransform} filter={u('shadow')}>
            <path d="M609 190L329 195Q318 196 309 207L309 225Q318 236 330 237L609 242Z" fill="#05090d" opacity=".78" />
            <path d="M611 194L334 199Q324 200 316 209L316 222Q324 232 335 233L611 238Z" fill={u('shaft')} stroke="#04080b" strokeWidth="2" />
            <path d="M600 198L340 203" stroke="#fff" strokeOpacity=".24" strokeWidth="3" strokeLinecap="round" />
            <path d="M552 207V228M514 208V228M476 209V228M438 210V227" stroke="#000" strokeOpacity=".24" strokeWidth="2" strokeLinecap="round" />

            {/* fog ring / secondary collar */}
            <g opacity={signal === null ? .98 : .72}>
              <rect x="283" y="176" width="46" height="80" rx="14" fill={u('fog')} stroke="#03070a" strokeWidth="2.5" />
              <g clipPath={u('fogClip')}>
                <path d="M286 185H326M286 247H326" stroke="#fff" strokeOpacity=".07" strokeWidth="3" />
                <path d="M286 195H326M286 204H326M286 213H326M286 222H326M286 231H326" stroke="#000" strokeOpacity=".18" strokeWidth="1.3" />
                {fogSymbols.map((item) => (
                  <g key={item.key} transform={'translate(306 ' + item.y + ') scale(.45)'} color={item.active ? '#f0fffb' : '#bcc8ca'} opacity={item.active ? 1 : .52}>
                    <RingSymbol type={item.key} active={item.active} />
                  </g>
                ))}
              </g>
            </g>

            {/* main lighting ring */}
            <g className={movement === 'ring' ? 'handle-ring-face is-moving' : 'handle-ring-face'} opacity={signal === null ? 1 : .62} transform={'rotate(' + ringAngle + ' 218 216)'}>
              <rect x="151" y="154" width="133" height="124" rx="30" fill={u('ring')} stroke="#020609" strokeWidth="4" />
              <g clipPath={u('ringClip')}>
                {ringGrooves}
                <rect x="153" y="156" width="129" height="20" fill="#fff" opacity=".055" />
                <rect x="153" y="252" width="129" height="25" fill="#000" opacity=".22" />
                {ringSymbols}
              </g>
              <ellipse cx="152" cy="216" rx="13" ry="60" fill="#26343b" stroke="#000" strokeOpacity=".6" strokeWidth="2" />
              <ellipse cx="148" cy="205" rx="4" ry="22" fill="#fff" opacity=".11" />
              <rect x="273" y="160" width="7" height="112" rx="3.5" fill={u('chrome')} opacity=".9" />
            </g>

            {/* tactile end cap */}
            <path d="M124 192Q115 201 115 216T124 240L151 247V185Z" fill={u('rubber')} stroke="#000" strokeOpacity=".72" strokeWidth="2.5" />
            <path d="M121 201Q118 216 121 232" stroke="#f4fbfb" strokeOpacity=".10" strokeWidth="4" strokeLinecap="round" />
            <path d="M133 194V238M142 192V241" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          </g>

          {/* fixed selector pointer */}
          <g>
            <rect x="278" y="181" width="13" height="70" rx="6" fill="#05090d" stroke="#000" strokeOpacity=".72" />
            <path d="M284.5 216L275 210V222Z" fill="#f4fffc" />
            <path d="M286 201V231" stroke="#7fe6d5" strokeOpacity=".8" strokeWidth="2" />
            <circle cx="286" cy="183" r="5" fill="#73e5d2" opacity=".20" />
          </g>

          {/* separate hazard switch */}
          <g>
            <circle cx="651" cy="54" r="40" fill={u('hazardGlow')} opacity={signal === 'hazard' ? 1 : 0} filter={u('soft')} />
            <rect x="613" y="22" width="76" height="62" rx="16" fill="#2c3940" stroke="#05090c" strokeWidth="2.5" />
            <rect x="621" y="30" width="60" height="46" rx="12" fill="#090f13" stroke="#fff" strokeOpacity=".08" />
            <g transform="translate(651 53)" className={signal === 'hazard' ? 'pl-blink' : undefined}>
              <path d="M0 -15 13 11H-13Z" fill="none" stroke={signal === 'hazard' ? '#ff777b' : '#cb555b'} strokeWidth="3" strokeLinejoin="round"/>
              <path d="M0 -7V1M0 6V7" stroke={signal === 'hazard' ? '#ff777b' : '#cb555b'} strokeWidth="3" strokeLinecap="round"/>
            </g>
            <circle cx="651" cy="91" r="4" fill={signal === 'hazard' ? '#ff696f' : '#4a3135'} />
          </g>

          <text x="363" y="382" fill="#9cb2b3" fontSize="12" fontWeight="700">اسحب القطعة نفسها — الحلقة والدراع يتحركان بشكل مستقل</text>
        </svg>

        <button
          type="button"
          className="handle-hotspot ring-zone"
          onPointerDown={e => beginDrag('ring', e)}
          onPointerMove={e => moveDrag('ring', e)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={clickRing}
          aria-label="تدوير حلقة الإنارة"
        />
        <button
          type="button"
          className="handle-hotspot lever-zone"
          onPointerDown={e => beginDrag('lever', e)}
          onPointerMove={e => moveDrag('lever', e)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={clickLever}
          aria-label="تحريك ذراع الغمازات والضوء العالي"
        />
        <button type="button" className="handle-hotspot hazard-zone" onClick={onHazard} aria-label="تشغيل التحذير الرباعي" />
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
  const isRear = signal !== null || mainLight === 'position' || mainLight === 'rearFog';
  const beamMode = flashActive ? 'flash' : mainLight;
  const title =
    mode === 'low' ? 'الضوء المنخفض' :
    mode === 'high' ? 'الضوء العالي' :
    mode === 'frontFog' ? 'ضباب أمامي' :
    mode === 'rearFog' ? 'ضباب خلفي' :
    mode === 'position' ? 'أضواء الموضع' :
    mode === 'hazard' ? 'التحذير الرباعي' :
    mode === 'signal' ? (signal === 'left' ? 'غماز يسار' : 'غماز يمين') :
    'وميض العالي';

  const note =
    mode === 'low' ? 'حزمة منخفضة ومركزة قرب سطح الطريق.' :
    mode === 'high' ? (oncoming ? 'ظهرت مركبة مقابلة — اخفض العالي.' : 'حزمة أطول وأقوى على الطريق المظلم.') :
    mode === 'frontFog' ? 'إضاءة منخفضة وقريبة من سطح الطريق في الضباب.' :
    mode === 'rearFog' ? 'ضوء خلفي قوي لزيادة وضوح المركبة.' :
    mode === 'position' ? 'الهدف أن تُرى المركبة في الإضاءة المحيطة الضعيفة.' :
    mode === 'hazard' ? 'الجهتان تومضان معاً لإظهار المركبة بوضوح.' :
    mode === 'signal' ? 'الإشارة تظهر على جهة المناورة فقط.' :
    'وميض سريع من الضوء العالي.';

  const leftSignal = signal === 'left' || signal === 'hazard';
  const rightSignal = signal === 'right' || signal === 'hazard';
  const frontLighting = !isRear && ['low', 'high', 'flash', 'frontFog'].includes(mode);

  return (
    <div className={'result-scene-wrap vehicle-effect-box mode-' + mode + ' ' + (perspective === 'driver' ? 'view-driver' : 'view-external')}>
      <div className="effect-box-topbar">
        <div className="effect-title">
          <span className="effect-kicker">شاهد الأثر</span>
          <strong>{title}</strong>
        </div>
        <div className="effect-live"><i /> مباشر</div>
      </div>

      {perspective === 'external' ? (
        <div className="vehicle-showcase" aria-label="مشهد خارجي يوضح أثر الإنارة على السيارة">
          <div className="showcase-sky">
            <span className="sky-light s1" />
            <span className="sky-light s2" />
            <span className="sky-light s3" />
          </div>
          <div className="showcase-road">
            <span className="road-lane lane-left" />
            <span className="road-lane lane-center" />
            <span className="road-lane lane-right" />
          </div>

          {frontLighting && (
            <div className={'showcase-beams beam-' + beamMode} aria-hidden="true">
              <span className="showcase-beam left" />
              <span className="showcase-beam right" />
              <span className="beam-hotspot left" />
              <span className="beam-hotspot right" />
            </div>
          )}

          <div className={'showcase-car ' + (isRear ? 'rear' : 'front')}>
            <span className="car-shadow" />
            <img
              src={isRear ? '/spirit/car-rear-realistic.svg' : '/spirit/car-front-realistic.svg'}
              className="showcase-car-image"
              alt=""
              aria-hidden="true"
            />


            {isRear && (
              <>
                <span className={'lamp rear left ' + (leftSignal ? 'amber' : '')} />
                <span className={'lamp rear right ' + (rightSignal ? 'amber' : '')} />
                <span className="lamp rear-core" />
                {mainLight === 'position' && <>
                  <span className="position-light left" />
                  <span className="position-light right" />
                </>}
              </>
            )}
          </div>

          {mainLight === 'high' && oncoming && (
            <div className="showcase-oncoming">
              <span className="oncoming-light left" />
              <span className="oncoming-light right" />
              <img src="/spirit/car-front-realistic.svg" alt="" aria-hidden="true" />
            </div>
          )}

          <div className="effect-callout callout-left">
            <span className="callout-line" />
            <div>
              <small>{isRear ? 'الأضواء الخلفية' : 'المصابيح الأمامية'}</small>
              <strong>{mode === 'signal' || mode === 'hazard' ? 'وميض اتجاهي' : mode === 'rearFog' ? 'ضوء ضباب قوي' : mode === 'position' ? 'إضاءة موضع' : 'مصدر الأثر'}</strong>
            </div>
          </div>

          {mode === 'high' && oncoming ? (
            <div className="effect-callout callout-right warning">
              <span className="callout-line" />
              <div>
                <small>تنبيه</small>
                <strong>مركبة مقابلة</strong>
              </div>
            </div>
          ) : (
            <div className="effect-callout callout-right">
              <span className="callout-line" />
              <div>
                <small>الأثر على الطريق</small>
                <strong>{mode === 'low' ? 'مدى قريب' : mode === 'high' ? 'مدى بعيد' : mode === 'frontFog' ? 'قريب من السطح' : 'واضح ومباشر'}</strong>
              </div>
            </div>
          )}

          {mode === 'low' && <div className="range-pill">≈ 30 م · حزمة منخفضة</div>}
          {mode === 'high' && !oncoming && <div className="range-pill high">مدى بعيد</div>}
          {mode === 'position' && <div className="range-pill position">الهدف: أن تُرى السيارة</div>}
          {mode === 'frontFog' && <div className="range-pill fog">حزمة قريبة من سطح الطريق</div>}
          {mode === 'rearFog' && <div className="range-pill rear">ضباب خلفي</div>}
        </div>
      ) : (
        <div className="vehicle-showcase" aria-label="مشهد خارجي يوضح أثر الإنارة على السيارة">
          <div className="showcase-sky">
            <span className="sky-light s1" />
            <span className="sky-light s2" />
            <span className="sky-light s3" />
          </div>
          <div className="showcase-road">
            <span className="road-lane lane-left" />
            <span className="road-lane lane-center" />
            <span className="road-lane lane-right" />
          </div>
          {frontLighting && (
            <div className={'showcase-beams beam-' + beamMode} aria-hidden="true">
              <span className="showcase-beam left" />
              <span className="showcase-beam right" />
              <span className="beam-hotspot left" />
              <span className="beam-hotspot right" />
            </div>
          )}
          <div className={'showcase-car ' + (isRear ? 'rear' : 'front')}>
            <span className="car-shadow" />
            <img
              src={isRear ? '/spirit/car-rear-realistic.svg' : '/spirit/car-front-realistic.svg'}
              className="showcase-car-image"
              alt=""
              aria-hidden="true"
            />
            {isRear && (
              <>
                <span className={'lamp rear left ' + (leftSignal ? 'amber' : '')} />
                <span className={'lamp rear right ' + (rightSignal ? 'amber' : '')} />
                {mainLight === 'position' && <>
                  <span className="position-light left" />
                  <span className="position-light right" />
                </>}
              </>
            )}
          </div>
          {mainLight === 'high' && oncoming && (
            <div className="showcase-oncoming">
              <span className="oncoming-light left" />
              <span className="oncoming-light right" />
              <img src="/spirit/car-front-realistic.svg" alt="" aria-hidden="true" />
            </div>
          )}
          <div className="driver-note">{note}</div>
          {mode === 'high' && (
            <button type="button" className="driver-oncoming-toggle" onClick={() => setOncoming(!oncoming)}>
              {oncoming ? 'إخفاء المركبة المقابلة' : 'إظهار مركبة مقابلة'}
            </button>
          )}
        </div>
      )}

      {perspective === 'external' && (
        <div className="effect-box-bottombar">
          <span>{note}</span>
          {mainLight === 'high' && (
            <button type="button" className="showcase-toggle" onClick={() => setOncoming(!oncoming)}>
              <i className={oncoming ? 'active' : ''} />
              {oncoming ? 'المركبة المقابلة ظاهرة' : 'إظهار مركبة مقابلة'}
            </button>
          )}
        </div>
      )}
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

function ScenarioSvg({
  scenario,
  perspective,
  oncoming,
  setOncoming,
}: {
  scenario: Scenario;
  perspective: Perspective;
  oncoming: boolean;
  setOncoming: (value: boolean) => void;
}) {
  const isRear = ['position', 'hazard', 'rear'].includes(scenario.id);
  const isSignal = scenario.id === 'signals';
  const isFog = scenario.id === 'fog';
  const isHigh = scenario.id === 'high';
  const showOncoming = isHigh && oncoming;

  const sceneClass = [
    'scenario-pro-scene',
    'scenario-' + scenario.id,
    perspective === 'driver' ? 'perspective-driver' : 'perspective-external',
    showOncoming ? 'has-oncoming' : '',
  ].filter(Boolean).join(' ');

  const driverLabel = scenario.externalTitle;

  const lightState =
    scenario.id === 'low' ? 'LOW' :
    scenario.id === 'high' ? (showOncoming ? 'LOW' : 'HIGH') :
    scenario.id === 'fog' ? 'FOG' :
    scenario.id === 'position' ? 'POSITION' :
    scenario.id === 'signals' ? 'TURN' :
    scenario.id === 'hazard' ? 'HAZARD' :
    'BRAKE / REVERSE';

  return (
    <div className={sceneClass} role="img" aria-label={driverLabel}>
      <div className="scenario-pro-sky" />
      <div className="scenario-pro-horizon">
        <span className="horizon-glow" />
        <span className="horizon-line" />
      </div>

      <div className="scenario-pro-road">
        <span className="road-edge edge-left" />
        <span className="road-edge edge-right" />
        <span className="road-center">
          <i /><i /><i /><i />
        </span>
        <span className="road-lane-line lane-left" />
        <span className="road-lane-line lane-right" />
        {scenario.id === 'hazard' && <span className="shoulder-line" />}
        {scenario.id === 'signals' && (
          <span className="intersection-lines">
            <i /><i /><i />
          </span>
        )}
      </div>

      {perspective === 'driver' && (
        <div className="scenario-pro-windshield">
          <span className="windshield-glow" />
          <span className="windshield-post left" />
          <span className="windshield-post right" />
        </div>
      )}

      {perspective === 'external' && (
        <div className="scenario-pro-vehicle-wrap">
          <span className="scenario-pro-car-shadow" />
          <img
            src={isRear ? '/spirit/car-rear-realistic.svg' : '/spirit/car-front-realistic.svg'}
            className="scenario-pro-car"
            alt=""
            aria-hidden="true"
          />


          {isRear && (
            <>
              <span className="scenario-pro-lamp rear-lamp left" />
              <span className="scenario-pro-lamp rear-lamp right" />
              {scenario.id === 'rear' && (
                <>
                  <span className="scenario-pro-reverse-lamp left" />
                  <span className="scenario-pro-reverse-lamp right" />
                </>
              )}
              {(scenario.id === 'position') && (
                <>
                  <span className="scenario-pro-position-lamp left" />
                  <span className="scenario-pro-position-lamp right" />
                </>
              )}
            </>
          )}
        </div>
      )}

      {(scenario.id === 'low' || scenario.id === 'high' || scenario.id === 'fog') && (
        <div className={'scenario-pro-beams beam-' + lightState.toLowerCase()}>
          <span className="scenario-pro-beam left" />
          <span className="scenario-pro-beam right" />
          <span className="scenario-pro-beam-core left" />
          <span className="scenario-pro-beam-core right" />
        </div>
      )}

      {scenario.id === 'fog' && (
        <div className="scenario-pro-fog">
          <span /><span /><span /><span />
        </div>
      )}

      {scenario.id === 'signals' && (
        <>
          <div className="scenario-pro-turn-arrow">
            <span />
          </div>
          <div className="scenario-pro-other-car other-left">
            <img src="/spirit/car-front-realistic.svg" alt="" aria-hidden="true" />
          </div>
          <div className="scenario-pro-other-car other-right">
            <img src="/spirit/car-front-realistic.svg" alt="" aria-hidden="true" />
          </div>
        </>
      )}

      {scenario.id === 'hazard' && (
        <>
          <div className="scenario-pro-shoulder-stop">
            <span>كتف الطريق</span>
          </div>
          <div className="scenario-pro-hazard-icon">△</div>
        </>
      )}

      {scenario.id === 'position' && (
        <div className="scenario-pro-position-atmosphere" />
      )}

      {showOncoming && (
        <div className="scenario-pro-oncoming">
          <img src="/spirit/car-front-realistic.svg" alt="" aria-hidden="true" />
          <span className="oncoming-lamp left" />
          <span className="oncoming-lamp right" />
        </div>
      )}

      <div className="scenario-pro-top-label">
        <span>{lightState}</span>
        <b>{scenario.tag}</b>
      </div>

      {scenario.id === 'low' && (
        <div className="scenario-pro-distance"><strong>≈ 30 m</strong><span>مدى تعليمي للحزمة المنخفضة</span></div>
      )}

      {scenario.id === 'high' && (
        <button type="button" className={'scenario-pro-action ' + (showOncoming ? 'active' : '')} onClick={() => setOncoming(!oncoming)}>
          {showOncoming ? 'إخفاء المركبة المقابلة' : 'إظهار مركبة مقابلة'}
        </button>
      )}

      <div className="scenario-pro-caption">
        <div className="scenario-pro-caption-dot" />
        <div>
          <b>{scenario.title}</b>
          <span>{scenario.goal}</span>
        </div>
      </div>

      {scenario.id === 'rear' && (
        <div className="scenario-pro-rear-legend">
          <span><i className="red" /> فرامل = أحمر</span>
          <span><i className="white" /> رجوع = أبيض</span>
        </div>
      )}

      {scenario.id === 'position' && (
        <div className="scenario-pro-position-pill">الهدف: أن تُرى المركبة</div>
      )}

      <div className="scenario-pro-camera">
        <span />
        {perspective === 'driver' ? 'منظور السائق' : 'من الخارج'}
      </div>
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
    if (key === 'hazard' && signal === 'hazard') {
      setSignal(null);
      setFlashActive(false);
      setMovement('ring');
      setMobileSheetOpen(true);
      return;
    }
    setSignal(key);
    setFlashActive(false);
    setMovement(key);
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
