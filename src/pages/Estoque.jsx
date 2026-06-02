import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, ChevronLeft, ChevronRight, Package, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet } from 'lucide-react';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { getLatestDates, normalizeDateStr } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_ESTOQUE } from '../utils/sheetColumns';
import MobileTable from '../components/MobileTable';
import { parseProductDescription } from '../utils/productParser';

export default function Estoque() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const estoqueRows = data.estoque || [];
  const vendasRows = data.vendas || [];

  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [buscaInput]);

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
      const l = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (l) setLocais.add(l);
    });
    return Array.from(setLocais);
  }, [estoqueRows, selectedCompany]);

  const marcas = useMemo(() => {
    if (!estoqueRows) return [];
    const setMarcas = new Set();
    const { dataEstoque } = getLatestDates(estoqueRows, vendasRows);
    const normDataEstoque = dataEstoque ? normalizeDateStr(dataEstoque) : "";
    
    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
      if (normDataEstoque && normDataStr !== normDataEstoque) return;

      const m = r?.c?.[COL_ESTOQUE.MARCA]?.v || "";
      const l = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (m) setMarcas.add(m.trim().toUpperCase());
    });
    return Array.from(setMarcas).sort();
  }, [estoqueRows, vendasRows, selectedCompany]);

  const dadosProcessados = useMemo(() => {
    if (!estoqueRows) return { linhas: [], totalGeral: 0, totalCustoGeral: 0, dataEstoque: "", dataVendas: "" };

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);
    const normDataEstoque = dataEstoque ? normalizeDateStr(dataEstoque) : "";

    const skuToDesc = {};
    estoqueRows.forEach(r => {
      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });

    let totalGeral = 0;
    let totalCustoGeral = 0;
    const agrupado = {};

    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
      // Corrigido: Filtra pela data para não somar histórico
      if (normDataEstoque && normDataStr !== normDataEstoque) return;

      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const skuPlat = r?.c?.[7]?.v || "";
      let descricao = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      const local = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const quantidade = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;
      const valorUnitario = Number(r?.c?.[COL_ESTOQUE.VALOR]?.v) || 0;
      const marca = (r?.c?.[COL_ESTOQUE.MARCA]?.v || "Sem Marca").trim().toUpperCase();

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (filtroMarca && marca !== filtroMarca) return;

      if (!descricao && skuToDesc[sku]) descricao = skuToDesc[sku];
      if (!sku && !descricao) return;
      if (!descricao) descricao = `SKU: ${sku}`;

      if (filtroLocal && local !== filtroLocal) return;

      const custoLinha = quantidade * valorUnitario;
      totalGeral += quantidade;
      totalCustoGeral += custoLinha;

      const parsed = parseProductDescription(descricao, sku, local.includes("BUY CLOCK"));

      // Group by Base Title + Local (Model & Platform level)
      const prodKey = `${parsed.baseTitle}|${local}`;
      if (!agrupado[prodKey]) {
        agrupado[prodKey] = {
          descricao: parsed.baseTitle,
          local: local,
          marca: r?.c?.[COL_ESTOQUE.MARCA]?.v || "Sem Marca",
          total: 0,
          custoTotal: 0,
          cores: {},
          skusArr: [],
          id: prodKey
        };
      }
      agrupado[prodKey].total += quantidade;
      agrupado[prodKey].custoTotal += custoLinha;
      agrupado[prodKey].skusArr.push(sku);
      if (skuPlat) agrupado[prodKey].skusArr.push(skuPlat);

      // Group by color
      const corKey = parsed.color;
      if (!agrupado[prodKey].cores[corKey]) {
        agrupado[prodKey].cores[corKey] = {
          cor: corKey,
          total: 0,
          custoTotal: 0,
          variacoes: {}
        };
      }
      agrupado[prodKey].cores[corKey].total += quantidade;
      agrupado[prodKey].cores[corKey].custoTotal += custoLinha;

      // Group by variation (size only to consolidate duplicates like SD2513 / MLB)
      const varKey = parsed.size || 'ÚNICO';
      if (!agrupado[prodKey].cores[corKey].variacoes[varKey]) {
        agrupado[prodKey].cores[corKey].variacoes[varKey] = {
          sku: sku,
          size: parsed.size,
          total: 0,
          valorUnitario: valorUnitario,
          custoTotal: 0
        };
      }
      
      const existing = agrupado[prodKey].cores[corKey].variacoes[varKey];
      existing.total += quantidade;
      existing.custoTotal += custoLinha;

      // Keep the specific senior SKU if the existing one is generic/MLB
      const isCurrentGeneric = ['SD2513', 'A623', 'FLOW'].includes(existing.sku) || existing.sku.startsWith('MLB');
      const isNewBetter = !['SD2513', 'A623', 'FLOW'].includes(sku) && !sku.startsWith('MLB');
      if (isCurrentGeneric && isNewBetter) {
        existing.sku = sku;
      }
      if (valorUnitario > 0 && (existing.valorUnitario === 0 || isCurrentGeneric && isNewBetter)) {
        existing.valorUnitario = valorUnitario;
      }
    });

    let linhas = Object.values(agrupado);

    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      linhas = linhas.filter(l => {
        const descLower = (l.descricao || "").toLowerCase();
        const localLower = (l.local || "").toLowerCase();
        const skusArray = l.skusArr.map(s => s.toLowerCase());
        
        return termos.every(termo => 
          descLower.includes(termo) || 
          localLower.includes(termo) ||
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

    let finalTotalGeral = 0;
    let finalTotalCustoGeral = 0;
    linhas.forEach(l => {
      finalTotalGeral += l.total;
      finalTotalCustoGeral += l.custoTotal;
    });

    return { linhas, totalGeral: finalTotalGeral, totalCustoGeral: finalTotalCustoGeral, dataEstoque, dataVendas };
  }, [estoqueRows, vendasRows, filtroLocal, filtroMarca, busca, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.linhas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type, mode = 'detalhado') => {
    if (mode === 'resumido') {
      const headers = filtroLocal ? ["Descrição", "Quantidade em Estoque"] : ["Descrição", "Local", "Quantidade em Estoque"];
      const exportData = dadosProcessados.linhas.map(item => {
        if (filtroLocal) {
          return [item.descricao, item.total];
        } else {
          return [item.descricao, item.local, item.total];
        }
      });
      handleExport(type, "Estoque_Consolidado_Resumido", headers, exportData);
    } else {
      const headers = filtroLocal ? ["SKU Sênior", "Descrição", "Quantidade em Estoque"] : ["SKU Sênior", "Descrição", "Local", "Quantidade em Estoque"];
      const exportData = [];
      dadosProcessados.linhas.forEach(item => {
        Object.values(item.cores).forEach(corObj => {
          Object.values(corObj.variacoes).forEach(v => {
            const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? ` ${corObj.cor}` : '';
            const sizePart = v.size && v.size !== 'U' ? ` Tam ${v.size}` : '';
            const fullDesc = `${item.descricao}${colorPart}${sizePart}`;
            
            if (filtroLocal) {
              exportData.push([v.sku, fullDesc, v.total]);
            } else {
              exportData.push([v.sku, fullDesc, item.local, v.total]);
            }
          });
        });
      });
      handleExport(type, "Estoque_Consolidado_Detalhado", headers, exportData);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filtroLocal, filtroMarca, busca, selectedCompany]);

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
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Estoque Consolidado</h1>
          <p>Visão geral dos produtos em armazém</p>
          <HeaderDates dataEstoque={dadosProcessados.dataEstoque} dataVendas={dadosProcessados.dataVendas} />
        </div>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
            <Package size={24} />
            <div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.9 }}>TOTAL EM ESTOQUE</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{dadosProcessados.totalGeral.toLocaleString('pt-BR')} pçs</div>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
            <span style={{ fontSize: '24px' }}>💰</span>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.9 }}>CUSTO TOTAL DO ESTOQUE</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{dadosProcessados.totalCustoGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
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
                  style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', minWidth: '220px' }}
                >
                  <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>EXPORTAR DETALHADO (CORES/TAMANHOS)</div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => { handleExportData('csv', 'detalhado'); setIsExportMenuOpen(false); }}>
                    <FileText size={14} color="#64748b" /> CSV
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => { handleExportData('xlsx', 'detalhado'); setIsExportMenuOpen(false); }}>
                    <FileSpreadsheet size={14} color="#10b981" /> Excel (XLSX)
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => { handleExportData('pdf', 'detalhado'); setIsExportMenuOpen(false); }}>
                    <FileText size={14} color="#ef4444" /> PDF
                  </div>
                  <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>EXPORTAR RESUMIDO (MODELOS)</div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => { handleExportData('csv', 'resumido'); setIsExportMenuOpen(false); }}>
                    <FileText size={14} color="#64748b" /> CSV
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => { handleExportData('xlsx', 'resumido'); setIsExportMenuOpen(false); }}>
                    <FileSpreadsheet size={14} color="#10b981" /> Excel (XLSX)
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} onClick={() => { handleExportData('pdf', 'resumido'); setIsExportMenuOpen(false); }}>
                    <FileText size={14} color="#ef4444" /> PDF
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
              value={buscaInput} 
              onChange={e => setBuscaInput(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>MARCA</label>
          <Select 
            options={[
              { value: '', label: 'Todas as Marcas' },
              ...marcas.map(m => ({ value: m, label: toTitleCase(m) }))
            ]}
            value={{ value: filtroMarca, label: filtroMarca ? toTitleCase(filtroMarca) : 'Todas as Marcas' }}
            onChange={opt => setFiltroMarca(opt.value)}
            isSearchable={true}
            placeholder="Todas as Marcas"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL</label>
          <Select 
            options={[
              { value: '', label: 'Todos os Locais' },
              ...locais.map(l => ({ value: l, label: toTitleCase(l) }))
            ]}
            value={{ value: filtroLocal, label: filtroLocal ? toTitleCase(filtroLocal) : 'Todos os Locais' }}
            onChange={opt => setFiltroLocal(opt.value)}
            isSearchable={true}
            placeholder="Todos os Locais"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>
      </div>

      <MobileTable
        columns={[
          {
            key: 'descricao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição do Produto {getSortIcon('descricao')}</div>,
            rawLabel: 'Produto',
            render: (row) => (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>{toTitleCase(row.descricao)}</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.3px' }}>Marca: {row.marca || 'Sem Marca'}</span>
              </div>
            ),
            onSort: () => requestSort('descricao'),
          },
          ...(!filtroLocal ? [{
            key: 'local',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local {getSortIcon('local')}</div>,
            rawLabel: 'Local',
            render: (row) => toTitleCase(row.local),
            onSort: () => requestSort('local'),
          }] : []),
          {
            key: 'custoTotal',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Custo Total {getSortIcon('custoTotal')}</div>,
            rawLabel: 'Custo Total',
            render: (row) => <span style={{ fontWeight: 800, color: '#1e293b' }}>{row.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>,
            onSort: () => requestSort('custoTotal'),
          },
          {
            key: 'total',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total em Estoque {getSortIcon('total')}</div>,
            rawLabel: 'Total em Estoque',
            render: (row) => <span style={{ fontWeight: 800 }}>{row.total.toLocaleString('pt-BR')} pçs</span>,
            onSort: () => requestSort('total'),
          },
        ]}
        rows={linhasPaginadas}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
        isExpanded={(row) => expandedId === row.id}
        renderExpandedDesktop={(item) => (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.values(item.cores).map((corObj) => (
                <div key={corObj.cor} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                  {/* Cabeçalho da Cor */}
                  <div style={{ padding: '12px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🎨</span>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cor: {corObj.cor || 'Sem Cor'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', background: '#e2e8f0', padding: '4px 10px', borderRadius: '20px' }}>
                        {corObj.total.toLocaleString('pt-BR')} peças
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                        Custo: {corObj.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Tabela de Variações */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '100px', background: '#fafafa' }}>Tamanho</th>
                        <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>SKU</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '130px', background: '#fafafa' }}>Custo Unit.</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '130px', background: '#fafafa' }}>Custo Total</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '150px', background: '#fafafa' }}>Qtd em Estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(corObj.variacoes).sort((a, b) => {
                        const sizeWeights = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'XG': 6, 'XXG': 7, 'U': 99, 'ÚNICO': 99, 'UNICO': 99 };
                        const aVal = String(a.size || '').toUpperCase().trim();
                        const bVal = String(b.size || '').toUpperCase().trim();
                        if (sizeWeights[aVal] !== undefined && sizeWeights[bVal] !== undefined) return sizeWeights[aVal] - sizeWeights[bVal];
                        if (sizeWeights[aVal] !== undefined) return -1;
                        if (sizeWeights[bVal] !== undefined) return 1;
                        const aNum = parseFloat(aVal);
                        const bNum = parseFloat(bVal);
                        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                        return aVal.localeCompare(bVal);
                      }).map((v) => (
                        <tr key={v.size || 'ÚNICO'} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '10px 20px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '32px', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
                              {v.size || 'Único'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#475569', fontWeight: 500 }}>
                            {v.sku}
                          </td>
                          <td style={{ padding: '10px 20px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>
                            {v.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td style={{ padding: '10px 20px', textAlign: 'right', color: '#047857', fontWeight: 600 }}>
                            {v.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            {v.total.toLocaleString('pt-BR')} peças
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        renderExpanded={(item) => (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.values(item.cores).map((corObj) => (
                <div key={corObj.cor} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  {/* Cabeçalho Cor */}
                  <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px', textTransform: 'uppercase' }}>🎨 Cor: {corObj.cor || 'Sem Cor'}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                        {corObj.total} pçs
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px' }}>
                        {corObj.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Lista de Variações Mobile */}
                  <div style={{ padding: '0 14px' }}>
                    {Object.values(corObj.variacoes).sort((a, b) => {
                      const sizeWeights = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'XG': 6, 'XXG': 7, 'U': 99, 'ÚNICO': 99, 'UNICO': 99 };
                      const aVal = String(a.size || '').toUpperCase().trim();
                      const bVal = String(b.size || '').toUpperCase().trim();
                      if (sizeWeights[aVal] !== undefined && sizeWeights[bVal] !== undefined) return sizeWeights[aVal] - sizeWeights[bVal];
                      if (sizeWeights[aVal] !== undefined) return -1;
                      if (sizeWeights[bVal] !== undefined) return 1;
                      const aNum = parseFloat(aVal);
                      const bNum = parseFloat(bVal);
                      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                      return aVal.localeCompare(bVal);
                    }).map((v, vIdx, arr) => (
                      <div key={v.size || 'ÚNICO'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: vIdx === arr.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '28px', padding: '3px 6px', borderRadius: '5px', textAlign: 'center', fontSize: '12px' }}>
                            {v.size || 'Único'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '11px' }}>{v.sku}</span>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>Unit: {v.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{v.total} pçs</span>
                          <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Total: {v.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
