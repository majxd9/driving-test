import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RulesPage, TrafficSignsPage, DrivingTestSyriaPage, AboutPage, NotFoundPage } from './pages/PublicPages';

const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const PracticalInfo = lazy(() => import('./pages/PracticalInfo'));
const CarExplorer = lazy(() => import('./pages/CarExplorer'));
const Study = lazy(() => import('./pages/Study'));
const Models = lazy(() => import('./pages/Models'));
const Exam = lazy(() => import('./pages/Exam'));
const Result = lazy(() => import('./pages/Result'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted">
          جارِ تحميل الصفحة...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/traffic-signs" element={<TrafficSignsPage />} />
        <Route path="/driving-test-syria" element={<DrivingTestSyriaPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practical-info"
          element={
            <ProtectedRoute>
              <PracticalInfo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/car-viewer"
          element={
            <ProtectedRoute>
              <CarExplorer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/study/:category"
          element={
            <ProtectedRoute>
              <Study />
            </ProtectedRoute>
          }
        />
        <Route
          path="/models"
          element={
            <ProtectedRoute>
              <Models />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/:modelId"
          element={
            <ProtectedRoute>
              <Exam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result"
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
