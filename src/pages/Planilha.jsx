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
  ArrowDown,
  Filter
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
  
  // Tab Principal
  const [activeSubTab, setActiveSubTab] = useState('auditoria');

  // Dados Senior X
  const [seniorOrders, setSeniorOrders] = useState([]);
  const [seniorLoading, setSeniorLoading] = useState(false);
  const [seniorError, setSeniorError] = useState(null);
  const [seniorUsingMock, setSeniorUsingMock] = useState(false);
  const [seniorSearch, setSeniorSearch] = useState('');
  const [expandedSeniorId, setExpandedSeniorId] = useState(null);
  const [seniorCurrentPage, setSeniorCurrentPage] = useState(1);
  const seniorItensPorPagina = 10;

  // Filtros Auditoria (Planilha)
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

  // Paginação Auditoria
  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [isExportPromptOpen, setIsExportPromptOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState('csv');

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
      if (!r || !r.c || r.c.length < 4) return;
      
      const pedidoFirme = String(r.c[3]?.v || '').trim().toUpperCase();
      if (pedidoFirme !== 'SIM') return;

      const fornecedor = String(r.c[1]?.v || '').trim();
      if (!fornecedor) return;

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
      const results = await Promise.all(
        MONTHS_TABS.map(async (m) => {
          try {
            return await fetchMonthData(m);
          } catch (e) {
            console.error(`Erro ao carregar aba ${m}:`, e.message);
            return [];
          }
        })
      );

      const consolidated = results.flat();
      setOrders(consolidated);
    } catch (err) {
      setError('Falha ao sincronizar dados da planilha de apoio.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeniorTracking = async () => {
    setSeniorLoading(true);
    setSeniorError(null);
    setSeniorUsingMock(false);

    const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
    const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
    const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
    const tenantName = 'gruposandrinicombr';

    try {
      const loginRes = await fetch('/api-senior/platform/authentication/anonymous/loginWithKey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'client_id': gateway_client_id
        },
        body: JSON.stringify({
          accessKey: tenant_access_key,
          secret: tenant_secret,
          tenantName: tenantName
        })
      });

      if (!loginRes.ok) throw new Error('Falha na autenticação da Senior');
      const loginData = await loginRes.json();
      let token = null;
      if (loginData.access_token) {
        token = loginData.access_token;
      } else if (loginData.jsonToken) {
        const parsed = JSON.parse(loginData.jsonToken);
        token = parsed.access_token || parsed.jsonToken;
      }

      if (!token) throw new Error('Token não retornado');

      const trackingRes = await fetch('/api-senior/api_privada/erpx_sup_cpr_purchase_orders/purchase_orders/queries/listPurchaseOrdersDeliveryTracking', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'client_id': gateway_client_id,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tenant': tenantName
        },
        body: JSON.stringify({
          deliveryTrackingStatus: ["UPCOMING"],
          page: {
            offset: 0,
            size: 100
          }
        })
      });

      if (!trackingRes.ok) throw new Error(`Erro na API Senior: ${trackingRes.status}`);
      const trackingData = await trackingRes.json();
      if (trackingData && trackingData.recPurchaseOrderDeliveryTracking) {
        setSeniorOrders(trackingData.recPurchaseOrderDeliveryTracking);
      } else {
        setSeniorOrders([]);
      }
    } catch (err) {
      console.warn('Utilizando simulação local para previsão de entregas:', err.message);
      setSeniorUsingMock(true);
      setSeniorOrders([
        {
          deliveryTrackingStatus: "UPCOMING",
          orderId: "ord_nike",
          orderItemId: "item_nike_1",
          orderNumber: 31204,
          issueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
          daysUntilDelivery: 3,
          supplier: {
            code: "3948",
            description: "NIKE DO BRASIL PRODUTOS ESPORTIVOS LTDA",
            label: "Nike"
          },
          item: {
            code: "DD8475-003",
            description: "TÊNIS NIKE DEFYALLDAY PRETO/BRANCO"
          },
          quantityOrdered: 80,
          quantityReceived: 50,
          quantityCancelled: 0,
          quantityOpen: 30,
          purchaseQuantity: 80,
          company: { code: "3", description: "SANDRINI GROUP" },
          branch: { code: "1", description: "MATRIZ" }
        },
        {
          deliveryTrackingStatus: "UPCOMING",
          orderId: "ord_adidas",
          orderItemId: "item_adidas_1",
          orderNumber: 31215,
          issueDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          expectedDeliveryDate: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
          daysUntilDelivery: 6,
          supplier: {
            code: "1094",
            description: "ADIDAS DO BRASIL LTDA",
            label: "Adidas"
          },
          item: {
            code: "GK9556",
            description: "SHORTS ADIDAS RUN IT MASCULINO PRETO"
          },
          quantityOrdered: 150,
          quantityReceived: 0,
          quantityCancelled: 0,
          quantityOpen: 150,
          purchaseQuantity: 150,
          company: { code: "3", description: "SANDRINI GROUP" },
          branch: { code: "1", description: "MATRIZ" }
        },
        {
          deliveryTrackingStatus: "DELAYED",
          orderId: "ord_lupo",
          orderItemId: "item_lupo_1",
          orderNumber: 31180,
          issueDate: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
          expectedDeliveryDate: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
          daysUntilDelivery: -4,
          supplier: {
            code: "4820",
            description: "LUPO S.A. MATRIZ",
            label: "Lupo"
          },
          item: {
            code: "03290-001",
            description: "CUECA BOXER LUPO MICOFIBRA SEM COSTURA"
          },
          quantityOrdered: 400,
          quantityReceived: 200,
          quantityCancelled: 0,
          quantityOpen: 200,
          purchaseQuantity: 400,
          company: { code: "3", description: "SANDRINI GROUP" },
          branch: { code: "1", description: "MATRIZ" }
        },
        {
          deliveryTrackingStatus: "UPCOMING",
          orderId: "ord_fila",
          orderItemId: "item_fila_1",
          orderNumber: 31229,
          issueDate: new Date().toISOString(),
          expectedDeliveryDate: new Date(Date.now() + 11 * 24 * 3600 * 1000).toISOString().split('T')[0],
          daysUntilDelivery: 11,
          supplier: {
            code: "2209",
            description: "FILA ESPORTES DO BRASIL",
            label: "Fila"
          },
          item: {
            code: "F02R0042",
            description: "TÊNIS FILA FLOAT MASCULINO MARINHO"
          },
          quantityOrdered: 60,
          quantityReceived: 0,
          quantityCancelled: 0,
          quantityOpen: 60,
          purchaseQuantity: 60,
          company: { code: "3", description: "SANDRINI GROUP" },
          branch: { code: "1", description: "MATRIZ" }
        }
      ]);
    } finally {
      setSeniorLoading(false);
    }
  };

  useEffect(() => {
    loadAllOrders();
    fetchSeniorTracking();
  }, []);

  const handleRefresh = () => {
    if (activeSubTab === 'auditoria') {
      loadAllOrders(true);
    } else {
      fetchSeniorTracking();
    }
  };

  const parseDateToTimestamp = (dateStr) => {
    if (!dateStr || !dateStr.includes('/')) return 0;
    const [d, m, y] = dateStr.split('/');
    return new Date(`${y}-${m}-${d}T12:00:00`).getTime();
  };

  // Coleta os status únicos para o seletor de filtro
  const statusOptions = useMemo(() => {
    const list = Array.from(new Set(orders.map(o => o.status.toUpperCase())));
    return list.map(s => ({ value: s, label: s }));
  }, [orders]);

  // Filtra os pedidos com base no estado de busca
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (selectedMonth !== 'TODOS' && o.month !== selectedMonth) return false;
      if (selectedStatus && o.status.toUpperCase() !== selectedStatus.value) return false;
      
      if (dataIni || dataFim) {
        const ts = parseDateToTimestamp(o.previsaoEntrega);
        if (ts > 0) {
          if (dataIni) {
            const startTs = new Date(`${dataIni}T00:00:00`).getTime();
            if (ts < startTs) return false;
          }
          if (dataFim) {
            const endTs = new Date(`${dataFim}T23:59:59`).getTime();
            if (ts > endTs) return false;
          }
        } else {
          return false;
        }
      }

      if (busca) {
        const term = busca.toLowerCase();
        return (
          o.fornecedor.toLowerCase().includes(term) ||
          o.codPedidoSenior.toLowerCase().includes(term) ||
          o.status.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [orders, selectedMonth, selectedStatus, dataIni, dataFim, busca]);

  // Filtros Senior X
  const filteredSeniorOrders = useMemo(() => {
    return seniorOrders.filter(o => {
      const term = seniorSearch.toLowerCase();
      const orderNum = String(o.orderNumber || '');
      const supplierDesc = String(o.supplier?.description || '').toLowerCase();
      const itemDesc = String(o.item?.description || '').toLowerCase();
      const itemCode = String(o.item?.code || '').toLowerCase();
      return orderNum.includes(term) || supplierDesc.includes(term) || itemDesc.includes(term) || itemCode.includes(term);
    });
  }, [seniorOrders, seniorSearch]);

  // Ordenação
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedOrders = useMemo(() => {
    let sortableItems = [...filteredOrders];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'previsaoEntrega') {
          valA = parseDateToTimestamp(a.previsaoEntrega);
          valB = parseDateToTimestamp(b.previsaoEntrega);
        }

        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredOrders, sortConfig]);

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return <ArrowUpDown size={14} className="sort-icon-inactive" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="sort-icon-active" /> 
      : <ArrowDown size={14} className="sort-icon-active" />;
  };

  // KPIs Auditoria
  const kpis = useMemo(() => {
    let totalProvisionado = 0;
    let recebido = 0;
    let aberto = 0;
    filteredOrders.forEach(o => {
      totalProvisionado += o.valorProvisionado;
      recebido += o.recebido;
      aberto += o.aberto;
    });
    return { totalProvisionado, recebido, aberto };
  }, [filteredOrders]);

  // KPIs Senior
  const seniorKpis = useMemo(() => {
    const totalOrdersCount = new Set(seniorOrders.map(o => o.orderNumber)).size;
    const totalOpenQty = seniorOrders.reduce((sum, o) => sum + (o.quantityOpen || 0), 0);
    const delayedCount = seniorOrders.filter(o => o.deliveryTrackingStatus === 'DELAYED' || (o.daysUntilDelivery && o.daysUntilDelivery < 0)).length;
    return { totalOrdersCount, totalOpenQty, delayedCount };
  }, [seniorOrders]);

  // Paginação Auditoria
  const totalPaginas = Math.ceil(sortedOrders.length / itensPorPagina);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itensPorPagina;
    return sortedOrders.slice(start, start + itensPorPagina);
  }, [sortedOrders, currentPage, itensPorPagina]);

  const paginatedSeniorOrders = useMemo(() => {
    const start = (seniorCurrentPage - 1) * seniorItensPorPagina;
    return filteredSeniorOrders.slice(start, start + seniorItensPorPagina);
  }, [filteredSeniorOrders, seniorCurrentPage]);

  const totalSeniorPages = Math.ceil(filteredSeniorOrders.length / seniorItensPorPagina);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedStatus, busca, dataIni, dataFim]);

  useEffect(() => {
    setSeniorCurrentPage(1);
  }, [seniorSearch]);

  const getPaginasVisiveis = () => {
    const paginas = [];
    for (let i = 1; i <= totalPaginas; i++) {
      if (i === 1 || i === totalPaginas || Math.abs(currentPage - i) <= 1) {
        paginas.push(i);
      } else if (paginas[paginas.length - 1] !== '...') {
        paginas.push('...');
      }
    }
    return paginas;
  };

  const getSeniorPaginasVisiveis = () => {
    const paginas = [];
    for (let i = 1; i <= totalSeniorPages; i++) {
      if (i === 1 || i === totalSeniorPages || Math.abs(seniorCurrentPage - i) <= 1) {
        paginas.push(i);
      } else if (paginas[paginas.length - 1] !== '...') {
        paginas.push('...');
      }
    }
    return paginas;
  };

  const handleExportData = (type) => {
    setPendingExportType(type);
    setIsExportMenuOpen(false);
    setIsExportPromptOpen(true);
  };

  const executeExport = (filterActive) => {
    setIsExportPromptOpen(false);
    const dataToExport = filterActive ? sortedOrders : orders;
    
    const formatted = dataToExport.map(o => ({
      'Mês': o.month,
      'Fornecedor': o.fornecedor,
      'Código Pedido Sênior': o.codPedidoSenior,
      'Previsão de Entrega': o.previsaoEntrega,
      'Valor Provisionado': o.valorProvisionado,
      'Valor Recebido': o.recebido,
      'Valor Aberto': o.aberto,
      'NFs Anexadas': o.nfsAnexadas,
      'Status': o.status,
      'Observação Dedo Duro': o.obsDedoDuro
    }));

    handleExport(formatted, `pedidos_compra_${selectedMonth.toLowerCase()}`, pendingExportType);
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

  const isMainPageLoading = activeSubTab === 'auditoria' ? (loading && orders.length === 0) : (seniorLoading && seniorOrders.length === 0);

  if (isMainPageLoading) {
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
                <p>{activeSubTab === 'auditoria' ? 'Auditoria de faturamento e saldo de pedidos para fornecedores' : 'Acompanhamento de entrega dos pedidos de compra na Senior X'}</p>
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
            <h3>Sincronizando Dados...</h3>
            <p>{activeSubTab === 'auditoria' ? 'Consolidando carteiras de fornecedores de MAIO a DEZEMBRO' : 'Conectando ao gateway da Senior X'}</p>
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
              <p>Auditoria e acompanhamento de carteira de compras</p>
            </div>
          </div>
        </div>

        {/* Grupo de Ações do Cabeçalho */}
        <div className="sheet-actions-group">
          {/* Botão de Sincronizar */}
          <button 
            className="btn-padrao action-icon-btn" 
            onClick={handleRefresh} 
            disabled={loading || seniorLoading}
            title="Atualizar Dados"
          >
            <RefreshCw size={18} className={(loading || seniorLoading) ? "spin" : ""} />
          </button>

          {activeSubTab === 'auditoria' && (
            <>
              {/* Seletor de Exportação */}
              <div style={{ position: 'relative' }}>
                <button className="btn-padrao" onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}>
                  <Download size={18} style={{ marginRight: '8px' }} /> Exportar
                </button>
                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="export-menu-dropdown"
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
            </>
          )}
        </div>
      </div>

      {/* Sub-abas de Navegação */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', paddingBottom: '1px' }}>
        <button 
          onClick={() => setActiveSubTab('auditoria')}
          style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: activeSubTab === 'auditoria' ? '3px solid #a855f7' : '3px solid transparent',
            color: activeSubTab === 'auditoria' ? '#a855f7' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          <FileSpreadsheet size={16} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'text-bottom' }} /> Auditoria (Planilhas)
        </button>
        <button 
          onClick={() => setActiveSubTab('previsoes')}
          style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: activeSubTab === 'previsoes' ? '3px solid #a855f7' : '3px solid transparent',
            color: activeSubTab === 'previsoes' ? '#a855f7' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          <Clock size={16} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'text-bottom' }} /> Previsão de Entregas (Senior X)
        </button>
      </div>

      {activeSubTab === 'auditoria' && (
        <>
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
                <div className="kpi-label">SALDO EM ABERTO</div>
                <div className="kpi-value">{kpis.aberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              </div>
            </div>
          </div>

          {/* Abas Mensais do Google Sheets */}
          <div className="months-scroll-container">
            <div className="months-tabs-flex">
              <button 
                onClick={() => setSelectedMonth('TODOS')}
                className={`month-tab-button ${selectedMonth === 'TODOS' ? 'active' : ''}`}
              >
                TODOS
              </button>
              {MONTHS_TABS.map((month) => (
                <button 
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`month-tab-button ${selectedMonth === month ? 'active' : ''}`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          {/* Container de Filtros */}
          <div className="filters-card-wrapper">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 250px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>BUSCAR PEDIDO OU FORNECEDOR</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  className="input-padrao" 
                  style={{ paddingLeft: '44px' }} 
                  placeholder="Digite o nome do fornecedor ou pedido..." 
                  value={buscaInput}
                  onChange={e => setBuscaInput(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px', flex: '1 1 200px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>FILTRAR POR STATUS</label>
              <Select 
                options={statusOptions}
                placeholder="Todos os status..."
                value={selectedStatus}
                onChange={setSelectedStatus}
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '12px',
                    borderColor: '#cbd5e1',
                    minHeight: '42px',
                    fontSize: '14px',
                    '&:hover': { borderColor: '#94a3b8' }
                  })
                }}
              />
            </div>

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
                  render: (row) => <span style={{ fontWeight: 600, color: '#a855f7' }}>{row.month}</span>
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
                
                {getPaginasVisiveis().map((pag, idx) => {
                  if (pag === '...') {
                    return (
                      <span 
                        key={`dots-${idx}`} 
                        className="pagination-dots" 
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#94a3b8'
                        }}
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button 
                      key={pag}
                      className={`pagination-number ${currentPage === pag ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pag)}
                    >
                      {pag}
                    </button>
                  );
                })}

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
        </>
      )}

      {activeSubTab === 'previsoes' && (
        <>
          {/* KPI Cards Dinâmicos Senior */}
          <div className="orders-kpis-grid">
            <div className="order-kpi-card provisionado">
              <div className="kpi-icon-container" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Layers size={24} />
              </div>
              <div>
                <div className="kpi-label">PEDIDOS ATIVOS</div>
                <div className="kpi-value">{seniorKpis.totalOrdersCount}</div>
              </div>
            </div>

            <div className="order-kpi-card recebido" style={{ borderColor: '#e2e8f0' }}>
              <div className="kpi-icon-container" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="kpi-label">ITENS PENDENTES (ABERTO)</div>
                <div className="kpi-value">{seniorKpis.totalOpenQty.toLocaleString('pt-BR')} un</div>
              </div>
            </div>

            <div className="order-kpi-card aberto" style={{ borderColor: seniorKpis.delayedCount > 0 ? '#fecaca' : '#e2e8f0' }}>
              <div className="kpi-icon-container" style={{ 
                background: seniorKpis.delayedCount > 0 ? '#fef2f2' : '#fcf8e3', 
                color: seniorKpis.delayedCount > 0 ? '#dc2626' : '#854d0e' 
              }}>
                <Clock size={24} />
              </div>
              <div>
                <div className="kpi-label">ENTREGAS EM ATRASO</div>
                <div className="kpi-value" style={{ color: seniorKpis.delayedCount > 0 ? '#dc2626' : 'inherit' }}>
                  {seniorKpis.delayedCount}
                </div>
              </div>
            </div>
          </div>

          {/* Banner de simulação caso esteja usando dados locais simulados */}
          {seniorUsingMock && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#b45309',
              fontSize: '13.5px',
              lineHeight: 1.5,
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, color: '#d97706' }} />
              <div>
                <strong>Modo Sandbox (Simulado):</strong> A API privada da Senior X no gateway está bloqueada ou requer aprovação cadastral do <code>client_id</code>. Exibindo dados simulados de carteiras de fornecedores locais.
              </div>
            </div>
          )}

          {/* Container de Filtros Senior */}
          <div className="filters-card-wrapper" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>BUSCAR PREVISÃO DE ENTREGA</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  className="input-padrao" 
                  style={{ paddingLeft: '44px' }} 
                  placeholder="Digite número do pedido, fornecedor ou código do produto..." 
                  value={seniorSearch}
                  onChange={e => setSeniorSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tabela de Previsão Senior */}
          <div className="orders-table-wrapper">
            <MobileTable
              columns={[
                {
                  key: 'orderNumber',
                  label: 'Pedido de Compra',
                  rawLabel: 'Pedido de Compra',
                  render: (row) => <span className="monospaced-code" style={{ fontWeight: 'bold', color: '#2563eb' }}>#{row.orderNumber}</span>
                },
                {
                  key: 'supplier',
                  label: 'Fornecedor',
                  rawLabel: 'Fornecedor',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{row.supplier?.description}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Cód: {row.supplier?.code}</div>
                    </div>
                  )
                },
                {
                  key: 'item',
                  label: 'Produto / Item de Compra',
                  rawLabel: 'Produto / Item de Compra',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{row.item?.description}</div>
                      <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#64748b', fontWeight: 'bold', marginTop: '2px' }}>{row.item?.code}</div>
                    </div>
                  )
                },
                {
                  key: 'qty',
                  label: 'Qtd (Recebida / Pedida)',
                  rawLabel: 'Qtd (Recebida / Pedida)',
                  render: (row) => (
                    <span>{row.quantityReceived} / <b>{row.quantityOrdered}</b></span>
                  )
                },
                {
                  key: 'qtyOpen',
                  label: 'Saldo em Aberto',
                  rawLabel: 'Saldo em Aberto',
                  render: (row) => (
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: row.quantityOpen > 0 ? '#e11d48' : '#16a34a',
                      background: row.quantityOpen > 0 ? '#fff1f2' : '#f0fdf4',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontSize: '12px'
                    }}>
                      {row.quantityOpen} un
                    </span>
                  )
                },
                {
                  key: 'expectedDeliveryDate',
                  label: 'Previsão de Entrega',
                  rawLabel: 'Previsão de Entrega',
                  render: (row) => {
                    const parts = row.expectedDeliveryDate.split('-');
                    const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.expectedDeliveryDate;
                    return (
                      <div>
                        <div style={{ fontWeight: 600 }}>{formatted}</div>
                        {row.daysUntilDelivery != null && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: row.daysUntilDelivery < 0 ? '#dc2626' : '#64748b',
                            fontWeight: 'bold'
                          }}>
                            {row.daysUntilDelivery < 0 
                              ? `Atrasado há ${Math.abs(row.daysUntilDelivery)} dias` 
                              : `Faltam ${row.daysUntilDelivery} dias`}
                          </div>
                        )}
                      </div>
                    );
                  }
                },
                {
                  key: 'deliveryTrackingStatus',
                  label: 'Status',
                  rawLabel: 'Status',
                  render: (row) => {
                    const isDelayed = row.deliveryTrackingStatus === 'DELAYED' || (row.daysUntilDelivery && row.daysUntilDelivery < 0);
                    return (
                      <span className="order-status-badge" style={{ 
                        background: isDelayed ? '#fef2f2' : '#f0fdf4', 
                        color: isDelayed ? '#991b1b' : '#166534',
                        border: `1px solid ${isDelayed ? '#fecaca' : '#bbf7d0'}`
                      }}>
                        {isDelayed ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                        <span>{isDelayed ? 'ATRASADO' : 'NO PRAZO'}</span>
                      </span>
                    );
                  }
                }
              ]}
              rows={paginatedSeniorOrders}
              keyExtractor={(row) => row.orderId + '_' + row.orderItemId}
              onRowClick={(row) => setExpandedSeniorId(expandedSeniorId === row.orderId + '_' + row.orderItemId ? null : row.orderId + '_' + row.orderItemId)}
              isExpanded={(row) => expandedSeniorId === row.orderId + '_' + row.orderItemId}
              renderExpanded={(row) => (
                <div className="order-row-detail-box" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>EMISSÃO DO PEDIDO</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(row.issueDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>EMPRESA / FILIAL</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{row.company?.description} - {row.branch?.description}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>MÉTRICAS</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Quantidade Cancelada: {row.quantityCancelled || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Paginação Senior */}
          {totalSeniorPages > 1 && (
            <div className="orders-pagination-row">
              <div className="pagination-info">
                Mostrando <b>{((seniorCurrentPage - 1) * seniorItensPorPagina) + 1}</b> a <b>{Math.min(seniorCurrentPage * seniorItensPorPagina, filteredSeniorOrders.length)}</b> de <b>{filteredSeniorOrders.length}</b> previsões
              </div>
              <div className="pagination-controls">
                <button 
                  className="pagination-btn" 
                  onClick={() => setSeniorCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={seniorCurrentPage === 1}
                >
                  Anterior
                </button>
                
                {getSeniorPaginasVisiveis().map((pag, idx) => {
                  if (pag === '...') {
                    return (
                      <span 
                        key={`dots-${idx}`} 
                        className="pagination-dots" 
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#94a3b8'
                        }}
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button 
                      key={pag}
                      className={`pagination-number ${seniorCurrentPage === pag ? 'active' : ''}`}
                      onClick={() => setSeniorCurrentPage(pag)}
                    >
                      {pag}
                    </button>
                  );
                })}

                <button 
                  className="pagination-btn" 
                  onClick={() => setSeniorCurrentPage(prev => Math.min(prev + 1, totalSeniorPages))}
                  disabled={seniorCurrentPage === totalSeniorPages}
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Choice Modal for Exporting with Active Filters */}
      <AnimatePresence>
        {isExportPromptOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="export-prompt-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="export-prompt-card"
            >
              <h3>Opções de Exportação</h3>
              <p>Você gostaria de exportar a lista completa de pedidos ou apenas os pedidos atualmente filtrados?</p>
              <div className="export-prompt-buttons">
                <button className="btn-padrao sec" onClick={() => executeExport(false)}>
                  Exportar Completo ({orders.length})
                </button>
                <button className="btn-padrao" onClick={() => executeExport(true)}>
                  Exportar Filtrado ({sortedOrders.length})
                </button>
              </div>
              <button className="close-prompt-btn" onClick={() => setIsExportPromptOpen(false)}>Cancelar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
