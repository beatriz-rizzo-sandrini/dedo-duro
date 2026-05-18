import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet } from 'lucide-react';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { getLatestDates } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_ESTOQUE, COL_VENDAS, COL_CAMINHO } from '../utils/sheetColumns';
import MobileTable from '../components/MobileTable';

export default function Cobertura() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const vendasRows = data.vendas || [];
  const estoqueRows = data.estoque || [];
  const caminhoRows = data.caminho || [];

  const [filtroLocal, setFiltroLocal] = useState([]);
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [expandedId, setExpandedId] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'dias', direction: 'asc' });
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
    if (!estoqueRows.length) return [];
    const setLocais = new Set();
    estoqueRows.forEach(r => {
      const l = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (l) setLocais.add(l);
    });
    return Array.from(setLocais);
  }, [estoqueRows, selectedCompany]);

  const dadosProcessados = useMemo(() => {
    if (!vendasRows.length && !estoqueRows.length) return { linhas: [], diasPeriodo: 30, dataEstoque: "" };

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);

    let diasPeriodo = 30;
    if (dataIni && dataFim) {
      const start = new Date(dataIni);
      const end = new Date(dataFim);
      diasPeriodo = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diasPeriodo < 1) diasPeriodo = 1;
    }

    const skuToDesc = {};
    vendasRows.forEach(r => {
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });
    estoqueRows.forEach(r => {
      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });

    const agrupado = {};

    vendasRows.forEach(r => {
      const dataStr = r?.c?.[COL_VENDAS.DATA]?.f;
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dataRow = new Date(`${y}-${m}-${d}`);

      const local = (r?.c?.[COL_VENDAS.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      let desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      const qtd = r?.c?.[COL_VENDAS.QTD]?.v || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.includes(local)) return;
      if (dataIni && dataRow < new Date(dataIni)) return;
      if (dataFim && dataRow > new Date(dataFim)) return;

      const key = desc + "|" + local;
      if (!agrupado[key]) agrupado[key] = { descricao: desc, local, total: 0, skus: {} };
      agrupado[key].total += qtd;
      if (!agrupado[key].skus[sku]) agrupado[key].skus[sku] = { vendas: 0, estoque: 0, caminho: 0 };
      agrupado[key].skus[sku].vendas += qtd;
    });

    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      // Corrigido: Apenas filtra pela data mais recente para não somar histórico
      if (dataEstoque && dataStr !== dataEstoque) return;

      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      let desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      const local = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = r?.c?.[COL_ESTOQUE.QTD]?.v || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.includes(local)) return;

      const key = desc + "|" + local;
      if (!agrupado[key]) agrupado[key] = { descricao: desc, local, total: 0, skus: {} };
      if (!agrupado[key].skus[sku]) agrupado[key].skus[sku] = { vendas: 0, estoque: 0, caminho: 0 };
      agrupado[key].skus[sku].estoque += qtd;
    });

    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      let desc = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      const local = String(r?.c?.[COL_CAMINHO.LOCAL]?.v ?? "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = r?.c?.[COL_CAMINHO.QTD]?.v || 0;
      const status = String(r?.c?.[COL_CAMINHO.STATUS]?.v ?? "").toUpperCase().trim();

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (status === 'FINALIZADO') return; // Só soma o que não foi finalizado

      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.includes(local)) return;

      const key = desc + "|" + local;
      if (!agrupado[key]) agrupado[key] = { descricao: desc, local, total: 0, skus: {} };
      if (!agrupado[key].skus[sku]) agrupado[key].skus[sku] = { vendas: 0, estoque: 0, caminho: 0 };
      if (agrupado[key].skus[sku].caminho === undefined) agrupado[key].skus[sku].caminho = 0;
      agrupado[key].skus[sku].caminho += qtd;
    });

    let linhas = Object.values(agrupado).map(l => {
      const media = diasPeriodo > 0 ? l.total / diasPeriodo : 0;
      const estoqueTotal = Object.values(l.skus).reduce((acc, s) => acc + s.estoque, 0);
      const caminhoTotal = Object.values(l.skus).reduce((acc, s) => acc + (s.caminho || 0), 0);
      const diasCobertos = media > 0 ? Math.round(estoqueTotal / media) : 0;
      return { ...l, media, estoqueTotal, caminhoTotal, dias: diasCobertos, id: l.descricao + l.local };
    });

    // Filtro de Busca por Descrição ou SKU
    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      linhas = linhas.filter(l => {
        const descLower = (l.descricao || "").toLowerCase();
        const skusArray = Object.keys(l.skus).map(s => s.toLowerCase());
        
        return termos.every(termo => 
          descLower.includes(termo) || 
          skusArray.some(sku => sku.includes(termo))
        );
      });
    }

    // Filtro de Status
    if (filtroStatus !== 'todos') {
      if (filtroStatus === 'ruptura') linhas = linhas.filter(l => l.dias <= 29);
      else if (filtroStatus === 'saudavel') linhas = linhas.filter(l => l.dias >= 30 && l.dias <= 60);
      else if (filtroStatus === 'excesso') linhas = linhas.filter(l => l.dias > 60);
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

    return { linhas, diasPeriodo, dataEstoque, dataVendas };
  }, [vendasRows, estoqueRows, caminhoRows, filtroLocal, dataIni, dataFim, busca, filtroStatus, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.linhas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type) => {
    const headers = ["SKU", "Descrição", "Local", "Vendas", "Média/Dia", "Estoque", "A Caminho", "Dias Cobertos", "Status"];
    const exportData = [];
    dadosProcessados.linhas.forEach(item => {
      Object.entries(item.skus || {}).forEach(([sku, metrics]) => {
        const media = dadosProcessados.diasPeriodo > 0 ? metrics.vendas / dadosProcessados.diasPeriodo : 0;
        const estoque = metrics.estoque;
        const dias = media > 0 ? Math.round(estoque / media) : (estoque > 0 ? -1 : 0);
        
        let statusStr = "Saudável";
        if (dias <= 29 && dias !== -1) statusStr = "Ruptura";
        else if (dias > 60 || dias === -1) statusStr = "Excesso";
        if (dias === -1) statusStr = "Excesso Absoluto";

        exportData.push([
          sku,
          item.descricao,
          item.local,
          metrics.vendas,
          media.toFixed(2),
          estoque,
          metrics.caminho || 0,
          dias === -1 ? "∞" : dias,
          statusStr
        ]);
      });
    });
    handleExport(type, "Relatorio_Cobertura", headers, exportData);
  };

  // Ao mudar filtros, reseta a página
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filtroLocal, dataIni, dataFim, busca, filtroStatus, selectedCompany]);

  if (loading) {
    return (
      <div className="header-main">
        <h1>Cobertura</h1>
        <div className="skeleton-loader" style={{ height: '80px', width: '100%', marginBottom: '24px' }}></div>
        <div className="skeleton-loader" style={{ height: '400px', width: '100%' }}></div>
      </div>
    );
  }

  if (error) return <div style={{ color: 'red' }}>Erro ao carregar dados: {error}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-main">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Cobertura de Estoque</h1>
          <p>Análise de dias cobertos baseado na média de vendas</p>
          <HeaderDates dataEstoque={dadosProcessados.dataEstoque} dataVendas={dadosProcessados.dataVendas} />
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

      <div className="filters-container">
        <CompanySelector />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '280px' }}>
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
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>STATUS</label>
          <Select 
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'ruptura', label: 'Ruptura (≤ 29 dias)' },
              { value: 'saudavel', label: 'Saudável (30 - 60 dias)' },
              { value: 'excesso', label: 'Excesso (> 60 dias)' }
            ]}
            value={{
              'todos': { value: 'todos', label: 'Todos' },
              'ruptura': { value: 'ruptura', label: 'Ruptura (≤ 29 dias)' },
              'saudavel': { value: 'saudavel', label: 'Saudável (30 - 60 dias)' },
              'excesso': { value: 'excesso', label: 'Excesso (> 60 dias)' }
            }[filtroStatus]}
            onChange={opt => setFiltroStatus(opt.value)}
            isSearchable={false}
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '260px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL</label>
          <Select
            isMulti
            closeMenuOnSelect={false}
            options={locais.map(l => ({ value: l, label: toTitleCase(l) }))}
            value={filtroLocal.map(l => ({ value: l, label: toTitleCase(l) }))}
            onChange={opts => setFiltroLocal(opts ? opts.map(o => o.value) : [])}
            placeholder="Todos os Locais"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>DATA INICIAL</label>
          <input type="date" className="input-padrao" value={dataIni} onChange={e => setDataIni(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>DATA FINAL</label>
          <input type="date" className="input-padrao" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
      </div>

      <MobileTable
        columns={[
          {
            key: 'descricao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição {getSortIcon('descricao')}</div>,
            rawLabel: 'Produto',
            render: (row) => <span style={{ fontWeight: 600 }}>{toTitleCase(row.descricao)}</span>,
            onSort: () => requestSort('descricao'),
          },
          {
            key: 'local',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local {getSortIcon('local')}</div>,
            rawLabel: 'Local',
            render: (row) => toTitleCase(row.local),
            onSort: () => requestSort('local'),
          },
          {
            key: 'total',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Vendas {getSortIcon('total')}</div>,
            rawLabel: 'Vendas',
            render: (row) => row.total.toLocaleString('pt-BR'),
            onSort: () => requestSort('total'),
          },
          {
            key: 'estoqueTotal',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Estoque {getSortIcon('estoqueTotal')}</div>,
            rawLabel: 'Estoque',
            render: (row) => row.estoqueTotal.toLocaleString('pt-BR'),
            onSort: () => requestSort('estoqueTotal'),
          },
          {
            key: 'caminhoTotal',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>A Caminho {getSortIcon('caminhoTotal')}</div>,
            rawLabel: 'A Caminho',
            render: (row) => row.caminhoTotal > 0 ? <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>+{row.caminhoTotal.toLocaleString('pt-BR')}</span> : '-',
            onSort: () => requestSort('caminhoTotal'),
          },
          {
            key: 'media',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Média Diária {getSortIcon('media')}</div>,
            rawLabel: 'Média/dia',
            render: (row) => row.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
            onSort: () => requestSort('media'),
          },
          {
            key: 'dias',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Dias Cobertos {getSortIcon('dias')}</div>,
            rawLabel: 'Dias Cobertos',
            render: (row) => {
              let badgeColor = '#64748b', badgeBg = '#f1f5f9';
              if (row.dias <= 29) { badgeColor = '#b91c1c'; badgeBg = '#fecaca'; }
              else if (row.dias > 60) { badgeColor = '#b45309'; badgeBg = '#fde68a'; }
              else { badgeColor = '#15803d'; badgeBg = '#bbf7d0'; }
              return <span style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{row.dias} dias</span>;
            },
            onSort: () => requestSort('dias'),
          },
        ]}
        rows={linhasPaginadas}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
        isExpanded={(row) => expandedId === row.id}
        getRowStyle={(row) => {
          if (row.dias <= 29) return { background: '#fee2e2' };
          if (row.dias > 60) return { background: '#fef3c7' };
          return { background: '#dcfce7' };
        }}
        renderExpanded={(item) => (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {Object.entries(item.skus).map(([sku, dados]) => {
                  const mediaSKU = dadosProcessados.diasPeriodo > 0 ? dados.vendas / dadosProcessados.diasPeriodo : 0;
                  const cobertura = mediaSKU > 0 ? (dados.estoque / mediaSKU) : '∞';
                  return (
                    <div key={sku} style={{ background: 'white', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>{sku}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Vendas</span><span style={{ fontWeight: 600, color: '#0f172a' }}>{dados.vendas.toLocaleString('pt-BR')}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Estoque</span><span style={{ fontWeight: 600, color: '#0f172a' }}>{dados.estoque.toLocaleString('pt-BR')}</span></div>
                      {dados.caminho > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>A Caminho</span><span style={{ fontWeight: 600, color: '#8b5cf6' }}>+{dados.caminho}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Cobertura</span><span style={{ fontWeight: 600, color: '#0f172a' }}>{cobertura === '∞' ? '∞' : Math.round(cobertura)} dias</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
        emptyMessage="Nenhum dado encontrado para os filtros aplicados."
      />

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
