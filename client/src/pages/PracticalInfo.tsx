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
  {
    key: 'off',
    title: 'إيقاف',
    subtitle: 'OFF',
    symbol: 'off',
    action: 'لف حلقة الإنارة إلى OFF.',
    use: 'وضع الحلقة الأساسي. قد تبقى بعض الإضاءة النهارية أو الوظائف التلقائية عاملة حسب تجهيز السيارة.',
    caution: 'لا تفترض أن OFF يطفئ كل مصابيح السيارة في كل طراز.',
  },
  {
    key: 'position',
    title: 'أضواء الموضع',
    subtitle: 'POSITION',
    symbol: 'position',
    action: 'لف الحلقة إلى رمز أضواء الموضع.',
    use: 'تجعل المركبة وحدودها أوضح عندما تكون الإضاءة المحيطة منخفضة، لكنها ليست بديلاً عن إنارة الطريق.',
    caution: 'عندما تحتاج إلى رؤية الطريق بوضوح، لا تعتمد على أضواء الموضع وحدها.',
  },
  {
    key: 'auto',
    title: 'أوتوماتيك',
    subtitle: 'AUTO',
    symbol: 'auto',
    action: 'لف الحلقة إلى AUTO إذا كانت السيارة مجهزة به.',
    use: 'تترك للنظام قرار تشغيل المصابيح وفق الحساسات والتجهيز الموجود في السيارة.',
    caution: 'AUTO يختلف من سيارة لأخرى، وقد لا يتحكم بكل وظائف الإنارة.',
  },
  {
    key: 'low',
    title: 'الضوء المنخفض',
    subtitle: 'LOW BEAM',
    symbol: 'low',
    action: 'لف الحلقة إلى رمز الضوء المنخفض.',
    use: 'إنارة أساسية للطريق أمامك مع حزمة موجهة للأسفل لتقليل إزعاج أو إبهار الآخرين.',
    caution: 'اختيار الضوء وحده لا يكفي؛ السرعة والرؤية وحالة الطريق ما زالت مهمة.',
  },
  {
    key: 'high',
    title: 'الضوء العالي',
    subtitle: 'HIGH BEAM',
    symbol: 'high',
    action: 'ادفع المقبض للأمام في الأنظمة التي تستخدم هذه الحركة للعالي.',
    use: 'لرؤية أبعد عندما يكون الطريق مناسباً ولا يوجد مستخدم طريق قد يتأذى من الضوء.',
    caution: 'عند ظهور مركبة أو احتمال إبهار مستخدم طريق، اخفض العالي.',
  },
  {
    key: 'frontFog',
    title: 'ضباب أمامي',
    subtitle: 'FRONT FOG',
    symbol: 'frontFog',
    action: 'فعّل وظيفة الضباب الأمامي إذا كانت السيارة مجهزة بها.',
    use: 'لظروف الرؤية الصعبة عندما تكون وظيفة الضباب مناسبة لتجهيز السيارة والطريق.',
    caution: 'المصابيح لا تعوض عن خفض السرعة وزيادة مسافة الأمان.',
  },
  {
    key: 'rearFog',
    title: 'ضباب خلفي',
    subtitle: 'REAR FOG',
    symbol: 'rearFog',
    action: 'فعّل الضباب الخلفي عند الحاجة وفي السيارة المجهزة به.',
    use: 'يجعل المركبة أوضح لمن خلفك عندما تكون الرؤية سيئة جداً.',
    caution: 'ضوءه قوي وقد يزعج السائق خلفك، لذلك لا تستخدمه بلا حاجة واضحة.',
  },
];

const FLASH_ITEM: LightItem = {
  key: 'flash',
  title: 'وميض العالي',
  subtitle: 'FLASH',
  symbol: 'flash',
  action: 'اسحب المقبض باتجاهك لحظياً في الأنظمة التي تستخدم هذه الحركة.',
  use: 'ومضة سريعة من الضوء العالي بدلاً من إبقائه مفعلاً.',
  caution: 'تختلف حركة المقبض بين السيارات؛ هذا محاكاة تعليمية وليست نسخة من كل سيارة.',
};

const SIGNALS: {
  key: SignalKey;
  title: string;
  subtitle: string;
  symbol: 'left' | 'right' | 'hazard';
  action: string;
  use: string;
  example: string;
}[] = [
  {
    key: 'right',
    title: 'غماز يمين',
    subtitle: 'UP',
    symbol: 'right',
    action: 'ارفع ذراع الإشارة للأعلى.',
    use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليمين قبل تنفيذ المناورة.',
    example: 'مثال عملي: قبل الخروج من دوّار إلى اليمين راقب الطريق والمسار ثم استخدم الإشارة المناسبة.',
  },
  {
    key: 'left',
    title: 'غماز يسار',
    subtitle: 'DOWN',
    symbol: 'left',
    action: 'اخفض ذراع الإشارة للأسفل.',
    use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليسار قبل تنفيذ المناورة.',
    example: 'مثال عملي: مرآة → نقطة عمياء → غماز → انتقال تدريجي عندما تكون المناورة آمنة.',
  },
  {
    key: 'hazard',
    title: 'الغماز الرباعي',
    subtitle: 'HAZARD',
    symbol: 'hazard',
    action: 'اضغط زر التحذير الرباعي الموجود عادةً بشكل منفصل.',
    use: 'يُظهر تحذيراً متزامناً للاتجاهين عند الحاجة بسبب حالة المركبة أو الطريق.',
    example: 'مثال عملي: مركبة متوقفة أو موقف اضطراري قد يجعل تحذير الآخرين ضرورياً.',
  },
];

const AUTOMATIC_LIGHTS = [
  {
    key: 'drl',
    title: 'أضواء النهار',
    subtitle: 'DRL',
    description: 'قد تعمل تلقائياً أثناء النهار في السيارات المجهزة بها، وليست بالضرورة وظيفة مستقلة على المقبض.',
    icon: 'sun' as const,
  },
  {
    key: 'brake',
    title: 'أضواء الفرامل',
    subtitle: 'STOP',
    description: 'تعمل عند ضغط دواسة الفرامل، لذلك تتعرف عليها من حركة السيارة وليس من وضع المقبض.',
    icon: 'brake' as const,
  },
  {
    key: 'reverse',
    title: 'ضوء الرجوع',
    subtitle: 'REVERSE',
    description: 'يعمل عند اختيار الرجوع للخلف في المركبة المجهزة به، ويختلف تصميمه من سيارة لأخرى.',
    icon: 'reverse' as const,
  },
];

