import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const { user } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState(() => {
    return localStorage.getItem('selectedCompany') || 'TODAS';
  });

  // Force company update when user is logged in and restricted
  useEffect(() => {
    if (user && user.empresa !== 'TODAS') {
      setSelectedCompany(user.empresa);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('selectedCompany', selectedCompany);
  }, [selectedCompany]);

  const changeSelectedCompany = (company) => {
    if (user && user.empresa !== 'TODAS') {
      // Ignore any attempt to change company if restricted
      return;
    }
    setSelectedCompany(company);
  };

  const value = {
    selectedCompany,
    setSelectedCompany: changeSelectedCompany,
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

