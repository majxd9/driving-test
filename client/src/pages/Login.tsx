import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(userName, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center text-3xl font-bold mb-4">
            ر
          </div>
          <h1 className="text-xl font-bold text-ink">رخصتي</h1>
          <p className="text-sm text-muted mt-1">اختبار النظري لرخصة قيادة السيارات</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl2 border border-line p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-ink text-center mb-2">
            تسجيل الدخول
          </h2>

          <div>
            <label className="block text-sm text-muted mb-1.5">اسم المستخدم</label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:border-brand transition-colors"
              placeholder="مثال: ahmad2026"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">كلمة المرور</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:border-brand transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-exam-soft text-exam text-sm px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand text-white font-semibold py-3.5 transition-opacity disabled:opacity-60 active:opacity-90"
          >
            {busy ? '...جارِ الدخول' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
