import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Download, AlertTriangle, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet, Filter } from 'lucide-react';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { getLatestDates, normalizeDateStr } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_ESTOQUE, COL_VENDAS, COL_BADSTOCK } from '../utils/sheetColumns';
import MobileTable from '../components/MobileTable';
import { parseProductDescription } from '../utils/productParser';

export default function Alertas() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const estoqueRows = data.estoque || [];
  const vendasRows = data.vendas || [];
  const badStockRows = data.badstock || [];

  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoAlerta, setTipoAlerta] = useState('todos');
  const [filtroLocal, setFiltroLocal] = useState([]);
  const [filtroMarca, setFiltroMarca] = useState([]);
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [isExportPromptOpen, setIsExportPromptOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState('csv');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [buscaInput]);

  const locais = useMemo(() => {
    if (!estoqueRows.length) return [];
    const lSet = new Set();
    estoqueRows.forEach(r => {
      const l = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (l) lSet.add(l);
    });
    return Array.from(lSet).sort();
  }, [estoqueRows, selectedCompany]);

  const marcas = useMemo(() => {
    const setMarcas = new Set();
    vendasRows.forEach(r => {
      const m = r?.c?.[COL_VENDAS.MARCA]?.v || "";
      const l = (r?.c?.[COL_VENDAS.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (m) setMarcas.add(m.trim().toUpperCase());
    });
    estoqueRows.forEach(r => {
      const m = r?.c?.[COL_ESTOQUE.MARCA]?.v || "";
      const l = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (m) setMarcas.add(m.trim().toUpperCase());
    });
    return Array.from(setMarcas).sort();
  }, [vendasRows, estoqueRows, selectedCompany]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: 'vendas', direction: 'desc' });

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

  const dadosProcessados = useMemo(() => {
    if (!estoqueRows.length || !vendasRows.length) return { alertas: [], alertasTudo: [], total: 0, totalTudo: 0, dataEstoque: "" };

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);
    const normDataEstoque = dataEstoque ? normalizeDateStr(dataEstoque) : "";

    let diasPeriodo = 30;
    const minDate = dataIni ? new Date(dataIni) : null;
    const maxDate = dataFim ? new Date(dataFim) : null;
    if (minDate && maxDate) {
      diasPeriodo = (maxDate - minDate) / (1000 * 60 * 60 * 24) + 1;
      if (diasPeriodo < 1) diasPeriodo = 1;
    }

    const skuToDesc = {};
    const skuToBrand = {};
    estoqueRows.forEach(r => {
      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
      const brand = r?.c?.[COL_ESTOQUE.MARCA]?.v || "";
      if (sku && brand) skuToBrand[sku] = brand.trim().toUpperCase();
    });
    vendasRows.forEach(r => {
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      if (sku && desc && !skuToDesc[sku]) skuToDesc[sku] = desc;
      const brand = r?.c?.[COL_VENDAS.MARCA]?.v || "";
      if (sku && brand && !skuToBrand[sku]) skuToBrand[sku] = brand.trim().toUpperCase();
    });

    const vendasMap = {};

    vendasRows.forEach(r => {
      const dataStr = r?.c?.[COL_VENDAS.DATA]?.f;
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dt = new Date(`${y}-${m}-${d}`);
      if (minDate && maxDate) {
         if (dt < minDate || dt > maxDate) return;
      }
      const local = (r?.c?.[COL_VENDAS.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const qtd = Number(r?.c?.[COL_VENDAS.QTD]?.v) || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      const key = local + "|" + sku;
      if (!vendasMap[key]) vendasMap[key] = 0;
      vendasMap[key] += qtd;
    });

    // Pré-calcula a reposição central
    const reposicaoCentralMap = {};
    estoqueRows.forEach(r => {
      const local = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      if (["STAND BY", "EXP MINAS"].includes(local)) {
        const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
        const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
        if (!normDataEstoque || normDataStr === normDataEstoque) {
          const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
          if (sku) {
            const qtd = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;
            reposicaoCentralMap[sku] = (reposicaoCentralMap[sku] || 0) + qtd;
          }
        }
      }
    });

    const temReposicaoCentral = (sku) => {
      return (reposicaoCentralMap[sku] || 0) > 0;
    };

    // Pré-calcula badstock indexado
    const badStockSet = new Set();
    badStockRows.forEach(bs => {
      const skuB = (bs?.c?.[COL_BADSTOCK.SKU]?.v || "").trim().toLowerCase();
      const localB = (bs?.c?.[COL_BADSTOCK.LOCAL]?.v || "").trim().toLowerCase();
      if (skuB && localB) {
        badStockSet.add(`${skuB}|${localB}`);
      }
    });

    let alertas = [];
    let alertasTudo = [];

    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
      if (normDataEstoque && normDataStr !== normDataEstoque) return;

      const local = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const skuPlat = r?.c?.[7]?.v || "";
      let descricao = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      descricao = skuToDesc[sku] || descricao;
      const qtdEstoque = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;
      const key = local + "|" + sku;
      const vendas = vendasMap[key] || 0;
      const media = diasPeriodo > 0 ? vendas / diasPeriodo : 0;
      const cobertura = media > 0 ? Math.round(qtdEstoque / media) : (vendas > 0 ? 0 : "∞");

      let alertaT = null;
      let alertaI = "";

      const skuLower = sku.trim().toLowerCase();
      const localLower = local.trim().toLowerCase();
      const isBad = badStockSet.has(`${skuLower}|${localLower}`);

      if (isBad) {
        alertaT = "badstock";
        alertaI = "⛔ Badstock";
      } else if (qtdEstoque === 0 && vendas > 0) {
        alertaT = "ruptura";
        alertaI = "🔴 Ruptura";
      } else if (typeof cobertura === "number" && cobertura <= 29) { // Using <= 29 to match Cobertura critical
        alertaT = "cobertura";
        alertaI = "⚠️ Cobertura crítica";
        if (temReposicaoCentral(sku)) {
          alertaT = "reposicao";
          alertaI = "🛒 Reposição disponível";
        }
      }

      if (alertaT) {
        const parsed = parseProductDescription(descricao, sku, local.includes("BUY CLOCK"));
        const colorPart = parsed.color && parsed.color !== 'SEM COR' ? ` ${parsed.color}` : '';
        const sizePart = parsed.size && parsed.size !== 'U' ? ` Tam ${parsed.size}` : '';
        const cleanDesc = `${parsed.baseTitle}${colorPart}${sizePart}`;

        alertasTudo.push({ local, sku, skuPlat, descricao: cleanDesc, qtdEstoque, vendas, cobertura, alertaT, alertaI });

        if (filtroLocal.length > 0 && !filtroLocal.includes(local)) return;

        const brand = (r?.c?.[COL_ESTOQUE.MARCA]?.v || skuToBrand[sku] || "").trim().toUpperCase();
        if (filtroMarca.length > 0 && !filtroMarca.includes(brand)) return;

        if (tipoAlerta !== "todos" && tipoAlerta !== alertaT) return;

        alertas.push({ local, sku, skuPlat, descricao: cleanDesc, qtdEstoque, vendas, cobertura, alertaT, alertaI });
      }
    });

    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      alertas = alertas.filter(l => {
        const skuLower = (l.sku || "").toLowerCase();
        const skuPlatLower = (l.skuPlat || "").toLowerCase();
        const descLower = (l.descricao || "").toLowerCase();
        return termos.every(termo => skuLower.includes(termo) || skuPlatLower.includes(termo) || descLower.includes(termo));
      });
    }

    if (sortConfig.key) {
      const sortFn = (a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      };
      alertas.sort(sortFn);
      alertasTudo.sort(sortFn);
    }

    return { alertas, alertasTudo, total: alertas.length, totalTudo: alertasTudo.length, dataEstoque, dataVendas };
  }, [estoqueRows, vendasRows, badStockRows, dataIni, dataFim, tipoAlerta, filtroLocal, filtroMarca, busca, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.alertas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.alertas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type) => {
    const hasActiveFilters = busca.trim() !== '' || filtroLocal.length > 0 || filtroMarca.length > 0 || tipoAlerta !== 'todos';
    if (hasActiveFilters) {
      setPendingExportType(type);
      setIsExportPromptOpen(true);
    } else {
      executeExport(type, false);
    }
  };

  const executeExport = (type, useFilters) => {
    setIsExportPromptOpen(false);
    
    const rowsToExport = useFilters ? dadosProcessados.alertas : dadosProcessados.alertasTudo;
    const filterStr = useFilters ? 'Filtrado' : 'Completo';
    const reportTitle = `Alertas - Central (${filterStr})`;

    const options = {
      subTitle: `Central de Alertas • Período: ${dataIni && dataFim ? `${dataIni.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}` : 'Completo'} • Canal: ${selectedCompany}`,
      filters: useFilters ? [
        busca.trim() && `Busca: "${busca.trim()}"`,
        filtroLocal.length > 0 && `Local: ${filtroLocal.join(', ')}`,
        filtroMarca.length > 0 && `Marca: ${filtroMarca.join(', ')}`,
        tipoAlerta !== 'todos' && `Tipo Alerta: ${tipoAlerta.toUpperCase()}`
      ].filter(Boolean) : [],
      kpis: [
        { label: "TOTAL DE ALERTAS", value: rowsToExport.length.toLocaleString('pt-BR'), sub: "alertas identificados" }
      ]
    };

    const headers = ["Local", "SKU", "Estoque", "Vendas", "Cobertura", "Alerta"];
    const exportData = rowsToExport.map(item => [
      item.local,
      item.sku,
      item.qtdEstoque,
      item.vendas,
      item.cobertura === "∞" ? "∞" : item.cobertura,
      item.alertaI.replace(/[^\w\sÀ-ÿ]/gi, '').trim() // Remove emoji para o PDF/Excel
    ]);
    handleExport(type, reportTitle, headers, exportData, options);
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [dataIni, dataFim, tipoAlerta, filtroLocal, filtroMarca, busca, selectedCompany]);

  if (loading) {
    return (
      <div className="header-main">
        <h1>Alertas</h1>
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
          <h1>Central de Alertas</h1>
          <p>Identificação de Rupturas e Badstock</p>
          <HeaderDates dataEstoque={dadosProcessados.dataEstoque} dataVendas={dadosProcessados.dataVendas} />
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={24} />
            <div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.9 }}>TOTAL DE ALERTAS</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{dadosProcessados.total.toLocaleString('pt-BR')}</div>
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
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '280px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>PESQUISAR (SKU)</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="input-padrao" 
              style={{ width: '100%', paddingLeft: '42px' }}
              placeholder="Digite para buscar..." 
              value={buscaInput} 
              onChange={e => setBuscaInput(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '260px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL / CANAL</label>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '260px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>MARCA</label>
          <Select
            isMulti
            closeMenuOnSelect={false}
            options={marcas.map(m => ({ value: m, label: toTitleCase(m) }))}
            value={filtroMarca.map(m => ({ value: m, label: toTitleCase(m) }))}
            onChange={opts => setFiltroMarca(opts ? opts.map(o => o.value) : [])}
            placeholder="Todas as Marcas"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>TIPO DE ALERTA</label>
          <Select 
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'badstock', label: 'Badstock' },
              { value: 'ruptura', label: 'Ruptura' },
              { value: 'cobertura', label: 'Cobertura Crítica' },
              { value: 'reposicao', label: 'Reposição Disponível' }
            ]}
            value={{
              'todos': { value: 'todos', label: 'Todos' },
              'badstock': { value: 'badstock', label: 'Badstock' },
              'ruptura': { value: 'ruptura', label: 'Ruptura' },
              'cobertura': { value: 'cobertura', label: 'Cobertura Crítica' },
              'reposicao': { value: 'reposicao', label: 'Reposição Disponível' }
            }[tipoAlerta]}
            onChange={opt => setTipoAlerta(opt.value)}
            isSearchable={false}
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
            key: 'sku',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>SKU {getSortIcon('sku')}</div>,
            rawLabel: 'SKU',
            render: (row) => <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{row.sku}</span>,
            onSort: () => requestSort('sku'),
          },
          {
            key: 'descricao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição {getSortIcon('descricao')}</div>,
            rawLabel: 'Descrição',
            render: (row) => <span style={{ fontWeight: 600 }}>{toTitleCase(row.descricao)}</span>,
            onSort: () => requestSort('descricao'),
          },
          {
            key: 'local',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local {getSortIcon('local')}</div>,
            rawLabel: 'Local',
            render: (row) => <span style={{ fontWeight: 600 }}>{toTitleCase(row.local)}</span>,
            onSort: () => requestSort('local'),
          },
          {
            key: 'qtdEstoque',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Estoque {getSortIcon('qtdEstoque')}</div>,
            rawLabel: 'Estoque',
            render: (row) => row.qtdEstoque.toLocaleString('pt-BR'),
            onSort: () => requestSort('qtdEstoque'),
          },
          {
            key: 'vendas',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Vendas {getSortIcon('vendas')}</div>,
            rawLabel: 'Vendas (30d)',
            render: (row) => row.vendas.toLocaleString('pt-BR'),
            onSort: () => requestSort('vendas'),
          },
          {
            key: 'cobertura',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Cobertura {getSortIcon('cobertura')}</div>,
            rawLabel: 'Cobertura',
            render: (row) => row.cobertura === '∞' ? '∞' : row.cobertura + ' dias',
            onSort: () => requestSort('cobertura'),
          },
          {
            key: 'alertaI',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Alerta {getSortIcon('alertaI')}</div>,
            rawLabel: 'Tipo de Alerta',
            render: (row) => (
              <span style={{
                background: row.alertaT === 'badstock' ? '#fee2e2' : row.alertaT === 'ruptura' ? '#fecaca' : '#fef3c7',
                color: row.alertaT === 'badstock' ? '#b91c1c' : row.alertaT === 'ruptura' ? '#dc2626' : '#b45309',
                padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '12px'
              }}>
                {row.alertaI}
              </span>
            ),
            onSort: () => requestSort('alertaI'),
          },
        ]}
        rows={linhasPaginadas}
        keyExtractor={(row, idx) => `${row.local}|${row.sku}|${idx}`}
        getRowStyle={(row) => ({
          background: row.alertaT === 'badstock' || row.alertaT === 'ruptura' ? '#fee2e2' : '#fef3c7'
        })}
        emptyMessage="Nenhum alerta encontrado com os filtros aplicados."
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

      {/* Choice Modal for Exporting with Active Filters */}
      <AnimatePresence>
        {isExportPromptOpen && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              zIndex: 9999, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.40)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              style={{
                width: '90%',
                maxWidth: '480px',
                background: 'white',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              {/* Header Icon & Title */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '16px', 
                    background: '#eff6ff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid #dbeafe'
                  }}
                >
                  <Filter size={24} color="#3b82f6" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                    Exportar Relatório
                  </h3>
                  <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b', lineHeight: '20px' }}>
                    Detectamos que você possui filtros ativados nesta tela. Como deseja exportar seus dados?
                  </p>
                </div>
              </div>

              {/* Active Filters Summary Chips */}
              <div 
                style={{ 
                  background: '#f8fafc', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  border: '1px solid #f1f5f9', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px' 
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Filtros Ativos:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {busca.trim() !== '' && (
                    <span style={{ fontSize: '12px', background: '#eff6ff', border: '1px solid #dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      Busca: "{busca.trim()}"
                    </span>
                  )}
                  {filtroLocal.length > 0 && (
                    <span style={{ fontSize: '12px', background: '#ecfdf5', border: '1px solid #d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      Local: {filtroLocal.join(', ')}
                    </span>
                  )}
                  {filtroMarca.length > 0 && (
                    <span style={{ fontSize: '12px', background: '#ecfdf5', border: '1px solid #d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      Marca: {filtroMarca.join(', ')}
                    </span>
                  )}
                  {tipoAlerta !== 'todos' && (
                    <span style={{ fontSize: '12px', background: '#f5f3ff', border: '1px solid #e0e7ff', color: '#6d28d9', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      Alerta: {tipoAlerta.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={() => executeExport(pendingExportType, true)}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <Filter size={16} /> Exportar Apenas Filtrados ({dadosProcessados.alertas.length} itens)
                </button>
                <button 
                  onClick={() => executeExport(pendingExportType, false)}
                  style={{
                    background: '#1e293b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <Download size={16} /> Exportar Relatório Completo ({dadosProcessados.alertasTudo.length} itens)
                </button>
                <button 
                  onClick={() => setIsExportPromptOpen(false)}
                  style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
