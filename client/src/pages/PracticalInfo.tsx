import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type MainLightKey =
  | 'off'
  | 'position'
  | 'auto'
  | 'low'
  | 'high'
  | 'frontFog'
  | 'rearFog';

type SignalKey = 'left' | 'right' | 'hazard';
type TabKey = 'practice' | 'scenarios' | 'automatic';
type ControlGroup = 'ring' | 'lever';
type VehicleView = 'front' | 'rear';

type LightItem = {
  key: MainLightKey | 'flash';
  title: string;
  subtitle: string;
  symbol: 'off' | 'position' | 'auto' | 'low' | 'high' | 'frontFog' | 'rearFog' | 'flash';
  action: string;
  use: string;
  caution: string;
};

const MAIN_LIGHTS: LightItem[] = [
  { key: 'off', title: 'إيقاف', subtitle: 'OFF', symbol: 'off', action: 'لف حلقة الإنارة إلى OFF.', use: 'وضع الحلقة الأساسي. قد تبقى بعض الإنارة النهارية أو الوظائف التلقائية حسب تجهيز السيارة.', caution: 'لا تفترض أن OFF يطفئ كل أضواء السيارة في كل طراز.' },
  { key: 'position', title: 'أضواء الموضع', subtitle: 'POSITION', symbol: 'position', action: 'لف الحلقة إلى رمز أضواء الموضع.', use: 'تجعل المركبة وحدودها أوضح في الإضاءة المحيطة الضعيفة، لكنها ليست بديلاً عن إنارة الطريق.', caution: 'عندما تحتاج رؤية الطريق بوضوح لا تعتمد عليها وحدها.' },
  { key: 'auto', title: 'أوتوماتيك', subtitle: 'AUTO', symbol: 'auto', action: 'لف الحلقة إلى AUTO إذا كانت السيارة مجهزة به.', use: 'تترك للنظام قرار تشغيل المصابيح وفق الحساسات والتجهيز الموجود.', caution: 'AUTO يختلف من سيارة لأخرى وقد لا يتحكم بكل وظائف الإنارة.' },
  { key: 'low', title: 'الضوء المنخفض', subtitle: 'LOW BEAM', symbol: 'low', action: 'لف الحلقة إلى رمز الضوء المنخفض.', use: 'إنارة أساسية للطريق أمامك مع حزمة موجهة للأسفل لتقليل إبهار الآخرين.', caution: 'اختيار الضوء وحده لا يكفي؛ السرعة والرؤية وحالة الطريق مهمة أيضاً.' },
  { key: 'high', title: 'الضوء العالي', subtitle: 'HIGH BEAM', symbol: 'high', action: 'ادفع الذراع للأمام في الأنظمة التي تستخدم هذه الحركة للعالي.', use: 'لرؤية أبعد عندما يكون الطريق مناسباً ولا يوجد مستخدم طريق قد يتأذى من الضوء.', caution: 'عند ظهور مركبة أو احتمال إبهار مستخدم طريق، اخفض العالي.' },
  { key: 'frontFog', title: 'ضباب أمامي', subtitle: 'FRONT FOG', symbol: 'frontFog', action: 'فعّل الضباب الأمامي إذا كانت السيارة مجهزة به.', use: 'للظروف التي تصبح فيها الرؤية صعبة عندما تكون وظيفة الضباب مناسبة للتجهيز والطريق.', caution: 'المصباح لا يعوض عن خفض السرعة وزيادة مسافة الأمان.' },
  { key: 'rearFog', title: 'ضباب خلفي', subtitle: 'REAR FOG', symbol: 'rearFog', action: 'فعّل الضباب الخلفي عند الحاجة وفي السيارة المجهزة به.', use: 'يجعل المركبة أوضح لمن خلفك عندما تكون الرؤية سيئة جداً.', caution: 'ضوءه قوي؛ أوقفه عندما تتحسن الرؤية.' },
];

const RING_LIGHTS = MAIN_LIGHTS.filter(item => item.key !== 'high');
const FLASH_ITEM: LightItem = {
  key: 'flash',
  title: 'وميض العالي',
  subtitle: 'FLASH',
  symbol: 'flash',
  action: 'اسحب الذراع باتجاهك لحظياً في الأنظمة التي تستخدم هذه الحركة.',
  use: 'ومضة سريعة من الضوء العالي بدلاً من إبقائه مفعلاً.',
  caution: 'حركة المقبض تختلف بين السيارات؛ هذه محاكاة تعليمية للفكرة الشائعة.',
};