const SCENARIOS = [
  {
    id: 'roundabout-right',
    tag: 'دوّار',
    title: 'الخروج من الدوّار إلى اليمين',
    control: 'right' as const,
    goal: 'توضيح متى تتحول الإشارة من مجرد حركة باليد إلى معلومة مفيدة لبقية السائقين.',
    sequence: ['راقب المرآة والمسار', 'حدد المخرج قبل الوصول إليه', 'استخدم غماز اليمين عند الحاجة', 'اخرج بهدوء ضمن المسار'],
    note: 'الرسم للتدريب البصري؛ الشواخص وتخطيط الطريق وحالة المرور هي المرجع الفعلي.',
    diagram: 'roundabout',
  },
  {
    id: 'lane-change',
    tag: 'تغيير مسار',
    title: 'الانتقال إلى المسار الأيسر',
    control: 'left' as const,
    goal: 'ربط غماز اليسار بتسلسل فحص الطريق وليس باعتباره إذناً بالانتقال.',
    sequence: ['مرآة', 'نقطة عمياء', 'غماز يسار', 'انتقال تدريجي عندما يكون المسار آمناً'],
    note: 'الغماز يخبر الآخرين بنيتك ولا يمنحك أولوية وحده.',
    diagram: 'lane-left',
  },
  {
    id: 'night-oncoming',
    tag: 'قيادة ليلاً',
    title: 'مركبة مقابلة على طريق مظلم',
    control: 'low' as const,
    goal: 'تعلم الانتقال من العالي إلى المنخفض قبل أن يسبب الضوء إبهاراً للمقابل.',
    sequence: ['لاحظ المركبة المقابلة', 'أوقف العالي', 'انتقل للمنخفض', 'حافظ على سرعة مناسبة للرؤية'],
    note: 'الفكرة الأساسية هنا: رؤية الطريق بدون إبهار الطرف المقابل.',
    diagram: 'oncoming',
  },
  {
    id: 'empty-road',
    tag: 'طريق مظلم',
    title: 'طريق خالٍ ورؤية تحتاج مدى أبعد',
    control: 'high' as const,
    goal: 'فهم أن العالي مرتبط بخلو المجال أمامك وبإمكانية استخدامه دون إزعاج الآخرين.',
    sequence: ['تحقق من خلو الطريق', 'فعّل العالي', 'راقب المدى البعيد', 'اخفضه عند ظهور مستخدم طريق'],
    note: 'هذا مثال تدريبي يفترض أن حالة الطريق تسمح باستخدام العالي.',
    diagram: 'open-road',
  },
  {
    id: 'fog',
    tag: 'ضباب',
    title: 'ضباب كثيف ومدى رؤية منخفض',
    control: 'frontFog' as const,
    goal: 'ربط الإنارة بمدى الرؤية وسرعة القيادة، لا بمجرد وجود كلمة "ضباب".',
    sequence: ['خفف السرعة', 'اختر الإنارة المناسبة', 'فعّل الضباب إن كانت السيارة مجهزة', 'راقب مسافة التوقف'],
    note: 'المصباح لا يعوض عن خفض السرعة عندما تقل الرؤية.',
    diagram: 'fog',
  },
  {
    id: 'hazard-stop',
    tag: 'توقف اضطراري',
    title: 'مركبة متوقفة في موضع قد يشكل خطراً',
    control: 'hazard' as const,
    goal: 'تمييز التحذير الرباعي عن غماز الانعطاف.',
    sequence: ['توقف بأمان قدر الإمكان', 'اجعل المركبة واضحة', 'فعّل التحذير عند الحاجة', 'اتخذ الإجراء الآمن التالي'],
    note: 'التحذير الرباعي حالة مختلفة عن الإشارة المستخدمة لإخبار الآخرين باتجاه المناورة.',
    diagram: 'hazard',
  },
  {
    id: 'turn-right',
    tag: 'تقاطع',
    title: 'انعطاف يمين',
    control: 'right' as const,
    goal: 'تثبيت قاعدة: إشارة → فحص → تموضع → مناورة.',
    sequence: ['افحص المرآة', 'استخدم غماز اليمين', 'تموضع بشكل صحيح', 'انعطف ضمن حدود الطريق'],
    note: 'الإشارة وسيلة تنبيه للآخرين وليست بديلاً عن مراقبة الطريق.',
    diagram: 'turn-right',
  },
  {
    id: 'rear-fog',
    tag: 'رؤية شديدة السوء',
    title: 'استخدام الضباب الخلفي',
    control: 'rearFog' as const,
    goal: 'فهم وظيفة الضباب الخلفي من منظور السائق الذي يسير خلفك.',
    sequence: ['تحقق من سوء الرؤية', 'فعّل الضباب الخلفي عند الحاجة', 'راقب السائقين خلفك', 'أوقفه عندما تتحسن الرؤية'],
    note: 'الضباب الخلفي شديد السطوع ويُستخدم عندما تكون الحاجة واضحة.',
    diagram: 'rear-fog',
  },
  {
    id: 'park-night',
    tag: 'وقوف ليلاً',
    title: 'مركبة متوقفة وتحتاج أن تكون واضحة',
    control: 'position' as const,
    goal: 'تمييز إنارة الموضع عن إنارة الطريق.',
    sequence: ['اختر مكان الوقوف الآمن', 'استخدم إنارة الموضع إذا كانت الحالة تتطلبها', 'اجعل المركبة واضحة', 'لا تستخدمها لإنارة الطريق'],
    note: 'التشغيل الفعلي يعتمد أيضاً على قواعد المكان وتجهيز السيارة.',
    diagram: 'park',
  },
  {
    id: 'overtake',
    tag: 'تجاوز',
    title: 'بدء مناورة تجاوز',
    control: 'left' as const,
    goal: 'توضيح أن الإشارة جزء من المناورة وليست المناورة نفسها.',
    sequence: ['تأكد من السماح بالتجاوز', 'مرآة ونقطة عمياء', 'غماز مناسب', 'نفّذ المناورة ثم عد للمسار عند الأمان'],
    note: 'قرار التجاوز يعتمد على الطريق والرؤية والأنظمة المرورية.',
    diagram: 'overtake',
  },
];

