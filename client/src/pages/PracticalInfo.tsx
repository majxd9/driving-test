import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type MainLightKey =
  | 'off'
  | 'position'
  | 'auto'
  | 'low'
  | 'high'
  | 'frontFog'
  | 'rearFog'
  | 'flash';

type SignalKey = 'left' | 'right' | 'hazard';
type ControlKey = MainLightKey | SignalKey;

type LightItem = {
  key: MainLightKey;
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
    use: 'عندما لا تحتاج إلى تشغيل مصابيح هذه الوظيفة، مع مراعاة أن بعض السيارات تشغّل أضواء نهارية تلقائياً.',
    caution: 'موضع OFF ليس دليلاً على أن كل إنارة السيارة متوقفة في كل سيارة.',
  },
  {
    key: 'position',
    title: 'أضواء الموضع',
    subtitle: 'Position / Parking',
    symbol: 'position',
    action: 'لف الحلقة حتى رمز أضواء الموضع.',
    use: 'تُظهر المركبة وحدودها في الإضاءة المحيطة الضعيفة ولا تُعامل كبديل عن إنارة الطريق.',
    caution: 'لا تعتمد عليها وحدها عندما تحتاج إلى رؤية الطريق بوضوح.',
  },
  {
    key: 'auto',
    title: 'أوتوماتيك',
    subtitle: 'AUTO',
    symbol: 'auto',
    action: 'إن كانت السيارة مجهزة به، لف الحلقة إلى AUTO.',
    use: 'تتولى السيارة قرار تشغيل المصابيح وفق الحساسات والنظام المجهز بها.',
    caution: 'ليس موجوداً في كل سيارة، ولا يعني أن بقية الوظائف مثل الضباب والغمازات تعمل تلقائياً.',
  },
  {
    key: 'low',
    title: 'الضوء المنخفض',
    subtitle: 'Dipped / Low Beam',
    symbol: 'low',
    action: 'لف الحلقة إلى رمز الضوء المنخفض.',
    use: 'الوضع الأساسي لإنارة الطريق أمامك مع حزمة مضبوطة للأسفل لتقليل إبهار الآخرين.',
    caution: 'راقب الطريق والمستخدمين الآخرين ولا تتعامل مع الرمز وحده بمعزل عن الحالة.',
  },
  {
    key: 'high',
    title: 'الضوء العالي',
    subtitle: 'Main / High Beam',
    symbol: 'high',
    action: 'دفع المقبض للأمام، في الأنظمة التي تستخدم هذه الحركة للعالي.',
    use: 'عندما تحتاج إلى مدى أبعد والطريق يسمح بذلك ولا يوجد مستخدم طريق قد يتأذى من الإبهار.',
    caution: 'عند التقابل أو عند احتمال إبهار الآخرين، اخفضه فوراً.',
  },
  {
    key: 'frontFog',
    title: 'ضباب أمامي',
    subtitle: 'Front Fog',
    symbol: 'frontFog',
    action: 'لف حلقة الضباب إلى رمز الضباب الأمامي، إذا كانت السيارة مجهزة به.',
    use: 'للظروف التي تصبح فيها الرؤية صعبة، مع قيادة متناسبة مع مدى الرؤية.',
    caution: 'ليس ضوءاً عادياً لكل قيادة ليلية.',
  },
  {
    key: 'rearFog',
    title: 'ضباب خلفي',
    subtitle: 'Rear Fog',
    symbol: 'rearFog',
    action: 'لف حلقة الضباب إلى رمز الضباب الخلفي، إذا كانت السيارة مجهزة به.',
    use: 'لمساعدة المركبات خلفك على رؤية سيارتك في ظروف الرؤية الشديدة السوء.',
    caution: 'لا تستخدمه بلا حاجة لأنه ساطع جداً وقد يزعج السائق خلفك.',
  },
  {
    key: 'flash',
    title: 'وميض العالي',
    subtitle: 'Headlight Flash',
    symbol: 'flash',
    action: 'اسحب المقبض باتجاهك لحظياً في الأنظمة التي تستخدم هذه الحركة.',
    use: 'إعطاء وميض ضوئي سريع بدلاً من إبقاء الضوء العالي مفعلاً.',
    caution: 'الحركة الدقيقة قد تختلف بين السيارات، لذلك يجب معرفة دليل السيارة.',
  },
];

const SIGNALS: {
  key: SignalKey;
  title: string;
  subtitle: string;
  action: string;
  use: string;
  example: string;
}[] = [
  {
    key: 'right',
    title: 'غماز يمين',
    subtitle: 'UP ↑',
    action: 'ارفع ذراع الإشارة للأعلى.',
    use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليمين.',
    example: 'مثال: تريد الخروج من دوّار من المخرج الأيمن؛ راقب التخطيط والمسار، ثم استخدم الإشارة المناسبة قبل الخروج.',
  },
  {
    key: 'left',
    title: 'غماز يسار',
    subtitle: 'DOWN ↓',
    action: 'اخفض ذراع الإشارة للأسفل.',
    use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليسار أو بدء مناورة تحتاج هذا الاتجاه.',
    example: 'مثال: تريد الانتقال إلى مسار أيسر؛ مرايا → تأكد من خلو المسار → غماز → مناورة.',
  },
  {
    key: 'hazard',
    title: 'الغماز الرباعي',
    subtitle: 'HAZARD',
    action: 'زر التحذير الرباعي يكون غالباً منفصلاً عن ذراع الإشارة.',
    use: 'لإظهار تحذير متزامن لجميع مؤشرات الاتجاه عند الحاجة وفق حالة المركبة والطريق.',
    example: 'مثال: توقف اضطراري أو مركبة متوقفة في موضع خطر؛ لا تستخدمه كبديل عن الإشارة العادية عند الانعطاف.',
  },
];

