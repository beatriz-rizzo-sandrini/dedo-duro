import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { RefreshCw } from 'lucide-react';

export default function HeaderDates({ dataEstoque, dataVendas }) {
  const { refetch } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('Erro ao forçar atualização:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!dataEstoque && !dataVendas) return null;

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
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
      <button 
        onClick={handleRefresh}
        disabled={isRefreshing}
        style={{
          background: 'none',
          border: 'none',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '4px',
          color: '#64748b',
          transition: 'all 0.2s',
          outline: 'none',
          marginLeft: '4px'
        }}
        title="Forçar atualização dos dados"
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <RefreshCw 
          size={14} 
          style={{
            transform: isRefreshing ? 'rotate(360deg)' : 'none',
            transition: isRefreshing ? 'transform 1s linear infinite' : 'none',
            animation: isRefreshing ? 'spin-dates 1s linear infinite' : 'none'
          }} 
        />
      </button>
      <style>{`
        @keyframes spin-dates {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

