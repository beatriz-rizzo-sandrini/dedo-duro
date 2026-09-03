import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import {
  Trophy, TrendingUp, Search, UserCheck, CalendarDays, ChevronLeft, ChevronRight,
  Video, Radio, ShoppingBag, Filter, ArrowRightLeft, Percent, AlertCircle, PieChart,
  Info, UploadCloud, CheckCircle, Users
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
import ChartDataLabels from 'chartjs-plugin-datalabels';
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

// ChartJS Options definidas no escopo do módulo para evitar recriação e problemas de escopo
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { position: 'bottom', labels: { color: '#94a3b8' } },
    datalabels: { display: false }
  },
};

const barOptions = {
  ...chartOptions,
  scales: {
    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
  }
};

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

const parseReportPeriod = (periodStr) => {
  if (!periodStr) return null;
  const str = String(periodStr).trim();

  // 1. YYYYMMDD-YYYYMMDD (ex: 20260731-20260829)
  const ymd8Regex = /(\d{4})(\d{2})(\d{2})[^\d]+(\d{4})(\d{2})(\d{2})/;
  const match8 = str.match(ymd8Regex);
  if (match8) {
    return {
      start: `${match8[1]}-${match8[2]}-${match8[3]}`,
      end: `${match8[4]}-${match8[5]}-${match8[6]}`
    };
  }

  // 2. YYYY-MM-DD ... YYYY-MM-DD
  const isoRegex = /(\d{4})-(\d{2})-(\d{2})[^\d]+(\d{4})-(\d{2})-(\d{2})/;
  const matchIso = str.match(isoRegex);
  if (matchIso) {
    return {
      start: `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`,
      end: `${matchIso[4]}-${matchIso[5]}-${matchIso[6]}`
    };
  }

  // 3. DD/MM/YYYY ... DD/MM/YYYY
  const brRegex = /(\d{2})\/(\d{2})\/(\d{4})[^\d]+(\d{2})\/(\d{2})\/(\d{4})/;
  const matchBr = str.match(brRegex);
  if (matchBr) {
    return {
      start: `${matchBr[3]}-${matchBr[2]}-${matchBr[1]}`,
      end: `${matchBr[6]}-${matchBr[5]}-${matchBr[4]}`
    };
  }

  return null;
};

