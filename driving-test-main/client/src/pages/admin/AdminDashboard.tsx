import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Analytics, Question, QuestionCategory, Student } from '../../types';

 type Tab = 'overview' | 'students' | 'questions' | 'media';
 const tabs: [Tab, string, string][] = [
  ['overview', 'لوحة المعلومات', 'نظرة عامة'],
  ['students', 'الطلاب', 'الحسابات'],
  ['questions', 'الأسئلة', 'المحتوى'],
  ['media', 'الصور', 'الوسائط'],
 ];

const categoryName = (category: QuestionCategory) => category === 'Ser' ? 'قواعد السير' : category === 'Ishara' ? 'الإشارات' : 'الميكانيك';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showStudent, setShowStudent] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, q, a] = await Promise.all([
        api.admin.listStudents(),
        api.admin.listQuestions(),
        api.admin.analytics(),
      ]);
      setStudents(s);
      setQuestions(q);
      setAnalytics(a);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  return (
    <div className="min-h-screen bg-paper">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/')} className="icon-button">→</button>
            <div className="min-w-0">
              <b>رخصتي — لوحة التحكم</b>
              <p>إدارة المحتوى والطلاب ومراقبة الأداء</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && <span className="admin-updated">آخر تحديث {lastUpdated.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button onClick={reload} disabled={loading} className="top-link">{loading ? 'جارِ التحديث...' : 'تحديث ↻'}</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        <nav className="admin-tabs" aria-label="أقسام الإدارة">
          {tabs.map(([key, title, sub]) => <button key={key} onClick={() => setTab(key)} className={tab === key ? 'active' : ''}><strong>{title}</strong><small>{sub}</small></button>)}
        </nav>

        {error && <div className="admin-alert">{error}<button onClick={reload}>إعادة المحاولة</button></div>}
        {loading && !analytics ? <div className="py-24 text-center text-muted">جارِ تحميل لوحة التحكم...</div> : (
          <>
            {tab === 'overview' && <Overview analytics={analytics} questions={questions} students={students} />}
            {tab === 'students' && <Students students={students} reload={reload} showForm={showStudent} setShowForm={setShowStudent} />}
            {tab === 'questions' && <Questions questions={questions} reload={reload} />}
            {tab === 'media' && <Media />}
          </>
        )}
      </main>
    </div>
  );
}

function Overview({ analytics, questions, students }: { analytics: Analytics | null; questions: Question[]; students: Student[] }) {
  if (!analytics) return null;
  const completeQuestions = questions.filter(q => q.options.length === 4 && q.options.every(x => x.trim())).length;
  const imageQuestions = questions.filter(q => !!q.imageUrl).length;
  const missingImages = Math.max(0, questions.length - imageQuestions);
  const max = Math.max(...Object.values(analytics.questions.byCategory), 1);

  return <section className="space-y-5">
    <div className="admin-intro"><div><p className="eyebrow">Control center</p><h1>نظرة عامة</h1><p>الأرقام الأساسية التي تحتاجها لمتابعة الموقع من مكان واحد.</p></div><div className="admin-status"><span className="pulse-dot" /> النظام يعمل</div></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat title="الطلاب" value={analytics.students.total} hint={`${analytics.students.active} نشط`} cls="" />
      <Stat title="الأسئلة" value={analytics.questions.total} hint={`${completeQuestions} مكتمل الاختيارات`} cls="text-signs" />
      <Stat title="نسبة النجاح" value={`${analytics.exams.passRate}%`} hint={`${analytics.exams.total} اختبار مكتمل`} cls="text-brand" />
      <Stat title="دخول ناجح" value={analytics.auth.successful} hint={`${analytics.auth.failed} محاولة فاشلة`} cls="text-mek" />
    </div>

    <div className="grid lg:grid-cols-2 gap-5">
      <div className="admin-card">
        <div className="card-title"><div><p>توزيع المحتوى</p><b>الأسئلة حسب القسم</b></div></div>
        {Object.entries(analytics.questions.byCategory).map(([key, value]) => <div className="bar-row" key={key}><span>{categoryName(key as QuestionCategory)}</span><div><i style={{ width: `${(Number(value) / max) * 100}%` }} /></div><b>{value}</b></div>)}
      </div>
      <div className="admin-card">
        <div className="card-title"><div><p>صحة المحتوى</p><b>هل بنك الأسئلة جاهز؟</b></div></div>
        <div className="health-grid">
          <Health label="اختيارات كاملة" value={completeQuestions} total={questions.length} ok={completeQuestions === questions.length} />
          <Health label="أسئلة مع صور" value={imageQuestions} total={questions.length} ok={missingImages === 0} />
          <Health label="طلاب نشطون" value={analytics.students.active} total={analytics.students.total} ok />
          <Health label="متوسط النتيجة" value={analytics.exams.averageScore} total={30} ok />
        </div>
      </div>
    </div>

    <div className="admin-card">
      <div className="card-title"><div><p>الأسئلة التي تحتاج انتباه</p><b>الأكثر خطأً من الطلاب</b></div></div>
      <div className="table-wrap"><table><thead><tr><th>السؤال</th><th>القسم</th><th>المحاولات</th><th>الدقة</th></tr></thead><tbody>{analytics.topQuestions.slice(0, 10).map(q => <tr key={`${q.questionId}-${q.category}`}><td><b>{q.text}</b></td><td>{categoryName(q.category)}</td><td>{q.attempts}</td><td><span className="accuracy-pill">{q.accuracy}%</span></td></tr>)}</tbody></table></div>
    </div>
  </section>;
}