function LightSymbol({
  type,
  className = '',
  filled = false,
}: {
  type: LightItem['symbol'] | 'left' | 'right' | 'hazard' | 'sun' | 'brake' | 'reverse';
  className?: string;
  filled?: boolean;
}) {
  const stroke = 'currentColor';
  if (type === 'off') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><circle cx="42" cy="32" r="10" fill={filled ? stroke : 'none'} stroke={stroke} strokeWidth="3" /><path d="M22 32H12M72 32H88M42 12V4M42 52V60" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'position') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 18h23c8 0 13 6 15 14H10V18Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M62 16v32M74 19v26M86 23v18" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'auto') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><circle cx="43" cy="32" r="11" fill="none" stroke={stroke} strokeWidth="3" /><path d="M43 10v-5M43 59v-5M20 32h-7M73 32h-7M27 16l-4-4M63 48l-4-4M27 48l-4 4M63 16l4-4" stroke={stroke} strokeWidth="3" strokeLinecap="round" /><text x="79" y="38" fill={stroke} fontSize="13" fontWeight="900">A</text></svg>;
  if (type === 'low') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="m62 18 24 8M62 29l24 8M62 40l18 6" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'high') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M62 12h28M62 23h28M62 34h28M62 45h28" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'frontFog' || type === 'rearFog') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 12h23c8 0 14 7 16 19H10V12Z" fill="none" stroke={stroke} strokeWidth="3" /><path d={type === 'frontFog' ? 'm62 15 23 8M62 27h27M62 39 85 31' : 'm62 15-23 8M62 27H35M62 39 39 31'} stroke={stroke} strokeWidth="3" strokeLinecap="round" /><path d="M87 8c-8 7 8 10 0 17s8 11 0 20" fill="none" stroke={stroke} strokeWidth="2.5" /></svg>;
  if (type === 'flash') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M65 10h21M65 23h28M65 36h21M65 49h28" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'left' || type === 'right') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d={type === 'right' ? 'M15 32h57M58 14l21 18-21 18' : 'M85 32H28M42 14 21 32l21 18'} fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'hazard') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><path d="M50 8 90 54H10Z" fill="none" stroke={stroke} strokeWidth="4" strokeLinejoin="round" /><path d="M50 24v14M50 44v2" stroke={stroke} strokeWidth="4" strokeLinecap="round" /></svg>;
  if (type === 'sun') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><circle cx="50" cy="32" r="10" fill="none" stroke={stroke} strokeWidth="3" /><path d="M50 8v8M50 48v8M26 32h-8M82 32h-8M33 15l-6-6M73 49l-6-6M33 49l-6 6M73 15l6-6" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (type === 'brake') return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><rect x="18" y="17" width="64" height="30" rx="10" fill="none" stroke={stroke} strokeWidth="3" /><rect x="26" y="23" width="18" height="18" rx="5" fill={filled ? stroke : 'none'} stroke={stroke} strokeWidth="2.5" /><rect x="56" y="23" width="18" height="18" rx="5" fill={filled ? stroke : 'none'} stroke={stroke} strokeWidth="2.5" /></svg>;
  return <svg viewBox="0 0 100 64" className={className} aria-hidden="true"><rect x="18" y="18" width="64" height="28" rx="10" fill="none" stroke={stroke} strokeWidth="3" /><path d="m30 32 8-7 9 14 8-10 9 7" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function HandleIllustration({
  mainLight,
  movement,
  signal,
  flashActive,
}: {
  mainLight: MainLightKey;
  movement: 'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard' | 'idle';
  signal: SignalKey | null;
  flashActive: boolean;
}) {
  const ringLabel =
    mainLight === 'off'
      ? 'OFF'
      : mainLight === 'position'
        ? 'P'
        : mainLight === 'auto'
          ? 'A'
          : mainLight === 'low'
            ? 'LOW'
            : mainLight === 'high'
              ? 'HIGH'
              : mainLight === 'frontFog'
                ? 'F-FOG'
                : 'R-FOG';

  const movementText =
    movement === 'left'
      ? 'حركة لأسفل ← غماز يسار'
      : movement === 'right'
        ? 'حركة لأعلى ← غماز يمين'
        : movement === 'push'
          ? 'ادفع ← ضوء عالي'
          : movement === 'pull'
            ? 'اسحب لحظياً ← وميض'
            : movement === 'hazard'
              ? 'زر التحذير الرباعي'
              : 'لف الحلقة ← اختر وظيفة الإنارة';

  return (
    <div className="handle-simulator">
      <div className="handle-simulator-head">
        <div>
          <span className="mini-eyebrow">المقبض كما تراه في السيارة</span>
          <h3>جرّب الحركة بنفسك</h3>
          <p>الأجزاء التي نلمسها هنا واضحة: <b>الحلقة</b> للإنارة، و<b>الذراع</b> للغماز والعالي/الوميض، وزر مستقل للتحذير.</p>
        </div>
        <div className="handle-current"><small>الحركة الحالية</small><strong>{movementText}</strong></div>
      </div>

      <div className="handle-visual-wrap">
        <div className="handle-axis-label axis-top">↑ غماز يمين</div>
        <div className="handle-axis-label axis-bottom">↓ غماز يسار</div>
        <div className="handle-axis-label axis-front">→ ادفع للعالي</div>
        <div className="handle-axis-label axis-back">← اسحب للوميض</div>

        <svg className="full-handle-svg" viewBox="0 0 720 300" role="img" aria-label="محاكاة كاملة لمقبض الإضاءة">
          <defs>
            <linearGradient id="handleBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#66777c" />
              <stop offset=".48" stopColor="#2b3b40" />
              <stop offset="1" stopColor="#111d22" />
            </linearGradient>
            <linearGradient id="handleRing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8c9a9e" />
              <stop offset=".5" stopColor="#39494e" />
              <stop offset="1" stopColor="#1a272c" />
            </linearGradient>
            <filter id="handleShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="14" stdDeviation="14" floodOpacity=".35" />
            </filter>
          </defs>

          <g className={'handle-motion handle-motion-' + movement + (flashActive ? ' flash-pulse' : '')}>
            <rect x="55" y="116" width="455" height="72" rx="36" fill="url(#handleBody)" stroke="#93a3a6" strokeWidth="3" filter="url(#handleShadow)" />
            <rect x="92" y="132" width="172" height="8" rx="4" fill="#d9e4e5" opacity=".11" />
            <rect x="304" y="132" width="78" height="8" rx="4" fill="#d9e4e5" opacity=".14" />
            <rect x="444" y="126" width="88" height="52" rx="22" fill="#34464b" stroke="#91a1a4" strokeWidth="3" />
            <g className={'handle-ring ' + (movement === 'ring' ? 'ring-focus' : '')}>
              <rect x="470" y="91" width="118" height="122" rx="31" fill="url(#handleRing)" stroke="#a4b2b5" strokeWidth="3" />
              <rect x="482" y="103" width="94" height="98" rx="24" fill="#1c2b30" opacity=".94" />
              <path d="M529 106v92" stroke="#92a2a6" strokeWidth="2" opacity=".3" />
              <path d="M480 132h101M480 166h101" stroke="#a7b5b8" strokeWidth="1" opacity=".18" />
              <circle cx="529" cy="151" r="25" fill="#0c171c" stroke="#a3b1b5" strokeWidth="2" />
              <text x="529" y="156" textAnchor="middle" fill="#a7ebe3" fontSize="12" fontWeight="900">{ringLabel}</text>
              <text x="512" y="116" fill="#9eaeb1" fontSize="8" fontWeight="800">OFF</text>
              <text x="545" y="116" fill="#9eaeb1" fontSize="8" fontWeight="800">P</text>
              <text x="509" y="192" fill="#9eaeb1" fontSize="8" fontWeight="800">LOW</text>
              <text x="542" y="192" fill="#9eaeb1" fontSize="8" fontWeight="800">FOG</text>
              <rect x="524" y="83" width="10" height="16" rx="5" fill="#86e4da" />
            </g>
            <path d="M589 110h68c19 0 33 15 33 34s-14 34-33 34h-68z" fill="url(#handleBody)" stroke="#93a3a6" strokeWidth="3" />
            <text x="622" y="139" textAnchor="middle" fill="#d6e0e1" fontSize="9" fontWeight="900">LOW</text>
            <text x="622" y="158" textAnchor="middle" fill="#d6e0e1" fontSize="9" fontWeight="900">FOG</text>
          </g>

          <g className="handle-callout">
            <path d="M470 75h-30l-44-25" fill="none" stroke="#86e4da" strokeWidth="2" strokeDasharray="5 5" />
            <rect x="18" y="33" width="165" height="42" rx="12" fill="#0c1d24" stroke="#86e4da" strokeOpacity=".18" />
            <text x="100" y="52" textAnchor="middle" fill="#9be9df" fontSize="11" fontWeight="900">1 · حلقة الإنارة</text>
            <text x="100" y="66" textAnchor="middle" fill="#738a8e" fontSize="9">لفها لاختيار OFF / P / AUTO / LOW…</text>

            <path d="M215 188v45h-34" fill="none" stroke="#91a2a6" strokeWidth="2" strokeDasharray="5 5" />
            <rect x="18" y="222" width="188" height="48" rx="12" fill="#0c1d24" stroke="#aab8ba" strokeOpacity=".12" />
            <text x="112" y="242" textAnchor="middle" fill="#d8e4e5" fontSize="11" fontWeight="900">2 · الذراع</text>
            <text x="112" y="258" textAnchor="middle" fill="#738a8e" fontSize="9">رفع / خفض / دفع / سحب</text>

            <path d="M614 204v26" fill="none" stroke="#f0b66b" strokeWidth="2" strokeDasharray="5 5" />
            <rect x="520" y="235" width="174" height="42" rx="12" fill="#281f18" stroke="#f0b66b" strokeOpacity=".18" />
            <text x="607" y="253" textAnchor="middle" fill="#f2c782" fontSize="10" fontWeight="900">3 · زر التحذير</text>
            <text x="607" y="266" textAnchor="middle" fill="#907b63" fontSize="8">للتحذير الرباعي عند الحاجة</text>
          </g>

          {signal && (
            <g className="handle-signal-badge">
              <rect x="565" y="38" width="128" height="33" rx="16" fill="#0b1b20" stroke="#82e3d7" strokeOpacity=".22" />
              <text x="629" y="59" textAnchor="middle" fill="#a9ede5" fontSize="10" fontWeight="900">
                {signal === 'right' ? 'غماز يمين ↑' : signal === 'left' ? 'غماز يسار ↓' : 'تحذير رباعي ⚠'}
              </text>
            </g>
          )}
        </svg>

        <div className="handle-motion-status">
          <span className="motion-dot" />
          <strong>{movementText}</strong>
          <small>{signal || flashActive ? 'شاهد الآن كيف تتغير السيارة تحت المقبض.' : 'اختر حركة من الأسفل لترى الفرق بصرياً.'}</small>
        </div>
      </div>

      <div className="handle-practice-controls">
        <div className="practice-block">
          <div className="practice-block-head"><span>لف الحلقة</span><small>{MAIN_LIGHTS.length} أوضاع</small></div>
          <div className="ring-choice-grid">
            {MAIN_LIGHTS.map(item => (
              <button
                key={item.key}
                type="button"
                className={mainLight === item.key && !flashActive ? 'is-selected' : ''}
                onClick={() => item.key !== 'flash' && undefined}
              >
                <span className="choice-icon"><LightSymbol type={item.symbol} /></span>
                <span><b>{item.title}</b><small>{item.subtitle}</small></span>
              </button>
            ))}
          </div>
        </div>

        <div className="practice-block lever-actions">
          <div className="practice-block-head"><span>حرّك الذراع</span><small>تجربة فورية</small></div>
          <div className="lever-action-grid">
            <button type="button" className={signal === 'right' ? 'is-selected' : ''} onClick={() => undefined}><span>↑</span><b>غماز يمين</b><small>ارفع</small></button>
            <button type="button" className={signal === 'left' ? 'is-selected' : ''} onClick={() => undefined}><span>↓</span><b>غماز يسار</b><small>اخفض</small></button>
            <button type="button" className={mainLight === 'high' && !flashActive ? 'is-selected' : ''} onClick={() => undefined}><span>→</span><b>العالي</b><small>ادفع</small></button>
            <button type="button" className={flashActive ? 'is-selected' : ''} onClick={() => undefined}><span>←</span><b>وميض</b><small>اسحب لحظياً</small></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioDiagram({ kind }: { kind: string }) {
  const roadBase = (
    <>
      <rect width="760" height="320" fill="#07131a" />
      <rect y="0" width="760" height="118" fill="#0a2028" />
      <circle cx="115" cy="64" r="30" fill="#12313a" opacity=".7" />
      <circle cx="115" cy="64" r="18" fill="#21464e" opacity=".55" />
      <path d="M0 320 160 116h440L760 320Z" fill="#17303a" />
      <path d="M0 320h760" stroke="#0b171d" strokeWidth="10" />
      <path d="M380 118v202" stroke="#d7e2e3" strokeOpacity=".22" strokeWidth="4" strokeDasharray="20 18" />
      <path d="M238 320 300 118M522 320 460 118" stroke="#8ca2a6" strokeOpacity=".11" strokeWidth="3" />
    </>
  );

  const car = (x: number, y: number, flip = false, body = '#233d47') => (
    <g transform={'translate(' + x + ' ' + y + ')' + (flip ? ' scale(-1 1)' : '')}>
      <rect x="0" y="18" width="94" height="48" rx="16" fill={body} stroke="#7e9498" strokeOpacity=".25" />
      <path d="M18 20 30 2h34l16 18Z" fill="#2d4b55" stroke="#8ea2a5" strokeOpacity=".2" />
      <rect x="28" y="9" width="22" height="11" rx="4" fill="#9dbec3" opacity=".22" />
      <rect x="53" y="9" width="20" height="11" rx="4" fill="#9dbec3" opacity=".18" />
      <circle cx="20" cy="66" r="9" fill="#0a1115" stroke="#6a7c81" />
      <circle cx="76" cy="66" r="9" fill="#0a1115" stroke="#6a7c81" />
      <rect x="-4" y="30" width="9" height="12" rx="4" fill="#f3b055" />
      <rect x="89" y="30" width="9" height="12" rx="4" fill="#f3b055" />
    </g>
  );

  if (kind === 'roundabout') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد خروج من دوار إلى اليمين">
        <rect width="760" height="320" fill="#07131a" />
        <circle cx="380" cy="168" r="106" fill="#18333d" stroke="#77999e" strokeOpacity=".22" strokeWidth="16" />
        <circle cx="380" cy="168" r="53" fill="#0c1c22" stroke="#789095" strokeOpacity=".2" strokeWidth="7" />
        <path d="M380 52v60M380 224v64M264 168h60M436 168h60" stroke="#c8d6d7" strokeOpacity=".24" strokeWidth="9" strokeLinecap="round" />
        {car(316, 256, false, '#27505b')}
        <path d="M430 185c35-6 58-22 66-55" fill="none" stroke="#83e1d7" strokeWidth="9" strokeLinecap="round" />
        <path d="m500 120 18 12-20 8z" fill="#83e1d7" />
        <rect x="44" y="24" width="168" height="38" rx="19" fill="#0d2027" stroke="#83e1d7" strokeOpacity=".18" />
        <text x="128" y="48" textAnchor="middle" fill="#a9ede5" fontSize="15" fontWeight="900">المخرج إلى اليمين</text>
        <text x="380" y="308" textAnchor="middle" fill="#6e8589" fontSize="12">المسار نفسه أولاً، الإشارة جزء من المناورة</text>
      </svg>
    );
  }

  if (kind === 'lane-left') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد الانتقال للمسار الأيسر">
        {roadBase}
        {car(315, 233, false, '#27515b')}
        <path d="M400 274c-40-14-78-38-110-78" fill="none" stroke="#83e1d7" strokeWidth="10" strokeLinecap="round" />
        <path d="m278 197 21-1-8 19z" fill="#83e1d7" />
        <rect x="50" y="34" width="208" height="44" rx="22" fill="#0d2027" stroke="#83e1d7" strokeOpacity=".18" />
        <text x="154" y="62" textAnchor="middle" fill="#a9ede5" fontSize="15" fontWeight="900">افحص → غماز → انتقال</text>
        <text x="380" y="300" textAnchor="middle" fill="#6e8589" fontSize="12">المسار الأيسر يجب أن يكون متاحاً قبل المناورة</text>
      </svg>
    );
  }

  if (kind === 'oncoming') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد مركبة مقابلة على طريق مظلم">
        {roadBase}
        <g opacity=".95">{car(470, 145, true, '#354d56')}</g>
        {car(235, 232, false, '#284e59')}
        <rect x="488" y="177" width="86" height="12" rx="6" fill="#fff2b9" opacity=".28" />
        <rect x="172" y="248" width="84" height="14" rx="7" fill="#fff3bb" opacity=".55" />
        <path d="M258 247 354 221M258 264 360 245" stroke="#fff5c3" strokeWidth="18" strokeLinecap="round" opacity=".12" />
        <rect x="44" y="34" width="222" height="44" rx="22" fill="#10262e" stroke="#f4cf90" strokeOpacity=".16" />
        <text x="155" y="62" textAnchor="middle" fill="#f2d49d" fontSize="15" fontWeight="900">مركبة مقابلة → منخفض</text>
        <text x="380" y="300" textAnchor="middle" fill="#6e8589" fontSize="12">الفكرة: رؤية الطريق بدون إبهار المقابل</text>
      </svg>
    );
  }

  if (kind === 'open-road') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="طريق مظلم خالٍ ومدى رؤية أبعد">
        {roadBase}
        {car(334, 235, false, '#294f5a')}
        <path d="M380 245 120 161M380 245 640 161" stroke="#fff2b0" strokeWidth="28" strokeLinecap="round" opacity=".18" />
        <path d="M380 250 68 132M380 250 692 132" stroke="#fff2b0" strokeWidth="8" strokeLinecap="round" opacity=".12" />
        <rect x="50" y="34" width="226" height="44" rx="22" fill="#0d2027" stroke="#83e1d7" strokeOpacity=".18" />
        <text x="163" y="62" textAnchor="middle" fill="#a9ede5" fontSize="15" fontWeight="900">طريق خالٍ → العالي</text>
        <text x="380" y="300" textAnchor="middle" fill="#6e8589" fontSize="12">اخفضه فور ظهور مستخدم طريق أمامك أو مقابلك</text>
      </svg>
    );
  }

  if (kind === 'fog' || kind === 'rear-fog') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد قيادة في ضباب كثيف">
        <rect width="760" height="320" fill="#6f878a" />
        <rect width="760" height="320" fill="url(#fogFallback)" opacity=".5" />
        <defs>
          <linearGradient id="fogFallback" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a6b9ba" stopOpacity=".14" />
            <stop offset="1" stopColor="#3e565a" stopOpacity=".28" />
          </linearGradient>
        </defs>
        <path d="M0 320 150 110h460L760 320Z" fill="#41585d" opacity=".65" />
        <path d="M0 94h760M0 126h760M0 164h760M0 205h760" stroke="#e4eded" strokeWidth="18" strokeOpacity=".11" />
        {kind === 'rear-fog' ? car(334, 236, true, '#27434d') : car(334, 236, false, '#27434d')}
        {kind === 'rear-fog'
          ? <><circle cx="350" cy="267" r="13" fill="#ffca67" opacity=".86" /><circle cx="412" cy="267" r="13" fill="#ffca67" opacity=".86" /></>
          : <><ellipse cx="350" cy="262" rx="44" ry="18" fill="#fff0af" opacity=".18" /><ellipse cx="410" cy="262" rx="44" ry="18" fill="#fff0af" opacity=".18" /></>}
        <rect x="48" y="34" width="236" height="44" rx="22" fill="#24393e" stroke="#f0d38f" strokeOpacity=".17" />
        <text x="166" y="62" textAnchor="middle" fill="#f1d7a3" fontSize="15" fontWeight="900">{kind === 'rear-fog' ? 'ضباب خلفي ← اجعل السيارة واضحة' : 'ضباب أمامي + سرعة مناسبة'}</text>
        <text x="380" y="300" textAnchor="middle" fill="#e0eaea" fillOpacity=".58" fontSize="12">كلما قل مدى الرؤية، زادت أهمية السرعة ومسافة التوقف</text>
      </svg>
    );
  }

  if (kind === 'hazard') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد توقف اضطراري مع تحذير رباعي">
        <rect width="760" height="320" fill="#07131a" />
        <path d="M0 320V112h760v208Z" fill="#182d35" />
        <path d="M0 210h760" stroke="#6f888c" strokeOpacity=".12" strokeWidth="3" />
        {car(320, 208, false, '#5b4240')}
        <circle cx="336" cy="244" r="10" fill="#ffb35d" />
        <circle cx="398" cy="244" r="10" fill="#ffb35d" />
        <circle cx="336" cy="244" r="22" fill="none" stroke="#ffb35d" strokeOpacity=".22" />
        <circle cx="398" cy="244" r="22" fill="none" stroke="#ffb35d" strokeOpacity=".22" />
        <rect x="50" y="34" width="210" height="44" rx="22" fill="#2b211a" stroke="#f0b66b" strokeOpacity=".18" />
        <text x="155" y="62" textAnchor="middle" fill="#f1c88d" fontSize="15" fontWeight="900">توقف اضطراري → تحذير</text>
        <text x="380" y="300" textAnchor="middle" fill="#6e8589" fontSize="12">التحذير الرباعي ليس بديلاً عن غماز الانعطاف</text>
      </svg>
    );
  }

  if (kind === 'turn-right') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد انعطاف يمين عند تقاطع">
        <rect width="760" height="320" fill="#07131a" />
        <path d="M0 122h760v76H0zM480 320h92V122h-92z" fill="#17303a" />
        <path d="M0 160h760M526 122v198" stroke="#a6b7ba" strokeOpacity=".18" strokeWidth="4" strokeDasharray="18 14" />
        {car(370, 226, false, '#27505b')}
        <path d="M430 256c44-15 70-41 70-93" fill="none" stroke="#83e1d7" strokeWidth="10" strokeLinecap="round" />
        <path d="m499 165 17 17-22 2z" fill="#83e1d7" />
        <rect x="50" y="34" width="206" height="44" rx="22" fill="#0d2027" stroke="#83e1d7" strokeOpacity=".18" />
        <text x="153" y="62" textAnchor="middle" fill="#a9ede5" fontSize="15" fontWeight="900">مرآة → غماز → يمين</text>
        <text x="380" y="300" textAnchor="middle" fill="#6e8589" fontSize="12">الإشارة تنبه الآخرين قبل المناورة</text>
      </svg>
    );
  }

  if (kind === 'park') {
    return (
      <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد مركبة متوقفة ليلاً">
        <rect width="760" height="320" fill="#061018" />
        <circle cx="620" cy="56" r="30" fill="#203943" />
        <path d="M0 216h760v104H0z" fill="#13262e" />
        <path d="M0 258h760" stroke="#788b8e" strokeOpacity=".11" strokeWidth="3" />
        {car(318, 198, false, '#324852')}
        <circle cx="338" cy="236" r="8" fill="#d6e28b" opacity=".75" />
        <circle cx="400" cy="236" r="8" fill="#d6e28b" opacity=".75" />
        <rect x="50" y="34" width="228" height="44" rx="22" fill="#0d2027" stroke="#83e1d7" strokeOpacity=".18" />
        <text x="164" y="62" textAnchor="middle" fill="#a9ede5" fontSize="15" fontWeight="900">وقوف ليلاً → وضوح المركبة</text>
        <text x="380" y="300" textAnchor="middle" fill="#6e8589" fontSize="12">إنارة الموضع ليست مصباحاً لإنارة الطريق أمامك</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 760 320" className="scenario-svg" role="img" aria-label="مشهد بدء مناورة تجاوز">
      {roadBase}
      {car(318, 235, false, '#27505b')}
      {car(118, 205, false, '#394c54')}
      <path d="M344 276c-55-19-96-49-128-90" fill="none" stroke="#83e1d7" strokeWidth="10" strokeLinecap="round" />
      <path d="m205 185 22-1-9 19z" fill="#83e1d7" />
      <rect x="50" y="34" width="204" height="44" rx="22" fill="#0d2027" stroke="#83e1d7" strokeOpacity=".18" />
      <text x="152" y="62" textAnchor="middle" fill="#a9ede5" fontSize="15" fontWeight="900">تأكد → غماز → تجاوز</text>
      <text x="380" y="300" textAnchor="middle" fill="#6e8589" fontSize="12">لا تبدأ المناورة إذا لم يكن الطريق آمناً ومسموحاً</text>
    </svg>
  );
}

