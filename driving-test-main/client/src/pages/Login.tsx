import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SiteGuide from '../components/SiteGuide';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(userName.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-background" aria-hidden="true"><span /><span /><span /></div>
      <div className="login-page">
        <div className="login-brand-side">
          <div className="brand-mark brand-mark-xl">ر</div>
          <span className="eyebrow">رخصتي • سورية</span>
          <h1>الطريق للرخصة<br /><strong>يبدأ من التدريب الصحيح.</strong></h1>
          <p>بنك أسئلة مرتب، صور واضحة، شرح بعد الإجابة، ونماذج تحاكي الاختبار خلال 15 دقيقة.</p>
          <div className="login-feature-grid">
            <div><strong>347+</strong><span>سؤال تدريبي</span></div>
            <div><strong>6</strong><span>نماذج اختبار</span></div>
            <div><strong>15</strong><span>دقيقة للنموذج</span></div>
          </div>
        </div>

        <div className="login-card-wrap">
          <form onSubmit={handleSubmit} className="login-card">
            <div className="login-card-head">
              <div>
                <span className="eyebrow">دخول آمن</span>
                <h2>أهلاً بك من جديد</h2>
                <p>أدخل بيانات الحساب للمتابعة إلى التدريب.</p>
              </div>
              <div className="login-mini-icon">↗</div>
            </div>

            <label className="field-label">اسم المستخدم
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                placeholder="مثال: ahmad2026"
                className="login-input"
              />
            </label>

            <label className="field-label">كلمة المرور
              <span className="password-wrap">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="login-input"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'إخفاء' : 'إظهار'}
                </button>
              </span>
            </label>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" disabled={busy} className="login-submit">
              {busy ? 'جارِ الدخول...' : <>الدخول إلى حسابي <span>←</span></>}
            </button>

            <p className="login-note">للحصول على بيانات الدخول أو المساعدة، تواصل مع المكتب.</p>
          </form>
        </div>
      </div>

      <div className="login-guide-float"><SiteGuide /></div>
      <div className="login-footer">الجمهورية العربية السورية • اختبار النظري لرخصة قيادة السيارات</div>
    </div>
  );
}
