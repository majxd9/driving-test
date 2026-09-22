import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type LightKey = 'position' | 'low' | 'high' | 'fog';

type LightMode = {
  key: LightKey;
  title: string;
  technical: string;
  short: string;
  summary: string;
  identify: string;
  when: string[];
  mistakes: string[];
  remember: string;
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
        <path d="M61 27h29" />
        <path d="M61 37h29" />
        <path d="M61 47h22" />
      </svg>
    );
  }

  if (type === 'low') {
    return (
      <svg {...common}>
        <path d="M10 13h23c8 0 14 7 16 19H10V13Z" />
        <path d="m61 19 25 9" />
        <path d="m61 30 25 9" />
        <path d="m61 41 19 7" />
      </svg>
    );
  }

  if (type === 'high') {
    return (
      <svg {...common}>
        <path d="M10 13h23c8 0 14 7 16 19H10V13Z" />
        <path d="M61 12h30" />
        <path d="M61 23h30" />
        <path d="M61 34h30" />
        <path d="M61 45h30" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M10 13h23c8 0 14 7 16 19H10V13Z" />
      <path d="m61 15 21 8" />
      <path d="M61 26h25" />
      <path d="m61 37 21-8" />
      <path d="M87 13c-8 7 8 10-1 16s8 11 0 20" />
    </svg>
  );
}

