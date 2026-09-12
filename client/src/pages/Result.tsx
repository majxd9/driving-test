import { useLocation, useNavigate } from 'react-router-dom';
import OptimizedImage from '../components/OptimizedImage';

type ReviewItem = {
  question: {
    id: number;
    text: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
    imageUrl?: string;
  };
  chosen: number | null;
};

const PASS_SCORE = 25;

export default function Result() {
  const { state } = useLocation() as {
    state: { correct: number; total: number; answered: number; reviewQuestions: ReviewItem[]; modelId: number } | null;
  };
  const navigate = useNavigate();

  if (!state) {
    navigate('/');
    return null;
  }

  const { correct, total, answered, reviewQuestions = [], modelId } = state;
  const wrong = reviewQuestions.filter((x) => x.chosen !== null && x.chosen !== x.question.correctAnswerIndex);
  const correctItems = reviewQuestions.filter((x) => x.chosen === x.question.correctAnswerIndex);
  const unansweredItems = reviewQuestions.filter((x) => x.chosen === null);
  const passed = correct >= PASS_SCORE;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="w-full max-w-3xl mx-auto">
        <section className="result-hero">
          <div className={`result-ring ${passed ? 'pass' : 'fail'}`}><span>{correct}</span><small>من {total}</small></div>
          <div><p className="eyebrow">نتيجة النموذج {modelId}</p><h1 className={`text-3xl font-black mt-2 ${passed ? 'text-brand' : 'text-exam'}`}>{passed ? 'مبروك، نجحت 🎉' : 'بحاجة إلى تدريب إضافي'}</h1><p className="text-muted text-sm mt-2 leading-relaxed">الصحيح {correct} • الخطأ {wrong.length} • بدون إجابة {unansweredItems.length}</p></div>
          <div className="result-stat-grid"><div><b>{correct}</b><span>صحيح</span></div><div><b>{wrong.length}</b><span>خطأ</span></div><div><b>{unansweredItems.length}</b><span>لم يُجب</span></div></div>
        </section>

        {wrong.length > 0 && <section className="result-section"><div className="section-heading"><div><p className="eyebrow">راجع أخطاءك</p><h2>الأسئلة التي لخبطت فيها</h2></div><span className="section-hint">تعلم الخطأ الآن أفضل من تكراره في الامتحان</span></div><div className="mt-4 space-y-4">{wrong.map((item, index) => <ReviewCard key={item.question.id} item={item} index={index + 1} mode="wrong" />)}</div></section>}

        {correctItems.length > 0 && <section className="result-section"><div className="section-heading"><div><p className="eyebrow">ممتاز</p><h2>الأسئلة التي أجبت عنها بشكل صحيح</h2></div><span className="section-hint">{correctItems.length} إجابة صحيحة</span></div><div className="mt-4 space-y-4">{correctItems.map((item, index) => <ReviewCard key={item.question.id} item={item} index={index + 1} mode="correct" />)}</div></section>}

        {unansweredItems.length > 0 && <section className="result-section"><div className="section-heading"><div><p className="eyebrow">تنبيه</p><h2>أسئلة لم تتم الإجابة عنها</h2></div></div><div className="mt-4 space-y-4">{unansweredItems.map((item, index) => <ReviewCard key={item.question.id} item={item} index={index + 1} mode="unanswered" />)}</div></section>}

        <div className="result-actions"><button onClick={() => navigate('/models')} className="primary-cta flex-1">اختبر نموذجاً آخر ←</button><button onClick={() => navigate('/')} className="secondary-cta flex-1 py-3.5">الصفحة الرئيسية</button></div>
        <p className="text-center text-xs text-muted mt-4">أجبت عن {answered} من أصل {total} سؤالاً.</p>
      </div>
    </div>
  );
}

function ReviewCard({ item, index, mode }: { item: ReviewItem; index: number; mode: 'wrong' | 'correct' | 'unanswered' }) {
  const correctText = item.question.options[item.question.correctAnswerIndex];
  const chosenText = item.chosen === null ? 'لم يتم اختيار إجابة' : item.question.options[item.chosen];
  return <article className={`review-card ${mode}`}>
    <div className="review-head"><span className="review-badge">#{index}</span><span className="review-status">{mode === 'wrong' ? 'إجابة خاطئة' : mode === 'correct' ? 'إجابة صحيحة ✓' : 'بدون إجابة'}</span></div>
    {item.question.imageUrl && <div className="review-image"><OptimizedImage src={item.question.imageUrl} alt={`صورة السؤال ${item.question.id}`} sizes="160px" /></div>}
    <h3>{item.question.text}</h3>
    <div className="review-answer"><span>إجابتك</span><b>{chosenText}</b></div>
    {mode !== 'correct' && <div className="review-answer correct"><span>الإجابة الصحيحة</span><b>{correctText}</b></div>}
    {item.question.explanation && <p className="review-explanation">💡 {item.question.explanation}</p>}
  </article>;
}
