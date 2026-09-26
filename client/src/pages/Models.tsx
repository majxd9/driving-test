import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriftCarArt from '../components/DriftCarArt';
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

const preloadExam = () => { void import('./Exam'); };

export default function Models() {
  const navigate = useNavigate();
  const [drifting, setDrifting] = useState(false);
  const carRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const car = carRef.current;
    if (!car) return;

    // Cancel any CSS animation that could be overriding the actual movement.
    car.getAnimations().forEach((animation) => animation.cancel());
    car.style.setProperty('animation', 'none', 'important');

    let frame = 0;
    let started = performance.now();
    const duration = 1850;

    const render = (now: number) => {
      const elapsed = now - started;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      let x = 0;
      let y = 0;
      let rotate = -1;
      let scale = 1;

      if (drifting) {
        const wave = Math.sin(t * Math.PI * 5.2);
        const wave2 = Math.sin(t * Math.PI * 2.6 + 0.9);
        x = wave * 72 * (1 - t * 0.25);
        y = -Math.abs(wave2) * 7;
        rotate = -1 + wave * 10;
        scale = 1 + Math.abs(wave) * 0.035;
      } else {
        y = Math.sin(now / 1800) * -2;
        rotate = -1 + Math.sin(now / 2300) * 0.35;
      }

      car.style.setProperty(
        'transform',
        `translate3d(calc(-50% + ${x}px), ${y}px, 0) rotate(${rotate}deg) scale(${scale})`,
        'important'
      );

      if (drifting && t < 1) {
        frame = requestAnimationFrame(render);
        return;
      }

      if (drifting) {
        car.style.setProperty('transform', 'translate3d(-50%, 0, 0) rotate(-1deg) scale(1)', 'important');
      } else {
        frame = requestAnimationFrame(render);
      }
    };

    if (drifting) {
      started = performance.now();
      frame = requestAnimationFrame(render);
    } else {
      frame = requestAnimationFrame(render);
    }

    return () => cancelAnimationFrame(frame);
  }, [drifting]);

  return (
    <div className={`models-page ${drifting ? 'is-drifting' : ''}`} dir="rtl">
      <header className="exam-topbar-v2">
        <button onClick={() => navigate('/')} className="exam-back-v2" aria-label="العودة إلى الصفحة الرئيسية">‹</button>
        <div className="exam-title-v2">
          <strong>اختبارات المحاكاة</strong>
          <span>اختر نموذجاً وابدأ الاختبار</span>
        </div>
        <div className="flex items-center gap-2"><div className="exam-timer-v2">١٥:٠٠</div></div>
      </header>

      <main className="models-wrap">
        <section className="models-drift-hero-v9">
          <div className="models-drift-stage-v10" aria-hidden="true">
            <div className="models-drift-road-v10" />
            <div className="models-drift-glow-v9" />
            <DriftCarArt ref={carRef} />
            <div className="models-drift-smoke-v9 smoke-a" />
            <div className="models-drift-smoke-v9 smoke-b" />
          </div>

          <div className="models-hero-copy-v9">
            <p className="eyebrow">اختبار الرخصة</p>
            <h1>جاهز للاختبار؟</h1>
            <p>كل نموذج يتكوّن من ٣٠ سؤالاً من قواعد السير والإشارات والميكانيك، بمدة ١٥ دقيقة. تحتاج إلى ٢٥ إجابة صحيحة للنجاح.</p>
          </div>

          <SpiritDrift onStateChange={setDrifting} />
        </section>

        <div className="models-grid">
          {MODELS.map((model) => (
            <button key={model.id} onPointerEnter={preloadExam} onFocus={preloadExam} onClick={() => navigate(`/exam/${model.id}`)} className={`model-card ${model.advanced ? 'advanced' : ''}`} type="button">
              <span className="flex items-center justify-between gap-4">
                <span className={`model-number ${model.advanced ? 'advanced' : ''}`}>{model.id}</span>
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
