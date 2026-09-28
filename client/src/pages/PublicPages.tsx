import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SITE_URL = 'https://driving-test-7en.pages.dev';

function Seo({title,description,path}:{title:string;description:string;path:string}) {
  useEffect(() => {
    document.title = title;
    const url = `${SITE_URL}${path}`;
    const set = (selector:string, attr:string, value:string, create:string) => {
      let el = document.head.querySelector<HTMLElement>(selector);
      if (!el) { el = document.createElement(create); document.head.appendChild(el); }
      el.setAttribute(attr, value);
    };
    set('meta[name="description"]','name','description','meta');
    (document.head.querySelector('meta[name="description"]') as HTMLMetaElement).content = description;
    set('meta[name="robots"]','name','robots','meta');
    (document.head.querySelector('meta[name="robots"]') as HTMLMetaElement).content = 'index, follow, max-image-preview:large';
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel='canonical'; document.head.appendChild(canonical); }
    canonical.href=url;
  },[title,description,path]);
  return null;
}

function Layout({children}:{children:React.ReactNode}) {
  return <div dir="rtl" className="min-h-screen bg-paper text-ink">
    <header className="border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="رخصتي">
          <span className="brand-mark">ر</span><span><strong className="block font-black">رخصتي</strong><small className="text-xs text-muted">منصة تدريب لاختبار القيادة</small></span>
        </Link>
        <nav aria-label="التنقل الرئيسي" className="flex flex-wrap items-center gap-3 text-sm">
          <Link to="/rules">قواعد السير</Link><Link to="/traffic-signs">الإشارات</Link><Link to="/driving-test-syria">اختبار القيادة</Link><Link to="/about">عن رخصتي</Link><Link to="/login" className="primary-cta !px-4 !py-2">تسجيل الدخول</Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className="mt-16 border-t border-line"><div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted md:px-6">© رخصتي — منصة تدريب عربية لاختبار رخصة القيادة.</div></footer>
  </div>;
}

export function LandingPage() {
 return <Layout><Seo title="رخصتي — اختبار رخصة القيادة في سوريا" description="رخصتي منصة تدريب عربية للاستعداد لاختبار رخصة القيادة في سوريا من خلال قواعد السير والإشارات المرورية والميكانيك ونماذج المحاكاة." path="/" />
 <main><section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.15fr_.85fr] md:px-6 md:py-20"><div className="self-center">
  <p className="eyebrow">استعد قبل يوم الامتحان</p><h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">اختبار رخصة القيادة في سوريا، بطريقة تدريب واضحة.</h1>
  <p className="mt-5 text-base leading-8 text-muted md:text-lg">تدرّب على قواعد السير والإشارات المرورية وأساسيات الميكانيك، ثم جرّب نماذج محاكاة وراجع أخطاءك.</p>
  <div className="mt-7 flex flex-wrap gap-3"><Link to="/login" className="primary-cta">ابدأ التدريب</Link><Link to="/driving-test-syria" className="secondary-cta px-5 py-3.5">كيف يعمل الاختبار؟</Link></div>
 </div><div className="surface-panel p-6"><p className="eyebrow">ماذا ستتدرب عليه؟</p><div className="mt-5 grid gap-3">
  {['قواعد السير','الإشارات المرورية','الميكانيك','محاكاة الاختبار'].map(x=><div key={x} className="rounded-2xl border border-line p-4"><h2 className="font-black">{x}</h2><p className="mt-1 text-sm text-muted">محتوى تدريبي منظم لمساعدتك على الاستعداد قبل الاختبار.</p></div>)}
 </div></div></section>
 <section className="mx-auto grid max-w-6xl gap-5 px-4 py-10 md:grid-cols-3 md:px-6">
  <article className="surface-panel p-6"><h2 className="font-black">قواعد السير</h2><p className="mt-2 text-sm leading-7 text-muted">راجع أهم موضوعات القواعد.</p><Link to="/rules" className="mt-4 inline-block font-bold text-brand">مراجعة القواعد ←</Link></article>
  <article className="surface-panel p-6"><h2 className="font-black">الإشارات</h2><p className="mt-2 text-sm leading-7 text-muted">تعرف إلى أنواع الإشارات وطريقة مراجعتها.</p><Link to="/traffic-signs" className="mt-4 inline-block font-bold text-brand">مراجعة الإشارات ←</Link></article>
  <article className="surface-panel p-6"><h2 className="font-black">الاختبار التجريبي</h2><p className="mt-2 text-sm leading-7 text-muted">اختبر مستواك بعد تسجيل الدخول.</p><Link to="/login" className="mt-4 inline-block font-bold text-brand">الدخول ←</Link></article>
 </section></main></Layout>;
}

