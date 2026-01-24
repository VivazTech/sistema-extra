
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
import TestSupabase from './pages/TestSupabase';
import ExtraBank from './pages/ExtraBank';
import ExtraBankForm from './pages/ExtraBankForm';
import ExtraSaldo from './pages/ExtraSaldo';

const PrivateRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" />;
  
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/solicitacoes" element={<PrivateRoute><Requests /></PrivateRoute>} />
      <Route path="/portaria" element={<PrivateRoute><Portaria /></PrivateRoute>} />
      <Route path="/test-supabase" element={<PrivateRoute><TestSupabase /></PrivateRoute>} />
      <Route path="/admin/cadastros" element={<PrivateRoute roles={['ADMIN']}><AdminCatalogs /></PrivateRoute>} />
      <Route path="/admin/saldo-extras" element={<PrivateRoute roles={['ADMIN', 'MANAGER']}><ExtraSaldo /></PrivateRoute>} />
      <Route path="/admin/extras" element={<PrivateRoute roles={['ADMIN']}><ExtraBank /></PrivateRoute>} />
      <Route path="/banco-extras" element={<ExtraBankForm />} />
      <Route path="/tv" element={<TVDashboard />} />
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
