import { useLocation, useNavigate } from 'react-router-dom';

const PASS_SCORE = 25;

export default function Result() {
  const { state } = useLocation() as {
    state: { correct: number; total: number; answered: number } | null;
  };
  const navigate = useNavigate();

  if (!state) {
    navigate('/');
    return null;
  }

  const { correct, total, answered } = state;
  const wrong = answered - correct;
  const unanswered = total - answered;
  const passed = correct >= PASS_SCORE;

  return (
    <div className="min-h-screen flex items-start justify-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <div
          className={`w-32 h-32 rounded-full border-[5px] mx-auto mb-5 flex flex-col items-center justify-center bg-surface ${
            passed ? 'border-brand' : 'border-exam'
          }`}
        >
          <span className="text-4xl font-bold text-ink">{correct}</span>
          <span className="text-xs text-muted">من {total}</span>
        </div>

        <h1 className={`text-xl font-bold mb-1 ${passed ? 'text-brand' : 'text-exam'}`}>
          {passed ? 'ناجح' : 'راسب'}
        </h1>
        <p className="text-sm text-muted mb-4">
          {passed ? 'مبروك، تجاوزت الحد الأدنى للنجاح' : `الحد الأدنى للنجاح ${PASS_SCORE} إجابة صحيحة`}
        </p>

        <div className="flex gap-2.5 justify-center mb-7">
          <div className="bg-surface rounded-xl px-4 py-3 border border-line">
            <p className="text-xl font-bold text-brand">{correct}</p>
            <p className="text-xs text-muted">صحيح</p>
          </div>
          <div className="bg-surface rounded-xl px-4 py-3 border border-line">
            <p className="text-xl font-bold text-exam">{wrong}</p>
            <p className="text-xs text-muted">خطأ</p>
          </div>
          <div className="bg-surface rounded-xl px-4 py-3 border border-line">
            <p className="text-xl font-bold text-muted">{unanswered}</p>
            <p className="text-xs text-muted">لم يُجب</p>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => navigate('/models')}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-exam"
          >
            📋 اختر نموذجاً آخر
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-xl font-semibold text-muted bg-surface border border-line"
          >
            🏠 الصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