const SIGNALS = [
  { key: 'right' as const, title: 'غماز يمين', subtitle: 'UP ↑', symbol: 'right' as const, action: 'ارفع الذراع للأعلى.', use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليمين قبل المناورة.', caution: 'مثال: افحص الطريق والمسار ثم استخدم الغماز قبل الخروج أو الانعطاف.' },
  { key: 'left' as const, title: 'غماز يسار', subtitle: 'DOWN ↓', symbol: 'left' as const, action: 'اخفض الذراع للأسفل.', use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليسار قبل المناورة.', caution: 'مثال: مرآة → نقطة عمياء → غماز → انتقال تدريجي عندما يكون آمناً.' },
  { key: 'hazard' as const, title: 'التحذير الرباعي', subtitle: 'HAZARD', symbol: 'hazard' as const, action: 'اضغط زر التحذير الرباعي المنفصل.', use: 'لإظهار تحذير متزامن للاتجاهين عند الحاجة بسبب حالة المركبة أو الطريق.', caution: 'مثال: توقف اضطراري أو مركبة متوقفة في موضع قد يشكل خطراً.' },
];

const AUTOMATIC_LIGHTS = [
  { key: 'drl', title: 'أضواء النهار', subtitle: 'DRL', description: 'قد تعمل تلقائياً أثناء النهار في السيارات المجهزة بها، وليست بالضرورة وظيفة مستقلة على المقبض.', icon: 'sun' as const },
  { key: 'brake', title: 'أضواء الفرامل', subtitle: 'STOP', description: 'تعمل عند ضغط دواسة الفرامل، لذلك تتعرف عليها من حالة السيارة وليس من وضع المقبض.', icon: 'brake' as const },
  { key: 'reverse', title: 'ضوء الرجوع', subtitle: 'REVERSE', description: 'يعمل عند اختيار الرجوع للخلف في المركبة المجهزة به، ويختلف تصميمه من سيارة لأخرى.', icon: 'reverse' as const },
];

const SCENARIOS = [
  { id: 'roundabout-right', tag: 'دوّار', title: 'الخروج من الدوّار إلى اليمين', control: 'right' as const, goal: 'الإشارة تأتي ضمن مناورة كاملة وليست بديلاً عن فحص الطريق.', sequence: ['راقب المرآة والمسار', 'حدد المخرج', 'غماز اليمين عند الحاجة', 'اخرج ضمن المسار'], note: 'الرسم يشرح الفكرة بصرياً؛ تخطيط الطريق والشواخص وحالة المرور هي المرجع الفعلي.', diagram: 'roundabout' },
  { id: 'lane-change', tag: 'تغيير مسار', title: 'الانتقال إلى المسار الأيسر', control: 'left' as const, goal: 'اربط غماز اليسار بتسلسل الفحص وليس كإذن للانتقال.', sequence: ['مرآة', 'نقطة عمياء', 'غماز يسار', 'انتقال تدريجي'], note: 'الغماز يخبر الآخرين بنيتك ولا يمنحك أولوية وحده.', diagram: 'lane-left' },
  { id: 'night-oncoming', tag: 'قيادة ليلاً', title: 'مركبة مقابلة على طريق مظلم', control: 'low' as const, goal: 'عندما يظهر مستخدم طريق مقابل، تتحول من العالي إلى المنخفض.', sequence: ['لاحظ المركبة المقابلة', 'أوقف العالي', 'انتقل للمنخفض', 'حافظ على سرعة مناسبة'], note: 'الهدف رؤية الطريق بدون إبهار الطرف المقابل.', diagram: 'oncoming' },
  { id: 'empty-road', tag: 'طريق مظلم', title: 'طريق خالٍ ورؤية تحتاج مدى أبعد', control: 'high' as const, goal: 'العالي يفيد عندما يكون المجال أمامك مناسباً وخالياً من مستخدمي الطريق.', sequence: ['تحقق من خلو الطريق', 'فعّل العالي', 'راقب المدى', 'اخفضه عند ظهور مستخدم طريق'], note: 'هذا مثال تدريبي يفترض أن الطريق يسمح باستخدام العالي.', diagram: 'open-road' },
  { id: 'fog', tag: 'ضباب', title: 'ضباب كثيف ومدى رؤية منخفض', control: 'frontFog' as const, goal: 'الرؤية الضعيفة تعني إنارة مناسبة وسرعة أقل ومسافة توقف أكبر.', sequence: ['خفف السرعة', 'اختر الإنارة المناسبة', 'فعّل الضباب إن كانت السيارة مجهزة', 'راقب مسافة التوقف'], note: 'المصباح لا يعوض عن خفض السرعة عندما تقل الرؤية.', diagram: 'fog' },
  { id: 'hazard-stop', tag: 'توقف اضطراري', title: 'مركبة متوقفة في موضع خطر', control: 'hazard' as const, goal: 'تمييز التحذير الرباعي عن غماز الانعطاف.', sequence: ['توقف بأمان قدر الإمكان', 'اجعل المركبة واضحة', 'فعّل التحذير عند الحاجة', 'اتخذ الإجراء الآمن التالي'], note: 'التحذير الرباعي حالة مختلفة عن الإشارة عند الانعطاف.', diagram: 'hazard' },
  { id: 'turn-right', tag: 'تقاطع', title: 'انعطاف يمين', control: 'right' as const, goal: 'ثبّت التسلسل: مرآة → غماز → تموضع → مناورة.', sequence: ['افحص المرآة', 'استخدم غماز اليمين', 'تموضع صحيح', 'انعطف بأمان'], note: 'الإشارة وسيلة تنبيه ولا تغني عن مراقبة الطريق.', diagram: 'turn-right' },
  { id: 'rear-fog', tag: 'رؤية شديدة السوء', title: 'استخدام الضباب الخلفي', control: 'rearFog' as const, goal: 'فهم وظيفة الضباب الخلفي من منظور السائق خلفك.', sequence: ['تحقق من سوء الرؤية', 'فعّل الضباب الخلفي عند الحاجة', 'راقب السائقين خلفك', 'أوقفه عند تحسن الرؤية'], note: 'الضباب الخلفي شديد السطوع ويستخدم عندما تكون الحاجة واضحة.', diagram: 'rear-fog' },
  { id: 'park-night', tag: 'وقوف ليلاً', title: 'مركبة متوقفة وتحتاج أن تكون واضحة', control: 'position' as const, goal: 'تمييز إنارة الموضع عن إنارة الطريق.', sequence: ['اختر مكان الوقوف الآمن', 'استخدم إنارة الموضع إذا لزم', 'اجعل المركبة واضحة', 'لا تعتمد عليها لإنارة الطريق'], note: 'التشغيل الفعلي يعتمد أيضاً على قواعد المكان وتجهيز السيارة.', diagram: 'park' },
  { id: 'overtake', tag: 'تجاوز', title: 'بدء مناورة تجاوز', control: 'left' as const, goal: 'الإشارة جزء من المناورة وليست المناورة نفسها.', sequence: ['تأكد من السماح بالتجاوز', 'مرآة ونقطة عمياء', 'غماز مناسب', 'نفّذ المناورة عندما تكون آمنة'], note: 'قرار التجاوز يعتمد على الطريق والرؤية والأنظمة المرورية.', diagram: 'overtake' },
];

function LightSymbol({
  type,
  className = '',
}: {
  type: LightItem['symbol'] | 'left' | 'right' | 'hazard' | 'sun' | 'brake' | 'reverse';
  className?: string;
}) {
  const stroke = 'currentColor';
  if (type === 'off') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><circle cx="42" cy="32" r="10" fill="none" stroke={stroke} strokeWidth="3" /><path d="M22 32H12M72 32H88M42 12V4M42 52V60" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'position') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 18h23c8 0 13 6 15 14H10V18Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M62 16v32M74 19v26M86 23v18" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'auto') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><circle cx="43" cy="32" r="11" fill="none" stroke={stroke} strokeWidth="3" /><path d="M43 10v-5M43 59v-5M20 32h-7M73 32h-7M27 16l-4-4M63 48l-4-4M27 48l-4 4M63 16l4-4" stroke={stroke} strokeWidth="3" strokeLinecap="round" /><text x="79" y="38" fill={stroke} fontSize="13" fontWeight="900">A</text></svg>;
  if (type === 'low') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="m62 18 24 8M62 29l24 8M62 40l18 6" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'high') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M62 12h28M62 23h28M62 34h28M62 45h28" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'frontFog' || type === 'rearFog') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 12h23c8 0 14 7 16 19H10V12Z" fill="none" stroke={stroke} strokeWidth="3" /><path d={type === 'frontFog' ? 'm62 15 23 8M62 27h27M62 39 85 31' : 'm62 15-23 8M62 27H35M62 39 39 31'} stroke={stroke} strokeWidth="3" strokeLinecap="round" /><path d="M87 8c-8 7 8 10 0 17s8 11 0 20" fill="none" stroke={stroke} strokeWidth="2.5" /></svg>;
  if (type === 'flash') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M65 10h21M65 23h28M65 36h21M65 49h28" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'left' || type === 'right') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d={type === 'right' ? 'M15 32h57M58 14l21 18-21 18' : 'M85 32H28M42 14 21 32l21 18'} fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'hazard') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M50 8 90 54H10Z" fill="none" stroke={stroke} strokeWidth="4" strokeLinejoin="round" /><path d="M50 24v14M50 44v2" stroke={stroke} strokeWidth="4" strokeLinecap="round" /></svg>;
  if (type === 'sun') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><circle cx="50" cy="32" r="10" fill="none" stroke={stroke} strokeWidth="3" /><path d="M50 8v8M50 48v8M26 32h-8M82 32h-8M33 15l-6-6M73 49l-6-6M33 49l-6 6M73 15l6-6" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'brake') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><rect x="18" y="17" width="64" height="30" rx="10" fill="none" stroke={stroke} strokeWidth="3" /><rect x="26" y="23" width="18" height="18" rx="5" fill={stroke} opacity=".8" /><rect x="56" y="23" width="18" height="18" rx="5" fill={stroke} opacity=".8" /></svg>;
  return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><rect x="18" y="18" width="64" height="28" rx="10" fill="none" stroke={stroke} strokeWidth="3" /><path d="m30 32 8-7 9 14 8-10 9 7" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function HandleIllustration({ mainLight, movement }: { mainLight: MainLightKey; movement: 'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard' }) {
  const focus =
    movement === 'hazard'
      ? 'زر التحذير'
      : movement === 'left'
        ? 'غماز يسار'
        : movement === 'right'
          ? 'غماز يمين'
          : movement === 'push'
            ? 'الضوء العالي'
            : movement === 'pull'
              ? 'وميض العالي'
              : MAIN_LIGHTS.find(item => item.key === mainLight)?.title || 'الإنارة';

  return (
    <section className="handle-simulator">
      <div className="handle-simulator-head">
        <div>
          <span className="mini-eyebrow">الخطوة 2 · المقبض الحقيقي</span>
          <h3>شوف القطعة كاملة قبل ما تحفظ الحركة</h3>
          <p><b>الحلقة</b> تختار وظائف الإنارة، <b>الذراع</b> للغماز والعالي/الوميض، وزر مستقل للتحذير.</p>
        </div>
        <div className="handle-current"><small>المحدد الآن</small><strong>{focus}</strong></div>
      </div>

      <div className="handle-photo-stage">
        <img
          src="/spirit/stalk-lighting.svg"
          className="handle-photo"
          alt="مقبض الإضاءة والغمازات مع اتجاهات الحركة"
        />
        <div className="handle-hotspot ring" aria-hidden="true"><span>الحلقة</span></div>
        <div className="handle-hotspot lever" aria-hidden="true"><span>الذراع</span></div>
        <div className="handle-hotspot warning" aria-hidden="true"><span>⚠</span></div>
        <div className="handle-photo-caption">
          <b>{focus}</b>
          <span>راقب مكان الحركة أولاً، ثم انظر إلى النتيجة على السيارة.</span>
        </div>
      </div>

      <div className="handle-legend">
        <div><b>①</b><span>الحلقة</span><small>تدور لاختيار الإنارة</small></div>
        <div><b>②</b><span>الذراع</span><small>↑ ↓ للغماز · دفع/سحب للعالي والوميض</small></div>
        <div><b>③</b><span>زر التحذير</span><small>وظيفة مستقلة عن حركة الغماز</small></div>
      </div>
    </section>
  );
}

