import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AuthLog, ExamAttempt, Student } from '../../types';

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    Success: 'دخول ناجح',
    WrongPassword: 'كلمة مرور خاطئة',
    DeviceMismatch: 'محاولة من جهاز مختلف',
    AccountDisabled: 'الحساب معطل',
    AccessExpired: 'انتهاء الصلاحية',
    UserNotFound: 'المستخدم غير موجود',
    LockedOut: 'الحساب مقفل مؤقتاً',
  };
  return labels[reason] || reason;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ar-SY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function StudentAuditModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([api.admin.getLogs(student.id), api.admin.getAttempts(student.id)])
      .then(([nextLogs, nextAttempts]) => {
        if (!active) return;
        setLogs(nextLogs);
        setAttempts(nextAttempts);
      })
      .catch(() => {
        if (!active) return;
        setLogs([]);
        setAttempts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [student.id]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="student-audit-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="إغلاق">×</button>

        <div className="student-audit-head">
          <div>
            <p className="eyebrow">سجل الحساب</p>
            <h2>{student.fullName}</h2>
            <span dir="ltr">@{student.userName}</span>
          </div>
          <div className={student.deviceBound ? 'status on' : 'status off'}>
            {student.deviceBound ? 'جهاز مرتبط' : 'غير مرتبط'}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted">جارِ تحميل السجل...</div>
        ) : (
          <div className="student-audit-grid">
            <div className="admin-card">
              <div className="card-title">
                <div>
                  <p>آخر المحاولات</p>
                  <b>تسجيلات الدخول</b>
                </div>
                <span className="accuracy-pill">{logs.length}</span>
              </div>

              <div className="audit-list">
                {logs.length === 0 ? (
                  <p className="text-muted text-sm">لا توجد سجلات لهذا الحساب.</p>
                ) : logs.map((log) => (
                  <article className="audit-item" key={log.id}>
                    <div>
                      <strong className={log.success ? 'text-brand' : 'text-exam'}>
                        {reasonLabel(log.reason)}
                      </strong>
                      <p>{formatDate(log.timestamp)}</p>
                    </div>
                    <div className="audit-meta" dir="ltr">
                      <span>{log.ipAddress || 'IP غير متاح'}</span>
                      <small>{log.userAgent || 'المتصفح غير متاح'}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <div>
                  <p>السجل التعليمي</p>
                  <b>آخر الاختبارات</b>
                </div>
                <span className="accuracy-pill">{attempts.length}</span>
              </div>

              <div className="audit-list">
                {attempts.length === 0 ? (
                  <p className="text-muted text-sm">لا توجد اختبارات محفوظة.</p>
                ) : attempts.slice(0, 12).map((attempt) => (
                  <article className="audit-item" key={attempt.id}>
                    <div>
                      <strong>اختبار #{attempt.modelId}</strong>
                      <p>{formatDate(attempt.createdAt)}</p>
                    </div>
                    <div className="audit-score">
                      <b>{attempt.correct}/{attempt.total}</b>
                      <small>أجاب {attempt.answered}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
