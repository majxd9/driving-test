import { useLocation, useNavigate } from 'react-router-dom';

const PASS_SCORE = 25;

export default function Result() {
  const { state } = useLocation() as { state: { correct: number; total: number; answered: number } | null };
  const navigate = useNavigate();

  if (!state) {
    navigate('/');
    return null;
  }

  const { correct, total, answered } = state;
  const wrong = Math.max(0, answered - correct);
  const unanswered = Math.max(0, total - answered);
  const passed = correct >= PASS_SCORE;
  const percentage = Math.round((correct / Math.max(total, 1)) * 100);

  return (
    <div className="min-h-screen flex items-start justify-center px-5 py-10 bg-paper">
      <div className="w-full max-w-lg text-center">
        <div className={`result-hero ${passed ? 'passed' : 'failed'}`}><span className="result-percent">{percentage}%</span><strong>{correct}</strong><span>من {total}</span></div>
        <h1 className={`text-2xl font-black mt-5 mb-1 ${passed ? 'text-brand' : 'text-exam'}`}>{passed ? 'أحسنت — ناجح' : 'تحتاج إلى مراجعة أكثر'}</h1>
        <p className="text-sm text-muted mb-6">{passed ? `تجاوزت حد النجاح المحدد بـ${PASS_SCORE} إجابة صحيحة.` : `النجاح يحتاج ${PASS_SCORE} إجابة صحيحة على الأقل.`}</p>
        <div className="result-stats"><div><strong>{correct}</strong><span>صحيح</span></div><div><strong>{wrong}</strong><span>خطأ</span></div><div><strong>{unanswered}</strong><span>لم يُجب</span></div></div>
        <div className="space-y-2.5 mt-7"><button onClick={() => navigate('/models')} className="w-full py-3.5 rounded-2xl font-black text-white bg-exam">اختر نموذجاً آخر</button><button onClick={() => navigate('/')} className="w-full py-3.5 rounded-2xl font-bold text-muted bg-surface border border-line">العودة للصفحة الرئيسية</button></div>
      </div>
    </div>
  );
}
