import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SiteGuide from '../components/SiteGuide';

const categories = [
  { key:'ser', title:'قواعد السير', meta:'158 سؤال', color:'brand', path:'/study/Ser', icon:'↗' },
  { key:'ish', title:'الإشارات المرورية', meta:'141 سؤال', color:'signs', path:'/study/Ishara', icon:'△' },
  { key:'mek', title:'الميكانيك', meta:'48 سؤال', color:'mek', path:'/study/Mechanic', icon:'⚙' },
];

export default function Home() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const firstName = user?.fullName?.split(' ')[0] ?? '';
  return <div className="min-h-screen overflow-hidden">
    <header className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
      <div className="flex items-center gap-3"><div className="brand-mark">ر</div><div><b className="text-ink">رخصتي</b><p className="text-[11px] text-muted">تدريب القيادة الذكي</p></div></div>
      <div className="flex items-center gap-2">{user?.role==='Admin' && <button onClick={()=>navigate('/admin')} className="top-link">لوحة التحكم</button>}<button onClick={logout} className="top-link">خروج</button></div>
    </header>
    <main className="max-w-6xl mx-auto px-5 pb-16">
      <section className="hero-panel">
        <div className="hero-glow" />
        <div className="relative max-w-2xl">
          <span className="eyebrow">مرحباً {firstName}</span>
          <h1 className="hero-title">طريقك نحو الرخصة يبدأ من هون.</h1>
          <p className="hero-copy">تدرّب على بنك الأسئلة، افهم أخطاءك، ثم ادخل الاختبار وأنت جاهز.</p>
          <div className="flex flex-wrap gap-3 mt-7"><button onClick={()=>navigate('/study/Ser')} className="primary-cta">ابدأ التدريب <span>←</span></button><SiteGuide /></div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-core">ر</div><span>✓</span><span>?</span><span>↗</span></div>
      </section>

      <section className="mt-8"><div className="section-heading"><div><p className="eyebrow">التدريب</p><h2>اختر مسارك</h2></div><span className="section-hint">347 سؤالاً</span></div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {categories.map(c=><button key={c.key} onClick={()=>navigate(c.path)} className={`category-card ${c.color}`}>
            <div className="category-icon">{c.icon}</div><div className="flex-1 text-right"><h3>{c.title}</h3><p>{c.meta}</p></div><span className="arrow">←</span>
          </button>)}
        </div>
      </section>

      <section className="exam-banner mt-5" onClick={()=>navigate('/models')} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&navigate('/models')}>
        <div><span className="eyebrow text-white/70">المحاكاة النهائية</span><h2>الاختبار الرسمي</h2><p>30 سؤالاً • 15 دقيقة • النجاح من 25</p></div><div className="exam-action">ابدأ الآن ←</div>
      </section>
    </main>
  </div>;
}
