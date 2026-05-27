import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vendas from './pages/Vendas';
import Estoque from './pages/Estoque';
import Cobertura from './pages/Cobertura';
import Reposicao from './pages/Reposicao';
import Produto from './pages/Produto';
import Alertas from './pages/Alertas';
import Sellout from './pages/Sellout';
import Planilha from './pages/Planilha';
import './index.css';
import { CompanyProvider } from './contexts/CompanyContext.jsx';
import { DataProvider } from './contexts/DataContext.jsx';

function App() {
  return (
    <DataProvider>
      <CompanyProvider>
        <BrowserRouter>
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
            </Route>
          </Routes>
        </BrowserRouter>
      </CompanyProvider>
    </DataProvider>
  );
}

export default App;
