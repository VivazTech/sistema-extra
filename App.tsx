
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessProvider, useAccess } from './context/AccessContext';
import { AccessPageKey } from './types';
import { ExtraProvider } from './context/ExtraContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import TVDashboard from './pages/TVDashboard';
import Portaria from './pages/Portaria';
import AdminCatalogs from './pages/AdminCatalogs';
import AdminUsers from './pages/AdminUsers';
import TestSupabase from './pages/TestSupabase';
import ExtraBank from './pages/ExtraBank';
import ExtraBankForm from './pages/ExtraBankForm';
import ExtraSaldo from './pages/ExtraSaldo';
import Reports from './pages/Reports';
import PDFPreview from './pages/PDFPreview';

const PrivateRoute: React.FC<{ children: React.ReactNode; page?: AccessPageKey }> = ({ children, page }) => {
  const { isAuthenticated, user } = useAuth();
  const { hasPageAccess, getFirstAccessiblePath } = useAccess();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (page && user && !hasPageAccess(user.role, page)) {
    return <Navigate to={getFirstAccessiblePath(user.role)} />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<PrivateRoute page="dashboard"><Dashboard /></PrivateRoute>} />
      <Route path="/solicitacoes" element={<PrivateRoute page="requests"><Requests /></PrivateRoute>} />
      <Route path="/portaria" element={<PrivateRoute page="portaria"><Portaria /></PrivateRoute>} />
      <Route path="/test-supabase" element={<PrivateRoute page="test"><TestSupabase /></PrivateRoute>} />
      <Route path="/preview-pdf" element={<PrivateRoute><PDFPreview /></PrivateRoute>} />
      <Route path="/admin/cadastros" element={<PrivateRoute page="catalogs"><AdminCatalogs /></PrivateRoute>} />
      <Route path="/admin/usuarios" element={<PrivateRoute page="users"><AdminUsers /></PrivateRoute>} />
      <Route path="/admin/saldo-extras" element={<PrivateRoute page="saldo"><ExtraSaldo /></PrivateRoute>} />
      <Route path="/admin/extras" element={<PrivateRoute page="extras"><ExtraBank /></PrivateRoute>} />
      <Route path="/relatorios" element={<PrivateRoute page="reports"><Reports /></PrivateRoute>} />
      <Route path="/banco-extras" element={<ExtraBankForm />} />
      <Route path="/tv" element={<PrivateRoute page="tv"><TVDashboard /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ExtraProvider>
        <AccessProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AccessProvider>
      </ExtraProvider>
    </AuthProvider>
  );
};

export default App;