function DashboardIndicator({
  mainLight,
  signal,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
}) {
  const items = [
    { key: 'left', title: 'يسار', icon: 'left' as const, active: signal === 'left' || signal === 'hazard' },
    { key: 'right', title: 'يمين', icon: 'right' as const, active: signal === 'right' || signal === 'hazard' },
    { key: 'high', title: 'عالي', icon: 'high' as const, active: mainLight === 'high' },
    { key: 'frontFog', title: 'ضباب', icon: 'frontFog' as const, active: mainLight === 'frontFog' },
    { key: 'rearFog', title: 'خلفي', icon: 'rearFog' as const, active: mainLight === 'rearFog' },
  ];

  return (
    <div className="dashboard-indicator">
      <div>
        <span>شاهد رمز الطبلون</span>
        <small>الهدف: تربط بين الحركة والرمز حتى تتعرف عليه في الامتحان والسيارة.</small>
      </div>
      <div className="dashboard-lamps">
        {items.map(item => (
          <span key={item.key} className={item.active ? 'on' : ''}>
            <LightSymbol type={item.icon} />
            {item.title}
          </span>
        ))}
      </div>
    </div>
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

  const subtitle = signal
    ? 'شاهد الإشارة على السيارة ثم ارجع للمقبض'
    : mainLight === 'high' || flashActive
      ? 'حزمة ضوئية أمامية بعيدة'
      : mainLight === 'low'
        ? 'إنارة الطريق أمامك'
        : mainLight === 'frontFog'
          ? 'إنارة مساعدة في الظروف الصعبة'
          : mainLight === 'rearFog'
            ? 'وضوح السيارة من الخلف'
            : 'نتيجة الإضاءة على المركبة';

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
          <p>{subtitle}</p>
        </div>
        <div className="vehicle-view-toggle" role="tablist" aria-label="اختيار منظر السيارة">
          <button type="button" className={view === 'front' ? 'active' : ''} onClick={() => setView('front')}>الأمام</button>
          <button type="button" className={view === 'rear' ? 'active' : ''} onClick={() => setView('rear')}>الخلف</button>
        </div>
      </div>

      <div className="vehicle-stage">
        <div className="vehicle-road-glow" />
        <img src="/spirit/car-front-sport.svg" className="vehicle-car vehicle-car-front" alt="السيارة من الأمام" />
        <img src="/spirit/car-rear.svg" className="vehicle-car vehicle-car-rear" alt="السيارة من الخلف" />

        <span className="vehicle-beam vehicle-beam-left" />
        <span className="vehicle-beam vehicle-beam-right" />
        <span className="vehicle-fog vehicle-fog-left" />
        <span className="vehicle-fog vehicle-fog-right" />
        <span className="vehicle-signal-l signal-l-front" />
        <span className="vehicle-signal-l signal-l-rear" />
        <span className="vehicle-signal-r signal-r-front" />
        <span className="vehicle-signal-r signal-r-rear" />
        <span className="vehicle-rear-fog-light rear-fog-light-l" />
        <span className="vehicle-rear-fog-light rear-fog-light-r" />

        <div className="vehicle-stage-labels">
          <span className="front-label">أمام السيارة</span>
          <span className="rear-label">خلف السيارة</span>
        </div>

        <div className="vehicle-active-note">
          <span className="status-pulse" />
          <strong>{signal ? 'الإشارة ظاهرة على السيارة' : 'النتيجة تتبدل حسب اختيارك'}</strong>
        </div>
      </div>

      <div className="vehicle-rule">
        <span>احفظها بهذه الصورة</span>
        <strong>
          {view === 'front'
            ? 'أمام السيارة: ركّز على أضواء الطريق والغماز الأمامي.'
            : 'خلف السيارة: ركّز على وضوح المركبة، الغماز، والضباب الخلفي عند الحاجة.'}
        </strong>
      </div>
    </section>
  );
}

