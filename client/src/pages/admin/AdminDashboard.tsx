import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, resolveApiUrl } from '../../api/client';
import { Analytics, Question, QuestionCategory, Student } from '../../types';
import OptimizedImage, { resolveQuestionImageUrl } from '../../components/OptimizedImage';
import { StudentAuditModal } from './StudentAuditModal';
import AudioDiagnostics from '../../components/AudioDiagnostics';
import { getQuestionAudioSource } from '../../utils/questionAudio';

type Tab='overview'|'students'|'questions'|'ai';
const tabs:[Tab,string][]=[['overview','نظرة عامة'],['students','الطلاب'],['questions','الأسئلة'],['ai','AI GENERATION']];

export default function AdminDashboard(){
 const navigate=useNavigate();const [tab,setTab]=useState<Tab>('overview');const [students,setStudents]=useState<Student[]>([]);const [questions,setQuestions]=useState<Question[]>([]);const [analytics,setAnalytics]=useState<Analytics|null>(null);const [loading,setLoading]=useState(true);const [showStudent,setShowStudent]=useState(false);
 const [aiStatus,setAiStatus]=useState<import('../../types').AiGenerationOverview|null>(null);
 const reload=async(tabToLoad:Tab=tab)=>{setLoading(true);try{if(tabToLoad==='overview')setAnalytics(await api.admin.analytics());if(tabToLoad==='students')setStudents(await api.admin.listStudents());if(tabToLoad==='questions')setQuestions(await api.admin.listQuestions());if(tabToLoad==='ai')setAiStatus(await api.admin.aiGenerationStatus())}finally{setLoading(false)}};
 const reloadAiStatus=async()=>{try{setAiStatus(await api.admin.aiGenerationStatus())}catch{}};
 useEffect(()=>{void reload(tab)},[tab]);
 return <div className="min-h-screen bg-paper"><header className="admin-header"><div className="flex items-center gap-3"><button onClick={()=>navigate('/app')} className="icon-button" aria-label="العودة">→</button><div><b>لوحة الإدارة</b><p>إدارة الحسابات، الأسئلة ومؤشرات الأداء</p></div></div><button onClick={()=>void reload()} className="top-link" aria-label="تحديث القسم الحالي">تحديث ↻</button></header><main className="max-w-7xl mx-auto px-4 md:px-6 py-6"><nav className="admin-tabs" aria-label="أقسام الإدارة">{tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?'active':''} aria-current={tab===k?'page':undefined}>{l}</button>)}</nav>{loading?<div className="py-20 text-center text-muted">جارِ تحميل القسم...</div>:<>{tab==='overview'&&<Overview analytics={analytics}/>} {tab==='students'&&<Students students={students} reload={()=>reload('students')} showForm={showStudent} setShowForm={setShowStudent}/>} {tab==='questions'&&<Questions questions={questions} reload={()=>reload('questions')}/>} {tab==='ai'&&<AiGenerationPanel status={aiStatus} reloadAiStatus={reloadAiStatus}/>}</>}</main></div>;
}

function Overview({analytics}:{analytics:Analytics|null}){if(!analytics)return <div className="admin-card text-muted">لا توجد بيانات إحصائية حالياً.</div>;const max=Math.max(...Object.values(analytics.questions.byCategory),1);return <section className="space-y-5"><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[['الطلاب',analytics.students.total,''],['النشطون',analytics.students.active,'brand'],['الأسئلة',analytics.questions.total,'signs'],['نسبة النجاح',`${analytics.exams.passRate}%`,'exam']].map(([l,v,c])=><div className="stat-card" key={l as string}><p>{l}</p><strong className={c==='brand'?'text-brand':c==='signs'?'text-signs':c==='exam'?'text-exam':''}>{v}</strong></div>)}</div><div className="grid lg:grid-cols-2 gap-5"><div className="admin-card"><div className="card-title"><div><p>توزيع بنك الأسئلة</p><b>حسب القسم</b></div></div><div className="bars">{Object.entries(analytics.questions.byCategory).map(([k,v])=><div className="bar-row" key={k}><span>{k==='Ser'?'قواعد السير':k==='Ishara'?'الإشارات':'الميكانيك'}</span><div><i style={{width:`${(v/max)*100}%`}}/></div><b>{v}</b></div>)}</div></div><div className="admin-card"><div className="card-title"><div><p>الاختبارات</p><b>ملخص الأداء</b></div></div><div className="mini-metrics"><div><strong>{analytics.exams.total}</strong><span>اختبار مكتمل</span></div><div><strong>{analytics.exams.averageScore}</strong><span>متوسط الإجابات</span></div><div><strong>{analytics.auth.successful}</strong><span>دخول ناجح</span></div><div><strong>{analytics.auth.failed}</strong><span>محاولة فاشلة</span></div></div></div></div><div className="admin-card"><div className="card-title"><div><p>أكثر الأسئلة نشاطاً</p><b>مؤشر دقة الإجابة</b></div></div><div className="table-wrap"><table><thead><tr><th>السؤال</th><th>المحاولات</th><th>الدقة</th></tr></thead><tbody>{analytics.topQuestions.slice(0,8).map(q=><tr key={q.questionId}><td>{q.text}</td><td>{q.attempts}</td><td><span className="accuracy-pill">{q.accuracy}%</span></td></tr>)}</tbody></table></div></div></section>}

