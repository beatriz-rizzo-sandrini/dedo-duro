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
import { getLatestDates, normalizeDateStr } from '../utils/dateUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_ESTOQUE, COL_VENDAS } from '../utils/sheetColumns';
import { parseProductDescription } from '../utils/productParser';
import MobileTable from '../components/MobileTable';

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
  const [expandedId, setExpandedId] = useState(null);

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
    const setMarcas = new Set();
    const setLocais = new Set();

    // Define limites de datas baseados em ontem, idênticos à página de Vendas (estáveis em UTC)
    const hojeLocal = new Date();
    const hojeUTC = Date.UTC(hojeLocal.getFullYear(), hojeLocal.getMonth(), hojeLocal.getDate());
    
    // Ontem às 23:59:59.999 UTC
    const ontemTime = hojeUTC - 1;
    
    // Limites de dias atrás em UTC (zerados à meia-noite)
    const d7Time = hojeUTC - (7 * 24 * 60 * 60 * 1000);
    const d15Time = hojeUTC - (15 * 24 * 60 * 60 * 1000);
    const d30Time = hojeUTC - (30 * 24 * 60 * 60 * 1000);

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);
    const normDataEstoque = dataEstoque ? normalizeDateStr(dataEstoque) : "";

    // 1. Processar Estoque primeiro para registrar todos os produtos e suas variações
    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
      if (normDataEstoque && normDataStr !== normDataEstoque) return;

      const sku = String(r?.c?.[COL_ESTOQUE.SKU]?.v || "");
      const local = String(r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase();
      const lojaEstoque = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;
      const marca = String(r?.c?.[COL_ESTOQUE.MARCA]?.v || "Sem Marca").toUpperCase().trim();
      const rawDesc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";

      if (sku) {
        if (selectedCompany !== 'TODAS' && lojaEstoque !== selectedCompany) return;
        
        if (marca) setMarcas.add(marca);
        if (local) setLocais.add(local);

        const parsed = parseProductDescription(rawDesc, sku);
        const prodKey = `${parsed.baseTitle}|${marca}`;

        if (!stats[prodKey]) {
          stats[prodKey] = {
            descricao: parsed.baseTitle,
            marca,
            vendas7d: 0,
            vendas15d: 0,
            vendas30d: 0,
            vendasFiltradas: 0,
            totalSempre: 0,
            totalEstoque: 0,
            cores: {},
            id: prodKey,
            skusArr: []
          };
        }

        if (sku && !stats[prodKey].skusArr.includes(sku)) stats[prodKey].skusArr.push(sku);
        const skuPlat = r?.c?.[7]?.v || "";
        if (skuPlat && !stats[prodKey].skusArr.includes(skuPlat)) stats[prodKey].skusArr.push(skuPlat);

        stats[prodKey].totalEstoque += qtd;

        const corKey = parsed.color;
        if (!stats[prodKey].cores[corKey]) {
          stats[prodKey].cores[corKey] = { cor: corKey, totalVendas: 0, totalEstoque: 0, variacoes: {} };
        }
        stats[prodKey].cores[corKey].totalEstoque += qtd;

        const varKey = `${sku}|${parsed.size}`;
        if (!stats[prodKey].cores[corKey].variacoes[varKey]) {
          stats[prodKey].cores[corKey].variacoes[varKey] = { 
            sku, 
            skuPlat, 
            size: parsed.size, 
            vendas7d: 0, 
            vendas15d: 0, 
            vendas30d: 0, 
            vendasFiltradas: 0, 
            totalSempre: 0, 
            estoque: 0 
          };
        }
        stats[prodKey].cores[corKey].variacoes[varKey].estoque += qtd;
      }
    });

    let totalGeralPeriodo = 0;
    const vendasPorMarca = {};
    const vendasPorProduto = {};
    const vendasPorLocal = {};
    const vendasPorData = {};

    // 2. Processar Vendas
    vendasRows.forEach(r => {
      const dataStr = r?.c?.[COL_VENDAS.DATA]?.f || "";
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dataVendaTime = Date.UTC(Number(y), Number(m) - 1, Number(d));
      
      const sku = String(r?.c?.[COL_VENDAS.SKU]?.v || "");
      const skuPlat = r?.c?.[6]?.v || "";
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      const local = String(r?.c?.[COL_VENDAS.LOCAL]?.v || "Sem Local").toUpperCase().trim();
      const marca = String(r?.c?.[COL_VENDAS.MARCA]?.v || "Sem Marca").toUpperCase().trim();
      const lojaVenda = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_VENDAS.QTD]?.v) || 0;

      if (selectedCompany !== 'TODAS' && lojaVenda !== selectedCompany) return;

      if (marca) setMarcas.add(marca);
      if (local) setLocais.add(local);

      // Filtra vendas de hoje em diante (fora do período encerrado)
      if (dataVendaTime > ontemTime) return;

      const parsed = parseProductDescription(desc, sku);
      const prodKey = `${parsed.baseTitle}|${marca}`;

      if (!stats[prodKey]) {
        stats[prodKey] = { 
          descricao: parsed.baseTitle, 
          marca, 
          vendas7d: 0, 
          vendas15d: 0, 
          vendas30d: 0, 
          vendasFiltradas: 0,
          totalSempre: 0,
          totalEstoque: 0,
          cores: {},
          id: prodKey,
          skusArr: []
        };
      }

      if (sku && !stats[prodKey].skusArr.includes(sku)) stats[prodKey].skusArr.push(sku);
      if (skuPlat && !stats[prodKey].skusArr.includes(skuPlat)) stats[prodKey].skusArr.push(skuPlat);

      if (dataVendaTime >= d7Time) stats[prodKey].vendas7d += qtd;
      if (dataVendaTime >= d15Time) stats[prodKey].vendas15d += qtd;
      if (dataVendaTime >= d30Time) stats[prodKey].vendas30d += qtd;
      stats[prodKey].totalSempre += qtd;

      const corKey = parsed.color;
      if (!stats[prodKey].cores[corKey]) {
        stats[prodKey].cores[corKey] = { cor: corKey, totalVendas: 0, totalEstoque: 0, variacoes: {} };
      }

      const varKey = `${sku}|${parsed.size}`;
      if (!stats[prodKey].cores[corKey].variacoes[varKey]) {
        stats[prodKey].cores[corKey].variacoes[varKey] = { 
          sku, 
          skuPlat, 
          size: parsed.size, 
          vendas7d: 0, 
          vendas15d: 0, 
          vendas30d: 0, 
          vendasFiltradas: 0, 
          totalSempre: 0, 
          estoque: 0 
        };
      }

      if (dataVendaTime >= d7Time) stats[prodKey].cores[corKey].variacoes[varKey].vendas7d += qtd;
      if (dataVendaTime >= d15Time) stats[prodKey].cores[corKey].variacoes[varKey].vendas15d += qtd;
      if (dataVendaTime >= d30Time) stats[prodKey].cores[corKey].variacoes[varKey].vendas30d += qtd;
      stats[prodKey].cores[corKey].variacoes[varKey].totalSempre += qtd;

      // Filtros de Seleção (Marca e Local)
      const passLocal = filtroLocal.length === 0 || filtroLocal.some(l => l.value === local);
      const passMarcaFiltro = filtroMarca.length === 0 || filtroMarca.some(m => m.value === marca);

      if (passLocal && passMarcaFiltro) {
        let considerar = false;
        if (filtroDias === '7' && dataVendaTime >= d7Time) considerar = true;
        else if (filtroDias === '15' && dataVendaTime >= d15Time) considerar = true;
        else if (filtroDias === '30' && dataVendaTime >= d30Time) considerar = true;
        else if (filtroDias === 'all') considerar = true;

        if (considerar) {
          stats[prodKey].vendasFiltradas += qtd;
          stats[prodKey].cores[corKey].totalVendas += qtd;
          stats[prodKey].cores[corKey].variacoes[varKey].vendasFiltradas += qtd;
          totalGeralPeriodo += qtd;

          // Agrupamento para Gráficos
          if (!vendasPorMarca[marca]) vendasPorMarca[marca] = 0;
          vendasPorMarca[marca] += qtd;

          if (!vendasPorProduto[parsed.baseTitle]) vendasPorProduto[parsed.baseTitle] = 0;
          vendasPorProduto[parsed.baseTitle] += qtd;

          if (!vendasPorLocal[local]) vendasPorLocal[local] = 0;
          vendasPorLocal[local] += qtd;

          if (!vendasPorData[dataStr]) vendasPorData[dataStr] = 0;
          vendasPorData[dataStr] += qtd;
        }
      }
    });

    const rows = Object.values(stats).map(s => {
      const share = totalGeralPeriodo > 0 ? ((s.vendasFiltradas / totalGeralPeriodo) * 100).toFixed(1) : 0;
      return { ...s, share: Number(share) };
    });

    // Filtro de Busca (na tabela)
    let filteredRows = rows.filter(r => {
      const hasFilter = filtroMarca.length > 0 || filtroLocal.length > 0;
      
      // Se há filtro ativo de marca/local, só mostra itens com venda no período filtrado
      if (hasFilter && r.vendasFiltradas === 0) return false;
      if (!busca) return r.vendasFiltradas > 0 || r.totalEstoque > 0;

      const termos = busca.toLowerCase().trim().split(/\s+/);
      const skusArray = r.skusArr.map(s => s.toLowerCase());
      const descLower = (r.descricao || "").toLowerCase();

      return termos.every(termo => 
        descLower.includes(termo) || 
        skusArray.some(sku => sku.includes(termo))
      );
    });

    // KPI stats
    let skusComVenda = 0;
    let skusRuptura = 0;
    
    rows.forEach(r => {
      Object.values(r.cores).forEach(c => {
        Object.values(c.variacoes).forEach(v => {
          if (v.vendasFiltradas > 0) {
            skusComVenda++;
            if (v.estoque === 0) {
              skusRuptura++;
            }
          }
        });
      });
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
    const totalEstoque = rows.reduce((acc, r) => acc + r.totalEstoque, 0);
    
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

  const handleExportData = (type, mode = 'detalhado') => {
    if (mode === 'resumido') {
      const headers = ["Descrição", "Marca", "Vendas (Período)", "Estoque", "Share %"];
      const exportData = dadosProcessados.linhas.map(item => [
        item.descricao,
        item.marca,
        item.vendasFiltradas,
        item.totalEstoque,
        item.share + "%"
      ]);
      handleExport(type, `Sellout_${filtroDias}d_Resumido`, headers, exportData);
    } else {
      const headers = ["SKU Sênior", "SKU Plataforma", "Descrição", "Marca", "Vendas (Período)", "Estoque", "Share %"];
      const exportData = [];
      
      dadosProcessados.linhas.forEach(item => {
        Object.values(item.cores).forEach(corObj => {
          Object.values(corObj.variacoes).forEach(v => {
            const share = dadosProcessados.totalVendasPeriodo > 0 ? ((v.vendasFiltradas / dadosProcessados.totalVendasPeriodo) * 100).toFixed(1) : 0;
            
            const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? ` ${corObj.cor}` : '';
            const sizePart = v.size && v.size !== 'U' ? ` Tam ${v.size}` : '';
            const fullDesc = `${item.descricao}${colorPart}${sizePart}`;

            exportData.push([
              v.sku,
              v.skuPlat || '',
              fullDesc,
              item.marca,
              v.vendasFiltradas,
              v.estoque,
              share + "%"
            ]);
          });
        });
      });
      handleExport(type, `Sellout_${filtroDias}d_Detalhado`, headers, exportData);
    }
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
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
                style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', minWidth: '220px' }}
              >
                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>EXPORTAR DETALHADO (SKUS)</div>
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

      <MobileTable
        columns={[
          {
            key: 'descricao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição {getSortIcon('descricao')}</div>,
            rawLabel: 'Descrição',
            render: (row) => <span style={{ fontWeight: 600 }}>{toTitleCase(row.descricao)}</span>,
            onSort: () => requestSort('descricao'),
          },
          {
            key: 'marca',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Marca {getSortIcon('marca')}</div>,
            rawLabel: 'Marca',
            render: (row) => (
              <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, color: '#475569' }}>
                {toTitleCase(row.marca)}
              </span>
            ),
            onSort: () => requestSort('marca'),
          },
          {
            key: 'vendasFiltradas',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Vendas {getSortIcon('vendasFiltradas')}</div>,
            rawLabel: 'Vendas',
            render: (row) => <span style={{ fontWeight: 600 }}>{row.vendasFiltradas.toLocaleString('pt-BR')}</span>,
            onSort: () => requestSort('vendasFiltradas'),
          },
          {
            key: 'totalEstoque',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Estoque {getSortIcon('totalEstoque')}</div>,
            rawLabel: 'Estoque',
            render: (row) => (
              <span style={{ color: row.totalEstoque === 0 ? '#ef4444' : 'inherit', fontWeight: row.totalEstoque === 0 ? '700' : 'normal' }}>
                {row.totalEstoque.toLocaleString('pt-BR')}
              </span>
            ),
            onSort: () => requestSort('totalEstoque'),
          },
          {
            key: 'share',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Share % {getSortIcon('share')}</div>,
            rawLabel: 'Share',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(row.share * 5, 100)}%`, height: '100%', background: '#3b82f6' }}></div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, width: '40px' }}>{row.share}%</span>
              </div>
            ),
            onSort: () => requestSort('share'),
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
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '4px 10px', borderRadius: '20px', border: '1px solid #dbeafe' }}>
                        Estoque: {corObj.totalEstoque.toLocaleString('pt-BR')} pçs
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                        Vendas: {corObj.totalVendas.toLocaleString('pt-BR')} pçs
                      </span>
                    </div>
                  </div>
                  
                  {/* Tabela de Variações */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '100px', background: '#fafafa' }}>Tamanho</th>
                        <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>SKU Sênior</th>
                        <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>SKU Plataforma</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Vendas</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Estoque</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(corObj.variacoes).map((v) => {
                        const varShare = dadosProcessados.totalVendasPeriodo > 0 ? ((v.vendasFiltradas / dadosProcessados.totalVendasPeriodo) * 100).toFixed(1) : 0;
                        return (
                          <tr key={v.sku} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                            <td style={{ padding: '10px 20px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '32px', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
                                {v.size || 'Único'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#475569', fontWeight: 500 }}>
                              {v.sku}
                            </td>
                            <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#64748b', fontSize: '12px' }}>
                              {v.skuPlat || '-'}
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                              {v.vendasFiltradas.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: v.estoque === 0 ? '#ef4444' : '#0f172a' }}>
                              {v.estoque.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                              {varShare}%
                            </td>
                          </tr>
                        );
                      })}
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
                      Estoque: {corObj.totalEstoque}
                    </span>
                  </div>
                  
                  {/* Lista de Variações Mobile */}
                  <div style={{ padding: '0 14px' }}>
                    {Object.values(corObj.variacoes).map((v, vIdx, arr) => {
                      const varShare = dadosProcessados.totalVendasPeriodo > 0 ? ((v.vendasFiltradas / dadosProcessados.totalVendasPeriodo) * 100).toFixed(1) : 0;
                      return (
                        <div key={v.sku} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: vIdx === arr.length - 1 ? 'none' : '1px solid #f1f5f9', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '28px', padding: '3px 6px', borderRadius: '5px', textAlign: 'center', fontSize: '12px' }}>
                                {v.size || 'Único'}
                              </span>
                              <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>{v.sku}</span>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#3b82f6' }}>
                              {varShare}%
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                            <span>Vendas: {v.vendasFiltradas} un</span>
                            <span style={{ color: v.estoque === 0 ? '#ef4444' : 'inherit' }}>Estoque: {v.estoque} un</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        emptyMessage="Nenhum resultado encontrado para os filtros selecionados."
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