function InfoPage({title,description,path,heading,intro,items}:{title:string;description:string;path:string;heading:string;intro:string;items:[string,string][]}) {
 return <Layout><Seo title={title} description={description} path={path}/><main className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16"><p className="eyebrow">رخصتي</p><h1 className="mt-3 text-4xl font-black">{heading}</h1><p className="mt-5 text-lg leading-8 text-muted">{intro}</p><div className="mt-8 space-y-4">{items.map(([t,d])=><article key={t} className="surface-panel p-6"><h2 className="text-xl font-black">{t}</h2><p className="mt-2 leading-8 text-muted">{d}</p></article>)}</div><Link to="/login" className="primary-cta mt-8 inline-block">ابدأ التدريب</Link></main></Layout>;
}

export function RulesPage(){return <InfoPage title="قواعد السير — رخصتي" description="مقدمة تعليمية لمراجعة أهم موضوعات قواعد السير قبل اختبار القيادة." path="/rules" heading="مراجعة قواعد السير قبل الاختبار" intro="ركز على فهم القاعدة والظرف الذي تنطبق فيه، وليس حفظ الإجابة فقط." items={[
['الأفضلية والتقاطعات','راجع ترتيب الأولوية عند وجود الإشارات أو غيابها وكيفية التعامل مع المركبات القادمة من الاتجاهات المختلفة.'],
['التجاوز وتبديل المسار','تعلّم ما يجب فحصه قبل الانتقال بين المسارات أو تجاوز مركبة أخرى.'],
['الوقوف والتوقف','راجع الحالات التي قد يكون فيها الوقوف أو التوقف ممنوعاً أو خطراً.'],
['السرعة والمسافة الآمنة','السرعة المناسبة ترتبط بحالة الطريق والرؤية والازدحام والقدرة على التوقف بأمان.']
]}/>}

export function TrafficSignsPage(){return <InfoPage title="الإشارات المرورية — رخصتي" description="تعرف إلى أنواع الإشارات المرورية وطريقة مراجعتها استعداداً لاختبار القيادة." path="/traffic-signs" heading="كيف تراجع الإشارات المرورية؟" intro="اربط شكل الإشارة بوظيفتها ومكان استخدامها، ثم تدرب على التمييز بينها." items={[
['إشارات التحذير','تنبه إلى خطر أو تغير في الطريق.'],
['الإشارات التنظيمية','تحدد واجبات أو منعاً أو قيداً يجب الالتزام به.'],
['إشارات الأولوية','توضح من يملك الأولوية وكيفية التعامل مع التقاطعات.'],
['الإشارات الإرشادية','تقدم معلومات عن الاتجاهات والطريق والخدمات.']
]}/>}

export function DrivingTestSyriaPage(){return <InfoPage title="اختبار رخصة القيادة في سوريا — رخصتي" description="دليل تعريفي بطريقة التدريب والمحاكاة في رخصتي للاستعداد لاختبار القيادة في سوريا." path="/driving-test-syria" heading="استعد لاختبار رخصة القيادة في سوريا" intro="رخصتي تجمع التدريب حسب الموضوع مع نماذج محاكاة ومراجعة للنتيجة." items={[
['كيف يعمل التدريب؟','ابدأ بمراجعة قواعد السير أو الإشارات أو الميكانيك، ثم انتقل إلى نماذج المحاكاة وراجع أخطاءك.'],
['ما الذي تحتاج إلى مراجعته؟','ركز على فهم القاعدة ومعنى الإشارة وأساسيات المركبة والتصرف الصحيح في المواقف الشائعة.'],
['ملاحظة مهمة','المحتوى التدريبي وسيلة للمراجعة والاستعداد. راجع دائماً المتطلبات الرسمية الصادرة عن الجهة المختصة قبل الامتحان.']
]}/>}

export function AboutPage(){return <InfoPage title="عن رخصتي — منصة تدريب رخصة القيادة" description="تعرف على فكرة رخصتي وطريقة استخدام المنصة للتدرب على قواعد السير والإشارات والميكانيك." path="/about" heading="منصة عربية للتدريب على اختبار القيادة" intro="رخصتي تجمع قواعد السير والإشارات والميكانيك ومحاكاة الاختبار في تجربة تدريب واحدة." items={[
['هدف المنصة','تسهيل المراجعة وتقديم تجربة تدريب منظمة على الهاتف والكمبيوتر مع منطقة حساب محمية للطلاب ولوحة إدارة منفصلة.']
]}/>}
