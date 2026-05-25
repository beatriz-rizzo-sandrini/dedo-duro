import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Select from 'react-select';
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet } from 'lucide-react';
import { handleExport } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import { getLatestDates } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_ESTOQUE, COL_VENDAS } from '../utils/sheetColumns';
import MobileTable from '../components/MobileTable';
import { parseProductDescription } from '../utils/productParser';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const get29DaysBeforeYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30); // 1 dia de ontem + 29 dias antes = 30 dias no total
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function Vendas() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const vendasRows = data.vendas || [];
  const estoqueRows = data.estoque || [];

  const [filtroLocal, setFiltroLocal] = useState([]);
  const [dataIni, setDataIni] = useState(get29DaysBeforeYesterdayStr());
  const [dataFim, setDataFim] = useState(getYesterdayStr());
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
    if (!vendasRows) return [];
    const setLocais = new Set();
    vendasRows.forEach(r => {
      const l = (r?.c?.[COL_VENDAS.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (l) setLocais.add(l);
    });
    return Array.from(setLocais);
  }, [vendasRows, selectedCompany]);

  const dadosProcessados = useMemo(() => {
    if (!vendasRows) return { linhas: [], totalItens: 0, chartData: null, dataEstoque: "", dataVendas: "" };

    const skuToDesc = {};
    // 1. Pega a descrição mais atualizada do Estoque como "fonte da verdade"
    estoqueRows.forEach(r => {
      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });

    // 2. Fallback para as vendas caso o SKU não exista mais no estoque
    vendasRows.forEach(r => {
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      if (sku && desc && !skuToDesc[sku]) skuToDesc[sku] = desc;
    });

    let totalItens = 0;
    const agrupado = {};
    const vendasPorData = {};
    const vendasPorLocalObj = {};
    const produtosVendidosObj = {};

    const parseDateStr = (dateStr) => {
      if (!dateStr || !dateStr.includes('/')) return 0;
      const [dia, mes, ano] = dateStr.split('/');
      return new Date(`${ano}-${mes}-${dia}`).getTime();
    };

    const inicioTime = dataIni ? new Date(dataIni).getTime() : 0;
    const fimTime = dataFim ? new Date(dataFim).setHours(23, 59, 59, 999) : Infinity;

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);

    vendasRows.forEach(r => {
      const dateVal = r?.c?.[COL_VENDAS.DATA]?.f;
      const dateRow = parseDateStr(dateVal);
      if (!dateVal) return;

      const local = (r?.c?.[COL_VENDAS.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const skuPlat = r?.c?.[6]?.v || "";
      let desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      const qtd = Number(r?.c?.[COL_VENDAS.QTD]?.v) || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.some(f => f.value === local)) return;
      if (dateRow < inicioTime) return;
      if (dateRow > fimTime) return;

      const parsed = parseProductDescription(desc, sku);

      if (busca) {
        const termos = busca.toLowerCase().trim().split(/\s+/);
        const descLower = desc.toLowerCase();
        const skuLower = sku.toLowerCase();
        const skuPlatLower = skuPlat.toLowerCase();
        const baseLower = parsed.baseTitle.toLowerCase();
        
        const matches = termos.every(termo => 
          descLower.includes(termo) || 
          skuLower.includes(termo) ||
          skuPlatLower.includes(termo) ||
          baseLower.includes(termo)
        );
        if (!matches) return;
      }

      totalItens += qtd;
      
      if (!vendasPorData[dateVal]) vendasPorData[dateVal] = 0;
      vendasPorData[dateVal] += qtd;

      if (!vendasPorLocalObj[local]) vendasPorLocalObj[local] = 0;
      vendasPorLocalObj[local] += qtd;

      if (!produtosVendidosObj[parsed.baseTitle]) produtosVendidosObj[parsed.baseTitle] = 0;
      produtosVendidosObj[parsed.baseTitle] += qtd;

      // Group by Base Title + Local (Model & Platform level)
      const prodKey = `${parsed.baseTitle}|${local}`;
      if (!agrupado[prodKey]) {
        agrupado[prodKey] = { 
          descricao: parsed.baseTitle,
          local: local,
          total: 0, 
          cores: {}, // Nest by color/variation
          id: prodKey 
        };
      }
      agrupado[prodKey].total += qtd;
      
      // Nest under Color
      const corKey = parsed.color;
      if (!agrupado[prodKey].cores[corKey]) {
        agrupado[prodKey].cores[corKey] = {
          cor: corKey,
          total: 0,
          variacoes: {} // Nest by variation key (sku + size)
        };
      }
      agrupado[prodKey].cores[corKey].total += qtd;

      // Nest under variation (combination of SKU and size)
      const varKey = `${sku}|${parsed.size}`;
      if (!agrupado[prodKey].cores[corKey].variacoes[varKey]) {
        agrupado[prodKey].cores[corKey].variacoes[varKey] = {
          sku: sku,
          size: parsed.size,
          total: 0
        };
      }
      agrupado[prodKey].cores[corKey].variacoes[varKey].total += qtd;
    });

    let linhas = Object.values(agrupado);

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

    const labels = Object.keys(vendasPorData).sort((a, b) => {
      const [d1, m1, y1] = a.split("/");
      const [d2, m2, y2] = b.split("/");
      return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
    });
    
    const chartData = {
      labels,
      datasets: [
        {
          label: 'Itens Vendidos',
          data: labels.map(k => vendasPorData[k]),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderRadius: 4,
        }
      ]
    };

    // Doughnut Chart Data (Local)
    const locaisLabels = Object.keys(vendasPorLocalObj).sort((a, b) => vendasPorLocalObj[b] - vendasPorLocalObj[a]);
    const locaisData = locaisLabels.map(l => vendasPorLocalObj[l]);
    const bgColors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
      '#ef4444', '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e'
    ];
    
    const chartLocalData = locaisLabels.length > 0 ? {
      labels: locaisLabels.map(l => toTitleCase(l)),
      datasets: [{
        data: locaisData,
        backgroundColor: bgColors.slice(0, locaisLabels.length).concat(Array(Math.max(0, locaisLabels.length - bgColors.length)).fill('#cbd5e1')),
        borderWidth: 1,
      }]
    } : null;

    // Top Produtos Data (Horizontal Bar)
    const produtosLabels = Object.keys(produtosVendidosObj)
      .sort((a, b) => produtosVendidosObj[b] - produtosVendidosObj[a])
      .slice(0, 10);
    const produtosData = produtosLabels.map(p => produtosVendidosObj[p]);

    const chartProdutosData = produtosLabels.length > 0 ? {
      labels: produtosLabels.map(p => {
        const title = toTitleCase(p);
        return title.length > 25 ? title.substring(0, 25) + '...' : title;
      }),
      datasets: [{
        label: 'Vendas',
        data: produtosData,
        backgroundColor: '#10b981',
        borderRadius: 4,
      }]
    } : null;

    return { linhas, totalItens, chartData, chartLocalData, chartProdutosData, dataEstoque, dataVendas };
  }, [vendasRows, estoqueRows, filtroLocal, dataIni, dataFim, busca, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.linhas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type, mode = 'detalhado') => {
    const isSingleLocal = filtroLocal.length === 1;
    
    if (mode === 'resumido') {
      const headers = isSingleLocal ? ["Descrição", "Total Vendido"] : ["Descrição", "Local", "Total Vendido"];
      const exportData = dadosProcessados.linhas.map(item => {
        if (isSingleLocal) {
          return [item.descricao, item.total];
        } else {
          return [item.descricao, item.local, item.total];
        }
      });
      handleExport(type, "Relatorio_Vendas_Resumido", headers, exportData);
    } else {
      const headers = isSingleLocal ? ["SKU Sênior", "Descrição", "Total Vendido"] : ["SKU Sênior", "Descrição", "Local", "Total Vendido"];
      const exportData = [];
      dadosProcessados.linhas.forEach(item => {
        Object.values(item.cores).forEach(corObj => {
          Object.values(corObj.variacoes).forEach(v => {
            const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? ` ${corObj.cor}` : '';
            const sizePart = v.size && v.size !== 'U' ? ` Tam ${v.size}` : '';
            const fullDesc = `${item.descricao}${colorPart}${sizePart}`;
            
            if (isSingleLocal) {
              exportData.push([v.sku, fullDesc, v.total]);
            } else {
              exportData.push([v.sku, fullDesc, item.local, v.total]);
            }
          });
        });
      });
      handleExport(type, "Relatorio_Vendas_Detalhado", headers, exportData);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filtroLocal, dataIni, dataFim, busca, selectedCompany]);

  if (loading) {
    return (
      <div className="header-main">
        <h1>Vendas</h1>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div className="skeleton-loader" style={{ height: '40px', width: '200px' }}></div>
          <div className="skeleton-loader" style={{ height: '40px', width: '200px' }}></div>
        </div>
        <div className="skeleton-loader" style={{ height: '300px', width: '100%', marginBottom: '20px' }}></div>
        <div className="skeleton-loader" style={{ height: '400px', width: '100%' }}></div>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'red' }}>Erro ao carregar vendas: {error}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-main">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Vendas</h1>
          <p>Acompanhamento de saídas de estoque</p>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL</label>
          <Select
            isMulti
            options={locais.map(l => ({ value: l, label: l }))}
            value={filtroLocal}
            onChange={setFiltroLocal}
            placeholder="Todos os Locais"
            className="react-select-container"
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

      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flex: '1 1 300px', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Evolução de Vendas</h3>
          {dadosProcessados.chartData && (
            <div style={{ height: '250px' }}>
              <Bar 
                data={dadosProcessados.chartData} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } }
                }} 
              />
            </div>
          )}
        </div>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '24px 30px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: '1 1 200px' }}>
          <span style={{ fontSize: '13px', opacity: 0.9, fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Vendido no Período</span>
          <span style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.1 }}>{dadosProcessados.totalItens.toLocaleString('pt-BR')}</span>
          <span style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>peças</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Share de Vendas por Local</h3>
          {dadosProcessados.chartLocalData ? (
            <div style={{ height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Doughnut 
                data={dadosProcessados.chartLocalData} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } }
                  }
                }} 
              />
            </div>
          ) : (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Sem dados.
            </div>
          )}
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Top 10 Produtos Mais Vendidos</h3>
          {dadosProcessados.chartProdutosData ? (
            <div style={{ height: '280px' }}>
              <Bar 
                data={dadosProcessados.chartProdutosData} 
                options={{ 
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true } }
                }} 
              />
            </div>
          ) : (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Sem dados.
            </div>
          )}
        </div>
      </div>

      <MobileTable
        columns={[
          {
            key: 'descricao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição {getSortIcon('descricao')}</div>,
            rawLabel: 'Produto',
            render: (row) => <span style={{ fontWeight: 500 }}>{toTitleCase(row.descricao)}</span>,
            onSort: () => requestSort('descricao'),
          },
          ...(filtroLocal.length !== 1 ? [{
            key: 'local',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local {getSortIcon('local')}</div>,
            rawLabel: 'Local',
            render: (row) => toTitleCase(row.local),
            onSort: () => requestSort('local'),
          }] : []),
          {
            key: 'total',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total Vendido {getSortIcon('total')}</div>,
            rawLabel: 'Total Vendido',
            render: (row) => <span style={{ fontWeight: 600 }}>{row.total.toLocaleString('pt-BR')}</span>,
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
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '4px 10px', borderRadius: '20px', border: '1px solid #dbeafe' }}>
                      {corObj.total.toLocaleString('pt-BR')} peças
                    </span>
                  </div>
                  
                  {/* Tabela de Variações */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Tamanho</th>
                        <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>SKU</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '150px', background: '#fafafa' }}>Qtd Vendida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(corObj.variacoes).map((v) => (
                        <tr key={v.sku} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '10px 20px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '32px', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
                              {v.size || 'Único'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#475569', fontWeight: 500 }}>
                            {v.sku}
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '12px' }}>
                      {corObj.total} pçs
                    </span>
                  </div>
                  
                  {/* Lista de Variações Mobile */}
                  <div style={{ padding: '0 14px' }}>
                    {Object.values(corObj.variacoes).map((v, vIdx, arr) => (
                      <div key={v.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: vIdx === arr.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '28px', padding: '3px 6px', borderRadius: '5px', textAlign: 'center', fontSize: '12px' }}>
                            {v.size || 'Único'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '11px' }}>{v.sku}</span>
                          </div>
                        </div>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                          {v.total} pçs
                        </span>
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
