import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type LightKey = 'position' | 'low' | 'high' | 'fog';

type LightMode = {
  key: LightKey;
  title: string;
  technical: string;
  short: string;
  why: string;
  when: string[];
  avoid: string[];
  steps: string[];
  sceneTitle: string;
  sceneText: string;
};

function LightSymbol({ type, className = '' }: { type: LightKey; className?: string }) {
  const common = {
    viewBox: '0 0 100 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  if (type === 'position') {
    return (
      <svg {...common}>
        <path d="M10 17h25c8 0 13 6 15 15H10V17Z" />
        <path d="M61 17h29" />
        <path d="M61 26h29" />
        <path d="M61 35h29" />
        <path d="M61 44h23" />
      </svg>
    );
  }

  if (type === 'low') {
    return (
      <svg {...common}>
        <path d="M10 13h23c8 0 14 7 16 19H10V13Z" />
        <path d="m61 18 24 10" />
        <path d="m61 29 26 10" />
        <path d="m61 40 20 7" />
      </svg>
    );
  }

  if (type === 'high') {
    return (
      <svg {...common}>
        <path d="M10 13h23c8 0 14 7 16 19H10V13Z" />
        <path d="M61 12h28" />
        <path d="M61 23h31" />
        <path d="M61 34h31" />
        <path d="M61 45h28" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M10 13h23c8 0 14 7 16 19H10V13Z" />
      <path d="m61 14 22 9" />
      <path d="M61 25h25" />
      <path d="m61 36 22-9" />
      <path d="M87 13c-8 7 8 10-1 16s8 11 0 20" />
    </svg>
  );
}

function LightScene({ active }: { active: LightMode }) {
  return (
    <div className="scene-v2-wrap">
      <div className="scene-v2-direction">أمام السيارة <span>→</span></div>
      <svg
        className="scene-v2-svg"
        viewBox="0 0 720 420"
        role="img"
        aria-label={`محاكاة ${active.title} مع اتجاه الضوء إلى الأمام`}
      >
        <defs>
          <linearGradient id="scene-v2-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07131d" />
            <stop offset="100%" stopColor="#10232c" />
          </linearGradient>
          <linearGradient id="scene-v2-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#172a33" />
            <stop offset="100%" stopColor="#08141b" />
          </linearGradient>
          <linearGradient id="scene-v2-car" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2b3d46" />
            <stop offset="55%" stopColor="#15252e" />
            <stop offset="100%" stopColor="#070f14" />
          </linearGradient>
          <linearGradient id="scene-v2-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8db4bf" stopOpacity=".52" />
            <stop offset="100%" stopColor="#1b3440" stopOpacity=".86" />
          </linearGradient>
          <linearGradient id="scene-v2-low" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff4bd" stopOpacity=".56" />
            <stop offset="100%" stopColor="#fff4bd" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="scene-v2-high" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff5c5" stopOpacity=".52" />
            <stop offset="100%" stopColor="#fff5c5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="scene-v2-fog" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff5cb" stopOpacity=".46" />
            <stop offset="75%" stopColor="#fff5cb" stopOpacity=".10" />
            <stop offset="100%" stopColor="#fff5cb" stopOpacity="0" />
          </linearGradient>
          <filter id="scene-v2-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="720" height="420" rx="28" fill="url(#scene-v2-sky)" />
        <path d="M0 265H720V420H0Z" fill="#0a171e" />
        <path d="M0 420V320Q250 235 360 235T720 320V420Z" fill="url(#scene-v2-road)" />
        <path d="M360 236L360 420" stroke="#dfecea" strokeOpacity=".22" strokeWidth="4" strokeDasharray="18 22" />
        <path d="M120 420L305 260" stroke="#dfecea" strokeOpacity=".12" strokeWidth="3" />
        <path d="M600 420L415 260" stroke="#dfecea" strokeOpacity=".12" strokeWidth="3" />

        <g className="scene-v2-beam scene-v2-beam-position" filter="url(#scene-v2-glow)">
          <circle cx="320" cy="282" r="10" fill="#9feee4" opacity=".85" />
          <circle cx="336" cy="292" r="7" fill="#9feee4" opacity=".70" />
          <circle cx="126" cy="304" r="6" fill="#9feee4" opacity=".38" />
        </g>

        <g className="scene-v2-beam scene-v2-beam-low">
          <path d="M319 280L332 287L610 345L610 297Z" fill="url(#scene-v2-low)" />
          <path d="M334 286L346 292L615 360L615 322Z" fill="url(#scene-v2-low)" opacity=".64" />
        </g>

        <g className="scene-v2-beam scene-v2-beam-high">
          <path d="M319 280L332 287L655 225L655 270Z" fill="url(#scene-v2-high)" />
          <path d="M334 286L346 292L660 245L660 291Z" fill="url(#scene-v2-high)" opacity=".64" />
        </g>

        <g className="scene-v2-beam scene-v2-beam-fog">
          <path d="M319 293L334 300L620 362L620 330Z" fill="url(#scene-v2-fog)" />
          <path d="M332 300L346 307L610 382L610 350Z" fill="url(#scene-v2-fog)" opacity=".72" />
        </g>

        <g className="scene-v2-oncoming">
          <rect x="518" y="131" width="86" height="46" rx="13" fill="#1a2d36" stroke="#bed3d7" strokeOpacity=".16" />
          <path d="M535 132L552 121H570L589 132" fill="#203740" stroke="#bed3d7" strokeOpacity=".12" />
          <rect x="528" y="154" width="14" height="8" rx="4" fill="#fff7c7" filter="url(#scene-v2-glow)" />
          <rect x="580" y="154" width="14" height="8" rx="4" fill="#fff7c7" filter="url(#scene-v2-glow)" />
          <text x="610" y="190" fill="#dceced" fillOpacity=".58" fontSize="12" fontWeight="700">مركبة مقابلة</text>
        </g>

        <g className="scene-v2-car">
          <ellipse cx="237" cy="345" rx="137" ry="27" fill="#000" fillOpacity=".36" />
          <rect x="133" y="288" width="22" height="55" rx="10" fill="#080f14" stroke="#b9ced3" strokeOpacity=".15" />
          <rect x="320" y="286" width="22" height="55" rx="10" fill="#080f14" stroke="#b9ced3" strokeOpacity=".15" />
          <path
            d="M112 308Q116 279 148 270L192 229Q210 212 244 214H278Q302 217 320 238L344 266Q358 280 356 307L349 324Q345 334 329 337H136Q118 333 112 308Z"
            fill="url(#scene-v2-car)"
            stroke="#c4d9dd"
            strokeOpacity=".24"
            strokeWidth="2.2"
          />
          <path d="M192 229Q210 212 244 214H278Q301 217 320 239L284 251H204Z" fill="url(#scene-v2-glass)" stroke="#d6e9ec" strokeOpacity=".18" />
          <path d="M203 229L202 249M283 217L285 250" stroke="#d6e9ec" strokeOpacity=".17" strokeWidth="2" />
          <path d="M158 270L194 254H304L328 272" stroke="#c4d9dd" strokeOpacity=".20" strokeWidth="2" />
          <path d="M128 305Q120 317 132 326H348L354 307" fill="#0a141a" fillOpacity=".62" />
          <rect x="318" y="273" width="26" height="15" rx="7" fill="#fff6c5" />
          <rect x="323" y="290" width="24" height="14" rx="7" fill="#fff6c5" />
          <circle cx="127" cy="302" r="7" fill="#d95f55" fillOpacity=".72" />
          <path d="M336 270L346 275L346 303L337 307" stroke="#f8f6e0" strokeOpacity=".4" strokeWidth="2" />
          <path d="M173 322H304" stroke="#bcd2d6" strokeOpacity=".18" strokeWidth="2" />
          <path d="M176 338Q180 352 194 352T212 338M291 338Q295 352 309 352T327 338" stroke="#060d12" strokeWidth="11" strokeLinecap="round" />
          <path d="M110 318H94M110 327H96" stroke="#e1ecee" strokeOpacity=".13" strokeWidth="3" strokeLinecap="round" />
        </g>

        <g className="scene-v2-warning">
          <rect x="438" y="212" width="235" height="40" rx="12" fill="#07131a" fillOpacity=".86" stroke="#8adfd5" strokeOpacity=".28" />
          <text x="656" y="237" textAnchor="end" fill="#dff8f4" fontSize="13" fontWeight="800">عند احتمال إبهار الآخرين: اخفض الضوء</text>
        </g>
      </svg>
      <div className="scene-v2-caption">
        <strong>{active.sceneTitle}</strong>
        <span>{active.sceneText}</span>
      </div>
    </div>
  );
}

const LIGHTS: LightMode[] = [
  {
    key: 'position',
    title: 'أنوار الموضع',
    technical: 'Front / rear position lamps',
    short: 'تُظهر المركبة وتحدد عرضها',
    why: 'هذه الأنوار هدفها الأساسي جعل وجود المركبة وأبعادها أوضح للآخرين. ليست مصممة لإضاءة طريق القيادة لمسافة بعيدة.',
    when: [
      'تُستخدم لإظهار وجود المركبة وتحديد عرضها.',
      'تعمل كجزء من منظومة إضاءة المركبة، حسب تجهيز السيارة.',
      'لا تعتمد عليها وحدها لرؤية الطريق عندما تكون الإضاءة غير كافية.',
    ],
    avoid: [
      'لا تعتبرها بديلاً عن المصابيح التي تُنير الطريق.',
      'لا تحفظ اسمها فقط؛ افهم وظيفتها: أن تُرى المركبة بوضوح.',
    ],
    steps: [
      'تعرّف على رمزها في سيارتك.',
      'تأكد أن الأنوار المطلوبة تعمل فعلاً قبل القيادة ليلاً.',
      'عند الحاجة إلى رؤية الطريق، استخدم المصباح المناسب لذلك.',
    ],
    sceneTitle: 'الهدف: أن تُرى المركبة بوضوح',
    sceneText: 'تظهر العلامات الضوئية حول المركبة من دون رسم حزمة إضاءة طويلة أمامها.',
  },
  {
    key: 'low',
    title: 'الضوء المنخفض',
    technical: 'Dipped / passing beam',
    short: 'يركّز الضوء على الطريق أمامك',
    why: 'حزمة الإضاءة المنخفضة تضيء الطريق أمام المركبة مع تقليل احتمال إبهار مستخدمي الطريق الآخرين.',
    when: [
      'عندما تحتاج إلى إضاءة الطريق أمامك.',
      'عند وجود مركبة مقابلة أو عندما قد تسبب الحزمة العالية إبهاراً.',
      'في ظروف الرؤية الضعيفة عندما تكون الإضاءة الأمامية مطلوبة.',
    ],
    avoid: [
      'لا ترفع الحزمة إلى العالي لمجرد أنك تريد رؤية أبعد.',
      'لا تستخدم أي وضع إنارة بطريقة تسبب إبهاراً للآخرين.',
    ],
    steps: [
      'شغّل الحزمة المنخفضة من التحكم الخاص بسيارتك.',
      'وجّه انتباهك إلى الطريق وإلى المركبات المقابلة.',
      'ابقَ على الحزمة المناسبة كلما كان العالي قد يسبب إبهاراً.',
    ],
    sceneTitle: 'الضوء ينتشر أمام السيارة وعلى سطح الطريق',
    sceneText: 'المنخفض أقصر وأكثر توجيهاً للأسفل من العالي، لذلك يناسب التقابل ويقلل الإبهار.',
  },
  {
    key: 'high',
    title: 'الضوء العالي',
    technical: 'Main / driving beam',
    short: 'إضاءة أبعد على الطريق',
    why: 'مصمم لإضاءة الطريق لمسافة أبعد. استخدامه يرتبط دائماً بشرط أساسي: ألا يسبب إبهاراً لمستخدمي الطريق الآخرين.',
    when: [
      'عندما تكون الرؤية الليلية بحاجة إلى إضاءة أبعد.',
      'عندما لا توجد مركبة أو شخص قد يتأذى أو يُبهر من الحزمة.',
      'عند الانتقال بين أوضاع الإنارة بحسب تغير حالة الطريق.',
    ],
    avoid: [
      'عند ظهور مركبة مقابلة وتعرض سائقها للإبهار.',
      'عندما تكون الحزمة ستزعج مستخدم طريق آخر أمامك أو بالقرب منك.',
    ],
    steps: [
      'تأكد أولاً أن الحزمة لن تبهر الآخرين.',
      'شغّل العالي عندما تكون الرؤية وحالة الطريق تسمحان بذلك.',
      'اخفضه فوراً عندما يصبح الإبهار محتملاً.',
    ],
    sceneTitle: 'الهدف: رؤية أبعد — مع ضبط الحزمة عند التقابل',
    sceneText: 'الحزمة تمتد إلى الأمام لمسافة أبعد، ويظهر أمامها تنبيه واضح عند وجود مركبة مقابلة.',
  },
  {
    key: 'fog',
    title: 'أضواء الضباب',
    technical: 'Front fog lamps',
    short: 'لتحسين الرؤية في ظروف صعبة',
    why: 'الضوء الضبابي الأمامي مخصص لتحسين إضاءة الطريق في الضباب الكثيف أو الثلج أو المطر الغزير أو ظروف مشابهة.',
    when: [
      'عندما تكون الرؤية متأثرة بشدة بالضباب أو ظروف جوية مشابهة.',
      'عندما تكون أضواء الضباب في السيارة مناسبة للحالة وتحتاج فعلاً إلى تحسين الرؤية.',
      'مع تخفيف السرعة وملاءمة القيادة لمدى الرؤية.',
    ],
    avoid: [
      'لا تستخدمه لمجرد أن الجو مظلم فقط.',
      'لا تجعل المصابيح بديلاً عن تخفيض السرعة والانتباه للرؤية.',
    ],
    steps: [
      'تعرّف على رمز مصباح الضباب في سيارتك.',
      'استخدمه عندما تستدعي حالة الرؤية ذلك.',
      'أوقفه عندما تتحسن الظروف وتعود الإضاءة العادية كافية.',
    ],
    sceneTitle: 'الضباب: حزمة منخفضة وقريبة من سطح الطريق',
    sceneText: 'المشهد يوضح حزمة عريضة ومنخفضة بدلاً من شعاع طويل مرتفع.',
  },
];

const MINI_CHECKS = [
  {
    q: 'ما الوظيفة الأساسية لأنوار الموضع؟',
    options: ['إضاءة الطريق لمسافة بعيدة', 'إظهار وجود المركبة وتحديد عرضها', 'اختراق الضباب الكثيف'],
    correct: 1,
    note: 'اتفاقية فيينا تميز أنوار الموضع عن مصابيح إضاءة الطريق: وظيفتها إظهار وجود المركبة وعرضها.',
  },
  {
    q: 'متى يصبح الضوء العالي غير مناسب؟',
    options: ['عندما قد يسبب إبهاراً لمستخدم طريق آخر', 'عندما تريد رؤية أبعد', 'عندما يكون الطريق واسعاً'],
    correct: 0,
    note: 'المبدأ الأساسي هو تجنب إبهار الآخرين، حتى عند استخدام الحزمة التي تضيء لمسافة أبعد.',
  },
  {
    q: 'ما الفرق الرئيسي بين المنخفض والعالي؟',
    options: ['المنخفض يضيء الطريق أمامك بحزمة أكثر انخفاضاً، والعالي يصل لمسافة أبعد', 'لا يوجد فرق في اتجاه الحزمة', 'العالي مخصص فقط للوقوف'],
    correct: 0,
    note: 'التعريفات الفنية في UNECE تميز بين passing beam لإضاءة الطريق دون إبهار، وdriving beam لإضاءة الطريق لمسافة طويلة.',
  },
  {
    q: 'ما الاستخدام الصحيح لمصابيح الضباب الأمامية؟',
    options: ['لأي قيادة ليلية عادية', 'لتحسين إضاءة الطريق في الضباب الكثيف أو الثلج أو المطر الغزير أو ظروف مشابهة', 'بدلاً من خفض السرعة'],
    correct: 1,
    note: 'هذا هو التعريف الفني لمصباح الضباب الأمامي في اتفاقية المرور على الطرق التابعة للأمم المتحدة.',
  },
];

export default function PracticalInfo() {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState<LightKey>('high');
  const [checkIndex, setCheckIndex] = useState(0);
  const [selectedCheck, setSelectedCheck] = useState<number | null>(null);
  const active = useMemo(() => LIGHTS.find(item => item.key === activeKey) ?? LIGHTS[2], [activeKey]);
  const check = MINI_CHECKS[checkIndex];

  const selectLight = (key: LightKey) => {
    setActiveKey(key);
    setSelectedCheck(null);
  };

  return (
    <div className="practical-info-page" dir="rtl">
      <header className="practical-info-header">
        <div className="practical-info-header-inner">
          <button className="practical-back" type="button" onClick={() => navigate('/')} aria-label="العودة إلى الرئيسية">
            <span>→</span>
          </button>
          <div className="practical-brand">
            <span>مركز المعرفة العملية</span>
            <strong>معلومات عملية إضافية</strong>
          </div>
          <div className="practical-header-badge"><span>01</span> أضواء السيارة</div>
        </div>
      </header>

      <main className="practical-info-main">
        <section className="practical-hero">
          <div className="practical-hero-copy">
            <span className="practical-eyebrow">شرح بصري مبسّط</span>
            <h1>افهم الأضواء <em>بالشكل والاتجاه والاستخدام.</em></h1>
            <p>
              تعرّف على وظيفة كل ضوء، اتجاه حزمته، ومتى يكون استخدامه مناسباً.
              الشرح هنا مبني على التعريفات الفنية الدولية، مع صياغة عملية تناسب المذاكرة.
            </p>
            <div className="practical-hero-stats">
              <div><b>04</b><span>أنواع في هذا الدرس</span></div>
              <div><b>01</b><span>مشهد توضيحي</span></div>
              <div><b>100%</b><span>بدون نص قانون سوري</span></div>
            </div>
          </div>
          <div className="practical-hero-visual" aria-hidden="true">
            <div className="hero-dashboard-ring ring-a" />
            <div className="hero-dashboard-ring ring-b" />
            <div className="hero-dashboard-panel">
              <div className="hero-speed">HEADLIGHTS</div>
              <div className="hero-icon"><LightSymbol type="high" /></div>
              <div className="hero-bars"><i /><i /><i /><i /></div>
            </div>
            <span className="hero-orbit-dot dot-a" />
            <span className="hero-orbit-dot dot-b" />
          </div>
        </section>

        <section className="practical-light-picker" aria-labelledby="lights-picker-title">
          <div className="practical-section-title">
            <div>
              <span className="practical-eyebrow">الموضوع 01</span>
              <h2 id="lights-picker-title">اختر نوع الضوء</h2>
            </div>
            <p>انظر للرمز أولاً، ثم اربطه بالمشهد والوظيفة.</p>
          </div>

          <div className="practical-light-tabs" role="tablist" aria-label="أنواع أضواء السيارة">
            {LIGHTS.map(item => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={activeKey === item.key}
                className={activeKey === item.key ? 'is-active' : ''}
                onClick={() => selectLight(item.key)}
              >
                <span className="tab-icon"><LightSymbol type={item.key} /></span>
                <span className="tab-copy">
                  <b>{item.title}</b>
                  <small>{item.technical}</small>
                  <em>{item.short}</em>
                </span>
                <i className="tab-state">{activeKey === item.key ? '✓' : String(LIGHTS.indexOf(item) + 1).padStart(2, '0')}</i>
              </button>
            ))}
          </div>
        </section>

        <section className={`practical-learning-grid mode-${active.key}`}>
          <div className="practical-scene" aria-label={active.sceneTitle}>
            <div className="scene-topline">
              <span>المحاكاة البصرية</span>
              <b>{active.title}</b>
            </div>
            <LightScene active={active} />
          </div>

          <aside className="practical-control-card">
            <div className="control-head">
              <div>
                <span className="practical-eyebrow">الخلاصة في سطر</span>
                <h3>{active.title}</h3>
                <p>{active.technical}</p>
              </div>
              <div className="symbol-large"><LightSymbol type={active.key} /></div>
            </div>

            <div className="control-stalk" aria-hidden="true">
              <div className="stalk-body">
                <div className="stalk-grip" />
                <div className="stalk-collar">
                  <b>OFF</b>
                  <span>◌</span>
                  <span>◉</span>
                  <span>◉◉</span>
                </div>
                <div className="stalk-ticks"><i /><i /><i /><i /></div>
              </div>
              <div className="stalk-note">
                <span>مهم</span>
                <b>رمز الإضاءة هو الأهم؛ شكل الذراع والمفتاح يختلف بين السيارات.</b>
              </div>
            </div>

            <div className="control-why">
              <span>الفكرة التي تحفظها</span>
              <strong>{active.why}</strong>
            </div>
          </aside>
        </section>

        <section className="practical-details" aria-label="تفاصيل استخدام الضوء">
          <article className="detail-card when">
            <div className="detail-icon">01</div>
            <div>
              <span>متى يفيد؟</span>
              <h3>المواقف الأساسية</h3>
              <div className="detail-list">
                {active.when.map((item, index) => (
                  <div key={item}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card do">
            <div className="detail-icon">02</div>
            <div>
              <span>طريقة التفكير</span>
              <h3>ثلاث خطوات سهلة</h3>
              <div className="detail-list">
                {active.steps.map((item, index) => (
                  <div key={item}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card avoid">
            <div className="detail-icon">03</div>
            <div>
              <span>تجنّب الخطأ</span>
              <h3>لا تستخدمه بهذا الشكل</h3>
              <div className="detail-list compact">
                {active.avoid.map((item, index) => (
                  <div key={item}><b>{index === 0 ? '!' : '↺'}</b><span>{item}</span></div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card legal">
            <div className="detail-icon">04</div>
            <div>
              <span>المعلومة الأساسية</span>
              <h3>المرجع الفني</h3>
              <p>{active.why}</p>
            </div>
          </article>
        </section>

        <section className="practical-memory">
          <div className="memory-copy">
            <span className="practical-eyebrow">طريقة الحفظ</span>
            <h2>أربع كلمات تكفي كبداية</h2>
            <p>أن تُرى ← أن ترى ← أن ترى أبعد ← أن تحسّن الرؤية في الجو الصعب.</p>
          </div>
          <div className="memory-grid">
            {LIGHTS.map(item => (
              <button
                key={item.key}
                type="button"
                className={activeKey === item.key ? 'is-active' : ''}
                onClick={() => selectLight(item.key)}
              >
                <span className="memory-icon"><LightSymbol type={item.key} /></span>
                <b>{item.key === 'position' ? 'أظهرني' : item.key === 'low' ? 'أنر طريقي' : item.key === 'high' ? 'أنر أبعد' : 'حسّن الرؤية'}</b>
                <small>{item.title}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="practical-check">
          <div className="check-intro">
            <span className="practical-eyebrow">تأكد أنك فهمت</span>
            <h2>اختبار سريع من داخل الدرس</h2>
            <p>هذا الجزء للتعلّم، وليس لاحتساب نتيجة اختبار القيادة.</p>
            <div className="check-rule">
              <span>قاعدة سهلة</span>
              <b>اسأل نفسك أولاً: ماذا أريد من الضوء الآن؟ أن أُرى، أم أن أرى، أم أن أرى أبعد؟</b>
            </div>
          </div>

          <div className="check-card">
            <div className="check-top">
              <span>{String(checkIndex + 1).padStart(2, '0')} / {String(MINI_CHECKS.length).padStart(2, '0')}</span>
              <b>اختبر فهمك</b>
            </div>
            <h3>{check.q}</h3>
            <div className="check-options">
              {check.options.map((option, index) => {
                const state = selectedCheck === null
                  ? ''
                  : index === check.correct
                    ? 'is-correct'
                    : index === selectedCheck
                      ? 'is-wrong'
                      : 'is-muted';
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={selectedCheck !== null}
                    className={state}
                    onClick={() => setSelectedCheck(index)}
                  >
                    <span>{['أ', 'ب', 'ج'][index]}</span>
                    <b>{option}</b>
                    {selectedCheck !== null && index === check.correct && <i>✓</i>}
                  </button>
                );
              })}
            </div>

            {selectedCheck !== null && (
              <div className={`check-feedback ${selectedCheck === check.correct ? 'good' : 'bad'}`}>
                <strong>{selectedCheck === check.correct ? 'إجابة صحيحة' : 'راجع المعلومة'}</strong>
                <span>{selectedCheck === check.correct ? 'ممتاز. اربط الوظيفة دائماً باتجاه الحزمة والظرف.' : check.note}</span>
              </div>
            )}

            <button
              className="check-next"
              type="button"
              onClick={() => {
                setCheckIndex(index => (index + 1) % MINI_CHECKS.length);
                setSelectedCheck(null);
              }}
            >
              {checkIndex === MINI_CHECKS.length - 1 ? 'إعادة المجموعة' : 'السؤال التالي'} <span>←</span>
            </button>
          </div>
        </section>

        <footer className="practical-source-note">
          <div>
            <b>المصادر التي بُني عليها هذا الدرس</b>
            <span>الأمم المتحدة UNECE — Convention on Road Traffic (1968)، Annex 5: Vehicle lighting and light-signalling devices؛ وUN Regulation No. 121 لتعريفات وأجهزة التحكم والإشارات الضوئية.</span>
          </div>
          <small>
            للاستخدام التعليمي العام: القواعد القانونية الدقيقة تختلف حسب الدولة. هذا الدرس يشرح الوظيفة الفنية ومبادئ الاستخدام الآمن، ولا يستبدل دليل السيارة أو قواعد البلد الذي تقود فيه.
          </small>
        </footer>
      </main>
    </div>
  );
}