function LightStalk({
  active,
  onSelect,
}: {
  active: LightKey;
  onSelect: (key: LightKey) => void;
}) {
  const labels = {
    position: 'موضع',
    low: 'منخفض',
    high: 'عالٍ',
    fog: 'ضباب',
  } as const;

  const keys: LightKey[] = ['position', 'low', 'high', 'fog'];
  const nextLight = keys[(keys.indexOf(active) + 1) % keys.length];

  return (
    <div className="stalk-demo">
      <div className="stalk-demo-labels">
        <span>مقبض التحكم بالإضاءة</span>
        <b>اضغط على المقبض أو اختر الرمز القريب منه.</b>
      </div>

      <div className="stalk-control-stage">
        <svg
          className="stalk-demo-svg"
          viewBox="0 0 520 230"
          role="img"
          aria-label="مقبض واقعي للتحكم بأضواء السيارة"
        >
          <defs>
            <linearGradient id="stalk-metal-v4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#aeb9bd" />
              <stop offset="22%" stopColor="#69757b" />
              <stop offset="52%" stopColor="#344047" />
              <stop offset="100%" stopColor="#11191e" />
            </linearGradient>
            <linearGradient id="stalk-grip-v4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#56636a" />
              <stop offset="28%" stopColor="#2c373d" />
              <stop offset="72%" stopColor="#151e24" />
              <stop offset="100%" stopColor="#090f14" />
            </linearGradient>
            <linearGradient id="stalk-collar-v4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b4c1c4" />
              <stop offset="26%" stopColor="#66747a" />
              <stop offset="65%" stopColor="#2d383e" />
              <stop offset="100%" stopColor="#0f171c" />
            </linearGradient>
            <filter id="stalk-shadow-v4" x="-30%" y="-50%" width="170%" height="200%">
              <feDropShadow dx="0" dy="11" stdDeviation="9" floodOpacity=".42" />
            </filter>
          </defs>

          <ellipse cx="273" cy="184" rx="202" ry="15" fill="#000" opacity=".28" />

          <path
            d="M52 131C76 113 106 103 142 101H328"
            stroke="#081015"
            strokeWidth="39"
            strokeLinecap="round"
            opacity=".82"
            filter="url(#stalk-shadow-v4)"
          />
          <path
            d="M52 123C79 105 109 98 143 97H329"
            stroke="url(#stalk-metal-v4)"
            strokeWidth="29"
            strokeLinecap="round"
          />
          <path
            d="M69 116C94 103 114 98 145 97H321"
            stroke="#e9f1f2"
            strokeOpacity=".22"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M324 76V140"
            stroke="#0b1217"
            strokeWidth="53"
            strokeLinecap="round"
            opacity=".95"
          />
          <path
            d="M324 76V140"
            stroke="url(#stalk-collar-v4)"
            strokeWidth="42"
            strokeLinecap="round"
          />
          <path
            d="M324 82V135"
            stroke="#dbe6e8"
            strokeOpacity=".19"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M355 72C369 67 383 66 401 68L463 78Q476 80 480 93V124Q477 139 462 141L399 147Q379 149 362 139Z"
            fill="url(#stalk-grip-v4)"
            stroke="#b7c3c6"
            strokeOpacity=".22"
            strokeWidth="1.7"
          />
          <path
            d="M378 73L373 142M391 71L387 145M404 71L402 145M418 73L417 142M432 74L433 140M446 76L449 138"
            stroke="#9aa7ab"
            strokeOpacity=".16"
            strokeWidth="2"
          />
          <path
            d="M361 82Q378 89 395 88L462 96"
            stroke="#edf4f5"
            strokeOpacity=".12"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle cx="324" cy="108" r="35" fill="#0b1217" stroke="#c0cbce" strokeOpacity=".15" strokeWidth="2" />
          <circle cx="324" cy="108" r="29" fill="url(#stalk-collar-v4)" stroke="#9eabad" strokeOpacity=".32" strokeWidth="2" />
          <circle cx="324" cy="108" r="21" fill="#111a20" stroke="#55636a" strokeWidth="4" />
          <path d="M324 88V96M344 108H336M324 128V120M304 108H312" stroke="#e7f2f3" strokeOpacity=".58" strokeWidth="2.7" strokeLinecap="round" />
          <circle cx="324" cy="108" r="4.5" fill="#e8f6f4" opacity=".82" />

          <rect x="74" y="154" width="112" height="23" rx="11.5" fill="#081117" stroke="#d5e3e5" strokeOpacity=".10" />
          <text x="130" y="169" textAnchor="middle" fill="#8ee4d9" fontSize="10" fontWeight="900">
            {labels[active]}
          </text>
        </svg>

        <button
          type="button"
          className="stalk-ring-trigger"
          onClick={() => onSelect(nextLight)}
          aria-label="تغيير وضع الإضاءة من المقبض"
          title="اضغط لتغيير وضع الإضاءة"
        />

        <div className="stalk-mode-orbit" aria-label="اختيار وضع الإضاءة">
          {keys.map((key, index) => (
            <button
              key={key}
              type="button"
              className={\`stalk-mode-button mode-\${index + 1} \${active === key ? 'is-active' : ''}\`}
              onClick={() => onSelect(key)}
              aria-label={labels[key]}
              aria-pressed={active === key}
              title={labels[key]}
            >
              <LightSymbol type={key} />
              <span>{labels[key]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LightScene({ active }: { active: LightMode }) {
  return (
    <div className="scene-v3-wrap">
      <svg className="scene-v3-svg" viewBox="0 0 900 520" role="img" aria-label={active.sceneTitle}>
        <defs>
          <linearGradient id="v3-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07131d" />
            <stop offset="100%" stopColor="#132832" />
          </linearGradient>
          <linearGradient id="v3-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20333b" />
            <stop offset="100%" stopColor="#09151c" />
          </linearGradient>
          <linearGradient id="v3-car-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#92a0a5" />
            <stop offset="30%" stopColor="#465963" />
            <stop offset="75%" stopColor="#1b2a33" />
            <stop offset="100%" stopColor="#0a1319" />
          </linearGradient>
          <linearGradient id="v3-window" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c7dbe0" stopOpacity=".70" />
            <stop offset="75%" stopColor="#365b69" stopOpacity=".92" />
            <stop offset="100%" stopColor="#162c37" stopOpacity=".98" />
          </linearGradient>
          <linearGradient id="v3-low-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff8d4" stopOpacity=".72" />
            <stop offset="55%" stopColor="#fff1aa" stopOpacity=".30" />
            <stop offset="100%" stopColor="#fff1aa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="v3-high-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fffde0" stopOpacity=".78" />
            <stop offset="55%" stopColor="#fff3ad" stopOpacity=".34" />
            <stop offset="100%" stopColor="#fff3ad" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="v3-fog-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff6ca" stopOpacity=".66" />
            <stop offset="70%" stopColor="#fff5c5" stopOpacity=".18" />
            <stop offset="100%" stopColor="#fff5c5" stopOpacity="0" />
          </linearGradient>
          <filter id="v3-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="900" height="520" fill="url(#v3-sky)" />
        <circle cx="760" cy="96" r="31" fill="#d7e6e7" opacity=".12" />
        <circle cx="760" cy="96" r="22" fill="#f3f5ea" opacity=".16" />

        <path d="M0 312H900V520H0Z" fill="#0b171d" />
        <path d="M0 520V356Q320 276 450 280T900 356V520Z" fill="url(#v3-road)" />
        <path d="M450 282V520" stroke="#e1efef" strokeOpacity=".22" strokeWidth="5" strokeDasharray="25 28" />
        <path d="M130 520L357 302" stroke="#dceaea" strokeOpacity=".15" strokeWidth="4" />
        <path d="M770 520L543 302" stroke="#dceaea" strokeOpacity=".15" strokeWidth="4" />

        <g className={active.key === 'position' ? 'is-on' : ''}>
          <circle cx="628" cy="300" r="12" fill="#a7eee5" opacity=".82" filter="url(#v3-glow)" />
          <circle cx="657" cy="306" r="7" fill="#a7eee5" opacity=".58" filter="url(#v3-glow)" />
        </g>

        <g className="v3-beam v3-beam-low" style={{ opacity: active.key === 'low' ? 1 : 0 }}>
          <path d="M614 312L650 306L880 372L880 426L648 338Z" fill="url(#v3-low-beam)" />
          <path d="M618 325L650 321L870 409L870 447L645 345Z" fill="url(#v3-low-beam)" opacity=".55" />
        </g>

        <g className="v3-beam v3-beam-high" style={{ opacity: active.key === 'high' ? 1 : 0 }}>
          <path d="M614 302L648 308L886 230L886 290L648 326Z" fill="url(#v3-high-beam)" />
          <path d="M625 315L651 320L890 290L890 350L648 337Z" fill="url(#v3-high-beam)" opacity=".52" />
        </g>

        <g className="v3-beam v3-beam-fog" style={{ opacity: active.key === 'fog' ? 1 : 0 }}>
          <path d="M618 330L648 334L887 402L887 448L648 353Z" fill="url(#v3-fog-beam)" />
          <path d="M620 347L651 349L873 437L873 470L648 366Z" fill="url(#v3-fog-beam)" opacity=".58" />
        </g>

        <g opacity={active.key === 'high' ? .95 : .38}>
          <path d="M738 206h94l22 15v40h-116z" fill="#172a32" stroke="#b9cdd0" strokeOpacity=".18" />
          <path d="M756 206l17-14h38l19 14" fill="#213a44" stroke="#b9cdd0" strokeOpacity=".12" />
          <rect x="751" y="241" width="15" height="7" rx="3.5" fill="#fff8cf" filter="url(#v3-glow)" />
          <rect x="825" y="241" width="15" height="7" rx="3.5" fill="#fff8d5" filter="url(#v3-glow)" />
          <text x="828" y="280" fill="#d5e7e9" fontSize="12" fontWeight="800">مركبة مقابلة</text>
        </g>

        <g filter="url(#v3-glow)">
          <ellipse cx="535" cy="408" rx="204" ry="25" fill="#000" opacity=".34" />
        </g>

        <g>
          <ellipse cx="536" cy="425" rx="195" ry="27" fill="#000" opacity=".38" />
          <path d="M370 390Q372 357 405 343L460 298Q483 280 531 280H590Q628 282 657 312L690 346Q708 363 707 390L701 410Q695 425 666 430H409Q379 425 370 390Z" fill="url(#v3-car-body)" stroke="#c7d8db" strokeOpacity=".24" strokeWidth="2.4" />
          <path d="M462 300Q483 280 531 280H589Q626 282 655 311L617 326H482Z" fill="url(#v3-window)" stroke="#d5e6e8" strokeOpacity=".19" />
          <path d="M519 282V325M615 286L616 326" stroke="#d7e6e8" strokeOpacity=".20" strokeWidth="2" />
          <path d="M409 344L456 330H640L681 349" stroke="#d6e4e6" strokeOpacity=".20" strokeWidth="2" />
          <path d="M394 390Q388 402 402 413H681L695 396" fill="#0b141a" opacity=".64" />
          <path d="M402 413H694" stroke="#9fb2b7" strokeOpacity=".14" strokeWidth="2" />
          <path d="M426 425Q430 442 447 442T468 425M612 425Q616 442 633 442T654 425" stroke="#070d11" strokeWidth="14" strokeLinecap="round" />
          <path d="M412 375H495" stroke="#b5c8cb" strokeOpacity=".13" strokeWidth="2" />
          <path d="M645 374H689" stroke="#b5c8cb" strokeOpacity=".13" strokeWidth="2" />
          <rect x="664" y="343" width="25" height="16" rx="7" fill="#fff3bf" filter="url(#v3-glow)" />
          <rect x="671" y="358" width="22" height="14" rx="6" fill="#fff6c8" />
          <circle cx="395" cy="363" r="8" fill="#df615f" opacity=".72" />

          <path d="M700 335L730 350" stroke="#d7e7e9" strokeOpacity=".12" strokeWidth="4" strokeLinecap="round" />
          <path d="M712 349L744 363" stroke="#d7e7e9" strokeOpacity=".10" strokeWidth="4" strokeLinecap="round" />
        </g>

        <g>
          <rect x="55" y="63" width="205" height="66" rx="18" fill="#071118" fillOpacity=".86" stroke="#b0d4d6" strokeOpacity=".13" />
          <text x="232" y="88" textAnchor="end" fill="#87ddd2" fontSize="12" fontWeight="900">{active.title}</text>
          <text x="232" y="111" textAnchor="end" fill="#e4efef" fontSize="13" fontWeight="800">{active.sceneTitle}</text>
        </g>
      </svg>
    </div>
  );
}

const LIGHTS: LightMode[] = [
  {
    key: 'position',
    title: 'أنوار الموضع',
    technical: 'Position lamps',
    short: 'لتوضيح وجود المركبة وعرضها',
    summary: 'وظيفتها الأساسية أن تجعل المركبة أوضح للآخرين، خصوصاً عندما لا تكون هناك حاجة لإضاءة الطريق لمسافة بعيدة.',
    identify: 'رمز المصباح يكون قريباً من شكل مصباح أمامي مع خطوط قصيرة ومتوازية.',
    when: [
      'عندما تحتاج إلى إظهار وجود المركبة وأبعادها بوضوح.',
      'مع الإضاءة المحيطة الضعيفة عندما تكون هذه الأنوار جزءاً من الوضع المناسب للسيارة.',
      'تذكّر أنها ليست بديلاً عن الضوء الذي ينير الطريق أمامك.',
    ],
    mistakes: [
      'الخلط بينها وبين الضوء المنخفض: الموضع يساعد الآخرين على رؤيتك، والمنخفض يساعدك على رؤية الطريق.',
      'اعتبارها كافية وحدها عندما تحتاج فعلياً إلى إضاءة الطريق.',
    ],
    remember: 'أن تُرى',
    sceneTitle: 'علامات ضوئية حول المركبة',
    sceneText: 'لا نرسم شعاعاً طويلاً؛ التركيز هنا على ظهور المركبة وحدودها.',
  },
  {
    key: 'low',
    title: 'الضوء المنخفض',
    technical: 'Dipped / low beam',
    short: 'ينير الطريق أمامك بدون رفع الحزمة',
    summary: 'هو الوضع اليومي الأساسي لإضاءة الطريق عندما تكون هناك حاجة للرؤية أمام السيارة مع الحد من إبهار الآخرين.',
    identify: 'رمزه يشبه المصباح مع خطوط مائلة للأسفل أو متجهة إلى أسفل الطريق.',
    when: [
      'أثناء القيادة عندما تحتاج إلى إضاءة واضحة للطريق أمامك.',
      'عند وجود مركبة مقابلة أو عندما يصبح الضوء العالي مزعجاً للآخرين.',
      'عندما تكون الإضاءة الطبيعية غير كافية وتحتاج إلى رؤية الطريق بوضوح.',
    ],
    mistakes: [
      'استخدام العالي بدلاً منه مع وجود حركة مقابلة.',
      'الاعتقاد أن رفع الحزمة دائماً يعني رؤية أفضل؛ المهم أن تكون الرؤية مناسبة بدون إبهار.',
    ],
    remember: 'أن ترى الطريق',
    sceneTitle: 'حزمة قصيرة ومتجهة إلى سطح الطريق',
    sceneText: 'لاحظ كيف تبقى الحزمة منخفضة أمام السيارة ولا تمتد إلى أعلى مجال رؤية السائق المقابل.',
  },
  {
    key: 'high',
    title: 'الضوء العالي',
    technical: 'Main / high beam',
    short: 'إضاءة أبعد عندما يكون الطريق خالياً',
    summary: 'يوجّه الضوء لمسافة أبعد عندما تسمح حالة الطريق بذلك، ويجب خفضه عندما قد يسبب إبهاراً للآخرين.',
    identify: 'رمزه يشبه المصباح مع خطوط أفقية متوازية مستقيمة إلى الأمام.',
    when: [
      'عندما تكون الرؤية الليلية بحاجة إلى مدى أبعد والطريق يسمح بذلك.',
      'عندما لا توجد مركبة مقابلة أو مستخدم طريق قد يتعرض للإبهار.',
      'خفضه فور تغيّر وضع الطريق وظهور شخص أو مركبة في مجال الضوء.',
    ],
    mistakes: [
      'تركه مرتفعاً أثناء التقابل أو عندما يتأذى مستخدم الطريق من شدة الضوء.',
      'استخدامه تلقائياً لمجرد أن الطريق مظلم دون النظر إلى حركة المرور.',
    ],
    remember: 'أن ترى أبعد',
    sceneTitle: 'حزمة طويلة إلى الأمام',
    sceneText: 'في هذا الوضع تصل الإضاءة أبعد، وتظهر المركبة المقابلة كتذكير بضرورة خفض الحزمة عند التقابل.',
  },
  {
    key: 'fog',
    title: 'أضواء الضباب',
    technical: 'Front fog lamps',
    short: 'حزمة عريضة وقريبة من الأرض',
    summary: 'تساعد على تحسين الرؤية عندما تصبح الرؤية صعبة بسبب الضباب الكثيف أو الظروف الجوية المشابهة، مع بقاء القيادة متناسبة مع مدى الرؤية.',
    identify: 'رمزها يشبه المصباح مع خطوط أفقية يتقاطع معها الخط المميز للضباب.',
    when: [
      'عندما تنخفض الرؤية بشكل واضح بسبب الضباب الكثيف أو الثلج أو المطر الغزير أو ظروف مشابهة.',
      'عندما تكون المركبة مجهزة بهذه المصابيح ويكون استخدامها مناسباً للحالة.',
      'مع تخفيض السرعة وعدم الاعتماد على المصباح وحده لتحديد مسافة التوقف.',
    ],
    mistakes: [
      'تشغيلها فقط لأن الوقت ليلاً بدون وجود ظرف رؤية صعب.',
      'رفع السرعة لأن الطريق يبدو مضاءً؛ الرؤية الفعلية هي التي تحدد سرعة القيادة.',
    ],
    remember: 'تحسين الرؤية الصعبة',
    sceneTitle: 'حزمة منخفضة وعريضة',
    sceneText: 'تنتشر الإضاءة قريباً من سطح الطريق بدل أن تصعد كشعاع طويل أمام السيارة.',
  },
];

const MINI_CHECKS = [
  {
    q: 'ما الفكرة الأساسية لأنوار الموضع؟',
    options: ['أن تُرى المركبة بوضوح', 'أن تصل الإضاءة لأبعد مسافة', 'أن تستبدل الضوء العالي'],
    correct: 0,
    note: 'أنوار الموضع مرتبطة بإظهار المركبة وحدودها، وليست بإنارة الطريق لمسافة طويلة.',
  },
  {
    q: 'متى تخفّض الضوء العالي؟',
    options: ['عندما قد يسبب إبهاراً لمستخدم طريق آخر', 'كلما كان الطريق واسعاً', 'فقط عند التوقف'],
    correct: 0,
    note: 'القاعدة العملية هنا بسيطة: عندما يصبح الإبهار محتملاً، انتقل إلى الوضع المناسب للطريق.',
  },
  {
    q: 'كيف تميّز المنخفض عن العالي بسرعة؟',
    options: ['المنخفض يوجّه الحزمة أكثر إلى الأسفل، والعالي أبعد إلى الأمام', 'لا يوجد فرق بصري', 'العالي مخصص للوقوف فقط'],
    correct: 0,
    note: 'اربط شكل الرمز باتجاه الحزمة في المشهد، لا تحفظ الاسم وحده.',
  },
  {
    q: 'متى تفكر بأضواء الضباب الأمامية؟',
    options: ['عند صعوبة الرؤية بسبب ظروف جوية مناسبة', 'في كل قيادة ليلية', 'عندما تريد أن تسير أسرع'],
    correct: 0,
    note: 'الضباب ليس مجرد بديل للضوء العادي؛ فائدته مرتبطة بظروف رؤية صعبة.',
  },
];

export default function PracticalInfo() {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState<LightKey>('low');
  const [checkIndex, setCheckIndex] = useState(0);
  const [selectedCheck, setSelectedCheck] = useState<number | null>(null);

  const active = useMemo(
    () => LIGHTS.find(item => item.key === activeKey) ?? LIGHTS[1],
    [activeKey],
  );
  const check = MINI_CHECKS[checkIndex];

  const selectLight = (key: LightKey) => {
    setActiveKey(key);
    setSelectedCheck(null);
  };

  return (
    <div className="practical-info-page" dir="rtl">
      <header className="practical-info-header">
        <div className="practical-info-header-inner">
          <button
            className="practical-back"
            type="button"
            onClick={() => navigate('/')}
            aria-label="العودة إلى الرئيسية"
          >
            <span>→</span>
          </button>

          <div className="practical-brand">
            <span>مركز المعرفة العملية</span>
            <strong>معلومات عملية إضافية</strong>
          </div>

          <div className="practical-header-badge">
            <span>01</span> أضواء السيارة
          </div>
        </div>
      </header>

      <main className="practical-info-main">
        <section className="practical-hero">
          <div className="practical-hero-copy">
            
            <h1>
              تعلّم أضواء السيارة
              <em> من الرمز إلى الاستخدام.</em>
            </h1>
            <p>
              بدل حفظ أسماء الأزرار فقط، اربط كل رمز بوظيفته وباتجاه الحزمة وبالظرف الذي تحتاجه فيه.
              اضغط على أي ضوء وشاهد الفرق فوراً.
            </p>

            <div className="practical-hero-stats">
              <div>
                <b>04</b>
                <span>أوضاع رئيسية</span>
              </div>
              <div>
                <b>01</b>
                <span>محاكاة السيارة</span>
              </div>
              <div>
                <b>04</b>
                <span>أسئلة تثبيت</span>
              </div>
            </div>
          </div>

          <div className="practical-hero-visual" aria-hidden="true">
            <div className="hero-dashboard-ring ring-a" />
            <div className="hero-dashboard-ring ring-b" />
            <div className="hero-dashboard-panel">
              <div className="hero-speed">LIGHT CONTROL</div>
              <div className="hero-icon">
                <LightSymbol type={active.key} />
              </div>
              <div className="hero-active-mode">{active.title}</div>
              <div className="hero-bars"><i /><i /><i /><i /></div>
            </div>
            <span className="hero-orbit-dot dot-a" />
            <span className="hero-orbit-dot dot-b" />
          </div>
        </section>

        <section className="practical-light-picker" aria-labelledby="lights-picker-title">
          <div className="practical-section-title">
            <div>
              <span className="practical-eyebrow">الخطوة 01</span>
              <h2 id="lights-picker-title">اختَر الضوء</h2>
            </div>
            <p>ابدأ بالرمز، ثم شاهد شكله على الطريق وتعرّف على استخدامه.</p>
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
                <i className="tab-state">
                  {activeKey === item.key ? '✓' : String(LIGHTS.indexOf(item) + 1).padStart(2, '0')}
                </i>
              </button>
            ))}
          </div>
        </section>

        <section className="practical-learning-grid">
          <div className="practical-scene">
            <LightScene active={active} />
          </div>

          <aside className="practical-control-card">
            <div className="control-head">
              <div>
                <span className="practical-eyebrow">الخطوة 02</span>
                <h3>شوفه على السيارة</h3>
                <p>{active.technical}</p>
              </div>

              <div className="symbol-large">
                <LightSymbol type={active.key} />
              </div>
            </div>

            <div className="control-summary">
              <span>وظيفته باختصار</span>
              <strong>{active.summary}</strong>
            </div>

            <LightStalk active={active.key} onSelect={selectLight} />

            <div className="control-remember">
              <span>احفظها بهذه الجملة</span>
              <b>{active.remember}</b>
            </div>
          </aside>
        </section>

        <section className="practical-details" aria-label="شرح استخدام الضوء">
          <article className="detail-card">
            <div className="detail-icon">01</div>
            <div>
              <span>كيف أتعرف عليه؟</span>
              <h3>من الرمز</h3>
              <p>{active.identify}</p>
            </div>
          </article>

          <article className="detail-card detail-when">
            <div className="detail-icon">02</div>
            <div>
              <span>متى أستخدمه؟</span>
              <h3>الموقف الذي تحتاجه فيه</h3>
              <div className="detail-list">
                {active.when.map((item, index) => (
                  <div key={item}>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card detail-warning">
            <div className="detail-icon">03</div>
            <div>
              <span>لا تخلط بينهما</span>
              <h3>الأخطاء الشائعة</h3>
              <div className="detail-list compact">
                {active.mistakes.map((item, index) => (
                  <div key={item}>
                    <b>{index === 0 ? '!' : '↺'}</b>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card detail-visual">
            <div className="detail-icon"><LightSymbol type={active.key} /></div>
            <div>
              <span>اربط الرمز بالمشهد</span>
              <h3>{active.sceneTitle}</h3>
              <p>{active.sceneText}</p>
            </div>
          </article>
        </section>

        <section className="practical-memory">
          <div className="memory-copy">
            <span className="practical-eyebrow">الخطوة 03</span>
            <h2>طريقة حفظ أسرع</h2>
            <p>لا تحفظ الاسم وحده. اسأل: هل الهدف أن أُرى؟ أم أن أرى؟ أم أن أرى أبعد؟ أم أن أحسّن الرؤية في ظرف صعب؟</p>
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
                <b>{item.remember}</b>
                <small>{item.title}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="practical-check">
          <div className="check-intro">
            <span className="practical-eyebrow">الخطوة 04</span>
            <h2>اختبر فهمك قبل أن تكمل</h2>
            <p>أجب من فهمك للمشهد والوظيفة. هذا الاختبار للتعلّم داخل الدرس فقط.</p>
            <div className="check-rule">
              <span>قاعدة ذهبية</span>
              <b>شوف الرمز → افهم اتجاه الضوء → اربطه بحالة الطريق.</b>
            </div>
          </div>

          <div className="check-card">
            <div className="check-top">
              <span>{String(checkIndex + 1).padStart(2, '0')} / {String(MINI_CHECKS.length).padStart(2, '0')}</span>
              <b>اختبار سريع</b>
            </div>

            <h3>{check.q}</h3>

            <div className="check-options">
              {check.options.map((option, index) => {
                const state =
                  selectedCheck === null
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
              <div className={'check-feedback ' + (selectedCheck === check.correct ? 'good' : 'bad')}>
                <strong>{selectedCheck === check.correct ? 'إجابة صحيحة' : 'راجع المعلومة'}</strong>
                <span>
                  {selectedCheck === check.correct
                    ? 'ممتاز. اربط الإجابة دائماً بالمشهد، وليس بالحفظ العشوائي.'
                    : check.note}
                </span>
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
              {checkIndex === MINI_CHECKS.length - 1 ? 'إعادة الأسئلة' : 'السؤال التالي'}
              <span>←</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
