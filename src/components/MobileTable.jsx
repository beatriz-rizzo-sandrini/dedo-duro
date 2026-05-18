import React from 'react';
import './MobileTable.css';

/**
 * MobileTable — tabela responsiva que vira cards no mobile.
 *
 * Props:
 *  - columns: [{ label, key, render?, rawLabel?, onSort?, mobileHide? }]
 *  - rows: array de dados
 *  - onRowClick?: (row) => void
 *  - isExpanded?: (row) => bool
 *  - renderExpanded?: (row) => ReactNode        — conteúdo expandido no MOBILE (cards)
 *  - renderExpandedDesktop?: (row) => ReactNode — conteúdo expandido no DESKTOP (tabela original)
 *    Se renderExpandedDesktop não for passado, usa renderExpanded em ambos.
 *  - getRowStyle?: (row) => object
 *  - emptyMessage?: string
 *  - keyExtractor: (row, index) => string
 */
export default function MobileTable({
  columns,
  rows,
  onRowClick,
  isExpanded,
  renderExpanded,
  renderExpandedDesktop,
  getRowStyle,
  emptyMessage = 'Nenhum dado encontrado.',
  keyExtractor,
}) {
  const expandedDesktop = renderExpandedDesktop || renderExpanded;

  return (
    <div className="mobile-table-wrapper">
      {/* Versão desktop: tabela normal */}
      <table className="data-table desktop-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} onClick={col.onSort} style={col.onSort ? { cursor: 'pointer' } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const key = keyExtractor ? keyExtractor(row, idx) : idx;
            const expanded = isExpanded ? isExpanded(row) : false;
            return (
              <React.Fragment key={key}>
                <tr
                  style={{ ...(getRowStyle ? getRowStyle(row) : {}), cursor: onRowClick ? 'pointer' : 'default' }}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
                {expanded && expandedDesktop && (
                  <tr>
                    <td colSpan={columns.length} style={{ padding: 0 }}>
                      {expandedDesktop(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Versão mobile: cards */}
      <div className="mobile-cards">
        {rows.length === 0 && (
          <div className="mobile-empty">{emptyMessage}</div>
        )}
        {rows.map((row, idx) => {
          const key = keyExtractor ? keyExtractor(row, idx) : idx;
          const expanded = isExpanded ? isExpanded(row) : false;
          const rowStyle = getRowStyle ? getRowStyle(row) : {};
          // Usa a cor de fundo da linha como borda lateral do card
          const accentColor = rowStyle.background && rowStyle.background !== 'transparent' ? rowStyle.background : null;

          return (
            <div
              key={key}
              className={`mobile-card ${expanded ? 'expanded' : ''}`}
              style={accentColor ? { borderLeftColor: accentColor === '#fee2e2' ? '#ef4444' : accentColor === '#dcfce7' ? '#10b981' : accentColor === '#fef3c7' ? '#f59e0b' : '#3b82f6', borderLeftWidth: 4, borderLeftStyle: 'solid' } : {}}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col, colIdx) => {
                if (col.mobileHide) return null;
                const value = col.render ? col.render(row) : row[col.key];
                const isPrimary = colIdx === 0; // Primeira coluna é o título do card
                return (
                  <div key={col.key} className={`mobile-card-row ${isPrimary ? 'primary' : ''}`}>
                    {!isPrimary && <span className="mobile-label">{col.rawLabel || col.key}</span>}
                    <span className={`mobile-value ${isPrimary ? 'mobile-title' : ''}`}>{value}</span>
                  </div>
                );
              })}
              {expanded && renderExpanded && (
                <div className="mobile-card-expanded">
                  {renderExpanded(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