function VehicleScene({
  mainLight,
  signal,
  flashActive,
  view,
  setView,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
  flashActive: boolean;
  view: VehicleView;
  setView: (view: VehicleView) => void;
}) {
  const title = signal === 'right'
    ? 'غماز يمين'
    : signal === 'left'
      ? 'غماز يسار'
      : signal === 'hazard'
        ? 'تحذير رباعي'
        : flashActive
          ? 'وميض العالي'
          : MAIN_LIGHTS.find(item => item.key === mainLight)?.title || 'إضاءة';

  const stageClass = [
    'vehicle-scene',
    'vehicle-' + view,
    'vehicle-light-' + mainLight,
    signal ? 'vehicle-signal-' + signal : '',
    flashActive ? 'vehicle-flash' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className={stageClass}>
      <div className="vehicle-head">
        <div>
          <span className="mini-eyebrow">الخطوة 3 · النتيجة</span>
          <h3>{title}</h3>
          <p>{view === 'front' ? 'هذا ما تراه أمامك بعد اختيار الحركة.' : 'هذا ما يجب أن يراه السائق خلفك.'}</p>
        </div>
        <div className="vehicle-view-toggle" role="tablist" aria-label="منظر السيارة">
          <button type="button" className={view === 'front' ? 'active' : ''} onClick={() => setView('front')}>الأمام</button>
          <button type="button" className={view === 'rear' ? 'active' : ''} onClick={() => setView('rear')}>الخلف</button>
        </div>
      </div>

      <div className="vehicle-stage">
        <div className="vehicle-road-shape" />
        <div className="vehicle-light-label">{view === 'front' ? 'شاهد أين يصل الضوء' : 'شاهد أين تظهر الإشارة'}</div>
        <img src="/spirit/car-front-sport.svg" className="vehicle-car vehicle-car-front" alt="" aria-hidden="true" />
        <img src="/spirit/car-rear.svg" className="vehicle-car vehicle-car-rear" alt="" aria-hidden="true" />

        <span className="vehicle-beam vehicle-beam-left" />
        <span className="vehicle-beam vehicle-beam-right" />
        <span className="vehicle-fog vehicle-fog-left" />
        <span className="vehicle-fog vehicle-fog-right" />
        <span className="vehicle-signal-l signal-l-front" />
        <span className="vehicle-signal-r signal-r-front" />
        <span className="vehicle-signal-l signal-l-rear" />
        <span className="vehicle-signal-r signal-r-rear" />
        <span className="vehicle-rear-fog-light rear-fog-light-l" />
        <span className="vehicle-rear-fog-light rear-fog-light-r" />

        <div className="vehicle-stage-legend">
          <span><i className="legend-light" />إنارة</span>
          <span><i className="legend-amber" />إشارة</span>
        </div>
      </div>

      <div className="vehicle-rule">
        <span>قاعدة حفظ</span>
        <strong>{view === 'front' ? 'أمام السيارة = أرى الطريق + أرى الإشارة الأمامية.' : 'خلف السيارة = أجعل مركبتي واضحة للآخرين + تظهر الإشارة الخلفية.'}</strong>
      </div>
    </section>
  );
}

