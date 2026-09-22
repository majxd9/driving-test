import { useEffect, useMemo, useState } from 'react';
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

function StalkSimulator({
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
  const ringItems: { key: MainLightKey; label: string; symbol: LightItem['symbol'] }[] = [
    { key: 'off', label: 'OFF', symbol: 'off' },
    { key: 'position', label: 'موضع', symbol: 'position' },
    { key: 'auto', label: 'AUTO', symbol: 'auto' },
    { key: 'low', label: 'منخفض', symbol: 'low' },
  ];

  const fogItems = [
    { key: 'frontFog' as MainLightKey, label: 'ضباب أمامي', symbol: 'frontFog' as LightItem['symbol'] },
    { key: 'rearFog' as MainLightKey, label: 'ضباب خلفي', symbol: 'rearFog' as LightItem['symbol'] },
  ];

  return (
    <div className="stalk-simulator">
      <div className="stalk-simulator-head">
        <div>
          <span className="lesson-eyebrow">محاكاة المقبض</span>
          <h3>حرّكه مثل المقبض الحقيقي</h3>
          <p>الحركة تختلف قليلاً بين السيارات، لكن هذا النموذج يشرح التوزيع الشائع.</p>
        </div>
        <div className="stalk-state-pill">
          <span>الحالة</span>
          <strong>{signal ? (signal === 'right' ? 'غماز يمين' : signal === 'left' ? 'غماز يسار' : 'تحذير رباعي') : MAIN_LIGHTS.find(x => x.key === mainLight)?.title}</strong>
        </div>
      </div>

      <div className="stalk-stage">
        <svg viewBox="0 0 900 330" role="img" aria-label="مقبض تحكم واقعي بأضواء السيارة والغمازات" className="stalk-svg">
          <defs>
            <linearGradient id="stk-body" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6e7a80" />
              <stop offset="28%" stopColor="#39464d" />
              <stop offset="58%" stopColor="#1b252b" />
              <stop offset="100%" stopColor="#080e12" />
            </linearGradient>
            <linearGradient id="stk-ring" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#d4dde0" />
              <stop offset="24%" stopColor="#728188" />
              <stop offset="65%" stopColor="#27343b" />
              <stop offset="100%" stopColor="#11181d" />
            </linearGradient>
            <linearGradient id="stk-end" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#65747b" />
              <stop offset="55%" stopColor="#232f36" />
              <stop offset="100%" stopColor="#0b1318" />
            </linearGradient>
            <filter id="stk-shadow" x="-40%" y="-80%" width="180%" height="260%">
              <feDropShadow dx="0" dy="18" stdDeviation="13" floodOpacity=".42" />
            </filter>
          </defs>

          <ellipse cx="445" cy="286" rx="350" ry="22" fill="#000" opacity=".30" />
          <path d="M70 188C170 130 266 107 398 107H686" stroke="#050a0d" strokeWidth="61" strokeLinecap="round" opacity=".78" filter="url(#stk-shadow)" />
          <path d="M70 178C170 121 268 100 398 100H684" stroke="url(#stk-body)" strokeWidth="45" strokeLinecap="round" />
          <path d="M78 164C177 116 275 98 402 98H675" stroke="#e9f1f3" strokeOpacity=".16" strokeWidth="6" strokeLinecap="round" />

          <g>
            <rect x="390" y="69" width="136" height="60" rx="29" fill="#090f13" stroke="#cad5d7" strokeOpacity=".14" />
            <rect x="399" y="78" width="118" height="42" rx="21" fill="url(#stk-ring)" stroke="#cdd7d9" strokeOpacity=".17" />

            {ringItems.map((item, index) => {
              const x = 410 + index * 27.5;
              return (
                <g key={item.key} transform={'translate(' + x + ' 78)'} className={mainLight === item.key ? 'stalk-icon-active' : ''}>
                  <rect x="0" y="0" width="24" height="42" rx="11" fill={mainLight === item.key ? '#1b5e5d' : '#10181d'} stroke={mainLight === item.key ? '#95ece0' : '#aebdc0'} strokeOpacity={mainLight === item.key ? '.65' : '.10'} />
                  <foreignObject x="2" y="6" width="20" height="18">
                    <button
                      type="button"
                      className="stalk-inline-button"
                      onClick={() => onMainLight(item.key)}
                      aria-label={'اختيار ' + item.label}
                      title={item.label}
                    >
                      <LightSymbol type={item.symbol} />
                    </button>
                  </foreignObject>
                  <text x="12" y="35" textAnchor="middle" fill={mainLight === item.key ? '#a4f1e8' : '#b5c3c6'} fontSize="6.5" fontWeight="900">{item.label}</text>
                </g>
              );
            })}
          </g>

          <g>
            <rect x="694" y="82" width="108" height="101" rx="32" fill="#0b1217" stroke="#cbd7d9" strokeOpacity=".14" />
            <rect x="706" y="95" width="84" height="75" rx="27" fill="url(#stk-end)" stroke="#cad5d7" strokeOpacity=".12" />
            <path d="M718 108h60M718 123h60M718 138h60M718 153h60" stroke="#a8b8bc" strokeOpacity=".18" strokeWidth="2" strokeLinecap="round" />
            <circle cx="748" cy="199" r="28" fill="url(#stk-ring)" stroke="#cdd9db" strokeOpacity=".24" />
            <circle cx="748" cy="199" r="19" fill="#0c1419" stroke="#7c8c91" strokeOpacity=".35" />
            {fogItems.map((item, i) => (
              <g key={item.key} transform={'translate(' + (712 + i * 46) + ' 190)'}>
                <foreignObject x="0" y="0" width="34" height="20">
                  <button
                    type="button"
                    className="stalk-fog-button"
                    onClick={() => onMainLight(item.key)}
                    aria-label={'اختيار ' + item.label}
                    title={item.label}
                  >
                    <LightSymbol type={item.symbol} />
                  </button>
                </foreignObject>
              </g>
            ))}
          </g>

          <g>
            <rect x="544" y="90" width="121" height="38" rx="19" fill="#0b1318" stroke="#cdd7d9" strokeOpacity=".11" />
            <text x="604" y="114" textAnchor="middle" fill="#9fe6dd" fontSize="9" fontWeight="900">حلقة الإنارة</text>
          </g>

          <g className={signal === 'right' ? 'signal-active' : ''}>
            <path d="M610 230v-56" stroke="#0c1318" strokeWidth="20" strokeLinecap="round" />
            <path d="M610 230v-56" stroke="url(#stk-body)" strokeWidth="14" strokeLinecap="round" />
            <path d="M610 176l-12 14h24z" fill="#a8f0e7" opacity=".75" />
            <text x="610" y="156" textAnchor="middle" fill={signal === 'right' ? '#a8f0e7' : '#9aabad'} fontSize="10" fontWeight="900">↑ يمين</text>
          </g>

          <g className={signal === 'left' ? 'signal-active' : ''}>
          <g>
            <rect x="718" y="214" width="86" height="67" rx="18" fill="#130f10" stroke="#d9b7b8" strokeOpacity=".15" />
            <rect x="726" y="222" width="70" height="51" rx="14" fill="#5b2222" stroke="#ff8b83" strokeOpacity=".22" />
            <path d="M761 232 781 263H741Z" fill="none" stroke="#ff9b8f" strokeWidth="4" strokeLinejoin="round" />
            <path d="M761 242v10M761 257v1" stroke="#ff9b8f" strokeWidth="4" strokeLinecap="round" />
            <text x="761" y="293" textAnchor="middle" fill="#dcaeac" fontSize="8" fontWeight="900">زر التحذير الرباعي</text>
          </g>

            <path d="M610 230v56" stroke="#0c1318" strokeWidth="20" strokeLinecap="round" />
            <path d="M610 230v56" stroke="url(#stk-body)" strokeWidth="14" strokeLinecap="round" />
            <path d="M610 284l-12-14h24z" fill="#a8f0e7" opacity=".75" />
            <text x="610" y="310" textAnchor="middle" fill={signal === 'left' ? '#a8f0e7' : '#9aabad'} fontSize="10" fontWeight="900">↓ يسار</text>
          </g>

          <g>
            <path d="M540 80C498 44 454 25 398 25" stroke="#8fe7dc" strokeOpacity=".35" strokeWidth="3" strokeDasharray="8 7" />
            <path d="M397 25l12-7v14z" fill="#8fe7dc" opacity=".7" />
            <text x="362" y="26" textAnchor="middle" fill="#b8d9d6" fontSize="10" fontWeight="800">لف الحلقة = تغيير الإضاءة</text>
          </g>

          <g>
            <path d="M450 204v65" stroke="#8fe7dc" strokeOpacity=".35" strokeWidth="3" strokeDasharray="8 7" />
            <path d="M450 270l-7-12h14z" fill="#8fe7dc" opacity=".7" />
            <text x="450" y="286" textAnchor="middle" fill="#b8d9d6" fontSize="10" fontWeight="800">اسحب نحوك = وميض العالي</text>
          </g>

          <g>
            <path d="M692 126L620 64" stroke="#8fe7dc" strokeOpacity=".35" strokeWidth="3" strokeDasharray="8 7" />
            <path d="M621 64l14 1-10 10z" fill="#8fe7dc" opacity=".7" />
            <text x="735" y="42" textAnchor="middle" fill="#b8d9d6" fontSize="10" fontWeight="800">ادفع للأمام = العالي</text>
          </g>

          <g>
            <rect x="245" y="211" width="168" height="39" rx="18" fill="#0a1318" stroke="#9adfd8" strokeOpacity=".10" />
            <text x="329" y="235" textAnchor="middle" fill="#b7d6d3" fontSize="9" fontWeight="800">↑ غماز يمين   ↓ غماز يسار</text>
          </g>
        </svg>

        <button
          type="button"
          className="stalk-hotspot stalk-hotspot-up"
          onClick={() => onSignal('right')}
          aria-label="رفع المقبض لتشغيل غماز اليمين"
          title="ارفع المقبض — غماز يمين"
        />
        <button
          type="button"
          className="stalk-hotspot stalk-hotspot-down"
          onClick={() => onSignal('left')}
          aria-label="خفض المقبض لتشغيل غماز اليسار"
          title="اخفض المقبض — غماز يسار"
        />
        <button
          type="button"
          className="stalk-hotspot stalk-hotspot-push"
          onClick={() => onMainLight('high')}
          aria-label="دفع المقبض للأمام لتشغيل الضوء العالي"
          title="ادفع للأمام — الضوء العالي"
        />
        <button
          type="button"
          className="stalk-hotspot stalk-hotspot-pull"
          onClick={onFlash}
          aria-label="سحب المقبض نحوك لتشغيل وميض العالي"
          title="اسحب نحوك — وميض العالي"
        />
        <button
          type="button"
          className="stalk-hotspot stalk-hotspot-hazard"
          onClick={() => onSignal('hazard')}
          aria-label="تشغيل الغماز الرباعي"
          title="الغماز الرباعي"
        />
      </div>

      <div className="stalk-action-grid">
        <button type="button" className={signal === 'right' ? 'stalk-action is-active' : 'stalk-action'} onClick={() => onSignal('right')}>
          <span className="stalk-action-icon"><LightSymbol type="right" /></span>
          <span><b>ارفع</b><small>غماز يمين</small></span>
        </button>
        <button type="button" className={signal === 'left' ? 'stalk-action is-active' : 'stalk-action'} onClick={() => onSignal('left')}>
          <span className="stalk-action-icon"><LightSymbol type="left" /></span>
          <span><b>اخفض</b><small>غماز يسار</small></span>
        </button>
        <button type="button" className={mainLight === 'high' ? 'stalk-action is-active' : 'stalk-action'} onClick={() => onMainLight('high')}>
          <span className="stalk-action-icon"><LightSymbol type="high" /></span>
          <span><b>ادفع</b><small>ضوء عالي</small></span>
        </button>
        <button type="button" className={mainLight === 'flash' ? 'stalk-action is-active' : 'stalk-action'} onClick={onFlash}>
          <span className="stalk-action-icon"><LightSymbol type="flash" /></span>
          <span><b>اسحب</b><small>وميض عالي</small></span>
        </button>
        <button type="button" className={signal === 'hazard' ? 'stalk-action is-active' : 'stalk-action'} onClick={() => onSignal('hazard')}>
          <span className="stalk-action-icon"><LightSymbol type="hazard" /></span>
          <span><b>اضغط</b><small>رباعي تحذير</small></span>
        </button>
      </div>
    </div>
  );
}

function VehicleScene({
  mainLight,
  signal,
}: {
  mainLight: MainLightKey;
  signal: SignalKey | null;
}) {
  const low = mainLight === 'low';
  const high = mainLight === 'high' || mainLight === 'flash';
  const position = mainLight === 'position' || mainLight === 'auto';
  const frontFog = mainLight === 'frontFog';
  const rearFog = mainLight === 'rearFog';
  const leftBlink = signal === 'left' || signal === 'hazard';
  const rightBlink = signal === 'right' || signal === 'hazard';

  return (
    <div className="vehicle-scene">
      <div className="vehicle-scene-labels">
        <div><span>من الأمام</span><b>المصابيح الأمامية + الضباب + غمازات الاتجاه</b></div>
        <div><span>من الخلف</span><b>أضواء الموضع + الضباب الخلفي + الفرامل والاتجاه</b></div>
      </div>

      <svg viewBox="0 0 1200 570" className="vehicle-scene-svg" role="img" aria-label="سيارة من الأمام والخلف مع إظهار حالات الإضاءة">
        <defs>
          <linearGradient id="vs-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#07131c" />
            <stop offset="52%" stopColor="#0b1d27" />
            <stop offset="100%" stopColor="#061016" />
          </linearGradient>
          <linearGradient id="vs-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b1bdc1" />
            <stop offset="20%" stopColor="#718087" />
            <stop offset="51%" stopColor="#394b54" />
            <stop offset="82%" stopColor="#1a2b34" />
            <stop offset="100%" stopColor="#0c161c" />
          </linearGradient>
          <linearGradient id="vs-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8f4f6" stopOpacity=".76" />
            <stop offset="44%" stopColor="#6e98a4" stopOpacity=".56" />
            <stop offset="100%" stopColor="#162f3b" stopOpacity=".95" />
          </linearGradient>
          <filter id="vs-light" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="vs-rear-light" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="1200" height="570" rx="28" fill="url(#vs-bg)" />
        <path d="M0 430Q220 335 600 350T1200 430V570H0Z" fill="#08151b" />
        <path d="M0 570V450Q260 368 600 382T1200 450V570Z" fill="#0f242d" opacity=".78" />
        <path d="M298 570 483 394M902 570 717 394" stroke="#c7dedf" strokeOpacity=".10" strokeWidth="3" />
        <path d="M600 392v178" stroke="#cfe1e2" strokeOpacity=".12" strokeWidth="4" strokeDasharray="18 20" />

        <g transform="translate(70 120)">
          <ellipse cx="255" cy="357" rx="222" ry="25" fill="#000" opacity=".32" />
          <path d="M35 299Q40 245 89 229L130 169Q164 125 235 125H275Q346 125 380 169L421 229Q470 245 475 299Q469 338 426 347H84Q41 338 35 299Z" fill="url(#vs-body)" stroke="#dce7e9" strokeOpacity=".28" strokeWidth="2.7" />
          <path d="M128 170Q165 128 235 126H277Q347 128 382 170L362 226H145Z" fill="url(#vs-glass)" stroke="#e2edef" strokeOpacity=".23" strokeWidth="2.2" />
          <path d="M236 127v98M278 128v98" stroke="#edf6f6" strokeOpacity=".13" strokeWidth="2" />
          <path d="M92 236h330" stroke="#e5eef0" strokeOpacity=".15" strokeWidth="2" />
          <path d="M110 278H402" stroke="#e5eef0" strokeOpacity=".08" strokeWidth="2" />
          <path d="M78 331h355" stroke="#d4e0e2" strokeOpacity=".13" strokeWidth="2" />

          <g>
            <rect x="92" y="257" width="95" height="57" rx="20" fill="#0a1419" stroke="#cad8da" strokeOpacity=".19" />
            <rect x="323" y="257" width="95" height="57" rx="20" fill="#0a1419" stroke="#cad8da" strokeOpacity=".19" />
            <rect x="102" y="266" width="75" height="39" rx="14" fill="#fff7d0" opacity={high ? 1 : low ? .86 : position ? .48 : .10} filter={(high || low || position) ? "url(#vs-light)" : undefined} />
            <rect x="333" y="266" width="75" height="39" rx="14" fill="#fff7d0" opacity={high ? 1 : low ? .86 : position ? .48 : .10} filter={(high || low || position) ? "url(#vs-light)" : undefined} />
            <ellipse cx="139" cy="284" rx="18" ry="10" fill="#effcff" opacity={high ? 1 : low ? .85 : .30} />
            <ellipse cx="371" cy="284" rx="18" ry="10" fill="#effcff" opacity={high ? 1 : low ? .85 : .30} />
          </g>

          <g>
            <rect x="191" y="274" width="56" height="24" rx="9" fill="#101e24" stroke="#e1edf0" strokeOpacity=".17" />
            <rect x="253" y="274" width="56" height="24" rx="9" fill="#101e24" stroke="#e1edf0" strokeOpacity=".17" />
            <rect x="197" y="280" width="44" height="10" rx="5" fill="#fff0b7" opacity={frontFog ? 1 : .07} filter={frontFog ? "url(#vs-light)" : undefined} />
            <rect x="259" y="280" width="44" height="10" rx="5" fill="#fff0b7" opacity={frontFog ? 1 : .07} filter={frontFog ? "url(#vs-light)" : undefined} />
          </g>

          <g>
            <circle cx="88" cy="318" r="13" fill="#f3b55d" opacity={leftBlink ? 1 : .10} filter={leftBlink ? "url(#vs-light)" : undefined} />
            <circle cx="421" cy="318" r="13" fill="#f3b55d" opacity={rightBlink ? 1 : .10} filter={rightBlink ? "url(#vs-light)" : undefined} />
            <path d="M64 314h-22M82 341l-13 10M421 341l13 10M445 314h22" stroke="#d7e5e7" strokeOpacity=".16" strokeWidth="2" strokeLinecap="round" />
          </g>

          {low && (
            <g opacity=".65">
              <path d="M111 286L-35 243V325L111 297Z" fill="#fff1b1" opacity=".22" />
              <path d="M409 286l146-43V325l-146-28Z" fill="#fff1b1" opacity=".22" />
            </g>
          )}

          {high && (
            <g opacity=".62">
              <path d="M102 282L-60 208V278L102 299Z" fill="#fffde2" opacity=".25" />
              <path d="M418 282l162-74v70l-162 21Z" fill="#fffde2" opacity=".25" />
            </g>
          )}

          <rect x="138" y="361" width="234" height="31" rx="15.5" fill="#071118" stroke="#d6e4e5" strokeOpacity=".09" />
          <text x="255" y="382" textAnchor="middle" fill="#cde1e1" fontSize="11" fontWeight="850">واجهة السيارة الأمامية</text>
        </g>

        <g transform="translate(655 120)">
          <ellipse cx="255" cy="357" rx="222" ry="25" fill="#000" opacity=".32" />
          <path d="M35 299Q40 245 89 229L130 169Q164 125 235 125H275Q346 125 380 169L421 229Q470 245 475 299Q469 338 426 347H84Q41 338 35 299Z" fill="url(#vs-body)" stroke="#dce7e9" strokeOpacity=".27" strokeWidth="2.7" />
          <path d="M128 170Q165 128 235 126H277Q347 128 382 170L362 226H145Z" fill="url(#vs-glass)" stroke="#e2edef" strokeOpacity=".20" strokeWidth="2.2" />
          <path d="M236 127v98" stroke="#edf6f6" strokeOpacity=".13" strokeWidth="2" />
          <path d="M92 236h330" stroke="#e5eef0" strokeOpacity=".12" strokeWidth="2" />

          <g>
            <rect x="92" y="260" width="100" height="68" rx="23" fill="#0a1419" stroke="#cad8da" strokeOpacity=".18" />
            <rect x="318" y="260" width="100" height="68" rx="23" fill="#0a1419" stroke="#cad8da" strokeOpacity=".18" />
            <rect x="102" y="271" width="80" height="43" rx="15" fill="#cf403f" opacity={rearFog || position ? .88 : .32} filter={(rearFog || position) ? "url(#vs-rear-light)" : undefined} />
            <rect x="328" y="271" width="80" height="43" rx="15" fill="#cf403f" opacity={rearFog || position ? .88 : .32} filter={(rearFog || position) ? "url(#vs-rear-light)" : undefined} />
            <rect x="118" y="282" width="47" height="13" rx="6.5" fill="#ffefed" opacity={rightBlink ? 1 : .10} />
            <rect x="345" y="282" width="47" height="13" rx="6.5" fill="#ffefed" opacity={leftBlink ? 1 : .10} />
          </g>

          <g>
            <rect x="193" y="274" width="124" height="53" rx="15" fill="#101c22" stroke="#d4e2e4" strokeOpacity=".13" />
            <rect x="208" y="286" width="94" height="14" rx="7" fill="#d7e9eb" opacity=".10" />
            <path d="M215 309h80" stroke="#d5e2e4" strokeOpacity=".13" strokeWidth="2" />
          </g>

          <g>
            <rect x="92" y="333" width="96" height="15" rx="7.5" fill="#e24843" opacity={rearFog ? 1 : .16} filter={rearFog ? "url(#vs-rear-light)" : undefined} />
            <rect x="318" y="333" width="96" height="15" rx="7.5" fill="#e24843" opacity={rearFog ? 1 : .16} filter={rearFog ? "url(#vs-rear-light)" : undefined} />
          </g>

          <path d="M84 350h342" stroke="#d3e2e3" strokeOpacity=".11" strokeWidth="2" />
          <rect x="134" y="361" width="234" height="31" rx="15.5" fill="#071118" stroke="#d6e4e5" strokeOpacity=".09" />
          <text x="251" y="382" textAnchor="middle" fill="#cde1e1" fontSize="11" fontWeight="850">واجهة السيارة الخلفية</text>
        </g>

        <g transform="translate(30 38)">
          <rect width="260" height="50" rx="16" fill="#07131a" stroke="#bcdadd" strokeOpacity=".10" />
          <text x="130" y="22" textAnchor="middle" fill="#83ddd2" fontSize="10" fontWeight="900">الحالة الحالية</text>
          <text x="130" y="40" textAnchor="middle" fill="#edf7f7" fontSize="14" fontWeight="900">
            {signal ? (signal === 'right' ? 'غماز يمين' : signal === 'left' ? 'غماز يسار' : 'تحذير رباعي') : (MAIN_LIGHTS.find(x => x.key === mainLight)?.title ?? 'إضاءة')}
          </text>
        </g>
      </svg>

      <div className="scene-legend">
        <span><i className="lamp lamp-white" /> إنارة أمامية</span>
        <span><i className="lamp lamp-amber" /> غماز</span>
        <span><i className="lamp lamp-red" /> إنارة خلفية</span>
      </div>
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
              اضغط على الرمز الموجود على الحلقة، ارفع المقبض أو اخفضه، ادفعه للأمام أو اسحبه نحوك.
              ستتغير السيارة أمامك مباشرة لتربط <b>الحركة → الرمز → النتيجة على الطريق</b>.
            </p>
          </div>
          <div className="lighting-intro-metrics">
            <div><strong>08</strong><span>حالات إنارة رئيسية</span></div>
            <div><strong>03</strong><span>أنوار تعمل تلقائياً</span></div>
            <div><strong>08</strong><span>مواقف قيادة واقعية</span></div>
          </div>
        </section>

        <section className="lighting-command-center">
          <div className="section-kicker">
            <span className="lesson-eyebrow">01 · تحكم</span>
            <h2>المقبض أمامك</h2>
            <p>الأيقونات مرسومة على المقبض نفسه، والحركات لها مناطق لمس مباشرة.</p>
          </div>

          <StalkSimulator
            mainLight={mainLight}
            signal={signal}
            onMainLight={chooseMain}
            onSignal={chooseSignal}
            onFlash={doFlash}
          />

          <DashboardIndicator mainLight={mainLight} signal={signal} />
        </section>

        <section className="lighting-main-scene">
          <div className="section-kicker">
            <span className="lesson-eyebrow">02 · النتيجة</span>
            <h2>شاهد الأضواء على السيارة فعلياً</h2>
            <p>الإنارة الأمامية والخلفية وغمازات الاتجاه تظهر في أماكنها حتى لا تحفظها بشكل مجرد.</p>
          </div>

          <VehicleScene mainLight={mainLight} signal={signal} />

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
            <p>اضغط على أي رمز وشاهد الفرق في السيارة والمقبض معاً.</p>
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