function Stat({ title, value, hint, cls }: { title: string; value: number | string; hint: string; cls: string }) {
  return <div className="stat-card"><p>{title}</p><strong className={cls}>{value}</strong><span>{hint}</span></div>;
}
function Health({ label, value, total, ok }: { label: string; value: number; total: number; ok: boolean }) {
  return <div className="health-item"><div><span>{label}</span><b>{value}{total ? ` / ${total}` : ''}</b></div><div className={`health-track ${ok ? 'ok' : 'warn'}`}><i style={{ width: `${Math.min(100, total ? (value / total) * 100 : 0)}%` }} /></div><small>{ok ? 'جيد' : 'يحتاج مراجعة'}</small></div>;
}

function Students({ students, reload, showForm, setShowForm }: { students: Student[]; reload: () => void; showForm: boolean; setShowForm: (value: boolean) => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => students.filter(s => `${s.fullName} ${s.userName}`.toLowerCase().includes(search.toLowerCase())), [students, search]);
  const [busyId, setBusyId] = useState('');
  async function act(id: string, action: () => Promise<unknown>) { setBusyId(id); try { await action(); await reload(); } finally { setBusyId(''); } }
  return <section>
    <div className="toolbar"><div><p className="eyebrow">إدارة الحسابات</p><h1>الطلاب</h1><p>إنشاء الحسابات والتحكم بالتفعيل والجهاز والصلاحية.</p></div><button onClick={() => setShowForm(!showForm)} className="primary-cta">{showForm ? 'إغلاق' : '＋ إضافة طالب'}</button></div>
    {showForm && <CreateStudentForm onCreated={() => { setShowForm(false); reload(); }} />}
    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو اسم المستخدم..." className="admin-search" />
    <div className="admin-card mt-4"><div className="table-wrap"><table><thead><tr><th>الاسم</th><th>الحالة</th><th>الجهاز</th><th>الصلاحية</th><th>إجراءات</th></tr></thead><tbody>{filtered.map(s => <tr key={s.id}><td><b>{s.fullName}</b><small dir="ltr">{s.userName}</small></td><td><span className={`status ${s.isActive ? 'on' : 'off'}`}>{s.isActive ? 'نشط' : 'معطل'}</span></td><td>{s.deviceBound ? 'مرتبط' : 'غير مرتبط'}</td><td>{s.accessExpiresAt ? new Date(s.accessExpiresAt).toLocaleDateString('ar-SY') : 'دائم'}</td><td><div className="action-row"><button disabled={busyId === s.id} onClick={() => act(s.id, () => api.admin.setStatus(s.id, !s.isActive))}>{s.isActive ? 'تعطيل' : 'تفعيل'}</button><button disabled={busyId === s.id} onClick={() => act(s.id, () => api.admin.resetDevice(s.id))}>إعادة الجهاز</button><button disabled={busyId === s.id} className="danger" onClick={() => { if (confirm(`حذف حساب ${s.fullName}؟`)) act(s.id, () => api.admin.deleteStudent(s.id)); }}>حذف</button></div></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="empty-admin">لا توجد نتائج مطابقة.</div>}</div>
  </section>;
}

function CreateStudentForm({ onCreated }: { onCreated: () => void }) {
  const [userName, setUserName] = useState(''); const [fullName, setFullName] = useState(''); const [password, setPassword] = useState(''); const [days, setDays] = useState('90'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { await api.admin.createStudent({ userName: userName.trim(), fullName: fullName.trim(), password, accessDays: days ? Number(days) : null }); onCreated(); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الحفظ'); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="admin-card form-grid student-create"><div className="form-section-head"><b>إنشاء حساب جديد</b><span>الصلاحية الافتراضية 90 يوماً</span></div><input placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required /><input placeholder="اسم المستخدم" value={userName} onChange={e => setUserName(e.target.value)} required dir="ltr" /><input placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} dir="ltr" /><input placeholder="مدة الصلاحية بالأيام" value={days} onChange={e => setDays(e.target.value)} type="number" min={1} /><button disabled={busy} className="primary-cta">{busy ? 'جارٍ الحفظ...' : 'حفظ الحساب'}</button>{error && <p className="text-exam text-sm">{error}</p>}</form>;
}

function Questions({ questions, reload }: { questions: Question[]; reload: () => void }) {
  const [editing, setEditing] = useState<Question | null>(null); const [search, setSearch] = useState(''); const [category, setCategory] = useState<'all' | QuestionCategory>('all');
  const filtered = questions.filter(q => (category === 'all' || q.category === category) && (`${q.text} ${q.id}`).toLowerCase().includes(search.toLowerCase()));
  return <section>
    <div className="toolbar"><div><p className="eyebrow">محرر المحتوى</p><h1>الأسئلة</h1><p>هنا تعدّل السؤال والاختيارات والصورة والتوضيح بدون لمس الكود.</p></div><button className="primary-cta" onClick={() => setEditing(blankQuestion())}>＋ إضافة سؤال</button></div>
    <div className="filters-row"><input className="admin-search" placeholder="ابحث برقم السؤال أو النص..." value={search} onChange={e => setSearch(e.target.value)} /><select value={category} onChange={e => setCategory(e.target.value as 'all' | QuestionCategory)}><option value="all">كل الأقسام</option><option value="Ser">قواعد السير</option><option value="Ishara">الإشارات</option><option value="Mechanic">الميكانيك</option></select></div>
    <div className="admin-card mt-4"><div className="table-wrap"><table><thead><tr><th>#</th><th>السؤال</th><th>القسم</th><th>اختيارات</th><th>الصورة</th><th>إجراءات</th></tr></thead><tbody>{filtered.map(q => <tr key={q.id}><td>{q.id}</td><td><b>{q.text}</b></td><td>{categoryName(q.category)}</td><td><span className={`status ${q.options.length === 4 && q.options.every(x => x.trim()) ? 'on' : 'off'}`}>{q.options.length}/4</span></td><td>{q.imageUrl ? '✓' : '—'}</td><td><div className="action-row"><button onClick={() => setEditing(q)}>تعديل</button><button className="danger" onClick={async () => { if (confirm('حذف السؤال نهائياً؟')) { await api.admin.deleteQuestion(q.id); reload(); } }}>حذف</button></div></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="empty-admin">لا توجد أسئلة مطابقة.</div>}</div>
    {editing && <QuestionEditor initial={editing} close={() => setEditing(null)} saved={() => { setEditing(null); reload(); }} />}
  </section>;
}

function blankQuestion(): Question { return { id: 0, category: 'Ser', text: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: null, imageUrl: null, diagramType: null, diagramUrl: null, diagramTitle: null, diagramDescription: null }; }

function QuestionEditor({ initial, close, saved }: { initial: Question; close: () => void; saved: () => void }) {
  const [q, setQ] = useState<Question>(JSON.parse(JSON.stringify(initial))); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (patch: Partial<Question>) => setQ(current => ({ ...current, ...patch }));
  async function save() {
    setBusy(true); setError('');
    try {
      const options = q.options.slice(0, 4).map(x => x.trim());
      if (!q.text.trim()) throw new Error('نص السؤال مطلوب.');
      if (options.length !== 4 || options.some(x => !x)) throw new Error('يجب تعبئة الاختيارات الأربعة كلها.');
      if (!Number.isInteger(q.correctAnswerIndex) || q.correctAnswerIndex < 0 || q.correctAnswerIndex > 3) throw new Error('اختر رقم الإجابة الصحيحة من 0 إلى 3.');
      const payload = { category: q.category, text: q.text.trim(), options, correctAnswerIndex: q.correctAnswerIndex, explanation: q.explanation?.trim() || null, imageUrl: q.imageUrl?.trim() || null, diagramType: q.diagramType || null, diagramUrl: q.diagramUrl?.trim() || null, diagramTitle: q.diagramTitle?.trim() || null, diagramDescription: q.diagramDescription?.trim() || null };
      if (q.id) await api.admin.updateQuestion(q.id, payload); else await api.admin.createQuestion(payload);
      saved();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ السؤال'); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onClick={close}><div className="editor-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={close}>×</button><div className="editor-head"><div><span className="eyebrow">Question editor</span><h2>{q.id ? `تعديل السؤال #${q.id}` : 'إضافة سؤال جديد'}</h2></div><span className="editor-tip">كل سؤال يجب أن يحتوي 4 اختيارات</span></div><div className="form-grid"><select value={q.category} onChange={e => set({ category: e.target.value as QuestionCategory })}><option value="Ser">قواعد السير</option><option value="Ishara">الإشارات</option><option value="Mechanic">الميكانيك</option></select><textarea value={q.text} onChange={e => set({ text: e.target.value })} placeholder="اكتب نص السؤال هنا..." rows={4}/><div className="options-editor">{q.options.map((option, i) => <label key={i}><span>{['أ', 'ب', 'ج', 'د'][i]}</span><input value={option} onChange={e => set({ options: q.options.map((x, j) => j === i ? e.target.value : x) })} placeholder={`الاختيار ${['الأول', 'الثاني', 'الثالث', 'الرابع'][i]}`} /></label>)}</div><label className="field-label-inline">الإجابة الصحيحة<select value={q.correctAnswerIndex} onChange={e => set({ correctAnswerIndex: Number(e.target.value) })}><option value={0}>أ</option><option value={1}>ب</option><option value={2}>ج</option><option value={3}>د</option></select></label><textarea value={q.explanation || ''} onChange={e => set({ explanation: e.target.value })} placeholder="شرح الإجابة للطالب (اختياري)" rows={4}/><input value={q.imageUrl || ''} onChange={e => set({ imageUrl: e.target.value || null })} placeholder="رابط الصورة: /mechanic/mechanic_210.webp"/><div className="diagram-fields"><b>التوضيح البصري (اختياري)</b><select value={q.diagramType || ''} onChange={e => set({ diagramType: (e.target.value || null) as Question['diagramType'] })}><option value="">بدون توضيح</option><option value="svg">SVG</option><option value="image">صورة</option><option value="interactive">تفاعلي</option></select><input value={q.diagramUrl || ''} onChange={e => set({ diagramUrl: e.target.value || null })} placeholder="رابط التوضيح"/><input value={q.diagramTitle || ''} onChange={e => set({ diagramTitle: e.target.value || null })} placeholder="عنوان التوضيح"/><textarea value={q.diagramDescription || ''} onChange={e => set({ diagramDescription: e.target.value || null })} placeholder="وصف التوضيح" rows={2}/></div><button onClick={save} disabled={busy} className="primary-cta">{busy ? 'جارٍ الحفظ...' : 'حفظ السؤال'}</button>{error && <div className="admin-alert inline">{error}</div>}</div></div></div>;
}

function Media() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [preview, setPreview] = useState('');
  async function optimize(file: File) { if (!file.type.startsWith('image/')) throw new Error('الملف ليس صورة'); if (file.size > 10 * 1024 * 1024) throw new Error('حجم الصورة أكبر من 10MB'); if (file.type === 'image/svg+xml' || file.type === 'image/webp') return file; const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('تعذر معالجة الصورة'); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.86)); if (!blob) throw new Error('تعذر ضغط الصورة'); return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }); }
  async function onFile(file?: File) { if (!file) return; setBusy(true); setMessage('جارٍ تجهيز الصورة...'); setPreview(URL.createObjectURL(file)); try { const optimized = await optimize(file); const result = await api.admin.uploadMedia(optimized); setMessage(`تم الرفع بنجاح • ${Math.round(result.size / 1024)}KB • ${result.url}`); } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر رفع الصورة'); } finally { setBusy(false); } }
  return <section><div className="toolbar"><div><p className="eyebrow">Media pipeline</p><h1>إدارة الصور</h1><p>كل صورة يتم ضغطها قبل الرفع للحفاظ على السرعة والوضوح.</p></div><label className="primary-cta cursor-pointer">＋ رفع صورة<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => onFile(e.target.files?.[0])} /></label></div><div className="admin-card media-admin-card"><div className="media-upload-preview">{preview ? <img src={preview} alt="معاينة" /> : <div className="upload-icon">↥</div>}</div><div><h2>ارفع صورة السؤال</h2><p>PNG/JPG يتحولان إلى WebP بحد أقصى 1280px. استخدم SVG للرسومات التوضيحية التي تحتاج وضوحاً عالياً.</p>{busy && <div className="mt-4 text-brand">جارٍ المعالجة...</div>}{message && <div className="media-message mt-4">{message}</div>}</div></div></section>;
}