function Students({students,reload,showForm,setShowForm}:{students:Student[];reload:()=>void;showForm:boolean;setShowForm:(v:boolean)=>void}){const [search,setSearch]=useState('');const [auditStudent,setAuditStudent]=useState<Student|null>(null);const filtered=useMemo(()=>students.filter(s=>(s.fullName+' '+s.userName).toLowerCase().includes(search.toLowerCase())),[students,search]);async function act(fn:()=>Promise<unknown>){await fn();reload()}return <section><div className="toolbar"><div><p className="eyebrow">إدارة الحسابات</p><h1>الطلاب</h1></div><button onClick={()=>setShowForm(!showForm)} className="primary-cta">{showForm?'إغلاق':'＋ إضافة طالب'}</button></div>{showForm&&<CreateStudentForm onCreated={()=>{setShowForm(false);reload()}}/>}<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو اسم المستخدم..." className="admin-search" aria-label="البحث عن طالب"/><div className="admin-card mt-4"><div className="table-wrap"><table><thead><tr><th>الاسم</th><th>الحالة</th><th>الجهاز</th><th>الصلاحية</th><th>إجراءات</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td><b>{s.fullName}</b><small dir="ltr">{s.userName}</small></td><td><span className={`status ${s.isActive?'on':'off'}`}>{s.isActive?'نشط':'معطل'}</span></td><td>{s.deviceBound?'مرتبط':'غير مرتبط'}</td><td>{s.accessExpiresAt?new Date(s.accessExpiresAt).toLocaleDateString('ar-SY'):'دائم'}</td><td><div className="action-row"><button onClick={()=>setAuditStudent(s)}>سجل الدخول</button><button onClick={()=>act(()=>api.admin.setStatus(s.id,!s.isActive))}>{s.isActive?'تعطيل':'تفعيل'}</button><button onClick={()=>act(()=>api.admin.resetDevice(s.id))}>إعادة الجهاز</button><button className="danger" onClick={()=>{if(confirm(`حذف حساب ${s.fullName}؟`))void act(()=>api.admin.deleteStudent(s.id))}}>حذف</button></div></td></tr>)}</tbody></table></div></div>{auditStudent&&<StudentAuditModal student={auditStudent} onClose={()=>setAuditStudent(null)}/>}</section>}

function CreateStudentForm({onCreated}:{onCreated:()=>void}){const [userName,setUserName]=useState(''),[fullName,setFullName]=useState(''),[password,setPassword]=useState(''),[days,setDays]=useState('90'),[error,setError]=useState(''),[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await api.admin.createStudent({userName,fullName,password,accessDays:days?Number(days):null});onCreated()}catch(e){setError(e instanceof Error?e.message:'تعذر الحفظ')}finally{setBusy(false)}}return <form onSubmit={submit} className="admin-card form-grid"><input placeholder="الاسم الكامل" value={fullName} onChange={e=>setFullName(e.target.value)} required/><input placeholder="اسم المستخدم" value={userName} onChange={e=>setUserName(e.target.value)} required dir="ltr"/><input placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} required dir="ltr"/><input placeholder="مدة الصلاحية بالأيام" value={days} onChange={e=>setDays(e.target.value)} type="number" min="1"/><button disabled={busy} className="primary-cta">{busy?'جارٍ الحفظ...':'حفظ الحساب'}</button>{error&&<p className="text-exam text-sm">{error}</p>}</form>}

