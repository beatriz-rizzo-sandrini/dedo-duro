import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Layers, Box, Tags, Truck, Share2, Bell, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext.jsx';
import './Sidebar.css';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { selectedCompany, setSelectedCompany } = useCompany();
  const links = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/vendas", icon: <TrendingUp size={20} />, label: "Vendas" },
    { to: "/cobertura", icon: <Layers size={20} />, label: "Cobertura" },
    { to: "/estoque", icon: <Box size={20} />, label: "Estoque" },
    { to: "/produto", icon: <Tags size={20} />, label: "Produto" },
    { to: "/reposicao", icon: <Truck size={20} />, label: "Reposição" },
    { to: "/sellout", icon: <Activity size={20} />, label: "Sellout" },
    { to: "/alertas", icon: <Bell size={20} />, label: "Alertas" },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        {isCollapsed ? <span className="logo-text-small">DD</span> : <span className="logo-text">Dedo Duro</span>}
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
      <button className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </aside>
  );
}
