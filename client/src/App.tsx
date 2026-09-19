import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
const Login=lazy(()=>import('./pages/Login')); const Home=lazy(()=>import('./pages/Home')); const Study=lazy(()=>import('./pages/Study')); const Models=lazy(()=>import('./pages/Models')); const Exam=lazy(()=>import('./pages/Exam')); const Result=lazy(()=>import('./pages/Result')); const AdminDashboard=lazy(()=>import('./pages/admin/AdminDashboard'));

function ScrollToTop(){
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App(){return <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">جارِ تحميل الصفحة...</div>}><ScrollToTop/><Routes><Route path="/login" element={<Login/>}/><Route path="/" element={<ProtectedRoute><Home/></ProtectedRoute>}/><Route path="/study/:category" element={<ProtectedRoute><Study/></ProtectedRoute>}/><Route path="/models" element={<ProtectedRoute><Models/></ProtectedRoute>}/><Route path="/exam/:modelId" element={<ProtectedRoute><Exam/></ProtectedRoute>}/><Route path="/result" element={<ProtectedRoute><Result/></ProtectedRoute>}/><Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard/></ProtectedRoute>}/></Routes></Suspense>}
