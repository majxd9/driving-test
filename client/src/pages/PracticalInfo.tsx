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
type TabKey = 'lights' | 'signals' | 'scenarios' | 'automatic';

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
  { key: 'off', title: 'إيقاف', subtitle: 'OFF', symbol: 'off', action: 'لف حلقة الإنارة إلى OFF.', use: 'عندما لا تحتاج إلى تشغيل مصابيح هذه الوظيفة، مع مراعاة أن بعض السيارات تشغّل أضواء نهارية تلقائياً.', caution: 'موضع OFF لا يعني أن كل إنارة السيارة متوقفة في كل سيارة.' },
  { key: 'position', title: 'أضواء الموضع', subtitle: 'Position / Parking', symbol: 'position', action: 'لف الحلقة حتى رمز أضواء الموضع.', use: 'تُظهر المركبة وحدودها في الإضاءة المحيطة الضعيفة ولا تُعامل كبديل عن إنارة الطريق.', caution: 'لا تعتمد عليها وحدها عندما تحتاج إلى رؤية الطريق بوضوح.' },
  { key: 'auto', title: 'أوتوماتيك', subtitle: 'AUTO', symbol: 'auto', action: 'إن كانت السيارة مجهزة به، لف الحلقة إلى AUTO.', use: 'تتولى السيارة قرار تشغيل المصابيح وفق الحساسات والنظام المجهز بها.', caution: 'ليس موجوداً في كل سيارة، ولا يعني أن بقية الوظائف تعمل تلقائياً.' },
  { key: 'low', title: 'الضوء المنخفض', subtitle: 'Dipped / Low Beam', symbol: 'low', action: 'لف الحلقة إلى رمز الضوء المنخفض.', use: 'الوضع الأساسي لإنارة الطريق أمامك مع حزمة مضبوطة للأسفل لتقليل إبهار الآخرين.', caution: 'راقب الطريق والمستخدمين الآخرين ولا تتعامل مع الرمز وحده بمعزل عن الحالة.' },
  { key: 'high', title: 'الضوء العالي', subtitle: 'Main / High Beam', symbol: 'high', action: 'ادفع المقبض للأمام، في الأنظمة التي تستخدم هذه الحركة للعالي.', use: 'عندما تحتاج إلى مدى أبعد والطريق يسمح بذلك ولا يوجد مستخدم طريق قد يتأذى من الإبهار.', caution: 'عند التقابل أو احتمال إبهار الآخرين، اخفضه فوراً.' },
  { key: 'frontFog', title: 'ضباب أمامي', subtitle: 'Front Fog', symbol: 'frontFog', action: 'لف حلقة الضباب إلى رمز الضباب الأمامي، إذا كانت السيارة مجهزة به.', use: 'للظروف التي تصبح فيها الرؤية صعبة، مع قيادة متناسبة مع مدى الرؤية.', caution: 'ليس ضوءاً عادياً لكل قيادة ليلية.' },
  { key: 'rearFog', title: 'ضباب خلفي', subtitle: 'Rear Fog', symbol: 'rearFog', action: 'لف حلقة الضباب إلى رمز الضباب الخلفي، إذا كانت السيارة مجهزة به.', use: 'لمساعدة المركبات خلفك على رؤية سيارتك في ظروف الرؤية الشديدة السوء.', caution: 'لا تستخدمه بلا حاجة لأنه ساطع جداً وقد يزعج السائق خلفك.' },
];

