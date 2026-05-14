import React, { createContext, useContext, useState, useEffect } from 'react';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [selectedCompany, setSelectedCompany] = useState(() => {
    return localStorage.getItem('selectedCompany') || 'TODAS';
  });

  useEffect(() => {
    localStorage.setItem('selectedCompany', selectedCompany);
  }, [selectedCompany]);

  const value = {
    selectedCompany,
    setSelectedCompany,
    isSandrini: selectedCompany === 'SANDRINI' || selectedCompany === 'TODAS',
    isBuyClock: selectedCompany === 'BUY CLOCK' || selectedCompany === 'TODAS',
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany deve ser usado dentro de um CompanyProvider');
  }
  return context;
}
