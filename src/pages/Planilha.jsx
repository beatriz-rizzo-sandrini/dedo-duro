import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Download, 
  FileText, 
  Calendar,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Select from 'react-select';
import MobileTable from '../components/MobileTable';
import { handleExport } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import './Planilha.css';

const SPREADSHEET_ID = '1y-DA1HWwkDRED5HYZD1XivXiixD4OclESY1EKE7ELoE';
const MONTHS_TABS = [
  'MAIO', 
  'JUNHO', 
  'JULHO', 
  'AGOSTO', 
  'SETEMBRO', 
  'OUTUBRO', 
  'NOVEMBRO', 
  'DEZEMBRO'
];

export default function Planilha() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState('TODOS');
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [buscaInput]);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'previsaoEntrega', direction: 'asc' });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // Auxiliares de parsing de data do Google Sheets gviz
  const parseSheetDate = (cell) => {
    if (!cell) return '';
    if (cell.f) return cell.f;
    const v = cell.v;
    if (typeof v === 'string' && v.startsWith('Date(')) {
      const match = v.match(/Date\((\d+),(\d+),(\d+)\)/);
      if (match) {
        const year = match[1];
        const month = String(parseInt(match[2]) + 1).padStart(2, '0');
        const day = String(match[3]).padStart(2, '0');
        return `${day}/${month}/${year}`;
      }
    }
    return String(v || '');
  };

  const fetchMonthData = async (monthName) => {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(monthName)}`;
    const res = await fetch(url);
    const text = await res.text();
    const jsonStr = text.substring(47).slice(0, -2);
    const parsed = JSON.parse(jsonStr);
    const rows = parsed.table.rows || [];

    const monthOrders = [];
    rows.forEach((r, rowIndex) => {
      // Linha deve ter pelo menos PEDIDO FIRME (Coluna D, index 3)
      if (!r || !r.c || r.c.length < 4) return;
      
      const pedidoFirme = String(r.c[3]?.v || '').trim().toUpperCase();
      if (pedidoFirme !== 'SIM') return;

      const fornecedor = String(r.c[1]?.v || '').trim();
      if (!fornecedor) return; // Evita linhas vazias com lixo

      const codPedidoSenior = r.c[2]?.v != null ? String(r.c[2]?.v).trim() : '';
      const previsaoEntrega = parseSheetDate(r.c[4]);
      
      const valorProvisionado = Number(r.c[5]?.v) || 0;
      const recebido = Number(r.c[8]?.v) || 0;
      const aberto = Number(r.c[9]?.v) || 0;
      
      const nfsAnexadas = r.c[10]?.v != null ? String(r.c[10]?.v).trim() : '';
      const status = String(r.c[11]?.v || 'PENDENTE').trim().toUpperCase();
      const obsDedoDuro = String(r.c[12]?.v || '').trim();

      monthOrders.push({
        id: `${monthName}_${rowIndex}_${codPedidoSenior}`,
        month: monthName,
        fornecedor,
        codPedidoSenior,
        previsaoEntrega,
        valorProvisionado,
        recebido,
        aberto,
        nfsAnexadas,
        status,
        obsDedoDuro
      });
    });

    return monthOrders;
  };

  const loadAllOrders = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      // Carrega todas as abas mensais em paralelo para máxima performance
      const results = await Promise.all(
        MONTHS_TABS.map(async (m) => {
          try {
            return await fetchMonthData(m);
          } catch (e) {
            console.error(`Erro ao carregar aba ${m}:`, e.message);
            return []; // Retorna lista vazia caso uma aba falhe
          }
        })
      );

      // Achata a lista combinando todos os pedidos de todos os meses
      const consolidated = results.flat();
      setOrders(consolidated);
    } catch (err) {
      setError('Falha ao sincronizar dados da planilha de apoio.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllOrders();
  }, []);

  const handleRefresh = () => {
    loadAllOrders(true);
  };

  const parseDateToTimestamp = (dateStr) => {
    if (!dateStr || !dateStr.includes('/')) return 0;
    const [d, m, y] = dateStr.split('/');
    return new Date(`${y}-${m}-${d}T12:00:00`).getTime();
  };

  // Coleta os status únicos para o seletor de filtro
  const statusOptions = useMemo(() => {
    const set = new Set();
    orders.forEach(o => {
      if (o.status) set.add(o.status);
    });
    return Array.from(set).map(s => ({ value: s, label: toTitleCase(s) }));
  }, [orders]);

  // Filtra os pedidos com base no estado de busca
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filtro de Mês
    if (selectedMonth !== 'TODOS') {
      result = result.filter(o => o.month === selectedMonth);
    }

    // Busca textual (Fornecedor ou Código Sênior)
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim();
      result = result.filter(o => 
        o.fornecedor.toLowerCase().includes(termo) ||
        o.codPedidoSenior.toLowerCase().includes(termo)
      );
    }

    // Filtro de Status
    if (selectedStatus) {
      result = result.filter(o => o.status === selectedStatus);
    }

    // Filtro por período de previsão
    if (dataIni) {
      const tIni = new Date(`${dataIni}T00:00:00`).getTime();
      result = result.filter(o => parseDateToTimestamp(o.previsaoEntrega) >= tIni);
    }
    if (dataFim) {
      const tFim = new Date(`${dataFim}T23:59:59`).getTime();
      result = result.filter(o => parseDateToTimestamp(o.previsaoEntrega) <= tFim);
    }

    return result;
  }, [orders, selectedMonth, busca, selectedStatus, dataIni, dataFim]);

  // Ordenação
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

  const sortedOrders = useMemo(() => {
    let result = [...filteredOrders];
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'previsaoEntrega') {
          aVal = parseDateToTimestamp(a.previsaoEntrega);
          bVal = parseDateToTimestamp(b.previsaoEntrega);
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredOrders, sortConfig]);

  // Estatísticas / KPIs
  const kpis = useMemo(() => {
    let totalProvisionado = 0;
    let recebido = 0;
    let aberto = 0;

    filteredOrders.forEach(o => {
      totalProvisionado += o.valorProvisionado;
      recebido += o.recebido;
      aberto += o.aberto;
    });

    return {
      totalProvisionado,
      recebido,
      aberto
    };
  }, [filteredOrders]);

  // Paginação
  const totalPaginas = Math.ceil(sortedOrders.length / itensPorPagina);
  const paginatedOrders = useMemo(() => {
    return sortedOrders.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);
  }, [sortedOrders, currentPage, itensPorPagina]);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedOrderId(null);
  }, [selectedMonth, busca, selectedStatus, dataIni, dataFim]);

  // Exportação
  const handleExportData = (type) => {
    const headers = [
      "Mês Referência",
      "Fornecedor",
      "Cod Pedido Sênior",
      "Previsão de Entrega",
      "Valor Provisionado",
      "Recebido",
      "Aberto (Saldo)",
      "NFs Anexadas",
      "Status",
      "Obs Dedo Duro"
    ];

    const dataToExport = sortedOrders.map(o => [
      o.month,
      o.fornecedor,
      o.codPedidoSenior,
      o.previsaoEntrega,
      o.valorProvisionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      o.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      o.aberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      o.nfsAnexadas,
      o.status,
      o.obsDedoDuro
    ]);

    handleExport(type, "Acompanhamento_Pedidos_Fornecedores", headers, dataToExport);
    setIsExportMenuOpen(false);
  };

  const getStatusStyle = (status) => {
    const s = status.toUpperCase();
    if (s.includes('RECEBIDO') || s === 'FINALIZADO' || s === 'CONCLUÍDO') {
      return { background: '#dcfce7', color: '#166534', icon: CheckCircle2 };
    }
    if (s.includes('ABERTO') || s.includes('ANDAMENTO') || s.includes('PROVISIONADO')) {
      return { background: '#dbeafe', color: '#1e40af', icon: Clock };
    }
    if (s.includes('PENDENTE') || s.includes('ATRAS') || s.includes('FATURAR')) {
      return { background: '#fef3c7', color: '#854d0e', icon: AlertTriangle };
    }
    return { background: '#f1f5f9', color: '#475569', icon: AlertCircle };
  };

  if (loading && orders.length === 0) {
    return (
      <div className="header-main">
        <div className="sheet-page-header">
          <div>
            <div className="sheet-title-area">
              <div className="sheet-icon-wrapper" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', boxShadow: '0 6px 20px rgba(168, 85, 247, 0.3)' }}>
                <FileSpreadsheet size={28} className="sheet-main-icon" />
              </div>
              <div>
                <h1>Pedidos</h1>
                <p>Auditoria de faturamento e saldo de pedidos para fornecedores</p>
              </div>
            </div>
          </div>
        </div>
        <div className="sheet-loader-overlay" style={{ minHeight: '400px', position: 'relative', borderRadius: '20px' }}>
          <div className="sheet-loading-card">
            <div className="loading-bar-animation" style={{ background: '#f3e8ff' }}></div>
            <div className="sheet-loading-spinner" style={{ background: '#faf5ff' }}>
              <FileSpreadsheet size={40} className="pulse-icon" style={{ color: '#a855f7' }} />
            </div>
            <h3>Sincronizando Pedidos...</h3>
            <p>Consolidando carteiras de fornecedores de MAIO a DEZEMBRO</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="header-main"
    >
      {/* Cabeçalho da Página */}
      <div className="sheet-page-header">
        <div>
          <div className="sheet-title-area">
            <div className="sheet-icon-wrapper" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', boxShadow: '0 6px 20px rgba(168, 85, 247, 0.3)' }}>
              <FileSpreadsheet size={28} className="sheet-main-icon" />
            </div>
            <div>
              <h1>Pedidos</h1>
              <p>Auditoria de faturamento e saldo de pedidos para fornecedores</p>
            </div>
          </div>
        </div>

        {/* Grupo de Ações do Cabeçalho */}
        <div className="sheet-actions-group">
          {/* Botão de Atualizar */}
          <button 
            className="btn-padrao action-icon-btn" 
            onClick={handleRefresh} 
            disabled={loading}
            title="Atualizar Dados"
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>

          {/* Seletor de Exportação */}
          <div style={{ position: 'relative' }}>
            <button className="btn-padrao" onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}>
              <Download size={18} /> Exportar
            </button>
            <AnimatePresence>
              {isExportMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="sheet-export-menu"
                >
                  <div className="export-menu-header">FORMATOS DISPONÍVEIS</div>
                  <div className="export-menu-item" onClick={() => handleExportData('xlsx')}>
                    <FileSpreadsheet size={14} color="#10b981" /> Excel (XLSX)
                  </div>
                  <div className="export-menu-item" onClick={() => handleExportData('csv')}>
                    <FileText size={14} color="#64748b" /> CSV
                  </div>
                  <div className="export-menu-item" onClick={() => handleExportData('pdf')}>
                    <FileText size={14} color="#ef4444" /> PDF (Tabela)
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Botão para Abrir Sheets */}
          <a 
            href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="sheet-external-link-btn"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.25)' }}
          >
            <span>Editar Planilha</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* KPI Cards Dinâmicos */}
      <div className="orders-kpis-grid">
        <div className="order-kpi-card provisionado">
          <div className="kpi-icon-container">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="kpi-label">TOTAL PROVISIONADO</div>
            <div className="kpi-value">{kpis.totalProvisionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </div>
        </div>

        <div className="order-kpi-card recebido">
          <div className="kpi-icon-container">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="kpi-label">RECEBIDO (ENTREGUE)</div>
            <div className="kpi-value">{kpis.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </div>
        </div>

        <div className="order-kpi-card aberto">
          <div className="kpi-icon-container">
            <Clock size={24} />
          </div>
          <div>
            <div className="kpi-label">ABERTO (SALDO DEVEDOR)</div>
            <div className="kpi-value">{kpis.aberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </div>
        </div>
      </div>

      {/* Container de Filtros */}
      <div className="filters-container">
        {/* Seletor de Mês de Referência */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>MÊS DE REFERÊNCIA</label>
          <Select 
            options={[
              { value: 'TODOS', label: 'Todos os Meses' },
              ...MONTHS_TABS.map(m => ({ value: m, label: m }))
            ]}
            value={{ value: selectedMonth, label: selectedMonth === 'TODOS' ? 'Todos os Meses' : selectedMonth }}
            onChange={opt => setSelectedMonth(opt.value)}
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        {/* Pesquisa por texto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '240px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>BUSCAR PEDIDO OU FORNECEDOR</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="input-padrao" 
              style={{ width: '100%', paddingLeft: '42px' }}
              placeholder="Digite o nome do fornecedor ou pedido..." 
              value={buscaInput} 
              onChange={e => setBuscaInput(e.target.value)} 
            />
          </div>
        </div>

        {/* Filtro de Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>STATUS DO PEDIDO</label>
          <Select 
            options={[
              { value: '', label: 'Todos' },
              ...statusOptions
            ]}
            value={{ value: selectedStatus, label: selectedStatus ? toTitleCase(selectedStatus) : 'Todos' }}
            onChange={opt => setSelectedStatus(opt.value)}
            placeholder="Selecione um status"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        {/* Filtros de data de previsão */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>DATA INICIAL</label>
          <input type="date" className="input-padrao" value={dataIni} onChange={e => setDataIni(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>DATA FINAL</label>
          <input type="date" className="input-padrao" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
      </div>

      {/* Tabela de Dados Responsiva */}
      <div className="orders-table-wrapper">
        <MobileTable
          columns={[
            {
              key: 'month',
              label: 'Mês',
              rawLabel: 'Mês',
              render: (row) => <span style={{ fontWeight: 600, color: '#6d28d9' }}>{row.month}</span>
            },
            {
              key: 'fornecedor',
              label: <div className="sort-th-inner" onClick={() => requestSort('fornecedor')}>Fornecedor {getSortIcon('fornecedor')}</div>,
              rawLabel: 'Fornecedor',
              render: (row) => <span style={{ fontWeight: 700, color: '#1e293b' }}>{row.fornecedor}</span>
            },
            {
              key: 'codPedidoSenior',
              label: <div className="sort-th-inner" onClick={() => requestSort('codPedidoSenior')}>Cód. Sênior {getSortIcon('codPedidoSenior')}</div>,
              rawLabel: 'Cód. Sênior',
              render: (row) => <span className="monospaced-code">{row.codPedidoSenior || '-'}</span>
            },
            {
              key: 'previsaoEntrega',
              label: <div className="sort-th-inner" onClick={() => requestSort('previsaoEntrega')}>Previsão {getSortIcon('previsaoEntrega')}</div>,
              rawLabel: 'Previsão',
              render: (row) => row.previsaoEntrega
            },
            {
              key: 'valorProvisionado',
              label: <div className="sort-th-inner" onClick={() => requestSort('valorProvisionado')}>Provisionado {getSortIcon('valorProvisionado')}</div>,
              rawLabel: 'Provisionado',
              render: (row) => row.valorProvisionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            },
            {
              key: 'recebido',
              label: <div className="sort-th-inner" onClick={() => requestSort('recebido')}>Recebido {getSortIcon('recebido')}</div>,
              rawLabel: 'Recebido',
              render: (row) => <span style={{ color: row.recebido > 0 ? '#15803d' : '#64748b' }}>{row.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            },
            {
              key: 'aberto',
              label: <div className="sort-th-inner" onClick={() => requestSort('aberto')}>Aberto {getSortIcon('aberto')}</div>,
              rawLabel: 'Aberto',
              render: (row) => (
                <span style={{ 
                  fontWeight: 700, 
                  color: row.aberto > 0 ? '#b45309' : '#15803d' 
                }}>
                  {row.aberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )
            },
            {
              key: 'nfsAnexadas',
              label: 'NFs Anexadas',
              rawLabel: 'NFs Anexadas',
              render: (row) => row.nfsAnexadas || '-'
            },
            {
              key: 'status',
              label: <div className="sort-th-inner" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</div>,
              rawLabel: 'Status',
              render: (row) => {
                const style = getStatusStyle(row.status);
                const Icon = style.icon;
                return (
                  <span className="order-status-badge" style={{ background: style.background, color: style.color }}>
                    <Icon size={12} />
                    <span>{row.status}</span>
                  </span>
                );
              }
            }
          ]}
          rows={paginatedOrders}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => setExpandedOrderId(expandedOrderId === row.id ? null : row.id)}
          isExpanded={(row) => expandedOrderId === row.id}
          renderExpanded={(row) => (
            <div className="order-row-detail-box">
              <div className="detail-row">
                <span className="detail-label">MÊS DE REFERÊNCIA:</span>
                <span className="detail-val">{row.month}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">NFs ANEXADAS:</span>
                <span className="detail-val monospaced-code">{row.nfsAnexadas || 'Nenhuma nota anexada.'}</span>
              </div>
              <div className="detail-row observer-box">
                <span className="detail-label">OBSERVAÇÃO DEDO DURO:</span>
                <p className="obs-content">{row.obsDedoDuro || 'Sem observações cadastradas para este pedido.'}</p>
              </div>
            </div>
          )}
        />
      </div>

      {/* Controle de Paginação */}
      {totalPaginas > 1 && (
        <div className="orders-pagination-row">
          <div className="pagination-info">
            Mostrando <b>{((currentPage - 1) * itensPorPagina) + 1}</b> a <b>{Math.min(currentPage * itensPorPagina, sortedOrders.length)}</b> de <b>{sortedOrders.length}</b> pedidos
          </div>
          <div className="pagination-controls">
            <button 
              className="pagination-btn" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pag) => (
              <button 
                key={pag}
                className={`pagination-number ${currentPage === pag ? 'active' : ''}`}
                onClick={() => setCurrentPage(pag)}
              >
                {pag}
              </button>
            ))}

            <button 
              className="pagination-btn" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPaginas))}
              disabled={currentPage === totalPaginas}
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
