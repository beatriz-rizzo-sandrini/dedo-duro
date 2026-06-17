import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet } from 'lucide-react';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { getLatestDates, normalizeDateStr } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_ESTOQUE, COL_VENDAS, COL_CAMINHO } from '../utils/sheetColumns';
import MobileTable from '../components/MobileTable';
import { parseProductDescription } from '../utils/productParser';

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const get29DaysBeforeYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30); // 30 dias no total
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function Cobertura() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const vendasRows = data.vendas || [];
  const estoqueRows = data.estoque || [];
  const caminhoRows = data.caminho || [];

  const [filtroLocal, setFiltroLocal] = useState([]);
  const [filtroMarca, setFiltroMarca] = useState([]);
  const [dataIni, setDataIni] = useState(get29DaysBeforeYesterdayStr());
  const [dataFim, setDataFim] = useState(getYesterdayStr());
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [buscaInput]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [expandedId, setExpandedId] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'dias', direction: 'asc' });
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
    if (!estoqueRows.length) return [];
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

  const dadosProcessados = useMemo(() => {
    if (!vendasRows.length && !estoqueRows.length) return { linhas: [], diasPeriodo: 30, dataEstoque: "" };

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);
    const normDataEstoque = dataEstoque ? normalizeDateStr(dataEstoque) : "";

    let diasPeriodo = 30;
    if (dataIni && dataFim) {
      const start = new Date(dataIni);
      const end = new Date(dataFim);
      diasPeriodo = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diasPeriodo < 1) diasPeriodo = 1;
    }

    const skuToDesc = {};
    const skuToBrand = {};
    vendasRows.forEach(r => {
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
      const brand = r?.c?.[COL_VENDAS.MARCA]?.v || "";
      if (sku && brand) skuToBrand[sku] = brand.trim().toUpperCase();
    });
    estoqueRows.forEach(r => {
      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
      const brand = r?.c?.[COL_ESTOQUE.MARCA]?.v || "";
      if (sku && brand) skuToBrand[sku] = brand.trim().toUpperCase();
    });

    const agrupado = {};

    // 1. Processar Vendas
    vendasRows.forEach(r => {
      const dataStr = r?.c?.[COL_VENDAS.DATA]?.f;
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dataRow = new Date(`${y}-${m}-${d}`);

      const local = (r?.c?.[COL_VENDAS.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const skuPlat = r?.c?.[6]?.v || "";
      let desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      const qtd = Number(r?.c?.[COL_VENDAS.QTD]?.v) || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      desc = skuToDesc[sku] || desc;
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.includes(local)) return;

      const brand = (r?.c?.[COL_VENDAS.MARCA]?.v || skuToBrand[sku] || "").trim().toUpperCase();
      if (filtroMarca.length > 0 && !filtroMarca.includes(brand)) return;

      if (dataIni && dataRow < new Date(dataIni)) return;
      if (dataFim && dataRow > new Date(dataFim)) return;

      const parsed = parseProductDescription(desc, sku, local.includes("BUY CLOCK"), brand);
      const prodKey = `${parsed.baseTitle}|${local}`;

      if (!agrupado[prodKey]) {
        agrupado[prodKey] = { 
          descricao: parsed.baseTitle, 
          local, 
          total: 0, // Total Vendas
          cores: {}, 
          id: prodKey, 
          skusArr: [] 
        };
      }

      agrupado[prodKey].total += qtd;
      if (sku && !agrupado[prodKey].skusArr.includes(sku)) agrupado[prodKey].skusArr.push(sku);
      if (skuPlat && !agrupado[prodKey].skusArr.includes(skuPlat)) agrupado[prodKey].skusArr.push(skuPlat);

      const corKey = parsed.color;
      if (!agrupado[prodKey].cores[corKey]) {
        agrupado[prodKey].cores[corKey] = { cor: corKey, totalVendas: 0, totalEstoque: 0, totalCaminho: 0, variacoes: {} };
      }
      agrupado[prodKey].cores[corKey].totalVendas += qtd;

      const varKey = `${sku}|${parsed.size}`;
      if (!agrupado[prodKey].cores[corKey].variacoes[varKey]) {
        agrupado[prodKey].cores[corKey].variacoes[varKey] = { sku, skuPlat, size: parsed.size, vendas: 0, estoque: 0, caminho: 0 };
      }
      agrupado[prodKey].cores[corKey].variacoes[varKey].vendas += qtd;
    });

    // 2. Processar Estoque
    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
      if (normDataEstoque && normDataStr !== normDataEstoque) return;

      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const skuPlat = r?.c?.[7]?.v || "";
      let desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      const local = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      desc = skuToDesc[sku] || desc;
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.includes(local)) return;

      const brand = (r?.c?.[COL_ESTOQUE.MARCA]?.v || skuToBrand[sku] || "").trim().toUpperCase();
      if (filtroMarca.length > 0 && !filtroMarca.includes(brand)) return;

      const parsed = parseProductDescription(desc, sku, local.includes("BUY CLOCK"), brand);
      const prodKey = `${parsed.baseTitle}|${local}`;

      if (!agrupado[prodKey]) {
        agrupado[prodKey] = { 
          descricao: parsed.baseTitle, 
          local, 
          total: 0, 
          cores: {}, 
          id: prodKey, 
          skusArr: [] 
        };
      }

      if (sku && !agrupado[prodKey].skusArr.includes(sku)) agrupado[prodKey].skusArr.push(sku);
      if (skuPlat && !agrupado[prodKey].skusArr.includes(skuPlat)) agrupado[prodKey].skusArr.push(skuPlat);

      const corKey = parsed.color;
      if (!agrupado[prodKey].cores[corKey]) {
        agrupado[prodKey].cores[corKey] = { cor: corKey, totalVendas: 0, totalEstoque: 0, totalCaminho: 0, variacoes: {} };
      }
      agrupado[prodKey].cores[corKey].totalEstoque += qtd;

      const varKey = `${sku}|${parsed.size}`;
      if (!agrupado[prodKey].cores[corKey].variacoes[varKey]) {
        agrupado[prodKey].cores[corKey].variacoes[varKey] = { sku, skuPlat, size: parsed.size, vendas: 0, estoque: 0, caminho: 0 };
      }
      agrupado[prodKey].cores[corKey].variacoes[varKey].estoque += qtd;
    });

    // 3. Processar Caminho (Reposição)
    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      const skuPlat = r?.c?.[8]?.v || "";
      let desc = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      const local = String(r?.c?.[COL_CAMINHO.LOCAL]?.v ?? "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_CAMINHO.QTD]?.v) || 0;
      const status = String(r?.c?.[COL_CAMINHO.STATUS]?.v ?? "").toUpperCase().trim();

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (status === 'FINALIZADO') return;

      desc = skuToDesc[sku] || desc;
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      if (filtroLocal.length > 0 && !filtroLocal.includes(local)) return;

      const brand = (skuToBrand[sku] || "").trim().toUpperCase();
      if (filtroMarca.length > 0 && !filtroMarca.includes(brand)) return;

      const parsed = parseProductDescription(desc, sku, local.includes("BUY CLOCK"));
      const prodKey = `${parsed.baseTitle}|${local}`;

      if (!agrupado[prodKey]) {
        agrupado[prodKey] = { 
          descricao: parsed.baseTitle, 
          local, 
          total: 0, 
          cores: {}, 
          id: prodKey, 
          skusArr: [] 
        };
      }

      if (sku && !agrupado[prodKey].skusArr.includes(sku)) agrupado[prodKey].skusArr.push(sku);
      if (skuPlat && !agrupado[prodKey].skusArr.includes(skuPlat)) agrupado[prodKey].skusArr.push(skuPlat);

      const corKey = parsed.color;
      if (!agrupado[prodKey].cores[corKey]) {
        agrupado[prodKey].cores[corKey] = { cor: corKey, totalVendas: 0, totalEstoque: 0, totalCaminho: 0, variacoes: {} };
      }
      agrupado[prodKey].cores[corKey].totalCaminho += qtd;

      const varKey = `${sku}|${parsed.size}`;
      if (!agrupado[prodKey].cores[corKey].variacoes[varKey]) {
        agrupado[prodKey].cores[corKey].variacoes[varKey] = { sku, skuPlat, size: parsed.size, vendas: 0, estoque: 0, caminho: 0 };
      }
      agrupado[prodKey].cores[corKey].variacoes[varKey].caminho += qtd;
    });

    let linhas = Object.values(agrupado).map(l => {
      const media = diasPeriodo > 0 ? l.total / diasPeriodo : 0;
      const estoqueTotal = Object.values(l.cores).reduce((acc, c) => acc + c.totalEstoque, 0);
      const caminhoTotal = Object.values(l.cores).reduce((acc, c) => acc + c.totalCaminho, 0);
      const diasCobertos = media > 0 ? Math.round(estoqueTotal / media) : (estoqueTotal > 0 ? 9999 : 0);
      return { ...l, media, estoqueTotal, caminhoTotal, dias: diasCobertos };
    });

    // Filtro de Busca por Descrição ou SKU
    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      linhas = linhas.filter(l => {
        const descLower = (l.descricao || "").toLowerCase();
        const skusArray = l.skusArr.map(s => s.toLowerCase());
        
        return termos.every(termo => 
          descLower.includes(termo) || 
          skusArray.some(sku => sku.includes(termo))
        );
      });
    }

    // Filtro de Status
    if (filtroStatus !== 'todos') {
      if (filtroStatus === 'ruptura') linhas = linhas.filter(l => l.dias <= 29);
      else if (filtroStatus === 'saudavel') linhas = linhas.filter(l => l.dias >= 30 && l.dias <= 60);
      else if (filtroStatus === 'excesso') linhas = linhas.filter(l => l.dias > 60);
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

    return { linhas, diasPeriodo, dataEstoque, dataVendas };
  }, [vendasRows, estoqueRows, caminhoRows, filtroLocal, filtroMarca, dataIni, dataFim, busca, filtroStatus, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.linhas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type, mode = 'detalhado') => {
    if (mode === 'resumido') {
      const headers = ["Descrição", "Local", "Vendas", "Média/Dia", "Estoque", "A Caminho", "Dias Cobertos", "Status"];
      const exportData = dadosProcessados.linhas.map(item => {
        let statusStr = "Saudável";
        if (item.dias <= 29) statusStr = "Ruptura";
        else if (item.dias > 60) statusStr = "Excesso";
        if (item.dias === 9999) statusStr = "Excesso Absoluto";

        return [
          item.descricao,
          item.local,
          item.total,
          item.media.toFixed(2),
          item.estoqueTotal,
          item.caminhoTotal,
          item.dias === 9999 ? "∞" : item.dias,
          statusStr
        ];
      });
      handleExport(type, "Cobertura_Consolidada_Resumido", headers, exportData);
    } else {
      const headers = ["SKU Sênior", "SKU Plataforma", "Descrição", "Local", "Vendas", "Média/Dia", "Estoque", "A Caminho", "Dias Cobertos", "Status"];
      const exportData = [];
      
      dadosProcessados.linhas.forEach(item => {
        Object.values(item.cores).forEach(corObj => {
          Object.values(corObj.variacoes).forEach(v => {
            const media = dadosProcessados.diasPeriodo > 0 ? v.vendas / dadosProcessados.diasPeriodo : 0;
            const dias = media > 0 ? Math.round(v.estoque / media) : (v.estoque > 0 ? 9999 : 0);
            
            let statusStr = "Saudável";
            if (dias <= 29) statusStr = "Ruptura";
            else if (dias > 60) statusStr = "Excesso";
            if (dias === 9999) statusStr = "Excesso Absoluto";

            const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? ` ${corObj.cor}` : '';
            const sizePart = v.size && v.size !== 'U' ? ` Tam ${v.size}` : '';
            const fullDesc = `${item.descricao}${colorPart}${sizePart}`;

            exportData.push([
              v.sku,
              v.skuPlat || '',
              fullDesc,
              item.local,
              v.vendas,
              media.toFixed(2),
              v.estoque,
              v.caminho,
              dias === 9999 ? "∞" : dias,
              statusStr
            ]);
          });
        });
      });
      handleExport(type, "Cobertura_Consolidada_Detalhado", headers, exportData);
    }
  };

  // Ao mudar filtros, reseta a página
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filtroLocal, filtroMarca, dataIni, dataFim, busca, filtroStatus, selectedCompany]);

  if (loading) {
    return (
      <div className="header-main">
        <h1>Cobertura</h1>
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
          <h1>Cobertura de Estoque</h1>
          <p>Análise de dias cobertos baseado na média de vendas</p>
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
              value={buscaInput} 
              onChange={e => setBuscaInput(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>STATUS</label>
          <Select 
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'ruptura', label: 'Ruptura (≤ 29 dias)' },
              { value: 'saudavel', label: 'Saudável (30 - 60 dias)' },
              { value: 'excesso', label: 'Excesso (> 60 dias)' }
            ]}
            value={{
              'todos': { value: 'todos', label: 'Todos' },
              'ruptura': { value: 'ruptura', label: 'Ruptura (≤ 29 dias)' },
              'saudavel': { value: 'saudavel', label: 'Saudável (30 - 60 dias)' },
              'excesso': { value: 'excesso', label: 'Excesso (> 60 dias)' }
            }[filtroStatus]}
            onChange={opt => setFiltroStatus(opt.value)}
            isSearchable={false}
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '260px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL</label>
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
            key: 'descricao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição {getSortIcon('descricao')}</div>,
            rawLabel: 'Produto',
            render: (row) => <span style={{ fontWeight: 600 }}>{toTitleCase(row.descricao)}</span>,
            onSort: () => requestSort('descricao'),
          },
          {
            key: 'local',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local {getSortIcon('local')}</div>,
            rawLabel: 'Local',
            render: (row) => toTitleCase(row.local),
            onSort: () => requestSort('local'),
          },
          {
            key: 'total',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Vendas {getSortIcon('total')}</div>,
            rawLabel: 'Vendas',
            render: (row) => row.total.toLocaleString('pt-BR'),
            onSort: () => requestSort('total'),
          },
          {
            key: 'estoqueTotal',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Estoque {getSortIcon('estoqueTotal')}</div>,
            rawLabel: 'Estoque',
            render: (row) => row.estoqueTotal.toLocaleString('pt-BR'),
            onSort: () => requestSort('estoqueTotal'),
          },
          {
            key: 'caminhoTotal',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>A Caminho {getSortIcon('caminhoTotal')}</div>,
            rawLabel: 'A Caminho',
            render: (row) => row.caminhoTotal > 0 ? <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>+{row.caminhoTotal.toLocaleString('pt-BR')}</span> : '-',
            onSort: () => requestSort('caminhoTotal'),
          },
          {
            key: 'media',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Média Diária {getSortIcon('media')}</div>,
            rawLabel: 'Média/dia',
            render: (row) => row.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
            onSort: () => requestSort('media'),
          },
          {
            key: 'dias',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Dias Cobertos {getSortIcon('dias')}</div>,
            rawLabel: 'Dias Cobertos',
            render: (row) => {
              let badgeColor = '#64748b', badgeBg = '#f1f5f9';
              if (row.dias <= 29) { badgeColor = '#b91c1c'; badgeBg = '#fecaca'; }
              else if (row.dias > 60) { badgeColor = '#b45309'; badgeBg = '#fde68a'; }
              else { badgeColor = '#15803d'; badgeBg = '#bbf7d0'; }
              return <span style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{row.dias} dias</span>;
            },
            onSort: () => requestSort('dias'),
          },
        ]}
        rows={linhasPaginadas}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
        isExpanded={(row) => expandedId === row.id}
        getRowStyle={(row) => {
          if (row.dias <= 29) return { background: '#fee2e2' };
          if (row.dias > 60) return { background: '#fef3c7' };
          return { background: '#dcfce7' };
        }}
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
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>A Caminho</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Cobertura</th>
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
                      }).map((v) => {
                        const mediaSKU = dadosProcessados.diasPeriodo > 0 ? v.vendas / dadosProcessados.diasPeriodo : 0;
                        const coberturaSKU = mediaSKU > 0 ? Math.round(v.estoque / mediaSKU) : (v.estoque > 0 ? '∞' : 0);
                        
                        let badgeColor = '#64748b', badgeBg = '#f1f5f9';
                        if (typeof coberturaSKU === 'number') {
                          if (coberturaSKU <= 29) { badgeColor = '#b91c1c'; badgeBg = '#fecaca'; }
                          else if (coberturaSKU > 60) { badgeColor = '#b45309'; badgeBg = '#fde68a'; }
                          else { badgeColor = '#15803d'; badgeBg = '#bbf7d0'; }
                        } else if (coberturaSKU === '∞') {
                          badgeColor = '#b45309'; badgeBg = '#fde68a';
                        }

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
                              {v.vendas.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                              {v.estoque.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600 }}>
                              {v.caminho > 0 ? <span style={{ color: '#8b5cf6' }}>+{v.caminho} un</span> : '-'}
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                              <span style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>
                                {coberturaSKU} {typeof coberturaSKU === 'number' ? 'dias' : ''}
                              </span>
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
                      {corObj.totalEstoque} pçs
                    </span>
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
                    }).map((v, vIdx, arr) => {
                      const mediaSKU = dadosProcessados.diasPeriodo > 0 ? v.vendas / dadosProcessados.diasPeriodo : 0;
                      const coberturaSKU = mediaSKU > 0 ? Math.round(v.estoque / mediaSKU) : (v.estoque > 0 ? '∞' : 0);
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
                              {coberturaSKU} {typeof coberturaSKU === 'number' ? 'dias' : ''}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                            <span>Vendas: {v.vendas} pçs</span>
                            <span>Estoque: {v.estoque} pçs</span>
                            {v.caminho > 0 && <span style={{ color: '#8b5cf6' }}>Caminho: +{v.caminho}</span>}
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
