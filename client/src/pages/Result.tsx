import { useLocation, useNavigate } from 'react-router-dom';
import { Question } from '../types';

const PASS_SCORE = 25;

interface WrongItem {
  question: Question;
  chosen: number;
}

export default function Result() {
  const { state } = useLocation() as {
    state: {
      correct: number;
      total: number;
      answered: number;
      wrongQuestions?: WrongItem[];
    } | null;
  };
  const navigate = useNavigate();

  if (!state) {
    navigate('/');
    return null;
  }

  const { correct, total, answered, wrongQuestions = [] } = state;
  const wrong = answered - correct;
  const unanswered = total - answered;
  const passed = correct >= PASS_SCORE;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="min-h-screen flex items-start justify-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <div
          className={`w-32 h-32 rounded-full border-[5px] mx-auto mb-5 flex flex-col items-center justify-center bg-surface animate-[fadeUp_0.4s_ease-out] ${
            passed ? 'border-brand' : 'border-exam'
          }`}
        >
          <span className="text-4xl font-bold text-ink">{percent}%</span>
          <span className="text-xs text-muted">{correct} من {total}</span>
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

        <div className="space-y-2.5 mb-8">
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

        <div className="text-right">
          <h2 className="text-base font-bold text-ink mb-3 text-center">
            الأسئلة التي أخطأت بها {wrongQuestions.length > 0 && `(${wrongQuestions.length})`}
          </h2>

          {wrongQuestions.length === 0 ? (
            <div className="bg-surface rounded-xl2 border border-line px-4 py-6 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm text-muted">
                {answered === 0 ? 'ما في أسئلة لمراجعتها.' : 'ما أخطأت بأي سؤال — ممتاز!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wrongQuestions.map(({ question: q, chosen }) => (
                <div key={q.id} className="bg-surface rounded-xl2 border border-line p-4">
                  {q.imageUrl && (
                    <div className="w-full max-w-[160px] aspect-square mx-auto mb-3 rounded-lg border border-line bg-paper flex items-center justify-center overflow-hidden">
                      <img src={q.imageUrl} alt="السؤال" className="w-full h-full object-contain p-2" />
                    </div>
                  )}
                  <p className="text-sm font-bold text-ink mb-3 leading-relaxed">{q.text}</p>

                  <div className="rounded-lg bg-exam-soft border border-exam px-3 py-2 mb-2">
                    <p className="text-[11px] text-exam font-semibold mb-0.5">إجابتك</p>
                    <p className="text-sm text-ink">{q.options[chosen]}</p>
                  </div>
                  <div className="rounded-lg bg-brand-soft border border-brand px-3 py-2">
                    <p className="text-[11px] text-brand font-semibold mb-0.5">الإجابة الصحيحة</p>
                    <p className="text-sm text-ink">{q.options[q.correctAnswerIndex]}</p>
                  </div>

                  {q.explanation && (
                    <p className="text-xs text-muted leading-relaxed mt-2.5 pt-2.5 border-t border-line">
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
