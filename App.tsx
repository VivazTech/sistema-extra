
import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessProvider, useAccess } from './context/AccessContext';
import { AccessPageKey } from './types';
import { ExtraProvider } from './context/ExtraContext';
import { ActionLogProvider } from './context/ActionLogContext';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
const TVDashboard = React.lazy(() => import('./pages/TVDashboard'));
const Portaria = React.lazy(() => import('./pages/Portaria'));
const PortariaPJ = React.lazy(() => import('./pages/PortariaPJ'));
const AdminCatalogs = React.lazy(() => import('./pages/AdminCatalogs'));
const AdminEscala = React.lazy(() => import('./pages/AdminEscala'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const TestSupabase = React.lazy(() => import('./pages/TestSupabase'));
const TestExtraRequestsOld = React.lazy(() => import('./pages/TestExtraRequestsOld'));
const ExtraBank = React.lazy(() => import('./pages/ExtraBank'));
const ExtraBankForm = React.lazy(() => import('./pages/ExtraBankForm'));
const ExtraSaldo = React.lazy(() => import('./pages/ExtraSaldo'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Graficos = React.lazy(() => import('./pages/Graficos'));
const PDFPreview = React.lazy(() => import('./pages/PDFPreview'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Logs = React.lazy(() => import('./pages/Logs'));

const BootFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
    Carregando...
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode; page?: AccessPageKey }> = ({ children, page }) => {
  const { isAuthenticated, user } = useAuth();
  const { hasPageAccess, getFirstAccessiblePath } = useAccess();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (page && user && !hasPageAccess(user.role, page)) {
    return <Navigate to={getFirstAccessiblePath(user.role)} />;
  }
  
  return (
    <Layout>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando...</div>}>
        {children}
      </Suspense>
    </Layout>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<PrivateRoute page="dashboard"><Dashboard /></PrivateRoute>} />
      <Route path="/solicitacoes" element={<PrivateRoute page="requests"><Requests /></PrivateRoute>} />
      <Route path="/portaria" element={<PrivateRoute page="portaria"><Portaria /></PrivateRoute>} />
      <Route path="/portaria-pj" element={<PrivateRoute page="portaria_pj"><PortariaPJ /></PrivateRoute>} />
      <Route path="/test-supabase" element={<PrivateRoute page="test"><TestSupabase /></PrivateRoute>} />
      <Route path="/test-extra-requests-old" element={<PrivateRoute><TestExtraRequestsOld /></PrivateRoute>} />
      <Route path="/preview-pdf" element={<PrivateRoute><PDFPreview /></PrivateRoute>} />
      <Route path="/admin/cadastros" element={<PrivateRoute page="catalogs"><AdminCatalogs /></PrivateRoute>} />
      <Route path="/admin/escala" element={<PrivateRoute page="escala"><AdminEscala /></PrivateRoute>} />
      <Route path="/admin/usuarios" element={<PrivateRoute page="users"><AdminUsers /></PrivateRoute>} />
      <Route path="/admin/logs" element={<PrivateRoute page="logs"><Logs /></PrivateRoute>} />
      <Route path="/admin/saldo-extras" element={<PrivateRoute page="saldo"><ExtraSaldo /></PrivateRoute>} />
      <Route path="/admin/extras" element={<PrivateRoute page="extras"><ExtraBank /></PrivateRoute>} />
      <Route path="/relatorios" element={<PrivateRoute page="reports"><Reports /></PrivateRoute>} />
      <Route path="/graficos" element={<PrivateRoute page="graficos"><Graficos /></PrivateRoute>} />
      <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
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
        <ActionLogProvider>
        <AccessProvider>
          <Router>
            <Suspense fallback={<BootFallback />}>
              <AppRoutes />
            </Suspense>
          </Router>
        </AccessProvider>
        </ActionLogProvider>
      </ExtraProvider>
    </AuthProvider>
  );
};

export default App;
