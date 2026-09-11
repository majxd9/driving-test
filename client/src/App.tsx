import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Study from './pages/Study';
import Models from './pages/Models';
import Exam from './pages/Exam';
import Result from './pages/Result';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
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
    </Routes>
  );
}
