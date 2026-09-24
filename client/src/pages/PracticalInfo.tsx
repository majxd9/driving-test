import { useEffect, useMemo, useRef, useState } from 'react';
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
  key: MainLightKey;
  title: string;
  subtitle: string;
  symbol: 'off' | 'position' | 'auto' | 'low' | 'high' | 'frontFog' | 'rearFog' | 'flash';
  action: string;
  use: string;
  caution: string;
};

type FlashLightItem = Omit<LightItem, 'key'> & {
  key: 'flash';
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
const FLASH_ITEM: FlashLightItem = {
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

function HandleIllustration({
  mainLight,
  movement,
  onRingCycle,
  onLever,
  onHazard,
}: {
  mainLight: MainLightKey;
  movement: 'ring' | 'left' | 'right' | 'push' | 'pull' | 'hazard';
  onRingCycle: () => void;
  onLever: (movement: 'left' | 'right' | 'push' | 'pull') => void;
  onHazard: () => void;
}) {
  const focus =
    movement === 'hazard'
      ? 'زر التحذير الرباعي'
      : movement === 'left'
        ? 'غماز يسار'
        : movement === 'right'
          ? 'غماز يمين'
          : movement === 'push'
            ? 'الضوء العالي'
            : movement === 'pull'
              ? 'وميض العالي'
              : MAIN_LIGHTS.find(item => item.key === mainLight)?.title || 'الإنارة';

  const movementTitle =
    movement === 'ring'
      ? 'لف الحلقة'
      : movement === 'right'
        ? 'ارفع الذراع للأعلى'
        : movement === 'left'
          ? 'اخفض الذراع للأسفل'
          : movement === 'push'
            ? 'ادفع الذراع للأمام'
            : movement === 'pull'
              ? 'اسحب الذراع لحظياً'
              : 'اضغط زر التحذير';

  const movementHint =
    movement === 'ring'
      ? 'تتحرك الحلقة فقط؛ الذراع يبقى ثابتاً.'
      : movement === 'hazard'
        ? 'زر منفصل عن حركة غماز اليمين واليسار.'
        : 'راقب اتجاه الحركة ثم شاهد النتيجة على السيارة.';

  const leverCycle = () => {
    const order: Array<'right' | 'left' | 'push' | 'pull'> = ['right', 'left', 'push', 'pull'];
    const index = order.indexOf(movement as 'right' | 'left' | 'push' | 'pull');
    onLever(order[(index + 1 + order.length) % order.length]);
  };

  return (
    <section className="handle-simulator" aria-label="محاكي مقبض الإضاءة والغمازات">
      <div className="handle-simulator-head">
        <div>
          <span className="mini-eyebrow">02 · المقبض</span>
          <h3>تعامل معه كقطعة تحكم حقيقية</h3>
          <p>اضغط على الحلقة أو الذراع أو زر التحذير، وشاهد اتجاه الحركة بوضوح قبل الانتقال إلى النتيجة.</p>
        </div>
        <div className="handle-current">
          <small>الحركة المحددة</small>
          <strong>{focus}</strong>
        </div>
      </div>

      <div className="handle-motion-guide" aria-live="polite">
        <span className="handle-motion-arrow" aria-hidden="true">
          {movement === 'ring' ? '↻' : movement === 'hazard' ? '△' : movement === 'right' ? '↑' : movement === 'left' ? '↓' : movement === 'push' ? '→' : '←'}
        </span>
        <div>
          <b>{movementTitle}</b>
          <small>{movementHint}</small>
        </div>
      </div>

      <div className={'handle-photo-stage movement-' + movement}>
        <div className="handle-photo-wrap">
          <img
            src="/spirit/stalk-lighting-realistic.svg"
            className="handle-photo"
            alt="مقبض حقيقي للإضاءة والغمازات مع الحلقة والذراع"
          />

          <button
            type="button"
            className={'handle-zone ring ' + (movement === 'ring' ? 'active' : '')}
            onClick={onRingCycle}
            aria-label="لف حلقة الإنارة"
            aria-pressed={movement === 'ring'}
          >
            <span>① الحلقة</span>
          </button>

          <button
            type="button"
            className={'handle-zone lever ' + (movement !== 'ring' && movement !== 'hazard' ? 'active' : '')}
            onClick={leverCycle}
            aria-label="تجربة حركة ذراع المقبض"
            aria-pressed={movement !== 'ring' && movement !== 'hazard'}
          >
            <span>② الذراع</span>
          </button>
        </div>
      </div>
      <div className="handle-stage-note">
        <span>الحلقة والذراع هما عناصر المقبض التفاعلية.</span>
        <b>التحذير الرباعي زر مستقل عن المقبض.</b>
      </div>

      <div className="handle-action-rail" aria-label="حركات المقبض">
        <button type="button" className={movement === 'ring' ? 'active' : ''} onClick={onRingCycle}>
          <b>↻</b><span>لف الحلقة</span><small>OFF · PARK · AUTO · LOW · FOG</small>
        </button>
        <button type="button" className={movement === 'right' ? 'active' : ''} onClick={() => onLever('right')}>
          <b>↑</b><span>يمين</span><small>ارفع الذراع</small>
        </button>
        <button type="button" className={movement === 'left' ? 'active' : ''} onClick={() => onLever('left')}>
          <b>↓</b><span>يسار</span><small>اخفض الذراع</small>
        </button>
        <button type="button" className={movement === 'push' ? 'active' : ''} onClick={() => onLever('push')}>
          <b>→</b><span>العالي</span><small>ادفع الذراع</small>
        </button>
        <button type="button" className={movement === 'pull' ? 'active' : ''} onClick={() => onLever('pull')}>
          <b>←</b><span>الوميض</span><small>اسحب لحظياً</small>
        </button>
        <button type="button" className={'hazard ' + (movement === 'hazard' ? 'active' : '')} onClick={onHazard}>
          <b>△</b><span>التحذير</span><small>زر مستقل</small>
        </button>
      </div>

      <div className="handle-part-legend">
        <div><b>①</b><strong>الحلقة</strong><span>اختيار وظيفة الإنارة</span></div>
        <div><b>②</b><strong>الذراع</strong><span>يمين · يسار · عالي · وميض</span></div>
        <div><b>③</b><strong>زر مستقل</strong><span>التحذير الرباعي</span></div>
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
        <div className="vehicle-light-label">{view === 'front' ? 'الأمام · شاهد مسار الضوء' : 'الخلف · شاهد ظهور الإشارة'}</div>

        <div className="vehicle-art vehicle-art-front">
          <span className="vehicle-beam vehicle-beam-left" />
          <span className="vehicle-beam vehicle-beam-right" />
          <span className="vehicle-fog vehicle-fog-left" />
          <span className="vehicle-fog vehicle-fog-right" />
          <span className="vehicle-signal-l signal-l-front" />
          <span className="vehicle-signal-r signal-r-front" />
          <img src="/spirit/car-front-training.svg" className="vehicle-car" alt="" aria-hidden="true" />
        </div>

        <div className="vehicle-art vehicle-art-rear">
          <span className="vehicle-signal-l signal-l-rear" />
          <span className="vehicle-signal-r signal-r-rear" />
          <span className="vehicle-rear-fog-light rear-fog-light-l" />
          <span className="vehicle-rear-fog-light rear-fog-light-r" />
          <img src="/spirit/car-rear.svg" className="vehicle-car" alt="" aria-hidden="true" />
        </div>

        <div className="vehicle-stage-legend">
          <span><i className="legend-light" />إنارة الطريق</span>
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
  const activeSignal = SIGNALS.find(item => item.key === signal) || null;
  const activeLight = MAIN_LIGHTS.find(item => item.key === mainLight) || MAIN_LIGHTS[3];
  const currentTitle = activeSignal?.title || (flashActive ? FLASH_ITEM.title : activeLight.title);
  const currentAction = activeSignal?.action || (flashActive ? FLASH_ITEM.action : activeLight.action);
  const currentUse = activeSignal?.use || (flashActive ? FLASH_ITEM.use : activeLight.use);
  const currentCaution = activeSignal?.caution || (flashActive ? FLASH_ITEM.caution : activeLight.caution);
  const currentSymbol = activeSignal?.symbol || (flashActive ? 'flash' : activeLight.symbol);

  return (
    <section className="controls-card" aria-label="اختيار حركة المقبض">
      <div className="controls-head">
        <div>
          <span className="mini-eyebrow">01 · اختر الحركة</span>
          <h3>ابدأ من الجزء الذي تريد تعلّمه</h3>
          <p>الشرح الآن داخل نفس مساحة التحكم، لذلك لا تحتاج إلى النزول والرجوع بين الأقسام.</p>
        </div>
      </div>

      <div className="control-mode-switch" role="tablist" aria-label="نوع التحكم">
        <button type="button" role="tab" aria-selected={group === 'ring'} className={group === 'ring' ? 'active' : ''} onClick={() => setGroup('ring')}>
          <span>01</span> حلقة الإنارة
        </button>
        <button type="button" role="tab" aria-selected={group === 'lever'} className={group === 'lever' ? 'active' : ''} onClick={() => setGroup('lever')}>
          <span>02</span> الذراع والحركات
        </button>
      </div>

      {group === 'ring' ? (
        <div className="choice-list">
          {RING_LIGHTS.map(item => (
            <button
              key={item.key}
              type="button"
              className={mainLight === item.key && !signal && !flashActive ? 'selected' : ''}
              onClick={() => onMain(item.key)}
              aria-pressed={mainLight === item.key && !signal && !flashActive}
            >
              <span className="choice-icon"><LightSymbol type={item.symbol} /></span>
              <span className="choice-copy"><b>{item.title}</b><small>{item.subtitle}</small><em>{item.action.replace('.', '')}</em></span>
              <span className="choice-check">✓</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="choice-list lever-choice-list">
          <button type="button" className={signal === 'right' ? 'selected' : ''} onClick={() => onSignal('right')} aria-pressed={signal === 'right'}>
            <span className="lever-big">↑</span><span className="choice-copy"><b>غماز يمين</b><small>ارفع الذراع</small><em>إشارة قبل المناورة نحو اليمين</em></span><span className="choice-check">✓</span>
          </button>
          <button type="button" className={signal === 'left' ? 'selected' : ''} onClick={() => onSignal('left')} aria-pressed={signal === 'left'}>
            <span className="lever-big">↓</span><span className="choice-copy"><b>غماز يسار</b><small>اخفض الذراع</small><em>إشارة قبل المناورة نحو اليسار</em></span><span className="choice-check">✓</span>
          </button>
          <button type="button" className={mainLight === 'high' && !flashActive ? 'selected' : ''} onClick={() => onMain('high')} aria-pressed={mainLight === 'high' && !flashActive}>
            <span className="lever-big">→</span><span className="choice-copy"><b>الضوء العالي</b><small>ادفع الذراع</small><em>مدى أبعد عندما يكون الطريق مناسباً</em></span><span className="choice-check">✓</span>
          </button>
          <button type="button" className={flashActive ? 'selected' : ''} onClick={onFlash} aria-pressed={flashActive}>
            <span className="lever-big">←</span><span className="choice-copy"><b>وميض العالي</b><small>اسحب لحظياً</small><em>ومضة سريعة بدل إبقائه مفعلاً</em></span><span className="choice-check">✓</span>
          </button>
        </div>
      )}

      <button type="button" className={'hazard-action ' + (signal === 'hazard' ? 'selected' : '')} onClick={() => onSignal('hazard')} aria-pressed={signal === 'hazard'}>
        <span className="hazard-symbol">△</span>
        <span><b>التحذير الرباعي</b><small>زر منفصل · يومض الاتجاهان معاً</small></span>
      </button>

      <aside className="inline-teaching-panel" aria-live="polite">
        <div className="inline-teaching-icon"><LightSymbol type={currentSymbol} /></div>
        <div className="inline-teaching-content">
          <span>شرح الاختيار الحالي</span>
          <h4>{currentTitle}</h4>
          <p className="teaching-action">{currentAction}</p>
          <div className="teaching-columns">
            <div><small>متى تستخدمه؟</small><p>{currentUse}</p></div>
            <div className="teaching-caution"><small>انتبه</small><p>{currentCaution}</p></div>
          </div>
        </div>
      </aside>
    </section>
  );
}

function ScenarioDiagram({ kind }: { kind: string }) {
  const idPrefix = 'scenario-' + kind;
  const defs = (
    <defs>
      <linearGradient id={idPrefix + '-sky'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#102b35" />
        <stop offset="1" stopColor="#061117" />
      </linearGradient>
      <linearGradient id={idPrefix + '-road'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#253d44" />
        <stop offset="1" stopColor="#0b181f" />
      </linearGradient>
      <linearGradient id={idPrefix + '-glow'} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#ffffff" stopOpacity="0" />
        <stop offset=".5" stopColor="#effffc" stopOpacity=".26" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <filter id={idPrefix + '-blur'}><feGaussianBlur stdDeviation="12" /></filter>
      <filter id={idPrefix + '-shadow'}><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity=".42" /></filter>
    </defs>
  );

  const frame = (
    <>
      <rect width="800" height="360" rx="18" fill={'url(#' + idPrefix + '-sky)'} />
      <path d="M0 360 174 112h452L800 360Z" fill={'url(#' + idPrefix + '-road)'} />
      <path d="M0 360h800" stroke="#040a0e" strokeWidth="12" />
      <path d="M400 112v248" stroke="#d8e8e7" strokeOpacity=".35" strokeWidth="4" strokeDasharray="22 18" />
      <path d="M245 360 310 112M555 360 490 112" stroke="#e5f3f2" strokeOpacity=".11" strokeWidth="3" />
      <circle cx="688" cy="62" r="28" fill="#dceceb" fillOpacity=".16" />
      <circle cx="688" cy="62" r="52" fill="#dceceb" fillOpacity=".05" filter={'url(#' + idPrefix + '-blur)'} />
    </>
  );

  const car = (x: number, y: number, src: string, w: number, h: number, opacity = 1, rotate = 0) => (
    <image
      href={src}
      x={x}
      y={y}
      width={w}
      height={h}
      opacity={opacity}
      preserveAspectRatio="xMidYMid meet"
      filter={'url(#' + idPrefix + '-shadow)'}
      transform={rotate ? 'rotate(' + rotate + ' ' + (x + w / 2) + ' ' + (y + h / 2) + ')' : undefined}
    />
  );

  const badge = (title: string, detail: string, tone: 'teal' | 'amber' = 'teal') => (
    <g>
      <rect x="24" y="22" width="314" height="61" rx="19" fill="#051016" fillOpacity=".88" stroke={tone === 'amber' ? '#f2bd74' : '#83e1d7'} strokeOpacity=".26" />
      <circle cx="49" cy="52" r="8" fill={tone === 'amber' ? '#f2bd74' : '#83e1d7'} />
      <text x="67" y="49" fill="#ecfbf8" fontSize="15" fontWeight="900">{title}</text>
      <text x="67" y="69" fill="#9cb1b2" fontSize="11">{detail}</text>
    </g>
  );

  const bottomNote = (left: string, right: string) => (
    <g>
      <rect x="24" y="310" width="752" height="29" rx="14" fill="#031015" fillOpacity=".92" stroke="#fff" strokeOpacity=".06" />
      <circle cx="44" cy="324" r="4.5" fill="#83e1d7" />
      <text x="56" y="328" fill="#d8e8e7" fontSize="10" fontWeight="800">{left}</text>
      <circle cx="412" cy="324" r="4.5" fill="#f2bd74" />
      <text x="424" y="328" fill="#d8e8e7" fontSize="10" fontWeight="800">{right}</text>
    </g>
  );

  const ownCar = (x = 315, y = 220, w = 170, h = 126, opacity = 1) => car(x, y, '/spirit/car-front-sport.svg', w, h, opacity);
  const rearCar = (x = 310, y = 218, w = 180, h = 126, opacity = 1) => car(x, y, '/spirit/car-rear.svg', w, h, opacity);
  const arrow = (d: string) => <path d={d} fill="none" stroke="#83e1d7" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />;
  const arrowHead = (points: string) => <path d={points} fill="#83e1d7" />;

  if (kind === 'roundabout') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="الخروج من الدوار إلى اليمين">
        {defs}<rect width="800" height="360" fill="#071219" />
        <circle cx="400" cy="190" r="108" fill="#1a333b" stroke="#6c8c90" strokeOpacity=".32" strokeWidth="20" />
        <circle cx="400" cy="190" r="52" fill="#0a171c" stroke="#7f9a9d" strokeOpacity=".22" strokeWidth="5" />
        <path d="M400 39v73M400 257v72M247 190h78M475 190h78" stroke="#d8e8e7" strokeOpacity=".26" strokeWidth="11" strokeLinecap="round" />
        {ownCar(335, 262, 128, 96)}
        {arrow('M471 196C518 191 549 161 554 112')} {arrowHead('M553 108l21 17-25 7z')}
        {badge('الخروج إلى اليمين', 'مخرج محدد → إشارة → خروج ضمن المسار')}
        {bottomNote('السهم = اتجاه المناورة', 'الغماز لا يلغي مراقبة الطريق')}
      </svg>
    );
  }

  if (kind === 'lane-left') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="تغيير المسار إلى اليسار">
        {defs}{frame}
        {ownCar(315, 222, 170, 126)}
        <rect x="118" y="158" width="214" height="54" rx="18" fill="#f1bd77" fillOpacity=".05" stroke="#f1bd77" strokeOpacity=".35" strokeDasharray="7 7" />
        <text x="136" y="190" fill="#f1d4a8" fontSize="12" fontWeight="900">افحص المسار + النقطة العمياء</text>
        {arrow('M398 298C341 282 300 244 270 192')} {arrowHead('M263 188l25-3-11 23z')}
        {badge('انتقال إلى اليسار', 'مرآة → نقطة عمياء → غماز → انتقال تدريجي')}
        {bottomNote('المسار الخالي شرط أساسي', 'الإشارة تخبر الآخرين بنيتك فقط')}
      </svg>
    );
  }

  if (kind === 'oncoming') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="مركبة مقابلة ليلاً">
        {defs}{frame}
        {ownCar(315, 224, 170, 124)}
        {car(447, 105, '/spirit/car-front-sport.svg', 155, 112, .82, 180)}
        <path d="M345 275 148 316 345 288Z" fill={'url(#' + idPrefix + '-glow)'} opacity=".48" filter={'url(#' + idPrefix + '-blur)'} />
        <path d="M455 275 652 316 455 288Z" fill={'url(#' + idPrefix + '-glow)'} opacity=".48" filter={'url(#' + idPrefix + '-blur)'} />
        <path d="M530 151h112" stroke="#f2bd74" strokeWidth="7" strokeLinecap="round" />
        <text x="531" y="137" fill="#f2bd74" fontSize="11" fontWeight="900">مقابل</text>
        {badge('مركبة مقابلة', 'بدّل من العالي إلى المنخفض قبل الإبهار', 'amber')}
        {bottomNote('أنت = منخفض', 'المركبة المقابلة = لا تبهِرها')}
      </svg>
    );
  }

  if (kind === 'open-road') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="طريق مظلم خالٍ">
        {defs}{frame}
        {ownCar(315, 224, 170, 124)}
        <path d="M398 274 90 128M402 274 710 128" stroke="#f8eab0" strokeOpacity=".18" strokeWidth="44" strokeLinecap="round" filter={'url(#' + idPrefix + '-blur)'} />
        <path d="M398 270 84 125M402 270 716 125" stroke="#fff4bd" strokeOpacity=".24" strokeWidth="7" strokeLinecap="round" />
        {badge('طريق خالٍ → العالي', 'مدى أطول مع مراقبة مستمرة للمجال أمامك')}
        {bottomNote('العالي = مدى رؤية أكبر', 'اخفضه عند ظهور مستخدم طريق')}
      </svg>
    );
  }

  if (kind === 'fog') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="ضباب كثيف ومدى رؤية منخفض">
        {defs}{frame}
        <rect x="0" y="112" width="800" height="57" fill="#dfe9e7" fillOpacity=".08" />
        <rect x="0" y="182" width="800" height="42" fill="#dfe9e7" fillOpacity=".12" />
        <rect x="0" y="234" width="800" height="35" fill="#dfe9e7" fillOpacity=".10" />
        {ownCar(315, 224, 170, 124)}
        <ellipse cx="349" cy="276" rx="63" ry="21" fill="#fff3bd" opacity=".34" filter={'url(#' + idPrefix + '-blur)'} />
        <ellipse cx="451" cy="276" rx="63" ry="21" fill="#fff3bd" opacity=".34" filter={'url(#' + idPrefix + '-blur)'} />
        {badge('ضباب كثيف', 'الرؤية أولاً: سرعة أقل + إنارة مناسبة')}
        {bottomNote('الضباب يختصر مدى الرؤية', 'الضوء لا يعوض عن خفض السرعة')}
      </svg>
    );
  }

  if (kind === 'hazard') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="توقف اضطراري وتشغيل التحذير الرباعي">
        {defs}{frame}
        {rearCar(310, 214, 180, 126)}
        {car(120, 220, '/spirit/car-front-sport.svg', 120, 88, .42)}
        <circle cx="349" cy="278" r="11" fill="#f3ad55" /><circle cx="451" cy="278" r="11" fill="#f3ad55" />
        <circle cx="349" cy="278" r="24" fill="none" stroke="#f3ad55" strokeOpacity=".30" strokeWidth="3" />
        <circle cx="451" cy="278" r="24" fill="none" stroke="#f3ad55" strokeOpacity=".30" strokeWidth="3" />
        <path d="M212 289 244 237 276 289Z" fill="#f2bd74" fillOpacity=".12" stroke="#f2bd74" strokeWidth="3" />
        <text x="244" y="279" textAnchor="middle" fill="#f2bd74" fontSize="17" fontWeight="900">!</text>
        {badge('توقف اضطراري → تحذير', 'اجعل المركبة واضحة للاتجاهين', 'amber')}
        {bottomNote('التحذير = الاتجاهان', 'توقف آمن ثم اتخذ الإجراء التالي')}
      </svg>
    );
  }

  if (kind === 'turn-right') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="انعطاف يمين عند تقاطع">
        {defs}<rect width="800" height="360" fill="#071219" />
        <rect y="124" width="800" height="94" fill="#1a333b" />
        <rect x="488" y="124" width="94" height="236" fill="#1a333b" />
        <path d="M0 172h800M535 124v236" stroke="#d8e8e7" strokeOpacity=".22" strokeWidth="4" strokeDasharray="18 14" />
        {ownCar(332, 231, 176, 126)}
        {arrow('M420 299C481 289 518 248 518 190')} {arrowHead('M514 187l22 16-24 8z')}
        {badge('انعطاف يمين', 'مرآة → غماز → تموضع → انعطاف')}
        {bottomNote('المسار الصحيح أولاً', 'الإشارة تنبه الآخرين قبل المناورة')}
      </svg>
    );
  }

  if (kind === 'rear-fog') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="استخدام الضباب الخلفي">
        {defs}{frame}
        {rearCar(310, 215, 180, 126)}
        {car(118, 205, '/spirit/car-front-sport.svg', 126, 92, .36)}
        <rect x="0" y="124" width="800" height="55" fill="#e5efed" fillOpacity=".08" />
        <rect x="0" y="198" width="800" height="36" fill="#e5efed" fillOpacity=".11" />
        <ellipse cx="352" cy="277" rx="28" ry="19" fill="#ffb84e" opacity=".85" filter={'url(#' + idPrefix + '-blur)'} />
        <ellipse cx="448" cy="277" rx="28" ry="19" fill="#ffb84e" opacity=".85" filter={'url(#' + idPrefix + '-blur)'} />
        <path d="M184 255h74" stroke="#f2bd74" strokeWidth="5" strokeLinecap="round" /><text x="96" y="251" fill="#f2bd74" fontSize="11" fontWeight="900">اجعل مركبتك واضحة</text>
        {badge('ضباب خلفي', 'استخدمه عند سوء الرؤية ثم أوقفه عند تحسنها', 'amber')}
        {bottomNote('الخلفي = وضوح المركبة', 'السطوع القوي ليس للاستخدام الدائم')}
      </svg>
    );
  }

  if (kind === 'park') {
    return (
      <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="وقوف ليلاً مع إنارة الموضع">
        {defs}<rect width="800" height="360" fill="#061019" />
        <circle cx="638" cy="62" r="35" fill="#e4eeee" fillOpacity=".18" />
        <circle cx="638" cy="62" r="60" fill="#dceceb" fillOpacity=".05" filter={'url(#' + idPrefix + '-blur)'} />
        <rect y="203" width="800" height="157" fill="#142830" />
        <path d="M0 260h800" stroke="#aec1c0" strokeOpacity=".14" strokeWidth="3" />
        <path d="M0 205h800" stroke="#6f898b" strokeOpacity=".20" strokeWidth="5" strokeDasharray="24 18" />
        {rearCar(308, 190, 190, 136)}
        <circle cx="353" cy="260" r="7" fill="#d3df9a" /><circle cx="447" cy="260" r="7" fill="#d3df9a" />
        {badge('وقوف ليلاً', 'وضوح المركبة أولاً · الموضع ليس لإنارة الطريق')}
        {bottomNote('الموضع = وضوح المركبة', 'الطريق يحتاج الإنارة المناسبة')}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 800 360" className="scenario-svg" role="img" aria-label="بدء مناورة تجاوز">
      {defs}{frame}
      {ownCar(318, 224, 174, 126)}
      {car(160, 224, '/spirit/car-front-sport.svg', 150, 110, .60)}
      {arrow('M362 301C298 280 256 244 223 194')} {arrowHead('M216 190l26-3-11 23z')}
      <rect x="175" y="151" width="165" height="45" rx="16" fill="#f2bd74" fillOpacity=".05" stroke="#f2bd74" strokeOpacity=".30" strokeDasharray="7 7" />
      <text x="197" y="179" fill="#f2d4a5" fontSize="11" fontWeight="900">افحص السماح والفراغ</text>
      {badge('بدء تجاوز', 'تأكد من الطريق ثم غماز مناسب ثم مناورة آمنة', 'amber')}
      {bottomNote('السهم = مسار التجاوز', 'الغماز جزء من المناورة وليس ضماناً لها')}
    </svg>
  );
}

