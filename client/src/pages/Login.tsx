import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './login-v3.css';

export default function Login() {
  const { login } = useAuth(); const navigate = useNavigate();
  const [userName,setUserName]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
  async function handleSubmit(e:FormEvent){e.preventDefault();setError(null);setBusy(true);try{await login(userName.trim(),password);navigate('/')}catch(err){setError(err instanceof Error?err.message:'تعذر تسجيل الدخول. حاول مرة أخرى.')}finally{setBusy(false)}}
  return <main className="login-v3" dir="rtl"><div className="login-v3-glow login-v3-glow-one"/><div className="login-v3-glow login-v3-glow-two"/>
    <section className="login-v3-wrap">
      <div className="login-v3-brand"><div className="login-v3-logo">ر</div><div><strong>رخصتي</strong><span>منصة التدريب على القيادة</span></div></div>
      <div className="login-v3-card">
        <div className="login-v3-intro"><span className="login-v3-badge">دخول آمن</span><h1>أهلاً بك من جديد</h1><p>سجّل دخولك وتابع تدريبك من حيث توقفت.</p></div>
        <form onSubmit={handleSubmit} className="login-v3-form">
          <label><span>اسم المستخدم</span><input value={userName} onChange={e=>setUserName(e.target.value)} required autoComplete="username" autoFocus placeholder="أدخل اسم المستخدم"/></label>
          <label><span>كلمة المرور</span><input value={password} onChange={e=>setPassword(e.target.value)} type="password" required autoComplete="current-password" placeholder="أدخل كلمة المرور"/></label>
          {error&&<div className="login-v3-error" role="alert">{error}</div>}
          <button type="submit" disabled={busy} className="login-v3-submit">{busy?'جارِ تسجيل الدخول…':'تسجيل الدخول'}<span>←</span></button>
        </form>
        <div className="login-v3-footer"><span className="login-v3-dot"/><span>تجربة سريعة وآمنة للتدريب على القيادة.</span></div>
      </div>
      <p className="login-v3-bottom">رخصتي • تدريب أوضح • اختبار أسهل</p>
    </section>
  </main>;
}