function Questions({questions,reload}:{questions:Question[];reload:()=>void}){
 const [editing,setEditing]=useState<Question|null>(null);
 const [search,setSearch]=useState('');
 const [busy,setBusy]=useState('');
 const runAudio=async(id:number,force:boolean)=>{setBusy(`a-${id}`);try{await api.admin.generateQuestionAudio(id,force);await reload()}catch(e){alert(e instanceof Error?e.message:'تعذر وضع مهمة الصوت في الطابور')}finally{setBusy('')}};
 const runImage=async(id:number,force:boolean)=>{setBusy(`i-${id}`);try{await api.admin.generateQuestionImage(id,force);await reload()}catch(e){alert(e instanceof Error?e.message:'تعذر وضع مهمة الصورة في الطابور')}finally{setBusy('')}};
 const filtered=useMemo(()=>questions.filter(q=>(q.text+' '+q.id).includes(search)),[questions,search]);
 const label=(s?:string|null)=>s==='Completed'?'مكتمل':s==='Processing'?'قيد التنفيذ':s==='Pending'?'معلّق':s==='Failed'?'فشل':s==='NotRequired'?'غير مطلوب':'مفقود';
 return <section>
  <div className="toolbar"><div><p className="eyebrow">محرر المحتوى</p><h1>الأسئلة</h1></div><button className="primary-cta" onClick={()=>setEditing({id:0,category:'Ser',text:'',options:['','','',''],correctAnswerIndex:0,explanation:'',imageUrl:undefined,diagramType:undefined,diagramUrl:undefined,diagramTitle:undefined,diagramDescription:undefined,audioUrl:null})}>＋ إضافة سؤال</button></div>
  <input className="admin-search" placeholder="ابحث عن سؤال أو رقمه..." value={search} onChange={e=>setSearch(e.target.value)} aria-label="البحث عن سؤال"/>
  <div className="admin-card mt-4"><div className="table-wrap"><table><thead><tr><th>#</th><th>السؤال</th><th>القسم</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>
  {filtered.map(q=><tr key={q.id}><td>{q.id}</td><td><b>{q.text}</b></td><td>{q.category}</td><td><div className="action-row"><span className={`status ${q.audioGenerationStatus==='Completed'?'on':'off'}`}>صوت: {label(q.audioGenerationStatus)}</span>{q.aiImageGenerationStatus!=='NotRequired'&&<span className={`status ${q.aiImageGenerationStatus==='Completed'?'on':'off'}`}>AI: {label(q.aiImageGenerationStatus)}</span>}</div></td><td><div className="action-row">
    <button onClick={()=>setEditing(q)}>تعديل</button>
    {q.audioUrl&&<AdminAudioPreview src={resolveApiUrl(q.audioUrl)}/>}
    <AudioDiagnostics src={q.audioUrl?resolveApiUrl(q.audioUrl):null} questionId={q.id}/>
    <button onClick={()=>void runAudio(q.id,Boolean(q.audioUrl))} disabled={busy===`a-${q.id}`}>{busy===`a-${q.id}`?'إضافة للطابور…':q.audioUrl?'إعادة توليد الصوت':'توليد الصوت'}</button>
    {q.aiImageGenerationStatus!=='NotRequired'&&<button onClick={()=>void runImage(q.id,Boolean(q.aiImageUrl))} disabled={busy===`i-${q.id}`}>{busy===`i-${q.id}`?'إضافة للطابور…':q.aiImageUrl?'إعادة توليد الصورة':'توليد صورة AI'}</button>}
    <button className="danger" onClick={()=>{if(confirm('حذف السؤال نهائياً؟'))void api.admin.deleteQuestion(q.id).then(reload)}}>حذف</button>
  </div></td></tr>)}
  </tbody></table></div></div>
  {editing&&<QuestionEditor initial={editing} close={()=>setEditing(null)} saved={()=>{setEditing(null);reload()}}/>}
 </section>;
}

