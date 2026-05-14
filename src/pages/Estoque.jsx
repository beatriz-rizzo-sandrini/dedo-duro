import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, ChevronLeft, ChevronRight, Package, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet } from 'lucide-react';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { getLatestDates } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';

export default function Estoque() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const estoqueRows = data.estoque || [];
  const vendasRows = data.vendas || [];

  const [filtroLocal, setFiltroLocal] = useState('');
  const [busca, setBusca] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });

  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} />;
    return <ArrowDown size={14} />;
  };

  const locais = useMemo(() => {
    if (!estoqueRows) return [];
    const setLocais = new Set();
    estoqueRows.forEach(r => {
      const l = (r?.c?.[3]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (l) setLocais.add(l);
    });
    return Array.from(setLocais);
  }, [estoqueRows, selectedCompany]);

  const dadosProcessados = useMemo(() => {
    if (!estoqueRows) return { linhas: [], totalGeral: 0, dataEstoque: "", dataVendas: "" };

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);

    const skuToDesc = {};
    estoqueRows.forEach(r => {
      const sku = r?.c?.[1]?.v || "";
      const desc = r?.c?.[2]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });

    let totalGeral = 0;
    const agrupado = {};

    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[0]?.f || String(r?.c?.[0]?.v || "");
      // Corrigido: Filtra pela data para não somar histórico
      if (dataEstoque && dataStr !== dataEstoque) return;

      const sku = r?.c?.[1]?.v || "";
      let descricao = r?.c?.[2]?.v || "";
      const local = (r?.c?.[3]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const quantidade = r?.c?.[5]?.v || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (!descricao && skuToDesc[sku]) descricao = skuToDesc[sku];
      if (!sku && !descricao) return;
      if (!descricao) descricao = `SKU: ${sku}`;

      if (filtroLocal && local !== filtroLocal) return;

      totalGeral += quantidade;

      if (!agrupado[descricao]) {
        agrupado[descricao] = { descricao, total: 0, itens: [], skusArr: [] };
      }
      agrupado[descricao].total += quantidade;
      agrupado[descricao].itens.push({ sku, local, quantidade });
      agrupado[descricao].skusArr.push(sku);
    });

    let linhas = Object.values(agrupado);

    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      linhas = linhas.filter(l => {
        const descLower = (l.descricao || "").toLowerCase();
        const skusArray = l.skusArr.map(s => s.toLowerCase());
        
        return termos.every(termo => 
          descLower.includes(termo) || 
          skusArray.some(sku => sku.includes(termo))
        );
      });
    }

    if (sortConfig.key) {
      linhas.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return { linhas, totalGeral, dataEstoque, dataVendas };
  }, [estoqueRows, vendasRows, filtroLocal, busca, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.linhas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type) => {
    const headers = ["SKU", "Descrição", "Local", "Quantidade em Estoque"];
    const exportData = [];
    dadosProcessados.linhas.forEach(item => {
      const skuMap = {};
      item.itens.forEach(i => {
        const key = i.sku + "|" + i.local;
        if (!skuMap[key]) skuMap[key] = { sku: i.sku, local: i.local, qtd: 0 };
        skuMap[key].qtd += i.quantidade;
      });
      Object.values(skuMap).forEach(s => {
        exportData.push([s.sku, item.descricao, s.local, s.qtd]);
      });
    });
    handleExport(type, "Estoque_Consolidado", headers, exportData);
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filtroLocal, busca, selectedCompany]);

  if (loading) {
    return (
      <div className="header-main">
        <h1>Estoque Consolidado</h1>
        <div className="skeleton-loader" style={{ height: '80px', width: '100%', marginBottom: '24px' }}></div>
        <div className="skeleton-loader" style={{ height: '400px', width: '100%' }}></div>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'red' }}>Erro ao carregar estoque: {error}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Estoque Consolidado</h1>
          <p>Visão geral dos produtos em armazém</p>
          <HeaderDates dataEstoque={dadosProcessados.dataEstoque} dataVendas={dadosProcessados.dataVendas} />
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
            <Package size={24} />
            <div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.9 }}>TOTAL EM ESTOQUE</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{dadosProcessados.totalGeral.toLocaleString('pt-BR')}</div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="btn-padrao" onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}>
              <Download size={18} /> Exportar
            </button>
            <AnimatePresence>
              {isExportMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', minWidth: '150px' }}
                >
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => { handleExportData('csv'); setIsExportMenuOpen(false); }}>
                    <FileText size={16} color="#64748b" /> CSV
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => { handleExportData('xlsx'); setIsExportMenuOpen(false); }}>
                    <FileSpreadsheet size={16} color="#10b981" /> Excel (XLSX)
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => { handleExportData('pdf'); setIsExportMenuOpen(false); }}>
                    <FileText size={16} color="#ef4444" /> PDF
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="filters-container">
        <CompanySelector />
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>PESQUISAR (SKU OU DESCRIÇÃO)</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="input-padrao" 
              style={{ width: '100%', paddingLeft: '42px' }}
              placeholder="Digite para buscar..." 
              value={busca} 
              onChange={e => setBusca(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL</label>
          <Select 
            options={[
              { value: '', label: 'Todos' },
              ...locais.map(l => ({ value: l, label: toTitleCase(l) }))
            ]}
            value={{ value: filtroLocal, label: filtroLocal ? toTitleCase(filtroLocal) : 'Todos' }}
            onChange={opt => setFiltroLocal(opt.value)}
            isSearchable={true}
            placeholder="Todos os Locais"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('descricao')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição do Produto {getSortIcon('descricao')}</div>
            </th>
            <th onClick={() => requestSort('total')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total em Estoque {getSortIcon('total')}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhasPaginadas.map((prod, idx) => {
            const isExpanded = expandedId === prod.descricao;
            return (
              <React.Fragment key={idx}>
                <tr style={{ cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'transparent' }} onClick={() => setExpandedId(isExpanded ? null : prod.descricao)}>
                  <td style={{ fontWeight: 600 }}>{toTitleCase(prod.descricao)}</td>
                  <td style={{ fontWeight: 800 }}>{prod.total.toLocaleString('pt-BR')}</td>
                </tr>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <td colSpan={2} style={{ padding: 0 }}>
                        <div style={{ padding: '16px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <table style={{ width: '100%', fontSize: '13px' }}>
                            <tbody>
                              {prod.itens.map((item, i) => (
                                <tr key={i}>
                                  <td style={{ padding: '8px 0', color: '#64748b' }}>
                                    {filtroLocal ? `SKU: ` : `SKU: ${item.sku} | Local: `}
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{filtroLocal ? item.sku : item.local}</span>
                                  </td>
                                  <td style={{ padding: '8px 0', width: '100px' }}>{item.quantidade.toLocaleString('pt-BR')} peças</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            )
          })}
          {linhasPaginadas.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nenhum dado encontrado para os filtros aplicados.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Mostrar 
          <select 
            className="input-padrao" 
            style={{ width: 'auto', padding: '6px 30px 6px 12px' }} 
            value={itensPorPagina} 
            onChange={e => { setItensPorPagina(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={999999}>Todos</option>
          </select>
          linhas
        </div>

        {totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{ padding: '8px', borderRadius: '8px', background: currentPage === 1 ? '#e2e8f0' : 'white', border: '1px solid #cbd5e1', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={20} color={currentPage === 1 ? '#94a3b8' : '#0f172a'} />
            </button>
            
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
              Página {currentPage} de {totalPaginas}
            </span>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPaginas))} 
              disabled={currentPage === totalPaginas}
              style={{ padding: '8px', borderRadius: '8px', background: currentPage === totalPaginas ? '#e2e8f0' : 'white', border: '1px solid #cbd5e1', cursor: currentPage === totalPaginas ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={20} color={currentPage === totalPaginas ? '#94a3b8' : '#0f172a'} />
            </button>
          </div>
        )}
      </div>

    </motion.div>
  );
}