const AUTOMATIC_LIGHTS = [
  {
    key: 'drl',
    title: 'أضواء النهار',
    subtitle: 'DRL',
    description: 'في سيارات كثيرة تعمل تلقائياً أثناء النهار ولا تكون وظيفة مستقلة على ذراع الإضاءة.',
    icon: 'sun',
  },
  {
    key: 'brake',
    title: 'أضواء الفرامل',
    subtitle: 'STOP',
    description: 'تضيء عند ضغط دواسة الفرامل، وتُعد جزءاً من منظومة الإضاءة الخلفية وليست زرّاً على المقبض.',
    icon: 'brake',
  },
  {
    key: 'reverse',
    title: 'ضوء الرجوع',
    subtitle: 'REVERSE',
    description: 'يعمل مع اختيار الرجوع للخلف في السيارة المجهزة بذلك، ويختلف تصميمه بحسب المركبة.',
    icon: 'reverse',
  },
];

const SCENARIOS = [
  {
    id: 'roundabout-right',
    tag: 'دوّار',
    title: 'الخروج من الدوّار إلى اليمين',
    control: 'right' as ControlKey,
    sequence: ['تأكد من المرآة', 'حدد المخرج', 'استخدم غماز اليمين عند الحاجة', 'اخرج بهدوء ضمن المسار'],
    note: 'هذا مثال تدريبي؛ التخطيط والشواخص وحالة الطريق هي المرجع الفعلي.',
    diagram: 'roundabout',
  },
  {
    id: 'lane-change',
    tag: 'مسار',
    title: 'الانتقال إلى المسار الأيسر',
    control: 'left' as ControlKey,
    sequence: ['مرآة', 'نظرة على النقطة العمياء', 'غماز يسار', 'انتقال تدريجي'],
    note: 'الغماز يخبر الآخرين بنيتك ولا يمنحك أولوية بحد ذاته.',
    diagram: 'lane-left',
  },
  {
    id: 'night-oncoming',
    tag: 'ليلاً',
    title: 'مركبة مقابلة على طريق مظلم',
    control: 'low' as ControlKey,
    sequence: ['أوقف العالي', 'انتقل للمنخفض', 'حافظ على رؤية الطريق', 'استمر بسرعة مناسبة'],
    note: 'الهدف هو رؤية الطريق بدون إبهار مستخدمي الطريق المقابلين.',
    diagram: 'oncoming',
  },
  {
    id: 'empty-road',
    tag: 'طريق مظلم',
    title: 'طريق خالٍ ورؤية تحتاج مدى أبعد',
    control: 'high' as ControlKey,
    sequence: ['تحقق من خلو الطريق', 'شغّل العالي', 'راقب المدى البعيد', 'اخفضه عند ظهور مستخدم طريق'],
    note: 'الحالة التعليمية تفترض أن الطريق يسمح باستخدام العالي.',
    diagram: 'open-road',
  },
  {
    id: 'fog',
    tag: 'رؤية صعبة',
    title: 'ضباب كثيف ومدى رؤية منخفض',
    control: 'frontFog' as ControlKey,
    sequence: ['خفف السرعة', 'شغّل الإنارة المناسبة', 'استخدم الضباب إذا كانت السيارة مجهزة', 'راقب مسافة التوقف'],
    note: 'المصباح لا يعوض عن خفض السرعة عندما تقل الرؤية.',
    diagram: 'fog',
  },
  {
    id: 'hazard-stop',
    tag: 'تحذير',
    title: 'توقف اضطراري في موضع قد يشكل خطراً',
    control: 'hazard' as ControlKey,
    sequence: ['توقف بأمان إن أمكن', 'شغّل التحذير عند الحاجة', 'اجعل المركبة مرئية', 'اتخذ الإجراء الآمن'],
    note: 'التحذير الرباعي حالة مختلفة عن الإشارة عند الانعطاف.',
    diagram: 'hazard',
  },
  {
    id: 'turn-right',
    tag: 'تقاطع',
    title: 'انعطاف يمين',
    control: 'right' as ControlKey,
    sequence: ['مرآة', 'غماز يمين', 'تموضع صحيح', 'انعطاف ضمن حدود الطريق'],
    note: 'الإشارة تُستخدم للتنبيه إلى نيتك قبل المناورة.',
    diagram: 'turn-right',
  },
  {
    id: 'rear-fog',
    tag: 'رؤية شديدة السوء',
    title: 'استخدام الضباب الخلفي',
    control: 'rearFog' as ControlKey,
    sequence: ['تحقق أن الرؤية سيئة فعلاً', 'اختر الضباب الخلفي إذا كانت السيارة مجهزة', 'انتبه للسائقين خلفك', 'أوقفه عندما تتحسن الرؤية'],
    note: 'الضباب الخلفي شديد السطوع ويُستخدم فقط عندما تكون الحاجة واضحة.',
    diagram: 'fog',
  },
  {
    id: 'park-night',
    tag: 'وقوف ليلاً',
    title: 'مركبة متوقفة وتحتاج أن تكون واضحة',
    control: 'position' as ControlKey,
    sequence: ['اختر مكان الوقوف الآمن', 'استخدم إنارة الموضع إذا كانت الحالة تتطلبها', 'اجعل المركبة واضحة', 'لا تعتمد على الموضع لإنارة الطريق'],
    note: 'التشغيل الفعلي للأضواء أثناء الوقوف يعتمد أيضاً على قواعد المكان وتجهيز السيارة.',
    diagram: 'hazard',
  },
  {
    id: 'overtake',
    tag: 'تجاوز',
    title: 'بدء مناورة تجاوز',
    control: 'left' as ControlKey,
    sequence: ['تأكد من السماح بالتجاوز', 'مرآة ونقطة عمياء', 'غماز', 'مناورة آمنة ثم عودة للمسار'],
    note: 'لا يكفي تشغيل الغماز وحده؛ القرار مرتبط بالطريق والرؤية والأنظمة المرورية.',
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

  if (type === 'off') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <circle cx="42" cy="32" r="10" fill={filled ? stroke : 'none'} stroke={stroke} strokeWidth="3" />
        <path d="M22 32H12M72 32H88M42 12V4M42 52V60" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'position') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path d="M10 18h23c8 0 13 6 15 14H10V18Z" fill="none" stroke={stroke} strokeWidth="3" />
        <path d="M62 16v32M74 19v26M86 23v18" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'auto') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <circle cx="43" cy="32" r="11" fill="none" stroke={stroke} strokeWidth="3" />
        <path d="M43 10v-5M43 59v-5M20 32h-7M73 32h-7M27 16l-4-4M63 48l-4-4M27 48l-4 4M63 16l4-4" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <text x="79" y="38" fill={stroke} fontSize="13" fontWeight="900">A</text>
      </svg>
    );
  }

  if (type === 'low') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" />
        <path d="m62 18 24 8M62 29l24 8M62 40l18 6" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'high') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" />
        <path d="M62 12h28M62 23h28M62 34h28M62 45h28" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'frontFog' || type === 'rearFog') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path d="M10 12h23c8 0 14 7 16 19H10V12Z" fill="none" stroke={stroke} strokeWidth="3" />
        <path d={type === 'frontFog' ? 'm62 15 23 8M62 27h27M62 39 85 31' : 'm62 15-23 8M62 27H35M62 39 39 31'} stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <path d="M87 8c-8 7 8 10 0 17s8 11 0 20" fill="none" stroke={stroke} strokeWidth="2.5" />
      </svg>
    );
  }

  if (type === 'flash') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path d="M10 13h23c8 0 14 7 16 19H10V13Z" fill="none" stroke={stroke} strokeWidth="3" />
        <path d="M65 10h21M65 23h28M65 36h21M65 49h28" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'left' || type === 'right') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path
          d={type === 'right' ? 'M15 32h57M58 14l21 18-21 18' : 'M85 32H28M42 14 21 32l21 18'}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'hazard') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path d="M50 8 90 54H10Z" fill="none" stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        <path d="M50 24v14M50 44v2" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'sun') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <circle cx="50" cy="32" r="10" fill="none" stroke={stroke} strokeWidth="3" />
        <path d="M50 8v8M50 48v8M26 32h-8M82 32h-8M33 15l-6-6M73 49l-6-6M33 49l-6 6M73 15l6-6" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'brake') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <rect x="18" y="17" width="64" height="30" rx="10" fill="none" stroke={stroke} strokeWidth="3" />
        <rect x="26" y="23" width="18" height="18" rx="5" fill={filled ? stroke : 'none'} stroke={stroke} strokeWidth="2.5" />
        <rect x="56" y="23" width="18" height="18" rx="5" fill={filled ? stroke : 'none'} stroke={stroke} strokeWidth="2.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
      <rect x="18" y="18" width="64" height="28" rx="10" fill="none" stroke={stroke} strokeWidth="3" />
      <path d="m30 32 8-7 9 14 8-10 9 7" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PRACTICAL_CASES: {
  key: ControlKey;
  label: string;
  subtitle: string;
  description: string;
  action: string;
  symbol: LightItem['symbol'] | 'left' | 'right' | 'hazard';
}[] = [
  ...MAIN_LIGHTS.map(item => ({
    key: item.key as ControlKey,
    label: item.title,
    subtitle: item.subtitle,
    description: item.use,
    action: item.action,
    symbol: item.symbol,
  })),
  ...SIGNALS.map(item => ({
    key: item.key as ControlKey,
    label: item.title,
    subtitle: item.subtitle,
    description: item.use,
    action: item.action,
    symbol: item.key,
  })),
];

