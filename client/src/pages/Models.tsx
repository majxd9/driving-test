import { useNavigate } from 'react-router-dom';

const MODELS = [1, 2, 3, 4, 5, 6];

export default function Models() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="bg-exam sticky top-0 z-10 text-white px-4 py-3.5 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="font-semibold text-sm">اختر نموذج الاختبار</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-sm text-muted text-center mb-5 leading-relaxed">
          كل نموذج يحتوي ٣٠ سؤال موزّعة على الأقسام الثلاثة، بمدة ١٥ دقيقة والنجاح من ٢٥ إجابة صحيحة.
        </p>

        <div className="space-y-2.5">
          {MODELS.map((m) => (
            <button
              key={m}
              onClick={() => navigate(`/exam/${m}`)}
              className="w-full bg-surface rounded-xl2 border border-line p-4 flex items-center justify-between text-right hover:border-exam transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-exam-soft text-exam flex items-center justify-center font-bold">
                  {m}
                </span>
                <span className="font-semibold text-ink">النموذج {m}</span>
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
