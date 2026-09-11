```tsx
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../api/client';

import { Analytics, Question, QuestionCategory, Student } from '../../types';

type Tab = 'overview' | 'students' | 'questions' | 'media';

const tabs: [Tab, string][] = [
  ['overview', 'نظرة عامة'],
  ['students', 'الطلاب'],
  ['questions', 'الأسئلة'],
  ['media', 'الصور'],
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStudent, setShowStudent] = useState(false);

  const reload = () => {
    setLoading(true);

    Promise.all([
      api.admin.listStudents(),
      api.admin.listQuestions(),
      api.admin.analytics(),
    ])
      .then(([s, q, a]) => {
        setStudents(s);
        setQuestions(q);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  return (
    <div className="min-h-screen bg-paper">
      <header className="admin-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="icon-button">
            →
          </button>

          <div>
            <b>لوحة الإدارة</b>
            <p>تحكم كامل بالمحتوى والأداء</p>
          </div>
        </div>

        <button onClick={reload} className="top-link">
          تحديث البيانات ↻
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <nav className="admin-tabs">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={tab === k ? 'active' : ''}
            >
              {l}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="py-20 text-center text-muted">
            جارِ تحميل لوحة التحكم...
          </div>
        ) : (
          <>
            {tab === 'overview' && <Overview analytics={analytics} />}

            {tab === 'students' && (
              <Students
                students={students}
                reload={reload}
                showForm={showStudent}
                setShowForm={setShowStudent}
              />
            )}

            {tab === 'questions' && (
              <Questions questions={questions} reload={reload} />
            )}

            {tab === 'media' && <Media />}
          </>
        )}
      </main>
    </div>
  );
}

function Overview({ analytics }: { analytics: Analytics | null }) {
  if (!analytics) return null;

  const max = Math.max(
    ...Object.values(analytics.questions.byCategory),
    1
  );

  return (
    <section className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['الطلاب', analytics.students.total, ''],
          ['النشطون', analytics.students.active, 'brand'],
          ['الأسئلة', analytics.questions.total, 'signs'],
          ['نسبة النجاح', `${analytics.exams.passRate}%`, 'exam'],
        ].map(([l, v, c]) => (
          <div className="stat-card" key={l as string}>
            <p>{l}</p>

            <strong
              className={
                c === 'brand'
                  ? 'text-brand'
                  : c === 'signs'
                    ? 'text-signs'
                    : c === 'exam'
                      ? 'text-exam'
                      : ''
              }
            >
              {v}
            </strong>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="admin-card">
          <div className="card-title">
            <div>
              <p>توزيع بنك الأسئلة</p>
              <b>حسب القسم</b>
            </div>
          </div>

          <div className="bars">
            {Object.entries(analytics.questions.byCategory).map(
              ([k, v]) => (
                <div className="bar-row" key={k}>
                  <span>
                    {k === 'Ser'
                      ? 'قواعد السير'
                      : k === 'Ishara'
                        ? 'الإشارات'
                        : 'الميكانيك'}
                  </span>

                  <div>
                    <i
                      style={{
                        width: `${(v / max) * 100}%`,
                      }}
                    />
                  </div>

                  <b>{v}</b>
                </div>
              )
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="card-title">
            <div>
              <p>الاختبارات</p>
              <b>ملخص الأداء</b>
            </div>
          </div>

          <div className="mini-metrics">
            <div>
              <strong>{analytics.exams.total}</strong>
              <span>اختبار مكتمل</span>
            </div>

            <div>
              <strong>{analytics.exams.averageScore}</strong>
              <span>متوسط الإجابات</span>
            </div>

            <div>
              <strong>{analytics.auth.successful}</strong>
              <span>دخول ناجح</span>
            </div>

            <div>
              <strong>{analytics.auth.failed}</strong>
              <span>محاولة فاشلة</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="card-title">
          <div>
            <p>أكثر الأسئلة نشاطاً</p>
            <b>مؤشر دقة الإجابة</b>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>السؤال</th>
                <th>المحاولات</th>
                <th>الدقة</th>
              </tr>
            </thead>

            <tbody>
              {analytics.topQuestions.slice(0, 8).map((q) => (
                <tr key={q.questionId}>
                  <td>{q.text}</td>
                  <td>{q.attempts}</td>
                  <td>
                    <span className="accuracy-pill">
                      {q.accuracy}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Students({
  students,
  reload,
  showForm,
  setShowForm,
}: {
  students: Student[];
  reload: () => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      students.filter((s) =>
        (s.fullName + ' ' + s.userName)
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [students, search]
  );

  async function act(fn: () => Promise<unknown>) {
    await fn();
    reload();
  }

  return (
    <section>
      <div className="toolbar">
        <div>
          <p className="eyebrow">إدارة الحسابات</p>
          <h1>الطلاب</h1>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="primary-cta"
        >
          {showForm ? 'إغلاق' : '＋ إضافة طالب'}
        </button>
      </div>

      {showForm && (
        <CreateStudentForm
          onCreated={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث بالاسم أو اسم المستخدم..."
        className="admin-search"
      />

      <div className="admin-card mt-4">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الحالة</th>
                <th>الجهاز</th>
                <th>الصلاحية</th>
                <th>الاختبارات</th>
                <th>إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.fullName}</b>
                    <small dir="ltr">{s.userName}</small>
                  </td>

                  <td>
                    <span
                      className={`status ${s.isActive ? 'on' : 'off'}`}
                    >
                      {s.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </td>

                  <td>
                    {s.deviceBound ? 'مرتبط' : 'غير مرتبط'}
                  </td>

                  <td>
                    {s.accessExpiresAt
                      ? new Date(
                          s.accessExpiresAt
                        ).toLocaleDateString('ar-SY')
                      : 'دائم'}
                  </td>

                  <td>
                    <b>{s.attemptCount}</b>
                    <small>{s.passCount} ناجح</small>
                  </td>

                  <td>
                    <div className="action-row">
                      <button
                        onClick={() =>
                          act(
                            () =>
                              api.admin.setStatus(
                                s.id,
                                !s.isActive
                              )
                          )
                        }
                      >
                        {s.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>

                      <button
                        onClick={() =>
                          act(() => api.admin.resetDevice(s.id))
                        }
                      >
                        إعادة الجهاز
                      </button>

                      <button
                        className="danger"
                        onClick={() => {
                          if (
                            confirm(
                              `حذف حساب ${s.fullName}؟`
                            )
                          ) {
                            act(() =>
                              api.admin.deleteStudent(s.id)
                            );
                          }
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CreateStudentForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [userName, setUserName] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [days, setDays] = useState('90');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    setBusy(true);
    setError('');

    try {
      await api.admin.createStudent({
        userName,
        fullName,
        password,
        accessDays: days ? Number(days) : null,
      });

      onCreated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'تعذر الحفظ'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="admin-card form-grid">
      <input
        placeholder="الاسم الكامل"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <input
        placeholder="اسم المستخدم"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        required
        dir="ltr"
      />

      <input
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        dir="ltr"
      />

      <input
        placeholder="مدة الصلاحية بالأيام"
        value={days}
        onChange={(e) => setDays(e.target.value)}
        type="number"
      />

      <button
        disabled={busy}
        className="primary-cta"
      >
        {busy ? 'جارٍ الحفظ...' : 'حفظ الحساب'}
      </button>

      {error && (
        <p className="text-exam text-sm">
          {error}
        </p>
      )}
    </form>
  );
}

function Questions({
  questions,
  reload,
}: {
  questions: Question[];
  reload: () => void;
}) {
  const [editing, setEditing] = useState<Question | null>(
    null
  );

  const [search, setSearch] = useState('');

  const filtered = questions.filter(
    (q) =>
      q.text.includes(search) ||
      String(q.id).includes(search)
  );

  return (
    <section>
      <div className="toolbar">
        <div>
          <p className="eyebrow">محرر المحتوى</p>
          <h1>الأسئلة</h1>
        </div>

        <button
          className="primary-cta"
          onClick={() =>
            setEditing({
              id: 0,
              category: 'Ser',
              text: '',
              options: ['', '', '', ''],
              correctAnswerIndex: 0,
              explanation: '',
              imageUrl: '',
              diagramType: null,
              diagramUrl: '',
              diagramTitle: '',
              diagramDescription: '',
            })
          }
        >
          ＋ إضافة سؤال
        </button>
      </div>

      <input
        className="admin-search"
        placeholder="ابحث عن سؤال..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="admin-card mt-4">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>السؤال</th>
                <th>القسم</th>
                <th>الصورة</th>
                <th>إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((q) => (
                <tr key={q.id}>
                  <td>{q.id}</td>

                  <td>
                    <b>{q.text}</b>
                  </td>

                  <td>{q.category}</td>

                  <td>
                    {q.imageUrl ? '✓' : '—'}
                  </td>

                  <td>
                    <div className="action-row">
                      <button
                        onClick={() => setEditing(q)}
                      >
                        تعديل
                      </button>

                      <button
                        className="danger"
                        onClick={async () => {
                          if (
                            confirm(
                              'حذف السؤال نهائياً؟'
                            )
                          ) {
                            await api.admin.deleteQuestion(
                              q.id
                            );

                            reload();
                          }
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <QuestionEditor
          initial={editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function QuestionEditor({
  initial,
  close,
  saved,
}: {
  initial: Question;
  close: () => void;
  saved: () => void;
}) {
  const [q, setQ] = useState<Question>(initial);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Question>) =>
    setQ((x) => ({ ...x, ...patch }));

  async function save() {
    setBusy(true);

    try {
      /*
       * FIX:
       * Question expects optional string values.
       * Do not send null for imageUrl.
       */
      const payload = {
        category: q.category,
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation || '',
        imageUrl: q.imageUrl || undefined,
        diagramType: q.diagramType || undefined,
        diagramUrl: q.diagramUrl || undefined,
        diagramTitle: q.diagramTitle || undefined,
        diagramDescription:
          q.diagramDescription || undefined,
      };

      if (q.id) {
        await api.admin.updateQuestion(
          q.id,
          payload
        );
      } else {
        await api.admin.createQuestion(payload);
      }

      saved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={close}
    >
      <div
        className="editor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={close}
        >
          ×
        </button>

        <h2>محرر السؤال</h2>

        <div className="form-grid">
          <select
            value={q.category}
            onChange={(e) =>
              set({
                category:
                  e.target.value as QuestionCategory,
              })
            }
          >
            <option value="Ser">
              قواعد السير
            </option>

            <option value="Ishara">
              الإشارات
            </option>

            <option value="Mechanic">
              الميكانيك
            </option>
          </select>

          <textarea
            value={q.text}
            onChange={(e) =>
              set({ text: e.target.value })
            }
            placeholder="نص السؤال"
            rows={3}
          />

          {q.options.map((o, i) => (
            <input
              key={i}
              value={o}
              onChange={(e) =>
                set({
                  options: q.options.map(
                    (x, j) =>
                      j === i
                        ? e.target.value
                        : x
                  ),
                })
              }
              placeholder={`الإجابة ${i + 1}`}
            />
          ))}

          <label>
            رقم الإجابة الصحيحة

            <input
              type="number"
              min={0}
              max={3}
              value={q.correctAnswerIndex}
              onChange={(e) =>
                set({
                  correctAnswerIndex:
                    Number(e.target.value),
                })
              }
            />
          </label>

          <textarea
            value={q.explanation || ''}
            onChange={(e) =>
              set({
                explanation: e.target.value,
              })
            }
            placeholder="شرح الإجابة"
            rows={3}
          />

          <input
            value={q.imageUrl || ''}
            onChange={(e) =>
              set({
                imageUrl: e.target.value,
              })
            }
            placeholder="رابط الصورة /signs/sign_01.webp"
          />

          <div className="diagram-fields">
            <select
              value={q.diagramType || ''}
              onChange={(e) =>
                set({
                  diagramType: (
                    e.target.value || null
                  ) as
                    | 'svg'
                    | 'image'
                    | 'interactive'
                    | null,
                })
              }
            >
              <option value="">
                بدون Diagram
              </option>

              <option value="svg">
                SVG
              </option>

              <option value="image">
                صورة
              </option>

              <option value="interactive">
                تفاعلي
              </option>
            </select>

            <input
              value={q.diagramUrl || ''}
              onChange={(e) =>
                set({
                  diagramUrl: e.target.value,
                })
              }
              placeholder="رابط التوضيح"
            />

            <input
              value={q.diagramTitle || ''}
              onChange={(e) =>
                set({
                  diagramTitle:
                    e.target.value,
                })
              }
              placeholder="عنوان التوضيح"
            />

            <textarea
              value={q.diagramDescription || ''}
              onChange={(e) =>
                set({
                  diagramDescription:
                    e.target.value,
                })
              }
              placeholder="وصف التوضيح"
              rows={2}
            />
          </div>

          <button
            onClick={save}
            disabled={busy}
            className="primary-cta"
          >
            {busy
              ? 'جارٍ الحفظ...'
              : 'حفظ السؤال'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Media() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function optimize(file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('الملف ليس صورة');
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new Error(
        'حجم الصورة الأصلي أكبر من 8MB'
      );
    }

    if (
      file.type === 'image/svg+xml' ||
      file.type === 'image/webp'
    ) {
      return file;
    }

    const bitmap = await createImageBitmap(file);

    const scale = Math.min(
      1,
      1280 /
        Math.max(
          bitmap.width,
          bitmap.height
        )
    );

    const canvas =
      document.createElement('canvas');

    canvas.width = Math.max(
      1,
      Math.round(bitmap.width * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(bitmap.height * scale)
    );

    canvas
      .getContext('2d')!
      .drawImage(
        bitmap,
        0,
        0,
        canvas.width,
        canvas.height
      );

    const blob =
      await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          'image/webp',
          0.84
        )
      );

    if (!blob) {
      throw new Error(
        'تعذر ضغط الصورة'
      );
    }

    return new File(
      [blob],
      file.name.replace(
        /\.[^.]+$/,
        ''
      ) + '.webp',
      {
        type: 'image/webp',
      }
    );
  }

  async function onFile(file?: File) {
    if (!file) return;

    setBusy(true);
    setMessage(
      'جارٍ ضغط الصورة ورفعها...'
    );

    try {
      const optimized =
        await optimize(file);

      const r =
        await api.admin.uploadMedia(
          optimized
        );

      setMessage(
        `تم الرفع: ${r.url} • ${Math.round(
          r.size / 1024
        )}KB`
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'تعذر رفع الصورة'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="toolbar">
        <div>
          <p className="eyebrow">
            Media pipeline
          </p>

          <h1>إدارة الصور</h1>
        </div>

        <label className="primary-cta cursor-pointer">
          ＋ رفع صورة

          <input
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) =>
              onFile(
                e.target.files?.[0]
              )
            }
          />
        </label>
      </div>

      <div className="admin-card upload-zone">
        <div className="upload-icon">
          ↥
        </div>

        <h2>
          ارفع صورة وسيتم تحسينها قبل إرسالها
        </h2>

        <p>
          PNG/JPG يتم تحويلها إلى WebP
          بحد أقصى 1280px. SVG وWebP
          تحفظ كما هي.
        </p>

        {busy && (
          <div className="mt-4 text-brand">
            جارٍ المعالجة...
          </div>
        )}

        {message && (
          <div className="mt-4 text-muted">
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
```
