import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import {
  Trophy, TrendingUp, Search, UserCheck, CalendarDays, ChevronLeft, ChevronRight,
  Video, Radio, ShoppingBag, Filter, ArrowRightLeft, Percent, AlertCircle, PieChart,
  Info, UploadCloud, CheckCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { supabase } from '../services/supabase';
import { processTikTokFiles, mergeMarketplaceData } from '../utils/tiktokProcessor';
import './Marketplace.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

const formatNumber = (val) => {
  return new Intl.NumberFormat('pt-BR').format(val || 0);
};

const formatPeriod = (periodStr) => {
  if (!periodStr || !periodStr.includes('-')) return periodStr;
  const parts = periodStr.split('-');
  if (parts.length !== 2) return periodStr;

  const formatDate = (d) => {
    if (d.length !== 8) return d;
    return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
  };

  return `${formatDate(parts[0])} a ${formatDate(parts[1])}`;
};

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Hook auxiliar para ordenar dados
const sortArray = (array, config, defaultKey = 'gmv') => {
  if (!array || !Array.isArray(array)) return [];
  const key = config.key || defaultKey;

  return [...array].sort((a, b) => {
    let valA = a[key] !== undefined ? a[key] : 0;
    let valB = b[key] !== undefined ? b[key] : 0;

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return config.direction === 'asc' ? -1 : 1;
    if (valA > valB) return config.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState(0);
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const searchTerm = useDeferredValue(rawSearchTerm);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [marketplaceData, setMarketplaceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('tiktok_reports')
          .select('created_at, period, data')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data && data.length > 0) {
          const merged = mergeMarketplaceData(data);
          setMarketplaceData(merged);
        } else {
          throw new Error("Nenhum dado encontrado nos últimos 30 dias.");
        }
      } catch (err) {
        console.error("Erro ao buscar dados do Supabase:", err);
        setDataError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Configurador de ordenação (Resetado ao mudar de aba)
  const [sortConfig, setSortConfig] = useState({ key: 'gmv', direction: 'desc' });

  useEffect(() => {
    // Reset sort when changing tabs
    setSortConfig({ key: 'gmv', direction: 'desc' });
  }, [activeTab]);

  const handleSort = (key) => {
    let direction = 'desc'; // Sempre começa decrescente (maior para o menor)
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // TABS DEFINITION
  const tabs = [
    { id: 0, label: 'Visão Geral', icon: PieChart },
    { id: 1, label: 'Performance por Criador', icon: UserCheck },
    { id: 2, label: 'Produto x Criador', icon: ArrowRightLeft },
    { id: 3, label: 'Vídeo x Live', icon: Video },
    { id: 4, label: 'Funil de Conversão', icon: Filter },
    { id: 5, label: 'Cancelamentos', icon: AlertCircle },
    { id: 6, label: 'Concentração de Receita', icon: Trophy },
    { id: 7, label: 'Comissão e Margem', icon: Percent },
  ];

  // ==========================================
  // DATA FILTERING & AGGREGATIONS
  // ==========================================

  const filteredVideos = useMemo(() => {
    if (!marketplaceData?.videos) return [];
    return marketplaceData.videos.filter(v => {
      if (startDate && v.date && v.date < startDate) return false;
      if (endDate && v.date && v.date > endDate) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !v.creator_name?.toLowerCase().includes(term) &&
          !v.video_title?.toLowerCase().includes(term) &&
          (!v.product_names || !v.product_names.some(pn => pn.toLowerCase().includes(term)))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [startDate, endDate, searchTerm, marketplaceData]);

  const filteredLives = useMemo(() => {
    if (!marketplaceData?.lives) return [];
    return marketplaceData.lives.filter(l => {
      if (startDate && l.date && l.date < startDate) return false;
      if (endDate && l.date && l.date > endDate) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !l.creator_name?.toLowerCase().includes(term) &&
          !l.live_title?.toLowerCase().includes(term) &&
          (!l.product_names || !l.product_names.some(pn => pn.toLowerCase().includes(term)))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [startDate, endDate, searchTerm, marketplaceData]);

  const filteredAffinity = useMemo(() => {
    if (!marketplaceData?.unified_affinity) return [];
    return marketplaceData.unified_affinity.filter(item => {
      if (startDate && item.date && item.date < startDate) return false;
      if (endDate && item.date && item.date > endDate) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!item.creator_name?.toLowerCase().includes(term) && !item.product_name?.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [startDate, endDate, searchTerm, marketplaceData]);

  // Totais Globais
  const sortedCreators = useMemo(() => {
    if (!marketplaceData?.creators) return [];
    let list = [...marketplaceData.creators].filter(c => c.creator_name && c.creator_name.trim() !== '');
    if (searchTerm) {
      list = list.filter(c => c.creator_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return sortArray(list, sortConfig);
  }, [searchTerm, sortConfig, marketplaceData]);

  const totalGMV = marketplaceData?.metadata?.total_gmv || marketplaceData?.videos?.reduce((acc, v) => acc + (v.gmv || 0), 0) + marketplaceData?.lives?.reduce((acc, l) => acc + (l.gmv || 0), 0) || 0;
  const totalRefunds = useMemo(() => sortedCreators.reduce((acc, c) => acc + (c.refunds || 0), 0), [sortedCreators]);
  const totalCommission = useMemo(() => sortedCreators.reduce((acc, c) => acc + (c.commission || 0), 0), [sortedCreators]);

  const videoStats = useMemo(() => {
    return filteredVideos.reduce((acc, v) => ({
      gmv: acc.gmv + (v.gmv || 0),
      views: acc.views + (v.views || 0),
      clicks: acc.clicks + (v.clicks || 0),
      orders: acc.orders + (v.orders || 0),
      count: acc.count + 1
    }), { gmv: 0, views: 0, clicks: 0, orders: 0, count: 0 });
  }, [filteredVideos]);

  const liveStats = useMemo(() => {
    return filteredLives.reduce((acc, l) => ({
      gmv: acc.gmv + (l.gmv || 0),
      views: acc.views + (l.views || 0),
      clicks: acc.clicks + (l.clicks || 0),
      orders: acc.orders + (l.orders || 0),
      count: acc.count + 1
    }), { gmv: 0, views: 0, clicks: 0, orders: 0, count: 0 });
  }, [filteredLives]);

  // Top Products
  const sortedProducts = useMemo(() => {
    if (!marketplaceData?.products) return [];
    let list = [...marketplaceData.products].filter(p => p.product_name && p.product_name.trim() !== '');
    if (searchTerm) {
      list = list.filter(p => p.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return sortArray(list, sortConfig).slice(0, 10);
  }, [searchTerm, sortConfig, marketplaceData]);

  // Affinity Data
  const affinityList = useMemo(() => {
    const map = {};
    filteredAffinity.forEach(item => {
      if (!item.creator_name || !item.product_name) return;
      const key = `${item.creator_name}|${item.product_name}`;
      if (!map[key]) {
        map[key] = { creator_name: item.creator_name, product_name: item.product_name, gmv: 0, orders: 0, video_gmv: 0, live_gmv: 0 };
      }
      map[key].gmv += (item.gmv_presence || 0);
      map[key].orders += (item.orders_presence || 0);
      if (item.format === 'video') map[key].video_gmv += (item.gmv_presence || 0);
      if (item.format === 'live') map[key].live_gmv += (item.gmv_presence || 0);
    });
    const list = Object.values(map);
    return sortArray(list, sortConfig).slice(0, 50);
  }, [filteredAffinity, sortConfig]);

  // Chart Data
  const top3Creators = [...sortedCreators].sort((a, b) => (b.gmv || 0) - (a.gmv || 0)).slice(0, 3);

  const formatChartData = {
    labels: ['Vídeos Curtos', 'LIVEs'],
    datasets: [{
      data: [videoStats.gmv, liveStats.gmv],
      backgroundColor: ['#3b82f6', '#ef4444'],
      borderColor: ['#2563eb', '#dc2626'],
      borderWidth: 1,
    }],
  };

  const topCreatorsChartData = {
    labels: top3Creators.map(c => c.creator_name.substring(0, 15)),
    datasets: [{
      label: 'GMV (R$)',
      data: top3Creators.map(c => c.gmv),
      backgroundColor: '#10b981',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  // ==========================================
  // RENDERS
  // ==========================================

  const renderTab0 = () => (
    <div className="animated-fade-in">
      <div className="mkp-sections-grid" style={{ marginBottom: '24px' }}>
        <div className="mkp-table-section" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={20} className="header-icon" /> Distribuição por Formato (GMV)
          </h2>
          <div style={{ height: '300px' }}>
            <Doughnut data={formatChartData} options={chartOptions} />
          </div>
        </div>

        <div className="mkp-table-section" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} className="header-icon" style={{ color: '#f59e0b' }} /> Top Criadores
          </h2>
          <div style={{ height: '300px' }}>
            <Bar data={topCreatorsChartData} options={barOptions} />
          </div>
        </div>
      </div>

      <div className="mkp-table-section" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={24} className="header-icon" /> Resumo do Funil de Vendas (Geral)
        </h2>
        <div className="funnel-container" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div className="funnel-step">
            <div className="funnel-label">Visualizações Totais</div>
            <div className="funnel-value">{formatNumber(videoStats.views + liveStats.views)}</div>
          </div>
          <div className="funnel-arrow">➔</div>
          <div className="funnel-step">
            <div className="funnel-label">Cliques no Link</div>
            <div className="funnel-value">{formatNumber(videoStats.clicks + liveStats.clicks)}</div>
            <div className="funnel-rate">
              CTR: {(videoStats.views + liveStats.views) ? (((videoStats.clicks + liveStats.clicks) / (videoStats.views + liveStats.views)) * 100).toFixed(2) : 0}%
            </div>
          </div>
          <div className="funnel-arrow">➔</div>
          <div className="funnel-step">
            <div className="funnel-label">Pedidos Finais</div>
            <div className="funnel-value" style={{ color: 'var(--mkp-accent-green)' }}>{formatNumber(videoStats.orders + liveStats.orders)}</div>
            <div className="funnel-rate" style={{ background: 'transparent', color: 'var(--mkp-accent-green)' }}>
              CVR: {(videoStats.clicks + liveStats.clicks) ? (((videoStats.orders + liveStats.orders) / (videoStats.clicks + liveStats.clicks)) * 100).toFixed(2) : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTab1 = () => (
    <div className="animated-fade-in">
      <div className="mkp-top-creators">
        <h2><Trophy className="icon-title" size={24} /> Top 3 Criadores (Performance Geral)</h2>
        <div className="cards-grid">
          {top3Creators.map((creator, index) => (
            <div key={index} className={`creator-card rank-${index + 1}`}>
              <div className="rank-badge">#{index + 1}</div>
              <h3 style={{ marginBottom: '16px' }}>{creator.creator_name}</h3>
              <p className="creator-total">{formatCurrency(creator.gmv)}</p>
              <div className="creator-split">
                <span title="Pedidos" style={{ marginRight: '8px' }}>📦 {formatNumber(creator.orders)} pedidos</span>
                <span title="Itens Vendidos">👕 {formatNumber(creator.items_sold)} itens</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mkp-table-section">
        <div className="table-header">
          <h2>Lista de Criadores</h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('creator_name')} style={{ cursor: 'pointer' }}>Criador{renderSortIcon('creator_name')}</th>
                <th className="text-right" onClick={() => handleSort('items_sold')} style={{ cursor: 'pointer' }}>Itens Vend.{renderSortIcon('items_sold')}</th>
                <th className="text-right" onClick={() => handleSort('orders')} style={{ cursor: 'pointer' }}>Pedidos{renderSortIcon('orders')}</th>
                <th className="text-right" onClick={() => handleSort('video_count')} style={{ cursor: 'pointer' }}>Vídeos{renderSortIcon('video_count')}</th>
                <th className="text-right" onClick={() => handleSort('live_count')} style={{ cursor: 'pointer' }}>LIVES{renderSortIcon('live_count')}</th>
                <th className="text-right" onClick={() => handleSort('live_duration_seconds')} style={{ cursor: 'pointer' }}>Tempo de Live{renderSortIcon('live_duration_seconds')}</th>
                <th className="text-right" onClick={() => handleSort('gmv')} style={{ cursor: 'pointer' }}>GMV Total{renderSortIcon('gmv')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedCreators.slice(0, 15).map((row, i) => (
                <tr key={i}>
                  <td className="td-creator"><UserCheck size={16} className="table-row-icon" /> {row.creator_name}</td>
                  <td className="text-right">{formatNumber(row.items_sold)}</td>
                  <td className="text-right">{formatNumber(row.orders)}</td>
                  <td className="text-right">{formatNumber(row.video_count)}</td>
                  <td className="text-right">{formatNumber(row.live_count)}</td>
                  <td className="text-right">{formatDuration(row.live_duration_seconds)}</td>
                  <td className="td-total text-right"><span className="badge-total">{formatCurrency(row.gmv)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTab2 = () => (
    <div className="animated-fade-in">
      <div className="mkp-table-section">
        <div className="table-header">
          <h2><ArrowRightLeft size={20} className="header-icon" /> Top Afinidade: Produto × Criador</h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('product_name')} style={{ cursor: 'pointer' }}>Produto{renderSortIcon('product_name')}</th>
                <th onClick={() => handleSort('creator_name')} style={{ cursor: 'pointer' }}>Criador{renderSortIcon('creator_name')}</th>
                <th className="text-right" onClick={() => handleSort('video_gmv')} style={{ cursor: 'pointer' }}>GMV Vídeo{renderSortIcon('video_gmv')}</th>
                <th className="text-right" onClick={() => handleSort('live_gmv')} style={{ cursor: 'pointer' }}>GMV LIVE{renderSortIcon('live_gmv')}</th>
                <th className="text-right" onClick={() => handleSort('gmv')} style={{ cursor: 'pointer' }}>Total GMV{renderSortIcon('gmv')}</th>
              </tr>
            </thead>
            <tbody>
              {affinityList.map((row, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.product_name}>{row.product_name}</td>
                  <td className="td-creator">{row.creator_name}</td>
                  <td className="text-right">{formatCurrency(row.video_gmv)}</td>
                  <td className="text-right">{formatCurrency(row.live_gmv)}</td>
                  <td className="td-total text-right"><span className="badge-total">{formatCurrency(row.gmv)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTab3 = () => {
    // 1. Receita Média por Conteúdo
    const avgVideoGmv = videoStats.count ? (videoStats.gmv / videoStats.count) : 0;
    const avgLiveGmv = liveStats.count ? (liveStats.gmv / liveStats.count) : 0;

    // 2. Agrupamentos por Dia da Semana e Hora
    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hourlyGmvVideo = new Array(24).fill(0);
    const hourlyGmvLive = new Array(24).fill(0);
    const dailyGmvVideo = new Array(7).fill(0);
    const dailyGmvLive = new Array(7).fill(0);

    filteredVideos.forEach(v => {
      if (v.datetime) {
        const d = new Date(v.datetime);
        if (!isNaN(d)) {
          hourlyGmvVideo[d.getHours()] += (v.gmv || 0);
          dailyGmvVideo[d.getDay()] += (v.gmv || 0);
        }
      }
    });

    filteredLives.forEach(l => {
      if (l.datetime) {
        const d = new Date(l.datetime);
        if (!isNaN(d)) {
          hourlyGmvLive[d.getHours()] += (l.gmv || 0);
          dailyGmvLive[d.getDay()] += (l.gmv || 0);
        }
      }
    });

    const hourlyChartData = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
      datasets: [
        { label: 'Vídeos (GMV)', data: hourlyGmvVideo, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.5)', tension: 0.3 },
        { label: 'LIVES (GMV)', data: hourlyGmvLive, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.5)', tension: 0.3 }
      ]
    };

    const dailyChartData = {
      labels: daysOfWeek,
      datasets: [
        { label: 'Vídeos', data: dailyGmvVideo, backgroundColor: '#3b82f6' },
        { label: 'LIVES', data: dailyGmvLive, backgroundColor: '#ef4444' }
      ]
    };

    const topVideos = [...filteredVideos].sort((a, b) => (b.gmv || 0) - (a.gmv || 0)).slice(0, 5);
    const topLives = [...filteredLives].sort((a, b) => (b.gmv || 0) - (a.gmv || 0)).slice(0, 5);

    return (
      <div className="animated-fade-in">
        <div className="mkp-sections-grid" style={{ marginBottom: '24px' }}>
          <div className="mkp-kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="kpi-icon"><Video size={24} /></div>
              <h2 style={{ margin: 0 }}>Vendas via Vídeos</h2>
            </div>
            <div style={{ width: '100%' }}>
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b' }}>Total de vídeos: <b>{formatNumber(videoStats.count)}</b></p>
              <h3 style={{ margin: '16px 0 4px', fontSize: '14px' }}>GMV Total Gerado</h3>
              <p className="kpi-value">{formatCurrency(videoStats.gmv)}</p>
              <h3 style={{ margin: '16px 0 4px', fontSize: '14px' }}>GMV Médio por Vídeo</h3>
              <p className="kpi-value" style={{ color: '#3b82f6', fontSize: '20px' }}>{formatCurrency(avgVideoGmv)}</p>
            </div>
          </div>

          <div className="mkp-kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="kpi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Radio size={24} /></div>
              <h2 style={{ margin: 0 }}>Vendas via LIVEs</h2>
            </div>
            <div style={{ width: '100%' }}>
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b' }}>Total de lives: <b>{formatNumber(liveStats.count)}</b></p>
              <h3 style={{ margin: '16px 0 4px', fontSize: '14px' }}>GMV Total Gerado</h3>
              <p className="kpi-value">{formatCurrency(liveStats.gmv)}</p>
              <h3 style={{ margin: '16px 0 4px', fontSize: '14px' }}>GMV Médio por LIVE</h3>
              <p className="kpi-value" style={{ color: '#ef4444', fontSize: '20px' }}>{formatCurrency(avgLiveGmv)}</p>
            </div>
          </div>
        </div>

        <div className="mkp-sections-grid">
          <div className="mkp-table-section" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Pico de Vendas por Horário do Dia
              <div className="mkp-tooltip" tabIndex="0">
                <Info size={16} style={{ color: 'var(--mkp-text-secondary)' }} />
                <span className="mkp-tooltip-text">Agrupa todo o faturamento (GMV) pela hora exata em que o conteúdo foi publicado (vídeos) ou iniciado (LIVES). Ajuda a descobrir qual horário do dia gera mais compras.</span>
              </div>
            </h2>
            <div style={{ height: '300px' }}>
              <Line data={hourlyChartData} options={chartOptions} />
            </div>
          </div>

          <div className="mkp-table-section" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Performance por Dia da Semana
              <div className="mkp-tooltip" tabIndex="0">
                <Info size={16} style={{ color: 'var(--mkp-text-secondary)' }} />
                <span className="mkp-tooltip-text">Soma todo o faturamento (GMV) de acordo com o dia da semana em que o vídeo ou a LIVE foram lançados. Mostra quais dias engajam mais vendas.</span>
              </div>
            </h2>
            <div style={{ height: '300px' }}>
              <Bar data={dailyChartData} options={barOptions} />
            </div>
          </div>
        </div>

        <div className="mkp-sections-grid" style={{ alignItems: 'stretch' }}>
          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header"><h2>Top 5 Vídeos (GMV)</h2></div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <tbody>
                  {topVideos.map((v, i) => (
                    <tr key={i} style={{ height: '70px' }}>
                      <td>
                        <div title={v.video_title} style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.video_title || 'Vídeo sem título'}</div>
                        <small style={{ color: '#94a3b8' }}>{v.creator_name}</small>
                      </td>
                      <td className="text-right font-bold text-blue-600">{formatCurrency(v.gmv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header"><h2>Top 5 LIVEs (GMV)</h2></div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <tbody>
                  {topLives.map((l, i) => (
                    <tr key={i} style={{ height: '70px' }}>
                      <td>
                        <div title={l.live_title} style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.live_title || 'Live sem título'}</div>
                        <small style={{ color: '#94a3b8' }}>{l.creator_name}</small>
                      </td>
                      <td className="text-right font-bold text-red-500">{formatCurrency(l.gmv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  };

  const renderTab4 = () => (
    <div className="animated-fade-in">
      <div className="mkp-table-section" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 24px 0', fontWeight: '700' }}>
          <Filter size={24} className="header-icon" /> Funil de Conversão
        </h2>

        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--mkp-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Funil - Vídeos Curtos
        </h3>
        <div className="funnel-container">
          <div className="funnel-step">
            <div className="funnel-label">1. Visualizações</div>
            <div className="funnel-value">{formatNumber(videoStats.views)}</div>
          </div>
          <div className="funnel-arrow">➔</div>
          <div className="funnel-step">
            <div className="funnel-label">2. Cliques no Link</div>
            <div className="funnel-value">{formatNumber(videoStats.clicks)}</div>
            <div className="funnel-rate">CTR: {videoStats.views ? ((videoStats.clicks / videoStats.views) * 100).toFixed(2) : 0}%</div>
          </div>
          <div className="funnel-arrow">➔</div>
          <div className="funnel-step">
            <div className="funnel-label">3. Pedidos</div>
            <div className="funnel-value" style={{ color: 'var(--mkp-accent-blue)' }}>{formatNumber(videoStats.orders)}</div>
            <div className="funnel-rate">CVR: {videoStats.clicks ? ((videoStats.orders / videoStats.clicks) * 100).toFixed(2) : 0}%</div>
          </div>
        </div>

        <h3 style={{ margin: '40px 0 16px 0', fontSize: '16px', color: 'var(--mkp-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Funil - LIVEs
        </h3>
        <div className="funnel-container" style={{ borderLeft: '4px solid var(--mkp-accent-red)' }}>
          <div className="funnel-step">
            <div className="funnel-label">1. Visualizações</div>
            <div className="funnel-value">{formatNumber(liveStats.views)}</div>
          </div>
          <div className="funnel-arrow">➔</div>
          <div className="funnel-step">
            <div className="funnel-label">2. Cliques no Link</div>
            <div className="funnel-value">{formatNumber(liveStats.clicks)}</div>
            <div className="funnel-rate">CTR: {liveStats.views ? ((liveStats.clicks / liveStats.views) * 100).toFixed(2) : 0}%</div>
          </div>
          <div className="funnel-arrow">➔</div>
          <div className="funnel-step">
            <div className="funnel-label">3. Pedidos</div>
            <div className="funnel-value" style={{ color: 'var(--mkp-accent-red)' }}>{formatNumber(liveStats.orders)}</div>
            <div className="funnel-rate">CVR: {liveStats.clicks ? ((liveStats.orders / liveStats.clicks) * 100).toFixed(2) : 0}%</div>
          </div>
        </div>
      </div>
    </div>
  );
  const renderTab5 = () => {
    let sortedByRefunds = [...marketplaceData.products].filter(p => p.product_name && p.product_name.trim() !== '');
    if (searchTerm) sortedByRefunds = sortedByRefunds.filter(p => p.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
    sortedByRefunds = sortArray(sortedByRefunds, sortConfig).slice(0, 10);

    let creatorRefunds = sortArray([...sortedCreators], sortConfig).slice(0, 10);

    return (
      <div className="animated-fade-in">
        <div className="mkp-kpi-card" style={{ marginBottom: '24px', borderColor: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div className="kpi-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><AlertCircle size={24} /></div>
          <div>
            <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
              Total Cancelado
              <div className="mkp-tooltip" tabIndex="0">
                <Info size={14} style={{ color: '#fca5a5' }} />
                <span className="mkp-tooltip-text" style={{ textTransform: 'none', fontWeight: 'normal', letterSpacing: 'normal', fontSize: '13px' }}>
                  Inclui cancelamentos, devoluções e falhas na entrega.
                </span>
              </div>
            </h3>
            <p className="kpi-value" style={{ color: '#f87171' }}>{formatCurrency(totalRefunds)}</p>
            <p style={{ fontSize: '12px', marginTop: '4px', color: '#fca5a5' }}>
              Taxa Geral: {totalGMV ? ((totalRefunds / totalGMV) * 100).toFixed(2) : 0}%
            </p>
          </div>
        </div>

        <div className="mkp-sections-grid" style={{ alignItems: 'stretch' }}>
          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2>Top 10 Produtos (Cancelados)</h2>
            </div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('product_name')} style={{ cursor: 'pointer' }}>Produto{renderSortIcon('product_name')}</th>
                    <th className="text-right" onClick={() => handleSort('gmv')} style={{ cursor: 'pointer' }}>GMV{renderSortIcon('gmv')}</th>
                    <th className="text-right" onClick={() => handleSort('refunds')} style={{ cursor: 'pointer' }}>Cancelados{renderSortIcon('refunds')}</th>
                    <th className="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByRefunds.length > 0 ? sortedByRefunds.map((row, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.product_name}>{row.product_name}</td>
                      <td className="text-right">{formatCurrency(row.gmv)}</td>
                      <td className="text-right" style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatCurrency(row.refunds)}</td>
                      <td className="text-right">
                        {row.gmv ? ((row.refunds / row.gmv) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="text-center" style={{ padding: '32px 24px', color: '#94a3b8' }}>
                        {searchTerm ? (
                          <div style={{ fontSize: '13px', maxWidth: '350px', margin: '0 auto', lineHeight: '1.5' }}>
                            Dica: Se você buscou pelo nome de um <b>criador</b>, esta tabela de produtos ficará vazia pois as planilhas do TikTok não cruzam o produto exato com o criador. Use a tabela de Criadores ao lado!
                          </div>
                        ) : (
                          <div><b>Nenhum produto encontrado.</b></div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2>Top 10 Criadores (Cancelados)</h2>
            </div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('creator_name')} style={{cursor: 'pointer'}}>Criador{renderSortIcon('creator_name')}</th>
                    <th className="text-right" onClick={() => handleSort('gmv')} style={{cursor: 'pointer'}}>GMV{renderSortIcon('gmv')}</th>
                    <th className="text-right" onClick={() => handleSort('refunds')} style={{cursor: 'pointer'}}>Cancelados{renderSortIcon('refunds')}</th>
                    <th className="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {creatorRefunds.length > 0 ? creatorRefunds.map((row, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.creator_name}>{row.creator_name}</td>
                      <td className="text-right">{formatCurrency(row.gmv)}</td>
                      <td className="text-right" style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatCurrency(row.refunds)}</td>
                      <td className="text-right">
                        {row.gmv ? ((row.refunds / row.gmv) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  )) : <tr><td colSpan="4" className="text-center" style={{ padding: '24px', color: '#94a3b8' }}>Nenhum criador encontrado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  };

  const renderTab6 = () => {
    let topCreatorsGMV = sortArray([...sortedCreators], sortConfig).slice(0, 10);
    return (
      <div className="animated-fade-in">
        <div className="mkp-sections-grid" style={{ alignItems: 'stretch' }}>
          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2><ShoppingBag size={20} className="header-icon" /> Receita por Produto</h2>
            </div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('product_name')} style={{ cursor: 'pointer' }}>Produto{renderSortIcon('product_name')}</th>
                    <th className="text-right" onClick={() => handleSort('orders')} style={{ cursor: 'pointer' }}>Pedidos{renderSortIcon('orders')}</th>
                    <th className="text-right" onClick={() => handleSort('gmv')} style={{ cursor: 'pointer' }}>GMV Total{renderSortIcon('gmv')}</th>
                    <th className="text-right">% do Total Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.length > 0 ? sortedProducts.map((row, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.product_name}>{row.product_name}</td>
                      <td className="text-right">{formatNumber(row.orders)}</td>
                      <td className="text-right font-bold">{formatCurrency(row.gmv)}</td>
                      <td className="text-right">
                        {totalGMV ? ((row.gmv / totalGMV) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="text-center" style={{ padding: '32px 24px', color: '#94a3b8' }}>
                        {searchTerm ? (
                          <div style={{ fontSize: '13px', maxWidth: '350px', margin: '0 auto', lineHeight: '1.5' }}>
                            Dica: Se você buscou pelo nome de um <b>criador</b>, esta tabela de produtos ficará vazia pois as planilhas do TikTok não cruzam o produto exato com o criador. Use a tabela de Criadores ao lado!
                          </div>
                        ) : (
                          <div><b>Nenhum produto encontrado.</b></div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2><ShoppingBag size={20} className="header-icon" /> Receita por Criador</h2>
            </div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('creator_name')} style={{cursor: 'pointer'}}>Criador{renderSortIcon('creator_name')}</th>
                    <th className="text-right" onClick={() => handleSort('orders')} style={{cursor: 'pointer'}}>Pedidos{renderSortIcon('orders')}</th>
                    <th className="text-right" onClick={() => handleSort('gmv')} style={{cursor: 'pointer'}}>GMV Total{renderSortIcon('gmv')}</th>
                    <th className="text-right">% do Total Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {topCreatorsGMV.length > 0 ? topCreatorsGMV.map((row, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.creator_name}>{row.creator_name}</td>
                      <td className="text-right">{formatNumber(row.orders)}</td>
                      <td className="text-right font-bold">{formatCurrency(row.gmv)}</td>
                      <td className="text-right">
                        {totalGMV ? ((row.gmv / totalGMV) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  )) : <tr><td colSpan="4" className="text-center" style={{ padding: '24px', color: '#94a3b8' }}>Nenhum criador encontrado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  };

  const renderTab7 = () => {
    let sortedProdsComm = [...marketplaceData.products].filter(p => p.product_name && p.product_name.trim() !== '');
    if (searchTerm) sortedProdsComm = sortedProdsComm.filter(p => p.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
    sortedProdsComm = sortArray(sortedProdsComm, sortConfig).slice(0, 10);

    let creatorComm = sortArray([...sortedCreators], sortConfig).slice(0, 10);

    const commissionMargin = totalGMV ? ((totalCommission / totalGMV) * 100).toFixed(2) : 0;
    return (
      <div className="animated-fade-in">
        <div className="mkp-sections-grid" style={{ marginBottom: '24px' }}>
          <div className="mkp-kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Percent size={24} /></div>
            <div>
              <h3>Comissões Pagas (Afiliados)</h3>
              <p className="kpi-value" style={{ color: '#34d399' }}>{formatCurrency(totalCommission)}</p>
            </div>
          </div>
          <div className="mkp-kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}><TrendingUp size={24} /></div>
            <div>
              <h3>% Médio de Comissão</h3>
              <p className="kpi-value" style={{ color: '#f8fafc' }}>{commissionMargin}%</p>
            </div>
          </div>
        </div>

        <div className="mkp-sections-grid" style={{ alignItems: 'stretch' }}>
          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2>Comissão por Produto</h2>
            </div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('product_name')} style={{ cursor: 'pointer' }}>Produto{renderSortIcon('product_name')}</th>
                    <th className="text-right" onClick={() => handleSort('gmv')} style={{ cursor: 'pointer' }}>GMV{renderSortIcon('gmv')}</th>
                    <th className="text-right" onClick={() => handleSort('commission')} style={{ cursor: 'pointer' }}>Comissão Paga</th>
                    <th className="text-right">Taxa Efetiva</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProdsComm.length > 0 ? sortedProdsComm.map((row, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.product_name}>{row.product_name}</td>
                      <td className="text-right">{formatCurrency(row.gmv)}</td>
                      <td className="text-right text-green-600 font-bold">{formatCurrency(row.commission)}</td>
                      <td className="text-right">
                        {row.gmv ? ((row.commission / row.gmv) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="text-center" style={{ padding: '32px 24px', color: '#94a3b8' }}>
                        {searchTerm ? (
                          <div style={{ fontSize: '13px', maxWidth: '350px', margin: '0 auto', lineHeight: '1.5' }}>
                            Dica: Se você buscou pelo nome de um <b>criador</b>, esta tabela de produtos ficará vazia pois as planilhas do TikTok não cruzam o produto exato com o criador. Use a tabela de Criadores ao lado!
                          </div>
                        ) : (
                          <div><b>Nenhum produto encontrado.</b></div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2>Comissão por Criador</h2>
            </div>
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('creator_name')} style={{cursor: 'pointer'}}>Criador{renderSortIcon('creator_name')}</th>
                    <th className="text-right" onClick={() => handleSort('gmv')} style={{cursor: 'pointer'}}>GMV{renderSortIcon('gmv')}</th>
                    <th className="text-right" onClick={() => handleSort('commission')} style={{cursor: 'pointer'}}>Comissão Paga{renderSortIcon('commission')}</th>
                    <th className="text-right">Taxa Efetiva</th>
                  </tr>
                </thead>
                <tbody>
                  {creatorComm.length > 0 ? creatorComm.map((row, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.creator_name}>{row.creator_name}</td>
                      <td className="text-right">{formatCurrency(row.gmv)}</td>
                      <td className="text-right text-green-600 font-bold">{formatCurrency(row.commission)}</td>
                      <td className="text-right">
                        {row.gmv ? ((row.commission / row.gmv) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  )) : <tr><td colSpan="4" className="text-center" style={{ padding: '24px', color: '#94a3b8' }}>Nenhum criador encontrado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // TAB 8: UPLOAD / IMPORT
  // ==========================================
  const [uploadFiles, setUploadFiles] = useState({
    creators: null,
    products: null,
    videos: null,
    lives: null
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFiles(prev => ({ ...prev, [type]: e.target.files[0] }));
    }
  };

  const handleProcessUpload = async () => {
    if (!uploadFiles.creators || !uploadFiles.products || !uploadFiles.videos || !uploadFiles.lives) {
      setUploadMessage({ type: 'error', text: 'Por favor, selecione as 4 planilhas antes de processar.' });
      return;
    }

    setIsProcessing(true);
    setUploadMessage({ type: 'info', text: 'Processando arquivos localmente... (Isso pode levar alguns segundos)' });

    try {
      // 1. Process files using our utility
      const finalData = await processTikTokFiles(uploadFiles);

      setUploadMessage({ type: 'info', text: `Dados processados! Período detectado: ${finalData.metadata.period}. Enviando para o Supabase...` });

      // 2. Upload to Supabase
      const { data, error } = await supabase
        .from('tiktok_reports')
        .insert([
          { 
            period: finalData.metadata.period,
            data: finalData 
          }
        ]);

      if (error) throw error;

      setUploadMessage({ type: 'success', text: 'Upload concluído com sucesso! Recarregando a tela para exibir os novos dados...' });
      
      // 3. Reload window after 2 seconds to fetch new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error(err);
      setUploadMessage({ type: 'error', text: `Erro durante o processamento: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTab8 = () => (
    <div className="animated-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mkp-table-section" style={{ padding: '32px', marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UploadCloud size={24} color="var(--mkp-accent-blue)" />
          Importar Planilhas do TikTok Shop
        </h2>
        <p style={{ color: 'var(--mkp-text-muted)', marginBottom: '24px' }}>
          Selecione os 4 arquivos Excel exportados do Seller Center (Análise de Transações). O sistema irá processar, cruzar os dados automaticamente e detectar o período das planilhas para salvar na nuvem.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--mkp-card-bg-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--mkp-border)' }}>
            <h4 style={{ marginBottom: '8px' }}>1. Lista de Criadores</h4>
            <input type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'creators')} style={{ color: 'var(--mkp-text-muted)' }} />
          </div>
          <div style={{ background: 'var(--mkp-card-bg-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--mkp-border)' }}>
            <h4 style={{ marginBottom: '8px' }}>2. Lista de Produtos</h4>
            <input type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'products')} style={{ color: 'var(--mkp-text-muted)' }} />
          </div>
          <div style={{ background: 'var(--mkp-card-bg-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--mkp-border)' }}>
            <h4 style={{ marginBottom: '8px' }}>3. Lista de Vídeos</h4>
            <input type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'videos')} style={{ color: 'var(--mkp-text-muted)' }} />
          </div>
          <div style={{ background: 'var(--mkp-card-bg-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--mkp-border)' }}>
            <h4 style={{ marginBottom: '8px' }}>4. Lista de LIVEs</h4>
            <input type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'lives')} style={{ color: 'var(--mkp-text-muted)' }} />
          </div>
        </div>

        {uploadMessage && (
          <div style={{ 
            padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px',
            background: uploadMessage.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : uploadMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: uploadMessage.type === 'error' ? '#f87171' : uploadMessage.type === 'success' ? '#4ade80' : '#60a5fa',
            border: `1px solid ${uploadMessage.type === 'error' ? '#ef4444' : uploadMessage.type === 'success' ? '#22c55e' : '#3b82f6'}`
          }}>
            {uploadMessage.type === 'error' ? <AlertCircle size={20} /> : uploadMessage.type === 'success' ? <CheckCircle size={20} /> : <div style={{ width: '20px', height: '20px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
            {uploadMessage.text}
          </div>
        )}

        <button 
          onClick={handleProcessUpload}
          disabled={isProcessing || !uploadFiles.creators || !uploadFiles.products || !uploadFiles.videos || !uploadFiles.lives}
          style={{
            width: '100%', padding: '16px', borderRadius: '8px', border: 'none',
            background: (isProcessing || !uploadFiles.creators || !uploadFiles.products || !uploadFiles.videos || !uploadFiles.lives) ? 'var(--mkp-card-bg-hover)' : 'var(--mkp-accent-blue)',
            color: (isProcessing || !uploadFiles.creators || !uploadFiles.products || !uploadFiles.videos || !uploadFiles.lives) ? 'var(--mkp-text-muted)' : '#fff',
            fontSize: '16px', fontWeight: 'bold', cursor: (isProcessing || !uploadFiles.creators || !uploadFiles.products || !uploadFiles.videos || !uploadFiles.lives) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isProcessing ? 'Processando e Enviando...' : 'Processar e Enviar para Nuvem'}
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="mkp-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p>Carregando relatórios da nuvem (Supabase)...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (dataError || !marketplaceData) {
    return (
      <div className="mkp-dashboard" style={{ padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 className="mkp-title">Marketplace & Afiliados</h1>
            <p className="mkp-subtitle">Análise detalhada de performance</p>
          </div>
          <button 
            onClick={() => setActiveTab(8)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--mkp-accent-blue)', color: '#fff',
              border: 'none', borderRadius: '8px', padding: '0 20px',
              fontWeight: 'bold', cursor: 'pointer', height: '42px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <UploadCloud size={18} /> Importar Planilhas
          </button>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '24px', borderRadius: '8px', color: '#f87171' }}>
          <AlertCircle size={32} style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Erro ao carregar dados (ou banco vazio)</h2>
          <p>{dataError || 'Nenhum dado disponível na tabela tiktok_reports. Faça a importação das planilhas clicando no botão acima.'}</p>
        </div>

        {activeTab === 8 && renderTab8()}
      </div>
    );
  }

  return (
    <div className="mkp-dashboard">
      <div className="mkp-header">
        <div>
          <h1 className="mkp-title">Marketplace & Afiliados</h1>
          <p className="mkp-subtitle">Análise detalhada de performance - {formatPeriod(marketplaceData.metadata?.period)}</p>
        </div>

        <div className="mkp-global-filters">
          <div className="filter-group">
            <Search size={18} className="filter-icon" />
            <input
              type="text"
              placeholder="Buscar criador ou produto..."
              value={rawSearchTerm}
              onChange={(e) => setRawSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <CalendarDays size={18} className="filter-icon" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="filter-input date-input"
              title="Data Inicial"
            />
          </div>
          <div className="filter-group" style={{ marginLeft: '-12px' }}>
            <span style={{ color: 'var(--mkp-text-secondary)', fontWeight: 'bold' }}>-</span>
          </div>
          <div className="filter-group">
            <CalendarDays size={18} className="filter-icon" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="filter-input date-input"
              title="Data Final"
            />
          </div>
          <button 
            onClick={() => setActiveTab(8)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--mkp-accent-blue)', color: '#fff',
              border: 'none', borderRadius: '8px', padding: '0 20px',
              fontWeight: 'bold', cursor: 'pointer', height: '42px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease', marginLeft: '16px'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <UploadCloud size={18} /> Importar Planilhas
          </button>
        </div>
      </div>

      <div className="mkp-tabs" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`mkp-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="mkp-tab-content">
        {activeTab === 0 && renderTab0()}
        {activeTab === 1 && renderTab1()}
        {activeTab === 2 && renderTab2()}
        {activeTab === 3 && renderTab3()}
        {activeTab === 4 && renderTab4()}
        {activeTab === 5 && renderTab5()}
        {activeTab === 6 && renderTab6()}
        {activeTab === 7 && renderTab7()}
        {activeTab === 8 && renderTab8()}
      </div>
    </div>
  );
}
