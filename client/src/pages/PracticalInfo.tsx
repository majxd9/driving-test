import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';

type MainLightKey = 'off' | 'position' | 'auto' | 'low' | 'high' | 'frontFog' | 'rearFog';
type SignalKey = 'left' | 'right' | 'hazard';
type ControlGroup = 'ring' | 'lever';

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
  { id: 'rearFog', tag: 'الضباب الخلفي', title: 'رؤية سيئة جداً · ضوء أحمر واضح من الخلف', control: 'rearFog', driverTitle: 'الضباب الخلفي وظيفة لرؤية المركبة من الخلف في ظروف الرؤية السيئة جداً.', externalTitle: 'من الخلف: مصدر أحمر واضح يساعد على تمييز المركبة في الضباب.', goal: 'تمييز الضباب الخلفي عن الغماز والفرامل: هو ضوء أحمر مخصص لتحسين ظهور المركبة من الخلف.', steps: ['رؤية خلفية ضعيفة جداً', 'تفعيل الضباب الخلفي عند الحاجة', 'ضوء أحمر واضح من الخلف', 'إطفاؤه عند تحسن الرؤية'], note: 'استخدمه وفق تجهيز المركبة وظروف الرؤية، ولا تعتبره بديلاً عن خفض السرعة ومسافة الأمان.' },
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
  const handleScenarioActivate = (item: Scenario) => {
    restoreScrollRef.current = window.scrollY;
    if (item.control === 'left' || item.control === 'right' || item.control === 'hazard') {
      chooseSignal(item.control);
    } else {
      chooseMain(item.control);
    }

    setSceneFocusActive(true);
    if (restoreTimerRef.current !== null) window.clearTimeout(restoreTimerRef.current);

    window.requestAnimationFrame(() => {
      const handleTarget = simulatorLayoutRef.current;
      if (!handleTarget) return;
      window.scrollTo({
        top: handleTarget.getBoundingClientRect().top + window.scrollY - 20,
        behavior: 'smooth',
      });
      window.setTimeout(() => {
        const vehicleTarget = vehicleLabRef.current;
        if (!vehicleTarget) return;
        window.scrollTo({
          top: vehicleTarget.getBoundingClientRect().top + window.scrollY - 20,
          behavior: 'smooth',
        });
      }, 950);
    });

    restoreTimerRef.current = window.setTimeout(() => {
      const previous = restoreScrollRef.current;
      if (previous !== null) window.scrollTo({ top: previous, behavior: 'smooth' });
      setSceneFocusActive(false);
      restoreScrollRef.current = null;
      restoreTimerRef.current = null;
    }, 3000);
  };

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


