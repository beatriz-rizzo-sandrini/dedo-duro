import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, ChevronLeft, ChevronRight, Package, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet, Building2, Cloud, Truck, DollarSign, Tags, Banknote, Palette, LayoutGrid } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { getLatestDates, normalizeDateStr } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import * as SheetCols from '../utils/sheetColumns';

// Utility to normalize SKUs by stripping suffixes
function normalizeSku(sku) {
  return String(sku).replace(/(_FBA|_FULL|-FBA|-FULL)$/i, '');
}
const { COL_ESTOQUE, COL_VENDAS, COL_CAMINHO } = SheetCols;
import MobileTable from '../components/MobileTable';
import { parseProductDescription, normalizeBrand } from '../utils/productParser';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Estoque() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const estoqueRows = data.estoque || [];
  const vendasRows = data.vendas || [];

  const [filtroLocal, setFiltroLocal] = useState([]);
  const [filtroMarca, setFiltroMarca] = useState([]);
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [buscaInput]);

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
    if (!estoqueRows) return [];
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
    if (!estoqueRows) return [];
    const setMarcas = new Set();
    const { dataEstoque } = getLatestDates(estoqueRows, vendasRows);
    const normDataEstoque = dataEstoque ? normalizeDateStr(dataEstoque) : "";

    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
      if (normDataEstoque && normDataStr !== normDataEstoque) return;

      const m = r?.c?.[COL_ESTOQUE.MARCA]?.v || "";
      const l = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      if (m) setMarcas.add(m.trim().toUpperCase());
    });
    return Array.from(setMarcas).sort();
  }, [estoqueRows, vendasRows, selectedCompany]);

  const dadosProcessados = useMemo(() => {
    if (!estoqueRows) return { linhas: [], totalGeral: 0, totalCustoGeral: 0, dataEstoque: "", dataVendas: "" };

    const sandriniCasaMap = data.sandriniCasaMap || {};
    const buyclockCasaMap = data.buyclockCasaMap || {};

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);
    const normDataEstoque = dataEstoque ? normalizeDateStr(dataEstoque) : "";

    const skuToDesc = {};
    estoqueRows.forEach(r => {
      const sku = normalizeSku(r?.c?.[COL_ESTOQUE.SKU]?.v || "");
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });
    vendasRows.forEach(r => {
      const sku = normalizeSku(r?.c?.[COL_VENDAS.SKU]?.v || "");
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      if (sku && desc && !skuToDesc[sku]) skuToDesc[sku] = desc;
    });
    const caminhoRows = data.caminho || [];
    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      const desc = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      if (sku && desc && !skuToDesc[sku]) skuToDesc[sku] = desc;
    });

    const stats = {};
    const setMarcas = new Set();
    const setLocais = new Set();

    // 1. Processar estoque principal da base
    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      const normDataStr = dataStr ? normalizeDateStr(dataStr) : "";
      if (normDataEstoque && normDataStr !== normDataEstoque) return;

      const sku = normalizeSku(r?.c?.[COL_ESTOQUE.SKU]?.v || "");
      const skuPlat = r?.c?.[7]?.v || "";
      if (
        sku === 'TENISNEWBB80CBRPTOT38' || sku === 'TENISNEWBB80CBRPTOT41' || sku === 'AD000IF4135ABAJCN430031' ||
        skuPlat === 'TENISNEWBB80CBRPTOT38' || skuPlat === 'TENISNEWBB80CBRPTOT41' || skuPlat === 'AD000IF4135ABAJCN430031'
      ) {
        return;
      }

      const local = String(r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase();
      const lojaEstoque = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;
      const valorUnitario = Number(r?.c?.[COL_ESTOQUE.VALOR]?.v) || 0;
      const rawMarca = String(r?.c?.[COL_ESTOQUE.MARCA]?.v || "Sem Marca").trim();
      const rawDesc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";

      if (sku) {
        if (selectedCompany !== 'TODAS' && lojaEstoque !== selectedCompany) return;

        const parsed = parseProductDescription(rawDesc || skuToDesc[sku] || `SKU: ${sku}`, sku, local.includes("BUY CLOCK"), rawMarca);
        const marca = parsed.brand;
        const prodKey = `${parsed.baseTitle}|${marca}`;

        if (marca) setMarcas.add(marca);
        if (local) setLocais.add(local);

        if (!stats[prodKey]) {
          stats[prodKey] = {
            descricao: parsed.baseTitle,
            marca,
            total: 0,
            custoTotal: 0,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            cores: {},
            id: prodKey,
            skusArr: []
          };
        }

        if (sku && !stats[prodKey].skusArr.includes(sku)) stats[prodKey].skusArr.push(sku);
        if (skuPlat && !stats[prodKey].skusArr.includes(skuPlat)) stats[prodKey].skusArr.push(skuPlat);

        const corKey = parsed.color;
        if (!stats[prodKey].cores[corKey]) {
          stats[prodKey].cores[corKey] = { cor: corKey, total: 0, custoTotal: 0, estoquePlataforma: 0, estoqueCasa: 0, expedicao: 0, variacoes: {} };
        }

        const varKey = `${sku}|${parsed.size}`;
        if (!stats[prodKey].cores[corKey].variacoes[varKey]) {
          stats[prodKey].cores[corKey].variacoes[varKey] = {
            sku,
            skuPlat,
            size: parsed.size,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            total: 0,
            valorUnitario,
            custoTotal: 0
          };
        }

        const isPlat = local.includes('MELI') || local.includes('AMAZON') || local.includes('MAGALU') || local.includes('SHOPEE') || local.includes('DAFITI');
        if (isPlat) {
          stats[prodKey].cores[corKey].variacoes[varKey].estoquePlataforma += qtd;
        }

        if (valorUnitario > 0) {
          stats[prodKey].cores[corKey].variacoes[varKey].valorUnitario = valorUnitario;
        }

        stats[prodKey].cores[corKey].variacoes[varKey].lojaEstoque = lojaEstoque;
      }
    });

    // 2. Processar itens das planilhas de casa para garantir que apareçam
    if (selectedCompany === 'BUY CLOCK' || selectedCompany === 'TODAS') {
      Object.entries(buyclockCasaMap).forEach(([sku, info]) => {
        const totalCD = (info.estoqueCasa || 0) + (info.expedicao || 0);
        if (totalCD === 0) return;
        const marca = info.brand || 'BUY CLOCK';
        if (marca) setMarcas.add(marca);
        if (filtroMarca && filtroMarca !== 'Todas' && marca !== filtroMarca) return;

        const prodKey = `${info.desc || 'Produto S/ Cadastro'}|${marca}`;
        if (!stats[prodKey]) stats[prodKey] = { descricao: info.desc || 'Produto S/ Cadastro', marca, cores: {} };
        if (!stats[prodKey].cores['PADRAO']) stats[prodKey].cores['PADRAO'] = { cor: 'PADRAO', variacoes: {} };
        if (!stats[prodKey].cores['PADRAO'].variacoes[sku]) {
          stats[prodKey].cores['PADRAO'].variacoes[sku] = {
            tamanho: '', sku, skuPlat: '', estoquePlataforma: 0, valorUnitario: info.cost || 0, vendas: 0, lojaEstoque: 'BUY CLOCK'
          };
        }
      });
    }

    if (selectedCompany === 'SANDRINI' || selectedCompany === 'TODAS') {
      Object.entries(sandriniCasaMap).forEach(([sku, info]) => {
        const totalCD = (info.estoqueCasa || 0) + (info.expedicao || 0);
        if (totalCD === 0) return;
        const marca = info.brand || 'SANDRINI';
        if (marca) setMarcas.add(marca);
        if (filtroMarca && filtroMarca !== 'Todas' && marca !== filtroMarca) return;

        const prodKey = `${info.desc || 'Produto S/ Cadastro'}|${marca}`;
        if (!stats[prodKey]) stats[prodKey] = { descricao: info.desc || 'Produto S/ Cadastro', marca, cores: {} };
        if (!stats[prodKey].cores['PADRAO']) stats[prodKey].cores['PADRAO'] = { cor: 'PADRAO', variacoes: {} };
        if (!stats[prodKey].cores['PADRAO'].variacoes[sku]) {
          stats[prodKey].cores['PADRAO'].variacoes[sku] = {
            tamanho: '', sku, skuPlat: '', estoquePlataforma: 0, valorUnitario: info.cost || 0, vendas: 0, lojaEstoque: 'SANDRINI'
          };
        }
      });
    }

    // 3. Incorporar as vendas das planilhas de casa para garantir que apareçam
    if (selectedCompany === 'BUY CLOCK' || selectedCompany === 'TODAS') {
      Object.entries(buyclockCasaMap).forEach(([sku, info]) => {
        const totalCD = (info.estoqueCasa || 0) + (info.expedicao || 0);
        if (totalCD <= 0) return;

        const brand = String(info.brand || 'Sem Marca').toUpperCase().trim();
        if (brand) setMarcas.add(brand);

        const parsed = parseProductDescription(info.desc || skuToDesc[sku] || '', sku, true, brand);
        const prodKey = `${parsed.baseTitle}|${brand}`;

        if (!stats[prodKey]) {
          stats[prodKey] = {
            descricao: parsed.baseTitle,
            marca: brand,
            total: 0,
            custoTotal: 0,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            cores: {},
            id: prodKey,
            skusArr: []
          };
        }

        if (!stats[prodKey].skusArr.includes(sku)) {
          stats[prodKey].skusArr.push(sku);
        }

        const corKey = parsed.color;
        if (!stats[prodKey].cores[corKey]) {
          stats[prodKey].cores[corKey] = {
            cor: corKey,
            total: 0,
            custoTotal: 0,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            variacoes: {}
          };
        }

        const varKey = `${sku}|${parsed.size}`;
        if (!stats[prodKey].cores[corKey].variacoes[varKey]) {
          stats[prodKey].cores[corKey].variacoes[varKey] = {
            sku,
            skuPlat: '',
            size: parsed.size,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            total: 0,
            valorUnitario: info.cost || 0,
            custoTotal: 0
          };
        }

        stats[prodKey].cores[corKey].variacoes[varKey].lojaEstoque = 'BUY CLOCK';
        if (info.cost > 0) {
          stats[prodKey].cores[corKey].variacoes[varKey].valorUnitario = info.cost;
        }
      });
    }

    if (selectedCompany === 'SANDRINI' || selectedCompany === 'TODAS') {
      Object.entries(sandriniCasaMap).forEach(([sku, info]) => {
        const totalCD = (info.estoqueCasa || 0) + (info.expedicao || 0);
        if (totalCD <= 0) return;

        const brand = normalizeBrand(info.brand || '', sku, info.desc || '');
        if (brand) setMarcas.add(brand);

        const parsed = parseProductDescription(info.desc || skuToDesc[sku] || '', sku, false, brand);
        const prodKey = `${parsed.baseTitle}|${brand}`;

        if (!stats[prodKey]) {
          stats[prodKey] = {
            descricao: parsed.baseTitle,
            marca: brand,
            total: 0,
            custoTotal: 0,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            cores: {},
            id: prodKey,
            skusArr: []
          };
        }

        if (!stats[prodKey].skusArr.includes(sku)) {
          stats[prodKey].skusArr.push(sku);
        }

        const corKey = parsed.color;
        if (!stats[prodKey].cores[corKey]) {
          stats[prodKey].cores[corKey] = {
            cor: corKey,
            total: 0,
            custoTotal: 0,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            variacoes: {}
          };
        }

        const varKey = `${sku}|${parsed.size}`;
        if (!stats[prodKey].cores[corKey].variacoes[varKey]) {
          stats[prodKey].cores[corKey].variacoes[varKey] = {
            sku,
            skuPlat: '',
            size: parsed.size,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            total: 0,
            valorUnitario: info.cost || 0,
            custoTotal: 0
          };
        }

        stats[prodKey].cores[corKey].variacoes[varKey].lojaEstoque = 'SANDRINI';
        if (info.cost > 0) {
          stats[prodKey].cores[corKey].variacoes[varKey].valorUnitario = info.cost;
        }
      });
    }

    // 4. Recalcular os estoques e custos casa usando os mapas das planilhas externas
    const usedExternalSkus = new Set();
    Object.values(stats).forEach(prod => {
      let prodPlatEstoque = 0;
      let prodCasaEstoque = 0;
      let prodExpedicao = 0;
      let prodTotalEstoque = 0;
      let prodCustoTotal = 0;

      Object.values(prod.cores).forEach(cor => {
        let corPlatEstoque = 0;
        let corCasaEstoque = 0;
        let corExpedicao = 0;
        let corTotalEstoque = 0;
        let corCustoTotal = 0;

        Object.values(cor.variacoes).forEach(v => {
          const company = v.lojaEstoque || 'SANDRINI';
          let qtyCasa = 0;
          let qtyExpedicao = 0;
          const mapToUse = company === 'BUY CLOCK' ? buyclockCasaMap : sandriniCasaMap;

          const key1 = String(v.sku || '').toUpperCase().trim();
          const key2 = String(v.skuPlat || '').toUpperCase().trim();

          const translateInvertedSku = (skuStr) => {
            if (!skuStr) return skuStr;
            const s = skuStr.toUpperCase().trim();
            if (s.startsWith('NB001323396AJCNCN')) {
              const size = s.substring(17, 19);
              const suffixMap = { '38': '610', '39': '611', '40': '612', '41': '613', '42': '614', '43': '615' };
              const suffix = suffixMap[size] || '';
              return suffix ? `NB000GM500V2BOAWCN${size}${suffix}` : s;
            } else if (s.startsWith('NB000GM500V2BOAWCN')) {
              const size = s.substring(18, 20);
              const suffixMap = { '39': '0333', '40': '0334', '41': '0335', '42': '0336', '43': '0337', '44': '0338' };
              const suffix = suffixMap[size] || '';
              return suffix ? `NB001323396AJCNCN${size}${suffix}` : s;
            }
            return skuStr;
          };

          const searchKey1 = translateInvertedSku(key1);
          const searchKey2 = translateInvertedSku(key2);

          let matchedKey = null;
          if (searchKey1 && mapToUse[searchKey1] !== undefined) matchedKey = searchKey1;
          else if (searchKey2 && mapToUse[searchKey2] !== undefined) matchedKey = searchKey2;

          if (matchedKey) {
            if (!usedExternalSkus.has(matchedKey)) {
              qtyCasa = mapToUse[matchedKey].estoqueCasa || 0;
              qtyExpedicao = mapToUse[matchedKey].expedicao || 0;
              usedExternalSkus.add(matchedKey);
            }
            if (mapToUse[matchedKey].cost > 0) {
              v.valorUnitario = mapToUse[matchedKey].cost;
            }
          }

          v.estoqueCasa = qtyCasa;
          v.expedicao = qtyExpedicao;
          v.total = v.estoquePlataforma + qtyCasa + qtyExpedicao;

          v.custoPlataforma = v.estoquePlataforma * v.valorUnitario;
          v.custoCasa = qtyCasa * v.valorUnitario;
          v.custoExpedicao = qtyExpedicao * v.valorUnitario;
          v.custoTotal = v.custoPlataforma + v.custoCasa + v.custoExpedicao;

          corPlatEstoque += v.estoquePlataforma;
          corCasaEstoque += v.estoqueCasa;
          corExpedicao += v.expedicao;
          corTotalEstoque += v.total;
          corCustoTotal += v.custoTotal;
          cor.custoPlataforma = (cor.custoPlataforma || 0) + v.custoPlataforma;
          cor.custoCasa = (cor.custoCasa || 0) + v.custoCasa;
          cor.custoExpedicao = (cor.custoExpedicao || 0) + v.custoExpedicao;
        });

        cor.estoquePlataforma = corPlatEstoque;
        cor.estoqueCasa = corCasaEstoque;
        cor.expedicao = corExpedicao;
        cor.total = corTotalEstoque;
        cor.custoTotal = corCustoTotal;

        prodPlatEstoque += corPlatEstoque;
        prodCasaEstoque += corCasaEstoque;
        prodExpedicao += corExpedicao;
        prodTotalEstoque += corTotalEstoque;
        prodCustoTotal += corCustoTotal;
        prod.custoPlataforma = (prod.custoPlataforma || 0) + cor.custoPlataforma;
        prod.custoCasa = (prod.custoCasa || 0) + cor.custoCasa;
        prod.custoExpedicao = (prod.custoExpedicao || 0) + cor.custoExpedicao;
      });

      prod.estoquePlataforma = prodPlatEstoque;
      prod.estoqueCasa = prodCasaEstoque;
      prod.expedicao = prodExpedicao;
      prod.total = prodTotalEstoque;
      prod.custoTotal = prodCustoTotal;
    });

    let linhas = Object.values(stats);

    // Aplicar filtros de busca e locais/marcas
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

    if (filtroLocal.length > 0) {
      linhas = linhas.filter(l => {
        return filtroLocal.some(f => {
          const val = f.value.toUpperCase();
          if (val.includes('CASA')) return l.estoqueCasa > 0;
          if (val.includes('EXPEDI') || val.includes('OUT') || val.includes('TRANS')) return l.expedicao > 0;
          return l.estoquePlataforma > 0;
        });
      });
    }

    // 4. Agrupamento por marca para KPIs e gráficos (respeita busca, empresa, mas ignora o filtroMarca)
    const marcasStatsObj = {};
    linhas.forEach(l => {
      const brandName = (l.marca || "Sem Marca").trim().toUpperCase();
      if (!marcasStatsObj[brandName]) {
        marcasStatsObj[brandName] = {
          marca: l.marca || "Sem Marca",
          totalQtd: 0,
          totalCusto: 0
        };
      }
      marcasStatsObj[brandName].totalQtd += l.total;
      marcasStatsObj[brandName].totalCusto += l.custoTotal;
    });

    const marcasStatsArray = Object.values(marcasStatsObj);

    let marcaLiderQtd = { marca: '-', totalQtd: 0 };
    let marcaLiderCusto = { marca: '-', totalCusto: 0 };

    marcasStatsArray.forEach(m => {
      if (m.totalQtd > marcaLiderQtd.totalQtd) {
        marcaLiderQtd = m;
      }
      if (m.totalCusto > marcaLiderCusto.totalCusto) {
        marcaLiderCusto = m;
      }
    });

    let chartBrandQtdData = null;
    let chartBrandCustoData = null;
    let chartTitleQtd = "Top Marcas por Quantidade";
    let chartTitleCusto = "Top Marcas por Valor de Custo";

    // Agora aplica o filtro de marca para a tabela de produtos
    if (filtroMarca.length > 0) {
      linhas = linhas.filter(l => {
        const brandName = (l.marca || "Sem Marca").trim().toUpperCase();
        return filtroMarca.some(f => f.value.toUpperCase() === brandName);
      });

      const marcasStr = filtroMarca.map(m => toTitleCase(m.value)).join(', ');
      chartTitleQtd = `Top Produtos (${marcasStr}) (Qtd)`;
      chartTitleCusto = `Top Produtos (${marcasStr}) (Custo)`;

      const topProdutosQtd = [...linhas]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const topProdutosCusto = [...linhas]
        .sort((a, b) => b.custoTotal - a.custoTotal)
        .slice(0, 10);

      chartBrandQtdData = topProdutosQtd.length > 0 ? {
        labels: topProdutosQtd.map(p => {
          const title = toTitleCase(p.descricao);
          return title.length > 25 ? title.substring(0, 25) + '...' : title;
        }),
        datasets: [
          {
            label: 'Qtd em Estoque',
            data: topProdutosQtd.map(p => p.total),
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            hoverBackgroundColor: '#3b82f6',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      } : null;

      chartBrandCustoData = topProdutosCusto.length > 0 ? {
        labels: topProdutosCusto.map(p => {
          const title = toTitleCase(p.descricao);
          return title.length > 25 ? title.substring(0, 25) + '...' : title;
        }),
        datasets: [
          {
            label: 'Custo Total',
            data: topProdutosCusto.map(p => p.custoTotal),
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            hoverBackgroundColor: '#10b981',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      } : null;
    } else {
      const topMarcasQtd = [...marcasStatsArray]
        .sort((a, b) => b.totalQtd - a.totalQtd)
        .slice(0, 10);

      const topMarcasCusto = [...marcasStatsArray]
        .sort((a, b) => b.totalCusto - a.totalCusto)
        .slice(0, 10);

      chartBrandQtdData = topMarcasQtd.length > 0 ? {
        labels: topMarcasQtd.map(m => toTitleCase(m.marca)),
        datasets: [
          {
            label: 'Qtd em Estoque',
            data: topMarcasQtd.map(m => m.totalQtd),
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            hoverBackgroundColor: '#3b82f6',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      } : null;

      chartBrandCustoData = topMarcasCusto.length > 0 ? {
        labels: topMarcasCusto.map(m => {
          const title = toTitleCase(m.marca);
          return title.length > 25 ? title.substring(0, 25) + '...' : title;
        }),
        datasets: [
          {
            label: 'Custo Total',
            data: topMarcasCusto.map(m => m.totalCusto),
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            hoverBackgroundColor: '#10b981',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      } : null;
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

    let finalTotalGeral = 0;
    let finalTotalCustoGeral = 0;
    let finalCustoPlataforma = 0;
    let finalCustoCasa = 0;
    let finalCustoExpedicao = 0;
    let finalQtdPlataforma = 0;
    let finalQtdCasa = 0;
    let finalQtdExpedicao = 0;

    linhas.forEach(l => {
      finalTotalGeral += l.total;
      finalTotalCustoGeral += l.custoTotal;
      finalCustoPlataforma += l.custoPlataforma || 0;
      finalCustoCasa += l.custoCasa || 0;
      finalCustoExpedicao += l.custoExpedicao || 0;
      finalQtdPlataforma += l.estoquePlataforma || 0;
      finalQtdCasa += l.estoqueCasa || 0;
      finalQtdExpedicao += l.expedicao || 0;
    });

    return {
      linhas,
      totalGeral: finalTotalGeral,
      totalCustoGeral: finalTotalCustoGeral,
      custoPlataforma: finalCustoPlataforma,
      custoCasa: finalCustoCasa,
      custoExpedicao: finalCustoExpedicao,
      qtdPlataforma: finalQtdPlataforma,
      qtdCasa: finalQtdCasa,
      qtdExpedicao: finalQtdExpedicao,
      dataEstoque,
      dataVendas,
      totalMarcas: marcasStatsArray.length,
      marcaLiderQtd,
      marcaLiderCusto,
      chartBrandQtdData,
      chartBrandCustoData,
      chartTitleQtd,
      chartTitleCusto
    };
  }, [estoqueRows, vendasRows, filtroLocal, filtroMarca, busca, sortConfig, selectedCompany, data.sandriniCasaMap, data.buyclockCasaMap]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.linhas.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type, mode = 'detalhado') => {
    if (mode === 'resumido') {
      const headers = ["Descrição", "Marca", "Estoque Plataforma", "Estoque Casa", " Estoque Expedição", "Estoque Total", "Custo Total"];
      const exportData = dadosProcessados.linhas.map(item => {
        return [
          item.descricao,
          item.marca,
          item.estoquePlataforma,
          item.estoqueCasa,
          item.expedicao,
          item.total,
          type === 'xlsx' ? item.custoTotal : item.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ];
      });
      handleExport(type, "Estoque_Consolidado_Resumido", headers, exportData);
    } else {
      const headers = ["SKU Sênior", "Descrição", "Marca", "Custo Unitário", "Estoque Plataforma", "Estoque Casa", "Estoque Expedição", "Estoque Total", "Custo Total"];
      const exportData = [];
      dadosProcessados.linhas.forEach(item => {
        Object.values(item.cores).forEach(corObj => {
          Object.values(corObj.variacoes).forEach(v => {
            const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? ` ${corObj.cor}` : '';
            const sizePart = v.size && v.size !== 'U' ? ` Tam ${v.size}` : '';
            const fullDesc = `${item.descricao}${colorPart}${sizePart}`;

            exportData.push([
              v.sku,
              fullDesc,
              item.marca,
              type === 'xlsx' ? v.valorUnitario : v.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              v.estoquePlataforma,
              v.estoqueCasa,
              v.expedicao,
              v.total,
              type === 'xlsx' ? v.custoTotal : v.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]);
          });
        });
      });
      handleExport(type, "Estoque_Consolidado_Detalhado", headers, exportData);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filtroLocal, filtroMarca, busca, selectedCompany]);

  if (loading) {
    return (
      <div className="header-main">
        <h1>Estoque Consolidado</h1>
        <div className="skeleton-loader" style={{ height: '80px', width: '100%', marginBottom: '24px' }}></div>
        <div className="skeleton-loader" style={{ height: '400px', width: '100%' }}></div>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'red' }}>Erro ao carregar estoque: {error}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-main">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Estoque Consolidado</h1>
          <p style={{ marginBottom: '8px' }}>Visão geral dos produtos em estoque</p>

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

        <div style={{ flex: 1, minWidth: '150px' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>MARCA</label>
          <Select
            isMulti
            options={marcas.map(m => ({ value: m, label: toTitleCase(m) }))}
            value={filtroMarca}
            onChange={setFiltroMarca}
            isSearchable={true}
            placeholder="Todas as Marcas"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL</label>
          <Select
            isMulti
            options={locais.map(l => ({ value: l, label: toTitleCase(l) }))}
            value={filtroLocal}
            onChange={setFiltroLocal}
            isSearchable={true}
            placeholder="Todos os Locais"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>
      </div>

      {/* Brand KPIs Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tags size={28} color="#64748b" />
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Marcas</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{dadosProcessados.totalMarcas} marcas</div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package size={28} color="#3b82f6" />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Líder em Peças</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#3b82f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={toTitleCase(dadosProcessados.marcaLiderQtd.marca)}>
              {toTitleCase(dadosProcessados.marcaLiderQtd.marca)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {dadosProcessados.marcaLiderQtd.totalQtd.toLocaleString('pt-BR')} pçs
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Banknote size={28} color="#10b981" />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Líder em Custo</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={toTitleCase(dadosProcessados.marcaLiderCusto.marca)}>
              {toTitleCase(dadosProcessados.marcaLiderCusto.marca)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {dadosProcessados.marcaLiderCusto.totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LayoutGrid size={28} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Modelos</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{dadosProcessados.linhas.length}</div>
          </div>
        </div>
      </div>

        {/* Main KPIs Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px', marginTop: '16px' }}>

          {/* Card 1 - Consolidado */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }}>
            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '12px' }}>
              <Package size={24} color="#334155" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px', marginBottom: '4px' }}>ESTOQUE CONSOLIDADO</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '2px', letterSpacing: '-0.5px' }}>{dadosProcessados.totalGeral.toLocaleString('pt-BR')} pçs</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>{dadosProcessados.totalCustoGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>

          {/* Card 2 - Casa */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }}>
            <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px' }}>
              <Building2 size={24} color="#10b981" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px', marginBottom: '4px' }}>ESTOQUE CASA</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '2px', letterSpacing: '-0.5px' }}>{dadosProcessados.qtdCasa.toLocaleString('pt-BR')} pçs</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>{dadosProcessados.custoCasa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>

          {/* Card 3 - Plataforma */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }}>
            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px' }}>
              <Cloud size={24} color="#f59e0b" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px', marginBottom: '4px' }}>PLATAFORMAS</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '2px', letterSpacing: '-0.5px' }}>{dadosProcessados.qtdPlataforma.toLocaleString('pt-BR')} pçs</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>{dadosProcessados.custoPlataforma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>

          {/* Card 4 - Expedição */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }}>
            <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px' }}>
              <Truck size={24} color="#8b5cf6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px', marginBottom: '4px' }}>EXPEDIÇÃO</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '2px', letterSpacing: '-0.5px' }}>{dadosProcessados.qtdExpedicao.toLocaleString('pt-BR')} pçs</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>{dadosProcessados.custoExpedicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>

        </div>

        {/* Brand Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {dadosProcessados.chartTitleQtd}
            </h3>
            {dadosProcessados.chartBrandQtdData ? (
              <div style={{ height: '280px' }}>
                <Bar
                  data={dadosProcessados.chartBrandQtdData}
                  options={{
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                      }
                    },
                    scales: { 
                      x: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' } },
                      y: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' } }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Sem dados disponíveis.
              </div>
            )}
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {dadosProcessados.chartTitleCusto}
            </h3>
            {dadosProcessados.chartBrandCustoData ? (
              <div style={{ height: '280px' }}>
                <Bar
                  data={dadosProcessados.chartBrandCustoData}
                  options={{
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                      }
                    },
                    scales: { 
                      x: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' } },
                      y: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' } }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Sem dados disponíveis.
              </div>
            )}
          </div>
        </div>

        <MobileTable
          columns={[
            {
              key: 'descricao',
              label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição do Produto {getSortIcon('descricao')}</div>,
              rawLabel: 'Produto',
              render: (row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>{toTitleCase(row.descricao)}</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.3px' }}>Marca: {row.marca || 'Sem Marca'}</span>
                </div>
              ),
              onSort: () => requestSort('descricao'),
            },
            {
              key: 'estoquePlataforma',
              label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Est. Plataforma {getSortIcon('estoquePlataforma')}</div>,
              rawLabel: 'Est. Plataforma',
              render: (row) => <span>{row.estoquePlataforma.toLocaleString('pt-BR')} un</span>,
              onSort: () => requestSort('estoquePlataforma'),
            },
            {
              key: 'estoqueCasa',
              label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Est. Casa {getSortIcon('estoqueCasa')}</div>,
              rawLabel: 'Est. Casa',
              render: (row) => <span>{row.estoqueCasa.toLocaleString('pt-BR')} un</span>,
              onSort: () => requestSort('estoqueCasa'),
            },
            {
              key: 'expedicao',
              label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Expedição {getSortIcon('expedicao')}</div>,
              rawLabel: 'Expedição',
              render: (row) => <span>{row.expedicao.toLocaleString('pt-BR')} un</span>,
              onSort: () => requestSort('expedicao'),
            },
            {
              key: 'total',
              label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total {getSortIcon('total')}</div>,
              rawLabel: 'Total',
              render: (row) => <span style={{ fontWeight: 800 }}>{row.total.toLocaleString('pt-BR')} un</span>,
              onSort: () => requestSort('total'),
            },
            {
              key: 'custoTotal',
              label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Custo Total {getSortIcon('custoTotal')}</div>,
              rawLabel: 'Custo Total',
              render: (row) => <span style={{ fontWeight: 800, color: '#10b981' }}>{row.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>,
              onSort: () => requestSort('custoTotal'),
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
                        <Palette size={16} color="#64748b" />
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cor: {corObj.cor || 'Sem Cor'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', background: '#e2e8f0', padding: '4px 10px', borderRadius: '20px' }}>
                          {corObj.total.toLocaleString('pt-BR')} peças
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                          Custo: {corObj.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Variações */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '100px', background: '#fafafa' }}>Tamanho</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>SKU</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '130px', background: '#fafafa' }}>Custo Unit.</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Estoque Plataforma</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Estoque Casa</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Estoque Expedição</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Total</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '130px', background: '#fafafa' }}>Custo Total</th>
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
                        }).map((v) => (
                          <tr key={v.sku + '_' + (v.size || 'ÚNICO')} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                            <td style={{ padding: '10px 20px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '32px', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
                                {v.size || 'Único'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#475569', fontWeight: 500 }}>
                              {v.sku}
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>
                              {v.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                              {v.estoquePlataforma.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                              {v.estoqueCasa.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                              {v.expedicao.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: v.total === 0 ? '#ef4444' : '#0f172a' }}>
                              {v.total.toLocaleString('pt-BR')} un
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', color: '#047857', fontWeight: 600 }}>
                              {v.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px', textTransform: 'uppercase' }}><Palette size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }} /> Cor: {corObj.cor || 'Sem Cor'}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                          {corObj.total} pçs
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px' }}>
                          {corObj.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
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
                      }).map((v, vIdx, arr) => (
                        <div key={v.sku + '_' + (v.size || 'ÚNICO')} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: vIdx === arr.length - 1 ? 'none' : '1px solid #f1f5f9', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '28px', padding: '3px 6px', borderRadius: '5px', textAlign: 'center', fontSize: '12px' }}>
                                {v.size || 'Único'}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '11px' }}>{v.sku}</span>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>Unit: {v.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                            <span>Est. Plat: {v.estoquePlataforma}</span>
                            <span>Est. Casa: {v.estoqueCasa}</span>
                            <span>Exp: {v.expedicao}</span>
                            <span style={{ fontWeight: 600, color: v.total === 0 ? '#ef4444' : '#1e293b' }}>Total: {v.total} un</span>
                            <span style={{ fontWeight: 600, color: '#047857' }}>Custo: {v.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
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