function AiGenerationPanel({status,reloadAiStatus}:{status:import('../../types').AiGenerationOverview|null;reloadAiStatus:()=>Promise<void>}) {
 const [busy,setBusy]=useState('');
 const [control,setControl]=useState<import('../../types').AiGenerationControlState|null>(null);
 const [providerTest,setProviderTest]=useState<import('../../types').ImageProviderTestResult|null>(null);
 const [lastAction,setLastAction]=useState('');
 const [completedImages,setCompletedImages]=useState<import('../../types').CompletedAiImageItem[]>([]);
 const [galleryLoading,setGalleryLoading]=useState(false);
 const [galleryOpen,setGalleryOpen]=useState(false);
 const [reviewItem,setReviewItem]=useState<import('../../types').AiImageReviewItem|null>(null);
 const [reviewImageSrc,setReviewImageSrc]=useState('');
 const [reviewLoading,setReviewLoading]=useState(false);
 const [reviewBusy,setReviewBusy]=useState(false);

 const refresh=async()=>{
  await reloadAiStatus();
  try{setControl(await api.admin.aiGenerationControl())}catch{}
 };

 useEffect(()=>{
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},8000);
  return ()=>window.clearInterval(timer);
 },[]);

 useEffect(()=>{
  if(!galleryOpen) return;
  void reloadGallery();
  const timer=window.setInterval(()=>{void reloadGallery()},8000);
  return ()=>window.clearInterval(timer);
 },[galleryOpen]);

 const loadReview=async()=>{
  setReviewLoading(true);
  try{setReviewItem(await api.admin.nextAiImageReview())}catch{setReviewItem(null)}finally{setReviewLoading(false)}
 };

 useEffect(()=>{
  void loadReview();
  const timer=window.setInterval(()=>{void loadReview()},8000);
  return ()=>window.clearInterval(timer);
 },[]);

 useEffect(()=>{
  if(!reviewItem){
   setReviewImageSrc('');
   return;
  }
  let active=true;
  let objectUrl='';
  setReviewImageSrc('');
  void fetch(resolveApiUrl(reviewItem.imageUrl),{credentials:'include',cache:'no-store'})
   .then(response=>{
    if(!response.ok)throw new Error('تعذر تحميل صورة المراجعة.');
    return response.blob();
   })
   .then(blob=>{
    if(!active)return;
    objectUrl=URL.createObjectURL(blob);
    setReviewImageSrc(objectUrl);
   })
   .catch(()=>{if(active)setReviewImageSrc('')});
  return ()=>{
   active=false;
   if(objectUrl)URL.revokeObjectURL(objectUrl);
  };
 },[reviewItem]);

 const reviewAction=async(approve:boolean)=>{
  if(!reviewItem||reviewBusy)return;
  setReviewBusy(true);
  try{
   const next=approve
    ? await api.admin.approveAiImageReview(reviewItem.questionId)
    : await api.admin.rejectAiImageReview(reviewItem.questionId);
   setReviewItem(next);
   await reloadAiStatus();
  }catch(e){
   alert(e instanceof Error?e.message:'تعذر حفظ قرار المراجعة.');
  }finally{setReviewBusy(false)}
 };

 const reloadGallery=async()=>{
  setGalleryLoading(true);
  try{setCompletedImages(await api.admin.completedAiImages(24))}catch{}finally{setGalleryLoading(false)}
 };

 const act=async(kind:string,action:()=>Promise<unknown>,label:string)=>{
  setBusy(kind);
  try{
   await action();
   setLastAction(label);
   await refresh();
  }catch(e){
   alert(e instanceof Error?e.message:'تعذر تنفيذ العملية.');
  }finally{setBusy('')}
 };

 const providerLabel=(value:string)=>{
  if(value==='comfyui')return 'ComfyUI';
  if(value==='huggingface')return 'Hugging Face';
  if(value==='edenai')return 'Eden AI';
  if(value==='gemini')return 'Gemini';
  if(value==='fal-ai')return 'fal-ai';
  if(value==='none')return 'غير مفعّل';
  return value;
 };

 const effectiveImageProvider=status?.imageExecutionProvider || status?.imageProvider || 'none';
 const providerEnabled=status?.imageProvider==='huggingface'||status?.imageProvider==='comfyui'||status?.imageProvider==='edenai'||status?.imageProvider==='gemini';
 const imageFallbackEnabled=Boolean(status?.imageFallbackProvider);
 const audioFallbackEnabled=Boolean(status?.audioFallbackProvider);
 const testClass=providerTest?.state==='connected'?'on':providerTest?.state==='disabled'||providerTest?.state==='unconfigured'?'off':'warn';

 const stateBadge=(enabled:boolean)=>(
  <span className={'status '+(enabled?'on':'off')}>{enabled?'مشغّل':'متوقف'}</span>
 );

 const stat=(title:string,data:import('../../types').AiGenerationCounts)=>(
  <div className="stat-card">
   <p>{title}</p>
   <strong>{data.completed}</strong>
   <small className="block text-muted mt-1">مكتمل · مفقود {data.missing} · بالطابور {data.pending} · قيد التنفيذ {data.processing} · فشل {data.failed}</small>
  </div>
 );

 return <section className="ai-generation-console space-y-5">
  <div className="admin-card ai-console-hero">
   <div className="card-title">
    <div><p>AI GENERATION CENTER</p><b>مركز التحكم بالتوليد</b></div>
    {stateBadge(Boolean(control?.audioEnabled||control?.imageEnabled))}
   </div>

   <p className="text-muted text-sm leading-relaxed">
    التوليد لا يبدأ من التدريب أو الاختبار. كل تشغيل هنا يفتح نوع التوليد ويضيف الناقص فقط. الإيقاف محفوظ في الخادم.
   </p>

   <div className="action-row mt-4">
    <button
     type="button"
     className="danger"
     disabled={busy!==''}
     onClick={()=>void act('stop-all',()=>api.admin.stopAllAiGeneration(),'تم إيقاف جميع توليدات AI')}
    >
     {busy==='stop-all'?'جارٍ الإيقاف…':'إيقاف جميع التوليدات'}
    </button>
    <button
     type="button"
     className="secondary-cta"
     disabled={busy!==''||!providerEnabled}
     onClick={()=>void act('start-all',()=>api.admin.startAllAiGeneration(),'تم تشغيل الصوت والصور وإضافة الناقص')}
    >
     {busy==='start-all'?'جارٍ التشغيل…':'تشغيل الجميع + إضافة الناقص'}
    </button>
   </div>

   <div className="grid md:grid-cols-2 gap-4 mt-5">
    <div className="ai-console-card">
     <div className="flex items-center justify-between gap-3">
      <div><span>توليد الصوت</span><b className="block mt-1">{providerLabel(status?.audioProvider??'')} {audioFallbackEnabled?'→ Eden AI ('+providerLabel(status?.audioFallbackProvider??'')+')':''}</b></div>
      {stateBadge(Boolean(control?.audioEnabled))}
     </div>
     <small>زر التشغيل يضيف الأصوات الناقصة فقط. الموجود لا يُستبدل.</small>
     <div className="action-row mt-3">
      <button type="button" className="primary-cta" disabled={busy!==''} onClick={()=>void act('start-audio',()=>api.admin.startAudioGeneration(),'تم تشغيل الصوت وإضافة الأصوات الناقصة')}>
       {busy==='start-audio'?'جارٍ التشغيل…':'توليد الأصوات الناقصة'}
      </button>
      <button type="button" className="secondary-cta" disabled={busy!==''||!control?.audioEnabled} onClick={()=>void act('stop-audio',()=>api.admin.stopAudioGeneration(),'تم إيقاف توليد الصوت')}>
       {busy==='stop-audio'?'جارٍ الإيقاف…':'إيقاف الصوت'}
      </button>
      <button type="button" className="secondary-cta" disabled={busy!==''||status?.audio.failed===0} onClick={()=>void act('retry-audio',()=>api.admin.retryFailedAi('audio'),'تمت إعادة جميع الأصوات الفاشلة للطابور')}>
       {busy==='retry-audio'?'جارٍ الإضافة…':'إعادة الأصوات الفاشلة'}
      </button>
     </div>
    </div>

    <div className="ai-console-card">
     <div className="flex items-center justify-between gap-3">
      <div><span>توليد صور AI</span><b className="block mt-1">{providerLabel(status?.imageProvider??'none')}{status?.imageProvider!==effectiveImageProvider&&effectiveImageProvider!=='none'?' → '+providerLabel(effectiveImageProvider):''}{imageFallbackEnabled?' → Eden AI ('+providerLabel(status?.imageFallbackProvider??'')+')':''}</b></div>
      {stateBadge(Boolean(control?.imageEnabled))}
     </div>
     <small>أي سؤال لديه صورة أصلية أو Diagram لا يدخل توليد AI.</small>
     <div className="action-row mt-3">
      <button type="button" className="primary-cta" disabled={busy!==''||!providerEnabled} onClick={()=>void act('start-image',()=>api.admin.startImageGeneration(),'تم تشغيل الصور وإضافة الصور الناقصة')}>
       {busy==='start-image'?'جارٍ التشغيل…':'توليد الصور الناقصة'}
      </button>
      <button type="button" className="secondary-cta" disabled={busy!==''||!control?.imageEnabled} onClick={()=>void act('stop-image',()=>api.admin.stopImageGeneration(),'تم إيقاف توليد الصور')}>
       {busy==='stop-image'?'جارٍ الإيقاف…':'إيقاف الصور'}
      </button>
      <button type="button" className="secondary-cta" disabled={busy!==''||status?.image.failed===0} onClick={()=>void act('retry-image',()=>api.admin.retryFailedAi('image'),'تمت إعادة جميع صور AI الفاشلة للطابور')}>
       {busy==='retry-image'?'جارٍ الإضافة…':'إعادة الصور الفاشلة'}
      </button>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
    {status&&stat('الصوت',status.audio)}
    {status&&stat('صور AI',status.image)}
    <div className="stat-card"><p>حالة الصور</p><strong>{control?.imageEnabled?'مشغّل':'متوقف'}</strong><small className="block text-muted mt-1">لا توجد صور AI تلقائياً بدون تشغيل من هنا.</small></div>
    <div className="stat-card"><p>حالة الطابور</p><strong>{(status?.audio.pending??0)+(status?.image.pending??0)}</strong><small className="block text-muted mt-1">مهمة بانتظار التنفيذ</small></div>
   </div>

   {lastAction&&<div className="ai-provider-message ok mt-4"><b>{lastAction}</b></div>}

   <div className="ai-console-card mt-4">
    <div className="card-title">
     <div><p>فحص مزود الصور</p><b>اختبار الاتصال والإعداد فقط</b></div>
     <button type="button" className="secondary-cta" disabled={busy!==''} onClick={()=>void act('test-image',async()=>{const r=await api.admin.testImageProvider();setProviderTest(r)},'تم فحص مزود الصور')}>
      {busy==='test-image'?'جارٍ الفحص…':'فحص مزود الصور'}
     </button>
    </div>
    {providerTest&&<div className={'ai-provider-message '+testClass}><b>{providerTest.state}</b> — {providerTest.message}<small className="block mt-1" dir="ltr">{providerTest.endpoint}</small></div>}
   </div>
  </div>

  <div className="admin-card ai-review-card">
   <div className="card-title">
    <div><p>AI CONTENT REVIEW</p><b>مراجعة الصور قبل النشر</b></div>
    <div className="ai-gallery-actions">
     <span className={`status ${reviewItem?'warn':'on'}`}>
      {reviewItem?\`${reviewItem.pendingCount} بانتظار المراجعة\`:'لا توجد صورة جاهزة للمراجعة'}
     </span>
     <button type="button" className="secondary-cta" disabled={reviewLoading||reviewBusy} onClick={()=>void loadReview()}>
      {reviewLoading?'جارٍ التحديث…':'تحديث المراجعة'}
     </button>
    </div>
   </div>
   <p className="text-muted text-sm leading-relaxed">
    الصورة المولدة تبقى مخفية عن الطلاب حتى تضغط «موافقة». الرفض يحذف الصورة الحالية ويعيد السؤال مباشرة إلى قائمة إعادة البناء.
   </p>
   {!reviewItem
    ? <div className="ai-review-empty">{reviewLoading?'جارٍ البحث عن صورة للمراجعة…':'لا توجد صور AI جديدة جاهزة للمراجعة حالياً.'}</div>
    : <div className="ai-review-stage">
      <div className="ai-review-preview">
       {reviewImageSrc
        ? <img src={reviewImageSrc} alt={reviewItem.questionText}/>
        : <div className="ai-review-image-loading">جارٍ تحميل الصورة…</div>}
      </div>
      <div className="ai-review-details">
       <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="status warn">بانتظار المراجعة</span>
        <small>{reviewItem.category} · سؤال #{reviewItem.questionId}</small>
       </div>
       <h3>{reviewItem.questionText}</h3>
       <p className="text-muted text-sm">تاريخ التوليد: {new Date(reviewItem.createdAt).toLocaleString('ar-SY')}</p>
       <div className="ai-review-actions">
        <button type="button" className="primary-cta ai-review-approve" disabled={reviewBusy||!reviewImageSrc} onClick={()=>void reviewAction(true)}>
         {reviewBusy?'جارٍ الحفظ…':'✓ موافقة ونشر بالموقع'}
        </button>
        <button type="button" className="danger ai-review-reject" disabled={reviewBusy} onClick={()=>void reviewAction(false)}>
         {reviewBusy?'جارٍ الحفظ…':'✕ رفض وحذف وإعادة البناء'}
        </button>
       </div>
       <small className="text-muted">بعد القرار ينتقل النظام تلقائياً إلى الصورة التالية دون عرض أكثر من صورة في نفس الوقت.</small>
      </div>
     </div>}
  </div>

  <div className="admin-card ai-gallery-card">
   <div className="card-title">
    <div><p>AI IMAGE GALLERY</p><b>الصور المولدة</b></div>
    <div className="ai-gallery-actions">
     {galleryOpen&&<span className="status on">{completedImages.length} صورة معروضة</span>}
     <button type="button" className="secondary-cta" disabled={galleryLoading} onClick={(e)=>{e.preventDefault();setGalleryOpen(open=>!open)}}>{galleryOpen?'إخفاء الصور':'عرض الصور المكتملة'}</button>
     {galleryOpen&&<button type="button" className="secondary-cta" disabled={galleryLoading} onClick={(e)=>{e.preventDefault();void reloadGallery()}}>{galleryLoading?'جارٍ التحديث…':'تحديث الصور'}</button>}
    </div>
   </div>
   <p className="text-muted text-sm leading-relaxed">{galleryOpen?'هذه صور مكتملة ومحفوظة فعلياً.':'المعرض لا يحمل الصور حتى تضغط عرض الصور المكتملة.'}</p>
   {galleryOpen&&(
    completedImages.length===0
     ? <div className="ai-gallery-empty">{galleryLoading?'جارٍ تحميل الصور…':'لا توجد صور AI مكتملة حالياً.'}</div>
     : <div className="ai-image-gallery">
      {completedImages.map(image=><article className="ai-image-item" key={image.questionId+'-'+image.contentHash}>
       <div className="ai-image-preview"><img src={resolveApiUrl(image.imageUrl)} alt={image.questionText} loading="lazy"/></div>
       <div className="ai-image-meta">
        <span className="status on">مكتملة</span>
        <small>{image.category} · سؤال #{image.questionId}</small>
        <p>{image.questionText}</p>
       </div>
      </article>)}
     </div>
   )}
  </div>
 </section>;
}

function AdminAudioPreview({src}:{src:string}){
 const audioRef=useRef<HTMLAudioElement|null>(null);
 const [playing,setPlaying]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
   const audio=audioRef.current;
   if(!audio||!src)return;
   let active=true;
   setPlaying(false);
   setError('جاري تجهيز الصوت…');
   audio.pause();
   audio.removeAttribute('src');
   audio.load();
   void getQuestionAudioSource(src)
     .then(source=>{
       if(!active)return;
       audio.src=source;
       audio.preload='auto';
       audio.load();
       setError('');
     })
     .catch(e=>{if(active)setError(`تعذر تجهيز الصوت: ${e instanceof Error?e.message:String(e)}`);});
   return ()=>{
     active=false;
     audio.pause();
     audio.removeAttribute('src');
     audio.load();
   };
 },[src]);
 const play=()=>{
   const audio=audioRef.current;
   if(!audio)return;
   setError('');
   audio.pause();
   audio.currentTime=0;
   void audio.play().then(()=>setPlaying(true)).catch(e=>{setPlaying(false);setError(`المتصفح لم يستطع تشغيل الملف: ${e instanceof Error?e.message:'فشل التشغيل'}`);});
 };
 const stop=()=>{
   const audio=audioRef.current;
   if(!audio)return;
   audio.pause();
   audio.currentTime=0;
   setPlaying(false);
 };
 return <span className="action-row" title="اختبار الصوت من الخادم">
   <audio ref={audioRef} preload="auto" onEnded={()=>setPlaying(false)} onError={()=>{setPlaying(false);setError('وصل الملف لكن المتصفح فشل في فكّه.');}} />
   <button type="button" onClick={play} disabled={!!error&&error.startsWith('جاري')}>{playing?'▶ يعمل':'🔊 استماع'}</button>
   <button type="button" onClick={stop}>إيقاف</button>
   {error&&<small className="text-exam">{error}</small>}
   <AudioDiagnostics src={src} />
 </span>;
}
function QuestionEditor({initial,close,saved}:{initial:Question;close:()=>void;saved:()=>void}){const [q,setQ]=useState<Question>(initial);const [busy,setBusy]=useState(false);const set=(patch:Partial<Question>)=>setQ(x=>({...x,...patch}));async function save(){setBusy(true);try{const options=q.options.map(x=>x.trim());if(!q.text.trim())throw new Error('نص السؤال مطلوب.');if(options.length!==4||options.some(x=>!x))throw new Error('يجب تعبئة الاختيارات الأربعة كاملة.');if(q.correctAnswerIndex<0||q.correctAnswerIndex>=options.length)throw new Error('الإجابة الصحيحة غير صالحة.');const imageUrl=q.imageUrl?.trim()||null;if(q.category==='Ishara'&&!resolveQuestionImageUrl(imageUrl))throw new Error('سؤال الإشارة يجب أن يرتبط بصورة من مكتبة الصور الحالية.');if(imageUrl&&!resolveQuestionImageUrl(imageUrl)&&q.category!=='Ser')throw new Error('مسار الصورة غير معتمد في مكتبة الصور الحالية.');const payload={category:q.category,text:q.text.trim(),options,correctAnswerIndex:q.correctAnswerIndex,explanation:q.explanation?.trim()||null,imageUrl,diagramType:q.diagramType||null,diagramUrl:q.diagramUrl?.trim()||null,diagramTitle:q.diagramTitle?.trim()||null,diagramDescription:q.diagramDescription?.trim()||null};if(q.id)await api.admin.updateQuestion(q.id,payload);else await api.admin.createQuestion(payload);saved()}catch(e){alert(e instanceof Error?e.message:'تعذر حفظ السؤال')}finally{setBusy(false)}}const preview=resolveQuestionImageUrl(q.imageUrl);return <div className="modal-backdrop" onClick={close}><div className="editor-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={close} aria-label="إغلاق">×</button><h2>محرر السؤال</h2><div className="form-grid"><select value={q.category} onChange={e=>set({category:e.target.value as QuestionCategory})}><option value="Ser">قواعد السير</option><option value="Ishara">الإشارات</option><option value="Mechanic">الميكانيك</option></select><textarea value={q.text} onChange={e=>set({text:e.target.value})} placeholder="نص السؤال" rows={3}/>{q.options.map((o,i)=><input key={i} value={o} onChange={e=>set({options:q.options.map((x,j)=>j===i?e.target.value:x)})} placeholder={`الإجابة ${i+1}`}/>)}<label>رقم الإجابة الصحيحة<input type="number" min={0} max={3} value={q.correctAnswerIndex} onChange={e=>set({correctAnswerIndex:Number(e.target.value)})}/></label><textarea value={q.explanation||''} onChange={e=>set({explanation:e.target.value})} placeholder="شرح الإجابة" rows={3}/><input value={q.imageUrl||''} onChange={e=>set({imageUrl:e.target.value})} placeholder="مثال: /signs/sign_55.webp" dir="ltr"/>{preview?<div className="admin-image-preview"><OptimizedImage src={q.imageUrl||''} alt="معاينة صورة السؤال" priority sizes="220px"/></div>:<p className="text-muted text-xs">لا توجد معاينة لصورة معتمدة حالياً.</p>}<div className="diagram-fields"><select value={q.diagramType||''} onChange={e=>set({diagramType:(e.target.value||null) as any})}><option value="">بدون Diagram</option><option value="svg">SVG</option><option value="image">صورة</option><option value="interactive">تفاعلي</option></select><input value={q.diagramUrl||''} onChange={e=>set({diagramUrl:e.target.value})} placeholder="رابط التوضيح"/><input value={q.diagramTitle||''} onChange={e=>set({diagramTitle:e.target.value})} placeholder="عنوان التوضيح"/><textarea value={q.diagramDescription||''} onChange={e=>set({diagramDescription:e.target.value})} placeholder="وصف التوضيح" rows={2}/></div><button onClick={save} disabled={busy} className="primary-cta">{busy?'جارٍ التحقق والحفظ...':'حفظ السؤال'}</button></div></div></div>}
