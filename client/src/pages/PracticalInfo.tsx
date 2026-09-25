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
  const rearView = signal !== null || mainLight === 'position' || mainLight === 'rearFog';
  const beamMode = flashActive ? 'flash' : mainLight;
  const sceneTitle =
    mode === 'low' ? 'الضوء المنخفض' :
    mode === 'high' ? 'الضوء العالي' :
    mode === 'frontFog' ? 'ضباب أمامي' :
    mode === 'rearFog' ? 'ضباب خلفي' :
    mode === 'position' ? 'أضواء الموضع' :
    mode === 'signal' ? (signal === 'left' ? 'غماز يسار' : 'غماز يمين') :
    mode === 'hazard' ? 'التحذير الرباعي' :
    'وميض العالي';

  const sceneNote =
    mode === 'low' ? 'الحزمة قريبة من سطح الطريق، والضوء يخرج من المصابيح الأمامية.' :
    mode === 'high' ? (oncoming ? 'مركبة مقابلة ظهرت — هذه اللحظة يجب أن تعود فيها للمنخفض.' : 'الحزمة أطول وأقوى على الطريق المظلم.') :
    mode === 'frontFog' ? 'الضوء يبقى منخفضاً وقريباً من سطح الطريق أثناء الضباب.' :
    mode === 'rearFog' ? 'ضوء خلفي قوي يجعل السيارة أوضح لمن خلفها.' :
    mode === 'position' ? 'الإضاءة هنا هدفها أن تُرى السيارة، لا أن تنير الطريق بعيداً.' :
    mode === 'hazard' ? 'الجهتان تومضان معاً لتوضيح وجود السيارة.' :
    mode === 'signal' ? 'الأثر يظهر على جهة الانعطاف فقط.' :
    'وميض سريع من الضوء العالي.';

  const frontBeam = !rearView && (mode === 'low' || mode === 'high' || mode === 'flash' || mode === 'frontFog');
  const turnLeft = signal === 'left' || signal === 'hazard';
  const turnRight = signal === 'right' || signal === 'hazard';

  return (
    <div className={'result-scene-wrap effect-scene ' + (perspective === 'driver' ? 'perspective-driver' : 'perspective-external') + ' mode-' + mode}>
      {perspective === 'driver' ? (
        <div className="driver-effect-stage" aria-label="منظور السائق من أثر الإنارة">
          <div className="effect-sky" />
          <div className="effect-horizon">
            <span className="horizon-light h1" />
            <span className="horizon-light h2" />
            <span className="horizon-light h3" />
          </div>
          <div className="driver-road">
            <span className="road-edge left" />
            <span className="road-edge right" />
            <span className="road-center" />
            {frontBeam && (
              <>
                <span className={'driver-beam beam-left ' + beamMode} />
                <span className={'driver-beam beam-right ' + beamMode} />
              </>
            )}
            {mode === 'high' && oncoming && (
              <div className="driver-oncoming">
                <span className="oncoming-glow" />
                <img src="/spirit/car-front.svg" alt="" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="driver-dashboard-edge" />
          <div className="effect-scene-hud">
            <div className="effect-hud-title"><span className="hud-dot" />{sceneTitle}</div>
            <span className="effect-hud-perspective">منظور السائق</span>
          </div>
          <div className="effect-scene-note">{sceneNote}</div>
        </div>
      ) : (
        <div className="external-vehicle-stage vehicle-effect-stage">
          <div className="effect-stage-header">
            <div>
              <span>الأثر على السيارة</span>
              <strong>{sceneTitle}</strong>
            </div>
            <span className="effect-stage-status"><i /> مباشر</span>
          </div>

          <div className="effect-world">
            <div className="world-glow" />
            <div className="world-horizon-line" />
            <div className="world-road" />
            <span className="world-road-line line-a" />
            <span className="world-road-line line-b" />

            {frontBeam && (
              <div className={'vehicle-beams beams-' + beamMode} aria-hidden="true">
                <span className="vehicle-beam beam-left" />
                <span className="vehicle-beam beam-right" />
              </div>
            )}

            {mainLight === 'high' && oncoming && (
              <div className="effect-oncoming-vehicle" aria-hidden="true">
                <span className="oncoming-headglow left" />
                <span className="oncoming-headglow right" />
                <img src="/spirit/car-front.svg" alt="" />
              </div>
            )}

            <div className={'vehicle-focus ' + (rearView ? 'rear' : 'front')}>
              <img
                src={rearView ? '/spirit/car-rear.svg' : '/spirit/car-front.svg'}
                className="external-car"
                alt=""
                aria-hidden="true"
              />

              {!rearView && (
                <>
                  <span className="car-lamp front-lamp left" />
                  <span className="car-lamp front-lamp right" />
                  {(mode === 'frontFog') && (
                    <>
                      <span className="car-lamp fog-lamp left" />
                      <span className="car-lamp fog-lamp right" />
                    </>
                  )}
                </>
              )}

              {rearView && (
                <>
                  <span className={'car-lamp rear-lamp left ' + (turnLeft ? 'amber' : '')} />
                  <span className={'car-lamp rear-lamp right ' + (turnRight ? 'amber' : '')} />
                  {mainLight === 'rearFog' && <span className="rear-fog-core" />}
                  {mainLight === 'position' && (
                    <>
                      <span className="position-marker left" />
                      <span className="position-marker right" />
                    </>
                  )}
                </>
              )}
            </div>

            {mainLight === 'high' && oncoming && <div className="effect-warning-chip">مركبة مقابلة · خفض العالي</div>}
            {mode === 'low' && <div className="effect-range-mark">حزمة قريبة · ≈ 30 م</div>}
            {mode === 'high' && !oncoming && <div className="effect-range-mark high">مدى أبعد</div>}
          </div>

          <div className="effect-scene-footer">
            <span>{sceneNote}</span>
            {mainLight === 'high' && (
              <button type="button" className="effect-oncoming-toggle" onClick={() => setOncoming(!oncoming)}>
                <i className={oncoming ? 'on' : ''} />
                {oncoming ? 'المركبة المقابلة ظاهرة' : 'إظهار مركبة مقابلة'}
              </button>
            )}
          </div>
        </div>
      )}
      {perspective === 'driver' && mode === 'high' && (
        <button type="button" className="scene-bottom-toggle effect-driver-toggle" onClick={() => setOncoming(!oncoming)}>
          {oncoming ? 'إخفاء المركبة المقابلة' : 'إظهار مركبة مقابلة'}
        </button>
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

function ScenarioSvg({ scenario, perspective, oncoming, setOncoming }: { scenario: Scenario; perspective: Perspective; oncoming: boolean; setOncoming: (value: boolean) => void }) {
  const id = 'scene_' + scenario.id + '_' + perspective;
  const title = perspective === 'driver' ? scenario.driverTitle : scenario.externalTitle;

  const Defs = ({ night = true }: { night?: boolean }) => (
    <defs>
      <linearGradient id={id + '_sky'} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={night ? '#020a10' : '#415a53'} />
        <stop offset=".55" stopColor={night ? '#071820' : '#63756d'} />
        <stop offset="1" stopColor={night ? '#102b30' : '#293e39'} />
      </linearGradient>
      <linearGradient id={id + '_road'} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#40535a" />
        <stop offset=".35" stopColor="#1f3138" />
        <stop offset="1" stopColor="#050b0f" />
      </linearGradient>
      <linearGradient id={id + '_roadGlow'} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#ffffff" stopOpacity=".03" />
        <stop offset="1" stopColor="#000000" stopOpacity=".28" />
      </linearGradient>
      <filter id={id + '_blur'} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="16" />
      </filter>
      <filter id={id + '_soft'} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <radialGradient id={id + '_lamp'}><stop stopColor="#fffbe4" /><stop offset=".35" stopColor="#fff2ad" stopOpacity=".72" /><stop offset="1" stopColor="#fff2ad" stopOpacity="0" /></radialGradient>
      <radialGradient id={id + '_red'}><stop stopColor="#ff5a67" stopOpacity=".92" /><stop offset="1" stopColor="#ff3d4e" stopOpacity="0" /></radialGradient>
      <radialGradient id={id + '_amber'}><stop stopColor="#ffd07e" stopOpacity=".95" /><stop offset="1" stopColor="#f4aa45" stopOpacity="0" /></radialGradient>
    </defs>
  );

  const Caption = ({ x = 38, y = 38, width = 390, titleText, bodyText, tone = 'teal' }: { x?: number; y?: number; width?: number; titleText: string; bodyText: string; tone?: 'teal' | 'amber' | 'red' | 'white' }) => {
    const palette = tone === 'amber'
      ? { fill: '#211a11', stroke: '#f0b764', title: '#ffe0ae', body: '#d5b891' }
      : tone === 'red'
        ? { fill: '#241416', stroke: '#ff8e96', title: '#ffd4d7', body: '#d9b7ba' }
        : tone === 'white'
          ? { fill: '#e8efeb', stroke: '#f2f7f3', title: '#f7fbf8', body: '#ced8d4' }
          : { fill: '#061218', stroke: '#86e4da', title: '#c9f4ee', body: '#9fb7b5' };
    return (
      <g>
        <rect x={x} y={y} width={width} height="78" rx="22" fill={palette.fill} fillOpacity=".94" stroke={palette.stroke} strokeOpacity=".34" strokeWidth="1.5" />
        <circle cx={x + 24} cy={y + 27} r="7" fill={palette.stroke} fillOpacity=".92" />
        <text x={x + 44} y={y + 31} fill={palette.title} fontSize="19" fontWeight="900">{titleText}</text>
        <text x={x + 44} y={y + 54} fill={palette.body} fontSize="11.5" fontWeight="700">{bodyText}</text>
      </g>
    );
  };

  const RoadBase = () => (
    <>
      <path d="M0 470L214 132H686L900 470Z" fill={'url(#' + id + '_road)'} />
      <path d="M0 470L214 132H686L900 470Z" fill={'url(#' + id + '_roadGlow)'} />
      <path d="M450 135V470" stroke="#dfeae7" strokeOpacity=".22" strokeWidth="4" strokeDasharray="26 19" />
      <path d="M275 470L350 176M625 470L550 176" stroke="#aab9b9" strokeOpacity=".10" strokeWidth="3" />
    </>
  );

  if (perspective === 'driver') {
    return (
      <div className="scenario-svg-frame">
        <svg className="scenario-svg" viewBox="0 0 900 470" role="img" aria-label={title}>
          <Defs night={scenario.id !== 'position' && scenario.id !== 'signals'} />

          {scenario.id === 'low' && (
            <>
              <rect width="900" height="470" fill={'url(#' + id + '_sky)'} />
              <circle cx="740" cy="90" r="46" fill="#dce8e0" opacity=".14" />
              <circle cx="120" cy="92" r="28" fill="#d6ebe4" opacity=".07" />
              <RoadBase />
              <g opacity=".72">
                <rect x="106" y="180" width="5" height="112" fill="#56676b" />
                <rect x="794" y="180" width="5" height="112" fill="#56676b" />
                <circle cx="108" cy="170" r="13" fill="#a9e4d9" opacity=".11" />
                <circle cx="796" cy="170" r="13" fill="#a9e4d9" opacity=".11" />
              </g>
              <g opacity=".76">
                <image href="/spirit/car-rear.svg" x="396" y="82" width="108" height="72" />
                <image href="/spirit/car-rear.svg" x="208" y="183" width="92" height="61" />
                <image href="/spirit/car-rear.svg" x="600" y="183" width="92" height="61" />
              </g>
              <path d="M450 330L255 240M450 330L645 240" stroke="#fff0a7" strokeOpacity=".27" strokeWidth="72" strokeLinecap="round" filter={'url(#' + id + '_blur)'} />
              <path d="M450 328L268 246M450 328L632 246" stroke="#fff5c4" strokeOpacity=".48" strokeWidth="11" strokeLinecap="round" />
              <path d="M450 328V194" stroke="#86e4da" strokeOpacity=".60" strokeWidth="2" strokeDasharray="5 7" />
              <line x1="430" y1="194" x2="470" y2="194" stroke="#86e4da" strokeOpacity=".62" strokeWidth="2" />
              <text x="450" y="186" textAnchor="middle" fill="#bdf1ea" fontSize="14" fontWeight="900">مثال تعليمي ≈ 30 م</text>
              <Caption titleText="الضوء المنخفض" bodyText="الحزمة تهبط إلى الطريق وتخدم الرؤية القريبة دون رفع الضوء إلى وجه المقابل." />
              <g>
                <rect x="52" y="378" width="265" height="54" rx="18" fill="#061017" stroke="#86e4da" strokeOpacity=".20" />
                <circle cx="76" cy="405" r="8" fill="#86e4da" />
                <text x="96" y="403" fill="#d8eeeb" fontSize="12" fontWeight="900">النتيجة</text>
                <text x="96" y="421" fill="#9eb5b4" fontSize="10">طريق واضح + إبهار أقل</text>
              </g>
            </>
          )}

          {scenario.id === 'high' && (
            <>
              <rect width="900" height="470" fill={'url(#' + id + '_sky)'} />
              <circle cx="770" cy="80" r="38" fill="#e6eee9" opacity=".08" />
              <RoadBase />
              <path d="M450 330L60 72M450 330L840 72" stroke="#fff0ac" strokeOpacity=".18" strokeWidth="116" strokeLinecap="round" filter={'url(#' + id + '_blur)'} />
              <path d="M450 330L70 63M450 330L830 63" stroke="#fff3b4" strokeOpacity=".38" strokeWidth="12" strokeLinecap="round" />
              <path d="M125 310L162 136M775 310L738 136" stroke="#7a8b8f" strokeOpacity=".30" strokeWidth="4" />
              {!oncoming && (
                <>
                  <Caption titleText="الضوء العالي" bodyText="طريق مظلم وخالٍ أمامك: الحزمة تمتد بعيداً لتحسين الرؤية." />
                  <rect x="52" y="373" width="252" height="54" rx="18" fill="#061017" stroke="#86e4da" strokeOpacity=".20" />
                  <text x="78" y="396" fill="#c9f3ed" fontSize="12" fontWeight="900">قبل المواجهة</text>
                  <text x="78" y="416" fill="#9fb8b5" fontSize="10">استخدم العالي فقط عندما لا يسبب إبهاراً.</text>
                </>
              )}
              {oncoming && (
                <>
                  <image href="/spirit/car-front.svg" x="626" y="86" width="126" height="82" />
                  <ellipse cx="689" cy="140" rx="72" ry="44" fill="#fff4c7" opacity=".18" filter={'url(#' + id + '_blur)'} />
                  <path d="M450 330L675 154" stroke="#fff1c4" strokeOpacity=".36" strokeWidth="30" strokeLinecap="round" />
                  <Caption titleText="مركبة مقابلة = اخفض العالي" bodyText="ضوء مرتفع باتجاه عين السائق المقابل يرفع الإبهار؛ هنا يجب الرجوع للمنخفض." tone="red" width={455} />
                </>
              )}
              <g onClick={() => setOncoming(!oncoming)} cursor="pointer">
                <rect x="687" y="379" width="168" height="50" rx="17" fill="#061016" stroke="#ffffff" strokeOpacity=".14" />
                <text x="711" y="409" fill="#d9e7e4" fontSize="11" fontWeight="900">{oncoming ? 'إخفاء المركبة المقابلة' : 'أظهر مركبة مقابلة'}</text>
              </g>
            </>
          )}

          {scenario.id === 'fog' && (
            <>
              <rect width="900" height="470" fill="#8ea3a2" />
              <rect width="900" height="470" fill="#dfeae7" opacity=".16" />
              <RoadBase />
              <path d="M0 92H900M0 172H900M0 247H900" stroke="#f3f8f5" strokeOpacity=".12" strokeWidth="52" />
              <g opacity=".33" fill="#ffffff">
                <circle cx="98" cy="104" r="19" /><circle cx="228" cy="158" r="23" /><circle cx="356" cy="96" r="15" /><circle cx="552" cy="140" r="22" /><circle cx="720" cy="98" r="17" /><circle cx="812" cy="184" r="25" />
              </g>
              <g opacity=".50">
                <path d="M450 330L96 162M450 330L804 162" stroke="#ffffff" strokeOpacity=".55" strokeWidth="94" strokeLinecap="round" filter={'url(#' + id + '_blur)'} />
                <path d="M450 330L230 283M450 330L670 283" stroke="#fff2b5" strokeOpacity=".58" strokeWidth="13" strokeLinecap="round" />
              </g>
              <image href="/spirit/car-front.svg" x="370" y="252" width="160" height="104" />
              <Caption titleText="الضباب يشتت الضوء" bodyText="الضوء الأعلى ينتشر داخل الضباب ويصنع وهجاً؛ الحزمة المنخفضة تبقى أقرب للأرض." tone="white" width={470} />
              <g>
                <rect x="52" y="372" width="360" height="54" rx="18" fill="#243638" fillOpacity=".85" stroke="#eaf2ef" strokeOpacity=".18" />
                <circle cx="77" cy="399" r="8" fill="#f1d488" />
                <text x="98" y="398" fill="#edf5f2" fontSize="11.5" fontWeight="900">الأهم في الضباب</text>
                <text x="98" y="416" fill="#ced8d5" fontSize="10">سرعة أقل + مسافة توقف أكبر</text>
              </g>
            </>
          )}

          {scenario.id === 'position' && (
            <>
              <rect width="900" height="470" fill={'url(#' + id + '_sky)'}/>
              <circle cx="756" cy="92" r="67" fill="#f3efc8" opacity=".24" />
              <circle cx="756" cy="92" r="89" fill="#eee9bd" opacity=".05" />
              <path d="M0 282H900V470H0Z" fill="#304843" />
              <path d="M0 342H900" stroke="#c4d0ca" strokeOpacity=".16" strokeWidth="4" />
              <rect x="105" y="228" width="7" height="110" fill="#6f7e7b" /><rect x="788" y="228" width="7" height="110" fill="#6f7e7b" />
              <circle cx="108" cy="224" r="15" fill="#efe6b0" opacity=".10" /><circle cx="791" cy="224" r="15" fill="#efe6b0" opacity=".10" />
              <image href="/spirit/car-rear.svg" x="338" y="230" width="224" height="126" />
              <ellipse cx="450" cy="304" rx="170" ry="72" fill="#e7eab9" opacity=".08" />
              <circle cx="405" cy="302" r="11" fill="#dfeab6" /><circle cx="495" cy="302" r="11" fill="#dfeab6" />
              <path d="M330 270Q450 216 570 270" stroke="#dfebbc" strokeOpacity=".18" strokeWidth="2" fill="none" />
              <Caption titleText="أضواء الموضع" bodyText="في الغسق الهدف أن تُرى المركبة وحدودها بوضوح؛ ليست بديلاً عن إنارة الطريق." width={470} />
              <g>
                <rect x="52" y="373" width="300" height="54" rx="18" fill="#162724" stroke="#e0e8bb" strokeOpacity=".26" />
                <text x="78" y="397" fill="#edf4d9" fontSize="12" fontWeight="900">احفظها هكذا</text>
                <text x="78" y="417" fill="#c1cab5" fontSize="10">POSITION = أن تُرى، لا أن ترى بعيداً</text>
              </g>
            </>
          )}

          {scenario.id === 'signals' && (
            <>
              <rect width="900" height="470" fill="#1b3637" />
              <path d="M0 298H900M450 0V470" stroke="#e6efec" strokeOpacity=".17" strokeWidth="13" strokeDasharray="34 19" />
              <path d="M0 298H900" stroke="#8fa29f" strokeOpacity=".15" strokeWidth="60" />
              <rect x="82" y="106" width="206" height="62" rx="12" fill="#203f40" stroke="#9db0ad" strokeOpacity=".24" />
              <rect x="612" y="106" width="206" height="62" rx="12" fill="#203f40" stroke="#9db0ad" strokeOpacity=".24" />
              <image href="/spirit/car-front.svg" x="349" y="289" width="202" height="132" />
              <image href="/spirit/car-front.svg" x="110" y="205" width="112" height="74" />
              <path d="M450 352C522 350 577 299 609 225" fill="none" stroke="#86e4da" strokeOpacity=".20" strokeWidth="30" />
              <path d="M450 352C522 350 577 299 609 225" fill="none" stroke="#86e4da" strokeWidth="10" strokeLinecap="round" />
              <path d="M599 226L624 241L596 248Z" fill="#86e4da" />
              <circle cx="510" cy="326" r="20" fill="#f4ae57" opacity=".20" />
              <circle cx="510" cy="326" r="11" fill="#f4ae57" />
              <Caption titleText="الغماز قبل المناورة" bodyText="راقب المرآة والنقطة العمياء، أعطِ الإشارة، ثم نفّذ عندما يصبح الانتقال آمناً." width={455} />
              <g>
                <rect x="52" y="373" width="420" height="54" rx="18" fill="#061218" stroke="#86e4da" strokeOpacity=".20" />
                <text x="78" y="397" fill="#c8f2ec" fontSize="11.5" fontWeight="900">التسلسل الصحيح</text>
                <text x="78" y="417" fill="#a1b6b4" fontSize="10">مراقبة → غماز → تموضع → مناورة آمنة</text>
              </g>
            </>
          )}

          {scenario.id === 'hazard' && (
            <>
              <rect width="900" height="470" fill={'url(#' + id + '_sky)'} />
              <path d="M0 325H900" stroke="#a8b9b6" strokeOpacity=".18" strokeWidth="4" />
              <path d="M0 383H900" stroke="#24363a" strokeWidth="80" />
              <path d="M0 354H900" stroke="#c4ceca" strokeOpacity=".22" strokeWidth="4" strokeDasharray="32 24" />
              <image href="/spirit/car-rear.svg" x="330" y="208" width="240" height="148" />
              <image href="/spirit/car-front.svg" x="88" y="257" width="114" height="76" opacity=".60" />
              <image href="/spirit/car-front.svg" x="704" y="251" width="118" height="79" opacity=".62" />
              <ellipse cx="405" cy="292" rx="34" ry="28" fill="#f4ae57" opacity=".18" filter={'url(#' + id + '_soft)'} />
              <ellipse cx="495" cy="292" rx="34" ry="28" fill="#f4ae57" opacity=".18" filter={'url(#' + id + '_soft)'} />
              <circle cx="405" cy="292" r="14" fill="#f4ae57" />
              <circle cx="495" cy="292" r="14" fill="#f4ae57" />
              <path d="M450 187L473 227H427Z" fill="none" stroke="#f1bd74" strokeWidth="5" strokeLinejoin="round" />
              <path d="M450 199V214" stroke="#f1bd74" strokeWidth="4" strokeLinecap="round" />
              <Caption titleText="توقف غير اعتيادي" bodyText="التحذير الرباعي يلفت الانتباه من الخلف، بينما تبقى الأولوية للتوقف بأمان." tone="amber" />
              <g>
                <rect x="52" y="373" width="370" height="54" rx="18" fill="#211a11" stroke="#f1bd74" strokeOpacity=".24" />
                <text x="78" y="397" fill="#f2d1a3" fontSize="11.5" fontWeight="900">الفرق عن الغماز</text>
                <text x="78" y="417" fill="#ceb391" fontSize="10">الغماز = اتجاه واحد · الرباعي = تحذير للجهتين</text>
              </g>
            </>
          )}

          {scenario.id === 'rear' && (
            <>
              <rect width="900" height="470" fill="#071319" />
              <path d="M0 335H900" stroke="#a6b5b4" strokeOpacity=".16" strokeWidth="4" />
              <path d="M0 390H900" stroke="#15272d" strokeWidth="76" />
              <image href="/spirit/car-rear.svg" x="330" y="188" width="240" height="150" />
              <circle cx="400" cy="288" r="24" fill="#ff4154" opacity=".28" filter={'url(#' + id + '_soft)'} />
              <circle cx="500" cy="288" r="24" fill="#ff4154" opacity=".28" filter={'url(#' + id + '_soft)'} />
              <circle cx="400" cy="288" r="16" fill="#ff4b5a" />
              <circle cx="500" cy="288" r="16" fill="#ff4b5a" />
              <path d="M450 342L358 439M450 342L542 439" stroke="#fff8e7" strokeOpacity=".16" strokeWidth="60" strokeLinecap="round" filter={'url(#' + id + '_blur)'} />
              <path d="M450 342L358 439M450 342L542 439" stroke="#fff8e9" strokeOpacity=".45" strokeWidth="18" strokeLinecap="round" />
              <g>
                <rect x="54" y="50" width="300" height="72" rx="20" fill="#241315" stroke="#ff858e" strokeOpacity=".34" />
                <circle cx="80" cy="79" r="9" fill="#ff4556" />
                <text x="102" y="83" fill="#ffd4d7" fontSize="18" fontWeight="900">فرامل = أحمر</text>
                <text x="102" y="104" fill="#d6b5b9" fontSize="10.5">تنبيه من خلفك أن السيارة تتباطأ</text>
              </g>
              <g>
                <rect x="545" y="50" width="300" height="72" rx="20" fill="#e6eee9" fillOpacity=".10" stroke="#f0f6f2" strokeOpacity=".28" />
                <circle cx="571" cy="79" r="9" fill="#ffffff" />
                <text x="593" y="83" fill="#eff7f4" fontSize="18" fontWeight="900">رجوع = أبيض</text>
                <text x="593" y="104" fill="#c2cfcc" fontSize="10.5">يكشف منطقة الحركة خلف السيارة</text>
              </g>
              <g>
                <rect x="54" y="373" width="792" height="54" rx="18" fill="#061016" stroke="#ffffff" strokeOpacity=".10" />
                <text x="78" y="397" fill="#e0ece9" fontSize="11.5" fontWeight="900">احفظ الفرق بصرياً</text>
                <text x="78" y="417" fill="#9eb4b2" fontSize="10">الأحمر = كبح · الأبيض = رجوع للخلف · والاثنان لا يختارهما المقبض كوظيفة مستقلة</text>
              </g>
            </>
          )}

          <rect x="22" y="437" width="856" height="22" rx="11" fill="#02080c" opacity=".88" />
          <text x="42" y="452" fill="#c5d4d1" fontSize="10.5">{title}</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="scenario-svg-frame">
      <svg className="scenario-svg" viewBox="0 0 900 470" role="img" aria-label={title}>
        <Defs night={scenario.id !== 'position' && scenario.id !== 'signals'} />

        {scenario.id === 'low' && (
          <>
            <rect width="900" height="470" fill={'url(#' + id + '_sky)'} />
            <path d="M0 342Q220 272 450 308T900 342V470H0Z" fill="#0a1b22" />
            <path d="M0 356Q225 300 450 324T900 356" stroke="#7f9091" strokeOpacity=".16" strokeWidth="3" fill="none" />
            <image href="/spirit/car-front.svg" x="334" y="258" width="232" height="148" />
            <path d="M450 332L240 255M450 332L660 255" stroke="#fff0a8" strokeOpacity=".26" strokeWidth="88" strokeLinecap="round" filter={'url(#' + id + '_blur)'} />
            <path d="M450 332L254 259M450 332L646 259" stroke="#fff5c2" strokeOpacity=".45" strokeWidth="12" strokeLinecap="round" />
            <line x1="300" y1="259" x2="182" y2="259" stroke="#86e4da" strokeOpacity=".50" strokeWidth="2" strokeDasharray="4 7" />
            <text x="176" y="248" fill="#bcefe8" fontSize="12" fontWeight="900">الحزمة منخفضة</text>
            <g>
              <rect x="55" y="55" width="350" height="74" rx="21" fill="#071117" stroke="#86e4da" strokeOpacity=".30" />
              <text x="81" y="84" fill="#c8f3ed" fontSize="19" fontWeight="900">ماذا يرى الآخرون؟</text>
              <text x="81" y="106" fill="#a2b8b6" fontSize="11">ضوء منخفض لا يرتفع إلى مستوى عين السائق المقابل</text>
            </g>
            <g>
              <rect x="632" y="55" width="213" height="74" rx="21" fill="#071117" stroke="#ffffff" strokeOpacity=".10" />
              <text x="658" y="84" fill="#dce9e6" fontSize="17" fontWeight="900">هذه سيارتك</text>
              <text x="658" y="106" fill="#9fb2b1" fontSize="11">المصدر → الحزمة → الطريق</text>
            </g>
            <g>
              <rect x="54" y="381" width="310" height="48" rx="17" fill="#061017" stroke="#86e4da" strokeOpacity=".18" />
              <text x="78" y="401" fill="#c6f1eb" fontSize="11" fontWeight="900">الهدف</text>
              <text x="78" y="418" fill="#9eb4b1" fontSize="9.8">رؤية كافية مع إبهار أقل للمقابل</text>
            </g>
            <g opacity=".65">
              <circle cx="107" cy="218" r="6" fill="#c5f4ea" /><circle cx="793" cy="218" r="6" fill="#c5f4ea" />
            </g>
          </>
        )}

        {scenario.id === 'high' && (
          <>
            <rect width="900" height="470" fill={'url(#' + id + '_bg)'} />
            <path d="M0 368Q225 260 450 302T900 368V470H0Z" fill="#0b2027" />
            <path d="M450 334L52 82M450 334L848 82" stroke="#fff0ad" strokeOpacity=".18" strokeWidth="116" strokeLinecap="round" filter={'url(#' + id + '_blur)'} />
            <path d="M450 334L62 72M450 334L838 72" stroke="#fff4b7" strokeOpacity=".36" strokeWidth="12" strokeLinecap="round" />
            <image href="/spirit/car-front.svg" x="330" y="266" width="240" height="154" />
            {!oncoming && (
              <>
                <g>
                  <rect x="54" y="54" width="370" height="74" rx="21" fill="#071117" stroke="#86e4da" strokeOpacity=".30" />
                  <text x="80" y="84" fill="#c8f3ed" fontSize="19" fontWeight="900">الطريق خالٍ</text>
                  <text x="80" y="106" fill="#a2b8b6" fontSize="11">مدى أبعد لأن الحزمة لا تصيب مستخدم طريق مقابلاً</text>
                </g>
                <g>
                  <rect x="54" y="381" width="350" height="48" rx="17" fill="#061017" stroke="#86e4da" strokeOpacity=".18" />
                  <text x="78" y="401" fill="#c8f2ec" fontSize="11" fontWeight="900">الحالة الآمنة في هذا المثال</text>
                  <text x="78" y="418" fill="#9fb5b3" fontSize="9.8">تستخدم العالي ما دام الطريق خالياً من المقابل</text>
                </g>
              </>
            )}
            {oncoming && (
              <>
                <image href="/spirit/car-front.svg" x="624" y="88" width="136" height="90" />
                <ellipse cx="692" cy="143" rx="72" ry="44" fill="#fff3c5" opacity=".18" filter={'url(#' + id + '_blur)'} />
                <path d="M450 334L690 148" stroke="#fff2bd" strokeOpacity=".34" strokeWidth="34" strokeLinecap="round" />
                <g>
                  <rect x="54" y="54" width="458" height="74" rx="21" fill="#281719" stroke="#ff9ca4" strokeOpacity=".40" />
                  <text x="80" y="84" fill="#ffd9dc" fontSize="19" fontWeight="900">مركبة مقابلة · إبهار واضح</text>
                  <text x="80" y="106" fill="#d6b9bc" fontSize="11">الحزمة العالية تصل مباشرة إلى مجال رؤية السائق المقابل</text>
                </g>
                <g>
                  <rect x="54" y="381" width="376" height="48" rx="17" fill="#211516" stroke="#ff949c" strokeOpacity=".24" />
                  <text x="78" y="401" fill="#ffd6d9" fontSize="11" fontWeight="900">الإجراء الصحيح</text>
                  <text x="78" y="418" fill="#d7b8bc" fontSize="9.8">اخفض العالي وانتقل للمنخفض قبل المواجهة</text>
                </g>
              </>
            )}
            <g onClick={() => setOncoming(!oncoming)} cursor="pointer">
              <rect x="684" y="55" width="170" height="48" rx="16" fill="#061016" stroke="#ffffff" strokeOpacity=".12" />
              <text x="708" y="84" fill="#dce9e6" fontSize="11" fontWeight="900">{oncoming ? 'إخفاء السيارة المقابلة' : 'أظهر سيارة مقابلة'}</text>
            </g>
          </>
        )}

        {scenario.id === 'fog' && (
          <>
            <rect width="900" height="470" fill="#718888" />
            <path d="M0 330Q225 285 450 314T900 330V470H0Z" fill="#10252b" />
            <g opacity=".55">
              <rect x="0" y="72" width="900" height="80" fill="#eef5f2" opacity=".18" />
              <rect x="0" y="165" width="900" height="68" fill="#eef5f2" opacity=".16" />
              <rect x="0" y="247" width="900" height="48" fill="#eef5f2" opacity=".13" />
            </g>
            <image href="/spirit/car-front.svg" x="328" y="278" width="244" height="152" />
            <g>
              <rect x="55" y="52" width="345" height="74" rx="21" fill="#eef4f0" fillOpacity=".13" stroke="#f6fbf8" strokeOpacity=".28" />
              <text x="81" y="82" fill="#f4faf7" fontSize="19" fontWeight="900">مقارنة الضوء داخل الضباب</text>
              <text x="81" y="104" fill="#d2ddda" fontSize="11">الفرق ليس في «قوة» الضوء فقط، بل في مكان وصوله</text>
            </g>
            <g>
              <rect x="55" y="151" width="374" height="72" rx="20" fill="#e9efec" fillOpacity=".10" stroke="#f4f8f5" strokeOpacity=".20" />
              <text x="81" y="180" fill="#f2f8f5" fontSize="16" fontWeight="900">ضوء أعلى</text>
              <text x="81" y="201" fill="#d0d9d6" fontSize="10.5">ينتشر داخل الضباب ويخلق وهجاً ويقلل التباين</text>
              <path d="M275 225Q325 250 358 268" stroke="#ffffff" strokeOpacity=".38" strokeWidth="20" strokeLinecap="round" filter={'url(#' + id + '_blur)'} />
            </g>
            <g>
              <rect x="497" y="151" width="348" height="72" rx="20" fill="#08151a" stroke="#86e4da" strokeOpacity=".26" />
              <text x="523" y="180" fill="#c6f2eb" fontSize="16" fontWeight="900">حزمة منخفضة</text>
              <text x="523" y="201" fill="#a4bbba" fontSize="10.5">أقرب إلى سطح الطريق وتكشف الخطوط بشكل أنسب</text>
              <path d="M595 225Q548 254 520 282" stroke="#fff2b4" strokeOpacity=".44" strokeWidth="17" strokeLinecap="round" />
            </g>
            <g>
              <rect x="55" y="381" width="790" height="48" rx="17" fill="#071217" stroke="#ffffff" strokeOpacity=".10" />
              <text x="80" y="401" fill="#e0ebe8" fontSize="11" fontWeight="900">الخلاصة</text>
              <text x="80" y="418" fill="#afc0be" fontSize="9.8">الضباب لا يجعل الطريق آمناً بحد ذاته: خفف السرعة، زد المسافة، واستخدم الحزمة المناسبة.</text>
            </g>
          </>
        )}

        {scenario.id === 'position' && (
          <>
            <rect width="900" height="470" fill={'url(#' + id + '_bg)'} />
            <circle cx="740" cy="88" r="70" fill="#f0ebc4" opacity=".26" />
            <path d="M0 351Q220 288 450 316T900 351V470H0Z" fill="#223d3b" />
            <path d="M0 352H900" stroke="#b9c8c3" strokeOpacity=".16" strokeWidth="4" />
            <image href="/spirit/car-rear.svg" x="328" y="224" width="244" height="150" />
            <ellipse cx="450" cy="302" rx="188" ry="82" fill="#e3e9b6" opacity=".08" />
            <circle cx="395" cy="301" r="12" fill="#e0e9b6" /><circle cx="505" cy="301" r="12" fill="#e0e9b6" />
            <g>
              <rect x="55" y="52" width="375" height="74" rx="21" fill="#142321" stroke="#dce8b4" strokeOpacity=".30" />
              <text x="81" y="82" fill="#eff5dc" fontSize="19" fontWeight="900">غسق · الهدف أن تُرى المركبة</text>
              <text x="81" y="104" fill="#c2cdb8" fontSize="11">المصابيح تحدد وجود السيارة وحدودها في الضوء المحيط الضعيف</text>
            </g>
            <g>
              <path d="M195 200Q450 146 705 200" stroke="#dce8b1" strokeOpacity=".18" strokeWidth="3" fill="none" />
              <text x="450" y="178" textAnchor="middle" fill="#e7edc7" fontSize="12" fontWeight="900">«أن تُرى»</text>
            </g>
            <g>
              <rect x="55" y="381" width="790" height="48" rx="17" fill="#112321" stroke="#dce8b4" strokeOpacity=".16" />
              <text x="80" y="401" fill="#e9f1d8" fontSize="11" fontWeight="900">لا تحفظها كضوء للرؤية البعيدة</text>
              <text x="80" y="418" fill="#bbc7b7" fontSize="9.8">احفظها كضوء لإظهار المركبة عندما تقل الإضاءة المحيطة.</text>
            </g>
          </>
        )}

        {scenario.id === 'signals' && (
          <>
            <rect width="900" height="470" fill="#1d3939" />
            <path d="M0 304H900M450 0V470" stroke="#eef5f2" strokeOpacity=".17" strokeWidth="12" strokeDasharray="34 20" />
            <rect x="74" y="108" width="230" height="62" rx="12" fill="#274848" stroke="#9fb1ae" strokeOpacity=".26" />
            <rect x="596" y="108" width="230" height="62" rx="12" fill="#274848" stroke="#9fb1ae" strokeOpacity=".26" />
            <image href="/spirit/car-front.svg" x="336" y="279" width="228" height="148" />
            <image href="/spirit/car-front.svg" x="93" y="208" width="120" height="80" opacity=".64" />
            <image href="/spirit/car-front.svg" x="687" y="207" width="120" height="80" opacity=".50" />
            <path d="M450 352Q525 347 575 292T616 220" fill="none" stroke="#86e4da" strokeOpacity=".14" strokeWidth="28" />
            <path d="M450 352Q525 347 575 292T616 220" fill="none" stroke="#86e4da" strokeWidth="9" strokeLinecap="round" />
            <path d="M604 222L630 236L601 245Z" fill="#86e4da" />
            <circle cx="508" cy="327" r="18" fill="#f4ae57" opacity=".18" />
            <circle cx="508" cy="327" r="11" fill="#f4ae57" />
            <g>
              <rect x="55" y="52" width="420" height="74" rx="21" fill="#071117" stroke="#86e4da" strokeOpacity=".28" />
              <text x="81" y="82" fill="#c8f3ed" fontSize="19" fontWeight="900">التقاطع: الإشارة قبل الحركة</text>
              <text x="81" y="104" fill="#a1b8b5" fontSize="11">الغماز يخبر الآخرين بنيتك، لكنه لا يجعل المناورة آمنة وحده</text>
            </g>
            <g>
              <rect x="55" y="381" width="790" height="48" rx="17" fill="#061117" stroke="#86e4da" strokeOpacity=".16" />
              <text x="80" y="401" fill="#c8f2ec" fontSize="11" fontWeight="900">شاهد الفكرة</text>
              <text x="80" y="418" fill="#a0b7b4" fontSize="9.8">سيارة أخرى تستطيع قراءة اتجاهك قبل أن تبدأ الحركة الفعلية.</text>
            </g>
          </>
        )}

        {scenario.id === 'hazard' && (
          <>
            <rect width="900" height="470" fill={'url(#' + id + '_bg)'} />
            <path d="M0 330H900" stroke="#b2c0be" strokeOpacity=".18" strokeWidth="4" />
            <path d="M0 389H900" stroke="#1f353b" strokeWidth="80" />
            <image href="/spirit/car-rear.svg" x="328" y="204" width="244" height="151" />
            <image href="/spirit/car-front.svg" x="70" y="258" width="120" height="80" opacity=".62" />
            <image href="/spirit/car-front.svg" x="710" y="252" width="120" height="80" opacity=".62" />
            <circle cx="397" cy="293" r="16" fill="#f4ae57" />
            <circle cx="503" cy="293" r="16" fill="#f4ae57" />
            <circle cx="397" cy="293" r="31" fill="#f4ae57" opacity=".15" filter={'url(#' + id + '_soft)'} />
            <circle cx="503" cy="293" r="31" fill="#f4ae57" opacity=".15" filter={'url(#' + id + '_soft)'} />
            <circle cx="450" cy="204" r="42" fill="#f1bd74" fillOpacity=".06" stroke="#f1bd74" strokeOpacity=".34" strokeWidth="3" />
            <path d="M450 178L472 216H428Z" fill="none" stroke="#f1bd74" strokeWidth="4" strokeLinejoin="round" />
            <g>
              <rect x="55" y="52" width="425" height="74" rx="21" fill="#241a10" stroke="#f1bd74" strokeOpacity=".32" />
              <text x="81" y="82" fill="#f4d5aa" fontSize="19" fontWeight="900">كتف الطريق · رباعي</text>
              <text x="81" y="104" fill="#d0b592" fontSize="11">التحذير يظهر من الجهتين بدلاً من تحديد اتجاه انعطاف واحد</text>
            </g>
            <g>
              <rect x="55" y="381" width="790" height="48" rx="17" fill="#21190f" stroke="#f1bd74" strokeOpacity=".16" />
              <text x="80" y="401" fill="#f0d0a8" fontSize="11" fontWeight="900">الفكرة الأساسية</text>
              <text x="80" y="418" fill="#c8ae8e" fontSize="9.8">أنت لا تقول «سأذهب يميناً»؛ أنت تقول «انتبه، هناك حالة غير اعتيادية هنا».</text>
            </g>
          </>
        )}

        {scenario.id === 'rear' && (
          <>
            <rect width="900" height="470" fill="#071319" />
            <path d="M0 342H900" stroke="#a7b7b5" strokeOpacity=".15" strokeWidth="4" />
            <path d="M0 393H900" stroke="#14282f" strokeWidth="76" />
            <image href="/spirit/car-rear.svg" x="326" y="197" width="248" height="154" />
            <circle cx="398" cy="291" r="19" fill="#ff4657" />
            <circle cx="502" cy="291" r="19" fill="#ff4657" />
            <circle cx="398" cy="291" r="44" fill="#ff4657" opacity=".15" filter={'url(#' + id + '_blur)'} />
            <circle cx="502" cy="291" r="44" fill="#ff4657" opacity=".15" filter={'url(#' + id + '_blur)'} />
            <path d="M450 350L354 442M450 350L546 442" stroke="#fff9e8" strokeOpacity=".48" strokeWidth="20" strokeLinecap="round" />
            <g>
              <rect x="55" y="52" width="350" height="74" rx="21" fill="#281417" stroke="#ff8991" strokeOpacity=".36" />
              <text x="81" y="82" fill="#ffd7da" fontSize="19" fontWeight="900">فرامل → أحمر قوي</text>
              <text x="81" y="104" fill="#d7b9bd" fontSize="11">السيارة خلفك ترى أنك تبطئ أو تتوقف</text>
            </g>
            <g>
              <rect x="495" y="52" width="350" height="74" rx="21" fill="#e6eee9" fillOpacity=".10" stroke="#f4f8f5" strokeOpacity=".28" />
              <text x="521" y="82" fill="#eff7f3" fontSize="19" fontWeight="900">رجوع → أبيض</text>
              <text x="521" y="104" fill="#c5d1ce" fontSize="11">الضوء الأبيض يبرز منطقة الحركة خلف السيارة</text>
            </g>
            <g>
              <rect x="55" y="381" width="790" height="48" rx="17" fill="#061016" stroke="#ffffff" strokeOpacity=".10" />
              <text x="80" y="401" fill="#e0ece9" fontSize="11" fontWeight="900">الأضواء هنا مرتبطة بحالة السيارة</text>
              <text x="80" y="418" fill="#9fb4b2" fontSize="9.8">الفرامل والرجوع لا تختارهما كوظيفة مستقلة من حلقة الإنارة.</text>
            </g>
          </>
        )}

        <rect x="22" y="437" width="856" height="22" rx="11" fill="#02080c" opacity=".88" />
        <text x="42" y="452" fill="#c5d4d1" fontSize="10.5">{title}</text>
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
