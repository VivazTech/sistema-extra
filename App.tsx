
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExtraProvider } from './context/ExtraContext';
import Layout from './components/Layout';
import Login from './pages/Login';
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

const PrivateRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.role)) {
    if (user.role === 'PORTARIA' || user.role === 'VIEWER') return <Navigate to="/portaria" />;
    return <Navigate to="/" />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute roles={['ADMIN', 'MANAGER', 'LEADER']}><Dashboard /></PrivateRoute>} />
      <Route path="/solicitacoes" element={<PrivateRoute roles={['ADMIN', 'MANAGER', 'LEADER']}><Requests /></PrivateRoute>} />
      <Route path="/portaria" element={<PrivateRoute roles={['ADMIN', 'MANAGER', 'LEADER', 'VIEWER', 'PORTARIA']}><Portaria /></PrivateRoute>} />
      <Route path="/test-supabase" element={<PrivateRoute roles={['ADMIN', 'MANAGER', 'LEADER']}><TestSupabase /></PrivateRoute>} />
      <Route path="/admin/cadastros" element={<PrivateRoute roles={['ADMIN']}><AdminCatalogs /></PrivateRoute>} />
      <Route path="/admin/usuarios" element={<PrivateRoute roles={['ADMIN']}><AdminUsers /></PrivateRoute>} />
      <Route path="/admin/saldo-extras" element={<PrivateRoute roles={['ADMIN', 'MANAGER']}><ExtraSaldo /></PrivateRoute>} />
      <Route path="/admin/extras" element={<PrivateRoute roles={['ADMIN']}><ExtraBank /></PrivateRoute>} />
      <Route path="/relatorios" element={<PrivateRoute roles={['ADMIN', 'MANAGER', 'LEADER']}><Reports /></PrivateRoute>} />
      <Route path="/banco-extras" element={<ExtraBankForm />} />
      <Route path="/tv" element={<PrivateRoute roles={['ADMIN', 'MANAGER', 'LEADER', 'VIEWER']}><TVDashboard /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ExtraProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ExtraProvider>
    </AuthProvider>
  );
};

export default App;
