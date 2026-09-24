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

const RING_LIGHTS = MAIN_LIGHTS.filter(item => item.key !== 'high');

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
        ? 'PARK'
        : mainLight === 'auto'
          ? 'AUTO'
          : mainLight === 'low'
            ? 'LOW'
            : mainLight === 'high'
              ? 'HIGH'
              : mainLight === 'frontFog'
                ? 'FRONT FOG'
                : 'REAR FOG';

  const modeText =
    movement === 'left'
      ? 'اخفض الذراع = غماز يسار'
      : movement === 'right'
        ? 'ارفع الذراع = غماز يمين'
        : movement === 'push'
          ? 'ادفع الذراع = الضوء العالي'
          : movement === 'pull'
            ? 'اسحب لحظياً = وميض العالي'
            : movement === 'hazard'
              ? 'زر مستقل = التحذير الرباعي'
              : \`لف الحلقة = \${ringLabel}\`;

  const focusClass =
    movement === 'left' || movement === 'right' || movement === 'push' || movement === 'pull'
      ? 'focus-lever'
      : movement === 'hazard'
        ? 'focus-hazard'
        : 'focus-ring';

  return (
    <div className="handle-simulator">
      <div className="handle-simulator-head">
        <div>
          <span className="mini-eyebrow">المقبض الحقيقي بشكل أوضح</span>
          <h3>شوف أين تلمس وماذا تحرّك</h3>
          <p>
            استخدم الصورة كمرجع بصري: <b>الحلقة</b> لاختيار وظيفة الإنارة، <b>الذراع</b> للغماز والعالي والوميض،
            و<b>زر التحذير</b> كوظيفة مستقلة.
          </p>
        </div>
        <div className="handle-current">
          <small>أنت الآن</small>
          <strong>{modeText}</strong>
        </div>
      </div>

      <div className="handle-photo-stage">
        <div className="handle-photo-badge">صورة المقبض · اضغط الوظائف أسفلها</div>
        <img
          src="/spirit/stalk-lighting.svg"
          className={\`handle-photo \${focusClass} \${flashActive ? 'photo-flash' : ''}\`}
          alt="مقبض أضواء السيارة والغمازات مع توضيح اتجاهات الحركة"
        />

        <div className="handle-focus-ring" aria-hidden="true" />
        <div className="handle-focus-lever" aria-hidden="true" />
        <div className="handle-focus-hazard" aria-hidden="true" />

        <div className="handle-focus-caption">
          <span className="focus-dot" />
          <strong>{modeText}</strong>
          <small>{signal || flashActive ? 'راقب النتيجة على السيارة بالأسفل.' : 'اختر حركة أو وظيفة لترى مكانها بوضوح.'}</small>
        </div>
      </div>
    </div>
  );
}

function ScenarioDiagram({ kind }: { kind: string }) {
  const sceneCopy: Record<string, { eyebrow: string; title: string; detail: string }> = {
    roundabout: {
      eyebrow: 'دوّار',
      title: 'المخرج إلى اليمين',
      detail: 'المسار أولاً · ثم الإشارة · ثم الخروج',
    },
    'lane-left': {
      eyebrow: 'تغيير مسار',
      title: 'انتقال تدريجي إلى اليسار',
      detail: 'مرآة · نقطة عمياء · غماز · انتقال',
    },
    oncoming: {
      eyebrow: 'قيادة ليلية',
      title: 'مركبة مقابلة',
      detail: 'اخفض العالي حتى لا تُبهر المقابل',
    },
    'open-road': {
      eyebrow: 'طريق مظلم',
      title: 'مدى رؤية أطول',
      detail: 'العالي فقط عندما تسمح حالة الطريق',
    },
    fog: {
      eyebrow: 'ضباب كثيف',
      title: 'مدى الرؤية منخفض',
      detail: 'إنارة مناسبة + سرعة أقل + مسافة أمان',
    },
    'rear-fog': {
      eyebrow: 'ضباب خلفي',
      title: 'اجعل مركبتك واضحة',
      detail: 'استخدمه عند الحاجة ثم أوقفه عند تحسن الرؤية',
    },
    hazard: {
      eyebrow: 'توقف اضطراري',
      title: 'تحذير رباعي',
      detail: 'تحذير الآخرين من وجود مركبة في وضع خطر',
    },
    'turn-right': {
      eyebrow: 'تقاطع',
      title: 'انعطاف إلى اليمين',
      detail: 'مرآة · غماز · تموضع · انعطاف',
    },
    park: {
      eyebrow: 'وقوف ليلاً',
      title: 'المركبة واضحة',
      detail: 'وضوح المركبة لا يعني إنارة الطريق',
    },
    overtake: {
      eyebrow: 'تجاوز',
      title: 'بدء المناورة',
      detail: 'تأكد من السماح والفراغ قبل تغيير المسار',
    },
  };

  const copy = sceneCopy[kind] || sceneCopy['overtake'];

  return (
    <div className={\`scenario-visual scenario-visual-\${kind}\`}>
      <div className="scenario-sky">
        <span className="scenario-moon" />
        <span className="scenario-halo" />
        <i className="scenario-star s1" /><i className="scenario-star s2" /><i className="scenario-star s3" />
      </div>

      {kind === 'roundabout' ? (
        <div className="roundabout-scene">
          <div className="roundabout-ring"><div /></div>
          <img src="/spirit/car-front-sport.svg" className="scene-car scene-car-roundabout" alt="" aria-hidden="true" />
          <span className="scene-route route-roundabout" />
        </div>
      ) : (
        <div className="scenario-road">
          <div className="road-side-glow road-side-left" />
          <div className="road-side-glow road-side-right" />
          <div className="road-lane lane-one" />
          <div className="road-lane lane-two" />
          <div className="road-center-line" />

          {kind === 'oncoming' ? (
            <>
              <img src="/spirit/car-front-sport.svg" className="scene-car scene-car-ours scene-ours-front" alt="" aria-hidden="true" />
              <img src="/spirit/car-front-sport.svg" className="scene-car scene-car-other scene-other-front" alt="" aria-hidden="true" />
              <span className="scene-low-beam scene-ours-low left" />
              <span className="scene-low-beam scene-ours-low right" />
              <span className="scene-oncoming-glare" />
            </>
          ) : kind === 'rear-fog' || kind === 'hazard' || kind === 'park' ? (
            <>
              <img src="/spirit/car-rear.svg" className="scene-car scene-car-ours scene-ours-rear" alt="" aria-hidden="true" />
              <span className="scene-rear-lamp left" />
              <span className="scene-rear-lamp right" />
              {kind === 'rear-fog' && <><span className="scene-rear-fog-lamp left" /><span className="scene-rear-fog-lamp right" /></>}
              {kind === 'hazard' && <><span className="scene-hazard-lamp left" /><span className="scene-hazard-lamp right" /></>}
            </>
          ) : (
            <>
              <img src="/spirit/car-front-sport.svg" className="scene-car scene-car-ours scene-ours-front" alt="" aria-hidden="true" />
              <span className="scene-headlamp left" />
              <span className="scene-headlamp right" />
              {kind === 'fog' && <><span className="scene-fog-bank left" /><span className="scene-fog-bank right" /><div className="scene-fog-layer" /></>}
              {kind === 'open-road' && <><span className="scene-high-beam left" /><span className="scene-high-beam right" /><span className="scene-long-beam" /></>}
              {kind === 'lane-left' && <span className="scene-move-arrow arrow-left" />}
              {kind === 'turn-right' && <span className="scene-move-arrow arrow-right" />}
              {kind === 'overtake' && <><span className="scene-other-car" /><span className="scene-move-arrow arrow-left overtake-arrow" /></>}
            </>
          )}

          {kind === 'turn-right' && <div className="scene-intersection" />}
          {kind === 'park' && <div className="scene-curb" />}
        </div>
      )}

      <div className="scenario-scene-caption">
        <span>{copy.eyebrow}</span>
        <strong>{copy.title}</strong>
        <small>{copy.detail}</small>
      </div>
    </div>
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
    setMovementMode(key === 'high' ? 'push' : 'ring');
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
                    {RING_LIGHTS.map(item => (
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

              <div className="scenario-selector-label"><span>اختر موقفاً</span><small>المشهد الكبير يتبدل هنا فقط</small></div>
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
