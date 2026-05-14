import React, { useState, useMemo, useEffect } from 'react';
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
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet, Filter } from 'lucide-react';
import { handleExport } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import HeaderDates from '../components/HeaderDates';
import { getLatestDates } from '../utils/dateUtils';
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

export default function Sellout() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const vendasRows = data.vendas || [];
  const estoqueRows = data.estoque || [];

  const [busca, setBusca] = useState('');
  const [filtroMarca, setFiltroMarca] = useState([]);
  const [filtroLocal, setFiltroLocal] = useState([]);
  const [filtroDias, setFiltroDias] = useState('30');
  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'vendasFiltradas', direction: 'desc' });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [busca, filtroMarca, filtroLocal, selectedCompany, filtroDias]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const dadosProcessados = useMemo(() => {
    if (!vendasRows.length) return { 
      linhas: [], 
      marcasRanking: [], 
      totalVendasPeriodo: 0,
      chartMarcaData: null,
      chartTopProdData: null,
      marcasOptions: [],
      locaisOptions: [],
      dataEstoque: "",
      dataVendas: ""
    };

    const stats = {};
    const estoqueMap = {};
    const setMarcas = new Set();
    const setLocais = new Set();

    // 1. Mapeia Estoque (Filtrado por Loja se necessário)
    estoqueRows.forEach(r => {
      const sku = String(r?.c?.[1]?.v || "");
      const localEstoque = String(r?.c?.[3]?.v || "").toUpperCase();
      const lojaEstoque = localEstoque.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = r?.c?.[5]?.v || 0;

      if (sku) {
        if (selectedCompany !== 'TODAS' && lojaEstoque !== selectedCompany) return;
        
        if (!estoqueMap[sku]) estoqueMap[sku] = 0;
        estoqueMap[sku] += qtd;
      }
    });

    const hoje = new Date();
    const d7 = new Date(); d7.setDate(hoje.getDate() - 7);
    const d15 = new Date(); d15.setDate(hoje.getDate() - 15);
    const d30 = new Date(); d30.setDate(hoje.getDate() - 30);

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);

    let totalGeralPeriodo = 0;
    const vendasPorMarca = {};
    const vendasPorProduto = {};
    const vendasPorLocal = {};
    const vendasPorData = {};

    // 2. Processa Vendas
    vendasRows.forEach(r => {
      const dataStr = r?.c?.[0]?.f || "";
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dataVenda = new Date(`${y}-${m}-${d}`);
      
      const sku = String(r?.c?.[2]?.v || "");
      const desc = r?.c?.[3]?.v || "";
      const local = String(r?.c?.[1]?.v || "Sem Local").toUpperCase().trim();
      const marca = String(r?.c?.[5]?.v || "Sem Marca").toUpperCase().trim();
      const lojaVenda = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = r?.c?.[4]?.v || 0;

      // Filtro de Loja (Buy Clock vs Sandrini)
      if (selectedCompany !== 'TODAS' && lojaVenda !== selectedCompany) return;

      if (marca) setMarcas.add(marca);
      if (local) setLocais.add(local);

      if (!stats[sku]) {
        stats[sku] = { 
          sku, 
          descricao: desc, 
          marca, 
          vendas7d: 0, 
          vendas15d: 0, 
          vendas30d: 0, 
          vendasFiltradas: 0,
          totalSempre: 0
        };
      }

      // Estatísticas básicas (sempre calculadas)
      if (dataVenda >= d7) stats[sku].vendas7d += qtd;
      if (dataVenda >= d15) stats[sku].vendas15d += qtd;
      if (dataVenda >= d30) stats[sku].vendas30d += qtd;
      stats[sku].totalSempre += qtd;

      // Filtros de Seleção (Marca e Local)
      const passLocal = filtroLocal.length === 0 || filtroLocal.some(l => l.value === local);
      const passMarcaFiltro = filtroMarca.length === 0 || filtroMarca.some(m => m.value === marca);

      if (passLocal && passMarcaFiltro) {
        let considerar = false;
        if (filtroDias === '7' && dataVenda >= d7) considerar = true;
        else if (filtroDias === '15' && dataVenda >= d15) considerar = true;
        else if (filtroDias === '30' && dataVenda >= d30) considerar = true;
        else if (filtroDias === 'all') considerar = true;

        if (considerar) {
          stats[sku].vendasFiltradas += qtd;
          totalGeralPeriodo += qtd;

          // Agrupamento para Gráficos
          if (!vendasPorMarca[marca]) vendasPorMarca[marca] = 0;
          vendasPorMarca[marca] += qtd;

          if (!vendasPorProduto[desc]) vendasPorProduto[desc] = 0;
          vendasPorProduto[desc] += qtd;

          if (!vendasPorLocal[local]) vendasPorLocal[local] = 0;
          vendasPorLocal[local] += qtd;

          if (!vendasPorData[dataStr]) vendasPorData[dataStr] = 0;
          vendasPorData[dataStr] += qtd;
        }
      }
    });

    const rows = Object.values(stats).map(s => {
      const stock = estoqueMap[s.sku] || 0;
      const share = totalGeralPeriodo > 0 ? ((s.vendasFiltradas / totalGeralPeriodo) * 100).toFixed(1) : 0;
      return { ...s, estoque: stock, share: Number(share) };
    });

    // Filtro de Busca (na tabela)
    const filteredRows = rows.filter(r => {
      const termo = busca.toLowerCase().trim();
      const hasFilter = filtroMarca.length > 0 || filtroLocal.length > 0;
      
      // Se há filtro ativo de marca/local, só mostra itens com venda no período filtrado
      if (hasFilter && r.vendasFiltradas === 0) return false;
      // Sem busca, mostra apenas quem tem venda ou estoque
      if (!termo) return r.vendasFiltradas > 0 || r.estoque > 0;
      return r.sku.toLowerCase().includes(termo) || r.descricao.toLowerCase().includes(termo);
    });

    // Ordenação
    if (sortConfig.key) {
      filteredRows.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Chart Data
    const bgColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e'];
    
    let chartMarcaData = null;
    let chartType = 'doughnut'; // default
    const isSingleMarca = filtroMarca.length === 1;
    const isSingleLocal = filtroLocal.length === 1;

    if (isSingleMarca && isSingleLocal) {
      // Evolução de Vendas
      chartType = 'bar';
      const sortedDates = Object.keys(vendasPorData).sort((a, b) => {
        const [d1, m1, y1] = a.split("/");
        const [d2, m2, y2] = b.split("/");
        return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
      });
      chartMarcaData = {
        labels: sortedDates,
        datasets: [{
          label: 'Vendas',
          data: sortedDates.map(d => vendasPorData[d]),
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      };
    } else if (isSingleMarca) {
      // Share por Local
      const locaisLabels = Object.keys(vendasPorLocal).sort((a, b) => vendasPorLocal[b] - vendasPorLocal[a]);
      chartMarcaData = {
        labels: locaisLabels.map(l => toTitleCase(l)),
        datasets: [{
          data: locaisLabels.map(l => vendasPorLocal[l]),
          backgroundColor: bgColors,
          borderWidth: 0,
          hoverOffset: 15
        }]
      };
    } else {
      // Market Share por Marca (Top 10 + Outras)
      const marcasOrdenadas = Object.keys(vendasPorMarca).sort((a, b) => vendasPorMarca[b] - vendasPorMarca[a]);
      const top10 = marcasOrdenadas.slice(0, 10);
      const outras = marcasOrdenadas.slice(10);
      
      const labels = top10.map(m => toTitleCase(m));
      const values = top10.map(m => vendasPorMarca[m]);
      const colors = [...bgColors];
      
      if (outras.length > 0) {
        labels.push('Outras');
        values.push(outras.reduce((acc, m) => acc + vendasPorMarca[m], 0));
        colors.push('#94a3b8'); // Gray for others
      }

      chartMarcaData = {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 15
        }]
      };
    }

    // Chart Data: Top Produtos
    const topProdLabels = Object.keys(vendasPorProduto).sort((a, b) => vendasPorProduto[b] - vendasPorProduto[a]).slice(0, 10);
    const chartTopProdData = {
      labels: topProdLabels.map(p => p.length > 20 ? p.substring(0, 20) + '...' : p),
      datasets: [{
        label: 'Vendas',
        data: topProdLabels.map(p => vendasPorProduto[p]),
        backgroundColor: isSingleMarca ? '#8b5cf6' : '#3b82f6',
        borderRadius: 6,
      }]
    };

    // KPIs Adicionais
    const skusComVenda = rows.filter(r => r.vendasFiltradas > 0).length;
    const totalEstoque = rows.reduce((acc, r) => acc + r.estoque, 0);
    const skusRuptura = rows.filter(r => r.vendasFiltradas > 0 && r.estoque === 0).length;
    
    const numDias = filtroDias === 'all' ? 30 : Number(filtroDias); // Fallback para 30 se for all
    const vmd = (totalGeralPeriodo / numDias).toFixed(1);

    return { 
      linhas: filteredRows, 
      totalVendasPeriodo: totalGeralPeriodo,
      skusComVenda,
      totalEstoque,
      skusRuptura,
      vmd,
      isSingleMarca,
      isSingleLocal,
      chartType,
      chartMarcaData: Object.keys(vendasPorData).length > 0 ? chartMarcaData : null,
      chartTopProdData: topProdLabels.length > 0 ? chartTopProdData : null,
      marcasOptions: Array.from(setMarcas).sort().map(m => ({ value: m, label: toTitleCase(m) })),
      locaisOptions: Array.from(setLocais).sort().map(l => ({ value: l, label: toTitleCase(l) })),
      dataEstoque,
      dataVendas
    };
  }, [vendasRows, estoqueRows, busca, filtroMarca, filtroLocal, selectedCompany, filtroDias, sortConfig]);

  const handleExportData = (type) => {
    const headers = ["SKU", "Descrição", "Marca", "Vendas (Período)", "Estoque", "Share %"];
    const exportData = dadosProcessados.linhas.map(r => [
      r.sku,
      r.descricao,
      r.marca,
      r.vendasFiltradas,
      r.estoque,
      r.share + "%"
    ]);
    handleExport(type, `Sellout_${filtroDias}d`, headers, exportData);
  };

  if (loading) {
    return (
      <div className="header-main">
        <h1>Sellout</h1>
        <div className="skeleton-loader" style={{ height: '40px', width: '200px', marginBottom: '20px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
          <div className="skeleton-loader" style={{ height: '100px' }}></div>
          <div className="skeleton-loader" style={{ height: '100px' }}></div>
          <div className="skeleton-loader" style={{ height: '100px' }}></div>
          <div className="skeleton-loader" style={{ height: '100px' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="skeleton-loader" style={{ height: '400px' }}></div>
          <div className="skeleton-loader" style={{ height: '400px' }}></div>
        </div>
      </div>
    );
  }

  const totalPaginas = Math.ceil(dadosProcessados.linhas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const KPICard = ({ title, value, sub, icon: Icon, color }) => (
    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
        {Icon && <Icon size={16} color={color || '#94a3b8'} />}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{sub}</div>}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Sellout</h1>
          <p>Análise de performance por SKU e Marcas</p>
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
                style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', minWidth: '180px' }}
              >
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => { handleExportData('csv'); setIsExportMenuOpen(false); }}>
                  <FileText size={16} color="#64748b" /> CSV
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => { handleExportData('xlsx'); setIsExportMenuOpen(false); }}>
                  <FileSpreadsheet size={16} color="#10b981" /> Excel (XLSX)
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => { handleExportData('pdf'); setIsExportMenuOpen(false); }}>
                  <FileText size={16} color="#ef4444" /> PDF
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="filters-container">
        <div style={{ flex: 2, minWidth: '250px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Pesquisar</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="input-padrao" 
              style={{ paddingLeft: '40px' }} 
              placeholder="SKU ou Descrição..." 
              value={busca} 
              onChange={e => setBusca(e.target.value)} 
            />
          </div>
        </div>

        <CompanySelector />

        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Marcas</label>
          <Select 
            isMulti
            options={dadosProcessados.marcasOptions}
            value={filtroMarca}
            onChange={setFiltroMarca}
            placeholder="Todas as Marcas"
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Local</label>
          <Select 
            isMulti
            options={dadosProcessados.locaisOptions}
            value={filtroLocal}
            onChange={setFiltroLocal}
            placeholder="Todos os Locais"
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ width: '150px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Período</label>
          <Select 
            options={[
              { value: '7', label: '7 Dias' },
              { value: '15', label: '15 Dias' },
              { value: '30', label: '30 Dias' },
              { value: 'all', label: 'Tudo' }
            ]}
            value={{
              '7': { value: '7', label: '7 Dias' },
              '15': { value: '15', label: '15 Dias' },
              '30': { value: '30', label: '30 Dias' },
              'all': { value: 'all', label: 'Tudo' }
            }[filtroDias]}
            onChange={opt => setFiltroDias(opt.value)}
            isSearchable={false}
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <KPICard 
          title="Total Vendido" 
          value={dadosProcessados.totalVendasPeriodo.toLocaleString('pt-BR')} 
          sub="Peças no período" 
          icon={FileText} 
          color="#3b82f6" 
        />
        <KPICard 
          title="VMD" 
          value={dadosProcessados.vmd} 
          sub="Venda Média Diária" 
          icon={ArrowUp} 
          color="#10b981" 
        />
        <KPICard 
          title="SKUs com Venda" 
          value={dadosProcessados.skusComVenda} 
          sub="SKUs únicos vendidos" 
          icon={Search} 
          color="#8b5cf6" 
        />
        <KPICard 
          title="Ruptura" 
          value={dadosProcessados.skusRuptura} 
          sub="SKUs vendidos sem estoque" 
          icon={Filter} 
          color="#ef4444" 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Gráfico Dinâmico (Market Share / Share Local / Evolução) */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {dadosProcessados.isSingleMarca && dadosProcessados.isSingleLocal 
              ? 'Evolução de Vendas Diárias' 
              : dadosProcessados.isSingleMarca 
                ? 'Share por Local (Canais)' 
                : 'Market Share por Marca'}
          </h3>
          <div style={{ height: '320px', display: 'flex', justifyContent: 'center' }}>
            {dadosProcessados.chartMarcaData ? (
              dadosProcessados.chartType === 'bar' ? (
                <Bar 
                  data={dadosProcessados.chartMarcaData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false } } }
                  }} 
                />
              ) : (
                <Doughnut 
                  data={dadosProcessados.chartMarcaData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { 
                      legend: { position: 'right', labels: { boxWidth: 12, padding: 20, font: { size: 11 } } },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.parsed;
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${value.toLocaleString('pt-BR')} peças (${pct}%)`;
                          }
                        }
                      }
                    } 
                  }} 
                />
              )
            ) : <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}>Sem dados</div>}
          </div>
        </div>

        {/* Gráfico Top Produtos */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 10 Produtos Mais Vendidos</h3>
          <div style={{ height: '320px' }}>
            {dadosProcessados.chartTopProdData ? (
              <Bar 
                data={dadosProcessados.chartTopProdData} 
                options={{ 
                  maintainAspectRatio: false, 
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false } }, y: { ticks: { font: { size: 11 } } } }
                }} 
              />
            ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>Sem dados</div>}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="data-table" style={{ border: 'none', boxShadow: 'none' }}>
          <thead>
            <tr>
              <th onClick={() => requestSort('sku')} style={{ cursor: 'pointer' }}>SKU {getSortIcon('sku')}</th>
              <th onClick={() => requestSort('descricao')} style={{ cursor: 'pointer' }}>DESCRIÇÃO {getSortIcon('descricao')}</th>
              <th onClick={() => requestSort('marca')} style={{ cursor: 'pointer' }}>MARCA {getSortIcon('marca')}</th>
              <th onClick={() => requestSort('vendasFiltradas')} style={{ cursor: 'pointer', textAlign: 'center' }}>VENDAS {getSortIcon('vendasFiltradas')}</th>
              <th onClick={() => requestSort('estoque')} style={{ cursor: 'pointer', textAlign: 'center' }}>ESTOQUE {getSortIcon('estoque')}</th>
              <th onClick={() => requestSort('share')} style={{ cursor: 'pointer', textAlign: 'center' }}>SHARE % {getSortIcon('share')}</th>
            </tr>
          </thead>
          <tbody>
            {linhasPaginadas.map((r, i) => (
              <tr key={r.sku + i}>
                <td style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>{r.sku}</td>
                <td style={{ fontSize: '13px' }}>{toTitleCase(r.descricao)}</td>
                <td>
                  <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, color: '#475569' }}>
                    {toTitleCase(r.marca)}
                  </span>
                </td>
                <td style={{ textAlign: 'center', fontWeight: '600' }}>{r.vendasFiltradas}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ color: r.estoque === 0 ? '#ef4444' : 'inherit', fontWeight: r.estoque === 0 ? '700' : 'normal' }}>
                    {r.estoque}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ width: '40px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(r.share * 5, 100)}%`, height: '100%', background: '#3b82f6' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, width: '40px' }}>{r.share}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {linhasPaginadas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  Nenhum resultado encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginação */}
        <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Mostrando <strong>{linhasPaginadas.length}</strong> de <strong>{dadosProcessados.linhas.length}</strong> SKUs
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '10px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Linhas:</span>
              <select 
                className="input-padrao" 
                style={{ width: 'auto', padding: '4px 24px 4px 10px', height: '32px' }} 
                value={itensPorPagina} 
                onChange={e => setItensPorPagina(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {totalPaginas > 1 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="btn-padrao" style={{ padding: '6px' }}
                >
                  <ChevronLeft size={18} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {currentPage} / {totalPaginas}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPaginas, p + 1))} 
                  disabled={currentPage === totalPaginas}
                  className="btn-padrao" style={{ padding: '6px' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
