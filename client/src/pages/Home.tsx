import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface CategoryDef {
  key: 'ser' | 'ish' | 'mek';
  title: string;
  meta: string;
  textClass: string;
  softClass: string;
  borderClass: string;
  hoverRing: string;
  path: string;
  icon: JSX.Element;
}

const categories: CategoryDef[] = [
  {
    key: 'ser',
    title: 'أسئلة قواعد السير',
    meta: '١٥٨ سؤال',
    textClass: 'text-brand',
    softClass: 'bg-brand-soft',
    borderClass: 'border-brand',
    hoverRing: 'group-hover:ring-brand/30',
    path: '/study/Ser',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
        <path d="M4 20 L10 4 H14 L20 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8 V12" stroke="currentColor" strokeLinecap="round" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    key: 'ish',
    title: 'أسئلة الإشارات',
    meta: '١٣١ سؤال',
    textClass: 'text-signs',
    softClass: 'bg-signs-soft',
    borderClass: 'border-signs',
    hoverRing: 'group-hover:ring-signs/30',
    path: '/study/Ishara',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
        <path d="M12 3 L21 19 H3 Z" stroke="currentColor" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'mek',
    title: 'أسئلة الميكانيك',
    meta: '٤٨ سؤال',
    textClass: 'text-mek',
    softClass: 'bg-mek-soft',
    borderClass: 'border-mek',
    hoverRing: 'group-hover:ring-mek/30',
    path: '/study/Mechanic',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
        <path
          d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4L15 12l-1-1z"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const finish = {
  title: 'الاختبار الرسمي',
  meta: '٦ نماذج — ٣٠ سؤال — ١٥ دقيقة',
  path: '/models',
};

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="px-5 pt-6 pb-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">أهلاً {firstName}</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'Admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="text-sm font-medium text-brand px-3 py-2 rounded-lg hover:bg-brand-soft transition-colors"
            >
              لوحة التحكم
            </button>
          )}
          <button
            onClick={logout}
            className="text-sm text-muted px-3 py-2 rounded-lg hover:bg-surface transition-colors"
          >
            خروج
          </button>
        </div>
      </header>

      <main className="px-5 pt-2 pb-14 max-w-md mx-auto">
        {/* الصدارة */}
        <section className="relative pt-4 pb-8 overflow-hidden">
          <div
            className="pointer-events-none absolute -top-16 -start-16 w-56 h-56 rounded-full bg-brand/25 blur-3xl"
            aria-hidden="true"
          />
          <h1 className="relative text-[1.7rem] leading-[1.35] font-extrabold text-ink max-w-[15ch]">
            طريقك نحو رخصتك يبدأ من هون
          </h1>
          <p className="relative mt-3 text-muted leading-relaxed max-w-[32ch]">
            تدرّب على بنك أسئلة كامل، وجرّب امتحاناً مطابقاً للفحص الرسمي قبل ما توصل فعلياً.
          </p>
        </section>

        {/* المسار */}
        <section className="relative">
          <div
            className="absolute top-2 bottom-2 w-px opacity-60"
            style={{
              insetInlineStart: '1.375rem',
              backgroundImage: 'repeating-linear-gradient(to bottom, #33363E 0 8px, transparent 8px 16px)',
            }}
            aria-hidden="true"
          />

          <div className="space-y-3">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => navigate(c.path)}
                className="relative w-full flex items-center gap-4 text-right group"
              >
                <span
                  className={`relative z-10 shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${c.softClass} ring-4 ring-paper`}
                >
                  <span className={c.textClass}>{c.icon}</span>
                </span>
                <span
                  className={`flex-1 bg-surface rounded-xl2 py-3.5 px-4 flex items-center justify-between transition-all group-active:scale-[0.98] ring-1 ring-transparent ${c.hoverRing}`}
                >
                  <span className="block">
                    <span className="block font-semibold text-ink">{c.title}</span>
                    <span className="block text-xs text-muted mt-0.5">{c.meta}</span>
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className={`w-4 h-4 shrink-0 ${c.textClass}`}>
                    <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            ))}
          </div>

          {/* الوجهة: الاختبار الرسمي */}
          <button onClick={() => navigate(finish.path)} className="relative w-full flex items-center gap-4 text-right mt-5 group">
            <span className="relative z-10 shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-exam ring-4 ring-paper">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-paper">
                <path d="M6 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M6 4h12l-3 3.2 3 3.2H6"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="flex-1 rounded-xl2 py-4 px-4 flex items-center justify-between bg-gradient-to-l from-exam/90 to-exam/60 transition-transform group-active:scale-[0.98]">
              <span className="block">
                <span className="block font-extrabold text-white text-[1.05rem]">{finish.title}</span>
                <span className="block text-xs text-white/80 mt-0.5">{finish.meta}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className="w-5 h-5 shrink-0 text-white">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </section>
      </main>

      {/* زر شو هو رخصتي */}
      <button
        onClick={() => setShowAbout(true)}
        aria-label="شو هو رخصتي؟"
        className="fixed bottom-5 start-5 z-20 w-14 h-14 rounded-full bg-brand text-paper shadow-lg shadow-brand/40 flex items-center justify-center animate-pulse"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.3" className="w-6 h-6">
          <path
            d="M9.5 9a2.5 2.5 0 1 1 3.6 2.24c-.77.38-1.1.9-1.1 1.76v.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="17" r="1.05" fill="currentColor" />
        </svg>
      </button>

      {showAbout && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setShowAbout(false)}
          />
          <div className="relative w-full max-w-md bg-surface rounded-t-[1.75rem] px-6 pt-3 pb-8 animate-[slideUp_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="w-10 h-1.5 rounded-full bg-white/15 mx-auto mb-5" />

            <div className="w-14 h-14 rounded-2xl bg-brand text-paper flex items-center justify-center text-2xl font-bold mb-4">
              ر
            </div>
            <h2 className="text-xl font-extrabold text-ink mb-2">شو هو رخصتي؟</h2>
            <p className="text-muted leading-relaxed mb-5">
              رخصتي بيحضّرك لامتحان رخصة القيادة النظري خطوة بخطوة: تدرّب سؤال سؤال بثلاث فئات (قواعد السير،
              الإشارات، الميكانيك)، وبعدين جرّب نفسك بامتحان محاكي للفحص الرسمي — بنفس عدد الأسئلة والوقت المحدد،
              مع مراجعة كاملة لأخطائك بالنهاية.
            </p>

            <div className="space-y-2.5 mb-6">
              {[
                ['تدرّب بحرية', 'جاوب بوقتك، وشوف الجواب الصح وتفسيره فوراً.'],
                ['امتحان حقيقي', '٣٠ سؤال، ١٥ دقيقة، متل يوم الفحص تماماً.'],
                ['مراجعة ذكية', 'بعد كل امتحان، بيوريك بالضبط وين غلطت وليش.'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-brand" />
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{title}</span>
                    <span className="text-muted"> — {desc}</span>
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAbout(false)}
              className="w-full py-3.5 rounded-xl font-bold text-paper bg-brand"
            >
              فهمت، يلا نبدأ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
