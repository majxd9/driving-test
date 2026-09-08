import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface CategoryDef {
  key: 'ser' | 'ish' | 'mek' | 'exam';
  title: string;
  meta: string;
  textClass: string;
  softClass: string;
  borderClass: string;
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
  {
    key: 'exam',
    title: 'الاختبار الرسمي',
    meta: '٦ نماذج — ٣٠ سؤال — ١٥ دقيقة',
    textClass: 'text-exam',
    softClass: 'bg-exam-soft',
    borderClass: 'border-exam',
    path: '/models',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" />
        <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="px-5 pt-8 pb-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">أهلاً بك</p>
          <h1 className="text-lg font-bold text-ink">{user?.fullName}</h1>
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

      <main className="px-5 pt-6 pb-10 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center text-2xl font-bold mb-3">
            ر
          </div>
          <h2 className="text-base font-bold text-ink">اختبار النظري لرخصة قيادة السيارات</h2>
        </div>

        <div className="space-y-3">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => navigate(c.path)}
              className={`w-full bg-surface rounded-xl2 p-4 flex items-center gap-4 text-right border-s-4 ${c.borderClass} transition-transform active:scale-[0.98]`}
            >
              <span
                className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${c.softClass}`}
              >
                <span className={c.textClass}>{c.icon}</span>
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-ink">{c.title}</span>
                <span className="block text-sm text-muted mt-0.5">{c.meta}</span>
              </span>
              <span className={`shrink-0 ${c.textClass}`}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-5 h-5">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
