import { useNavigate } from 'react-router-dom';

const MODELS = [
  { id: 1, label: 'النموذج 1', meta: 'قياسي' },
  { id: 2, label: 'النموذج 2', meta: 'قياسي' },
  { id: 3, label: 'النموذج 3', meta: 'قياسي' },
  { id: 4, label: 'النموذج 4', meta: 'قياسي' },
  { id: 5, label: 'النموذج 5', meta: 'قياسي' },
  { id: 6, label: 'النموذج 6', meta: 'قياسي' },
  { id: 7, label: 'النموذج 7', meta: 'متقدم • صعب' },
  { id: 8, label: 'النموذج 8', meta: 'متقدم • صعب جداً' },
];

export default function Models() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="bg-exam sticky top-0 z-10 text-white px-4 py-3.5 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100" aria-label="العودة">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="font-semibold text-sm">اختر نموذج الاختبار</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-sm text-muted text-center mb-5 leading-relaxed">
          كل نموذج يحتوي ٣٠ سؤالاً موزّعة على الأقسام الثلاثة، بمدة ١٥ دقيقة والنجاح من ٢٥ إجابة صحيحة.
          النموذجان ٧ و٨ مخصصان للتحدي المتقدم.
        </p>

        <div className="space-y-2.5">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/exam/${m.id}`)}
              className={`w-full bg-surface rounded-xl2 border p-4 flex items-center justify-between text-right transition-colors ${
                m.id >= 7 ? 'border-exam/50 hover:border-exam' : 'border-line hover:border-exam'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                  m.id >= 7 ? 'bg-exam text-white' : 'bg-exam-soft text-exam'
                }`}>
                  {m.id}
                </span>
                <span>
                  <span className="block font-semibold text-ink">{m.label}</span>
                  <span className={`block text-xs mt-0.5 ${m.id >= 7 ? 'text-exam' : 'text-muted'}`}>{m.meta}</span>
                </span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-5 h-5 text-muted">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
