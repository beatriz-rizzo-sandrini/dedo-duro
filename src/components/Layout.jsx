import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarWidth = isCollapsed ? '80px' : '250px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main
        className="main-content"
        style={{
          marginLeft: sidebarWidth,
          padding: '40px',
          flex: 1,
          width: `calc(100vw - ${sidebarWidth})`,
          transition: 'margin-left 0.3s ease, width 0.3s ease',
        }}
      >
        <Outlet />
      </main>
      <style>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            width: 100vw !important;
            padding: 70px 16px 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
