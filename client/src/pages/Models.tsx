import { useNavigate } from 'react-router-dom';
import SpiritDriveScene from '../components/SpiritDriveScene';
import SpiritVolume from '../components/SpiritVolume';

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

export default function Models() {
  const navigate = useNavigate();

  return (
    <div className="models-page" dir="rtl">
      <header className="exam-topbar-v2">
        <button onClick={() => navigate('/')} className="exam-back-v2" aria-label="العودة إلى الصفحة الرئيسية">‹</button>
        <div className="exam-title-v2">
          <strong>اختبارات المحاكاة</strong>
          <span>اختر نموذجاً وابدأ الاختبار</span>
        </div>
        <div className="flex items-center gap-2"><SpiritVolume /><div className="exam-timer-v2">١٥:٠٠</div></div>
      </header>

      <main className="models-wrap">
        <section className="models-hero">
          <SpiritDriveScene large variant="rear" className="models-spirit-scene" />
          <p className="eyebrow">اختبار الرخصة</p>
          <h1>جاهز للاختبار؟</h1>
          <p>كل نموذج يتكوّن من ٣٠ سؤالاً من قواعد السير والإشارات والميكانيك، بمدة ١٥ دقيقة. تحتاج إلى ٢٥ إجابة صحيحة للنجاح.</p>
        </section>

        <div className="models-grid">
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => navigate(`/exam/${model.id}`)}
              className={`model-card ${model.advanced ? 'advanced' : ''}`}
              type="button"
            >
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