// Remove relatórios obsoletos ou que foram sobrepostos por importações mais recentes/completas
const deduplicateReports = (reports) => {
  if (!reports || reports.length === 0) return [];
  const sorted = [...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const accepted = [];

  for (const rep of sorted) {
    const p = parseReportPeriod(rep.period || rep.data?.metadata?.period);
    if (!p) {
      accepted.push(rep);
      continue;
    }

    const startRep = new Date(`${p.start}T00:00:00Z`).getTime();
    const endRep = new Date(`${p.end}T23:59:59Z`).getTime();

    let isSubsumed = false;
    for (const acc of accepted) {
      const accP = parseReportPeriod(acc.period || acc.data?.metadata?.period);
      if (!accP) continue;
      const startAcc = new Date(`${accP.start}T00:00:00Z`).getTime();
      const endAcc = new Date(`${accP.end}T23:59:59Z`).getTime();

      const overlapStart = Math.max(startRep, startAcc);
      const overlapEnd = Math.min(endRep, endAcc);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      const repDuration = endRep - startRep;

      // Se mais de 40% deste relatório já estiver coberto por uma importação mais recente aceita, ele é descartado
      if (repDuration > 0 && (overlapDuration / repDuration) > 0.4) {
        isSubsumed = true;
        break;
      }
    }

    if (!isSubsumed) {
      accepted.push(rep);
    }
  }

  return accepted;
};

// Componente Reutilizável de Paginação
const PaginationControls = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange, label = 'itens' }) => {
  if (totalItems === 0) return null;
  return (
    <div className="table-pagination">
      <div className="pagination-info">
        <span>
          Mostrando <strong>{itemsPerPage === 'all' ? 1 : Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</strong> a <strong>{itemsPerPage === 'all' ? totalItems : Math.min(totalItems, currentPage * itemsPerPage)}</strong> de <strong>{formatNumber(totalItems)}</strong> {label}
        </span>
      </div>
      <div className="pagination-actions">
        {onItemsPerPageChange && (
          <div className="pagination-per-page">
            <span>Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(e.target.value === 'all' ? 'all' : Number(e.target.value));
                onPageChange(1);
              }}
              className="pagination-select"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="all">Todos</option>
            </select>
          </div>
        )}
        {itemsPerPage !== 'all' && totalPages > 1 && (
          <div className="pagination-buttons">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="pagination-current">{currentPage} / {totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState(0);
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const searchTerm = useDeferredValue(rawSearchTerm);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleStartDateChange = (newStart) => {
    setStartDate(newStart);
    if (newStart && endDate && newStart > endDate) {
      setEndDate(newStart);
    }
  };

  const handleEndDateChange = (newEnd) => {
    setEndDate(newEnd);
    if (newEnd && startDate && newEnd < startDate) {
      setStartDate(newEnd);
    }
  };
  
  const [rawReports, setRawReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Configurador de ordenação (Resetado ao mudar de aba)
  const [sortConfig, setSortConfig] = useState({ key: 'gmv', direction: 'desc' });
  
  // Estados de Paginação por Aba/Tabela
  const [creatorsPage, setCreatorsPage] = useState(1);
  const [creatorsPerPage, setCreatorsPerPage] = useState(15);

  const [affinityPage, setAffinityPage] = useState(1);
  const [affinityPerPage, setAffinityPerPage] = useState(15);

  const [refundsProdPage, setRefundsProdPage] = useState(1);
  const [refundsProdPerPage, setRefundsProdPerPage] = useState(10);
  const [refundsCreatorPage, setRefundsCreatorPage] = useState(1);
  const [refundsCreatorPerPage, setRefundsCreatorPerPage] = useState(10);

  const [revProdPage, setRevProdPage] = useState(1);
  const [revProdPerPage, setRevProdPerPage] = useState(10);
  const [revCreatorPage, setRevCreatorPage] = useState(1);
  const [revCreatorPerPage, setRevCreatorPerPage] = useState(10);

  const [commProdPage, setCommProdPage] = useState(1);
  const [commProdPerPage, setCommProdPerPage] = useState(10);
  const [commCreatorPage, setCommCreatorPage] = useState(1);
  const [commCreatorPerPage, setCommCreatorPerPage] = useState(10);

  const [uploadFiles, setUploadFiles] = useState({
    creators: null,
    products: null,
    videos: null,
    lives: null
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('tiktok_reports')
          .select('id, created_at, period, data')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data && data.length > 0) {
          setRawReports(data);

          // Detectar a data final mais recente entre todos os relatórios disponíveis
          let latestDateStr = null;
          data.forEach(r => {
            const p = parseReportPeriod(r.period || r.data?.metadata?.period);
            if (p && p.end) {
              if (!latestDateStr || p.end > latestDateStr) {
                latestDateStr = p.end;
              }
            }
          });

          // Definir automaticamente o filtro inicial para os últimos 30 dias a partir da data mais recente
          if (latestDateStr) {
            const endD = new Date(`${latestDateStr}T12:00:00`);
            const startD = new Date(endD);
            startD.setDate(startD.getDate() - 29); // 30 dias no total (ex: 26/07 a 24/08)

            const formatDateStr = (d) => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
            };

            setStartDate(formatDateStr(startD));
            setEndDate(formatDateStr(endD));
          }
        } else {
          throw new Error("Nenhum dado encontrado nos relatórios do TikTok.");
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

  // Intervalo completo de datas disponíveis no banco (mínimo e máximo)
  const availableDateRange = useMemo(() => {
    if (!rawReports || rawReports.length === 0) return null;
    const cleanReports = deduplicateReports(rawReports);
    let minDate = null;
    let maxDate = null;

    cleanReports.forEach(r => {
      const p = parseReportPeriod(r.period || r.data?.metadata?.period);
      if (p) {
        if (p.start && (!minDate || p.start < minDate)) minDate = p.start;
        if (p.end && (!maxDate || p.end > maxDate)) maxDate = p.end;
      }
    });

    if (!minDate && !maxDate) return null;
    const formatStr = (dStr) => {
      if (!dStr) return '';
      return dStr.split('-').reverse().join('/');
    };

    return {
      min: minDate,
      max: maxDate,
      minFormatted: formatStr(minDate),
      maxFormatted: formatStr(maxDate),
      label: `${formatStr(minDate)} a ${formatStr(maxDate)}`
    };
  }, [rawReports]);

  // Dados consolidados filtrados pelo intervalo de datas selecionado no calendário
  const marketplaceData = useMemo(() => {
    if (!rawReports || rawReports.length === 0) {
      return {
        metadata: { period: '', total_gmv: 0 },
        creators: [],
        products: [],
        videos: [],
        lives: [],
        unified_affinity: [],
        isFilteredEmpty: true
      };
    }
    
    const cleanReports = deduplicateReports(rawReports);
    let filtered = cleanReports;

    if (startDate || endDate) {
      const targetStart = startDate ? new Date(`${startDate}T00:00:00Z`).getTime() : 0;
      const targetEnd = endDate ? new Date(`${endDate}T23:59:59Z`).getTime() : Infinity;

      filtered = cleanReports.filter(r => {
        const p = parseReportPeriod(r.period || r.data?.metadata?.period);
        if (!p) return true;

        const rStart = new Date(`${p.start}T00:00:00Z`).getTime();
        const rEnd = new Date(`${p.end}T23:59:59Z`).getTime();

        const overlapStart = Math.max(targetStart, rStart);
        const overlapEnd = Math.min(targetEnd, rEnd);
        const overlapDuration = Math.max(0, overlapEnd - overlapStart);
        const overlapDays = overlapDuration / (1000 * 60 * 60 * 24);

        // Só inclui o relatório se a sobreposição com o período selecionado for de pelo menos 2 dias
        return overlapDays >= 2;
      });
    }
    
    if (filtered.length === 0) {
      return {
        metadata: { period: '', total_gmv: 0 },
        creators: [],
        products: [],
        videos: [],
        lives: [],
        unified_affinity: [],
        isFilteredEmpty: true
      };
    }
    return mergeMarketplaceData(filtered);
  }, [rawReports, startDate, endDate]);

  useEffect(() => {
    // Resetar página de criadores quando mudar filtros ou ordenação
    setCreatorsPage(1);
  }, [searchTerm, startDate, endDate, sortConfig]);

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

  // ==========================================
  // DATA FILTERING & AGGREGATIONS
  // ==========================================

  const filteredVideos = useMemo(() => {
    if (!marketplaceData?.videos) return [];
    if (!searchTerm) return marketplaceData.videos;
    const term = searchTerm.toLowerCase();
    return marketplaceData.videos.filter(v => 
      v.creator_name?.toLowerCase().includes(term) ||
      v.video_title?.toLowerCase().includes(term) ||
      (v.product_names && v.product_names.some(pn => pn.toLowerCase().includes(term)))
    );
  }, [searchTerm, marketplaceData]);

  const filteredLives = useMemo(() => {
    if (!marketplaceData?.lives) return [];
    if (!searchTerm) return marketplaceData.lives;
    const term = searchTerm.toLowerCase();
    return marketplaceData.lives.filter(l => 
      l.creator_name?.toLowerCase().includes(term) ||
      l.live_title?.toLowerCase().includes(term) ||
      (l.product_names && l.product_names.some(pn => pn.toLowerCase().includes(term)))
    );
  }, [searchTerm, marketplaceData]);

  const filteredAffinity = useMemo(() => {
    if (!marketplaceData?.unified_affinity) return [];
    if (!searchTerm) return marketplaceData.unified_affinity;
    const term = searchTerm.toLowerCase();
    return marketplaceData.unified_affinity.filter(item => 
      item.creator_name?.toLowerCase().includes(term) ||
      item.product_name?.toLowerCase().includes(term)
    );
  }, [searchTerm, marketplaceData]);

  // Quantidade de dias no período filtrado (para médias diárias)
  const filteredDaysCount = useMemo(() => {
    // 1. Se o usuário tem datas selecionadas no calendário:
    if (startDate && endDate) {
      const d1 = new Date(`${startDate}T12:00:00`);
      const d2 = new Date(`${endDate}T12:00:00`);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diffDays);
    }
    if (startDate && !endDate) return 1;
    if (!startDate && endDate) return 1;

    // 2. Se as planilhas trouxerem o período nos metadados (ex: 20260201-20260228):
    const p = parseReportPeriod(marketplaceData?.metadata?.period);
    if (p && p.start && p.end) {
      const d1 = new Date(`${p.start}T12:00:00`);
      const d2 = new Date(`${p.end}T12:00:00`);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diffDays);
    }
    
    return 30;
  }, [startDate, endDate, marketplaceData?.metadata?.period]);

  // Lista Oficial de Criadores (Métricas 100% idênticas ao TikTok)
  const sortedCreators = useMemo(() => {
    if (!marketplaceData?.creators) return [];
    let list = marketplaceData.creators.map(c => ({
      ...c,
      avg_live_duration_seconds: Math.round((c.live_duration_seconds || 0) / (filteredDaysCount || 1))
    }));
    list = list.filter(c => c && c.creator_name && c.creator_name.trim() !== '');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => c.creator_name.toLowerCase().includes(term));
    }
    return sortArray(list, sortConfig);
  }, [searchTerm, sortConfig, marketplaceData, filteredDaysCount]);

  const totalGMV = useMemo(() => {
    if (searchTerm) {
      return sortedCreators.reduce((acc, c) => acc + (c.gmv || 0), 0);
    }
    return marketplaceData?.metadata?.total_gmv || marketplaceData?.creators?.reduce((acc, c) => acc + (c.gmv || 0), 0) || 0;
  }, [marketplaceData, searchTerm, sortedCreators]);
    
  const totalRefunds = useMemo(() => sortedCreators.reduce((acc, c) => acc + (c.refunds || 0), 0), [sortedCreators]);
  const totalCommission = useMemo(() => sortedCreators.reduce((acc, c) => acc + (c.commission || 0), 0), [sortedCreators]);

  // Totais Gerais específicos da Performance por Criador
  const creatorSummaryTotals = useMemo(() => {
    const totalCount = sortedCreators.length;
    const totalGmv = sortedCreators.reduce((acc, c) => acc + (c.gmv || 0), 0);
    const totalOrders = sortedCreators.reduce((acc, c) => acc + (c.orders || 0), 0);
    const totalItems = sortedCreators.reduce((acc, c) => acc + (c.items_sold || 0), 0);
    const totalVideos = sortedCreators.reduce((acc, c) => acc + (c.video_count || 0), 0);
    const totalLives = sortedCreators.reduce((acc, c) => acc + (c.live_count || 0), 0);
    const totalLiveDuration = sortedCreators.reduce((acc, c) => acc + (c.live_duration_seconds || 0), 0);
    const avgLiveDurationPerDay = Math.round(totalLiveDuration / (filteredDaysCount || 1));
    const avgGmvPerCreator = totalCount > 0 ? totalGmv / totalCount : 0;
    const avgTicket = totalOrders > 0 ? totalGmv / totalOrders : 0;

    return {
      totalCount,
      totalGmv,
      totalOrders,
      totalItems,
      totalVideos,
      totalLives,
      totalLiveDuration,
      avgLiveDurationPerDay,
      avgGmvPerCreator,
      avgTicket
    };
  }, [sortedCreators, filteredDaysCount]);

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

  // Lista Oficial de Produtos
  const sortedProducts = useMemo(() => {
    if (!marketplaceData?.products) return [];
    let list = [...(marketplaceData.products || [])];
    list = list.filter(p => p && p.product_name && p.product_name.trim() !== '');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => p.product_name?.toLowerCase().includes(term));
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

  // Chart Data & Options com Porcentagens (%)
  const top3Creators = useMemo(() => {
    return [...sortedCreators].sort((a, b) => (b.gmv || 0) - (a.gmv || 0)).slice(0, 3);
  }, [sortedCreators]);

  const totalFormatGmv = (videoStats.gmv || 0) + (liveStats.gmv || 0);
  const videoPct = totalFormatGmv ? ((videoStats.gmv / totalFormatGmv) * 100).toFixed(1) : '0';
  const livePct = totalFormatGmv ? ((liveStats.gmv / totalFormatGmv) * 100).toFixed(1) : '0';

  const formatChartData = useMemo(() => ({
    labels: [`Vídeos Curtos (${videoPct}%)`, `LIVEs (${livePct}%)`],
    datasets: [{
      data: [videoStats.gmv, liveStats.gmv],
      backgroundColor: ['#3b82f6', '#ec4899'],
      hoverBackgroundColor: ['#2563eb', '#db2777'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  }), [videoStats.gmv, liveStats.gmv, videoPct, livePct]);

  const formatChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 16, font: { family: 'Inter', size: 12, weight: 'bold' }, color: '#64748b' }
      },
      datalabels: {
        color: '#ffffff',
        font: { family: 'Inter', weight: 'bold', size: 13 },
        formatter: (value) => {
          if (!totalFormatGmv || !value) return '';
          const pct = ((value / totalFormatGmv) * 100).toFixed(1);
          return `${pct}%`;
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13, family: 'Inter' },
        bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            const pct = totalFormatGmv ? ((val / totalFormatGmv) * 100).toFixed(1) : '0';
            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
          }
        }
      }
    }
  }), [totalFormatGmv]);

  const topCreatorsChartData = useMemo(() => ({
    labels: top3Creators.map(c => (c.creator_name || '').substring(0, 15)),
    datasets: [{
      label: 'GMV (R$)',
      data: top3Creators.map(c => c.gmv || 0),
      backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981'],
      hoverBackgroundColor: ['#2563eb', '#7c3aed', '#059669'],
      borderRadius: 100,
      borderSkipped: false,
      barThickness: 28,
      maxBarThickness: 40,
    }],
  }), [top3Creators]);

  const topCreatorsChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 28,
        left: 8,
        right: 8,
        bottom: 4
      }
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: 'end',
        align: 'top',
        offset: 4,
        color: '#34d399',
        font: { family: 'Inter', weight: 'bold', size: 11 },
        formatter: (value) => {
          if (!totalGMV || !value) return '';
          const pct = ((value / totalGMV) * 100).toFixed(1);
          return `${pct}%`;
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13, family: 'Inter' },
        bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            const pct = totalGMV ? ((val / totalGMV) * 100).toFixed(1) : '0';
            return ` GMV: ${formatCurrency(val)} (${pct}% do total geral)`;
          }
        }
      }
    },
    scales: {
      y: { 
        grace: '20%',
        border: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b', callback: (v) => formatCurrency(v) }, 
        grid: { color: 'rgba(241, 245, 249, 0.08)' } 
      },
      x: { 
        border: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }, 
        grid: { display: false } 
      }
    }
  }), [totalGMV]);

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
            <Doughnut data={formatChartData} options={formatChartOptions} plugins={[ChartDataLabels]} />
          </div>
        </div>

        <div className="mkp-table-section" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} className="header-icon" style={{ color: '#f59e0b' }} /> Top Criadores
          </h2>
          <div style={{ height: '300px' }}>
            <Bar data={topCreatorsChartData} options={topCreatorsChartOptions} plugins={[ChartDataLabels]} />
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

  const renderTab1 = () => {
    const totalPages = Math.ceil(sortedCreators.length / (creatorsPerPage === 'all' ? sortedCreators.length || 1 : creatorsPerPage));
    const paginatedCreators = creatorsPerPage === 'all' 
      ? sortedCreators 
      : sortedCreators.slice((creatorsPage - 1) * creatorsPerPage, creatorsPage * creatorsPerPage);

    return (
      <div className="animated-fade-in">
        {/* KPI Cards de Totais Gerais dos Criadores */}
        <div className="mkp-stats-grid">
          <div className="mkp-kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Users size={20} />
            </div>
            <div>
              <h3>Total de Criadores</h3>
              <p className="kpi-value">{formatNumber(creatorSummaryTotals.totalCount)}</p>
              <p className="kpi-subtext">
                {creatorSummaryTotals.totalCount === 1 ? '1 criador ativo' : `${formatNumber(creatorSummaryTotals.totalCount)} criadores ativos`}
              </p>
            </div>
          </div>

          <div className="mkp-kpi-card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 style={{ color: '#10b981' }}>Receita Total (GMV)</h3>
              <p className="kpi-value" style={{ color: '#10b981' }}>{formatCurrency(creatorSummaryTotals.totalGmv)}</p>
              <p className="kpi-subtext">
                Média: <strong style={{ color: 'var(--mkp-text-primary)' }}>{formatCurrency(creatorSummaryTotals.avgGmvPerCreator)}</strong> / criador
              </p>
            </div>
          </div>

          <div className="mkp-kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3>Pedidos & Vendas</h3>
              <p className="kpi-value">{formatNumber(creatorSummaryTotals.totalOrders)} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--mkp-text-secondary)' }}>pedidos</span></p>
              <p className="kpi-subtext">
                {formatNumber(creatorSummaryTotals.totalItems)} itens · Ticket Médio: <strong style={{ color: 'var(--mkp-text-primary)' }}>{formatCurrency(creatorSummaryTotals.avgTicket)}</strong>
              </p>
            </div>
          </div>

          <div className="mkp-kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Video size={20} />
            </div>
            <div>
              <h3>Conteúdos (Vídeo / Live)</h3>
              <p className="kpi-value">
                {formatNumber(creatorSummaryTotals.totalVideos)} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mkp-text-secondary)' }}>vídeos</span> · {formatNumber(creatorSummaryTotals.totalLives)} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mkp-text-secondary)' }}>lives</span>
              </p>
              <p className="kpi-subtext">
                Tempo em Live: <strong style={{ color: 'var(--mkp-text-primary)' }}>{formatDuration(creatorSummaryTotals.totalLiveDuration)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Top 3 Criadores */}
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

        {/* Tabela de Criadores com Linha de Total Geral */}
        <div className="mkp-table-section">
          <div className="table-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2>Lista de Criadores ({formatNumber(sortedCreators.length)})</h2>
              <p style={{ fontSize: '12px', color: 'var(--mkp-text-secondary)', margin: '4px 0 0 0' }}>
                Ordenado por <strong>{sortConfig.key}</strong> ({sortConfig.direction === 'desc' ? 'Decrescente' : 'Crescente'})
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--mkp-text-secondary)' }}>Mostrar:</span>
              <select
                value={creatorsPerPage}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setCreatorsPerPage(val);
                  setCreatorsPage(1);
                }}
                style={{
                  background: 'var(--mkp-surface)',
                  color: 'var(--mkp-text-primary)',
                  border: '1px solid var(--mkp-border)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value={15}>15 criadores</option>
                <option value={30}>30 criadores</option>
                <option value={50}>50 criadores</option>
                <option value={100}>100 criadores</option>
                <option value="all">Todos ({sortedCreators.length})</option>
              </select>
            </div>
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
                  <th className="text-right" onClick={() => handleSort('avg_live_duration_seconds')} style={{ cursor: 'pointer' }}>
                    Média Live/Dia ({filteredDaysCount}d){renderSortIcon('avg_live_duration_seconds')}
                  </th>
                  <th className="text-right" onClick={() => handleSort('gmv')} style={{ cursor: 'pointer' }}>GMV Total{renderSortIcon('gmv')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCreators.length > 0 ? (
                  paginatedCreators.map((row, i) => (
                    <tr key={i}>
                      <td className="td-creator"><UserCheck size={16} className="table-row-icon" /> {row.creator_name}</td>
                      <td className="text-right">{formatNumber(row.items_sold)}</td>
                      <td className="text-right">{formatNumber(row.orders)}</td>
                      <td className="text-right">{formatNumber(row.video_count)}</td>
                      <td className="text-right">{formatNumber(row.live_count)}</td>
                      <td className="text-right">{formatDuration(row.live_duration_seconds)}</td>
                      <td className="text-right" style={{ color: 'var(--mkp-accent-blue)', fontWeight: 600 }}>
                        {formatDuration(row.avg_live_duration_seconds)}
                      </td>
                      <td className="td-total text-right"><span className="badge-total">{formatCurrency(row.gmv)}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '32px', color: '#94a3b8' }}>
                      Nenhum criador encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
              {sortedCreators.length > 0 && (
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} style={{ color: 'var(--mkp-accent-blue)' }} /> 
                        TOTAL GERAL ({formatNumber(creatorSummaryTotals.totalCount)} criadores)
                      </span>
                    </td>
                    <td className="text-right" style={{ fontWeight: 'bold' }}>{formatNumber(creatorSummaryTotals.totalItems)}</td>
                    <td className="text-right" style={{ fontWeight: 'bold' }}>{formatNumber(creatorSummaryTotals.totalOrders)}</td>
                    <td className="text-right" style={{ fontWeight: 'bold' }}>{formatNumber(creatorSummaryTotals.totalVideos)}</td>
                    <td className="text-right" style={{ fontWeight: 'bold' }}>{formatNumber(creatorSummaryTotals.totalLives)}</td>
                    <td className="text-right" style={{ fontWeight: 'bold' }}>{formatDuration(creatorSummaryTotals.totalLiveDuration)}</td>
                    <td className="text-right" style={{ fontWeight: 'bold', color: 'var(--mkp-accent-blue)' }}>
                      {formatDuration(creatorSummaryTotals.avgLiveDurationPerDay)}
                    </td>
                    <td className="text-right td-total" style={{ fontWeight: 'bold' }}>
                      <span className="badge-total" style={{ background: 'var(--mkp-accent-blue)', color: '#fff', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)' }}>
                        {formatCurrency(creatorSummaryTotals.totalGmv)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Paginação */}
          <PaginationControls
            currentPage={creatorsPage}
            totalPages={totalPages}
            totalItems={sortedCreators.length}
            itemsPerPage={creatorsPerPage}
            onPageChange={setCreatorsPage}
            onItemsPerPageChange={setCreatorsPerPage}
            label="criadores"
          />
        </div>
      </div>
    );
  };

  const renderTab2 = () => {
    const totalPages = Math.ceil(affinityList.length / (affinityPerPage === 'all' ? affinityList.length || 1 : affinityPerPage));
    const paginatedAffinity = affinityPerPage === 'all'
      ? affinityList
      : affinityList.slice((affinityPage - 1) * affinityPerPage, affinityPage * affinityPerPage);

    return (
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
                {paginatedAffinity.length > 0 ? paginatedAffinity.map((row, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.product_name}>{row.product_name}</td>
                    <td className="td-creator">{row.creator_name}</td>
                    <td className="text-right">{formatCurrency(row.video_gmv)}</td>
                    <td className="text-right">{formatCurrency(row.live_gmv)}</td>
                    <td className="td-total text-right"><span className="badge-total">{formatCurrency(row.gmv)}</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '32px', color: '#94a3b8' }}>
                      Nenhum dado de afinidade encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={affinityPage}
            totalPages={totalPages}
            totalItems={affinityList.length}
            itemsPerPage={affinityPerPage}
            onPageChange={setAffinityPage}
            onItemsPerPageChange={setAffinityPerPage}
            label="combinações"
          />
        </div>
      </div>
    );
  };

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
        { 
          label: 'Vídeos (GMV)', 
          data: hourlyGmvVideo, 
          borderColor: '#3b82f6', 
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(59, 130, 246, 0.15)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
            return gradient;
          }, 
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#3b82f6',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 3
        },
        { 
          label: 'LIVES (GMV)', 
          data: hourlyGmvLive, 
          borderColor: '#ef4444', 
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(239, 68, 68, 0.15)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
            return gradient;
          }, 
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#ef4444',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 3
        }
      ]
    };

    const dailyChartData = {
      labels: daysOfWeek,
      datasets: [
        { 
          label: 'Vídeos', 
          data: dailyGmvVideo, 
          backgroundColor: '#3b82f6',
          hoverBackgroundColor: '#2563eb',
          borderRadius: 8,
          borderSkipped: false,
        },
        { 
          label: 'LIVES', 
          data: dailyGmvLive, 
          backgroundColor: '#ef4444',
          hoverBackgroundColor: '#dc2626',
          borderRadius: 8,
          borderSkipped: false,
        }
      ]
    };

    const totalWeeklyGmvVideo = dailyGmvVideo.reduce((a, b) => a + b, 0);
    const totalWeeklyGmvLive = dailyGmvLive.reduce((a, b) => a + b, 0);
    const totalDailyGmvVideo = hourlyGmvVideo.reduce((a, b) => a + b, 0);
    const totalDailyGmvLive = hourlyGmvLive.reduce((a, b) => a + b, 0);

    const hourlyChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { 
          position: 'bottom', 
          labels: { boxWidth: 12, padding: 16, font: { family: 'Inter', size: 12, weight: 'bold' }, color: '#64748b' } 
        },
        datalabels: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13, family: 'Inter' },
          bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw || 0;
              const total = ctx.dataset.label.includes('Vídeos') ? totalDailyGmvVideo : totalDailyGmvLive;
              const pct = total ? ((val / total) * 100).toFixed(1) : '0';
              return ` ${ctx.dataset.label}: ${formatCurrency(val)} (${pct}% do total do dia)`;
            }
          }
        }
      },
      scales: {
        y: { 
          border: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b', callback: (v) => formatCurrency(v) }, 
          grid: { color: 'rgba(241, 245, 249, 0.08)' } 
        },
        x: { 
          border: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }, 
          grid: { display: false } 
        }
      }
    };

    const dailyChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 28,
          left: 8,
          right: 8,
          bottom: 4
        }
      },
      plugins: {
        legend: { 
          position: 'bottom', 
          labels: { boxWidth: 12, padding: 16, font: { family: 'Inter', size: 12, weight: 'bold' }, color: '#64748b' } 
        },
        datalabels: {
          anchor: 'end',
          align: 'top',
          offset: 4,
          color: (ctx) => ctx.dataset.label === 'Vídeos' ? '#60a5fa' : '#f87171',
          font: { family: 'Inter', weight: 'bold', size: 10 },
          formatter: (value, ctx) => {
            const total = ctx.dataset.label === 'Vídeos' ? totalWeeklyGmvVideo : totalWeeklyGmvLive;
            if (!total || !value) return '';
            const pct = ((value / total) * 100).toFixed(1);
            return `${pct}%`;
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13, family: 'Inter' },
          bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw || 0;
              const total = ctx.dataset.label === 'Vídeos' ? totalWeeklyGmvVideo : totalWeeklyGmvLive;
              const pct = total ? ((val / total) * 100).toFixed(1) : '0';
              return ` ${ctx.dataset.label}: ${formatCurrency(val)} (${pct}% da semana)`;
            }
          }
        }
      },
      scales: {
        y: { 
          grace: '20%',
          border: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b', callback: (v) => formatCurrency(v) }, 
          grid: { color: 'rgba(241, 245, 249, 0.08)' } 
        },
        x: { 
          border: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }, 
          grid: { display: false } 
        }
      }
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
              <Line data={hourlyChartData} options={hourlyChartOptions} />
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
              <Bar data={dailyChartData} options={dailyChartOptions} plugins={[ChartDataLabels]} />
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
    let sortedByRefunds = [...(marketplaceData?.products || [])].filter(p => p && p.product_name && p.product_name.trim() !== '');
    if (searchTerm) sortedByRefunds = sortedByRefunds.filter(p => p.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
    sortedByRefunds = sortArray(sortedByRefunds, sortConfig);

    let creatorRefunds = sortArray([...sortedCreators], sortConfig);

    const totalProdPages = Math.ceil(sortedByRefunds.length / (refundsProdPerPage === 'all' ? sortedByRefunds.length || 1 : refundsProdPerPage));
    const paginatedProds = refundsProdPerPage === 'all' 
      ? sortedByRefunds 
      : sortedByRefunds.slice((refundsProdPage - 1) * refundsProdPerPage, refundsProdPage * refundsProdPerPage);

    const totalCreatorPages = Math.ceil(creatorRefunds.length / (refundsCreatorPerPage === 'all' ? creatorRefunds.length || 1 : refundsCreatorPerPage));
    const paginatedCreators = refundsCreatorPerPage === 'all' 
      ? creatorRefunds 
      : creatorRefunds.slice((refundsCreatorPage - 1) * refundsCreatorPerPage, refundsCreatorPage * refundsCreatorPerPage);

    return (
      <div className="animated-fade-in">
        <div className="mkp-kpi-card" style={{ marginBottom: '24px', borderColor: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div className="kpi-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><AlertCircle size={20} /></div>
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
            <p className="kpi-subtext" style={{ color: '#fca5a5' }}>
              Taxa Geral: {totalGMV ? ((totalRefunds / totalGMV) * 100).toFixed(2) : 0}%
            </p>
          </div>
        </div>

        <div className="mkp-sections-grid" style={{ alignItems: 'stretch' }}>
          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2>Produtos (Cancelados)</h2>
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
                  {paginatedProds.length > 0 ? paginatedProds.map((row, i) => (
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
            <PaginationControls
              currentPage={refundsProdPage}
              totalPages={totalProdPages}
              totalItems={sortedByRefunds.length}
              itemsPerPage={refundsProdPerPage}
              onPageChange={setRefundsProdPage}
              onItemsPerPageChange={setRefundsProdPerPage}
              label="produtos"
            />
          </div>

          <div className="mkp-table-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <h2>Criadores (Cancelados)</h2>
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
                  {paginatedCreators.length > 0 ? paginatedCreators.map((row, i) => (
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
            <PaginationControls
              currentPage={refundsCreatorPage}
              totalPages={totalCreatorPages}
              totalItems={creatorRefunds.length}
              itemsPerPage={refundsCreatorPerPage}
              onPageChange={setRefundsCreatorPage}
              onItemsPerPageChange={setRefundsCreatorPerPage}
              label="criadores"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTab6 = () => {
    const totalProdPages = Math.ceil(sortedProducts.length / (revProdPerPage === 'all' ? sortedProducts.length || 1 : revProdPerPage));
    const paginatedProds = revProdPerPage === 'all' 
      ? sortedProducts 
      : sortedProducts.slice((revProdPage - 1) * revProdPerPage, revProdPage * revProdPerPage);

    const totalCreatorPages = Math.ceil(sortedCreators.length / (revCreatorPerPage === 'all' ? sortedCreators.length || 1 : revCreatorPerPage));
    const paginatedCreators = revCreatorPerPage === 'all' 
      ? sortedCreators 
      : sortedCreators.slice((revCreatorPage - 1) * revCreatorPerPage, revCreatorPage * revCreatorPerPage);

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
                  {paginatedProds.length > 0 ? paginatedProds.map((row, i) => (
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
            <PaginationControls
              currentPage={revProdPage}
              totalPages={totalProdPages}
              totalItems={sortedProducts.length}
              itemsPerPage={revProdPerPage}
              onPageChange={setRevProdPage}
              onItemsPerPageChange={setRevProdPerPage}
              label="produtos"
            />
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
                  {paginatedCreators.length > 0 ? paginatedCreators.map((row, i) => (
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
            <PaginationControls
              currentPage={revCreatorPage}
              totalPages={totalCreatorPages}
              totalItems={sortedCreators.length}
              itemsPerPage={revCreatorPerPage}
              onPageChange={setRevCreatorPage}
              onItemsPerPageChange={setRevCreatorPerPage}
              label="criadores"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTab7 = () => {
    let sortedProdsComm = [...(marketplaceData?.products || [])].filter(p => p && p.product_name && p.product_name.trim() !== '');
    if (searchTerm) sortedProdsComm = sortedProdsComm.filter(p => p.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
    sortedProdsComm = sortArray(sortedProdsComm, sortConfig);

    let creatorComm = sortArray([...sortedCreators], sortConfig);

    const totalProdPages = Math.ceil(sortedProdsComm.length / (commProdPerPage === 'all' ? sortedProdsComm.length || 1 : commProdPerPage));
    const paginatedProds = commProdPerPage === 'all' 
      ? sortedProdsComm 
      : sortedProdsComm.slice((commProdPage - 1) * commProdPerPage, commProdPage * commProdPerPage);

    const totalCreatorPages = Math.ceil(creatorComm.length / (commCreatorPerPage === 'all' ? creatorComm.length || 1 : commCreatorPerPage));
    const paginatedCreators = commCreatorPerPage === 'all' 
      ? creatorComm 
      : creatorComm.slice((commCreatorPage - 1) * commCreatorPerPage, commCreatorPage * commCreatorPerPage);

    const commissionMargin = totalGMV ? ((totalCommission / totalGMV) * 100).toFixed(2) : 0;
    return (
      <div className="animated-fade-in">
        <div className="mkp-sections-grid" style={{ marginBottom: '24px' }}>
          <div className="mkp-kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Percent size={20} /></div>
            <div>
              <h3>Comissões Pagas (Afiliados)</h3>
              <p className="kpi-value" style={{ color: '#34d399' }}>{formatCurrency(totalCommission)}</p>
            </div>
          </div>
          <div className="mkp-kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}><TrendingUp size={20} /></div>
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
                  {paginatedProds.length > 0 ? paginatedProds.map((row, i) => (
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
            <PaginationControls
              currentPage={commProdPage}
              totalPages={totalProdPages}
              totalItems={sortedProdsComm.length}
              itemsPerPage={commProdPerPage}
              onPageChange={setCommProdPage}
              onItemsPerPageChange={setCommProdPerPage}
              label="produtos"
            />
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
                  {paginatedCreators.length > 0 ? paginatedCreators.map((row, i) => (
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
            <PaginationControls
              currentPage={commCreatorPage}
              totalPages={totalCreatorPages}
              totalItems={creatorComm.length}
              itemsPerPage={commCreatorPerPage}
              onPageChange={setCommCreatorPage}
              onItemsPerPageChange={setCommCreatorPerPage}
              label="criadores"
            />
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // TAB 8: UPLOAD / IMPORT
  // ==========================================
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



  return (
    <div className="mkp-dashboard">
      <div className="mkp-header">
        <div>
          <h1 className="mkp-title">Marketplace & Afiliados</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p className="mkp-subtitle" style={{ margin: 0 }}>
              {startDate && endDate 
                ? `Exibindo: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')} (${marketplaceData?.isFilteredEmpty ? 0 : filteredDaysCount} dias)` 
                : formatPeriod(marketplaceData?.metadata?.period)}
            </p>
            {availableDateRange && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '20px',
                padding: '3px 12px',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.2px'
              }}>
                <CalendarDays size={14} />
                Histórico Disponível: <strong>{availableDateRange.label}</strong>
              </span>
            )}
          </div>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="filter-group">
              <CalendarDays size={18} className="filter-icon" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="filter-input date-input"
                title="Data Inicial"
              />
            </div>
            <span style={{ color: 'var(--mkp-text-secondary)', fontWeight: 'bold' }}>-</span>
            <div className="filter-group">
              <CalendarDays size={18} className="filter-icon" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="filter-input date-input"
                title="Data Final"
              />
            </div>
          </div>

          {availableDateRange && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  if (availableDateRange?.max) {
                    const endD = new Date(`${availableDateRange.max}T12:00:00`);
                    const startD = new Date(endD);
                    startD.setDate(startD.getDate() - 29);
                    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setStartDate(fmt(startD));
                    setEndDate(fmt(endD));
                  }
                }}
                style={{
                  background: 'var(--mkp-surface)',
                  border: '1px solid var(--mkp-border)',
                  color: 'var(--mkp-text-primary)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                title="Restaurar visualização dos últimos 30 dias"
              >
                Últimos 30d
              </button>
              <button
                type="button"
                onClick={() => {
                  if (availableDateRange?.min && availableDateRange?.max) {
                    setStartDate(availableDateRange.min);
                    setEndDate(availableDateRange.max);
                  }
                }}
                style={{
                  background: 'var(--mkp-surface)',
                  border: '1px solid var(--mkp-border)',
                  color: 'var(--mkp-text-primary)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                title={`Ver todo o período disponível (${availableDateRange.label})`}
              >
                Tudo ({availableDateRange.minFormatted} a {availableDateRange.maxFormatted})
              </button>
            </div>
          )}

          <button 
            onClick={() => setActiveTab(8)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--mkp-accent-blue)', color: '#fff',
              border: 'none', borderRadius: '8px', padding: '0 20px',
              fontWeight: 'bold', cursor: 'pointer', height: '42px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease', marginLeft: '8px',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <UploadCloud size={18} /> Importar Planilhas
          </button>
        </div>
      </div>

      {marketplaceData?.isFilteredEmpty && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              flexShrink: 0
            }}>
              <CalendarDays size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--mkp-text-primary)', fontSize: '14px' }}>
                Nenhum dado encontrado para o período selecionado ({startDate ? startDate.split('-').reverse().join('/') : ''} a {endDate ? endDate.split('-').reverse().join('/') : ''})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--mkp-text-secondary)', marginTop: '2px' }}>
                {availableDateRange 
                  ? `Os relatórios cadastrados cobrem o período de ${availableDateRange.label}.` 
                  : 'Nenhum dado cadastrado para este intervalo.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                if (availableDateRange?.max) {
                  const endD = new Date(`${availableDateRange.max}T12:00:00`);
                  const startD = new Date(endD);
                  startD.setDate(startD.getDate() - 29);
                  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setStartDate(fmt(startD));
                  setEndDate(fmt(endD));
                }
              }}
              style={{
                background: 'var(--mkp-accent-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Restaurar Últimos 30 Dias
            </button>
            {availableDateRange && (
              <button
                type="button"
                onClick={() => {
                  setStartDate(availableDateRange.min);
                  setEndDate(availableDateRange.max);
                }}
                style={{
                  background: 'var(--mkp-surface)',
                  color: 'var(--mkp-text-primary)',
                  border: '1px solid var(--mkp-border)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Ver Todo o Período
              </button>
            )}
          </div>
        </div>
      )}

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
