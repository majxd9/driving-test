import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SpiritDrift from '../components/SpiritDrift';

const MODELS = [
  { id: 1, label: 'النموذج 1', meta: 'اختبار قياسي', advanced: false },
  { id: 2, label: 'النموذج 2', meta: 'اختبار قياسي', advanced: false },
  { id: 3, label: 'النموذج 3', meta: 'اختبار قياسي', advanced: false },
  { id: 4, label: 'النموذج 4', meta: 'اختبار قياسي', advanced: false },
  { id: 5, label: 'النموذج 5', meta: 'اختبار قياسي', advanced: false },
  { id: 6, label: 'النموذج 6', meta: 'اختبار قياسي', advanced: false },
  { id: 7, label: 'النموذج 7', meta: 'تحدٍ متقدم', advanced: true },
  { id: 8, label: 'النموذج 8', meta: 'التحدي الأعلى', advanced: true },
];

function DriftCar() {
  return (
    <svg className="models-drift-car-svg" viewBox="0 0 720 390" aria-hidden="true">
      <defs>
        <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7af7e2" />
          <stop offset=".28" stopColor="#21cdb7" />
          <stop offset=".66" stopColor="#157cae" />
          <stop offset="1" stopColor="#071b2f" />
        </linearGradient>
        <linearGradient id="carGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#395d73" />
          <stop offset=".55" stopColor="#0d2a3e" />
          <stop offset="1" stopColor="#06121d" />
        </linearGradient>
        <linearGradient id="carTail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff8b98" />
          <stop offset=".5" stopColor="#ff3e57" />
          <stop offset="1" stopColor="#a51836" />
        </linearGradient>
        <filter id="carShadow" x="-25%" y="-35%" width="160%" height="190%">
          <feDropShadow dx="0" dy="24" stdDeviation="20" floodColor="#000" floodOpacity=".52" />
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#2dd4bf" floodOpacity=".18" />
        </filter>
      </defs>
      <ellipse cx="348" cy="343" rx="245" ry="18" fill="#01060a" opacity=".58" />
      <g filter="url(#carShadow)">
        <path d="M88 287c10-78 58-128 152-148l52-73c13-19 35-29 66-29h32c31 0 53 10 66 29l53 73c92 20 140 70 150 148l-18 38H105z" fill="url(#carBody)" stroke="#b7fff4" strokeWidth="6" />
        <path d="M218 135l40-58c9-14 23-22 44-23h112c20 1 34 9 44 23l39 58z" fill="url(#carGlass)" stroke="#8deee3" strokeWidth="5" />
        <path d="M358 53v78M293 58l-10 72M423 58l10 72" stroke="#65d9df" strokeWidth="3" opacity=".36" />
        <path d="M137 183c66-28 139-40 221-40s155 12 221 40" stroke="#dffffa" strokeWidth="4" opacity=".22" />
        <path d="M113 234c42-35 91-50 151-51h188c60 1 109 16 151 51l-8 73H121z" fill="#07151f" stroke="#52d7cb" strokeWidth="4" />
        <path d="M124 286c42-28 81-42 124-43h220c43 1 82 15 124 43l-11 43H135z" fill="#030a11" stroke="#22596d" strokeWidth="4" />
        <path d="M159 243c31-21 62-30 95-31l43 15c-23 28-60 41-125 38z" fill="url(#carTail)" stroke="#ffb6bf" strokeWidth="3" />
        <path d="M561 243c-31-21-62-30-95-31l-43 15c23 28 60 41 125 38z" fill="url(#carTail)" stroke="#ffb6bf" strokeWidth="3" />
        <path d="M183 238c30-12 53-17 77-19M533 238c-30-12-53-17-77-19" stroke="#8cfff2" strokeWidth="8" strokeLinecap="round" opacity=".75" />
        <path d="M285 266h146l24 70H261z" fill="#040b11" stroke="#317182" strokeWidth="4" />
        <path d="M301 284h114M309 301h98" stroke="#1d4555" strokeWidth="4" />
        <path d="M291 340h135" stroke="#6de5d5" strokeWidth="8" strokeLinecap="round" opacity=".56" />
        <circle cx="178" cy="325" r="29" fill="#07131c" stroke="#315166" strokeWidth="8" />
        <circle cx="542" cy="325" r="29" fill="#07131c" stroke="#315166" strokeWidth="8" />
        <path d="M141 307h438" stroke="#ecfffc" strokeWidth="3" opacity=".13" />
        <path d="M226 173c34-10 76-15 132-15s98 5 132 15" stroke="#9bfbed" strokeWidth="4" opacity=".14" />
      </g>
    </svg>
  );
}

export default function Models() {
  const navigate = useNavigate();
  const [drifting, setDrifting] = useState(false);

  return (
    <div className={\`models-page \${drifting ? 'is-drifting' : ''}\`} dir="rtl">
      <header className="exam-topbar-v2">
        <button onClick={() => navigate('/')} className="exam-back-v2" aria-label="العودة إلى الصفحة الرئيسية">‹</button>
        <div className="exam-title-v2">
          <strong>اختبارات المحاكاة</strong>
          <span>اختر نموذجاً وابدأ الاختبار</span>
        </div>
        <div className="flex items-center gap-2"><div className="exam-timer-v2">١٥:٠٠</div></div>
      </header>

      <main className="models-wrap">
        <section className={\`models-hero models-drift-hero \${drifting ? 'is-drifting' : ''}\`}>
          <div className="models-drift-stage" aria-hidden="true">
            <div className="models-drift-horizon" />
            <div className="models-drift-track-surface">
              <span className="lane-line line-1" />
              <span className="lane-line line-2" />
              <span className="lane-line line-3" />
              <span className="track-edge edge-1" />
              <span className="track-edge edge-2" />
            </div>
            <div className="models-drift-marks">
              <i className="mark-1" /><i className="mark-2" /><i className="mark-3" />
            </div>
            <div className="models-drift-smoke-cloud smoke-1" />
            <div className="models-drift-smoke-cloud smoke-2" />
            <div className="models-drift-car-wrap"><DriftCar /></div>
          </div>

          <SpiritDrift onStateChange={setDrifting} />

          <div className="models-hero-copy">
            <p className="eyebrow">اختبار الرخصة</p>
            <h1>جاهز للاختبار؟</h1>
            <p>كل نموذج يتكوّن من ٣٠ سؤالاً من قواعد السير والإشارات والميكانيك، بمدة ١٥ دقيقة. تحتاج إلى ٢٥ إجابة صحيحة للنجاح.</p>
          </div>
        </section>

        <div className="models-grid">
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => navigate(\`/exam/\${model.id}\`)}
              className={\`model-card \${model.advanced ? 'advanced' : ''}\`}
              type="button"
            >
              <span className="flex items-center justify-between gap-4">
                <span className={\`model-number \${model.advanced ? 'advanced' : ''}\`}>{model.id}</span>
                <span aria-hidden="true" className="text-xl text-muted">←</span>
              </span>
              <span className="block mt-4">
                <strong className="block text-base">{model.label}</strong>
                <span className="block mt-1 text-xs text-muted">{model.meta}</span>
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
