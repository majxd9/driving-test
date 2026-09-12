import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Question } from '../types';
import OptimizedImage from '../components/OptimizedImage';
import DiagramRenderer from '../components/DiagramRenderer';

const DURATION = 15 * 60;

export default function Exam() {
  const { modelId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(DURATION);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // حالة تكبير الصورة
  const [imageExpanded, setImageExpanded] = useState(false);

  const finishedRef = useRef(false);

  const loadExam = useCallback(async () => {
    const id = Number(modelId) || 1;

    setLoading(true);
    setLoadError(null);

    try {
      const picked = await api.getExamQuestions(id);

      if (picked.length !== 30) {
        throw new Error('تعذر تجهيز ٣٠ سؤالاً للاختبار.');
      }

      setQuestions(picked);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل الأسئلة.'
      );
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    void loadExam();
  }, [loadExam]);

  // تحميل السؤال الحالي + السؤالين التاليين مسبقاً
  useEffect(() => {
    questions.slice(current, current + 3).forEach((qq) => {
      if (qq.imageUrl) {
        const img = new Image();
        img.decoding = 'async';
        img.src = qq.imageUrl;
      }
    });
  }, [questions, current]);

  // إغلاق التكبير عند الانتقال لسؤال آخر
  useEffect(() => {
    setImageExpanded(false);
  }, [current]);

  // منع تمرير الصفحة خلف الصورة عند التكبير
  useEffect(() => {
    if (!imageExpanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [imageExpanded]);

  const finish = useCallback(() => {
    if (finishedRef.current || !questions.length) return;

    finishedRef.current = true;

    let correct = 0;

    const reviewQuestions = questions.map((question) => {
      const chosen = answers[question.id];

      if (chosen === question.correctAnswerIndex) {
        correct++;
      }

      return {
        question,
        chosen: chosen ?? null,
      };
    });

    const answered = Object.keys(answers).length;

    const wrongQuestionIds = reviewQuestions
      .filter(
        (item) =>
          item.chosen !== null &&
          item.chosen !== item.question.correctAnswerIndex
      )
      .map((item) => item.question.id);

    api.submitExamAttempt({
      modelId: Number(modelId) || 1,
      total: questions.length,
      correct,
      answered,
      wrongQuestionIds,
    }).catch(() => {});

    navigate('/result', {
      state: {
        correct,
        total: questions.length,
        answered,
        reviewQuestions,
        modelId: Number(modelId) || 1,
      },
    });
  }, [answers, questions, navigate, modelId]);

  useEffect(() => {
    if (loading) return;

    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          finish();
          return 0;
        }

        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, finish]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="question-card w-full max-w-lg">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-6 rounded-lg mt-5" />
          <div className="skeleton h-12 rounded-xl mt-4" />
          <div className="skeleton h-12 rounded-xl mt-2" />
        </div>
      </div>
    );
  }

  if (loadError || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="question-card w-full max-w-md text-center">
          <h1 className="text-xl font-black mb-2">
            تعذر تحضير الاختبار
          </h1>

          <p className="text-muted text-sm leading-relaxed">
            {loadError ?? 'لم يتم العثور على أسئلة.'}
          </p>

          <button
            onClick={loadExam}
            className="primary-cta mt-5 w-full"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  const mm = String(
    Math.floor(seconds / 60)
  ).padStart(2, '0');

  const ss = String(seconds % 60).padStart(2, '0');

  const timerUrgent = seconds <= 60;

  return (
    <div className="min-h-screen">
      {/* الشريط العلوي */}
      <div className="exam-topbar">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] sm:text-xs opacity-70">
              السؤال {current + 1} من {questions.length}
            </p>

            <p className="text-xs sm:text-sm font-semibold">
              نموذج {modelId}
            </p>
          </div>

          <div
            className={`timer-chip ${
              timerUrgent ? 'urgent' : ''
            }`}
          >
            {mm}:{ss}
          </div>
        </div>

        <div className="progress">
          <span
            style={{
              width: `${
                ((current + 1) / questions.length) * 100
              }%`,
            }}
          />
        </div>

        <div className="flex flex-wrap gap-1 px-3 sm:px-4 py-2.5 max-w-2xl mx-auto">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              aria-label={`السؤال ${i + 1}`}
              className={`
                w-6 h-6 sm:w-7 sm:h-7
                rounded-full
                text-[9px] sm:text-[10px]
                font-bold
                flex items-center justify-center
                border
                ${
                  i === current
                    ? 'border-brand text-brand'
                    : answers[qq.id] !== undefined
                      ? 'bg-brand border-brand text-white'
                      : 'border-white/20 text-white/50'
                }
              `}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* محتوى السؤال */}
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-3 sm:py-5 pb-28">
        <div className="question-card exam-question-card">

          {/* الصورة */}
          {q.imageUrl && (
            <div className="mb-3">
              <div
                className="
                  relative
                  w-full
                  rounded-xl
                  overflow-hidden
                  bg-black/5
                  border border-line
                  h-[190px]
                  sm:h-[270px]
                  md:h-[320px]
                "
              >
                <OptimizedImage
                  src={q.imageUrl}
                  alt={`صورة توضيحية للسؤال ${q.id}`}
                  priority={current === 0}
                  sizes="(max-width: 640px) 94vw, 420px"
                  className="
                    w-full
                    h-full
                    object-contain
                    p-1
                  "
                />

                {/* زر تكبير */}
                <button
                  type="button"
                  onClick={() => setImageExpanded(true)}
                  className="
                    absolute
                    bottom-2
                    left-2
                    w-9
                    h-9
                    rounded-full
                    bg-black/65
                    text-white
                    flex
                    items-center
                    justify-center
                    text-lg
                    shadow-lg
                    backdrop-blur-sm
                    border border-white/20
                  "
                  aria-label="تكبير الصورة"
                  title="تكبير الصورة"
                >
                  +
                </button>
              </div>

              <p className="text-center text-[10px] text-muted mt-1">
                اضغط + لتكبير الصورة
              </p>
            </div>
          )}

          <p className="question-number">
            سؤال {current + 1}
          </p>

          <h1 className="
            exam-question-title
            text-[16px]
            sm:text-lg
            leading-7
            sm:leading-8
          ">
            {q.text}
          </h1>

          {/* الإجابات */}
          <div className="exam-answer-list space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() =>
                  setAnswers((a) => ({
                    ...a,
                    [q.id]: i,
                  }))
                }
                className={`
                  answer-option
                  min-h-[46px]
                  sm:min-h-[50px]
                  py-2.5
                  sm:py-3
                  px-3
                  text-sm
                  sm:text-base
                  ${
                    answers[q.id] === i
                      ? 'selected'
                      : ''
                  }
                `}
              >
                <span className="answer-letter shrink-0">
                  {['أ', 'ب', 'ج', 'د', 'هـ', 'و'][i]}
                </span>

                <span className="flex-1 leading-snug text-right">
                  {opt}
                </span>
              </button>
            ))}
          </div>

          <DiagramRenderer question={q} />

          {/* أزرار التنقل */}
          <div
            className="
              exam-nav-actions
              sticky
              bottom-2
              z-20
              flex
              gap-2
              mt-4
              p-1
              rounded-2xl
              bg-paper/95
              backdrop-blur-md
              border
              border-line
              shadow-lg
            "
          >
            <button
              onClick={() =>
                setCurrent((c) => Math.max(c - 1, 0))
              }
              disabled={current === 0}
              className="
                flex-1
                py-2.5
                sm:py-3
                rounded-xl
                text-sm
                sm:text-base
                font-semibold
                text-muted
                bg-paper
                border
                border-line
                disabled:opacity-40
              "
            >
              → السابق
            </button>

            <button
              onClick={() =>
                setCurrent((c) =>
                  Math.min(c + 1, questions.length - 1)
                )
              }
              disabled={
                current === questions.length - 1
              }
              className="
                flex-1
                py-2.5
                sm:py-3
                rounded-xl
                text-sm
                sm:text-base
                font-bold
                text-white
                bg-signs
                disabled:opacity-40
              "
            >
              التالي ←
            </button>
          </div>
        </div>

        {/* إنهاء الاختبار */}
        <button
          onClick={finish}
          className="
            w-full
            mt-3
            py-3
            sm:py-3.5
            rounded-xl
            text-sm
            sm:text-base
            font-bold
            text-white
            bg-exam
          "
        >
          إنهاء الاختبار وعرض النتيجة
        </button>
      </div>

      {/* نافذة تكبير الصورة */}
      {imageExpanded && q.imageUrl && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            bg-black/85
            backdrop-blur-sm
            flex
            items-center
            justify-center
            p-3
          "
          onClick={() => setImageExpanded(false)}
        >
          <div
            className="
              relative
              w-full
              h-full
              flex
              items-center
              justify-center
            "
            onClick={(e) => e.stopPropagation()}
          >
            <OptimizedImage
              src={q.imageUrl}
              alt={`الصورة المكبرة للسؤال ${q.id}`}
              sizes="100vw"
              className="
                max-w-full
                max-h-full
                object-contain
                rounded-xl
              "
            />

            <button
              type="button"
              onClick={() => setImageExpanded(false)}
              className="
                absolute
                top-2
                right-2
                w-10
                h-10
                rounded-full
                bg-black/70
                text-white
                text-xl
                flex
                items-center
                justify-center
                border
                border-white/20
              "
              aria-label="إغلاق الصورة"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}