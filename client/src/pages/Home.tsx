import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { QuestionCategory } from '../types';
import SiteGuide from '../components/SiteGuide';

const categories:{key:QuestionCategory;title:string;path:string;icon:string}[]=[{key:'Ser',title:'قواعد السير',path:'/study/Ser',icon:'↗'},{key:'Ishara',title:'الإشارات المرورية',path:'/study/Ishara',icon:'△'},{key:'Mechanic',title:'الميكانيك',path:'/study/Mechanic',icon:'⚙'}];
export default function Home(){
 const {user,logout}=useAuth();const navigate=useNavigate();const [total,setTotal]=useState<number|null>(null);
 useEffect(()=>{let active=true;fetch(`${import.meta.env.VITE_API_URL||''}/api/questions/count`,{credentials:'include'}).then(r=>r.ok?r.json():Promise.reject()).then(n=>{if(active)setTotal(Number(n));}).catch(()=>{});return()=>{active=false;};},[]);
 const firstName=user?.fullName?.split(' ')[0]??'';
 return <div className="min-h-screen home-page"><header className="site-header"><div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="brand-mark">ر</div><div><b className="text-ink">رخصتي</b><p className="text-[11px] text-muted">تدريب القيادة الذكي</p></div></div><div className="flex items-center gap-2">{user?.role==='Admin'&&<button onClick={()=>navigate('/admin')} className="top-link">لوحة التحكم</button>}<button onClick={logout} className="top-link">خروج</button></div></div></header>
 <main className="max-w-6xl mx-auto px-5 pb-12"><section className="home-hero"><div><p className="eyebrow">مرحباً {firstName}</p><h1>درّب حالك، افهم الخطأ، وخد الرخصة بثقة.</h1><p>كل أقسام التدريب والاختبارات الرسمية في مكان واحد، بدون تحميل بنك الأسئلة ثلاث مرات عند فتح الصفحة.</p><div className="flex flex-wrap gap-3 mt-6"><button onClick={()=>navigate('/study/Ser')} className="primary-cta">ابدأ التدريب <span>←</span></button><SiteGuide/></div></div><div className="home-score"><span>بنك الأسئلة</span><strong>{total??'—'}</strong><small>إجمالي الأسئلة</small></div></section>
 <section className="mt-8"><div className="section-heading"><div><p className="eyebrow">التدريب</p><h2>اختر القسم</h2></div><span className="section-hint">العدد الإجمالي محفوظ مؤقتاً لتسريع الدخول</span></div><div className="grid md:grid-cols-3 gap-4 mt-4">{categories.map(c=><button key={c.key} onClick={()=>navigate(c.path)} className={`category-card ${c.key==='Ser'?'brand':c.key==='Ishara'?'signs':'mek'}`}><div className="category-icon">{c.icon}</div><div className="flex-1 text-right"><h3>{c.title}</h3><p>ابدأ التدريب</p></div><span className="arrow">←</span></button>)}</div></section>
 <section className="home-exam mt-5" onClick={()=>navigate('/models')} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&navigate('/models')}><div><p className="eyebrow text-white/70">المحاكاة النهائية</p><h2>اختبار الرخصة</h2><p>٣٠ سؤال • ١٥ دقيقة • النجاح من ٢٥ إجابة صحيحة</p></div><div className="exam-action">اختيار نموذج ←</div></section></main></div>;
}
