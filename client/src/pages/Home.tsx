import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QuestionCategory } from '../types';
import SiteGuide from '../components/SiteGuide';
import SpiritDriveScene from '../components/SpiritDriveScene';
import SpiritNitro from '../components/SpiritNitro';

const Icon = ({type}:{type:'rules'|'signs'|'mechanic'|'arrow'}) => {
 const common={width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 if(type==='rules') return <svg {...common}><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h5M8 17h7"/></svg>;
 if(type==='signs') return <svg {...common}><path d="M12 3 21 20H3L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>;
 if(type==='mechanic') return <svg {...common}><path d="M14.7 6.3a4.5 4.5 0 0 0-5.9 5.9L4 17l3 3 4.8-4.8a4.5 4.5 0 0 0 5.9-5.9l-2.4 2.4-2.8-.6-.6-2.8 2.8-2.4Z"/></svg>;
 return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
};

const preloadStudy = () => { void import('./Study'); };
const preloadModels = () => { void import('./Models'); };
const preloadPractical = () => { void import('./PracticalInfo'); };

const categories:{key:QuestionCategory;title:string;subtitle:string;path:string;icon:'rules'|'signs'|'mechanic'}[]=[
  {key:'Ser',title:'قواعد السير',subtitle:'الأولوية، السرعة، التقاطعات وقواعد القيادة',path:'/study/Ser',icon:'rules'},
  {key:'Ishara',title:'الإشارات المرورية',subtitle:'تعرف على الإشارات ومعانيها قبل الاختبار',path:'/study/Ishara',icon:'signs'},
  {key:'Mechanic',title:'أساسيات الميكانيك',subtitle:'المحرك، الفرامل، الكهرباء وأهم المكونات',path:'/study/Mechanic',icon:'mechanic'},
];

export default function Home(){
 const {user,logout}=useAuth();const navigate=useNavigate();const [total,setTotal]=useState<number|null>(user?.questionCount ?? null);

 useEffect(()=>{
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
 },[]);

 useEffect(()=>{
  const initialCount = user?.questionCount;
  setTotal(typeof initialCount === 'number' && initialCount > 0 ? initialCount : null);
  let active=true;
  fetch((import.meta.env.VITE_API_URL||'')+'/api/questions/count',{credentials:'include'})
   .then(r=>r.ok?r.json():Promise.reject())
   .then(n=>{if(active)setTotal(Number(n));})
   .catch(()=>{});
  return()=>{active=false;};
 },[user?.questionCount]);

 const firstName=user?.fullName?.split(' ')[0]??'';
 return <div className="min-h-screen home-page" dir="rtl">
  <header className="site-header"><div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
   <div className="flex items-center gap-3"><div className="brand-mark">ر</div><div><b className="text-ink">رخصتي</b><p className="text-[11px] text-muted m-0">منصة تدريب لاختبار القيادة</p></div></div>
   <div className="flex items-center gap-2">{user?.role==='Admin'&&<button onClick={()=>navigate('/admin')} className="top-link">لوحة التحكم</button>}<button onClick={logout} className="top-link">تسجيل الخروج</button></div>
  </div></header>
  <main className="max-w-6xl mx-auto px-5 pb-12">
   <section className="home-hero">
    <SpiritDriveScene large variant="front" className="home-spirit-scene" />
    <div className="home-hero-copy"><div className="home-greeting"><span className="student-name-plate" aria-label="اسم الطالب"><span className="student-name-kicker">هويّتك على الطريق</span><span className="student-name-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3.8 15 6l3.7.8.8 3.7L21 13.5l-1.5 3.1-3.7.8L13 19.6 12 21l-1-1.4-2.8-2.2-3.7-.8L3 13.5l1.5-3-0.8-3.7L7.4 6 10 3.8 12 3z"></path><circle cx="12" cy="11.2" r="2.7"></circle><path d="M7.9 17.3c.9-2 2.3-3 4.1-3s3.2 1 4.1 3"></path></svg></span><span className="student-name-copy"><small>سائق</small><strong>{firstName || 'طالبنا'}</strong></span><span className="student-name-road" aria-hidden="true"><i></i><i></i><i></i></span><span className="student-name-glow" aria-hidden="true"></span></span></div><h1>تدرّب جيداً، راجع أخطاءك، وادخل الاختبار بثقة.</h1><p>اختر القسم الذي تريد مراجعته أو انتقل مباشرة إلى محاكاة اختبار الرخصة. الأسئلة والصور والنتائج مرتبة لتكون المراجعة أسرع وأوضح.</p><div className="flex flex-wrap gap-3 mt-6"><button onClick={()=>navigate('/study/Ser')} className="primary-cta">ابدأ التدريب <Icon type="arrow"/></button><SiteGuide/></div></div>
    <div className="home-score">
      <div className="home-score-copy"><span>إجمالي بنك الأسئلة</span><small>سؤال متاح للتدريب</small></div>
      <div className="home-score-main"><strong>{total??'—'}</strong><SpiritNitro /></div>
    </div>
   </section>
   <section className="mt-10"><div className="section-heading"><div><p className="eyebrow">مركز التدريب</p><h2>اختر ما تريد مراجعته</h2></div><span className="section-hint">ابدأ من أي قسم، ويمكنك العودة وتغيير القسم لاحقاً.</span></div>
    <div className="grid md:grid-cols-3 gap-4 mt-4">{categories.map(c=><button key={c.key} onPointerEnter={preloadStudy} onFocus={preloadStudy} onClick={()=>navigate(c.path)} className={`category-card ${c.key==='Ser'?'brand':c.key==='Ishara'?'signs':'mek'}`}><div className="category-icon"><Icon type={c.icon}/></div><div className="flex-1 text-right"><h3>{c.title}</h3><p>{c.subtitle}</p></div><span className="arrow"><Icon type="arrow"/></span></button>)}</div>
   </section>
   <button type="button" className="home-practical-card" onPointerEnter={preloadPractical} onFocus={preloadPractical} onClick={()=>navigate('/practical-info')}>
    <span className="home-practical-icon" aria-hidden="true">
     <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 11h9c4 0 7 3 7 7v5H8z"/><path d="M11 11V8h6"/><path d="M25 11h4M25 16h6M25 21h4"/>
      <path d="M10 24v3h12v-3"/>
     </svg>
    </span>
    <span className="home-practical-copy">
     <small>تعلم يتجاوز الأسئلة</small>
     <strong>معلومات عملية إضافية</strong>
     <em>أضواء السيارة والغمازات مع محاكاة المقبض وحالات القيادة الواقعية.</em>
    </span>
    <span className="home-practical-cta">افتح المركز <Icon type="arrow"/></span>
   </button>
   <section className="home-exam mt-5" onPointerEnter={preloadModels} onFocus={preloadModels} onClick={()=>navigate('/models')} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&navigate('/models')}>
    <div><p className="eyebrow text-white/60">محاكاة اختبار الرخصة</p><h2>اختبر مستواك الآن</h2><p>٣٠ سؤالاً · ١٥ دقيقة · النجاح من ٢٥ إجابة صحيحة</p></div><div className="exam-action">اختيار النموذج <Icon type="arrow"/></div>
   </section>
  </main>
 </div>;
}