function ControlSelector({
  group,
  setGroup,
  mainLight,
  signal,
  flashActive,
  onMain,
  onSignal,
  onFlash,
}: {
  group: ControlGroup;
  setGroup: (group: ControlGroup) => void;
  mainLight: MainLightKey;
  signal: SignalKey | null;
  flashActive: boolean;
  onMain: (key: MainLightKey) => void;
  onSignal: (key: SignalKey) => void;
  onFlash: () => void;
}) {
  return (
    <section className="controls-card">
      <div className="controls-head">
        <div>
          <span className="mini-eyebrow">الخطوة 1 · اختَر الحركة</span>
          <h3>اختَر الشيء الذي تريد تعلّمه فقط</h3>
          <p>قسمنا الوظائف حتى ما تشوف كل الأزرار دفعة واحدة.</p>
        </div>
      </div>

      <div className="control-mode-switch">
        <button type="button" className={group === 'ring' ? 'active' : ''} onClick={() => setGroup('ring')}>① حلقة الإنارة</button>
        <button type="button" className={group === 'lever' ? 'active' : ''} onClick={() => setGroup('lever')}>② الذراع</button>
      </div>

      {group === 'ring' ? (
        <div className="choice-list">
          {RING_LIGHTS.map(item => (
            <button
              key={item.key}
              type="button"
              className={mainLight === item.key && !signal && !flashActive ? 'selected' : ''}
              onClick={() => onMain(item.key)}
            >
              <span className="choice-icon"><LightSymbol type={item.symbol} /></span>
              <span className="choice-copy"><b>{item.title}</b><small>{item.subtitle}</small></span>
              <span className="choice-check">✓</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="choice-list lever-choice-list">
          <button type="button" className={signal === 'right' ? 'selected' : ''} onClick={() => onSignal('right')}><span className="lever-big">↑</span><span className="choice-copy"><b>غماز يمين</b><small>ارفع الذراع</small></span><span className="choice-check">✓</span></button>
          <button type="button" className={signal === 'left' ? 'selected' : ''} onClick={() => onSignal('left')}><span className="lever-big">↓</span><span className="choice-copy"><b>غماز يسار</b><small>اخفض الذراع</small></span><span className="choice-check">✓</span></button>
          <button type="button" className={mainLight === 'high' && !flashActive ? 'selected' : ''} onClick={() => onMain('high')}><span className="lever-big">→</span><span className="choice-copy"><b>الضوء العالي</b><small>ادفع الذراع</small></span><span className="choice-check">✓</span></button>
          <button type="button" className={flashActive ? 'selected' : ''} onClick={onFlash}><span className="lever-big">←</span><span className="choice-copy"><b>وميض العالي</b><small>اسحب لحظياً</small></span><span className="choice-check">✓</span></button>
        </div>
      )}

      <button type="button" className={signal === 'hazard' ? 'hazard-action selected' : 'hazard-action'} onClick={() => onSignal('hazard')}>
        <span className="hazard-symbol">△</span>
        <span><b>التحذير الرباعي</b><small>زر مستقل</small></span>
      </button>
    </section>
  );
}

function ScenarioDiagram({ kind }: { kind: string }) {
  const road = (
    <>
      <rect width="800" height="360" fill="url(#sceneBg)" />
      <path d="M0 360 175 108h450L800 360Z" fill="#18313a" />
      <path d="M0 360h800" stroke="#071116" strokeWidth="13" />
      <path d="M400 112v248" stroke="#d7e3e4" strokeOpacity=".33" strokeWidth="4" strokeDasharray="20 18" />
      <path d="M238 360 300 112M562 360 500 112" stroke="#dce9ea" strokeOpacity=".10" strokeWidth="3" />
      <circle cx="92" cy="72" r="34" fill="#193740" opacity=".7" />
      <circle cx="92" cy="72" r="20" fill="#284e56" opacity=".4" />
    </>
  );

  const car = (x: number, y: number, src = '/spirit/car-front-sport.svg', w = 170, h = 135, opacity = 1, rotate = 0) => (
    <image href={src} x={x} y={y} width={w} height={h} opacity={opacity} preserveAspectRatio="xMidYMid meet" transform={rotate ? 'rotate(' + rotate + ' ' + (x + w / 2) + ' ' + (y + h / 2) + ')' : undefined} />
  );

  const commonDefs = (
    <defs>
      <linearGradient id="sceneBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#102b34" />
        <stop offset="1" stopColor="#061117" />
      </linearGradient>
      <linearGradient id="fogBand" x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#d9e6e2" stopOpacity="0" />
        <stop offset=".5" stopColor="#eef5f1" stopOpacity=".15" />
        <stop offset="1" stopColor="#d9e6e2" stopOpacity="0" />
      </linearGradient>
      <filter id="blur18"><feGaussianBlur stdDeviation="18" /></filter>
      <filter id="blur8"><feGaussianBlur stdDeviation="8" /></filter>
    </defs>
  );

  const badge = (title: string, detail: string, warning = false) => (
    <g>
      <rect x="28" y="24" width={warning ? 300 : 282} height="58" rx="20" fill={warning ? "#2b2118" : "#07151c"} stroke={warning ? "#f0bb72" : "#83e1d7"} strokeOpacity=".22" />
      <text x="48" y="49" fill={warning ? "#f2cb92" : "#a9ede5"} fontSize="15" fontWeight="900">{title}</text>
      <text x="48" y="68" fill="#8ba0a3" fontSize="11">{detail}</text>
    </g>
  );

  const legend = (left: string, right: string) => (
    <g>
      <rect x="28" y="304" width="744" height="34" rx="17" fill="#041016" fillOpacity=".9" stroke="#fff" strokeOpacity=".06" />
      <circle cx="53" cy="321" r="5" fill="#83e1d7" />
      <text x="66" y="325" fill="#cfe2e2" fontSize="11" fontWeight="800">{left}</text>
      <circle cx="390" cy="321" r="5" fill="#f4ae57" />
      <text x="403" y="325" fill="#cfe2e2" fontSize="11" fontWeight="800">{right}</text>
    </g>
  );

  if (kind === 'roundabout') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="الخروج من دوار إلى اليمين">{commonDefs}<rect width="800" height="360" fill="#071219" /><circle cx="400" cy="183" r="112" fill="#18323a" stroke="#6b8e93" strokeOpacity=".28" strokeWidth="18" /><circle cx="400" cy="183" r="51" fill="#08161c" stroke="#6b8e93" strokeOpacity=".18" strokeWidth="6" /><path d="M400 45v77M400 244v71M262 183h84M454 183h84" stroke="#d9e7e8" strokeOpacity=".24" strokeWidth="10" strokeLinecap="round" />{car(334,260,'/spirit/car-front-sport.svg',132,100)}<path d="M470 190c48-4 74-31 79-76" fill="none" stroke="#83e1d7" strokeWidth="10" strokeLinecap="round" /><path d="m546 111 20 15-23 8z" fill="#83e1d7" />{badge('الخروج إلى اليمين','المسار أولاً · الإشارة جزء من المناورة')}{legend('السهم = اتجاه المناورة','النقطة الكهرمانية = الغماز')}</svg>;

  if (kind === 'lane-left') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="تغيير المسار إلى اليسار">{commonDefs}{road}<image href="/spirit/car-front-sport.svg" x="316" y="230" width="170" height="125" /><path d="M405 300c-58-17-101-50-136-101" fill="none" stroke="#83e1d7" strokeWidth="11" strokeLinecap="round" /><path d="m267 197 25-2-11 22z" fill="#83e1d7" />{badge('انتقال إلى اليسار','مرآة → نقطة عمياء → غماز → انتقال')}{legend('السهم = المسار المطلوب','لا تنتقل قبل التأكد من خلو المسار')}</svg>;

  if (kind === 'oncoming') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="مركبة مقابلة ليلاً">{commonDefs}{road}<image href="/spirit/car-front-sport.svg" x="292" y="218" width="190" height="135" /><image href="/spirit/car-front-sport.svg" x="448" y="122" width="154" height="112" opacity=".74" transform="rotate(180 525 178)" /><ellipse cx="371" cy="258" rx="64" ry="28" fill="#fff0b0" opacity=".30" filter="url(#blur8)" /><ellipse cx="524" cy="164" rx="53" ry="22" fill="#fff0b0" opacity=".12" filter="url(#blur8)" /><path d="M414 269 480 243" stroke="#fff1b1" strokeOpacity=".12" strokeWidth="20" strokeLinecap="round" />{badge('مركبة مقابلة','اخفض العالي قبل الإبهار')}{legend('سيارتك = ضوء منخفض','المقابل = لا تبهِره بالعالي')}</svg>;

  if (kind === 'open-road') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="طريق مظلم خالٍ">{commonDefs}{road}<image href="/spirit/car-front-sport.svg" x="315" y="225" width="170" height="125" /><path d="M398 270 102 140M402 270 698 140" stroke="#fff2ac" strokeOpacity=".10" strokeWidth="46" strokeLinecap="round" filter="url(#blur18)" /><path d="M398 270 84 126M402 270 716 126" stroke="#fff2ac" strokeOpacity=".15" strokeWidth="8" strokeLinecap="round" />{badge('طريق خالٍ → العالي','مدى أطول، ثم اخفضه عند ظهور مستخدم طريق')}{legend('الشعاع الأبيض = مجال الرؤية','العالي ليس للاستخدام مع إبهار الآخرين')}</svg>;

  if (kind === 'fog') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="ضباب كثيف">{commonDefs}{road}<rect width="800" height="360" fill="#9fb1b1" fillOpacity=".13" /><rect x="0" y="125" width="800" height="45" fill="url(#fogBand)" /><rect x="0" y="184" width="800" height="35" fill="url(#fogBand)" /><rect x="0" y="244" width="800" height="28" fill="url(#fogBand)" /><image href="/spirit/car-front-sport.svg" x="315" y="225" width="170" height="125" /><ellipse cx="350" cy="271" rx="58" ry="24" fill="#fff0b2" opacity=".25" filter="url(#blur8)" /><ellipse cx="450" cy="271" rx="58" ry="24" fill="#fff0b2" opacity=".25" filter="url(#blur8)" />{badge('ضباب كثيف','الرؤية أولاً: سرعة أقل + إنارة مناسبة')}{legend('الضباب يقلل مدى الرؤية','المصباح لا يعوض عن خفض السرعة')}</svg>;

  if (kind === 'rear-fog') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="ضباب خلفي">{commonDefs}{road}<rect width="800" height="360" fill="#a3b2b2" fillOpacity=".10" /><rect x="0" y="135" width="800" height="34" fill="url(#fogBand)" /><rect x="0" y="204" width="800" height="28" fill="url(#fogBand)" /><image href="/spirit/car-rear.svg" x="310" y="220" width="180" height="125" /><ellipse cx="352" cy="278" rx="25" ry="18" fill="#ffb84e" opacity=".75" filter="url(#blur8)" /><ellipse cx="448" cy="278" rx="25" ry="18" fill="#ffb84e" opacity=".75" filter="url(#blur8)" /><image href="/spirit/car-front-sport.svg" x="120" y="205" width="120" height="90" opacity=".45" />{badge('ضباب خلفي','اجعل المركبة واضحة لمن خلفك',true)}{legend('الخلفي = وضوح المركبة','أوقفه عندما تتحسن الرؤية')}</svg>;

  if (kind === 'hazard') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="توقف اضطراري وتحذير رباعي">{commonDefs}<rect width="800" height="360" fill="url(#sceneBg)" /><rect y="125" width="800" height="235" fill="#172d35" /><path d="M0 215h800" stroke="#8da2a5" strokeOpacity=".13" strokeWidth="3" /><image href="/spirit/car-rear.svg" x="308" y="205" width="190" height="135" /><circle cx="352" cy="268" r="13" fill="#f4ae57" /><circle cx="448" cy="268" r="13" fill="#f4ae57" /><circle cx="352" cy="268" r="28" fill="none" stroke="#f4ae57" strokeOpacity=".20" /><circle cx="448" cy="268" r="28" fill="none" stroke="#f4ae57" strokeOpacity=".20" /><path d="M120 275l34-58 34 58z" fill="#f2bd74" fillOpacity=".10" stroke="#f2bd74" strokeWidth="3" /><text x="154" y="267" textAnchor="middle" fill="#f2bd74" fontSize="16" fontWeight="900">!</text>{badge('توقف اضطراري → تحذير','مركبة متوقفة في وضع قد يشكل خطراً',true)}{legend('التحذير = الاتجاهان معاً','ليس بديلاً عن غماز الانعطاف')}</svg>;

  if (kind === 'turn-right') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="انعطاف يمين عند تقاطع">{commonDefs}<rect width="800" height="360" fill="url(#sceneBg)" /><rect y="118" width="800" height="90" fill="#18323a" /><rect x="484" y="118" width="92" height="242" fill="#18323a" /><path d="M0 163h800M530 118v242" stroke="#d9e5e6" strokeOpacity=".18" strokeWidth="4" strokeDasharray="18 14" /><image href="/spirit/car-front-sport.svg" x="338" y="228" width="180" height="128" /><path d="M430 295c48-10 79-43 79-102" fill="none" stroke="#83e1d7" strokeWidth="11" strokeLinecap="round" /><path d="m501 191 22 16-24 8z" fill="#83e1d7" />{badge('انعطاف يمين','مرآة → غماز → تموضع → انعطاف')}{legend('السهم = مسار السيارة','الإشارة تنبه الآخرين قبل المناورة')}</svg>;

  if (kind === 'park') return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="وقوف ليلاً">{commonDefs}<rect width="800" height="360" fill="#061019" /><circle cx="630" cy="70" r="38" fill="#dce9e7" fillOpacity=".20" /><circle cx="630" cy="70" r="68" fill="#c4d8d5" fillOpacity=".05" filter="url(#blur18)" /><rect y="208" width="800" height="152" fill="#142930" /><path d="M0 266h800" stroke="#a2b0b2" strokeOpacity=".16" strokeWidth="3" /><path d="M0 210 800 210" stroke="#657b80" strokeOpacity=".16" strokeWidth="5" strokeDasharray="24 18" /><image href="/spirit/car-rear.svg" x="308" y="190" width="190" height="135" /><circle cx="352" cy="256" r="8" fill="#cddc8c" /><circle cx="448" cy="256" r="8" fill="#cddc8c" />{badge('وقوف ليلاً','اجعل المركبة واضحة · إنارة الموضع ليست لإنارة الطريق')}{legend('الموضع = وضوح المركبة','الطريق أمامك يحتاج إنارة مناسبة')}</svg>;

  return <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="مناورة تجاوز">{commonDefs}{road}<image href="/spirit/car-front-sport.svg" x="320" y="226" width="175" height="128" /><image href="/spirit/car-front-sport.svg" x="168" y="224" width="158" height="116" opacity=".70" /><path d="M360 303c-75-22-118-60-151-116" fill="none" stroke="#83e1d7" strokeWidth="11" strokeLinecap="round" /><path d="m204 187 25-2-11 22z" fill="#83e1d7" />{badge('بدء تجاوز','تأكد من السماح والفراغ قبل تغيير المسار')}{legend('السهم = مسار التجاوز','الغماز جزء من المناورة وليس ضماناً لها')}</svg>;
}

function DashboardIndicator({ mainLight, signal }: { mainLight: MainLightKey; signal: SignalKey | null }) {
  const items = [
    { key: 'left', title: 'يسار', icon: 'left' as const, active: signal === 'left' || signal === 'hazard' },
    { key: 'right', title: 'يمين', icon: 'right' as const, active: signal === 'right' || signal === 'hazard' },
    { key: 'high', title: 'عالي', icon: 'high' as const, active: mainLight === 'high' },
    { key: 'frontFog', title: 'ضباب', icon: 'frontFog' as const, active: mainLight === 'frontFog' },
    { key: 'rearFog', title: 'خلفي', icon: 'rearFog' as const, active: mainLight === 'rearFog' },
  ];
  return (
    <section className="dashboard-indicator">
      <div><span>رمز الطبلون</span><small>اربط الحركة بالرمز حتى تتعرف عليه بسرعة.</small></div>
      <div className="dashboard-lamps">
        {items.map(item => <span key={item.key} className={item.active ? 'on' : ''}><LightSymbol type={item.icon} />{item.title}</span>)}
      </div>
    </section>
  );
}

export default function PracticalInfo() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('practice');
  const [controlGroup, setControlGroup] = useState<ControlGroup>('ring');
  const [mainLight, setMainLight] = useState<MainLightKey>('low');
  const [signal, setSignal] = useState<SignalKey | null>(null);
  const [movement, setMovement] = useState<'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard'>('ring');
  const [flashActive, setFlashActive] = useState(false);
  const [flashCount, setFlashCount] = useState(0);
  const [vehicleView, setVehicleView] = useState<VehicleView>('front');
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].id);

  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    html.classList.add('practical-info-active');
    return () => {
      html.style.scrollBehavior = previous;
      html.classList.remove('practical-info-active');
    };
  }, []);

  useEffect(() => {
    if (!flashActive) return;
    const timer = window.setTimeout(() => {
      setFlashActive(false);
      setMovement('pull');
    }, 1050);
    return () => window.clearTimeout(timer);
  }, [flashActive]);

  const activeLight = useMemo(() => MAIN_LIGHTS.find(item => item.key === mainLight) || MAIN_LIGHTS[3], [mainLight]);
  const activeSignal = useMemo(() => SIGNALS.find(item => item.key === signal) || null, [signal]);

  const chooseMain = (key: MainLightKey) => {
    setMainLight(key);
    setSignal(null);
    setMovement(key === 'high' ? 'push' : 'ring');
    setFlashActive(false);
    setVehicleView(key === 'rearFog' ? 'rear' : 'front');
  };

  const chooseSignal = (key: SignalKey) => {
    setSignal(key);
    setMovement(key);
    setFlashActive(false);
    setVehicleView(key === 'hazard' ? 'rear' : 'front');
  };

  const triggerFlash = () => {
    setSignal(null);
    setMovement('pull');
    setFlashCount(value => value + 1);
    setFlashActive(true);
    setVehicleView('front');
  };

  const currentTitle = activeSignal?.title || (flashActive ? FLASH_ITEM.title : activeLight.title);
  const currentAction = activeSignal?.action || (flashActive ? FLASH_ITEM.action : activeLight.action);
  const currentUse = activeSignal?.use || (flashActive ? FLASH_ITEM.use : activeLight.use);
  const currentCaution = activeSignal?.caution || (flashActive ? FLASH_ITEM.caution : activeLight.caution);

  const selectedScenarioData = SCENARIOS.find(item => item.id === selectedScenario) || SCENARIOS[0];

  const applyScenario = (scenario: (typeof SCENARIOS)[number]) => {
    setSelectedScenario(scenario.id);
    setTab('practice');
    if (scenario.control === 'left' || scenario.control === 'right' || scenario.control === 'hazard') {
      chooseSignal(scenario.control);
      setControlGroup('lever');
    } else {
      chooseMain(scenario.control);
      setControlGroup(scenario.control === 'high' ? 'lever' : 'ring');
    }
  };

  return (
    <div className="lighting-lab-page" dir="rtl">
      <header className="lighting-lab-header">
        <div className="lighting-lab-header-inner">
          <button type="button" className="lighting-back" onClick={() => navigate('/')} aria-label="العودة إلى الرئيسية"><span>→</span></button>
          <div className="lighting-brand"><span>مركز التدريب العملي</span><strong>أضواء السيارة والغمازات</strong></div>
          <div className="lighting-header-status"><i /><span>تدريب عملي</span></div>
        </div>
      </header>

      <main className="lighting-lab-main">
        <section className="lighting-intro">
          <div className="intro-copy">
            <span className="lesson-eyebrow">درس قصير · حركة ← نتيجة ← تطبيق</span>
            <h1>تعلّم المقبض والسيارة مع بعض.</h1>
            <p>اختَر حركة واحدة، شاهد مكانها على المقبض، ثم شاهد أثرها مباشرة على السيارة. بدون قفزات أو تنقّل تلقائي.</p>
          </div>
          <div className="intro-flow">
            <span><b>1</b> اختَر</span><i>→</i><span><b>2</b> راقب</span><i>→</i><span><b>3</b> طبّق</span>
          </div>
        </section>

        <section className="lighting-lab-shell">
          <nav className="lighting-tabs" aria-label="أقسام الدرس">
            <button type="button" className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}><span>01</span>المحاكي</button>
            <button type="button" className={tab === 'scenarios' ? 'active' : ''} onClick={() => setTab('scenarios')}><span>10</span>مواقف الطريق</button>
            <button type="button" className={tab === 'automatic' ? 'active' : ''} onClick={() => setTab('automatic')}><span>03</span>أنوار تلقائية</button>
          </nav>

          {tab === 'practice' && (
            <section className="practice-section">
              <div className="practice-topline">
                <div><span className="lesson-eyebrow">المحاكي العملي</span><h2>اتبعها بهذا الترتيب</h2><p>الزر الذي تضغطه يبقى شرحه أمامك مباشرة، ثم تنتقل بصرياً للمقبض والنتيجة.</p></div>
                <div className="practice-status"><small>الحالة الحالية</small><strong>{currentTitle}</strong>{flashCount > 0 && <span>وميض مجرّب {flashCount}×</span>}</div>
              </div>

              <div className="practice-grid">
                <div className="practice-left">
                  <ControlSelector
                    group={controlGroup}
                    setGroup={setControlGroup}
                    mainLight={mainLight}
                    signal={signal}
                    flashActive={flashActive}
                    onMain={chooseMain}
                    onSignal={chooseSignal}
                    onFlash={triggerFlash}
                  />

                  <div className="selected-explanation">
                    <div className="selected-icon"><LightSymbol type={activeSignal?.symbol || (flashActive ? 'flash' : activeLight.symbol)} /></div>
                    <div className="selected-main"><span>شرح الزر الذي ضغطته</span><h3>{currentTitle}</h3><p>{currentAction}</p></div>
                    <div className="selected-block"><small>متى؟</small><p>{currentUse}</p></div>
                    <div className="selected-block note"><small>{activeSignal ? 'مثال عملي' : 'انتبه'}</small><p>{currentCaution}</p></div>
                  </div>
                </div>

                <HandleIllustration mainLight={mainLight} movement={movement} />
              </div>

              <div className="result-title"><span>3</span><div><b>شاهد النتيجة</b><small>التغيير يحصل هنا فقط، بدون تحريك الصفحة</small></div></div>

              <VehicleScene
                mainLight={mainLight}
                signal={signal}
                flashActive={flashActive}
                view={vehicleView}
                setView={setVehicleView}
              />

              <DashboardIndicator mainLight={mainLight} signal={signal} />
            </section>
          )}

          {tab === 'scenarios' && (
            <section className="scenario-section">
              <div className="section-kicker">
                <span className="lesson-eyebrow">مواقف الطريق</span>
                <h2>المشهد واضح أولاً، ثم الحركة.</h2>
                <p>اختَر موقفاً واحداً؛ لن يتغير مكانك ولا تتحرك الصفحة تلقائياً.</p>
              </div>

              <div className="scenario-selector-label"><span>اختر الموقف</span><small>10 مواقف تدريبية</small></div>
              <select className="scenario-select-mobile" value={selectedScenario} onChange={event => setSelectedScenario(event.target.value)} aria-label="اختيار موقف تدريبي">
                {SCENARIOS.map((scenario, index) => <option key={scenario.id} value={scenario.id}>{String(index + 1).padStart(2, '0')} · {scenario.title}</option>)}
              </select>
              <div className="scenario-selector" role="tablist" aria-label="اختيار موقف">
                {SCENARIOS.map((scenario, index) => <button key={scenario.id} type="button" className={selectedScenario === scenario.id ? 'active' : ''} onClick={() => setSelectedScenario(scenario.id)}><b>{String(index + 1).padStart(2, '0')}</b><span>{scenario.title}</span></button>)}
              </div>

              <article className="scenario-feature">
                <div className="scenario-feature-media"><ScenarioDiagram kind={selectedScenarioData.diagram} /><div className="scenario-feature-tag">{selectedScenarioData.tag}</div></div>
                <div className="scenario-feature-body">
                  <div className="scenario-feature-title"><div><span>الموقف المختار</span><h3>{selectedScenarioData.title}</h3></div><span className="scenario-control-badge">{selectedScenarioData.control === 'right' ? 'غماز يمين' : selectedScenarioData.control === 'left' ? 'غماز يسار' : selectedScenarioData.control === 'hazard' ? 'تحذير رباعي' : MAIN_LIGHTS.find(item => item.key === selectedScenarioData.control)?.title}</span></div>
                  <div className="scenario-goal"><span>الفكرة</span><p>{selectedScenarioData.goal}</p></div>
                  <div className="scenario-steps-large">{selectedScenarioData.sequence.map((step, index) => <div key={step}><b>{String(index + 1).padStart(2, '0')}</b><span>{step}</span></div>)}</div>
                  <div className="scenario-note"><span>ملاحظة تدريبية</span><p>{selectedScenarioData.note}</p></div>
                  <button type="button" className="scenario-try-button" onClick={() => applyScenario(selectedScenarioData)}>طبّق الموقف في المحاكي <span>←</span></button>
                </div>
              </article>
            </section>
          )}

          {tab === 'automatic' && (
            <section className="automatic-section">
              <div className="section-kicker"><span className="lesson-eyebrow">أنوار تلقائية</span><h2>مو كل ضوء موجود على المقبض.</h2><p>بعض الأضواء تبدأ بسبب حالة السيارة نفسها.</p></div>
              <div className="automatic-grid">{AUTOMATIC_LIGHTS.map(item => <article className="automatic-card" key={item.key}><div className="automatic-icon"><LightSymbol type={item.icon} /></div><div><span>{item.subtitle}</span><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>
              <div className="automatic-rule"><span>قاعدة الحفظ</span><p>أحياناً أنت تغيّر حالة السيارة، والسيارة هي التي تشغّل المصباح المناسب.</p></div>
            </section>
          )}
        </section>

        <section className="lighting-memory">
          <div><span className="lesson-eyebrow">الخلاصة</span><h2>احفظها كحركات.</h2><p>لف الحلقة · ارفع/اخفض الذراع · ادفع/اسحب · اعرف زر التحذير.</p></div>
          <div className="memory-grid"><div><b>01</b><strong>لف</strong><span>OFF · P · AUTO · LOW</span></div><div><b>02</b><strong>ضباب</strong><span>أمامي · خلفي</span></div><div><b>03</b><strong>ارفع/اخفض</strong><span>يمين · يسار</span></div><div><b>04</b><strong>ادفع/اسحب</strong><span>عالي · وميض</span></div></div>
        </section>

        <div className="lighting-disclaimer"><span>ملاحظة مهمة</span><p>شكل المقبض وترتيب الحلقات واتجاه بعض الحركات قد يختلف بحسب الشركة والموديل. المحاكي يشرح الفكرة الشائعة للتدريب، بينما دليل السيارة هو المرجع لسيارة محددة.</p></div>
      </main>
    </div>
  );
}
