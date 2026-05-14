import React from 'react';

export default function HeaderDates({ dataEstoque, dataVendas }) {
  const badgeStyle = { 
    background: '#e2e8f0', 
    padding: '2px 8px', 
    borderRadius: '4px', 
    marginLeft: '8px', 
    fontSize: '12px', 
    fontWeight: '600', 
    color: '#475569',
    display: 'inline-block',
    marginTop: '4px'
  };

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
      {dataEstoque && (
        <span style={badgeStyle}>
          Última atualização de estoque: {dataEstoque}
        </span>
      )}
      {dataVendas && (
        <span style={badgeStyle}>
          Última atualização de vendas: {dataVendas}
        </span>
      )}
    </div>
  );
}
