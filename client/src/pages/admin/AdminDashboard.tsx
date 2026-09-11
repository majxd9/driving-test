import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Student, Question, ExamAttempt } from '../../types';

const PASS_SCORE = 25;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [questionMap, setQuestionMap] = useState<Record<number, Question>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    api.admin.listStudents().then(setStudents).finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    Promise.all([api.getQuestions('Ser'), api.getQuestions('Ishara'), api.getQuestions('Mechanic')]).then(
      ([ser, ishara, mechanic]) => {
        const map: Record<number, Question> = {};
        [...ser, ...ishara, ...mechanic].forEach((q) => (map[q.id] = q));
        setQuestionMap(map);
      },
    );
  }, []);

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

  const activeCount = students.filter((s) => s.isActive).length;
  const totalAttempts = students.reduce((sum, s) => sum + s.attemptCount, 0);
  const totalPasses = students.reduce((sum, s) => sum + s.passCount, 0);
  const overallPassRate = totalAttempts > 0 ? Math.round((totalPasses / totalAttempts) * 100) : null;

  return (
    <div className="min-h-screen">
      <div className="bg-surface text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-6 h-6">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="font-semibold text-sm">لوحة تحكم الطلاب</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-surface rounded-xl2 border border-line p-4 text-center">
            <p className="text-2xl font-bold text-ink">{students.length}</p>
            <p className="text-xs text-muted mt-0.5">إجمالي الطلاب</p>
          </div>
          <div className="bg-surface rounded-xl2 border border-line p-4 text-center">
            <p className="text-2xl font-bold text-brand">{activeCount}</p>
            <p className="text-xs text-muted mt-0.5">حسابات فعّالة</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-surface rounded-xl2 border border-line p-4 text-center">
            <p className="text-2xl font-bold text-signs">{totalAttempts}</p>
            <p className="text-xs text-muted mt-0.5">اختبارات أُجريت</p>
          </div>
          <div className="bg-surface rounded-xl2 border border-line p-4 text-center">
            <p className="text-2xl font-bold text-ink">{overallPassRate === null ? '—' : `${overallPassRate}%`}</p>
            <p className="text-xs text-muted mt-0.5">نسبة النجاح العامة</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full py-3.5 rounded-xl2 font-bold text-white bg-brand mb-5"
        >
          {showForm ? 'إغلاق' : '+ إضافة طالب جديد'}
        </button>

        {showForm && <CreateStudentForm onCreated={() => { setShowForm(false); load(); }} />}

        <h2 className="text-sm font-semibold text-muted mb-2.5 mt-6">قائمة الطلاب</h2>

        {loading ? (
          <p className="text-center text-muted py-8">...جارِ التحميل</p>
        ) : students.length === 0 ? (
          <p className="text-center text-muted py-8">لا يوجد طلاب مسجّلين بعد</p>
        ) : (
          <div className="space-y-2.5">
            {students.map((s) => (
              <StudentRow
                key={s.id}
                student={s}
                questionMap={questionMap}
                onToggle={() => toggleStatus(s)}
                onResetDevice={() => resetDevice(s)}
                onDelete={() => removeStudent(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentRow({
  student,
  questionMap,
  onToggle,
  onResetDevice,
  onDelete,
}: {
  student: Student;
  questionMap: Record<number, Question>;
  onToggle: () => void;
  onResetDevice: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);
  const [attempts, setAttempts] = useState<ExamAttempt[] | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<number | null>(null);

  function toggleAttempts() {
    const next = !showAttempts;
    setShowAttempts(next);
    if (next && attempts === null) {
      api.admin.getAttempts(student.id).then(setAttempts);
    }
  }

  return (
    <div className="bg-surface rounded-xl2 border border-line overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full p-4 flex items-center gap-3 text-right">
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${student.isActive ? 'bg-brand' : 'bg-exam'}`}
        />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink truncate">{student.fullName}</span>
          <span className="block text-xs text-muted mt-0.5" dir="ltr">
            {student.userName}
          </span>
        </span>
        {student.attemptCount > 0 && (
          <span className="text-[10px] text-muted bg-white/5 px-2 py-1 rounded-full shrink-0">
            {student.passCount}/{student.attemptCount} ناجح
          </span>
        )}
        {student.deviceBound && (
          <span className="text-[10px] text-signs bg-signs-soft px-2 py-1 rounded-full shrink-0">
            مرتبط بجهاز
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-line p-3 space-y-2.5">
          <div className="grid grid-cols-3 gap-2 text-xs">
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

          <button
            onClick={toggleAttempts}
            className="w-full py-2.5 rounded-lg font-semibold text-xs bg-white/5 text-ink"
          >
            {showAttempts ? 'إخفاء الاختبارات' : `عرض الاختبارات (${student.attemptCount})`}
          </button>

          {showAttempts && (
            <div className="space-y-2">
              {attempts === null ? (
                <p className="text-center text-muted text-xs py-3">...جارِ التحميل</p>
              ) : attempts.length === 0 ? (
                <p className="text-center text-muted text-xs py-3">ما في اختبارات لسا</p>
              ) : (
                attempts.map((a) => {
                  const percent = a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0;
                  const passed = a.correct >= PASS_SCORE;
                  const isOpen = expandedAttempt === a.id;
                  return (
                    <div key={a.id} className="bg-paper rounded-lg border border-line p-2.5">
                      <button
                        onClick={() => setExpandedAttempt(isOpen ? null : a.id)}
                        className="w-full flex items-center justify-between text-xs"
                      >
                        <span className={`font-bold ${passed ? 'text-brand' : 'text-exam'}`}>
                          {percent}% ({a.correct}/{a.total})
                        </span>
                        <span className="text-muted">نموذج {a.modelId}</span>
                        <span className="text-muted" dir="ltr">
                          {new Date(a.createdAt).toLocaleDateString('ar-SY')}
                        </span>
                      </button>

                      {isOpen && a.wrongQuestionIds.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-line space-y-1.5">
                          {a.wrongQuestionIds.map((qid) => (
                            <p key={qid} className="text-[11px] text-muted leading-relaxed">
                              • {questionMap[qid]?.text ?? `سؤال #${qid}`}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
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
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl2 border border-line p-4 space-y-3 mb-5">
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