function CurrentScene({
  mainLight, signal, flashActive, oncoming, setOncoming,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
  flashActive: boolean;
  oncoming: boolean;
  setOncoming: (v: boolean) => void;
}) {
  const mode = signal === 'hazard' ? 'hazard' : signal ? 'signal' : flashActive ? 'flash' : mainLight;
  const rear = mode === 'position' || mode === 'signal' || mode === 'hazard' || mode === 'rearFog';

  const title =
    mode === 'low' ? 'الضوء المنخفض' :
    mode === 'high' ? 'الضوء العالي' :
    mode === 'frontFog' ? 'أضواء الضباب' :
    mode === 'position' ? 'أضواء الموضع' :
    mode === 'signal' ? (signal === 'right' ? 'الغماز يمين' : 'الغماز يسار') :
    mode === 'hazard' ? 'التحذير الرباعي' :
    mode === 'rearFog' ? 'الضباب الخلفي' :
    mode === 'flash' ? 'وميض العالي' : 'إيقاف';

  return (
    <div className="result-scene-wrap current-scene-premium">
      <div className="current-scene-topbar">
        <span className="scene-live-dot" />
        <b>{title}</b>
        <small>{rear ? 'من الخلف' : 'من الأمام'}</small>
        {mode === 'high' && <button type="button" className="scene-inline-action" onClick={() => setOncoming(!oncoming)}>{oncoming ? 'إخفاء المركبة المقابلة' : 'إظهار مركبة مقابلة'}</button>}
      </div>

      <svg className="current-scene-svg premium-scene-svg" viewBox="0 0 900 470" role="img" aria-label={title}>
        <defs>
          <linearGradient id="currentNightSky" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#02070b"/><stop offset=".55" stopColor="#08171e"/><stop offset="1" stopColor="#0c242a"/>
          </linearGradient>
          <linearGradient id="currentDuskSky" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#20383a"/><stop offset=".5" stopColor="#556963"/><stop offset="1" stopColor="#314640"/>
          </linearGradient>
          <linearGradient id="currentRoad" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#3a4d52"/><stop offset=".4" stopColor="#1a2c32"/><stop offset="1" stopColor="#050b0f"/>
          </linearGradient>
          <radialGradient id="currentHeadGlow">
            <stop stopColor="#fffef0" stopOpacity=".95"/><stop offset=".34" stopColor="#fff1a7" stopOpacity=".48"/><stop offset="1" stopColor="#fff1a7" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="currentAmberGlow">
            <stop stopColor="#ffd17e" stopOpacity=".98"/><stop offset=".35" stopColor="#ffae42" stopOpacity=".42"/><stop offset="1" stopColor="#ff9c30" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="currentRedGlow">
            <stop stopColor="#ff9ba0" stopOpacity=".95"/><stop offset=".3" stopColor="#ff4353" stopOpacity=".45"/><stop offset="1" stopColor="#ff3147" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="currentBeamL" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff8cf" stopOpacity="0"/><stop offset=".5" stopColor="#fff2ac" stopOpacity=".14"/><stop offset="1" stopColor="#fff6c0" stopOpacity=".48"/>
          </linearGradient>
          <linearGradient id="currentBeamR" x1="1" y1="0" x2="0" y2="1">
            <stop stopColor="#fff8cf" stopOpacity="0"/><stop offset=".5" stopColor="#fff2ac" stopOpacity=".14"/><stop offset="1" stopColor="#fff6c0" stopOpacity=".48"/>
          </linearGradient>
          <filter id="currentBlur18"><feGaussianBlur stdDeviation="18"/></filter>
          <filter id="currentBlur7"><feGaussianBlur stdDeviation="7"/></filter>
          <filter id="currentCarShadow"><feDropShadow dx="0" dy="20" stdDeviation="18" floodColor="#000" floodOpacity=".55"/></filter>
        </defs>

        <rect width="900" height="470" fill={rear && mode === 'position' ? 'url(#currentDuskSky)' : 'url(#currentNightSky)'} />
        <circle cx="760" cy="86" r="62" fill={mode === 'position' ? '#efe6b5' : '#dce9e2'} opacity={mode === 'position' ? '.20' : '.045'} />
        <path d="M0 470L182 132H718L900 470Z" fill="url(#currentRoad)" />
        <path d="M450 138V470" stroke="#dbe7e4" strokeOpacity=".20" strokeWidth="4" strokeDasharray="30 21" />
        <path d="M292 470L356 182M608 470L544 182" stroke="#dbe7e4" strokeOpacity=".13" strokeWidth="4" />
        {rear && <g className="rear-direction-cues">
          <path d="M450 445L438 428H446V408H454V428H462Z" fill="#dce9e5" fillOpacity=".18"/>
          <path d="M450 390L438 373H446V353H454V373H462Z" fill="#dce9e5" fillOpacity=".12"/>
          <path d="M450 340L438 323H446V306H454V323H462Z" fill="#dce9e5" fillOpacity=".08"/>
        </g>}

        {(mode === 'low' || mode === 'high' || mode === 'flash' || mode === 'frontFog') && <>
          <path d={mode === 'high' ? 'M393 326L110 124L440 349Z' : mode === 'frontFog' ? 'M394 327L218 282L190 470L444 351Z' : 'M394 326L242 268L192 470L446 351Z'} fill="url(#currentBeamL)" filter="url(#currentBlur7)" opacity={mode === 'frontFog' ? '.62' : '.90'} />
          <path d={mode === 'high' ? 'M507 326L790 124L460 349Z' : mode === 'frontFog' ? 'M506 327L682 282L710 470L456 351Z' : 'M506 326L658 268L708 470L454 351Z'} fill="url(#currentBeamR)" filter="url(#currentBlur7)" opacity={mode === 'frontFog' ? '.62' : '.90'} />
          <path d={mode === 'high' ? 'M395 326L120 142L438 348Z' : mode === 'frontFog' ? 'M395 328L226 286L438 349Z' : 'M395 327L248 272L440 349Z'} fill="#fff3b5" opacity={mode === 'high' ? '.33' : mode === 'frontFog' ? '.16' : '.26'} />
          <path d={mode === 'high' ? 'M505 326L780 142L462 348Z' : mode === 'frontFog' ? 'M505 328L674 286L462 349Z' : 'M505 327L652 272L460 349Z'} fill="#fff3b5" opacity={mode === 'high' ? '.33' : mode === 'frontFog' ? '.16' : '.26'} />
          <ellipse cx="391" cy="326" rx="42" ry="24" fill="url(#currentHeadGlow)" />
          <ellipse cx="509" cy="326" rx="42" ry="24" fill="url(#currentHeadGlow)" />
        </>}

        {mode === 'frontFog' && <g opacity=".18">
          <rect x="0" y="86" width="900" height="50" fill="#f2f7f5"/><rect x="0" y="164" width="900" height="48" fill="#f2f7f5"/><rect x="0" y="242" width="900" height="40" fill="#f2f7f5"/>
          <circle cx="130" cy="116" r="28" fill="#fff"/><circle cx="300" cy="195" r="20" fill="#fff"/><circle cx="680" cy="145" r="32" fill="#fff"/><circle cx="790" cy="214" r="25" fill="#fff"/>
        </g>}

        <image href={rear ? "/spirit/car-rear.svg" : "/spirit/car-front.svg"} x="302" y="232" width="296" height="148" filter="url(#currentCarShadow)" />

        {mode === 'position' && <g>
          <ellipse cx="397" cy="326" rx="38" ry="24" fill="url(#currentRedGlow)" opacity=".20"/><ellipse cx="503" cy="326" rx="38" ry="24" fill="url(#currentRedGlow)" opacity=".20"/>
          <text x="450" y="412" textAnchor="middle" fill="#e1e9d4" fontSize="14" fontWeight="900">إضاءة خفيفة · الهدف أن تُرى المركبة</text>
        </g>}

        {mode === 'signal' && <g>
          <ellipse cx="385" cy="327" rx="54" ry="31" fill="url(#currentAmberGlow)" opacity={signal === 'left' ? '.98' : '.10'}/>
          <ellipse cx="515" cy="327" rx="54" ry="31" fill="url(#currentAmberGlow)" opacity={signal === 'right' ? '.98' : '.10'}/>
          <circle cx={signal === 'left' ? 385 : 515} cy="327" r="14" fill="#ffc66e"/>
          <path d={signal === 'right' ? 'M503 312L535 300' : 'M397 312L365 300'} fill="none" stroke="#f2b15e" strokeOpacity=".24" strokeWidth="10" strokeLinecap="round"/>
          <text x="450" y="412" textAnchor="middle" fill="#f6d0a0" fontSize="14" fontWeight="900">الإشارة ظاهرة من الخلف قبل المناورة</text>
        </g>}

        {mode === 'hazard' && <g>
          <g className="scene-hazard-lamps">
            <ellipse cx="385" cy="327" rx="54" ry="31" fill="url(#currentAmberGlow)" opacity=".96"/>
            <ellipse cx="515" cy="327" rx="54" ry="31" fill="url(#currentAmberGlow)" opacity=".96"/>
            <circle cx="385" cy="327" r="14" fill="#ffc66e"/>
            <circle cx="515" cy="327" r="14" fill="#ffc66e"/>
          </g>
          <circle cx="450" cy="244" r="31" fill="#ffb24d" opacity=".05" stroke="#ffc96f" strokeOpacity=".28" strokeWidth="2.5"/>
          <path d="M450 227L468 257H432Z" fill="none" stroke="#ffc96f" strokeWidth="3.5"/>
          <text x="450" y="412" textAnchor="middle" fill="#f6d0a0" fontSize="14" fontWeight="900">الجهتان تومضان معاً</text>
        </g>}

        {mode === 'rearFog' && <g>
          <path d="M385 328L330 450L442 450Z" fill="#ff4e5b" fillOpacity=".08" filter="url(#currentBlur18)"/>
          <path d="M515 328L570 450L458 450Z" fill="#ff4e5b" fillOpacity=".08" filter="url(#currentBlur18)"/>
          <ellipse cx="450" cy="350" rx="180" ry="72" fill="url(#currentRedGlow)" opacity=".18" filter="url(#currentBlur18)"/>
          <rect x="442" y="314" width="16" height="28" rx="7" fill="#ff4d59"/>
          <text x="450" y="412" textAnchor="middle" fill="#ffd0d3" fontSize="14" fontWeight="900">الضباب الخلفي · ضوء أحمر واضح للمركبة خلفك</text>
        </g>}

        {mode === 'high' && oncoming && <g>
          <ellipse cx="690" cy="142" rx="86" ry="50" fill="#fff4c8" opacity=".20" filter="url(#currentBlur18)"/>
          <image href="/spirit/car-front.svg" x="646" y="108" width="90" height="55" opacity=".96"/>
          <circle cx="675" cy="138" r="5.5" fill="#fffef0"/><circle cx="710" cy="138" r="5.5" fill="#fffef0"/>
          <rect x="42" y="48" width="354" height="66" rx="18" fill="#251617" stroke="#ff8a92" strokeOpacity=".36"/>
          <text className="scene-caption-title" x="66" y="76" fill="#ffd9dc" fontSize="18" fontWeight="900">مركبة مقابلة · خفض العالي</text>
          <text className="scene-caption-body" x="66" y="98" fill="#d5b7ba" fontSize="11">لا تبقِ الحزمة المرتفعة باتجاه عين المقابل</text>
        </g>}

        {mode === 'high' && !oncoming && <g>
          <rect x="42" y="48" width="330" height="66" rx="18" fill="#061118" stroke="#86e4da" strokeOpacity=".24"/>
          <text className="scene-caption-title" x="66" y="76" fill="#c8f2ec" fontSize="18" fontWeight="900">طريق مظلم · مدى أبعد</text>
          <text className="scene-caption-body" x="66" y="98" fill="#a7bbb9" fontSize="11">الحزمة أطول وأضيق من الضوء المنخفض</text>
        </g>}

        {mode === 'low' && <text x="450" y="412" textAnchor="middle" fill="#bcebe3" fontSize="14" fontWeight="900">حزمة قريبة ومركزة على سطح الطريق</text>}
        {mode === 'frontFog' && <text x="450" y="412" textAnchor="middle" fill="#d9e7e3" fontSize="14" fontWeight="900">الضباب يضعف التباين · الحزمة منخفضة وقريبة</text>}
        {mode === 'flash' && <g><rect x="42" y="48" width="260" height="66" rx="18" fill="#1b3028" stroke="#d7f5ec" strokeOpacity=".24"/><text className="scene-caption-title" x="66" y="76" fill="#eafff7" fontSize="18" fontWeight="900">وميض سريع</text><text className="scene-caption-body" x="66" y="98" fill="#b9d0cb" fontSize="11">ضربة ضوئية قصيرة من العالي</text></g>}
        <rect x="18" y="440" width="864" height="18" rx="9" fill="#02080b" opacity=".88"/>
      </svg>
    </div>
  );
}



