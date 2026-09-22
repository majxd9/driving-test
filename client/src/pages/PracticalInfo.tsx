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
        <b>التحكم من نفس المقبض: اضغط على الحلقة لتبديل الوضع.</b>
      </div>

      <div className="stalk-control-stage">
        <svg
          className="stalk-demo-svg"
          viewBox="0 0 520 230"
          role="img"
          aria-label={\`مقبض واقعي للتحكم بأضواء السيارة — الوضع الحالي: \${labels[active]}\`}
        >
          <defs>
            <linearGradient id="stalk-metal-v5" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8c3c6" />
              <stop offset="22%" stopColor="#707d83" />
              <stop offset="55%" stopColor="#354148" />
              <stop offset="100%" stopColor="#10181d" />
            </linearGradient>
            <linearGradient id="stalk-grip-v5" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5d6b71" />
              <stop offset="28%" stopColor="#2e3940" />
              <stop offset="72%" stopColor="#151e24" />
              <stop offset="100%" stopColor="#080e13" />
            </linearGradient>
            <linearGradient id="stalk-collar-v5" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#bdc8ca" />
              <stop offset="26%" stopColor="#6d7a80" />
              <stop offset="65%" stopColor="#303b41" />
              <stop offset="100%" stopColor="#11181d" />
            </linearGradient>
            <filter id="stalk-shadow-v5" x="-30%" y="-50%" width="170%" height="200%">
              <feDropShadow dx="0" dy="11" stdDeviation="9" floodOpacity=".40" />
            </filter>
          </defs>

          <ellipse cx="273" cy="184" rx="202" ry="15" fill="#000" opacity=".28" />

          <path
            d="M52 131C76 113 106 103 142 101H328"
            stroke="#081015"
            strokeWidth="39"
            strokeLinecap="round"
            opacity=".82"
            filter="url(#stalk-shadow-v5)"
          />
          <path
            d="M52 123C79 105 109 98 143 97H329"
            stroke="url(#stalk-metal-v5)"
            strokeWidth="29"
            strokeLinecap="round"
          />
          <path
            d="M69 116C94 103 114 98 145 97H321"
            stroke="#f1f6f7"
            strokeOpacity=".22"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path d="M324 76V140" stroke="#0b1217" strokeWidth="53" strokeLinecap="round" opacity=".95" />
          <path d="M324 76V140" stroke="url(#stalk-collar-v5)" strokeWidth="42" strokeLinecap="round" />
          <path d="M324 82V135" stroke="#e4eeee" strokeOpacity=".18" strokeWidth="4" strokeLinecap="round" />

          <path
            d="M355 72C369 67 383 66 401 68L463 78Q476 80 480 93V124Q477 139 462 141L399 147Q379 149 362 139Z"
            fill="url(#stalk-grip-v5)"
            stroke="#bdc9cc"
            strokeOpacity=".22"
            strokeWidth="1.7"
          />
          <path
            d="M378 73L373 142M391 71L387 145M404 71L402 145M418 73L417 142M432 74L433 140M446 76L449 138"
            stroke="#a2afb3"
            strokeOpacity=".16"
            strokeWidth="2"
          />
          <path
            d="M361 82Q378 89 395 88L462 96"
            stroke="#f1f6f7"
            strokeOpacity=".12"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle cx="324" cy="108" r="35" fill="#0b1217" stroke="#c8d2d5" strokeOpacity=".16" strokeWidth="2" />
          <circle cx="324" cy="108" r="29" fill="url(#stalk-collar-v5)" stroke="#aab6ba" strokeOpacity=".34" strokeWidth="2" />
          <circle cx="324" cy="108" r="21" fill="#111a20" stroke="#5b696f" strokeWidth="4" />
          <path d="M324 88V96M344 108H336M324 128V120M304 108H312" stroke="#edf6f6" strokeOpacity=".62" strokeWidth="2.7" strokeLinecap="round" />
          <circle cx="324" cy="108" r="4.5" fill="#effaf8" opacity=".90" />

          <rect x="72" y="153" width="118" height="25" rx="12.5" fill="#081117" stroke="#d5e3e5" strokeOpacity=".10" />
          <text x="131" y="170" textAnchor="middle" fill="#9ae9df" fontSize="11" fontWeight="900">
            {labels[active]}
          </text>
          <text x="324" y="171" textAnchor="middle" fill="#bfe7e3" fontSize="10" fontWeight="800" opacity=".82">
            اضغط هنا
          </text>
        </svg>

        <button
          type="button"
          className="stalk-ring-trigger"
          onClick={() => onSelect(nextLight)}
          aria-label={\`اضغط على المقبض لتبديل الإضاءة من \${labels[active]} إلى \${labels[nextLight]}\`}
          title={\`اضغط على المقبض — التالي: \${labels[nextLight]}\`}
        />
      </div>
    </div>
  );
}

function LightScene({ active }: { active: LightMode }) {
  const frontMainOn = active.key === 'low' || active.key === 'high';
  const frontFogOn = active.key === 'fog';
  const frontPositionOn = active.key === 'position';
  const rearPositionOn = active.key === 'position';

  return (
    <div className="scene-v4-wrap">
      <svg
        className="scene-v4-svg"
        viewBox="0 0 900 470"
        role="img"
        aria-label={\`\${active.title}: توضيح أماكن الإضاءة من الأمام والخلف\`}
      >
        <defs>
          <linearGradient id="v4-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#081721" />
            <stop offset="55%" stopColor="#0d222d" />
            <stop offset="100%" stopColor="#071219" />
          </linearGradient>
          <linearGradient id="v4-body-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9caeb3" />
            <stop offset="26%" stopColor="#5a6c73" />
            <stop offset="62%" stopColor="#283b44" />
            <stop offset="100%" stopColor="#101c23" />
          </linearGradient>
          <linearGradient id="v4-body-rear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#84989e" />
            <stop offset="28%" stopColor="#4f636b" />
            <stop offset="64%" stopColor="#24363f" />
            <stop offset="100%" stopColor="#0e1a21" />
          </linearGradient>
          <linearGradient id="v4-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d9ecef" stopOpacity=".72" />
            <stop offset="100%" stopColor="#244553" stopOpacity=".94" />
          </linearGradient>
          <filter id="v4-front-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="v4-rear-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="900" height="470" rx="24" fill="url(#v4-bg)" />

        <g opacity=".9">
          <rect x="44" y="30" width="370" height="46" rx="16" fill="#071219" stroke="#b6d9dc" strokeOpacity=".10" />
          <text x="229" y="59" textAnchor="middle" fill="#ecf7f7" fontSize="16" fontWeight="900">من الأمام</text>
          <text x="229" y="87" textAnchor="middle" fill="#83dfd3" fontSize="10" fontWeight="800">المصابيح التي تنير الطريق</text>

          <rect x="486" y="30" width="370" height="46" rx="16" fill="#071219" stroke="#b6d9dc" strokeOpacity=".10" />
          <text x="671" y="59" textAnchor="middle" fill="#ecf7f7" fontSize="16" fontWeight="900">من الخلف</text>
          <text x="671" y="87" textAnchor="middle" fill="#83dfd3" fontSize="10" fontWeight="800">مصابيح ظهور المركبة</text>
        </g>

        <g transform="translate(78 103)">
          <ellipse cx="151" cy="313" rx="135" ry="19" fill="#000" opacity=".35" />
          <path
            d="M28 264Q31 219 66 205L92 170Q112 144 151 138H211Q250 144 270 170L296 205Q331 219 334 264Q331 297 300 305H62Q31 297 28 264Z"
            fill="url(#v4-body-front)"
            stroke="#d8e6e8"
            strokeOpacity=".24"
            strokeWidth="2.4"
          />
          <path
            d="M89 171Q111 145 151 139H210Q250 145 273 171L257 205H104Z"
            fill="url(#v4-glass)"
            stroke="#dcecee"
            strokeOpacity=".22"
            strokeWidth="2"
          />
          <path d="M151 140V204M211 145L211 204" stroke="#e0edef" strokeOpacity=".16" strokeWidth="2" />
          <path d="M87 217H274" stroke="#e5eff0" strokeOpacity=".17" strokeWidth="2" />
          <path d="M102 252H87Q71 252 65 266" stroke="#e5eff0" strokeOpacity=".12" strokeWidth="3" strokeLinecap="round" />
          <path d="M199 252H286Q302 252 309 266" stroke="#e5eff0" strokeOpacity=".12" strokeWidth="3" strokeLinecap="round" />
          <rect x="110" y="235" width="52" height="28" rx="11" fill="#111c22" stroke="#d9e7e8" strokeOpacity=".14" />
          <path d="M125 245H147M125 252H147" stroke="#b7cbcf" strokeOpacity=".24" strokeWidth="2" strokeLinecap="round" />
          <circle cx="67" cy="270" r="8" fill="#0a1116" stroke="#859a9f" strokeOpacity=".18" strokeWidth="3" />
          <circle cx="270" cy="270" r="8" fill="#0a1116" stroke="#859a9f" strokeOpacity=".18" strokeWidth="3" />

          <rect x="48" y="219" width="54" height="33" rx="12" fill="#071116" stroke="#dfe9e9" strokeOpacity=".20" />
          <rect x="234" y="219" width="54" height="33" rx="12" fill="#071116" stroke="#dfe9e9" strokeOpacity=".20" />
          <rect x="54" y="225" width="42" height="21" rx="8" fill="#fff7d3"
            opacity={frontMainOn ? 1 : frontPositionOn ? .62 : .14}
            filter={frontMainOn ? "url(#v4-front-glow)" : undefined}
          />
          <rect x="240" y="225" width="42" height="21" rx="8" fill="#fff7d3"
            opacity={frontMainOn ? 1 : frontPositionOn ? .62 : .14}
            filter={frontMainOn ? "url(#v4-front-glow)" : undefined}
          />

          <circle cx="96" cy="277" r="10" fill="#f7f8f1" opacity={frontPositionOn ? .95 : .12} filter={frontPositionOn ? "url(#v4-front-glow)" : undefined} />
          <circle cx="240" cy="277" r="10" fill="#f7f8f1" opacity={frontPositionOn ? .95 : .12} filter={frontPositionOn ? "url(#v4-front-glow)" : undefined} />

          <rect x="123" y="274" width="28" height="13" rx="6.5" fill="#fff4bf" opacity={frontFogOn ? 1 : .12} filter={frontFogOn ? "url(#v4-front-glow)" : undefined} />
          <rect x="185" y="274" width="28" height="13" rx="6.5" fill="#fff4bf" opacity={frontFogOn ? 1 : .12} filter={frontFogOn ? "url(#v4-front-glow)" : undefined} />

          <g opacity={active.key === 'low' ? .55 : active.key === 'high' ? .95 : 0}>
            <path d="M54 231L-4 210L-4 252L54 240Z" fill="#fff1ad" opacity=".36" />
            <path d="M282 231L340 210L340 252L282 240Z" fill="#fff1ad" opacity=".36" />
          </g>
          <g opacity={active.key === 'high' ? .95 : 0}>
            <path d="M50 229L-14 184L-14 216L50 239Z" fill="#fffbd7" opacity=".30" />
            <path d="M286 229L350 184L350 216L286 239Z" fill="#fffbd7" opacity=".30" />
          </g>

          <g transform="translate(17 322)">
            <rect width="268" height="28" rx="14" fill="#071219" stroke="#d0e1e2" strokeOpacity=".08" />
            <text x="134" y="18" textAnchor="middle" fill="#bedddd" fontSize="9.5" fontWeight="800">
              {active.key === 'fog' ? 'أضواء الضباب الأمامية' : active.key === 'position' ? 'أضواء الموضع الأمامية' : active.key === 'high' ? 'الضوء العالي' : 'الضوء المنخفض'}
            </text>
          </g>
        </g>

        <g transform="translate(520 103)">
          <ellipse cx="151" cy="313" rx="135" ry="19" fill="#000" opacity=".35" />
          <path
            d="M28 264Q31 219 66 205L92 170Q112 144 151 138H211Q250 144 270 170L296 205Q331 219 334 264Q331 297 300 305H62Q31 297 28 264Z"
            fill="url(#v4-body-rear)"
            stroke="#d8e6e8"
            strokeOpacity=".22"
            strokeWidth="2.4"
          />
          <path
            d="M91 171Q112 145 151 139H210Q250 145 272 171L254 205H106Z"
            fill="url(#v4-glass)"
            stroke="#dcecee"
            strokeOpacity=".20"
            strokeWidth="2"
          />
          <path d="M151 140V205" stroke="#e0edef" strokeOpacity=".15" strokeWidth="2" />
          <path d="M88 219H274" stroke="#e5eff0" strokeOpacity=".12" strokeWidth="2" />

          <rect x="47" y="230" width="59" height="43" rx="15" fill="#0a151b" stroke="#d5e3e5" strokeOpacity=".16" />
          <rect x="227" y="230" width="59" height="43" rx="15" fill="#0a151b" stroke="#d5e3e5" strokeOpacity=".16" />
          <rect x="53" y="236" width="47" height="31" rx="11" fill="#ff4b45" opacity={rearPositionOn ? 1 : .20} filter={rearPositionOn ? "url(#v4-rear-glow)" : undefined} />
          <rect x="233" y="236" width="47" height="31" rx="11" fill="#ff4b45" opacity={rearPositionOn ? 1 : .20} filter={rearPositionOn ? "url(#v4-rear-glow)" : undefined} />

          <rect x="126" y="246" width="50" height="25" rx="8" fill="#101b21" stroke="#b9cace" strokeOpacity=".15" />
          <path d="M138 254H164M138 262H164" stroke="#c6d6d8" strokeOpacity=".20" strokeWidth="2" strokeLinecap="round" />

          <path d="M76 287H226" stroke="#d4e1e2" strokeOpacity=".13" strokeWidth="2" />
          <circle cx="67" cy="270" r="8" fill="#0a1116" stroke="#859a9f" strokeOpacity=".18" strokeWidth="3" />
          <circle cx="270" cy="270" r="8" fill="#0a1116" stroke="#859a9f" strokeOpacity=".18" strokeWidth="3" />

          <g opacity={rearPositionOn ? 1 : .18}>
            <rect x="50" y="282" width="47" height="10" rx="5" fill="#d94d48" />
            <rect x="237" y="282" width="47" height="10" rx="5" fill="#d94d48" />
          </g>

          <g transform="translate(17 322)">
            <rect width="268" height="28" rx="14" fill="#071219" stroke="#d0e1e2" strokeOpacity=".08" />
            <text x="134" y="18" textAnchor="middle" fill="#bedddd" fontSize="9.5" fontWeight="800">
              {rearPositionOn ? 'تظهر بوضوح عند وضع الموضع' : 'الخلف يوضح مكان مصابيح الموضع'}
            </text>
          </g>
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

        <section className="practical-learning-grid" aria-label="أماكن أضواء السيارة والتحكم بها">
          <div className="practical-scene">
            <LightScene active={active} />
          </div>

          <aside className="practical-control-card">
            <div className="control-head">
              <div>
                <span className="practical-eyebrow">الخطوة 02</span>
                <h3>تحكم من المقبض نفسه</h3>
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