function StalkStateVisual({
  active,
  mainLight,
  signal,
}: {
  active: ControlKey;
  mainLight: MainLightKey;
  signal: SignalKey | null;
}) {
  const ringPosition =
    mainLight === 'off' ? 'pos-1'
      : mainLight === 'position' ? 'pos-2'
        : mainLight === 'auto' ? 'pos-3'
          : mainLight === 'low' ? 'pos-4'
            : 'pos-5';

  return (
    <div className={'carousel-stalk-visual state-' + active}>
      <div className="carousel-stalk-glow" />
      <img src="/spirit/stalk-lighting.svg" className="carousel-stalk-image" alt="مقبض أضواء السيارة والغمازات" />
      <span className={'carousel-ring-marker ' + ringPosition} />
      <span className="carousel-motion-arrow motion-up">↑</span>
      <span className="carousel-motion-arrow motion-down">↓</span>
      <span className="carousel-motion-arrow motion-forward">→</span>
      <span className="carousel-motion-arrow motion-pull">←</span>
      <div className="carousel-stalk-state-badge">
        <span>{signal ? 'حركة الذراع' : 'موضع الحلقة'}</span>
        <b>{signal === 'right' ? 'ارفع ↑' : signal === 'left' ? 'اخفض ↓' : signal === 'hazard' ? 'تحذير رباعي' : mainLight === 'high' ? 'ادفع →' : mainLight === 'flash' ? 'اسحب ←' : MAIN_LIGHTS.find(item => item.key === mainLight)?.title}</b>
      </div>
    </div>
  );
}

