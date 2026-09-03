import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import './index.css';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { CompanyProvider } from './contexts/CompanyContext.jsx';
import { DataProvider } from './contexts/DataContext.jsx';

// Code-splitting lazy loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Vendas = lazy(() => import('./pages/Vendas'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Cobertura = lazy(() => import('./pages/Cobertura'));
const Reposicao = lazy(() => import('./pages/Reposicao'));
const Produto = lazy(() => import('./pages/Produto'));
const Alertas = lazy(() => import('./pages/Alertas'));
const Sellout = lazy(() => import('./pages/Sellout'));
const Planilha = lazy(() => import('./pages/Planilha'));
const Login = lazy(() => import('./pages/Login'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Cadastro = lazy(() => import('./pages/Cadastro'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Documentacao = lazy(() => import('./pages/Documentacao'));

const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    color: '#94a3b8'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid rgba(59, 130, 246, 0.2)',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '14px', fontWeight: 500 }}>Carregando página...</span>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function AppContent() {
  const { user } = useAuth();

  if (!user || user.status === 'novo') {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="cobertura" element={<Cobertura />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="produto" element={<Produto />} />
            <Route path="reposicao" element={<Reposicao />} />
            <Route path="sellout" element={<Sellout />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="planilha" element={<Planilha />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="cadastro" element={<Cadastro />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="documentacao" element={<Documentacao />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <CompanyProvider>
          <AppContent />
        </CompanyProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;

