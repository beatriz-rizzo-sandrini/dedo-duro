import React from 'react';
import Select from 'react-select';
import { useCompany } from '../contexts/CompanyContext.jsx';

export default function CompanySelector() {
  const { selectedCompany, setSelectedCompany } = useCompany();

  const options = [
    { value: 'TODAS', label: 'Todas' },
    { value: 'SANDRINI', label: 'Sandrini' },
    { value: 'BUY CLOCK', label: 'Buy Clock' }
  ];

  const customStyles = {
    control: (base) => ({
      ...base,
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      minHeight: '42px',
      fontSize: '14px',
      fontWeight: 600,
      color: '#1e293b',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#cbd5e1'
      }
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '14px',
      fontWeight: 500,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f1f5f9' : 'white',
      color: state.isSelected ? 'white' : '#1e293b',
      '&:active': {
        backgroundColor: '#3b82f6'
      }
    })
  };

  return (
    <div style={{ minWidth: '180px' }}>
      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Empresa</label>
      <Select
        options={options}
        value={options.find(opt => opt.value === selectedCompany)}
        onChange={opt => setSelectedCompany(opt.value)}
        styles={customStyles}
        isSearchable={false}
        classNamePrefix="react-select"
      />
    </div>
  );
}
