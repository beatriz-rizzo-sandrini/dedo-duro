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
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet, Filter, Printer } from 'lucide-react';
import { handleExport, generatePDFBlob } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import eanMapping from '../utils/eanMapping.json';
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

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const get29DaysBeforeYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const parsed = JSON.parse(jsonStr);
    return parsed.table.rows || [];
  } catch (err) {
    console.error("Erro ao fazer parse do JSON do Google Sheets", err);
    return [];
  }
}

async function fetchSandriniCasa() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/gviz/tq?tqx=out:json&gid=1674603035`;
    const res = await fetch(url);
    const text = await res.text();
    const rows = parseGoogleJSON(text);
    const map = {};
    rows.forEach(r => {
      if (!r || !r.c) return;
      const sku = String(r.c[3]?.v || '').trim().toUpperCase();
      const qtd = Number(r.c[5]?.v) || 0;
      if (sku) {
        map[sku] = (map[sku] || 0) + qtd;
      }
    });
    return map;
  } catch (err) {
    console.error("Erro ao carregar planilha Sandrini Casa:", err.message);
    return {};
  }
}

async function fetchBuyclockCasa() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/gviz/tq?tqx=out:json&sheet=%20INVENT%C3%81RIO_BUY`;
    const res = await fetch(url);
    const text = await res.text();
    const rows = parseGoogleJSON(text);
    const map = {};
    rows.forEach(r => {
      if (!r || !r.c) return;
      const sku = String(r.c[0]?.v || '').trim().toUpperCase();
      const qtd = Number(r.c[37]?.v) || 0;
      if (sku) {
        map[sku] = (map[sku] || 0) + qtd;
      }
    });
    return map;
  } catch (err) {
    console.error("Erro ao carregar planilha Buyclock Casa:", err.message);
    return {};
  }
}

