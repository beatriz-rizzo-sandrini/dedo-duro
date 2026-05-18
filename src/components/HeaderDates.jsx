import React from 'react';

export default function HeaderDates({ dataEstoque, dataVendas }) {
  if (!dataEstoque && !dataVendas) return null;

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
      {dataEstoque && (
        <span style={{
          background: '#e2e8f0',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#475569',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}>
          📦 Estoque: {dataEstoque}
        </span>
      )}
      {dataVendas && (
        <span style={{
          background: '#e2e8f0',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#475569',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}>
          🛒 Vendas: {dataVendas}
        </span>
      )}
    </div>
  );
}
