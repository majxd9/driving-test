import { useLocation, useNavigate } from 'react-router-dom';
import { Question } from '../types';

const PASS_SCORE = 25;

interface ResultState {
  correct: number;
  total: number;
  answered: number;
  questions?: Question[];
  answers?: Record<number, number>;
}

export default function Result() {
  const { state } = useLocation() as { state: ResultState | null };
  const navigate = useNavigate();

  if (!state) {
    navigate('/');
    return null;
  }

  const { correct, total, answered, questions, answers } = state;
  const wrong = answered - correct;
  const unanswered = total - answered;
  const passed = correct >= PASS_SCORE;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const mistakes = questions ? questions.filter((q) => answers?.[q.id] !== q.correctAnswerIndex) : [];

  return (
    <div className="min-h-screen px-5 py-10">
      <div className="w-full max-w-sm mx-auto text-center">
        <div
          className={`w-32 h-32 rounded-full border-[5px] mx-auto mb-5 flex flex-col items-center justify-center bg-surface ${
            passed ? 'border-brand' : 'border-exam'
          }`}
        >
          <span className="text-4xl font-bold text-ink">{percentage}٪</span>
          <span className="text-xs text-muted mt-0.5">{correct} من {total}</span>
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

      {mistakes.length > 0 && (
        <div className="w-full max-w-sm mx-auto mt-9">
          <h2 className="text-base font-bold text-ink mb-3">
            راجع أخطاءك <span className="text-muted font-normal text-sm">({mistakes.length})</span>
          </h2>
          <div className="space-y-3">
            {mistakes.map((q, idx) => {
              const chosen = answers?.[q.id];
              return (
                <div key={q.id} className="bg-surface rounded-xl2 border border-line p-4 text-right">
                  <p className="text-xs text-muted mb-2">سؤال {idx + 1}</p>
                  {q.imageUrl && (
                    <div className="w-full max-w-[140px] aspect-square mx-auto mb-3 rounded-lg border border-line bg-paper flex items-center justify-center overflow-hidden">
                      <img src={q.imageUrl} alt="إشارة" className="w-full h-full object-contain p-2" />
                    </div>
                  )}
                  <p className="font-semibold text-ink leading-relaxed mb-3">{q.text}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, i) => {
                      const isCorrect = i === q.correctAnswerIndex;
                      const isChosenWrong = i === chosen && chosen !== q.correctAnswerIndex;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 border ${
                            isCorrect
                              ? 'bg-brand-soft border-brand text-brand'
                              : isChosenWrong
                              ? 'bg-exam-soft border-exam text-exam'
                              : 'bg-paper border-line text-muted'
                          }`}
                        >
                          <span className="shrink-0">{isCorrect ? '✔' : isChosenWrong ? '✘' : ''}</span>
                          <span className="flex-1">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {chosen === undefined && <p className="text-xs text-muted mt-2">ما جاوبتي على هاد السؤال</p>}
                  {q.explanation && (
                    <p className="text-xs text-muted leading-relaxed mt-3 pt-3 border-t border-line">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