function LightingControlCarousel({
  mainLight,
  signal,
  onMainLight,
  onSignal,
  onFlash,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
  onMainLight: (key: MainLightKey) => void;
  onSignal: (key: SignalKey) => void;
  onFlash: () => void;
}) {
  const [index, setIndex] = useState(Math.max(
    0,
    PRACTICAL_CASES.findIndex(item => item.key === (signal ?? mainLight)),
  ));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);

  const current = PRACTICAL_CASES[index] ?? PRACTICAL_CASES[0];

  useEffect(() => {
    const activeKey = signal ?? mainLight;
    const next = PRACTICAL_CASES.findIndex(item => item.key === activeKey);
    if (next >= 0) setIndex(next);
  }, [mainLight, signal]);

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    const context = audioRef.current ?? new AudioCtor();
    audioRef.current = context;
    return context;
  };

  const playClick = async (kind: 'light' | 'signal') => {
    if (!soundEnabled) return;
    try {
      const context = getAudioContext();
      if (!context) return;
      if (context.state === 'suspended') await context.resume();

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'signal' ? 520 : 700, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'signal' ? 760 : 920, now + 0.045);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.085, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.10);
    } catch {
      // Audio is optional; the visual interaction must always continue.
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      const context = getAudioContext();
      if (context?.state === 'suspended') void context.resume();
    }
  };

  const applyCase = (item: typeof PRACTICAL_CASES[number]) => {
    setIndex(PRACTICAL_CASES.findIndex(x => x.key === item.key));
    if (item.key === 'right' || item.key === 'left' || item.key === 'hazard') {
      onSignal(item.key);
      playClick('signal');
    } else if (item.key === 'flash') {
      onFlash();
      playClick('light');
    } else {
      onMainLight(item.key);
      playClick('light');
    }
  };

  const move = (direction: -1 | 1) => {
    const next = (index + direction + PRACTICAL_CASES.length) % PRACTICAL_CASES.length;
    applyCase(PRACTICAL_CASES[next]);
  };

  return (
    <section className="lighting-control-carousel">
      <div className="carousel-heading">
        <div>
          <span className="lesson-eyebrow">02 · جرّب المقبض</span>
          <h2>قلّب الحالات بالأسهم وشاهد التغيير على السيارة</h2>
          <p>كل ضغطة تنتقل إلى حالة جديدة: المقبض يتغير بصرياً والسيارة تشغّل الضوء المقصود مباشرة.</p>
        </div>
        <button
          type="button"
          className={'sound-toggle ' + (soundEnabled ? 'is-on' : '')}
          onClick={toggleSound}
          aria-pressed={soundEnabled}
        >
          <span>{soundEnabled ? '♪' : '×'}</span>
          {soundEnabled ? 'الصوت مفعّل' : 'الصوت متوقف'}
        </button>
      </div>

      <div className="carousel-case-card">
        <button type="button" className="carousel-arrow carousel-prev" onClick={() => move(-1)} aria-label="الحالة السابقة">‹</button>

        <div className="carousel-case-main">
          <div className="carousel-case-counter">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i>/ {String(PRACTICAL_CASES.length).padStart(2, '0')}</i>
          </div>
          <div className="carousel-case-copy">
            <div className="carousel-case-icon"><LightSymbol type={current.symbol} /></div>
            <div>
              <span>{current.subtitle}</span>
              <h3>{current.label}</h3>
              <p>{current.description}</p>
            </div>
          </div>
          <div className="carousel-action-line">
            <b>الحركة</b>
            <span>{current.action}</span>
          </div>
          <StalkStateVisual active={current.key} mainLight={mainLight} signal={signal} />
        </div>

        <button type="button" className="carousel-arrow carousel-next" onClick={() => move(1)} aria-label="الحالة التالية">›</button>
      </div>

      <div className="carousel-quick-grid">
        {PRACTICAL_CASES.map(item => (
          <button
            type="button"
            key={item.key}
            className={current.key === item.key ? 'is-active' : ''}
            onClick={() => applyCase(item)}
          >
            <LightSymbol type={item.symbol} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>


      <VehicleScene mainLight={mainLight} signal={signal} />

      <div className="carousel-hint-row">
        <span>← السابق</span>
        <div className="carousel-dots">
          {PRACTICAL_CASES.map((item, itemIndex) => (
            <button
              type="button"
              key={item.key}
              className={itemIndex === index ? 'is-active' : ''}
              onClick={() => applyCase(item)}
              aria-label={'اختيار ' + item.label}
            />
          ))}
        </div>
        <span>التالي →</span>
      </div>

    </section>
  );
}

function VehicleScene({
  mainLight,
  signal,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
}) {
  const stageClass = [
    'vehicle-reference-stage',
    'light-' + mainLight,
    signal ? 'signal-' + signal : '',
  ].filter(Boolean).join(' ');

  const stateText =
    signal === 'right'
      ? 'غماز يمين'
      : signal === 'left'
        ? 'غماز يسار'
        : signal === 'hazard'
          ? 'الغماز الرباعي'
          : MAIN_LIGHTS.find(item => item.key === mainLight)?.title ?? 'إضاءة';

  const stateSub =
    signal
      ? 'مؤشرات الاتجاه تظهر على السيارة مباشرة'
      : mainLight === 'high'
        ? 'حزمة طويلة المدى'
        : mainLight === 'flash'
          ? 'وميض لحظي'
          : mainLight === 'frontFog'
            ? 'ضباب أمامي'
            : mainLight === 'rearFog'
              ? 'ضباب خلفي'
              : mainLight === 'low'
                ? 'إنارة الطريق'
                : mainLight === 'position' || mainLight === 'auto'
                  ? 'إضاءة تعريفية'
                  : 'الإنارة الرئيسية متوقفة';

  return (
    <div className={stageClass}>
      <div className="vehicle-stage-header">
        <div>
          <span className="lesson-eyebrow">المشهد الحي</span>
          <h3>السيارة هي شاشة النتيجة</h3>
          <p>اختر أي وظيفة من الأسفل، وسيتغير موضع الإنارة الذي يهمك أمامك.</p>
        </div>
        <div className="vehicle-stage-state"><small>مفعّل الآن</small><strong>{stateText}</strong><span>{stateSub}</span></div>
      </div>

      <div className="vehicle-reference-grid">
        <div className="vehicle-reference-card">
          <div className="vehicle-card-label"><span>01</span><div><b>الأمام</b><small>مصابيح الطريق · الضباب · غماز الاتجاه</small></div></div>
          <div className="vehicle-visual front">
            <span className="vehicle-beam beam-left" />
            <span className="vehicle-beam beam-right" />
            <span className="vehicle-fog-beam fog-left" />
            <span className="vehicle-fog-beam fog-right" />
            <img src="/spirit/car-front-sport.svg" className="vehicle-reference-image vehicle-reference-image--base" alt="السيارة من الأمام" />
            <img src="/spirit/car-front-sport.svg" className="vehicle-reference-image vehicle-reference-image--lit" alt="" aria-hidden="true" />
            <span className="vehicle-signal-marker front-left" />
            <span className="vehicle-signal-marker front-right" />
          </div>
          <div className="vehicle-card-caption"><span><i className="legend-white" /> إنارة أمامية</span><span><i className="legend-amber" /> غماز</span></div>
        </div>

        <div className="vehicle-reference-card">
          <div className="vehicle-card-label"><span>02</span><div><b>الخلف</b><small>أضواء الخلف · الضباب الخلفي · غماز الاتجاه</small></div></div>
          <div className="vehicle-visual rear">
            <img src="/spirit/car-rear.svg" className="vehicle-reference-image vehicle-reference-image--base" alt="السيارة من الخلف" />
            <img src="/spirit/car-rear.svg" className="vehicle-reference-image vehicle-reference-image--lit" alt="" aria-hidden="true" />
            <span className="vehicle-rear-fog rear-fog-left" />
            <span className="vehicle-rear-fog rear-fog-right" />
            <span className="vehicle-signal-marker rear-left" />
            <span className="vehicle-signal-marker rear-right" />
          </div>
          <div className="vehicle-card-caption"><span><i className="legend-red" /> إنارة خلفية</span><span><i className="legend-amber" /> غماز</span></div>
        </div>
      </div>

      <div className="vehicle-direction-note"><span>قاعدة بصرية</span><b>الأمام = أرى الطريق · الخلف = أجعل السيارة واضحة للآخرين · الغماز = أخبرهم باتجاهي</b></div>
    </div>
  );
}

function ScenarioDiagram({ kind }: { kind: string }) {
  const common = { viewBox: '0 0 440 180', className: 'scenario-svg', role: 'img', 'aria-hidden': true as const };

  if (kind === 'roundabout') {
    return (
      <svg {...common}>
        <rect width="440" height="180" rx="18" fill="#08161d" />
        <circle cx="220" cy="91" r="56" fill="#142b35" stroke="#81d7cf" strokeOpacity=".25" strokeWidth="5" />
        <circle cx="220" cy="91" r="25" fill="#09171d" stroke="#92b9bd" strokeOpacity=".14" strokeWidth="3" />
        <path d="M220 23v39M220 119v35M152 91h42M246 91h42" stroke="#c1d6d8" strokeOpacity=".22" strokeWidth="8" strokeLinecap="round" />
        <path d="M285 91c-3-29-24-52-56-57" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" />
        <path d="M293 91l-17-11v22z" fill="#8be5da" />
        <circle cx="347" cy="91" r="9" fill="#f0ad55" />
        <text x="364" y="94" fill="#f2f7f7" fontSize="12" fontWeight="900">مخرج يمين</text>
        <text x="220" y="18" textAnchor="middle" fill="#92dcd5" fontSize="10" fontWeight="900">دوّار</text>
      </svg>
    );
  }

  if (kind === 'lane-left') {
    return (
      <svg {...common}>
        <rect width="440" height="180" rx="18" fill="#08161d" />
        <path d="M60 0h135l45 180H105Z" fill="#142b35" />
        <path d="M245 0h135l-25 180H205Z" fill="#142b35" />
        <path d="M220 0v180" stroke="#d3e0e1" strokeOpacity=".22" strokeWidth="4" strokeDasharray="18 18" />
        <path d="M340 148c-48-14-87-41-114-82" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" />
        <path d="M226 66l16 5-11 16z" fill="#8be5da" />
        <circle cx="338" cy="149" r="9" fill="#f0ad55" />
      </svg>
    );
  }

  if (kind === 'oncoming') {
    return (
      <svg {...common}>
        <rect width="440" height="180" rx="18" fill="#071219" />
        <path d="M0 180 128 52h184L440 180Z" fill="#14262e" />
        <path d="M220 56v124" stroke="#c8dfe0" strokeOpacity=".20" strokeWidth="3" strokeDasharray="12 14" />
        <rect x="82" y="75" width="70" height="39" rx="12" fill="#192b32" stroke="#c1d4d6" strokeOpacity=".10" />
        <circle cx="95" cy="96" r="6" fill="#fff4c9" />
        <circle cx="139" cy="96" r="6" fill="#fff4c9" />
        <path d="M154 96h98" stroke="#fff1ad" strokeOpacity=".15" strokeWidth="15" strokeLinecap="round" />
        <path d="M286 112h66" stroke="#fff1ad" strokeOpacity=".32" strokeWidth="15" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'open-road') {
    return (
      <svg {...common}>
        <rect width="440" height="180" rx="18" fill="#07151c" />
        <path d="M0 180 152 58h136l152 122Z" fill="#152a33" />
        <path d="M220 60v120" stroke="#d4e3e4" strokeOpacity=".22" strokeWidth="4" strokeDasharray="14 14" />
        <path d="M200 78h40v18h-40zM194 119h52v22h-52z" fill="#fff7d2" opacity=".28" />
        <path d="M197 129 84 90" stroke="#fff8cf" strokeOpacity=".22" strokeWidth="15" />
        <path d="M243 129 356 90" stroke="#fff8cf" strokeOpacity=".22" strokeWidth="15" />
      </svg>
    );
  }

  if (kind === 'fog') {
    return (
      <svg {...common}>
        <rect width="440" height="180" rx="18" fill="#8da4a6" opacity=".12" />
        <path d="M0 180 120 56h200l120 124Z" fill="#23383f" />
        <path d="M0 82h440M0 108h440M0 135h440" stroke="#dceaea" strokeOpacity=".14" strokeWidth="10" />
        <rect x="173" y="111" width="94" height="37" rx="14" fill="#13272f" />
        <rect x="184" y="118" width="28" height="18" rx="8" fill="#fff2bd" />
        <rect x="228" y="118" width="28" height="18" rx="8" fill="#fff2bd" />
      </svg>
    );
  }

  if (kind === 'hazard') {
    return (
      <svg {...common}>
        <rect width="440" height="180" rx="18" fill="#08161d" />
        <path d="M0 180V75h440v105Z" fill="#132831" />
        <rect x="168" y="78" width="105" height="54" rx="16" fill="#1d3037" stroke="#bdd0d2" strokeOpacity=".13" />
        <circle cx="183" cy="103" r="7" fill="#f0ad55" />
        <circle cx="258" cy="103" r="7" fill="#f0ad55" />
        <path d="M168 72 138 47M272 72l30-25M150 138l-24 20M290 138l24 20" stroke="#e5edf0" strokeOpacity=".16" strokeWidth="3" />
      </svg>
    );
  }

  if (kind === 'turn-right') {
    return (
      <svg {...common}>
        <rect width="440" height="180" rx="18" fill="#08161d" />
        <path d="M220 180V72h115V0M0 92h440" fill="none" stroke="#17313b" strokeWidth="58" />
        <path d="M250 150c35-5 64-27 78-59" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" />
        <path d="M328 91l-17-6 12-17z" fill="#8be5da" />
        <circle cx="249" cy="151" r="8" fill="#f0ad55" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect width="440" height="180" rx="18" fill="#08161d" />
      <path d="M0 180 118 48h204l118 132Z" fill="#142a33" />
      <path d="M220 48v132" stroke="#c7d9db" strokeOpacity=".18" strokeWidth="4" strokeDasharray="16 16" />
      <rect x="110" y="91" width="77" height="43" rx="13" fill="#22373f" />
      <rect x="252" y="55" width="77" height="43" rx="13" fill="#22373f" />
      <path d="M194 93c25-13 42-21 64-26" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" />
      <path d="M257 63l15-8-2 17z" fill="#8be5da" />
      <circle cx="194" cy="93" r="8" fill="#f0ad55" />
    </svg>
  );
}

function ScenarioCard({
  scenario,
  onSelect,
  active,
}: {
  scenario: (typeof SCENARIOS)[number];
  onSelect: (control: ControlKey) => void;
  active: boolean;
}) {
  const controlLabel =
    scenario.control === 'right'
      ? 'غماز يمين'
      : scenario.control === 'left'
        ? 'غماز يسار'
        : scenario.control === 'hazard'
          ? 'تحذير رباعي'
          : MAIN_LIGHTS.find(x => x.key === scenario.control)?.title ?? '';

  return (
    <article className={'scenario-card ' + (active ? 'is-active' : '')}>
      <div className="scenario-media">
        <ScenarioDiagram kind={scenario.diagram} />
        <span className="scenario-tag">{scenario.tag}</span>
      </div>
      <div className="scenario-body">
        <div className="scenario-top">
          <span className="scenario-control-chip">{controlLabel}</span>
          <span className="scenario-dot" />
        </div>
        <h3>{scenario.title}</h3>
        <div className="scenario-steps">
          {scenario.sequence.map((step, index) => (
            <div key={step}><b>{String(index + 1).padStart(2, '0')}</b><span>{step}</span></div>
          ))}
        </div>
        <p>{scenario.note}</p>
        <button type="button" className="scenario-action" onClick={() => onSelect(scenario.control)}>
          جرّب هذه الحالة
          <span>←</span>
        </button>
      </div>
    </article>
  );
}

function DashboardIndicator({
  mainLight,
  signal,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
}) {
  return (
    <div className="dashboard-strip">
      <div className="dashboard-title">
        <span>شاهد مؤشرات الطبلون</span>
        <small>ربط الحركة بالرمز أسهل للحفظ</small>
      </div>
      <div className="dashboard-lamps">
        <span className={(signal === 'left' || signal === 'hazard') ? 'is-on is-green' : ''}><LightSymbol type="left" />يسار</span>
        <span className={(mainLight === 'high' || mainLight === 'flash') ? 'is-on is-blue' : ''}><LightSymbol type="high" />عالي</span>
        <span className={mainLight === 'frontFog' ? 'is-on is-green' : ''}><LightSymbol type="frontFog" />ضباب أمامي</span>
        <span className={mainLight === 'rearFog' ? 'is-on is-amber' : ''}><LightSymbol type="rearFog" />ضباب خلفي</span>
        <span className={(signal === 'right' || signal === 'hazard') ? 'is-on is-green' : ''}><LightSymbol type="right" />يمين</span>
      </div>
    </div>
  );
}

export default function PracticalInfo() {
  const navigate = useNavigate();
  const [mainLight, setMainLight] = useState<MainLightKey>('low');
  const [signal, setSignal] = useState<SignalKey | null>(null);
  const [flashCount, setFlashCount] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState('roundabout-right');

  const activeLight = useMemo(
    () => MAIN_LIGHTS.find(item => item.key === mainLight) ?? MAIN_LIGHTS[3],
    [mainLight],
  );

  useEffect(() => {
    if (!signal || signal === 'hazard') return;
    const timer = window.setTimeout(() => setSignal(null), 3200);
    return () => window.clearTimeout(timer);
  }, [signal]);

  const chooseMain = (key: MainLightKey) => {
    setMainLight(key);
    if (key !== 'flash') setSignal(null);
  };

  const chooseSignal = (key: SignalKey) => {
    setSignal(key);
    if (key !== 'hazard') setMainLight('low');
  };

  const doFlash = () => {
    setMainLight('flash');
    setSignal(null);
    setFlashCount(value => value + 1);
  };

  const applyScenario = (control: ControlKey) => {
    setSelectedScenario(
      SCENARIOS.find(item => item.control === control)?.id ?? selectedScenario,
    );
    if (control === 'right' || control === 'left' || control === 'hazard') chooseSignal(control);
    else chooseMain(control);
    window.scrollTo({ top: 220, behavior: 'smooth' });
  };

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
            <span>محاكاة تفاعلية</span>
            <b>قبل الاختبار العملي</b>
          </div>
        </div>
      </header>

      <main className="lighting-lab-main">
        <section className="lighting-intro">
          <div className="lighting-intro-copy">
            <span className="lesson-eyebrow">درس عملي</span>
            <h1>تعلّم المقبض كما تمسكه بيدك، وليس كزرّ بعيد على الشاشة.</h1>
            <p>
              اختر الوظيفة من الأزرار الكبيرة، ثم شاهد كيف تتغير السيارة. صورة المقبض تشرح الحركة بصرياً والنتيجة تظهر أمامك.
              ستتغير السيارة أمامك مباشرة لتربط <b>الحركة → الرمز → النتيجة على الطريق</b>.
            </p>
          </div>
          <div className="lighting-intro-metrics">
            <div><strong>08</strong><span>حالات إنارة رئيسية</span></div>
            <div><strong>03</strong><span>أنوار تعمل تلقائياً</span></div>
            <div><strong>10</strong><span>مواقف قيادة واقعية</span></div>
          </div>
        </section>

        <section className="lighting-main-scene">
          <div className="section-kicker">
            <span className="lesson-eyebrow">01 · النتيجة</span>
            <h2>شاهد الحالة على السيارة أولاً</h2>
            <p>كل ضغطة على زر أو حركة للمقبض تغيّر المصابيح أمامك مباشرة، من الأمام والخلف.</p>
          </div>

          <LightingControlCarousel
            mainLight={mainLight}
            signal={signal}
            onMainLight={chooseMain}
            onSignal={chooseSignal}
            onFlash={doFlash}
          />

          <div className="selected-state-panel">
            <div className="selected-state-icon">
              {signal ? <LightSymbol type={signal} /> : <LightSymbol type={activeLight.symbol} />}
            </div>
            <div className="selected-state-copy">
              <span>الحالة الحالية</span>
              <h3>{signal ? (signal === 'right' ? 'غماز يمين' : signal === 'left' ? 'غماز يسار' : 'الغماز الرباعي') : activeLight.title}</h3>
              <p>{signal ? SIGNALS.find(item => item.key === signal)?.example : activeLight.action}</p>
            </div>
            <div className="selected-state-purpose">
              <span>الفكرة</span>
              <strong>{signal ? SIGNALS.find(item => item.key === signal)?.use : activeLight.use}</strong>
            </div>
          </div>

          {mainLight === 'flash' && (
            <div className="flash-counter">
              وميض العالي تم تشغيله <b>{flashCount}</b> مرة في هذه الجلسة
            </div>
          )}
        </section>

        <section className="lighting-state-bank">
          <div className="section-kicker">
            <span className="lesson-eyebrow">03 · الرموز</span>
            <h2>كل أوضاع الإنارة الأساسية</h2>
            <p>كل وضع مرتبط بالرمز والحركة والاستخدام العملي.</p>
          </div>

          <div className="state-grid">
            {MAIN_LIGHTS.map(item => (
              <button
                type="button"
                key={item.key}
                className={'state-card ' + (mainLight === item.key ? 'is-active' : '')}
                onClick={() => chooseMain(item.key)}
              >
                <span className="state-card-icon"><LightSymbol type={item.symbol} /></span>
                <span className="state-card-copy"><b>{item.title}</b><small>{item.subtitle}</small></span>
                <span className="state-card-action">{mainLight === item.key ? '✓' : '↗'}</span>
              </button>
            ))}
          </div>

          <div className="state-detail">
            <div className="state-detail-head">
              <span>كيف أحرك المقبض؟</span>
              <strong>{activeLight.action}</strong>
            </div>
            <div className="state-detail-columns">
              <div><span>متى؟</span><p>{activeLight.use}</p></div>
              <div><span>انتبه</span><p>{activeLight.caution}</p></div>
            </div>
          </div>
        </section>

        <section className="signal-intensive">
          <div className="section-kicker">
            <span className="lesson-eyebrow">04 · الغمازات</span>
            <h2>الغمازات بتفصيل عملي</h2>
            <p>الفكرة ليست حفظ ↑ و↓ فقط؛ المطلوب أن تعرف متى تستخدمهما وما الذي يحدث للسيارة والطريق.</p>
          </div>

          <div className="signal-layout">
            <div className="signal-control-visual">
              <div className="signal-pillar">
                <div className="signal-arrow signal-arrow-right">
                  <LightSymbol type="right" />
                  <b>ارفع ↑</b>
                </div>
                <div className="signal-lever">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="signal-arrow signal-arrow-left">
                  <LightSymbol type="left" />
                  <b>اخفض ↓</b>
                </div>
              </div>
              <div className="signal-footnote">
                <strong>الغماز لا يمنحك أولوية</strong>
                <span>هو إخبار للآخرين بنيتك، أما الأمان فيحتاج مرايا ومسافة ومسار صحيح.</span>
              </div>
            </div>

            <div className="signal-cards">
              {SIGNALS.map(item => (
                <button
                  type="button"
                  key={item.key}
                  className={'signal-card ' + (signal === item.key ? 'is-active' : '')}
                  onClick={() => chooseSignal(item.key)}
                >
                  <span className="signal-card-symbol"><LightSymbol type={item.key} /></span>
                  <span className="signal-card-copy">
                    <b>{item.title}</b>
                    <small>{item.subtitle}</small>
                    <em>{item.action}</em>
                    <p>{item.use}</p>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="scenario-lab">
          <div className="section-kicker">
            <span className="lesson-eyebrow">05 · حالات واقعية</span>
            <h2>تدريب بالمواقف، وليس بالحفظ</h2>
            <p>كل حالة فيها رسم بسيط للطريق وتسلسل عملي لما يجب أن تراجعه قبل المناورة.</p>
          </div>

          <div className="scenario-grid">
            {SCENARIOS.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                active={selectedScenario === scenario.id}
                onSelect={applyScenario}
              />
            ))}
          </div>
        </section>

        <section className="automatic-lights">
          <div className="section-kicker">
            <span className="lesson-eyebrow">06 · أنوار أخرى</span>
            <h2>ليست كل الإنارة على المقبض</h2>
            <p>بعض الأضواء تعمل بحسب حالة السيارة نفسها، لذلك لا تحاول البحث لها عن زر غير موجود.</p>
          </div>

          <div className="automatic-grid">
            {AUTOMATIC_LIGHTS.map(item => (
              <article className="automatic-card" key={item.key}>
                <div className="automatic-icon"><LightSymbol type={item.icon as 'sun' | 'brake' | 'reverse'} /></div>
                <div>
                  <span>{item.subtitle}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lighting-memory">
          <div className="memory-title">
            <span className="lesson-eyebrow">07 · احفظها</span>
            <h2>احفظ من الحركة أولاً</h2>
            <p>لما تشوف المقبض في سيارة حقيقية، اسأل نفسك: الحلقة لأي وظيفة؟ الحركة ↑↓ لأي اتجاه؟ الدفع والسحب لأي نوع من الضوء؟</p>
          </div>
          <div className="memory-steps">
            <div><b>01</b><span>لف الحلقة</span><small>موضع · AUTO · منخفض</small></div>
            <div><b>02</b><span>لف حلقة الضباب</span><small>أمامي · خلفي</small></div>
            <div><b>03</b><span>ارفع / اخفض</span><small>يمين · يسار</small></div>
            <div><b>04</b><span>ادفع / اسحب</span><small>عالي · وميض</small></div>
          </div>
        </section>

        <div className="lighting-disclaimer">
          <span>ملاحظة مهمة</span>
          <p>
            شكل المقبض وترتيب الحلقات قد يختلف حسب الشركة والموديل. الصفحة تحاكي التوزيع الشائع لأغراض التدريب،
            بينما دليل السيارة هو المرجع عندما تكون أمام سيارة محددة.
          </p>
        </div>
      </main>
    </div>
  );
}
