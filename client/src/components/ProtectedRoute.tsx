import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ContentProtection } from './ContentProtection';

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'Admin') return <Navigate to="/app" replace />;

  return adminOnly ? <>{children}</> : <ContentProtection studentName={user.fullName}>{children}</ContentProtection>;
}