const FLASH_ITEM: LightItem = {
  key: 'flash',
  title: 'وميض العالي',
  subtitle: 'Headlight Flash',
  symbol: 'flash',
  action: 'اسحب المقبض باتجاهك لحظياً في الأنظمة التي تستخدم هذه الحركة.',
  use: 'إعطاء وميض ضوئي سريع بدلاً من إبقاء الضوء العالي مفعلاً.',
  caution: 'الحركة الدقيقة قد تختلف بين السيارات، لذلك يجب معرفة دليل السيارة.',
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
  { key: 'right', title: 'غماز يمين', subtitle: 'UP ↑', symbol: 'right', action: 'ارفع ذراع الإشارة للأعلى.', use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليمين.', example: 'مثال: عند الخروج من دوّار إلى اليمين، تأكد من المسار ثم استخدم الإشارة المناسبة قبل الخروج.' },
  { key: 'left', title: 'غماز يسار', subtitle: 'DOWN ↓', symbol: 'left', action: 'اخفض ذراع الإشارة للأسفل.', use: 'للإشارة إلى نيتك بالانعطاف أو الانتقال نحو اليسار أو بدء مناورة تحتاج هذا الاتجاه.', example: 'مثال: قبل الانتقال لمسار أيسر: مرايا → نقطة عمياء → غماز → مناورة.' },
  { key: 'hazard', title: 'الغماز الرباعي', subtitle: 'HAZARD', symbol: 'hazard', action: 'زر التحذير الرباعي يكون غالباً منفصلاً عن ذراع الإشارة.', use: 'لإظهار تحذير متزامن لجميع مؤشرات الاتجاه عند الحاجة وفق حالة المركبة والطريق.', example: 'مثال: توقف اضطراري أو مركبة متوقفة في موضع خطر؛ لا تستخدمه كبديل عن الإشارة العادية عند الانعطاف.' },
];

const AUTOMATIC_LIGHTS = [
  { key: 'drl', title: 'أضواء النهار', subtitle: 'DRL', description: 'في سيارات كثيرة تعمل تلقائياً أثناء النهار ولا تكون وظيفة مستقلة على ذراع الإضاءة.', icon: 'sun' as const },
  { key: 'brake', title: 'أضواء الفرامل', subtitle: 'STOP', description: 'تضيء عند ضغط دواسة الفرامل، وتُعد جزءاً من منظومة الإضاءة الخلفية وليست زرّاً على المقبض.', icon: 'brake' as const },
  { key: 'reverse', title: 'ضوء الرجوع', subtitle: 'REVERSE', description: 'يعمل مع اختيار الرجوع للخلف في السيارة المجهزة بذلك، ويختلف تصميمه بحسب المركبة.', icon: 'reverse' as const },
];

const SCENARIOS = [
  { id: 'roundabout-right', tag: 'دوّار', title: 'الخروج من الدوّار إلى اليمين', control: 'right' as const, sequence: ['تأكد من المرآة', 'حدد المخرج', 'استخدم غماز اليمين عند الحاجة', 'اخرج بهدوء ضمن المسار'], note: 'هذا مثال تدريبي؛ التخطيط والشواخص وحالة الطريق هي المرجع الفعلي.', diagram: 'roundabout' },
  { id: 'lane-change', tag: 'مسار', title: 'الانتقال إلى المسار الأيسر', control: 'left' as const, sequence: ['مرآة', 'نظرة على النقطة العمياء', 'غماز يسار', 'انتقال تدريجي'], note: 'الغماز يخبر الآخرين بنيتك ولا يمنحك أولوية بحد ذاته.', diagram: 'lane-left' },
  { id: 'night-oncoming', tag: 'ليلاً', title: 'مركبة مقابلة على طريق مظلم', control: 'low' as const, sequence: ['أوقف العالي', 'انتقل للمنخفض', 'حافظ على رؤية الطريق', 'استمر بسرعة مناسبة'], note: 'الهدف هو رؤية الطريق بدون إبهار مستخدمي الطريق المقابلين.', diagram: 'oncoming' },
  { id: 'empty-road', tag: 'طريق مظلم', title: 'طريق خالٍ ورؤية تحتاج مدى أبعد', control: 'high' as const, sequence: ['تحقق من خلو الطريق', 'شغّل العالي', 'راقب المدى البعيد', 'اخفضه عند ظهور مستخدم طريق'], note: 'الحالة التعليمية تفترض أن الطريق يسمح باستخدام العالي.', diagram: 'open-road' },
  { id: 'fog', tag: 'رؤية صعبة', title: 'ضباب كثيف ومدى رؤية منخفض', control: 'frontFog' as const, sequence: ['خفف السرعة', 'شغّل الإنارة المناسبة', 'استخدم الضباب إذا كانت السيارة مجهزة', 'راقب مسافة التوقف'], note: 'المصباح لا يعوض عن خفض السرعة عندما تقل الرؤية.', diagram: 'fog' },
  { id: 'hazard-stop', tag: 'تحذير', title: 'توقف اضطراري في موضع قد يشكل خطراً', control: 'hazard' as const, sequence: ['توقف بأمان إن أمكن', 'شغّل التحذير عند الحاجة', 'اجعل المركبة مرئية', 'اتخذ الإجراء الآمن'], note: 'التحذير الرباعي حالة مختلفة عن الإشارة عند الانعطاف.', diagram: 'hazard' },
  { id: 'turn-right', tag: 'تقاطع', title: 'انعطاف يمين', control: 'right' as const, sequence: ['مرآة', 'غماز يمين', 'تموضع صحيح', 'انعطاف ضمن حدود الطريق'], note: 'الإشارة تُستخدم للتنبيه إلى نيتك قبل المناورة.', diagram: 'turn-right' },
  { id: 'rear-fog', tag: 'رؤية شديدة السوء', title: 'استخدام الضباب الخلفي', control: 'rearFog' as const, sequence: ['تحقق أن الرؤية سيئة فعلاً', 'اختر الضباب الخلفي إذا كانت السيارة مجهزة', 'انتبه للسائقين خلفك', 'أوقفه عندما تتحسن الرؤية'], note: 'الضباب الخلفي شديد السطوع ويُستخدم فقط عندما تكون الحاجة واضحة.', diagram: 'fog' },
  { id: 'park-night', tag: 'وقوف ليلاً', title: 'مركبة متوقفة وتحتاج أن تكون واضحة', control: 'position' as const, sequence: ['اختر مكان الوقوف الآمن', 'استخدم إنارة الموضع إذا كانت الحالة تتطلبها', 'اجعل المركبة واضحة', 'لا تعتمد على الموضع لإنارة الطريق'], note: 'التشغيل الفعلي للأضواء أثناء الوقوف يعتمد أيضاً على قواعد المكان وتجهيز السيارة.', diagram: 'hazard' },
  { id: 'overtake', tag: 'تجاوز', title: 'بدء مناورة تجاوز', control: 'left' as const, sequence: ['تأكد من السماح بالتجاوز', 'مرآة ونقطة عمياء', 'غماز', 'مناورة آمنة ثم عودة للمسار'], note: 'لا يكفي تشغيل الغماز وحده؛ القرار مرتبط بالطريق والرؤية والأنظمة المرورية.', diagram: 'overtake' },
];

const LIGHT_CONTROL_ITEMS = [...MAIN_LIGHTS, FLASH_ITEM];
const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

function LightSymbol({ type, className = '', filled = false }: {
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

function StalkStateVisual({ active, mainLight }: { active: MainLightKey | SignalKey | 'flash' }) {
  const isLeft = active === 'left';
  const isRight = active === 'right';
  const isHigh = active === 'high';
  const isFlash = active === 'flash';
  const isHazard = active === 'hazard';
  const ringActive = !isLeft && !isRight && !isHigh && !isFlash && !isHazard;
  const ringLabel = mainLight === 'off' ? 'OFF' : mainLight === 'position' ? 'P' : mainLight === 'auto' ? 'A' : mainLight === 'low' ? 'LOW' : mainLight === 'frontFog' ? 'FOG' : mainLight === 'rearFog' ? 'REAR' : 'LIGHT';

  const hint =
    isLeft ? '↓ غماز يسار' :
    isRight ? '↑ غماز يمين' :
    isHigh ? '→ العالي' :
    isFlash ? '← وميض لحظي' :
    isHazard ? '⚠ تحذير رباعي' :
    `↻ الحلقة: ${ringLabel}`;

  return (
    <div className="light-handle-card">
      <div className="light-handle-top">
        <span>المقبض التفاعلي</span>
        <strong>{hint}</strong>
      </div>
      <div className="light-handle-stage">
        <div className={`light-handle-body ${isLeft ? 'is-left' : ''} ${isRight ? 'is-right' : ''} ${isHigh ? 'is-high' : ''} ${isFlash ? 'is-flash' : ''}`}>
          <div className="light-handle-grip"><i /><i /><i /></div>
          <div className={`light-handle-ring ring-${mainLight} ${ringActive ? 'is-active' : ''}`}>
            <span>OFF</span><span>P</span><span>A</span><span>LOW</span><span>FOG</span><em />
          </div>
          <div className="light-handle-tip"><span>{isHazard ? '⚠' : '↕'}</span></div>
        </div>
        <button type="button" className={`light-hazard ${isHazard ? 'is-active' : ''}`} aria-label="تفعيل الغماز الرباعي">
          <span>△</span>
        </button>
        <div className={`light-handle-hint ${isHazard ? 'is-warning' : ''}`}>{isHazard ? 'اضغط زر التحذير' : hint}</div>
      </div>
      <div className="light-handle-footer">
        <span className={isLeft ? 'is-on' : ''}>يسار ↓</span>
        <span className={isRight ? 'is-on' : ''}>يمين ↑</span>
        <span className={isHigh ? 'is-on' : ''}>عالي →</span>
        <span className={isFlash ? 'is-on' : ''}>وميض ←</span>
        <span className={isHazard ? 'is-on' : ''}>تحذير ⚠</span>
      </div>
    </div>
  );
}

function VehicleScene({ mainLight, signal, flashActive }: { mainLight: MainLightKey; signal: SignalKey | null; flashActive: boolean }) {
  const stageClass = ['vehicle-result', `light-${mainLight}`, signal ? `signal-${signal}` : '', flashActive ? 'flash-active' : ''].filter(Boolean).join(' ');
  const stateText = signal === 'right' ? 'غماز يمين' : signal === 'left' ? 'غماز يسار' : signal === 'hazard' ? 'الغماز الرباعي' : flashActive ? 'وميض العالي' : MAIN_LIGHTS.find(item => item.key === mainLight)?.title ?? 'إضاءة';
  const stateSub = signal ? 'مؤشرات الاتجاه تظهر على السيارة مباشرة' : flashActive ? 'نبضة ضوئية لحظية' : mainLight === 'high' ? 'حزمة طويلة المدى' : mainLight === 'frontFog' ? 'ضباب أمامي' : mainLight === 'rearFog' ? 'ضباب خلفي' : mainLight === 'low' ? 'إنارة الطريق' : mainLight === 'position' || mainLight === 'auto' ? 'إضاءة تعريفية' : 'الإنارة الرئيسية متوقفة';

  return (
    <div className={stageClass}>
      <div className="vehicle-result-head">
        <div><span>النتيجة على السيارة</span><strong>{stateText}</strong></div>
        <small>{stateSub}</small>
      </div>
      <div className="vehicle-result-grid">
        <div className="vehicle-result-card">
          <div className="vehicle-result-label"><b>الأمام</b><span>إنارة الطريق + الضباب + الغماز</span></div>
          <div className="vehicle-visual front">
            <span className="vehicle-beam beam-left" /><span className="vehicle-beam beam-right" />
            <span className="vehicle-fog-beam fog-left" /><span className="vehicle-fog-beam fog-right" />
            <img src="/spirit/car-front-sport.svg" className="vehicle-img base" alt="السيارة من الأمام" />
            <img src="/spirit/car-front-sport.svg" className="vehicle-img lit" alt="" aria-hidden="true" />
            <span className="vehicle-signal front-left" /><span className="vehicle-signal front-right" />
          </div>
          <div className="vehicle-legend"><span><i className="legend-white" /> إنارة</span><span><i className="legend-amber" /> غماز</span></div>
        </div>
        <div className="vehicle-result-card">
          <div className="vehicle-result-label"><b>الخلف</b><span>الإنارة الخلفية + الضباب + الغماز</span></div>
          <div className="vehicle-visual rear">
            <img src="/spirit/car-rear.svg" className="vehicle-img base" alt="السيارة من الخلف" />
            <img src="/spirit/car-rear.svg" className="vehicle-img lit" alt="" aria-hidden="true" />
            <span className="vehicle-rear-fog rear-fog-left" /><span className="vehicle-rear-fog rear-fog-right" />
            <span className="vehicle-signal rear-left" /><span className="vehicle-signal rear-right" />
          </div>
          <div className="vehicle-legend"><span><i className="legend-red" /> إنارة خلفية</span><span><i className="legend-amber" /> غماز</span></div>
        </div>
      </div>
      <div className="vehicle-rule"><span>قاعدة بصرية</span><strong>الأمام = أرى الطريق · الخلف = أجعل السيارة واضحة للآخرين · الغماز = أخبرهم باتجاهي</strong></div>
    </div>
  );
}

function ScenarioDiagram({ kind }: { kind: string }) {
  const common = { viewBox: '0 0 440 180', className: 'scenario-svg', role: 'img', 'aria-label': 'رسم توضيحي للحالة' as const };
  if (kind === 'roundabout') return <svg {...common}><rect width="440" height="180" rx="18" fill="#08161d" /><circle cx="220" cy="91" r="56" fill="#142b35" stroke="#81d7cf" strokeOpacity=".25" strokeWidth="5" /><circle cx="220" cy="91" r="25" fill="#09171d" stroke="#92b9bd" strokeOpacity=".14" strokeWidth="3" /><path d="M220 23v39M220 119v35M152 91h42M246 91h42" stroke="#c1d6d8" strokeOpacity=".22" strokeWidth="8" strokeLinecap="round" /><path d="M285 91c-3-29-24-52-56-57" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" /><path d="M293 91l-17-11v22z" fill="#8be5da" /></svg>;
  if (kind === 'lane-left') return <svg {...common}><rect width="440" height="180" rx="18" fill="#08161d" /><path d="M60 0h135l45 180H105Z" fill="#142b35" /><path d="M245 0h135l-25 180H205Z" fill="#142b35" /><path d="M220 0v180" stroke="#d3e0e1" strokeOpacity=".22" strokeWidth="4" strokeDasharray="18 18" /><path d="M340 148c-48-14-87-41-114-82" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" /></svg>;
  if (kind === 'oncoming') return <svg {...common}><rect width="440" height="180" rx="18" fill="#071219" /><path d="M0 180 128 52h184L440 180Z" fill="#14262e" /><path d="M220 56v124" stroke="#c8dfe0" strokeOpacity=".20" strokeWidth="3" strokeDasharray="12 14" /><rect x="82" y="75" width="70" height="39" rx="12" fill="#192b32" /><circle cx="95" cy="96" r="6" fill="#fff4c9" /><circle cx="139" cy="96" r="6" fill="#fff4c9" /><path d="M154 96h98" stroke="#fff1ad" strokeOpacity=".15" strokeWidth="15" strokeLinecap="round" /><path d="M286 112h66" stroke="#fff1ad" strokeOpacity=".32" strokeWidth="15" strokeLinecap="round" /></svg>;
  if (kind === 'open-road') return <svg {...common}><rect width="440" height="180" rx="18" fill="#07151c" /><path d="M0 180 152 58h136l152 122Z" fill="#152a33" /><path d="M220 60v120" stroke="#d4e3e4" strokeOpacity=".22" strokeWidth="4" strokeDasharray="14 14" /><path d="M197 129 84 90M243 129 356 90" stroke="#fff8cf" strokeOpacity=".22" strokeWidth="15" /></svg>;
  if (kind === 'fog') return <svg {...common}><rect width="440" height="180" rx="18" fill="#8da4a6" opacity=".12" /><path d="M0 180 120 56h200l120 124Z" fill="#23383f" /><path d="M0 82h440M0 108h440M0 135h440" stroke="#dceaea" strokeOpacity=".14" strokeWidth="10" /><rect x="173" y="111" width="94" height="37" rx="14" fill="#13272f" /><rect x="184" y="118" width="28" height="18" rx="8" fill="#fff2bd" /><rect x="228" y="118" width="28" height="18" rx="8" fill="#fff2bd" /></svg>;
  if (kind === 'hazard') return <svg {...common}><rect width="440" height="180" rx="18" fill="#08161d" /><path d="M0 180V75h440v105Z" fill="#132831" /><rect x="168" y="78" width="105" height="54" rx="16" fill="#1d3037" /><circle cx="183" cy="103" r="7" fill="#f0ad55" /><circle cx="258" cy="103" r="7" fill="#f0ad55" /></svg>;
  if (kind === 'turn-right') return <svg {...common}><rect width="440" height="180" rx="18" fill="#08161d" /><path d="M220 180V72h115V0M0 92h440" fill="none" stroke="#17313b" strokeWidth="58" /><path d="M250 150c35-5 64-27 78-59" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" /></svg>;
  return <svg {...common}><rect width="440" height="180" rx="18" fill="#08161d" /><path d="M0 180 118 48h204l118 132Z" fill="#142a33" /><path d="M220 48v132" stroke="#c7d9db" strokeOpacity=".18" strokeWidth="4" strokeDasharray="16 16" /><rect x="110" y="91" width="77" height="43" rx="13" fill="#22373f" /><rect x="252" y="55" width="77" height="43" rx="13" fill="#22373f" /><path d="M194 93c25-13 42-21 64-26" fill="none" stroke="#8be5da" strokeWidth="7" strokeLinecap="round" /></svg>;
}

function ScenarioCard({ scenario, active, onSelect }: {
  scenario: (typeof SCENARIOS)[number];
  active: boolean;
  onSelect: (control: MainLightKey | SignalKey) => void;
}) {
  const label = scenario.control === 'right' ? 'غماز يمين' : scenario.control === 'left' ? 'غماز يسار' : scenario.control === 'hazard' ? 'تحذير رباعي' : MAIN_LIGHTS.find(x => x.key === scenario.control)?.title ?? '';
  return <article className={`scenario-card ${active ? 'is-active' : ''}`}>
    <div className="scenario-media"><ScenarioDiagram kind={scenario.diagram} /><span className="scenario-tag">{scenario.tag}</span></div>
    <div className="scenario-body">
      <div className="scenario-top"><span>{label}</span><i /></div>
      <h3>{scenario.title}</h3>
      <div className="scenario-steps">{scenario.sequence.map((step, i) => <div key={step}><b>{String(i + 1).padStart(2, '0')}</b><span>{step}</span></div>)}</div>
      <p>{scenario.note}</p>
      <button type="button" onClick={() => onSelect(scenario.control)}>جرّب هذه الحالة <span>←</span></button>
    </div>
  </article>;
}

function DashboardIndicator({ mainLight, signal }: { mainLight: MainLightKey; signal: SignalKey | null }) {
  return <div className="dashboard-indicator">
    <div><span>مؤشرات الطبلون</span><small>اربط الحركة بالرمز أسهل للحفظ</small></div>
    <div className="dashboard-lamps">
      <span className={signal === 'left' || signal === 'hazard' ? 'on green' : ''}><LightSymbol type="left" />يسار</span>
      <span className={mainLight === 'high' ? 'on blue' : ''}><LightSymbol type="high" />عالي</span>
      <span className={mainLight === 'frontFog' ? 'on green' : ''}><LightSymbol type="frontFog" />ضباب أمامي</span>
      <span className={mainLight === 'rearFog' ? 'on amber' : ''}><LightSymbol type="rearFog" />ضباب خلفي</span>
      <span className={signal === 'right' || signal === 'hazard' ? 'on green' : ''}><LightSymbol type="right" />يمين</span>
    </div>
  </div>;
}

export default function PracticalInfo() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('lights');
  const [mainLight, setMainLight] = useState<MainLightKey>('low');
  const [signal, setSignal] = useState<SignalKey | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [flashCount, setFlashCount] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState('roundabout-right');

  const activeLight = useMemo(() => MAIN_LIGHTS.find(item => item.key === mainLight) ?? MAIN_LIGHTS[3], [mainLight]);
  const activeSignal = useMemo(() => SIGNALS.find(item => item.key === signal) ?? null, [signal]);

  useEffect(() => {
    if (!flashActive) return;
    const timer = window.setTimeout(() => setFlashActive(false), 700);
    return () => window.clearTimeout(timer);
  }, [flashActive]);

  const chooseMain = (key: MainLightKey | 'flash') => {
    setTab('lights');
    setSignal(null);
    if (key === 'flash') {
      setFlashCount(value => value + 1);
      setFlashActive(true);
      return;
    }
    setFlashActive(false);
    setMainLight(key);
  };

  const chooseSignal = (key: SignalKey) => {
    setTab('signals');
    setSignal(key);
    setFlashActive(false);
  };

  const applyScenario = (control: MainLightKey | SignalKey) => {
    setSelectedScenario(SCENARIOS.find(item => item.control === control)?.id ?? selectedScenario);
    if (control === 'left' || control === 'right' || control === 'hazard') chooseSignal(control);
    else chooseMain(control);
    window.requestAnimationFrame(() => document.querySelector('.interactive-lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const activeHandle = flashActive ? 'flash' : signal ?? mainLight;
  const currentTitle = activeSignal?.title ?? (flashActive ? FLASH_ITEM.title : activeLight.title);
  const currentAction = activeSignal?.action ?? (flashActive ? FLASH_ITEM.action : activeLight.action);
  const currentUse = activeSignal?.use ?? (flashActive ? FLASH_ITEM.use : activeLight.use);
  const currentCaution = flashActive ? FLASH_ITEM.caution : activeSignal ? activeSignal.example : activeLight.caution;

  return (
    <div className="lighting-lab-page" dir="rtl">
      <header className="lighting-lab-header">
        <div className="lighting-lab-header-inner">
          <button type="button" className="lighting-back" onClick={() => navigate('/')} aria-label="العودة إلى الرئيسية"><span>→</span></button>
          <div className="lighting-brand"><span>مركز التدريب العملي</span><strong>أضواء السيارة والغمازات</strong></div>
          <div className="lighting-header-status"><i /><span>محاكاة تفاعلية</span><b>تعلم بالحركة والنتيجة</b></div>
        </div>
      </header>

      <main className="lighting-lab-main">
        <section className="lighting-intro">
          <div>
            <span className="lesson-eyebrow">درس عملي</span>
            <h1>تعلّم الإضاءة كما تمسك المقبض بيدك.</h1>
            <p>اختَر الوظيفة، شاهد حركة المقبض، ثم راقب أين تظهر الإضاءة على السيارة. كل شيء صار ضمن مساحة واحدة بدون قفزات تلقائية بالصفحة.</p>
          </div>
          <div className="lighting-intro-metrics">
            <div><strong>08</strong><span>أوضاع إنارة أساسية</span></div>
            <div><strong>03</strong><span>أنوار تعمل تلقائياً</span></div>
            <div><strong>10</strong><span>مواقف تدريبية</span></div>
          </div>
        </section>

        <section className="lighting-lab-shell">
          <nav className="lighting-tabs" aria-label="أقسام درس الإضاءة">
            <button className={tab === 'lights' ? 'active' : ''} onClick={() => { setTab('lights'); setSignal(null); }}><LightSymbol type="low" />الإنارة الأساسية</button>
            <button className={tab === 'signals' ? 'active' : ''} onClick={() => setTab('signals')}><LightSymbol type="right" />الغمازات</button>
            <button className={tab === 'scenarios' ? 'active' : ''} onClick={() => setTab('scenarios')}><span className="tab-number">10</span>حالات واقعية</button>
            <button className={tab === 'automatic' ? 'active' : ''} onClick={() => setTab('automatic')}><LightSymbol type="sun" />أنوار أخرى</button>
          </nav>

          {(tab === 'lights' || tab === 'signals') && (
            <section className="interactive-lab" aria-label="محاكاة الإضاءة">
              <div className="interactive-head">
                <div><span className="lesson-eyebrow">{tab === 'lights' ? '01 · الإنارة' : '02 · الغمازات'}</span><h2>{tab === 'lights' ? 'اختر الضوء وشاهد أثره فوراً' : 'اربط حركة الذراع بما تراه على السيارة'}</h2><p>لا يوجد انتقال تلقائي للمكان. الاختيار يحدّث المقبض والنتيجة ضمن نفس المشهد.</p></div>
                <div className="current-pill"><small>الحالة الحالية</small><strong>{currentTitle}</strong>{flashCount > 0 && <span>وميض: {flashCount}×</span>}</div>
              </div>

              <div className="control-groups">
                {tab === 'lights' ? (
                  <>
                    <div className="control-group"><div className="control-group-title"><span>وضع الحلقة</span><small>{MAIN_LIGHTS.length} وظائف</small></div><div className="control-grid">{MAIN_LIGHTS.map(item => <button key={item.key} type="button" className={mainLight === item.key && !flashActive ? 'selected' : ''} onClick={() => chooseMain(item.key)}><span className="control-icon"><LightSymbol type={item.symbol} /></span><span><b>{item.title}</b><small>{item.subtitle}</small></span></button>)}</div></div>
                    <div className="control-group control-group-flash"><div className="control-group-title"><span>حركة إضافية</span><small>لحظية</small></div><button type="button" className={`flash-control ${flashActive ? 'playing' : ''}`} onClick={() => chooseMain('flash')}><span className="control-icon"><LightSymbol type="flash" /></span><span><b>وميض العالي</b><small>اسحب المقبض نحوك لحظياً</small></span><em>{flashActive ? 'يعمل الآن' : 'جرّبه'}</em></button></div>
                  </>
                ) : (
                  <div className="control-group"><div className="control-group-title"><span>اختَر الإشارة</span><small>3 وظائف</small></div><div className="control-grid signal-grid">{SIGNALS.map(item => <button key={item.key} type="button" className={signal === item.key ? 'selected' : ''} onClick={() => chooseSignal(item.key)}><span className="control-icon"><LightSymbol type={item.symbol} /></span><span><b>{item.title}</b><small>{item.subtitle}</small></span></button>)}</div><div className="signal-tip"><strong>تذكّر:</strong> الغماز يخبر الآخرين بنيتك ولا يمنحك أولوية.</div></div>
                )}
              </div>

              <div className="interactive-visual-grid">
                <StalkStateVisual active={activeHandle} mainLight={mainLight} />
                <VehicleScene mainLight={mainLight} signal={signal} flashActive={flashActive} />
              </div>

              <div className="state-explainer">
                <div className="state-explainer-icon"><LightSymbol type={activeSignal?.symbol ?? (flashActive ? 'flash' : activeLight.symbol)} /></div>
                <div className="state-explainer-copy"><span>كيف تستخدمه؟</span><h3>{currentTitle}</h3><p>{currentAction}</p></div>
                <div className="state-explainer-block"><span>متى؟</span><p>{currentUse}</p></div>
                <div className="state-explainer-block caution"><span>انتبه</span><p>{currentCaution}</p></div>
              </div>

              <DashboardIndicator mainLight={mainLight} signal={signal} />
            </section>
          )}

          {tab === 'scenarios' && (
            <section className="content-section">
              <div className="section-kicker"><span className="lesson-eyebrow">03 · حالات واقعية</span><h2>تدريب بالمواقف، وليس بالحفظ</h2><p>اختَر موقفاً، راجع الخطوات، ثم جرّبه في المحاكاة من دون تحريك الصفحة بالقوة.</p></div>
              <div className="scenario-grid">{SCENARIOS.map(item => <ScenarioCard key={item.id} scenario={item} active={selectedScenario === item.id} onSelect={applyScenario} />)}</div>
            </section>
          )}

          {tab === 'automatic' && (
            <section className="content-section">
              <div className="section-kicker"><span className="lesson-eyebrow">04 · أنوار أخرى</span><h2>ليست كل الإنارة على المقبض</h2><p>بعض الأضواء تتفعل بسبب حالة السيارة نفسها، لذلك لا تبحث لها عن زر غير موجود.</p></div>
              <div className="automatic-grid">{AUTOMATIC_LIGHTS.map(item => <article className="automatic-card" key={item.key}><div className="automatic-icon"><LightSymbol type={item.icon} /></div><div><span>{item.subtitle}</span><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>
            </section>
          )}
        </section>

        <section className="lighting-memory">
          <div><span className="lesson-eyebrow">05 · احفظها</span><h2>احفظ من الحركة أولاً</h2><p>لما تشوف المقبض في سيارة حقيقية، اسأل نفسك: الحلقة لأي وظيفة؟ الحركة ↑↓ لأي اتجاه؟ الدفع والسحب لأي نوع من الضوء؟</p></div>
          <div className="memory-steps">
            <div><b>01</b><span>لف الحلقة</span><small>موضع · AUTO · منخفض</small></div>
            <div><b>02</b><span>لف حلقة الضباب</span><small>أمامي · خلفي</small></div>
            <div><b>03</b><span>ارفع / اخفض</span><small>يمين · يسار</small></div>
            <div><b>04</b><span>ادفع / اسحب</span><small>عالي · وميض</small></div>
          </div>
        </section>

        <div className="lighting-disclaimer"><span>ملاحظة مهمة</span><p>شكل المقبض وترتيب الحلقات قد يختلف حسب الشركة والموديل. الصفحة تحاكي التوزيع الشائع لأغراض التدريب، بينما دليل السيارة هو المرجع عندما تكون أمام سيارة محددة.</p></div>
      </main>
    </div>
  );
}