function ScenarioCard({
  scenario,
  active,
  onApply,
}: {
  scenario: (typeof SCENARIOS)[number];
  active: boolean;
  onApply: (scenario: (typeof SCENARIOS)[number]) => void;
}) {
  const controlLabel =
    scenario.control === 'right'
      ? 'غماز يمين'
      : scenario.control === 'left'
        ? 'غماز يسار'
        : scenario.control === 'hazard'
          ? 'تحذير رباعي'
          : MAIN_LIGHTS.find(item => item.key === scenario.control)?.title || '';

  return (
    <article className={'scenario-card ' + (active ? 'active' : '')}>
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
        <div className="scenario-card-goal"><span>الفكرة</span><p>{scenario.goal}</p></div>
        <p className="scenario-card-note">{scenario.note}</p>
        <button type="button" className="scenario-action" onClick={() => onApply(scenario)}>
          طبّق هذه الحالة في المحاكي <span>←</span>
        </button>
      </div>
    </article>
  );
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    return () => {
      const ctx = audioRef.current;
      if (ctx && ctx.state !== 'closed') void ctx.close();
    };
  }, []);


  useEffect(() => {
    document.documentElement.classList.add('practical-info-active');
    return () => document.documentElement.classList.remove('practical-info-active');
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

  const playClickSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioRef.current ?? new AudioCtx();
      audioRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(680, now);
      oscillator.frequency.exponentialRampToValueAtTime(920, now + 0.045);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.085, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.115);
    } catch {
      // Audio is optional; interactions must remain usable when sound is blocked.
    }
  };

  const chooseMain = (key: MainLightKey) => {
    playClickSound();
    setMainLight(key);
    setSignal(null);
    setMovement(key === 'high' ? 'push' : 'ring');
    setFlashActive(false);
    setVehicleView(key === 'rearFog' ? 'rear' : 'front');
  };

  const chooseSignal = (key: SignalKey) => {
    playClickSound();
    if (key === 'hazard' && signal === 'hazard') {
      setSignal(null);
      setMovement('ring');
      setFlashActive(false);
      setVehicleView('front');
      return;
    }
    setSignal(key);
    setMovement(key);
    setFlashActive(false);
    setVehicleView(key === 'hazard' ? 'rear' : 'front');
  };

  const triggerFlash = () => {
    playClickSound();
    setSignal(null);
    setMovement('pull');
    setFlashCount(value => value + 1);
    setFlashActive(true);
    setVehicleView('front');
  };

  const cycleRing = () => {
    const index = RING_LIGHTS.findIndex(item => item.key === mainLight);
    const next = RING_LIGHTS[(index + 1 + RING_LIGHTS.length) % RING_LIGHTS.length];
    chooseMain(next.key);
    setControlGroup('ring');
  };

  const applyLeverMovement = (nextMovement: 'left' | 'right' | 'push' | 'pull') => {
    if (nextMovement === 'left' || nextMovement === 'right') {
      chooseSignal(nextMovement);
      setControlGroup('lever');
      return;
    }
    if (nextMovement === 'push') {
      chooseMain('high');
      setControlGroup('lever');
      return;
    }
    triggerFlash();
    setControlGroup('lever');
  };

  const currentTitle = activeSignal?.title || (flashActive ? FLASH_ITEM.title : activeLight.title);
  const currentAction = activeSignal?.action || (flashActive ? FLASH_ITEM.action : activeLight.action);
  const currentUse = activeSignal?.use || (flashActive ? FLASH_ITEM.use : activeLight.use);
  const currentCaution = activeSignal?.caution || (flashActive ? FLASH_ITEM.caution : activeLight.caution);

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
            <h1>تعلّم الإنارة من الحركة إلى النتيجة.</h1>
            <p>اختر وظيفة واحدة، حدد مكانها على المقبض، نفّذ الحركة، ثم شاهد ما يتغير على السيارة. كل خطوة تبقى أمامك بدون تنقّل تلقائي مزعج.</p>
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
                <div><span className="lesson-eyebrow">المحاكي العملي</span><h2>حركة واضحة، شرح قريب، نتيجة مرئية</h2><p>التحكم والشرح والمقبض مرتبطة في مساحة واحدة حتى يعرف الطالب ماذا ضغط ولماذا.</p></div>
                <div className="practice-status"><small>الحالة الحالية</small><strong>{currentTitle}</strong>{flashCount > 0 && <span>عدد ومضات التجربة {flashCount}</span>}<button type="button" className={'sound-toggle ' + (soundEnabled ? 'is-on' : '')} onClick={() => setSoundEnabled(value => !value)}><b>{soundEnabled ? '♪' : '×'}</b><span>{soundEnabled ? 'الصوت مفعّل' : 'الصوت متوقف'}</span></button></div>
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

                </div>

                <HandleIllustration mainLight={mainLight} movement={movement} onRingCycle={cycleRing} onLever={applyLeverMovement} onHazard={() => {
                  if (signal === 'hazard') {
                    playClickSound();
                    setSignal(null);
                    setMovement('ring');
                    setVehicleView('front');
                  } else {
                    chooseSignal('hazard');
                  }
                }} />
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
                <h2>كل المشاهد رجعت أمامك.</h2>
                <p>بدلاً من إخفاء المواقف داخل اختيار واحد، تشوف المواقف العشرة كلها وتطبّق أي واحد مباشرة.</p>
              </div>

              <div className="scenario-gallery-head">
                <span>10 مواقف تدريبية</span>
                <small>مشهد + خطوات + تطبيق</small>
              </div>

              <div className="scenario-grid">
                {SCENARIOS.map(scenario => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    active={selectedScenario === scenario.id}
                    onApply={applyScenario}
                  />
                ))}
              </div>
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