export default function PracticalInfo() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('practice');
  const [mainLight, setMainLight] = useState<MainLightKey>('low');
  const [signal, setSignal] = useState<SignalKey | null>(null);
  const [movement, setMovementMode] = useState<'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard' | 'idle'>('ring');
  const [flashActive, setFlashActive] = useState(false);
  const [flashCount, setFlashCount] = useState(0);
  const [vehicleView, setVehicleView] = useState<VehicleView>('front');
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].id);

  const activeLight = useMemo(
    () => MAIN_LIGHTS.find(item => item.key === mainLight) || MAIN_LIGHTS[3],
    [mainLight],
  );
  const activeSignal = useMemo(
    () => SIGNALS.find(item => item.key === signal) || null,
    [signal],
  );

  useEffect(() => {
    if (!flashActive) return;
    const timer = window.setTimeout(() => setFlashActive(false), 800);
    return () => window.clearTimeout(timer);
  }, [flashActive]);

  const applyMovement = (next: 'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard' | 'idle') => {
    setMovementMode(next);
    if (next === 'left' || next === 'right' || next === 'hazard') {
      setSignal(next);
      setFlashActive(false);
      if (next !== 'hazard') setVehicleView('front');
      return;
    }
    if (next === 'push') {
      setSignal(null);
      setFlashActive(false);
      setMainLight('high');
      setVehicleView('front');
      return;
    }
    if (next === 'pull') {
      setSignal(null);
      setFlashCount(value => value + 1);
      setFlashActive(true);
      setVehicleView('front');
      return;
    }
    setSignal(null);
  };

  const chooseMain = (key: MainLightKey) => {
    setMainLight(key);
    setSignal(null);
    setMovementMode('ring');
    setFlashActive(false);
    if (key === 'rearFog') setVehicleView('rear');
    else setVehicleView('front');
  };

  const chooseSignal = (key: SignalKey) => {
    setSignal(key);
    setMovementMode(key);
    setFlashActive(false);
    setVehicleView(key === 'hazard' ? 'rear' : 'front');
  };

  const triggerFlash = () => {
    setSignal(null);
    setMovementMode('pull');
    setFlashCount(value => value + 1);
    setFlashActive(true);
  };

  const applyScenario = (scenario: (typeof SCENARIOS)[number]) => {
    setSelectedScenario(scenario.id);
    if (scenario.control === 'left' || scenario.control === 'right' || scenario.control === 'hazard') {
      chooseSignal(scenario.control);
    } else {
      chooseMain(scenario.control);
    }
    setTab('practice');
  };

  const selectedScenarioData = SCENARIOS.find(item => item.id === selectedScenario) || SCENARIOS[0];

  const currentTitle = activeSignal?.title || (flashActive ? FLASH_ITEM.title : activeLight.title);
  const currentAction = activeSignal?.action || (flashActive ? FLASH_ITEM.action : activeLight.action);
  const currentUse = activeSignal?.use || (flashActive ? FLASH_ITEM.use : activeLight.use);
  const currentCaution = activeSignal?.example || (flashActive ? FLASH_ITEM.caution : activeLight.caution);

  return (
    <div className="lighting-lab-page" dir="rtl">
      <header className="lighting-lab-header">
        <div className="lighting-lab-header-inner">
          <button type="button" className="lighting-back" onClick={() => navigate('/')} aria-label="العودة إلى الرئيسية">
            <span>→</span>
          </button>

          <div className="lighting-brand">
            <span>مركز التدريب العملي</span>
            <strong>أضواء السيارة والغمازات</strong>
          </div>

          <div className="lighting-header-status">
            <i />
            <span>تجربة تفاعلية</span>
          </div>
        </div>
      </header>

      <main className="lighting-lab-main">
        <section className="lighting-intro">
          <div className="intro-copy">
            <span className="lesson-eyebrow">تعلمها بيدك · ثم شاهدها على السيارة</span>
            <h1>بدل ما تحفظ الرمز، تعلّم الحركة والنتيجة.</h1>
            <p>
              هذه الصفحة مصممة لتستخدمها مثل تدريب قصير: اختَر الوظيفة، حرّك المقبض، شاهد الضوء على السيارة،
              وبعدها جرّب موقفاً من الطريق.
            </p>
          </div>

          <div className="intro-path">
            <div><b>01</b><span>حرّك</span><small>الحلقة والذراع</small></div>
            <div><b>02</b><span>شاهد</span><small>الأمام والخلف</small></div>
            <div><b>03</b><span>طبّق</span><small>موقف حقيقي</small></div>
          </div>
        </section>

        <section className="lighting-lab-shell">
          <nav className="lighting-tabs" aria-label="أقسام درس الإضاءة">
            <button type="button" className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>
              <span className="tab-icon">01</span>المحاكي العملي
            </button>
            <button type="button" className={tab === 'scenarios' ? 'active' : ''} onClick={() => setTab('scenarios')}>
              <span className="tab-icon">10</span>مواقف الطريق
            </button>
            <button type="button" className={tab === 'automatic' ? 'active' : ''} onClick={() => setTab('automatic')}>
              <span className="tab-icon">03</span>أنوار تلقائية
            </button>
          </nav>

          {tab === 'practice' && (
            <section className="practice-section">
              <div className="practice-intro">
                <div>
                  <span className="lesson-eyebrow">01 · المحاكي</span>
                  <h2>استخدمه ثلاث خطوات فقط</h2>
                  <p>لا يوجد سحب تلقائي للصفحة ولا انتقال مفاجئ. كل ضغطة تغيّر المشهد هنا في مكانه.</p>
                </div>

                <div className="practice-status">
                  <small>الحالة الحالية</small>
                  <strong>{currentTitle}</strong>
                  {flashCount > 0 && <span>عدد تجارب الوميض: {flashCount}</span>}
                </div>
              </div>

              <div className="practice-layout">
                <div className="practice-controls-panel">
                  <div className="panel-title"><span>1</span><div><b>اختر وظيفة الإنارة</b><small>لف الحلقة</small></div></div>
                  <div className="ring-choice-grid">
                    {MAIN_LIGHTS.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        className={mainLight === item.key && !signal && !flashActive ? 'is-selected' : ''}
                        onClick={() => chooseMain(item.key)}
                      >
                        <span className="choice-icon"><LightSymbol type={item.symbol} /></span>
                        <span className="choice-text"><b>{item.title}</b><small>{item.subtitle}</small></span>
                      </button>
                    ))}
                  </div>

                  <div className="panel-title panel-title-action"><span>2</span><div><b>حرّك الذراع</b><small>جرّب الحركة نفسها</small></div></div>
                  <div className="lever-action-grid">
                    <button type="button" className={movement === 'right' ? 'is-selected' : ''} onClick={() => chooseSignal('right')}><span className="lever-arrow">↑</span><b>غماز يمين</b><small>ارفع</small></button>
                    <button type="button" className={movement === 'left' ? 'is-selected' : ''} onClick={() => chooseSignal('left')}><span className="lever-arrow">↓</span><b>غماز يسار</b><small>اخفض</small></button>
                    <button type="button" className={movement === 'push' ? 'is-selected' : ''} onClick={() => applyMovement('push')}><span className="lever-arrow">→</span><b>العالي</b><small>ادفع</small></button>
                    <button type="button" className={movement === 'pull' ? 'is-selected' : ''} onClick={triggerFlash}><span className="lever-arrow">←</span><b>وميض</b><small>اسحب لحظياً</small></button>
                  </div>

                  <button type="button" className={movement === 'hazard' ? 'hazard-action is-selected' : 'hazard-action'} onClick={() => chooseSignal('hazard')}>
                    <span>△</span>
                    <div><b>التحذير الرباعي</b><small>زر مستقل عن حركة الغماز</small></div>
                  </button>

                  <div className="practical-reminder">
                    <span>تذكّر</span>
                    <p>الحلقة = وظائف الإنارة. الذراع = اتجاه / عالي / وميض. التحذير الرباعي = زر مستقل في أغلب السيارات.</p>
                  </div>
                </div>

                <HandleIllustration
                  mainLight={mainLight}
                  movement={movement}
                  signal={signal}
                  flashActive={flashActive}
                />
              </div>

              <div className="interaction-divider"><span>3</span><b>شاهد النتيجة على السيارة</b><small>بدّل بين الأمام والخلف</small></div>

              <VehicleScene
                mainLight={mainLight}
                signal={signal}
                flashActive={flashActive}
                view={vehicleView}
                setView={setVehicleView}
              />

              <div className="explanation-card">
                <div className="explanation-symbol">
                  <LightSymbol type={activeSignal?.symbol || (flashActive ? 'flash' : activeLight.symbol)} />
                </div>
                <div className="explanation-main">
                  <span>كيف تستخدمه؟</span>
                  <h3>{currentTitle}</h3>
                  <p>{currentAction}</p>
                </div>
                <div className="explanation-block">
                  <span>متى؟</span>
                  <p>{currentUse}</p>
                </div>
                <div className="explanation-block explanation-caution">
                  <span>{activeSignal ? 'مثال عملي' : 'انتبه'}</span>
                  <p>{currentCaution}</p>
                </div>
              </div>

              <DashboardIndicator mainLight={mainLight} signal={signal} />
            </section>
          )}

          {tab === 'scenarios' && (
            <section className="scenario-section">
              <div className="section-kicker">
                <span className="lesson-eyebrow">02 · مواقف الطريق</span>
                <h2>شوف الموقف أولاً، ثم قرر الحركة.</h2>
                <p>بدل عشرة كروت صغيرة، اختر موقفاً واحداً ليظهر لك كمشهد كبير مع خطوات واضحة وتطبيق مباشر.</p>
              </div>

              <div className="scenario-selector" role="tablist" aria-label="اختيار موقف">
                {SCENARIOS.map((scenario, index) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className={selectedScenario === scenario.id ? 'active' : ''}
                    onClick={() => setSelectedScenario(scenario.id)}
                  >
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span>{scenario.title}</span>
                  </button>
                ))}
              </div>

              <article className="scenario-feature">
                <div className="scenario-feature-media">
                  <ScenarioDiagram kind={selectedScenarioData.diagram} />
                  <div className="scenario-feature-tag">{selectedScenarioData.tag}</div>
                </div>

                <div className="scenario-feature-body">
                  <div className="scenario-feature-title">
                    <div>
                      <span>الموقف المختار</span>
                      <h3>{selectedScenarioData.title}</h3>
                    </div>
                    <span className="scenario-control-badge">
                      {selectedScenarioData.control === 'right'
                        ? 'غماز يمين'
                        : selectedScenarioData.control === 'left'
                          ? 'غماز يسار'
                          : selectedScenarioData.control === 'hazard'
                            ? 'تحذير رباعي'
                            : MAIN_LIGHTS.find(item => item.key === selectedScenarioData.control)?.title}
                    </span>
                  </div>

                  <div className="scenario-goal">
                    <span>لماذا هذا الموقف؟</span>
                    <p>{selectedScenarioData.goal}</p>
                  </div>

                  <div className="scenario-steps-large">
                    {selectedScenarioData.sequence.map((step, index) => (
                      <div key={step}>
                        <b>{String(index + 1).padStart(2, '0')}</b>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="scenario-note">
                    <span>ملاحظة تدريبية</span>
                    <p>{selectedScenarioData.note}</p>
                  </div>

                  <button type="button" className="scenario-try-button" onClick={() => applyScenario(selectedScenarioData)}>
                    طبّق الموقف في المحاكي
                    <span>←</span>
                  </button>
                </div>
              </article>
            </section>
          )}

          {tab === 'automatic' && (
            <section className="automatic-section">
              <div className="section-kicker">
                <span className="lesson-eyebrow">03 · أنوار تلقائية</span>
                <h2>في أضواء تتعرف عليها من حالة السيارة.</h2>
                <p>لا تحاول البحث عن كل وظيفة على المقبض. بعض الأضواء تعمل بسبب الفرامل أو الرجوع أو تجهيز السيارة نفسه.</p>
              </div>

              <div className="automatic-grid">
                {AUTOMATIC_LIGHTS.map(item => (
                  <article className="automatic-card" key={item.key}>
                    <div className="automatic-icon"><LightSymbol type={item.icon} /></div>
                    <div>
                      <span>{item.subtitle}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="automatic-rule">
                <span>قاعدة حفظ</span>
                <p>المقبض لا يتحكم بكل مصباح في السيارة. أحياناً أنت تغيّر حالة السيارة، والسيارة هي التي تشغّل الضوء المناسب تلقائياً.</p>
              </div>
            </section>
          )}
        </section>

        <section className="lighting-memory">
          <div>
            <span className="lesson-eyebrow">خلاصة الدرس</span>
            <h2>احفظها كحركات، وليس كقائمة.</h2>
            <p>عندما تمسك المقبض الحقيقي تذكّر أربع أفكار: لفّ الحلقة، ارفع/اخفض الذراع، ادفع/اسحب، واعرف زر التحذير.</p>
          </div>
          <div className="memory-grid">
            <div><b>01</b><strong>لف</strong><span>OFF · P · AUTO · LOW</span></div>
            <div><b>02</b><strong>ضباب</strong><span>أمامي · خلفي</span></div>
            <div><b>03</b><strong>ارفع / اخفض</strong><span>يمين · يسار</span></div>
            <div><b>04</b><strong>ادفع / اسحب</strong><span>عالي · وميض</span></div>
          </div>
        </section>

        <div className="lighting-disclaimer">
          <span>ملاحظة مهمة</span>
          <p>شكل المقبض وترتيب الحلقات واتجاه بعض الحركات قد يختلف بحسب الشركة والموديل. المحاكي هنا يشرح الفكرة الشائعة للتدريب، بينما دليل السيارة هو المرجع لسيارة محددة.</p>
        </div>
      </main>
    </div>
  );
}
