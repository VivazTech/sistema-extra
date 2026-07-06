
import React from 'react';
import ReactDOM from 'react-dom/client';
import { bootstrapPasswordRecoveryRoute } from './utils/authRecoveryRedirect';
import App from './App';

// Antes do React: corrigir hash de recovery do Supabase para rota do HashRouter
bootstrapPasswordRecoveryRoute();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
