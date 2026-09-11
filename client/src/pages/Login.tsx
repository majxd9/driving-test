import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SAMPLE_QUESTIONS = [
  {
    text: 'ما معنى هذه الإشارة؟',
    imageUrl: '/signs/sign_03.png',
    options: ['منحدر خطر', 'طريق ضيق من جهتين', 'طريق زلقة', 'منعطف مزدوج الأول يساري'],
    correct: 3,
    explanation: 'هذه الإشارة تحذر من منعطفين متتاليين، الأول باتجاه اليسار.'
  },
  {
    text: 'البقعة العمياء بالنسبة لسائق المركبة هي:',
    options: ['منطقة كثيفة الضباب', 'منطقة ضمن نطاق المرايا', 'منطقة غير مضاءة ليلاً', 'منطقة خارج نطاق المرايا'],
    correct: 3,
    explanation: 'هي المنطقة التي لا تغطيها أي من المرايا، لذلك يجب التأكد منها مباشرة قبل تغيير المسرب.'
  },
  {
    text: 'عند تقاطع خالٍ من الإشارات ومن شرطي المرور تكون الأفضلية للسائق الذي:',
    options: ['يكون يساره مفتوحاً', 'يكون يمينه مفتوحاً', 'يصل أولاً', 'يكون يمينه مغلقاً'],
    correct: 1,
    explanation: 'القاعدة الافتراضية هنا هي إعطاء الأفضلية للمركبة القادمة من جهة اليمين.'
  },
  {
    text: 'في حال انزلقت مركبتك، ما ردة الفعل الأولى الأكثر أماناً؟',
    options: ['الفرملة بقوة وتوجيه المقود عكس الانزلاق', 'عدم الضغط على الفرامل وتوجيه المقود مع اتجاه انزلاق المؤخرة', 'الفرملة بقوة وتوجيه المقود مع الانزلاق', 'إطفاء المحرك فوراً'],
    correct: 1,
    explanation: 'الفرملة المفاجئة قد تزيد فقدان السيطرة؛ التوجيه مع اتجاه انزلاق المؤخرة يساعد على استعادة الاتزان.'
  },
  {
    text: 'إن الهدف من مسند الرأس خلف رأس الراكب هو:',
    options: ['إراحة الرأس فقط', 'استخدامه كوسادة', 'تحسين شكل المقعد', 'تقليل إصابة الرقبة عند صدمة من الخلف'],
    correct: 3,
    explanation: 'مسند الرأس يحد من ارتداد الرأس للخلف عند الصدمة ويقلل خطر إصابة الرقبة.'
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [sampleAnswers, setSampleAnswers] = useState<Record<number, number>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(userName, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  }

  const sample = SAMPLE_QUESTIONS[sampleIndex];
  const chosen = sampleAnswers[sampleIndex];
  const answeredCount = Object.keys(sampleAnswers).length;
  const sampleScore = SAMPLE_QUESTIONS.reduce((n, q, i) => n + (sampleAnswers[i] === q.correct ? 1 : 0), 0);

  function answerSample(index: number) {
    setSampleAnswers((prev) => ({ ...prev, [sampleIndex]: index }));
  }

  function closeSample() {
    setShowSample(false);
    setSampleIndex(0);
    setSampleAnswers({});
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center text-3xl font-bold mb-4 shadow-lg">
            ر
          </div>
          <h1 className="text-xl font-bold text-ink">رخصتي</h1>
          <p className="text-sm text-muted mt-1">اختبار النظري لرخصة قيادة السيارات</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-xl2 border border-line p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-ink text-center mb-2">تسجيل الدخول</h2>

          <div>
            <label className="block text-sm text-muted mb-1.5">اسم المستخدم</label>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} required autoFocus
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:border-brand transition-colors"
              placeholder="مثال: ahmad2026" />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">كلمة المرور</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:border-brand transition-colors" />
          </div>

          {error && <div className="rounded-xl bg-exam-soft text-exam text-sm px-4 py-3">{error}</div>}

          <button type="submit" disabled={busy}
            className="w-full rounded-xl bg-brand text-white font-semibold py-3.5 transition-opacity disabled:opacity-60 active:opacity-90">
            {busy ? '...جارِ الدخول' : 'دخول'}
          </button>

          <button type="button" onClick={() => setShowSample(true)}
            className="w-full rounded-xl border border-brand/40 bg-brand-soft text-brand font-bold py-3 transition-transform active:scale-[0.98]">
            ✦ جرّب عيّنة من الاختبار — ٥ أسئلة
          </button>
          <p className="text-[11px] text-muted text-center">تجربة مجانية بدون تسجيل دخول</p>
        </form>
      </div>

      {showSample && (
        <div className="modal-backdrop" onClick={closeSample}>
          <div className="guide-modal w-full max-w-lg" onClick={(e) => e.stopPropagation()} dir="rtl">
            <button className="modal-close" onClick={closeSample} aria-label="إغلاق">×</button>

            <div className="flex items-center justify-between gap-3 mb-5 pl-10">
              <div>
                <p className="eyebrow">تجربة سريعة</p>
                <h2 className="text-xl font-black text-ink mt-1">اختبر مستواك بـ ٥ أسئلة</h2>
              </div>
              <div className="rounded-xl bg-brand-soft text-brand px-3 py-2 text-xs font-bold whitespace-nowrap">
                {sampleScore}/{answeredCount || 0}
              </div>
            </div>

            <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
              <div className="h-full bg-brand transition-all" style={{ width: `${((sampleIndex + 1) / SAMPLE_QUESTIONS.length) * 100}%` }} />
            </div>

            {sample.imageUrl && (
              <div className="w-full max-w-[210px] aspect-square mx-auto mb-4 rounded-2xl border border-line bg-paper flex items-center justify-center overflow-hidden">
                <img src={sample.imageUrl} alt="إشارة مرور" className="w-full h-full object-contain p-4" />
              </div>
            )}

            <p className="text-xs text-brand font-bold mb-2">السؤال {sampleIndex + 1} من {SAMPLE_QUESTIONS.length}</p>
            <h3 className="text-base font-black text-ink leading-relaxed mb-4">{sample.text}</h3>

            <div className="space-y-2">
              {sample.options.map((option, i) => {
                const isChosen = chosen === i;
                const revealed = chosen !== undefined;
                const isCorrect = i === sample.correct;
                return (
                  <button key={i} type="button" onClick={() => answerSample(i)}
                    className={`w-full text-right rounded-xl border px-3 py-3 flex items-center gap-2 transition-colors ${
                      revealed && isCorrect ? 'bg-brand-soft border-brand' :
                      revealed && isChosen ? 'bg-exam-soft border-exam' :
                      isChosen ? 'bg-brand-soft border-brand' : 'bg-paper border-line hover:border-brand'
                    }`}>
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-white/10 grid place-items-center text-xs font-bold">{['أ','ب','ج','د'][i]}</span>
                    <span className="text-sm text-ink leading-snug">{option}</span>
                  </button>
                );
              })}
            </div>

            {chosen !== undefined && (
              <div className={`mt-4 rounded-xl p-3 text-sm leading-relaxed ${chosen === sample.correct ? 'bg-brand-soft text-brand' : 'bg-exam-soft text-exam'}`}>
                <b>{chosen === sample.correct ? 'إجابة صحيحة ✓' : `الإجابة الصحيحة: ${['أ','ب','ج','د'][sample.correct]}`}</b>
                <p className="mt-1 text-ink">{sample.explanation}</p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button type="button" disabled={sampleIndex === 0} onClick={() => setSampleIndex((i) => i - 1)}
                className="flex-1 py-3 rounded-xl font-semibold text-muted bg-paper border border-line disabled:opacity-40">
                السابق
              </button>
              {sampleIndex < SAMPLE_QUESTIONS.length - 1 ? (
                <button type="button" onClick={() => setSampleIndex((i) => i + 1)}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-brand">
                  التالي
                </button>
              ) : (
                <button type="button" onClick={closeSample}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-exam">
                  انتهت العينة
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
