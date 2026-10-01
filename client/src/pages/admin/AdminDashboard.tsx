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

function AiGenerationPanel({status,reloadAiStatus}:{status:import('../../types').AiGenerationOverview|null;reloadAiStatus:()=>Promise<void>}){
 const [busy,setBusy]=useState('');
 const [providerTest,setProviderTest]=useState<import('../../types').ImageProviderTestResult|null>(null);
 const [lastAction,setLastAction]=useState<{label:string;result:import('../../types').AiGenerationEnqueueResult}|null>(null);
 const [completedImages,setCompletedImages]=useState<import('../../types').CompletedAiImageItem[]>([]);
 const [galleryLoading,setGalleryLoading]=useState(false);

 const reloadGallery=async()=>{
  setGalleryLoading(true);
  try{setCompletedImages(await api.admin.completedAiImages(24))}catch{}finally{setGalleryLoading(false)}
 };

 useEffect(()=>{
  void reloadGallery();
  const timer=window.setInterval(()=>{
   void reloadAiStatus();
   void reloadGallery();
  },5000);
  return ()=>window.clearInterval(timer);
 },[]);

 const run=async(kind:'audio'|'image'|'resume'|'retry-audio'|'retry-image')=>{
  setBusy(kind);
  try{
   let result:import('../../types').AiGenerationEnqueueResult|null=null;
   if(kind==='audio') result=await api.admin.enqueueAllAudio(false,false);
   if(kind==='image') result=await api.admin.enqueueAllImages(false,false);
   if(kind==='resume') await api.admin.resumeAiGeneration();
   if(kind==='retry-audio') result=await api.admin.enqueueAllAudio(true,false);
   if(kind==='retry-image') result=await api.admin.enqueueAllImages(true,false);
   if(result){
    const labels={audio:'إضافة الأصوات الناقصة',image:'إضافة صور AI الناقصة','retry-audio':'إعادة طابور الأصوات الفاشلة','retry-image':'إعادة طابور صور AI الفاشلة'} as const;
    setLastAction({label:labels[kind as keyof typeof labels],result});
   }
   await reloadAiStatus();
  }catch(e){
   alert(e instanceof Error?e.message:'تعذر تنفيذ العملية.');
  }finally{setBusy('')}
 };

 const testImageProvider=async()=>{
  setBusy('test-image');
  try{
   const result=await api.admin.testImageProvider();
   setProviderTest(result);
   await reloadAiStatus();
  }catch(e){
   setProviderTest({provider:status?.imageProvider??'none',state:'error',message:e instanceof Error?e.message:'تعذر اختبار مزود الصور.',endpoint:''});
  }finally{setBusy('')}
 };

 const providerLabel=(value:string)=>{
  if(value==='comfyui')return 'ComfyUI';
  if(value==='huggingface')return 'Hugging Face';
  if(value==='fal-ai')return 'fal-ai';
  if(value==='none')return 'غير مفعّل';
  return value;
 };

 const effectiveImageProvider=status?.imageExecutionProvider || status?.imageProvider || 'none';
 const providerEnabled=status?.imageProvider && status.imageProvider!=='none';
 const testClass=providerTest?.state==='connected'?'on':providerTest?.state==='disabled'||providerTest?.state==='unconfigured'?'off':'warn';
 const quotaPercent=status?Math.min(100,(status.quota.used/Math.max(status.quota.limit,1))*100):0;
 const audioQuotaExhausted=Boolean(status?.audio.lastError?.toLowerCase().includes('quota_exceeded'));

 const stateText=(title:'audio'|'image',data:import('../../types').AiGenerationCounts)=>{
  if(title==='audio' && data.lastError?.toLowerCase().includes('quota_exceeded'))
   return 'متوقف حالياً: انتهى الحد المجاني في ElevenLabs.';
  if(data.processing>0)
   return title==='image'
    ? `جارٍ التوليد فعلياً عبر ${providerLabel(effectiveImageProvider)} الآن.`
    : 'جارٍ التوليد فعلياً الآن.';
  if(data.pending>0)
   return title==='image'
    ? `بإنتظار التنفيذ عبر ${providerLabel(effectiveImageProvider)}.`
    : 'بانتظار التنفيذ في الطابور.';
  if(data.failed>0)
   return `هناك ${data.failed} مهمة فشلت وتحتاج إعادة المحاولة بعد معالجة السبب.`;
  if(data.missing>0)
   return `هناك ${data.missing} مهمة ناقصة ولم تدخل الطابور بعد.`;
  return 'لا توجد مهام معلقة حالياً.';
 };

 const errorTime=(value?:string|null)=>value
  ? new Date(value).toLocaleString('ar-SY')
  : '';

 const imageLegacyProviderError=Boolean(
  status?.image.lastError?.toLowerCase().includes('nscale') &&
  effectiveImageProvider==='fal-ai'
 );

 const card=(title:string,data:import('../../types').AiGenerationCounts)=>(
  <div className="stat-card">
   <p>{title}</p>
   <strong>{data.completed}</strong>
   <small className="block text-muted mt-1">مكتمل · مفقود {data.missing} · بالطابور {data.pending} · قيد التنفيذ {data.processing} · فشل {data.failed}</small>
   <small className="block text-muted mt-2 leading-relaxed"><b>الحالة الحالية:</b> {stateText(title==='صور AI'?'image':'audio',data)}</small>
  </div>
 );

 return <section className="ai-generation-console space-y-5">
  <div className="admin-card ai-console-hero">
   <div className="card-title">
    <div><p>AI GENERATION CENTER</p><b>مركز توليد المحتوى</b></div>
    <span className={'status '+(providerEnabled?'on':'off')}>الصور: Hugging Face → {providerLabel(effectiveImageProvider)}</span>
   </div>
   <p className="text-muted text-sm leading-relaxed">التوليد يتم بالخادم في الخلفية. التدريب والاختبار لا يشغلان التوليد تلقائياً. حالة الطابور الظاهرة هنا هي الحالة الفعلية للمهام.</p>

   <div className="grid md:grid-cols-2 gap-4 mt-5">
    <div className="ai-console-card">
     <span>توليد الصوت</span>
     <b>{providerLabel(status?.audioProvider??'')}</b>
     <small>لا يتم استبدال الأصوات الموجودة؛ يضاف فقط الناقص.</small>
     {audioQuotaExhausted&&<div className="ai-provider-message problem mt-2">انتهى الحد المجاني المتاح في ElevenLabs حالياً، لذلك تم إيقاف توليد الصوت حتى تتوفر حصة جديدة.</div>}
     <button type="button" className="primary-cta mt-auto" disabled={busy!==''||audioQuotaExhausted} onClick={(e)=>{e.preventDefault();void run('audio')}}>{busy==='audio'?'جارٍ إضافة المهام…':audioQuotaExhausted?'الحد المجاني منتهٍ':'إضافة الأصوات الناقصة للطابور'}</button>
    </div>
    <div className="ai-console-card">
     <span>توليد صور AI</span>
     <b>Hugging Face → {providerLabel(effectiveImageProvider)}</b>
     <small>المهام تنتظر التنفيذ في PostgreSQL، والصور المكتملة تبقى محفوظة.</small>
     <button type="button" className="primary-cta mt-auto" disabled={busy!==''||!providerEnabled} onClick={(e)=>{e.preventDefault();void run('image')}}>{busy==='image'?'جارٍ إضافة المهام…':'إضافة صور AI الناقصة للطابور'}</button>
    </div>
   </div>

   <div className="ai-console-card mt-4">
    <span>المهام المتوقفة</span>
    <b>{status?.audio.pending??0} صوت · {status?.image.pending??0} صورة</b>
    <small>الاستئناف يطلق المهام المعلقة، ويعيد أيضاً فشل صور AI المرتبط برفض المزود السابق.</small>
    <button type="button" className="secondary-cta mt-2" disabled={busy!==''} onClick={(e)=>{e.preventDefault();void run('resume')}}>{busy==='resume'?'جارٍ الاستئناف…':'استئناف المهام'}</button>
   </div>

   {lastAction&&<div className="ai-provider-message ok mt-4">
    <b>{lastAction.label}</b> — أُنشئت {lastAction.result.created}، أُعيدت {lastAction.result.requeued}، تم تجاوز {lastAction.result.skipped}، وأعيدت فاشلة {lastAction.result.failedRetried}.
   </div>}
  </div>


  <div className="admin-card ai-gallery-card">
   <div className="card-title">
    <div><p>AI IMAGE GALLERY</p><b>الصور المولدة</b></div>
    <div className="ai-gallery-actions">
     <span className="status on">{completedImages.length} صورة معروضة</span>
     <button type="button" className="secondary-cta" disabled={galleryLoading} onClick={(e)=>{e.preventDefault();void reloadGallery()}}>{galleryLoading?'جارٍ التحديث…':'تحديث الصور'}</button>
    </div>
   </div>
   <p className="text-muted text-sm leading-relaxed">هذه صور مكتملة ومحفوظة فعلياً. المعرض يتحدث تلقائياً أثناء عمل الطابور.</p>
   {completedImages.length===0
    ? <div className="ai-gallery-empty">{galleryLoading?'جارٍ تحميل الصور…':'لا توجد صور AI مكتملة حالياً.'}</div>
    : <div className="ai-image-gallery">
      {completedImages.map(image=><article className="ai-image-item" key={image.questionId+'-'+image.contentHash}>
       <div className="ai-image-preview">
        <img src={resolveApiUrl(image.imageUrl)} alt={image.questionText} loading="lazy"/>
       </div>
       <div className="ai-image-meta">
        <span className="status on">مكتملة</span>
        <small>{image.category==='Ser'?'قواعد السير':image.category==='Ishara'?'الإشارات المرورية':image.category==='Mechanic'?'الميكانيك':image.category}</small>
        <b>سؤال #{image.questionId}</b>
        <p>{image.questionText}</p>
        <time dateTime={image.createdAt}>{new Date(image.createdAt).toLocaleString('ar-SY')}</time>
       </div>
      </article>)}
     </div>}
  </div>

  <div className="admin-card ai-provider-card">
   <div className="card-title">
    <div><p>IMAGE PROVIDER</p><b>حالة مزود صور AI</b></div>
    <span className={'status '+testClass}>{providerTest?.state==='connected'?'الإعداد صالح':providerTest?.state==='disabled'?'غير مفعّل':providerTest?.state==='unconfigured'?'غير مضبوط':providerTest?'تعذر التحقق':'لم يتم الفحص'}</span>
   </div>
   <div className="ai-provider-row">
    <div><small>المسار الفعلي</small><strong>Hugging Face → {providerLabel(effectiveImageProvider)}</strong></div>
    <div><small>نقطة التنفيذ</small><code>{providerTest?.endpoint || (effectiveImageProvider==='fal-ai'?'Hugging Face Fal queue':'Hugging Face Router')}</code></div>
    <button type="button" className="secondary-cta" disabled={busy!==''} onClick={(e)=>{e.preventDefault();void testImageProvider()}}>{busy==='test-image'?'جارٍ الفحص…':'فحص الإعداد'}</button>
   </div>
   {providerTest&&<div className={'ai-provider-message '+(providerTest.state==='connected'?'ok':'problem')}>{providerTest.message}</div>}
   <p className="text-muted text-xs leading-relaxed mt-3">هذا الفحص يتحقق من التوكن وأن الموديل مدرج فعلياً ضمن text-to-image لدى المزود الحالي. لا ينفّذ توليد صورة كاملة.</p>
  </div>

  <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
   {card('الأصوات',status?.audio??{missing:0,pending:0,processing:0,completed:0,failed:0,remaining:0})}
   {card('صور AI',status?.image??{missing:0,pending:0,processing:0,completed:0,failed:0,remaining:0})}
  </div>

  <div className="admin-card">
   <div className="card-title">
    <div><p>عداد التوليد</p><b>{status?.quota.used??0} / {status?.quota.limit??0}</b></div>
    <span className="status warn">حد حماية محلي</span>
   </div>
   <p className="text-muted text-sm leading-relaxed">عداد داخلي للحماية فقط. لا يساوي رصيد Hugging Face أو ElevenLabs.</p>
   <div className="ai-quota-bar mt-3"><i style={{width:quotaPercent+'%'}}/></div>
   <div className="mini-metrics mt-4">
    <div><strong>{status?.quota.used??0}</strong><span>عمليات التوليد الفعلية</span></div>
    <div><strong>{status?.quota.remaining??0}</strong><span>متبقٍ ضمن الحماية</span></div>
    <div><strong>{status?.image.completed??0}</strong><span>صور AI مكتملة</span></div>
    <div><strong>{status?.audio.completed??0}</strong><span>أصوات مكتملة</span></div>
   </div>
  </div>

  {(status?.audio.lastError||status?.image.lastError)&&<div className="admin-card">
   <div className="card-title"><div><p>سجل آخر فشل</p><b>هذا سجل تاريخي، وليس بالضرورة حالة المهمة الحالية</b></div></div>
   {status.audio.lastError&&<div className="ai-provider-message problem">الصوت: {status.audio.lastError}{status.audio.lastErrorAt&&<small className="block mt-1">وقت الفشل: {errorTime(status.audio.lastErrorAt)}</small>}</div>}
   {status.image.lastError&&<div className="ai-provider-message problem">
    <b>الصورة: </b>{status.image.lastError}
    {imageLegacyProviderError&&<small className="block mt-2">هذا الخطأ مسجّل من المحاولة السابقة على nscale. المسار الحالي هو fal-ai، لذلك لا نعتبر هذا السجل دليلاً على فشل Fal الحالي.</small>}
    {status.image.lastErrorAt&&<small className="block mt-1">وقت الفشل: {errorTime(status.image.lastErrorAt)}</small>}
   </div>}
  </div>}

  {status&&<div className="admin-card">
   <div className="card-title"><div><p>إعادة المحاولة</p><b>تستخدم فقط بعد معالجة سبب الفشل</b></div></div>
   <div className="action-row">
    <button type="button" className="secondary-cta" disabled={busy!==''||status.audio.failed===0||audioQuotaExhausted} onClick={(e)=>{e.preventDefault();void run('retry-audio')}}>{busy==='retry-audio'?'جارٍ…':'إعادة طابور الأصوات الفاشلة'}</button>
    <button type="button" className="secondary-cta" disabled={busy!==''||status.image.failed===0||!providerEnabled} onClick={(e)=>{e.preventDefault();void run('retry-image')}}>{busy==='retry-image'?'جارٍ…':'إعادة طابور صور AI الفاشلة'}</button>
   </div>
  </div>}
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
function QuestionEditor({initial,close,saved}:{initial:Question;close:()=>void;saved:()=>void}){const [q,setQ]=useState<Question>(initial);const [busy,setBusy]=useState(false);const set=(patch:Partial<Question>)=>setQ(x=>({...x,...patch}));async function save(){setBusy(true);try{const options=q.options.map(x=>x.trim());if(!q.text.trim())throw new Error('نص السؤال مطلوب.');if(options.length<2||options.some(x=>!x))throw new Error('يجب تعبئة جميع الاختيارات.');if(q.correctAnswerIndex<0||q.correctAnswerIndex>=options.length)throw new Error('الإجابة الصحيحة غير صالحة.');const imageUrl=q.imageUrl?.trim()||null;if(q.category==='Ishara'&&!resolveQuestionImageUrl(imageUrl))throw new Error('سؤال الإشارة يجب أن يرتبط بصورة من مكتبة الصور الحالية.');if(imageUrl&&!resolveQuestionImageUrl(imageUrl)&&q.category!=='Ser')throw new Error('مسار الصورة غير معتمد في مكتبة الصور الحالية.');const payload={category:q.category,text:q.text.trim(),options,correctAnswerIndex:q.correctAnswerIndex,explanation:q.explanation?.trim()||null,imageUrl,diagramType:q.diagramType||null,diagramUrl:q.diagramUrl?.trim()||null,diagramTitle:q.diagramTitle?.trim()||null,diagramDescription:q.diagramDescription?.trim()||null};if(q.id)await api.admin.updateQuestion(q.id,payload);else await api.admin.createQuestion(payload);saved()}catch(e){alert(e instanceof Error?e.message:'تعذر حفظ السؤال')}finally{setBusy(false)}}const preview=resolveQuestionImageUrl(q.imageUrl);return <div className="modal-backdrop" onClick={close}><div className="editor-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={close} aria-label="إغلاق">×</button><h2>محرر السؤال</h2><div className="form-grid"><select value={q.category} onChange={e=>set({category:e.target.value as QuestionCategory})}><option value="Ser">قواعد السير</option><option value="Ishara">الإشارات</option><option value="Mechanic">الميكانيك</option></select><textarea value={q.text} onChange={e=>set({text:e.target.value})} placeholder="نص السؤال" rows={3}/>{q.options.map((o,i)=><input key={i} value={o} onChange={e=>set({options:q.options.map((x,j)=>j===i?e.target.value:x)})} placeholder={`الإجابة ${i+1}`}/>)}<label>رقم الإجابة الصحيحة<input type="number" min={0} max={3} value={q.correctAnswerIndex} onChange={e=>set({correctAnswerIndex:Number(e.target.value)})}/></label><textarea value={q.explanation||''} onChange={e=>set({explanation:e.target.value})} placeholder="شرح الإجابة" rows={3}/><input value={q.imageUrl||''} onChange={e=>set({imageUrl:e.target.value})} placeholder="مثال: /signs/sign_55.webp" dir="ltr"/>{preview?<div className="admin-image-preview"><OptimizedImage src={q.imageUrl||''} alt="معاينة صورة السؤال" priority sizes="220px"/></div>:<p className="text-muted text-xs">لا توجد معاينة لصورة معتمدة حالياً.</p>}<div className="diagram-fields"><select value={q.diagramType||''} onChange={e=>set({diagramType:(e.target.value||null) as any})}><option value="">بدون Diagram</option><option value="svg">SVG</option><option value="image">صورة</option><option value="interactive">تفاعلي</option></select><input value={q.diagramUrl||''} onChange={e=>set({diagramUrl:e.target.value})} placeholder="رابط التوضيح"/><input value={q.diagramTitle||''} onChange={e=>set({diagramTitle:e.target.value})} placeholder="عنوان التوضيح"/><textarea value={q.diagramDescription||''} onChange={e=>set({diagramDescription:e.target.value})} placeholder="وصف التوضيح" rows={2}/></div><button onClick={save} disabled={busy} className="primary-cta">{busy?'جارٍ التحقق والحفظ...':'حفظ السؤال'}</button></div></div></div>}
