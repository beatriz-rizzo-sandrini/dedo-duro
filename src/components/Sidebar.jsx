import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Layers, Box, Tags, Truck, Bell, Activity, ChevronLeft, ChevronRight, Menu, X, FileSpreadsheet, Users, LogOut, Sun, Moon, FileEdit } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Sidebar.css';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { selectedCompany, setSelectedCompany } = useCompany();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Fecha ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const links = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/vendas", icon: <TrendingUp size={20} />, label: "Vendas" },
    { to: "/cobertura", icon: <Layers size={20} />, label: "Cobertura" },
    { to: "/estoque", icon: <Box size={20} />, label: "Estoque" },
    { to: "/produto", icon: <Tags size={20} />, label: "Produto" },
    { to: "/reposicao", icon: <Truck size={20} />, label: "Reposição" },
    { to: "/sellout", icon: <Activity size={20} />, label: "Sellout" },
    { to: "/alertas", icon: <Bell size={20} />, label: "Alertas" },
    { to: "/planilha", icon: <FileSpreadsheet size={20} />, label: "Pedidos" },
    { to: "/cadastro", icon: <FileEdit size={20} />, label: "Cadastro" },
  ];

  // Adiciona a página de Usuários para administradores e gestores
  if (user && (user.role === 'admin' || user.role === 'gestor')) {
    links.push({ to: "/usuarios", icon: <Users size={20} />, label: "Usuários" });
  }

  return (
    <>
      {/* Botão hambúrguer — só aparece no mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay escuro quando menu mobile está aberto */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar principal */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          {isCollapsed
            ? <span className="logo-text-small">DD</span>
            : <span className="logo-text">Dedo Duro</span>
          }
          {/* Botão fechar no mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                  title={isCollapsed ? link.label : ""}
                >
                  {link.icon}
                  <span className="nav-label">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Theme and Logout Actions */}
        <div style={{ padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '8px' }}>
          <button 
            onClick={toggleTheme}
            className="nav-link" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '10px 14px'
            }}
            title={isCollapsed ? "Alternar Tema" : ""}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span className="nav-label">{theme === 'light' ? "Modo Escuro" : "Modo Claro"}</span>
          </button>

          <button 
            onClick={logout}
            className="nav-link" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left',
              color: 'var(--sidebar-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '10px 14px'
            }}
            title={isCollapsed ? "Sair" : ""}
          >
            <LogOut size={20} />
            <span className="nav-label">Sair</span>
          </button>
        </div>

        {/* Botão colapsar — só no desktop */}
        <button className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </aside>
    </>
  );
}