export default function Sellout() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const vendasRows = data.vendas || [];
  const estoqueRows = data.estoque || [];

  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [buscaInput]);

  const [filtroMarca, setFiltroMarca] = useState([]);
  const [filtroLocal, setFiltroLocal] = useState([]);
  const [dataIni, setDataIni] = useState(get29DaysBeforeYesterdayStr());
  const [dataFim, setDataFim] = useState(getYesterdayStr());
  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'vendasFiltradas', direction: 'desc' });
  const [expandedId, setExpandedId] = useState(null);
  const [isExportPromptOpen, setIsExportPromptOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState('csv');
  const [pendingExportMode, setPendingExportMode] = useState('detalhado');

  // External stock states
  const [sandriniCasaMap, setSandriniCasaMap] = useState({});
  const [buyclockCasaMap, setBuyclockCasaMap] = useState({});
  const [loadingCasaMaps, setLoadingCasaMaps] = useState(true);

  // PDF choice states
  const [isPdfChoiceOpen, setIsPdfChoiceOpen] = useState(false);
  const [pendingPdfArgs, setPendingPdfArgs] = useState(null);
  const [pdfType, setPdfType] = useState('interno');
  const [pdfGenState, setPdfGenState] = useState('idle'); // 'idle' | 'generating' | 'ready'
  const [pdfFilename, setPdfFilename] = useState('');
  const [pdfDownloadCallback, setPdfDownloadCallback] = useState(null);

  const handleClosePdfModal = () => {
    setIsPdfChoiceOpen(false);
    setPdfGenState('idle');
    setPdfFilename('');
    setPdfDownloadCallback(null);
  };

  const handleDownloadPdf = () => {
    if (pdfDownloadCallback) {
      pdfDownloadCallback();
    }
    setIsPdfChoiceOpen(false);
    setPdfGenState('idle');
    setPdfFilename('');
    setPdfDownloadCallback(null);
  };

  // Fetch external stocks on mount
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoadingCasaMaps(true);
        const [sandrini, buyclock] = await Promise.all([
          fetchSandriniCasa(),
          fetchBuyclockCasa()
        ]);
        if (active) {
          setSandriniCasaMap(sandrini);
          setBuyclockCasaMap(buyclock);
        }
      } catch (err) {
        console.error("Erro ao carregar estoques externos:", err);
      } finally {
        if (active) {
          setLoadingCasaMaps(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [busca, filtroMarca, filtroLocal, selectedCompany, dataIni, dataFim]);

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
      linhasTudo: [],
      totalVendasPeriodo: 0,
      totalVendasPeriodoTudo: 0,
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

    // Filtros de data customizados
    const inicioTime = dataIni ? Date.UTC(
      Number(dataIni.split('-')[0]),
      Number(dataIni.split('-')[1]) - 1,
      Number(dataIni.split('-')[2])
    ) : 0;
    const fimTime = dataFim ? Date.UTC(
      Number(dataFim.split('-')[0]),
      Number(dataFim.split('-')[1]) - 1,
      Number(dataFim.split('-')[2]),
      23, 59, 59, 999
    ) : Infinity;

    // Calcular numDias com base no período selecionado
    let numDias = 30;
    if (dataIni && dataFim) {
      const d1 = Date.UTC(Number(dataIni.split('-')[0]), Number(dataIni.split('-')[1]) - 1, Number(dataIni.split('-')[2]));
      const d2 = Date.UTC(Number(dataFim.split('-')[0]), Number(dataFim.split('-')[1]) - 1, Number(dataFim.split('-')[2]));
      const diffMs = d2 - d1;
      numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

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

        const parsed = parseProductDescription(rawDesc, sku, local.includes("BUY CLOCK"));
        const prodKey = `${parsed.baseTitle}|${marca}`;

        if (!stats[prodKey]) {
          stats[prodKey] = {
            descricao: parsed.baseTitle,
            marca,
            vendas7d: 0,
            vendas15d: 0,
            vendas30d: 0,
            vendasFiltradas: 0,
            vendasPeriodo: 0,
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
          stats[prodKey].cores[corKey] = { cor: corKey, totalVendas: 0, vendasPeriodo: 0, totalEstoque: 0, variacoes: {} };
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
            vendasPeriodo: 0,
            totalSempre: 0, 
            estoque: 0,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            estoqueTotal: 0
          };
        }
        stats[prodKey].cores[corKey].variacoes[varKey].estoque += qtd;
        stats[prodKey].cores[corKey].variacoes[varKey].lojaEstoque = lojaEstoque;
        
        const isPlat = local.includes('MELI SP') || local.includes('MELI MG') || local.includes('AMAZON');
        if (isPlat) {
          stats[prodKey].cores[corKey].variacoes[varKey].estoquePlataforma += qtd;
        } else {
          stats[prodKey].cores[corKey].variacoes[varKey].estoqueCasa += qtd;
        }
        stats[prodKey].cores[corKey].variacoes[varKey].estoqueTotal += qtd;
      }
    });

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

      const parsed = parseProductDescription(desc, sku, local.includes("BUY CLOCK"));
      const prodKey = `${parsed.baseTitle}|${marca}`;

      if (!stats[prodKey]) {
        stats[prodKey] = { 
          descricao: parsed.baseTitle, 
          marca, 
          vendas7d: 0, 
          vendas15d: 0, 
          vendas30d: 0, 
          vendasFiltradas: 0,
          vendasPeriodo: 0,
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
        stats[prodKey].cores[corKey] = { cor: corKey, totalVendas: 0, vendasPeriodo: 0, totalEstoque: 0, variacoes: {} };
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
          vendasPeriodo: 0,
          totalSempre: 0, 
          estoque: 0,
          estoquePlataforma: 0,
          estoqueCasa: 0,
          estoqueTotal: 0
        };
      }
      stats[prodKey].cores[corKey].variacoes[varKey].lojaVenda = lojaVenda;

      if (dataVendaTime >= d7Time) stats[prodKey].cores[corKey].variacoes[varKey].vendas7d += qtd;
      if (dataVendaTime >= d15Time) stats[prodKey].cores[corKey].variacoes[varKey].vendas15d += qtd;
      if (dataVendaTime >= d30Time) stats[prodKey].cores[corKey].variacoes[varKey].vendas30d += qtd;
      stats[prodKey].cores[corKey].variacoes[varKey].totalSempre += qtd;

      // Check date filter for period (ignores brand/local selection)
      let considerarPeriodo = true;
      if (inicioTime && dataVendaTime < inicioTime) considerarPeriodo = false;
      if (fimTime && dataVendaTime > fimTime) considerarPeriodo = false;

      if (considerarPeriodo) {
        stats[prodKey].vendasPeriodo += qtd;
        stats[prodKey].cores[corKey].vendasPeriodo += qtd;
        stats[prodKey].cores[corKey].variacoes[varKey].vendasPeriodo += qtd;

        // Apply local & brand selection filters
        const passLocal = filtroLocal.length === 0 || filtroLocal.some(l => l.value === local);
        const passMarcaFiltro = filtroMarca.length === 0 || filtroMarca.some(m => m.value === marca);

        if (passLocal && passMarcaFiltro) {
          stats[prodKey].vendasFiltradas += qtd;
          stats[prodKey].cores[corKey].totalVendas += qtd;
          stats[prodKey].cores[corKey].variacoes[varKey].vendasFiltradas += qtd;
        }
      }
    });

    // Recalcular os estoques casa usando os mapas das planilhas externas
    Object.values(stats).forEach(prod => {
      let prodTotalEstoque = 0;
      Object.values(prod.cores).forEach(cor => {
        let corTotalEstoque = 0;
        Object.values(cor.variacoes).forEach(v => {
          const company = v.lojaEstoque || v.lojaVenda || 'SANDRINI';
          let qtyCasa = 0;
          const mapToUse = company === 'BUY CLOCK' ? buyclockCasaMap : sandriniCasaMap;
          
          const key1 = String(v.sku || '').toUpperCase().trim();
          const key2 = String(v.skuPlat || '').toUpperCase().trim();
          
          if (key1 && mapToUse[key1] !== undefined) {
            qtyCasa = mapToUse[key1];
          } else if (key2 && mapToUse[key2] !== undefined) {
            qtyCasa = mapToUse[key2];
          }
          
          v.estoqueCasa = qtyCasa;
          v.estoqueTotal = v.estoquePlataforma + v.estoqueCasa;
          v.estoque = v.estoqueTotal;
          
          corTotalEstoque += v.estoqueTotal;
        });
        cor.totalEstoque = corTotalEstoque;
        prodTotalEstoque += corTotalEstoque;
      });
      prod.totalEstoque = prodTotalEstoque;
    });

    const rows = Object.values(stats);

    // 3. Filtro de Busca (na tabela) para gerar filteredRows
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

    // 4. Calcular KPIs dinamicamente com base em filteredRows
    const totalGeralPeriodo = filteredRows.reduce((sum, r) => sum + r.vendasFiltradas, 0);
    const totalEstoque = filteredRows.reduce((sum, r) => sum + r.totalEstoque, 0);

    let skusComVenda = 0;
    let skusRuptura = 0;
    
    filteredRows.forEach(r => {
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

    const vmd = (totalGeralPeriodo / numDias).toFixed(1);

    // Recalcular Share dinâmico para os itens filtrados
    const finalFilteredRows = filteredRows.map(r => {
      const share = totalGeralPeriodo > 0 ? ((r.vendasFiltradas / totalGeralPeriodo) * 100).toFixed(1) : 0;
      return { ...r, share: Number(share) };
    });

    // 5. Agrupar dados de gráficos baseando-se estritamente em filteredRows
    const activeProdKeys = new Set(filteredRows.map(r => r.id));
    const vendasPorMarca = {};
    const vendasPorProduto = {};
    const vendasPorLocal = {};
    const vendasPorData = {};

    vendasRows.forEach(r => {
      const dataStr = r?.c?.[COL_VENDAS.DATA]?.f || "";
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dataVendaTime = Date.UTC(Number(y), Number(m) - 1, Number(d));
      
      const sku = String(r?.c?.[COL_VENDAS.SKU]?.v || "");
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      const local = String(r?.c?.[COL_VENDAS.LOCAL]?.v || "Sem Local").toUpperCase().trim();
      const marca = String(r?.c?.[COL_VENDAS.MARCA]?.v || "Sem Marca").toUpperCase().trim();
      const lojaVenda = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_VENDAS.QTD]?.v) || 0;

      if (selectedCompany !== 'TODAS' && lojaVenda !== selectedCompany) return;
      if (dataVendaTime > ontemTime) return;

      const parsed = parseProductDescription(desc, sku, local.includes("BUY CLOCK"));
      const prodKey = `${parsed.baseTitle}|${marca}`;

      if (activeProdKeys.has(prodKey)) {
        const passLocal = filtroLocal.length === 0 || filtroLocal.some(l => l.value === local);
        const passMarcaFiltro = filtroMarca.length === 0 || filtroMarca.some(m => m.value === marca);

        if (passLocal && passMarcaFiltro) {
          let considerar = true;
          if (inicioTime && dataVendaTime < inicioTime) considerar = false;
          if (fimTime && dataVendaTime > fimTime) considerar = false;

          if (considerar) {
            vendasPorMarca[marca] = (vendasPorMarca[marca] || 0) + qtd;
            vendasPorProduto[parsed.baseTitle] = (vendasPorProduto[parsed.baseTitle] || 0) + qtd;
            vendasPorLocal[local] = (vendasPorLocal[local] || 0) + qtd;
            vendasPorData[dataStr] = (vendasPorData[dataStr] || 0) + qtd;
          }
        }
      }
    });

    // 6. Preparar linhasTudo para a exportação de tudo (respeitando companhia e período)
    const linhasTudo = rows.filter(r => r.vendasPeriodo > 0 || r.totalEstoque > 0);
    const totalVendasPeriodoTudo = linhasTudo.reduce((sum, r) => sum + (r.vendasPeriodo || 0), 0);

    // Ordenação de finalFilteredRows
    if (sortConfig.key) {
      finalFilteredRows.sort((a, b) => {
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
    let chartType = 'doughnut';
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
        colors.push('#94a3b8');
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

    return { 
      linhas: finalFilteredRows, 
      linhasTudo,
      totalVendasPeriodo: totalGeralPeriodo,
      totalVendasPeriodoTudo,
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
  }, [vendasRows, estoqueRows, busca, filtroMarca, filtroLocal, selectedCompany, dataIni, dataFim, sortConfig, sandriniCasaMap, buyclockCasaMap]);

  const triggerExport = (type, mode = 'detalhado') => {
    setIsExportMenuOpen(false);
    
    if (type === 'pdf') {
      setPendingPdfArgs({ mode });
      setIsPdfChoiceOpen(true);
    } else {
      const hasActiveFilters = busca.trim() !== '' || filtroMarca.length > 0 || filtroLocal.length > 0;
      if (hasActiveFilters) {
        setPendingExportType(type);
        setPendingExportMode(mode);
        setIsExportPromptOpen(true);
      } else {
        executeExport(type, mode, false);
      }
    }
  };

  const handlePdfChoice = (typeOfPdf) => {
    setPdfType(typeOfPdf);
    setIsPdfChoiceOpen(false);
    
    const hasActiveFilters = busca.trim() !== '' || filtroMarca.length > 0 || filtroLocal.length > 0;
    if (hasActiveFilters) {
      setPendingExportType('pdf');
      setPendingExportMode(pendingPdfArgs.mode);
      setIsExportPromptOpen(true);
    } else {
      executeExport('pdf', pendingPdfArgs.mode, false, typeOfPdf);
    }
  };

  const executeExport = (type, mode, useFilters, selectedPdfType = pdfType) => {
    setIsExportPromptOpen(false);
    
    let rowsToExport = [];
    let totalSalesVal = 0;
    
    if (useFilters) {
      rowsToExport = dadosProcessados.linhas;
      totalSalesVal = dadosProcessados.totalVendasPeriodo;
    } else {
      rowsToExport = dadosProcessados.linhasTudo;
      totalSalesVal = dadosProcessados.totalVendasPeriodoTudo;
    }

    // Calculate numDias based on custom period
    let numDias = 30;
    if (dataIni && dataFim) {
      const d1 = Date.UTC(Number(dataIni.split('-')[0]), Number(dataIni.split('-')[1]) - 1, Number(dataIni.split('-')[2]));
      const d2 = Date.UTC(Number(dataFim.split('-')[0]), Number(dataFim.split('-')[1]) - 1, Number(dataFim.split('-')[2]));
      const diffMs = d2 - d1;
      numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    const periodStr = dataIni && dataFim ? `${dataIni.split('-').reverse().join('/')}_a_${dataFim.split('-').reverse().join('/')}` : 'Completo';
    const modeStr = mode === 'detalhado' ? 'Detalhado' : 'Resumido';
    const filterStr = useFilters ? 'Filtrado' : 'Completo';
    
    // Add brand detail to report title and filename if brand filter is active
    let titleDetail = '';
    if (filtroMarca && filtroMarca.length > 0) {
      const marcasStr = filtroMarca.map(m => m.label).join(', ');
      titleDetail = ` - ${marcasStr}`;
    }
    
    // Beautiful clean business title
    const reportTitle = `Sellout - ${modeStr}${titleDetail} (${filterStr})`;

    const options = {
      subTitle: `Análise de Performance de Sellout • Período: ${dataIni && dataFim ? `${dataIni.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}` : 'Completo'} • Canal/Filtro: ${selectedCompany}`,
      filters: [
        busca.trim() && `Busca: "${busca.trim()}"`,
        filtroMarca.length > 0 && `Marcas: ${filtroMarca.map(m => m.label).join(', ')}`,
        filtroLocal.length > 0 && `Locais: ${filtroLocal.map(l => l.label).join(', ')}`
      ].filter(Boolean),
      kpis: [
        { label: "TOTAL VENDIDO", value: totalSalesVal.toLocaleString('pt-BR'), sub: "peças vendidas" },
        { label: "VMD", value: (totalSalesVal / numDias).toFixed(1), sub: "venda média diária" },
        { label: "SKUS COM VENDA", value: String(dadosProcessados.skusComVenda), sub: "itens únicos" },
        { label: "RUPTURA", value: String(dadosProcessados.skusRuptura), sub: "itens sem estoque" }
      ]
    };

    // Helper to sort variation rows by size during exports
    const sortVariationsBySize = (vars) => {
      const sizeWeights = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'XG': 6, 'XXG': 7, 'U': 99, 'ÚNICO': 99, 'UNICO': 99 };
      return [...vars].sort((a, b) => {
        const aVal = String(a.size || '').toUpperCase().trim();
        const bVal = String(b.size || '').toUpperCase().trim();
        if (sizeWeights[aVal] !== undefined && sizeWeights[bVal] !== undefined) return sizeWeights[aVal] - sizeWeights[bVal];
        if (sizeWeights[aVal] !== undefined) return -1;
        if (sizeWeights[bVal] !== undefined) return 1;
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return aVal.localeCompare(bVal);
      });
    };

    let headers = [];
    let exportData = [];

    if (mode === 'resumido') {
      headers = ["Descrição", "Marca", "Vendas (Período)", "Estoque", "Share %"];
      exportData = rowsToExport.map(item => {
        const sales = useFilters ? item.vendasFiltradas : (item.vendasPeriodo || 0);
        const share = totalSalesVal > 0 ? ((sales / totalSalesVal) * 100).toFixed(1) : 0;
        return [
          item.descricao,
          item.marca,
          sales,
          item.totalEstoque,
          share + "%"
        ];
      });
    } else {
      if (type === 'pdf') {
        const isSupplier = selectedPdfType === 'fornecedor';
        headers = isSupplier
          ? ["Descrição / SKU", "Marca / EAN", "Vendas", "Estoque Total"]
          : ["Descrição / SKU", "Marca / EAN", "Vendas", "Estoque Plat", "Estoque Casa", "Estoque Total", "Cobertura"];
        
        rowsToExport.forEach(item => {
          const parentSales = useFilters ? item.vendasFiltradas : (item.vendasPeriodo || 0);
          
          if (isSupplier) {
            exportData.push([
              item.descricao,
              item.marca,
              parentSales,
              item.totalEstoque
            ]);
          } else {
            exportData.push([
              item.descricao,
              item.marca,
              parentSales,
              '-',
              '-',
              item.totalEstoque,
              '-'
            ]);
          }
          
          Object.values(item.cores).forEach(corObj => {
            const sortedVariations = sortVariationsBySize(Object.values(corObj.variacoes));
            sortedVariations.forEach(v => {
              const sales = useFilters ? v.vendasFiltradas : (v.vendasPeriodo || 0);
              if (!useFilters && sales === 0 && v.estoqueTotal === 0) return;
              
              const vmdSKU = numDias > 0 ? sales / numDias : 0;
              const coberturaSKU = vmdSKU > 0 ? Math.round(v.estoqueTotal / vmdSKU) : (v.estoqueTotal > 0 ? '∞' : 0);
              
              const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? `${corObj.cor}` : 'SEM COR';
              const sizePart = v.size && v.size !== 'U' ? `Tam ${v.size}` : 'Tamanho Único';
              
              const descStr = `     - ${colorPart} - ${sizePart}`;
              const eanVal = eanMapping[String(v.sku).toUpperCase().trim()] || v.sku;
              const skuStr = `${eanVal}`;

              if (isSupplier) {
                exportData.push([
                  descStr,
                  skuStr,
                  sales,
                  v.estoqueTotal
                ]);
              } else {
                exportData.push([
                  descStr,
                  skuStr,
                  sales,
                  v.estoquePlataforma,
                  v.estoqueCasa,
                  v.estoqueTotal,
                  coberturaSKU === '∞' ? '∞' : `${coberturaSKU} dias`
                ]);
              }
            });
          });
        });
      } else {
        // Flat layout for Excel/CSV (easy to filter/analyze in Excel)
        headers = ["SKU Sênior", "EAN", "Descrição", "Marca", "Vendas (Período)", "Estoque Plataforma", "Estoque Casa", "Estoque Total", "Cobertura"];
        
        rowsToExport.forEach(item => {
          Object.values(item.cores).forEach(corObj => {
            const sortedVariations = sortVariationsBySize(Object.values(corObj.variacoes));
            sortedVariations.forEach(v => {
              const sales = useFilters ? v.vendasFiltradas : (v.vendasPeriodo || 0);
              if (!useFilters && sales === 0 && v.estoqueTotal === 0) return;
              
              const vmdSKU = numDias > 0 ? sales / numDias : 0;
              const coberturaSKU = vmdSKU > 0 ? Math.round(v.estoqueTotal / vmdSKU) : (v.estoqueTotal > 0 ? '∞' : 0);
              
              const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? ` ${corObj.cor}` : '';
              const sizePart = v.size && v.size !== 'U' ? ` Tam ${v.size}` : '';
              const fullDesc = `${item.descricao}${colorPart}${sizePart}`;

              exportData.push([
                v.sku,
                eanMapping[String(v.sku).toUpperCase().trim()] || '-',
                fullDesc,
                item.marca,
                sales,
                v.estoquePlataforma,
                v.estoqueCasa,
                v.estoqueTotal,
                coberturaSKU === '∞' ? '∞' : `${coberturaSKU} dias`
              ]);
            });
          });
        });
      }
    }

    if (type === 'pdf') {
      setIsPdfChoiceOpen(true);
      setPdfGenState('generating');
      
      setTimeout(() => {
        try {
          const { doc, filename } = generatePDFBlob(reportTitle, headers, exportData, options);
          
          setPdfDownloadCallback(() => () => {
            doc.save(filename);
          });
          setPdfFilename(filename);
          setPdfGenState('ready');
        } catch (err) {
          console.error("Erro ao gerar PDF:", err);
          setPdfGenState('idle');
          setIsPdfChoiceOpen(false);
          alert("Erro ao gerar o arquivo PDF. Tente filtrar os dados para reduzir o tamanho.");
        }
      }, 100);
    } else {
      handleExport(type, reportTitle, headers, exportData, options);
    }
  };

  const isPageLoading = loading || loadingCasaMaps;

  if (isPageLoading) {
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
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-padrao" onClick={() => window.print()} style={{ background: '#f8fafc', color: '#475569' }}>
            <Printer size={18} /> Imprimir Tela
          </button>
          
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
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => triggerExport('csv', 'detalhado')}>
                    <FileText size={14} color="#64748b" /> CSV
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => triggerExport('xlsx', 'detalhado')}>
                    <FileSpreadsheet size={14} color="#10b981" /> Excel (XLSX)
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => triggerExport('pdf', 'detalhado')}>
                    <FileText size={14} color="#ef4444" /> PDF
                  </div>
                  <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>EXPORTAR RESUMIDO (MODELOS)</div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => triggerExport('csv', 'resumido')}>
                    <FileText size={14} color="#64748b" /> CSV
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }} onClick={() => triggerExport('xlsx', 'resumido')}>
                    <FileSpreadsheet size={14} color="#10b981" /> Excel (XLSX)
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} onClick={() => triggerExport('pdf', 'resumido')}>
                    <FileText size={14} color="#ef4444" /> PDF
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
              value={buscaInput} 
              onChange={e => setBuscaInput(e.target.value)} 
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Data Inicial</label>
          <input 
            type="date" 
            className="input-padrao" 
            style={{ borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px', padding: '10px 14px', outline: 'none' }} 
            value={dataIni} 
            onChange={e => setDataIni(e.target.value)} 
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Data Final</label>
          <input 
            type="date" 
            className="input-padrao" 
            style={{ borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px', padding: '10px 14px', outline: 'none' }} 
            value={dataFim} 
            onChange={e => setDataFim(e.target.value)} 
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

      <div className="charts-print-hide" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
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
        renderExpandedDesktop={(item) => {
          // Calculate numDias based on period selection
          let numDias = 30;
          if (dataIni && dataFim) {
            const d1 = Date.UTC(Number(dataIni.split('-')[0]), Number(dataIni.split('-')[1]) - 1, Number(dataIni.split('-')[2]));
            const d2 = Date.UTC(Number(dataFim.split('-')[0]), Number(dataFim.split('-')[1]) - 1, Number(dataFim.split('-')[2]));
            const diffMs = d2 - d1;
            numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
          }

          return (
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
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>EAN</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '150px', background: '#fafafa' }}>Estoque Plataforma</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '150px', background: '#fafafa' }}>Estoque Casa</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '150px', background: '#fafafa' }}>Estoque Total</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Vendas</th>
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
                          const vmdSKU = numDias > 0 ? v.vendasFiltradas / numDias : 0;
                          const coberturaSKU = vmdSKU > 0 ? Math.round(v.estoqueTotal / vmdSKU) : (v.estoqueTotal > 0 ? '∞' : 0);
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
                              <td style={{ padding: '10px 20px', color: '#64748b', fontSize: '13px' }}>
                                {eanMapping[String(v.sku).toUpperCase().trim()] || '-'}
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                {v.estoquePlataforma.toLocaleString('pt-BR')} un
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                {v.estoqueCasa.toLocaleString('pt-BR')} un
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: v.estoqueTotal === 0 ? '#ef4444' : '#0f172a' }}>
                                {v.estoqueTotal.toLocaleString('pt-BR')} un
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                {v.vendasFiltradas.toLocaleString('pt-BR')} un
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                                {coberturaSKU} {typeof coberturaSKU === 'number' ? 'dias' : ''}
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
          );
        }}
        renderExpanded={(item) => {
          // Calculate numDias based on period selection
          let numDias = 30;
          if (dataIni && dataFim) {
            const d1 = Date.UTC(Number(dataIni.split('-')[0]), Number(dataIni.split('-')[1]) - 1, Number(dataIni.split('-')[2]));
            const d2 = Date.UTC(Number(dataFim.split('-')[0]), Number(dataFim.split('-')[1]) - 1, Number(dataFim.split('-')[2]));
            const diffMs = d2 - d1;
            numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
          }

          return (
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
                        const vmdSKU = numDias > 0 ? v.vendasFiltradas / numDias : 0;
                        const coberturaSKU = vmdSKU > 0 ? Math.round(v.estoqueTotal / vmdSKU) : (v.estoqueTotal > 0 ? '∞' : 0);
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
                                Cob: {coberturaSKU} {typeof coberturaSKU === 'number' ? 'd' : ''}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                              <span>EAN: {eanMapping[String(v.sku).toUpperCase().trim()] || '-'}</span>
                              <span>Vendas: {v.vendasFiltradas} un</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                              <span>Est. Plat: {v.estoquePlataforma}</span>
                              <span>Est. Casa: {v.estoqueCasa}</span>
                              <span style={{ fontWeight: 600, color: v.estoqueTotal === 0 ? '#ef4444' : '#1e293b' }}>Total: {v.estoqueTotal}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        }}
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

      {/* Choice Modal for Exporting with Active Filters */}
      <AnimatePresence>
        {isExportPromptOpen && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              zIndex: 9999, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.40)', // modern slate dark overlay
              backdropFilter: 'blur(8px)', // glassmorphism blur
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              style={{
                width: '90%',
                maxWidth: '480px',
                background: 'white',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              {/* Header Icon & Title */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '16px', 
                    background: '#eff6ff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid #dbeafe'
                  }}
                >
                  <Filter size={24} color="#3b82f6" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                    Exportar Relatório
                  </h3>
                  <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b', lineHeight: '20px' }}>
                    Detectamos que você possui filtros ativados nesta tela. Como deseja exportar seus dados?
                  </p>
                </div>
              </div>

              {/* Active Filters Summary Chips */}
              <div 
                style={{ 
                  background: '#f8fafc', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  border: '1px solid #f1f5f9', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px' 
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Filtros Ativos:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {busca.trim() !== '' && (
                    <span style={{ fontSize: '12px', background: '#eff6ff', border: '1px solid #dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      Busca: "{busca.trim()}"
                    </span>
                  )}
                  {filtroMarca.length > 0 && (
                    <span style={{ fontSize: '12px', background: '#f5f3ff', border: '1px solid #e0e7ff', color: '#6d28d9', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      Marcas ({filtroMarca.length})
                    </span>
                  )}
                  {filtroLocal.length > 0 && (
                    <span style={{ fontSize: '12px', background: '#ecfdf5', border: '1px solid #d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                      Locais ({filtroLocal.length})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={() => executeExport(pendingExportType, pendingExportMode, true)}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <Filter size={16} /> Exportar Apenas Filtrados ({dadosProcessados.linhas.length} itens)
                </button>
                <button 
                  onClick={() => executeExport(pendingExportType, pendingExportMode, false)}
                  style={{
                    background: '#1e293b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <Download size={16} /> Exportar Estoque Completo ({dadosProcessados.linhasTudo.length} itens)
                </button>
                <button 
                  onClick={() => setIsExportPromptOpen(false)}
                  style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Choice Modal for PDF Export: Internal Use vs. Supplier */}
      <AnimatePresence>
        {isPdfChoiceOpen && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              zIndex: 9999, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.40)', // modern slate dark overlay
              backdropFilter: 'blur(8px)', // glassmorphism blur
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              style={{
                width: '90%',
                maxWidth: '480px',
                background: 'white',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              {pdfGenState === 'idle' && (
                <>
                  {/* Header Icon & Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                    <div 
                      style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '16px', 
                        background: '#f1f5f9', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <FileText size={24} color="#ef4444" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                        Tipo de PDF para Exportação
                      </h3>
                      <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b', lineHeight: '20px' }}>
                        Selecione o destinatário deste PDF para ajustar a visibilidade das colunas.
                      </p>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>
                      <strong>Uso Interno:</strong> Exibe todas as colunas (Estoque Plataforma, Estoque Casa, Estoque Total e Cobertura).
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>
                      <strong>Fornecedor:</strong> Oculta Estoque Plataforma, Estoque Casa e Cobertura (exibe apenas o Estoque Total).
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => handlePdfChoice('interno')}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '14px 20px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      Uso Interno
                    </button>
                    <button 
                      onClick={() => handlePdfChoice('fornecedor')}
                      style={{
                        background: '#1e293b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '14px 20px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      Fornecedor
                    </button>
                    <button 
                      onClick={handleClosePdfModal}
                      style={{
                        background: 'transparent',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}

              {pdfGenState === 'generating' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div 
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        border: '4px solid #f1f5f9',
                        borderTopColor: '#3b82f6',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                      Gerando PDF...
                    </h3>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b', lineHeight: '20px' }}>
                      Processando dados e formatando tabelas. Isso pode levar alguns segundos dependendo da quantidade de itens.
                    </p>
                  </div>
                </div>
              )}

              {pdfGenState === 'ready' && (
                <>
                  {/* Header Icon & Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                    <div 
                      style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '16px', 
                        background: '#ecfdf5', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #a7f3d0'
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                        Relatório PDF Pronto!
                      </h3>
                      <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b', lineHeight: '20px' }}>
                        O PDF foi gerado com sucesso e está pronto para download.
                      </p>
                    </div>
                  </div>

                  {/* File Metadata Box */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', textAlign: 'left', width: '100%' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {pdfFilename}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Pronto para salvar localmente
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={handleDownloadPdf}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '14px 20px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <Download size={16} /> Baixar PDF
                    </button>
                    <button 
                      onClick={handleClosePdfModal}
                      style={{
                        background: 'transparent',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
