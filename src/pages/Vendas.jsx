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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const getTodayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const get30DaysAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
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
  const [dataIni, setDataIni] = useState(get30DaysAgoStr());
  const [dataFim, setDataFim] = useState(getTodayStr());
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
      const l = (r?.c?.[1]?.v || "").toUpperCase().trim();
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
      const sku = r?.c?.[1]?.v || "";
      const desc = r?.c?.[2]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });

    // 2. Fallback para as vendas caso o SKU não exista mais no estoque
    vendasRows.forEach(r => {
      const sku = r?.c?.[2]?.v || "";
      const desc = r?.c?.[3]?.v || "";
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
      const dateVal = r?.c?.[0]?.f;
      const dateRow = parseDateStr(dateVal);
      if (!dateVal) return;

      const local = (r?.c?.[1]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const sku = r?.c?.[2]?.v || "";
      let desc = r?.c?.[3]?.v || "";
      const qtd = r?.c?.[4]?.v || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.some(f => f.value === local)) return;
      if (dateRow < inicioTime) return;
      if (dateRow > fimTime) return;

      if (busca) {
        const termos = busca.toLowerCase().trim().split(/\s+/);
        const descLower = desc.toLowerCase();
        const skuLower = sku.toLowerCase();
        
        const matches = termos.every(termo => 
          descLower.includes(termo) || 
          skuLower.includes(termo)
        );
        if (!matches) return;
      }

      totalItens += qtd;
      
      if (!vendasPorData[dateVal]) vendasPorData[dateVal] = 0;
      vendasPorData[dateVal] += qtd;

      if (!vendasPorLocalObj[local]) vendasPorLocalObj[local] = 0;
      vendasPorLocalObj[local] += qtd;

      if (!produtosVendidosObj[desc]) produtosVendidosObj[desc] = 0;
      produtosVendidosObj[desc] += qtd;

      const key = desc + "|" + local;
      if (!agrupado[key]) {
        agrupado[key] = { descricao: desc, local: local, total: 0, skus: {}, id: key };
      }
      agrupado[key].total += qtd;
      if (!agrupado[key].skus[sku]) agrupado[key].skus[sku] = 0;
      agrupado[key].skus[sku] += qtd;
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

  const handleExportData = (type) => {
    const isSingleLocal = filtroLocal.length === 1;
    const headers = isSingleLocal ? ["SKU", "Descrição", "Total Vendido"] : ["SKU", "Descrição", "Local", "Total Vendido"];
    const exportData = [];
    dadosProcessados.linhas.forEach(item => {
      Object.entries(item.skus || {}).forEach(([sku, qtd]) => {
        if (isSingleLocal) exportData.push([sku, item.descricao, qtd]);
        else exportData.push([sku, item.descricao, item.local, qtd]);
      });
    });
    handleExport(type, "Relatorio_Vendas", headers, exportData);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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

      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flex: 1 }}>
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
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '250px' }}>
          <span style={{ fontSize: '14px', opacity: 0.9, fontWeight: 500, marginBottom: '8px' }}>TOTAL VENDIDO NO PERÍODO</span>
          <span style={{ fontSize: '48px', fontWeight: 800 }}>{dadosProcessados.totalItens.toLocaleString('pt-BR')}</span>
          <span style={{ fontSize: '14px', opacity: 0.8 }}>peças</span>
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

      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('descricao')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição {getSortIcon('descricao')}</div>
            </th>
            {filtroLocal.length !== 1 && (
              <th onClick={() => requestSort('local')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local {getSortIcon('local')}</div>
              </th>
            )}
            <th onClick={() => requestSort('total')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total Vendido {getSortIcon('total')}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhasPaginadas.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <React.Fragment key={item.id}>
                <tr style={{ background: isExpanded ? '#f8fafc' : 'transparent', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                  <td style={{ fontWeight: 500 }}>{toTitleCase(item.descricao)}</td>
                  {filtroLocal.length !== 1 && <td>{toTitleCase(item.local)}</td>}
                  <td style={{ fontWeight: 600 }}>{item.total.toLocaleString('pt-BR')}</td>
                </tr>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <td colSpan={filtroLocal.length === 1 ? 2 : 3} style={{ padding: 0 }}>
                        <div style={{ padding: '16px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <table style={{ width: '100%', fontSize: '13px' }}>
                            <tbody>
                              {Object.entries(item.skus).map(([sku, qtd]) => (
                                <tr key={sku}>
                                  <td style={{ padding: '8px 0', color: '#64748b' }}>SKU: <span style={{ fontWeight: 600, color: '#0f172a' }}>{sku}</span></td>
                                  <td style={{ padding: '8px 0', width: '100px' }}>{qtd.toLocaleString('pt-BR')} peças</td>
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
            );
          })}
          {linhasPaginadas.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nenhum dado encontrado para os filtros aplicados.</td>
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