function SceneExplanationRail({
  mainLight, signal, flashActive,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
  flashActive: boolean;
}) {
  const mode = signal === 'hazard' ? 'hazard' : signal ? 'signal' : flashActive ? 'flash' : mainLight;
  const items = mode === 'low' ? [
    ['01', 'مصدر الضوء', 'المصابيح الأمامية من مقدمة السيارة.'],
    ['02', 'مسار الضوء', 'حزمة قصيرة ومنخفضة تلامس سطح الطريق.'],
    ['03', 'النتيجة', 'رؤية قريبة مع تقليل الإبهار.'],
    ['04', 'احفظها', 'منخفض = قريب وموجّه للأسفل.'],
  ] : mode === 'high' ? [
    ['01', 'مصدر الضوء', 'المصابيح الأمامية من مقدمة السيارة.'],
    ['02', 'مسار الضوء', 'حزمة أطول وأعلى من المنخفض.'],
    ['03', 'شرط الاستخدام', 'طريق مظلم وخالٍ من مستخدمي الطريق المقابلين.'],
    ['04', 'احفظها', 'عند ظهور مركبة مقابلة: اخفض العالي.'],
  ] : mode === 'frontFog' ? [
    ['01', 'مصدر الضوء', 'أضواء منخفضة من مقدمة السيارة.'],
    ['02', 'مسار الضوء', 'قريب من الأرض حتى لا يتحول الضباب إلى وهج.'],
    ['03', 'المشكلة', 'الضباب يشتت الضوء ويخفض التباين.'],
    ['04', 'احفظها', 'ضباب = حزمة منخفضة + سرعة أقل.'],
  ] : mode === 'signal' ? [
    ['01', 'المصدر', 'إشارة برتقالية من الخلف في الجهة المطلوبة.'],
    ['02', 'ما الذي يحدث؟', 'وميض واضح يخبر الآخرين باتجاه المناورة.'],
    ['03', 'قبل الحركة', 'مرآة ونقطة عمياء ثم الغماز ثم الانتقال الآمن.'],
    ['04', 'احفظها', 'الغماز يعلن النية ولا يمنح أولوية.'],
  ] : mode === 'hazard' ? [
    ['01', 'المصدر', 'مصباحا الإشارة الخلفيان يعملان معاً.'],
    ['02', 'ما الذي يحدث؟', 'وميض برتقالي متزامن للجهتين.'],
    ['03', 'ماذا يفهم الآخرون؟', 'هناك حالة غير اعتيادية أو حاجة لتنبيه واضح.'],
    ['04', 'احفظها', 'الرباعي = تحذير للجهتين معاً.'],
  ] : mode === 'position' ? [
    ['01', 'المصدر', 'أضواء الموضع في مقدمة وخلف المركبة حسب التجهيز.'],
    ['02', 'الهدف', 'إظهار حدود المركبة عندما تقل الإضاءة المحيطة.'],
    ['03', 'ما لا تفعله', 'ليست بديلاً عن إنارة الطريق ليلاً.'],
    ['04', 'احفظها', 'Position = أن تُرى.'],
  ] : mode === 'rearFog' ? [
    ['01', 'المصدر', 'مصباح الضباب الخلفي الأحمر.'],
    ['02', 'الهدف', 'جعل المركبة أوضح من الخلف في الرؤية السيئة جداً.'],
    ['03', 'القاعدة', 'شدته عالية ويُوقف عند تحسن الرؤية.'],
    ['04', 'احفظها', 'ضباب خلفي = ظهور أوضح من الخلف.'],
  ] : [
    ['01', 'الحالة', 'لا توجد وظيفة إنارة مختارة.'],
    ['02', 'النتيجة', 'لا توجد حزمة ضوء من المصابيح المختارة.'],
    ['03', 'المقبض', 'الحلقة على وضع OFF.'],
    ['04', 'احفظها', 'OFF = لا إنارة مختارة من الحلقة.'],
  ];

  return (
    <div className="scene-explanation-rail" aria-label="شرح المشهد">
      <div className="scene-explanation-head">
        <div><span className="eyebrow">شرح سريع للمشهد</span><b>اسحب الشريط لعرض الفكرة خطوة بخطوة</b></div>
        <span className="scene-scroll-cue">← سكرول →</span>
      </div>
      <div className="scene-explanation-scroll">
        {items.map(([num, title, body]) => (
          <article key={num} className="scene-explanation-card">
            <span>{num}</span><div><strong>{title}</strong><p>{body}</p></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScenarioVisual({
  scenario, onActivate, isActive,
}: {
  scenario: Scenario;
  onActivate: (scenario: Scenario) => void;
  isActive: boolean;
}) {
  const [oncoming, setOncoming] = useState(scenario.id === 'high');

  const controlLabel =
    scenario.control === 'hazard' ? 'رباعي' :
    scenario.control === 'right' ? 'غماز يمين' :
    scenario.control === 'left' ? 'غماز يسار' :
    MAIN_LIGHTS.find(item => item.key === scenario.control)?.title || '';

  const canActivate = true;

  return (
    <article className={'scenario-visual scene-card-premium ' + (isActive ? 'is-active' : '')}>
      <div className="scenario-media scene-media-premium">
        <ScenarioSvg scenario={scenario} oncoming={oncoming} setOncoming={setOncoming}/>
        <span className="scenario-tag">{scenario.tag}</span>
        {isActive && <span className="scenario-active-chip">مرتبط بالمقبض الآن</span>}
      </div>

      <div className="scenario-content">
        <div className="scenario-meta">
          <span><LightIcon type={scenario.control}/>{controlLabel}</span>
          <b>مشهد خارجي · إضاءة تعليمية</b>
        </div>
        <h3>{scenario.title}</h3>
        <p>{scenario.goal}</p>
        <div className="scenario-steps">{scenario.steps.map((step, i) => <div key={step}><b>{i + 1}</b><span>{step}</span></div>)}</div>

        <div className="scenario-footer-row">
          <div className="scenario-note">{scenario.note}</div>
          {canActivate && <button type="button" className="scenario-activate" onClick={() => onActivate(scenario)}>{isActive ? 'الحالة مفعّلة' : 'جرّبها على المقبض'}</button>}
        </div>
      </div>
    </article>
  );
}

function ScenarioSvg({
  scenario, oncoming, setOncoming,
}: {
  scenario: Scenario;
  oncoming: boolean;
  setOncoming: (value: boolean) => void;
}) {
  const id = 'scenario_' + scenario.id;
  const u = (name: string) => 'url(#' + id + '_' + name + ')';

  const defs = (
    <defs>
      <linearGradient id={id + '_night'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#02070b"/><stop offset=".58" stopColor="#07151c"/><stop offset="1" stopColor="#0d252b"/></linearGradient>
      <linearGradient id={id + '_dusk'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#20383a"/><stop offset=".5" stopColor="#556963"/><stop offset="1" stopColor="#314640"/></linearGradient>
      <linearGradient id={id + '_road'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3a4d52"/><stop offset=".4" stopColor="#192b31"/><stop offset="1" stopColor="#050a0d"/></linearGradient>
      <radialGradient id={id + '_lamp'}><stop stopColor="#fffef1" stopOpacity=".95"/><stop offset=".36" stopColor="#fff0a0" stopOpacity=".48"/><stop offset="1" stopColor="#fff0a0" stopOpacity="0"/></radialGradient>
      <radialGradient id={id + '_amber'}><stop stopColor="#ffd17e" stopOpacity=".98"/><stop offset=".34" stopColor="#ffad42" stopOpacity=".44"/><stop offset="1" stopColor="#ff9a2f" stopOpacity="0"/></radialGradient>
      <radialGradient id={id + '_red'}><stop stopColor="#ff9ba0" stopOpacity=".95"/><stop offset=".32" stopColor="#ff4353" stopOpacity=".44"/><stop offset="1" stopColor="#ff3147" stopOpacity="0"/></radialGradient>
      <filter id={id + '_blur18'}><feGaussianBlur stdDeviation="18"/></filter>
      <filter id={id + '_blur7'}><feGaussianBlur stdDeviation="7"/></filter>
      <filter id={id + '_shadow'}><feDropShadow dx="0" dy="16" stdDeviation="15" floodColor="#000" floodOpacity=".52"/></filter>
    </defs>
  );

  const frame = (children: React.ReactNode) => (
    <div className="scenario-svg-frame scene-frame-premium">
      <svg className="scenario-svg" viewBox="0 0 900 470" role="img" aria-label={scenario.title}>
        {defs}
        {children}
        <rect x="18" y="440" width="864" height="18" rx="9" fill="#02080b" opacity=".90"/>
      </svg>
    </div>
  );

  const base = (dusk: boolean, rearView = false) => <>
    <rect width="900" height="470" fill={dusk ? u('dusk') : u('night')} />
    <path d="M0 470L184 132H716L900 470Z" fill={u('road')} />
    <path d="M450 138V470" stroke="#dbe7e4" strokeOpacity={rearView ? ".23" : ".18"} strokeWidth="4" strokeDasharray="29 21" />
    <path d="M292 470L355 184M608 470L545 184" stroke="#e6efec" strokeOpacity={rearView ? ".13" : ".07"} strokeWidth={rearView ? "4" : "3"} />
    {rearView && <g className="rear-direction-cues">
      <path d="M450 444L437 425H446V404H454V425H463Z" fill="#dce9e5" fillOpacity=".18"/>
      <path d="M450 389L437 370H446V350H454V370H463Z" fill="#dce9e5" fillOpacity=".12"/>
      <path d="M450 337L437 318H446V300H454V318H463Z" fill="#dce9e5" fillOpacity=".08"/>
    </g>}
  </>;

  if (scenario.id === 'low') return frame(<>
    {base(false)}
    <rect x="112" y="184" width="5" height="114" fill="#56686c"/><rect x="783" y="184" width="5" height="114" fill="#56686c"/>
    <path d="M394 329L238 274L188 470L448 352Z" fill={u('lamp')} opacity=".70" filter={u('blur7')}/>
    <path d="M506 329L662 274L712 470L452 352Z" fill={u('lamp')} opacity=".70" filter={u('blur7')}/>
    <path d="M395 329L252 278L444 348Z" fill="#fff4b8" opacity=".27"/><path d="M505 329L648 278L456 348Z" fill="#fff4b8" opacity=".27"/>
    <image href="/spirit/car-front.svg" x="327" y="246" width="246" height="123" filter={u('shadow')}/>
    <ellipse cx="396" cy="328" rx="34" ry="21" fill={u('lamp')}/><ellipse cx="504" cy="328" rx="34" ry="21" fill={u('lamp')}/>
    <rect x="42" y="42" width="302" height="64" rx="18" fill="#061117" stroke="#86e4da" strokeOpacity=".24"/>
    <text className="scene-caption-title" x="66" y="69" fill="#c8f2ec" fontSize="18" fontWeight="900">ليل مزدحم · الضوء المنخفض</text>
    <text className="scene-caption-body" x="66" y="91" fill="#a4bbb8" fontSize="11">حزمة قصيرة ومركزة قرب سطح الطريق</text>
    <text x="450" y="413" textAnchor="middle" fill="#bcece4" fontSize="14" fontWeight="900">رؤية قريبة + إبهار أقل</text>
  </>);

  if (scenario.id === 'high') return frame(<>
    {base(false)}
    <path d="M394 329L104 122L440 350Z" fill={u('lamp')} opacity=".84" filter={u('blur7')}/>
    <path d="M506 329L796 122L460 350Z" fill={u('lamp')} opacity=".84" filter={u('blur7')}/>
    <path d="M395 329L116 128L438 348Z" fill="#fff4b8" opacity=".34"/><path d="M505 329L784 128L462 348Z" fill="#fff4b8" opacity=".34"/>
    <image href="/spirit/car-front.svg" x="327" y="246" width="246" height="123" filter={u('shadow')}/>
    <ellipse cx="396" cy="328" rx="38" ry="23" fill={u('lamp')}/><ellipse cx="504" cy="328" rx="38" ry="23" fill={u('lamp')}/>
    {!oncoming ? <g>
      <rect x="42" y="42" width="305" height="64" rx="18" fill="#061117" stroke="#86e4da" strokeOpacity=".24"/>
      <text className="scene-caption-title" x="66" y="69" fill="#c8f2ec" fontSize="18" fontWeight="900">طريق خارجي · الضوء العالي</text>
      <text className="scene-caption-body" x="66" y="91" fill="#a4bbb8" fontSize="11">مدى أبعد عندما يكون الطريق خالياً</text>
    </g> : <g>
      <ellipse cx="692" cy="138" rx="84" ry="50" fill="#fff4cc" opacity=".20" filter={u('blur18')}/>
      <image href="/spirit/car-front.svg" x="648" y="108" width="88" height="55"/>
      <circle cx="674" cy="137" r="5" fill="#fffef0"/><circle cx="709" cy="137" r="5" fill="#fffef0"/>
      <rect x="42" y="42" width="362" height="64" rx="18" fill="#251617" stroke="#ff8c94" strokeOpacity=".34"/>
      <text className="scene-caption-title" x="66" y="69" fill="#ffdadd" fontSize="18" fontWeight="900">مركبة مقابلة · اخفض العالي</text>
      <text className="scene-caption-body" x="66" y="91" fill="#d5b8bc" fontSize="11">لا تبقِ الحزمة المرتفعة باتجاه المقابل</text>
    </g>}
  </>);

  if (scenario.id === 'fog') return frame(<>
    {base(true)}
    <g opacity=".18">
      <rect x="0" y="84" width="900" height="52" fill="#f2f7f4"/><rect x="0" y="165" width="900" height="47" fill="#f2f7f4"/><rect x="0" y="245" width="900" height="38" fill="#f2f7f4"/>
      <circle cx="120" cy="115" r="29" fill="#fff"/><circle cx="288" cy="194" r="22" fill="#fff"/><circle cx="690" cy="151" r="31" fill="#fff"/><circle cx="792" cy="216" r="24" fill="#fff"/>
    </g>
    <path d="M394 329L260 298L196 470L446 353Z" fill={u('lamp')} opacity=".44" filter={u('blur7')}/>
    <path d="M506 329L640 298L704 470L454 353Z" fill={u('lamp')} opacity=".44" filter={u('blur7')}/>
    <image href="/spirit/car-front.svg" x="327" y="246" width="246" height="123" filter={u('shadow')}/>
    <ellipse cx="396" cy="328" rx="40" ry="22" fill={u('lamp')} opacity=".62"/><ellipse cx="504" cy="328" rx="40" ry="22" fill={u('lamp')} opacity=".62"/>
    <rect x="42" y="42" width="330" height="64" rx="18" fill="#e5efeb" fillOpacity=".10" stroke="#eff7f3" strokeOpacity=".22"/>
    <text className="scene-caption-title" x="66" y="69" fill="#edf6f3" fontSize="18" fontWeight="900">ضباب كثيف · حزمة منخفضة</text>
    <text className="scene-caption-body" x="66" y="91" fill="#c4d2ce" fontSize="11">لا تجعل الضوء المرتفع يتحول إلى جدار وهج</text>
  </>);

  if (scenario.id === 'position') return frame(<>
    {base(true, true)}
    <circle cx="758" cy="90" r="68" fill="#f1e7b9" opacity=".18"/>
    <image href="/spirit/car-rear.svg" x="302" y="232" width="296" height="148" filter={u('shadow')}/>
    <ellipse cx="385" cy="327" rx="48" ry="28" fill={u('red')} opacity=".22"/><ellipse cx="515" cy="327" rx="48" ry="28" fill={u('red')} opacity=".22"/>
    <rect x="42" y="42" width="316" height="64" rx="18" fill="#152221" stroke="#dce8b5" strokeOpacity=".24"/>
    <text className="scene-caption-title" x="66" y="69" fill="#ecf3d6" fontSize="18" fontWeight="900">غسق · أضواء الموضع</text>
    <text className="scene-caption-body" x="66" y="91" fill="#c0c9b7" fontSize="11">الهدف: أن تُرى المركبة وحدودها</text>
    <text x="450" y="413" textAnchor="middle" fill="#e2e9d4" fontSize="14" fontWeight="900">ضوء حضور، وليس ضوء طريق بعيد</text>
  </>);

  if (scenario.id === 'signals') return frame(<>
    {base(false, true)}
    <path d="M450 138V470" stroke="#eef5f2" strokeOpacity=".20" strokeWidth="12" strokeDasharray="34 20"/>
    <image href="/spirit/car-rear.svg" x="324" y="245" width="252" height="126" filter={u('shadow')}/>
    <ellipse cx="385" cy="327" rx="54" ry="31" fill={u('amber')} opacity=".96"/><ellipse cx="515" cy="327" rx="54" ry="31" fill={u('amber')} opacity=".12"/>
    <circle cx="385" cy="327" r="14" fill="#ffc66e"/>
    <path d="M398 312L365 300" fill="none" stroke="#efb05e" strokeOpacity=".24" strokeWidth="10" strokeLinecap="round"/>
    <rect x="42" y="42" width="350" height="64" rx="18" fill="#061117" stroke="#86e4da" strokeOpacity=".24"/>
    <text className="scene-caption-title" x="66" y="69" fill="#c8f2ec" fontSize="18" fontWeight="900">تقاطع · الغماز قبل الحركة</text>
    <text className="scene-caption-body" x="66" y="91" fill="#a6bbb9" fontSize="11">السائقون خلفك يرون الإشارة قبل الانعطاف</text>
  </>);

  if (scenario.id === 'hazard') return frame(<>
    {base(false, true)}
    <image href="/spirit/car-rear.svg" x="302" y="232" width="296" height="148" filter={u('shadow')}/>
    <g className="scene-hazard-lamps">
      <ellipse cx="385" cy="327" rx="54" ry="31" fill={u('amber')} opacity=".96"/>
      <ellipse cx="515" cy="327" rx="54" ry="31" fill={u('amber')} opacity=".96"/>
      <circle cx="385" cy="327" r="14" fill="#ffc66e"/>
      <circle cx="515" cy="327" r="14" fill="#ffc66e"/>
    </g>
    <circle cx="450" cy="244" r="31" fill="#ffb24d" opacity=".05" stroke="#ffc96f" strokeOpacity=".28" strokeWidth="2.5"/>
    <path d="M450 227L468 257H432Z" fill="none" stroke="#ffc96f" strokeWidth="3.5"/>
    <rect x="42" y="42" width="350" height="64" rx="18" fill="#251b10" stroke="#f1bd74" strokeOpacity=".30"/>
    <text className="scene-caption-title" x="66" y="69" fill="#f4d4ab" fontSize="18" fontWeight="900">كتف الطريق · التحذير الرباعي</text>
    <text className="scene-caption-body" x="66" y="91" fill="#d0b493" fontSize="11">الجهتان تعملان معاً لإظهار الحالة غير الاعتيادية</text>
  </>);

  return frame(<>
    {base(false, true)}
    <image href="/spirit/car-rear.svg" x="324" y="245" width="252" height="126" filter={u('shadow')}/>
    <path d="M385 328L330 450L442 450Z" fill="#ff4e5b" fillOpacity=".08" filter={u('blur18')}/>
    <path d="M515 328L570 450L458 450Z" fill="#ff4e5b" fillOpacity=".08" filter={u('blur18')}/>
    <ellipse cx="450" cy="350" rx="180" ry="72" fill={u('red')} opacity=".18" filter={u('blur18')}/>
    <rect x="442" y="314" width="16" height="28" rx="7" fill="#ff525d"/>
    <rect x="42" y="42" width="370" height="64" rx="18" fill="#241417" stroke="#ff8c94" strokeOpacity=".30"/>
    <text className="scene-caption-title" x="66" y="69" fill="#ffd9dc" fontSize="18" fontWeight="900">ضباب خلفي · ضوء أحمر واضح</text>
    <text className="scene-caption-body" x="66" y="91" fill="#d5b8bc" fontSize="11">يُظهر المركبة من الخلف عندما تكون الرؤية سيئة جداً</text>
    <text x="450" y="413" textAnchor="middle" fill="#ffd0d3" fontSize="14" fontWeight="900">أحمر قوي من الخلف · أوقفه عند تحسن الرؤية</text>
  </>);
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
  const [flashActive, setFlashActive] = useState(false);
  const [flashCount, setFlashCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [oncoming, setOncoming] = useState(true);
  const [sceneFocusActive, setSceneFocusActive] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const simulatorLayoutRef = useRef<HTMLDivElement | null>(null);
  const vehicleLabRef = useRef<HTMLElement | null>(null);
  const restoreScrollRef = useRef<number | null>(null);
  const restoreTimerRef = useRef<number | null>(null);
  const hazardSoundTimerRef = useRef<number | null>(null);

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
      if (restoreTimerRef.current !== null) window.clearTimeout(restoreTimerRef.current);
      if (hazardSoundTimerRef.current !== null) window.clearInterval(hazardSoundTimerRef.current);
      restoreTimerRef.current = null;
      hazardSoundTimerRef.current = null;
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

  const stopHazardSoundLoop = () => {
    if (hazardSoundTimerRef.current !== null) {
      window.clearInterval(hazardSoundTimerRef.current);
      hazardSoundTimerRef.current = null;
    }
  };

  const chooseMain = (key: MainLightKey) => {
    playClick();
    stopHazardSoundLoop();
    setMainLight(key); setSignal(null); setFlashActive(false);
    setMovement(key === 'high' ? 'push' : 'ring');
    setMobileSheetOpen(true);
    setOncoming(key === 'high');
  };

  const playHazardSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = audioRef.current || new AudioCtor();
      audioRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      [740, 540].forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(frequency, now + index * 0.11);
        gain.gain.setValueAtTime(0.0001, now + index * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.045, now + index * 0.11 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.075);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.11);
        osc.stop(now + index * 0.11 + 0.09);
      });
    } catch {
      // Audio enhancement only.
    }
  };

  const chooseSignal = (key: SignalKey) => {
    playClick();
    stopHazardSoundLoop();
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
    if (key === 'hazard') {
      playHazardSound();
      hazardSoundTimerRef.current = window.setInterval(() => {
        if (soundEnabled) playHazardSound();
      }, 900);
    }
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

            <div ref={simulatorLayoutRef} className={"simulator-layout " + (sceneFocusActive ? "scene-focus-active" : "")}>
              <ControlPanel group={controlGroup} setGroup={setControlGroup} mainLight={mainLight} signal={signal} flashActive={flashActive} onMain={chooseMain} onSignal={chooseSignal} onFlash={triggerFlash}/>
              <CockpitHandle mainLight={mainLight} signal={signal} movement={movement} onRingCycle={cycleRing} onLever={applyLever} onHazard={() => chooseSignal('hazard')}/>
            </div>

            <div className="result-heading"><span>03</span><div><b>شاهد الأثر على السيارة</b><small>السيارة من الجهة الصحيحة، والضوء يُرسم من مصدره باتجاه الطريق.</small></div></div>

            <section ref={vehicleLabRef} className={"vehicle-lab " + (sceneFocusActive ? "scene-focus-active" : "")}>
              <div className="vehicle-lab-head"><div><span className="eyebrow">النتيجة التعليمية</span><h3>{currentTitle}</h3><p>مشهد خارجي يوضح موضع الضوء واتجاهه على الطريق أو خلف السيارة.</p></div></div>
              {mainLight === 'high' && <button type="button" className="inline-scene-control" onClick={() => setOncoming(!oncoming)}>{oncoming ? 'السيارة المقابلة ظاهرة' : 'أظهر سيارة مقابلة'}</button>}
              <CurrentScene mainLight={mainLight} signal={signal} flashActive={flashActive} oncoming={oncoming} setOncoming={setOncoming}/>
              <SceneExplanationRail mainLight={mainLight} signal={signal} flashActive={flashActive}/>
            </section>

            <div className="safety-note"><b>مهم</b><span>المقبض الفعلي وترتيب الوظائف يختلفان بحسب الشركة والموديل. هذه الصفحة تشرح الفكرة الشائعة للتدريب ولا تستبدل دليل سيارة محددة.</span></div>
          </section>

          {mobileSheetOpen && <div className="mobile-explanation" role="dialog" aria-label="شرح الوظيفة المختارة"><button type="button" aria-label="إغلاق الشرح" onClick={() => setMobileSheetOpen(false)}>×</button><ExplanationCard title={currentTitle} item={currentItem} signal={activeSignal}/></div>}

          <section id="scenes" className="scenes-section">
            <div className="section-title scenes-title"><div><span className="eyebrow">المشاهد التدريبية</span><h2>مشهد واحد لكل قاعدة، بإضاءة مختلفة فعلاً.</h2><p>الأمام للمنخفض والعالي والضباب، والخلف للموضع والغماز والرباعي والفرامل والرجوع.</p></div></div>
  <div className="scenario-grid">{SCENARIOS.map(scenario => {
    const active = (
      scenario.control === 'hazard' ? signal === 'hazard'
      : scenario.control === 'right' ? signal === 'right'
      : scenario.control === 'left' ? signal === 'left'
      : mainLight === scenario.control && !signal && !flashActive
    );
    return <ScenarioVisual key={scenario.id} scenario={scenario} isActive={active} onActivate={handleScenarioActivate}/>;
  })}</div>
          </section>

          <AutomaticLights/>
        </section>

        <footer className="page-footer-note"><b>تذكّر</b><span>الأيقونة تساعدك على الحفظ، لكن دليل السيارة وقواعد الطريق هما المرجع عند قيادة مركبة محددة.</span></footer>
      </main>
    </div>
  );
}
