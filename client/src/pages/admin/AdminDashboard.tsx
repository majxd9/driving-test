import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Student, ActivityLog, QuestionStat, QuestionCategory } from '../../types';

const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  Ser: 'قواعد السير',
  Ishara: 'الإشارات',
  Mechanic: 'الميكانيك',
};

const CATEGORY_BAR_CLASS: Record<QuestionCategory, string> = {
  Ser: 'bg-brand',
  Ishara: 'bg-signs',
  Mechanic: 'bg-mek',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'students'>('overview');

  return (
    <div className="min-h-screen">
      <div className="bg-surface text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="font-semibold text-sm flex-1">لوحة التحكم</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex gap-1.5 bg-surface rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab('overview')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'overview' ? 'bg-brand text-paper' : 'text-muted'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setTab('students')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'students' ? 'bg-brand text-paper' : 'text-muted'
            }`}
          >
            الطلاب
          </button>
        </div>
      </div>

      {tab === 'overview' ? <OverviewTab /> : <StudentsTab />}
    </div>
  );
}

/* ------------------------------- نظرة عامة ------------------------------- */

function OverviewTab() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [activity, setActivity] = useState<ActivityLog[] | null>(null);
  const [stats, setStats] = useState<QuestionStat[] | null>(null);

  useEffect(() => {
    api.admin.listStudents().then(setStudents);
    api.admin.getRecentActivity().then(setActivity).catch(() => setActivity([]));
    api.admin.getQuestionStats().then(setStats).catch(() => setStats([]));
  }, []);

  const loading = !students || !activity || !stats;

  const activeCount = students?.filter((s) => s.isActive).length ?? 0;
  const expiringSoon =
    students?.filter((s) => {
      if (!s.accessExpiresAt) return false;
      const days = (new Date(s.accessExpiresAt).getTime() - Date.now()) / 86_400_000;
      return days > 0 && days <= 14;
    }).length ?? 0;
  const totalQuestions = stats?.reduce((sum, s) => sum + s.count, 0) ?? 0;

  const signupsByMonth = (() => {
    if (!students) return [];
    const map = new Map<string, number>();
    students.forEach((s) => {
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .slice(-6)
      .map(([key, value]) => ({ label: MONTHS_AR[Number(key.split('-')[1]) - 1], value }));
  })();

  return (
    <div className="max-w-lg mx-auto px-4 pb-10">
      {loading ? (
        <p className="text-center text-muted py-16">...جارِ التحميل</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="إجمالي الطلاب" value={students!.length} accentClass="text-ink" />
            <StatCard label="حسابات فعّالة" value={activeCount} accentClass="text-brand" />
            <StatCard label="صلاحية تنتهي قريباً" value={expiringSoon} accentClass="text-mek" />
            <StatCard label="بنك الأسئلة" value={totalQuestions} accentClass="text-signs" />
          </div>

          <div className="bg-surface rounded-xl2 border border-line p-4 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">تسجيلات الطلاب الجدد</h3>
            {signupsByMonth.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">ما في بيانات كافية بعد</p>
            ) : (
              <div className="flex items-end gap-2.5 h-28">
                {signupsByMonth.map((d) => {
                  const max = Math.max(...signupsByMonth.map((x) => x.value), 1);
                  return (
                    <div key={d.label} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                      <span className="text-[11px] text-ink font-semibold">{d.value}</span>
                      <div
                        className="w-full max-w-[26px] rounded-t-md bg-brand"
                        style={{ height: `${Math.max((d.value / max) * 100, 6)}%` }}
                      />
                      <span className="text-[10px] text-muted">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-surface rounded-xl2 border border-line p-4 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">بنك الأسئلة حسب الفئة</h3>
            <div className="space-y-3">
              {stats!.map((s) => {
                const pct = totalQuestions > 0 ? (s.count / totalQuestions) * 100 : 0;
                return (
                  <div key={s.category}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-ink font-medium">{CATEGORY_LABEL[s.category] ?? s.category}</span>
                      <span className="text-muted">{s.count} سؤال</span>
                    </div>
                    <div className="h-2 rounded-full bg-paper overflow-hidden">
                      <div
                        className={`h-full rounded-full ${CATEGORY_BAR_CLASS[s.category] ?? 'bg-brand'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-xl2 border border-line p-4">
            <h3 className="text-sm font-semibold text-ink mb-3">آخر نشاط دخول</h3>
            {activity!.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">ولا محاولة دخول مسجّلة بعد</p>
            ) : (
              <div className="space-y-0.5 max-h-80 overflow-y-auto">
                {activity!.map((log, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-line last:border-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${log.success ? 'bg-brand' : 'bg-exam'}`} />
                    <span className="flex-1 min-w-0 text-xs text-ink truncate" dir="ltr">
                      {log.attemptedUserName}
                    </span>
                    <span className="text-[11px] text-muted shrink-0">{timeAgo(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accentClass }: { label: string; value: number; accentClass: string }) {
  return (
    <div className="bg-surface rounded-xl2 border border-line p-4 text-center">
      <p className={`text-2xl font-bold ${accentClass}`}>{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

const MONTHS_AR = [
  'كانون٢',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين١',
  'تشرين٢',
  'كانون١',
];

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

/* -------------------------------- الطلاب -------------------------------- */

function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');

  function load() {
    setLoading(true);
    api.admin.listStudents().then(setStudents).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleStatus(s: Student) {
    await api.admin.setStatus(s.id, !s.isActive);
    load();
  }

  async function resetDevice(s: Student) {
    await api.admin.resetDevice(s.id);
    load();
  }

  async function removeStudent(s: Student) {
    if (!confirm(`حذف حساب ${s.fullName} نهائياً؟`)) return;
    await api.admin.deleteStudent(s.id);
    load();
  }

  const filtered = students.filter(
    (s) => s.fullName.includes(query) || s.userName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto px-4 pb-10">
      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full py-3.5 rounded-xl2 font-bold text-white bg-brand mb-4"
      >
        {showForm ? 'إغلاق' : '+ إضافة طالب جديد'}
      </button>

      {showForm && <CreateStudentForm onCreated={() => { setShowForm(false); load(); }} />}

      {students.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالاسم أو اسم المستخدم..."
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-brand mb-4"
        />
      )}

      {loading ? (
        <p className="text-center text-muted py-8">...جارِ التحميل</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted py-8">
          {students.length === 0 ? 'لا يوجد طلاب مسجّلين بعد' : 'ولا نتيجة مطابقة'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((s) => (
            <StudentRow
              key={s.id}
              student={s}
              onToggle={() => toggleStatus(s)}
              onResetDevice={() => resetDevice(s)}
              onDelete={() => removeStudent(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRow({
  student,
  onToggle,
  onResetDevice,
  onDelete,
}: {
  student: Student;
  onToggle: () => void;
  onResetDevice: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-surface rounded-xl2 border border-line overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full p-4 flex items-center gap-3 text-right">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${student.isActive ? 'bg-brand' : 'bg-exam'}`} />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink truncate">{student.fullName}</span>
          <span className="block text-xs text-muted mt-0.5" dir="ltr">
            {student.userName}
          </span>
        </span>
        {student.deviceBound && (
          <span className="text-[10px] text-signs bg-signs-soft px-2 py-1 rounded-full shrink-0">مرتبط بجهاز</span>
        )}
      </button>

      {open && (
        <div className="border-t border-line p-3 grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={onToggle}
            className={`py-2.5 rounded-lg font-semibold ${
              student.isActive ? 'bg-exam-soft text-exam' : 'bg-brand-soft text-brand'
            }`}
          >
            {student.isActive ? 'تعطيل' : 'تفعيل'}
          </button>
          <button onClick={onResetDevice} className="py-2.5 rounded-lg font-semibold bg-signs-soft text-signs">
            إعادة ربط الجهاز
          </button>
          <button onClick={onDelete} className="py-2.5 rounded-lg font-semibold bg-white/5 text-muted">
            حذف
          </button>
        </div>
      )}
    </div>
  );
}

function CreateStudentForm({ onCreated }: { onCreated: () => void }) {
  const [userName, setUserName] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [accessDays, setAccessDays] = useState('90');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.admin.createStudent({
        userName,
        fullName,
        password,
        accessDays: accessDays ? Number(accessDays) : null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إنشاء الحساب');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl2 border border-line p-4 space-y-3 mb-4">
      <div>
        <label className="block text-xs text-muted mb-1">الاسم الكامل</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">اسم المستخدم</label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          required
          dir="ltr"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">كلمة المرور</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="text"
          dir="ltr"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">مدة الصلاحية (يوم)</label>
        <input
          value={accessDays}
          onChange={(e) => setAccessDays(e.target.value)}
          type="number"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      {error && <p className="text-xs text-exam">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 rounded-lg font-bold text-white bg-brand disabled:opacity-60"
      >
        {busy ? '...جارِ الحفظ' : 'حفظ الحساب'}
      </button>
    </form>
  );
}
