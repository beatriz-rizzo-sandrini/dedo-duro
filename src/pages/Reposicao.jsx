import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet , Package , ShoppingBag , Palette } from 'lucide-react';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_CAMINHO, COL_ESTOQUE, COL_VENDAS } from '../utils/sheetColumns';
import { parseProductDescription, normalizeBrand } from '../utils/productParser';
import MobileTable from '../components/MobileTable';

export default function Reposicao() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const caminhoRows = data.caminho || [];
  const estoqueRows = data.estoque || [];
  const vendasRows = data.vendas || [];
  
  const [filtroLocal, setFiltroLocal] = useState([]);
  const [filtroMarca, setFiltroMarca] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [buscaInput]);

  const [visao, setVisao] = useState('envio'); // 'envio' ou 'produto'
  
  const [expandedEnvio, setExpandedEnvio] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });

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

  const { locais, statusSet } = useMemo(() => {
    if (!caminhoRows.length) return { locais: [], statusSet: [] };
    const lSet = new Set();
    const sSet = new Set();

    caminhoRows.forEach(r => {
      const local = String(r?.c?.[COL_CAMINHO.LOCAL]?.v ?? "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      
      const status = String(r?.c?.[COL_CAMINHO.STATUS]?.v ?? "").toUpperCase().trim();
      if (local) lSet.add(local);
      if (status) sSet.add(status);
    });

    return { locais: Array.from(lSet), statusSet: Array.from(sSet) };
  }, [caminhoRows, selectedCompany]);

  const { skuToDesc, skuToBrand } = useMemo(() => {
    const descMap = {};
    const brandMap = {};
    estoqueRows.forEach(r => {
      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      const brand = r?.c?.[COL_ESTOQUE.MARCA]?.v || "";
      if (sku && desc) descMap[sku] = desc;
      if (sku && brand) brandMap[sku] = brand;
    });
    vendasRows.forEach(r => {
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      const brand = r?.c?.[COL_VENDAS.MARCA]?.v || "";
      if (sku && desc && !descMap[sku]) descMap[sku] = desc;
      if (sku && brand && !brandMap[sku]) brandMap[sku] = brand;
    });
    return { skuToDesc: descMap, skuToBrand: brandMap };
  }, [estoqueRows, vendasRows]);

  const marcas = useMemo(() => {
    if (!caminhoRows.length) return [];
    const setMarcas = new Set();
    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      const skuPlat = r?.c?.[8]?.v || "";
      const rawBrand = skuToBrand[sku] || skuToBrand[skuPlat] || "";
      let desc = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      
      const brand = normalizeBrand(rawBrand, sku, desc);
      if (brand) setMarcas.add(brand);
    });
    return Array.from(setMarcas).sort();
  }, [caminhoRows, skuToBrand, skuToDesc]);

  const dadosProcessados = useMemo(() => {
    if (!caminhoRows.length) return { envios: [], produtos: [], totalGeral: 0 };
    
    // Usando maps globais de descrição e marca de useMemo

    let totalGeral = 0;
    const agrupadoEnvio = {};
    const agrupadoProduto = {};

    const inicioTime = dataIni ? new Date(`${dataIni}T00:00:00`).getTime() : 0;
    const fimTime = dataFim ? new Date(`${dataFim}T23:59:59`).getTime() : Infinity;

    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      const skuPlat = r?.c?.[8]?.v || "";
      let descricao = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      const local = String(r?.c?.[COL_CAMINHO.LOCAL]?.v ?? "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const quantidade = r?.c?.[COL_CAMINHO.QTD]?.v || 0;
      const status = String(r?.c?.[COL_CAMINHO.STATUS]?.v ?? "").toUpperCase().trim();
      
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      
      if (!descricao && skuToDesc[sku]) descricao = skuToDesc[sku];
      if (!sku && !descricao) return;
      if (!descricao) descricao = `SKU: ${sku}`;

      const parsed = parseProductDescription(descricao, sku, local.includes("BUY CLOCK"));

      let previsaoRaw = r?.c?.[COL_CAMINHO.PREVISAO]?.v || "";
      let previsao = "";
      if(typeof previsaoRaw === "object" && previsaoRaw?.f) {
        previsao = previsaoRaw.f;
      } else if(typeof previsaoRaw === "string" && previsaoRaw.includes("Date")) {
        const m = previsaoRaw.match(/Date\((\d+),(\d+),(\d+)\)/);
        if(m){
          const ano = m[1];
          const mes = String(parseInt(m[2]) + 1).padStart(2,"0");
          const dia = String(m[3]).padStart(2,"0");
          previsao = `${dia}/${mes}/${ano}`;
        }
      } else {
        previsao = previsaoRaw;
      }

      let previsaoTime = 0;
      if (previsao && previsao.includes('/')) {
        const [d, m, y] = previsao.split('/');
        previsaoTime = new Date(`${y}-${m}-${d}T12:00:00`).getTime();
      }

      let envio = "";
      if (r?.c?.[COL_CAMINHO.NF]?.f) {
        envio = r?.c?.[COL_CAMINHO.NF].f.toUpperCase().trim();
      } else if (r?.c?.[COL_CAMINHO.NF]?.v != null) {
        envio = String(r?.c?.[COL_CAMINHO.NF].v).toUpperCase().trim();
      }

      const rawBrand = skuToBrand[sku] || skuToBrand[skuPlat] || "";
      const brand = normalizeBrand(rawBrand, sku, descricao);

      if (filtroLocal.length > 0 && !filtroLocal.some(f => f.value === local)) return;
      if (filtroMarca.length > 0 && !filtroMarca.some(f => f.value.toUpperCase() === brand)) return;
      if (filtroStatus && status !== filtroStatus) return;
      if (inicioTime && previsaoTime && previsaoTime < inicioTime) return;
      if (fimTime !== Infinity && previsaoTime && previsaoTime > fimTime) return;

      totalGeral += quantidade;

      // 1. Agrupamento por Envio/NF
      const chaveEnvio = `${local}||${envio}||${status}||${previsao}`;
      if (!agrupadoEnvio[chaveEnvio]) {
        agrupadoEnvio[chaveEnvio] = { id: chaveEnvio, local, envio, status, previsao, total: 0, modelos: {} };
      }
      agrupadoEnvio[chaveEnvio].total += quantidade;

      const modelKey = parsed.baseTitle;
      if (!agrupadoEnvio[chaveEnvio].modelos[modelKey]) {
        agrupadoEnvio[chaveEnvio].modelos[modelKey] = {
          baseTitle: parsed.baseTitle,
          total: 0,
          cores: {}
        };
      }
      agrupadoEnvio[chaveEnvio].modelos[modelKey].total += quantidade;

      const corKey = parsed.color || 'SEM COR';
      if (!agrupadoEnvio[chaveEnvio].modelos[modelKey].cores[corKey]) {
        agrupadoEnvio[chaveEnvio].modelos[modelKey].cores[corKey] = {
          cor: corKey,
          total: 0,
          variacoes: []
        };
      }
      agrupadoEnvio[chaveEnvio].modelos[modelKey].cores[corKey].total += quantidade;
      agrupadoEnvio[chaveEnvio].modelos[modelKey].cores[corKey].variacoes.push({
        sku,
        skuPlat,
        size: parsed.size || 'U',
        quantidade
      });

      // 2. Agrupamento por Produto/Modelo
      const chaveProd = `${parsed.baseTitle}|${local}`;
      if (!agrupadoProduto[chaveProd]) {
        agrupadoProduto[chaveProd] = {
          id: chaveProd,
          descricao: parsed.baseTitle,
          local,
          total: 0,
          statusSet: new Set(),
          previsoesSet: new Set(),
          enviosSet: new Set(),
          cores: {},
          skusArr: []
        };
      }
      agrupadoProduto[chaveProd].total += quantidade;
      if (status) agrupadoProduto[chaveProd].statusSet.add(status);
      if (previsao) agrupadoProduto[chaveProd].previsoesSet.add(previsao);
      if (envio) agrupadoProduto[chaveProd].enviosSet.add(envio);
      agrupadoProduto[chaveProd].skusArr.push(sku);
      if (skuPlat) agrupadoProduto[chaveProd].skusArr.push(skuPlat);
      if (envio) agrupadoProduto[chaveProd].skusArr.push(envio);

      if (!agrupadoProduto[chaveProd].cores[corKey]) {
        agrupadoProduto[chaveProd].cores[corKey] = {
          cor: corKey,
          total: 0,
          variacoes: {}
        };
      }
      agrupadoProduto[chaveProd].cores[corKey].total += quantidade;

      const varKey = `${sku}|${parsed.size || 'U'}|${envio}`;
      if (!agrupadoProduto[chaveProd].cores[corKey].variacoes[varKey]) {
        agrupadoProduto[chaveProd].cores[corKey].variacoes[varKey] = {
          sku,
          skuPlat,
          size: parsed.size || 'U',
          quantidade: 0,
          envio,
          previsao,
          status
        };
      }
      agrupadoProduto[chaveProd].cores[corKey].variacoes[varKey].quantidade += quantidade;
    });

    // Converter para arrays
    let envios = Object.values(agrupadoEnvio).map(env => {
      const listaProdutos = Object.values(env.modelos)
        .map(m => `${toTitleCase(m.baseTitle)} (${m.total})`)
        .join(', ');
      return { ...env, listaProdutos };
    });

    let produtos = Object.values(agrupadoProduto).map(p => {
      const statusList = Array.from(p.statusSet);
      const statusGeral = statusList.length === 1 ? statusList[0] : statusList.includes('A CAMINHO') ? 'A CAMINHO' : statusList[0] || '-';
      
      const previsaoList = Array.from(p.previsoesSet);
      const previsaoGeral = previsaoList.length === 1 ? previsaoList[0] : previsaoList.sort((a,b) => {
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(`${ya}-${ma}-${da}`).getTime() - new Date(`${yb}-${mb}-${db}`).getTime();
      })[0] || '-';

      const enviosList = Array.from(p.enviosSet).join(', ');

      return {
        ...p,
        statusGeral,
        previsaoGeral,
        enviosList
      };
    });

    // Aplicar buscas
    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      
      envios = envios.filter(env => {
        let matches = false;
        const envioLower = (env.envio || "").toLowerCase();
        
        Object.values(env.modelos).forEach(model => {
          const modelLower = model.baseTitle.toLowerCase();
          let skusArray = [];
          Object.values(model.cores).forEach(c => {
            c.variacoes.forEach(v => {
              if (v.sku) skusArray.push(v.sku.toLowerCase());
              if (v.skuPlat) skusArray.push(v.skuPlat.toLowerCase());
            });
          });
          
          const thisModelMatches = termos.every(termo => 
            envioLower.includes(termo) ||
            modelLower.includes(termo) || 
            skusArray.some(sku => sku.includes(termo))
          );
          if (thisModelMatches) matches = true;
        });
        return matches;
      });

      produtos = produtos.filter(p => {
        const descLower = p.descricao.toLowerCase();
        const localLower = p.local.toLowerCase();
        const skusLower = p.skusArr.map(s => s.toLowerCase());

        return termos.every(termo =>
          descLower.includes(termo) ||
          localLower.includes(termo) ||
          skusLower.some(sku => sku.includes(termo))
        );
      });
    }

    // Aplicar ordenação
    if (sortConfig.key) {
      const sortFn = (a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'descricao') {
          aVal = a.descricao || a.local;
          bVal = b.descricao || b.local;
        } else if (sortConfig.key === 'previsao') {
          aVal = a.previsao || a.previsaoGeral;
          bVal = b.previsao || b.previsaoGeral;
        } else if (sortConfig.key === 'status') {
          aVal = a.status || a.statusGeral;
          bVal = b.status || b.statusGeral;
        } else if (sortConfig.key === 'envio') {
          aVal = a.envio || a.enviosList;
          bVal = b.envio || b.enviosList;
        }

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      };

      envios.sort(sortFn);
      produtos.sort(sortFn);
    }

    return { envios, produtos, totalGeral };
  }, [caminhoRows, skuToDesc, skuToBrand, filtroLocal, filtroMarca, filtroStatus, dataIni, dataFim, busca, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil((visao === 'envio' ? dadosProcessados.envios.length : dadosProcessados.produtos.length) / itensPorPagina);
  const linhasPaginadas = (visao === 'envio' ? dadosProcessados.envios : dadosProcessados.produtos).slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type, mode = 'detalhado') => {
    if (mode === 'resumido') {
      if (visao === 'envio') {
        const headers = ["Local de Destino", "Envio (NF)", "Status", "Previsão", "Quantidade Total"];
        const exportData = dadosProcessados.envios.map(item => [
          item.local,
          item.envio,
          item.status,
          item.previsao,
          item.total
        ]);
        handleExport(type, "Relatorio_Reposicao_Resumido_Lotes", headers, exportData);
      } else {
        const headers = ["Descrição do Produto", "Local de Destino", "Envio (NFs)", "Status Geral", "Previsão Geral", "Quantidade A Caminho"];
        const exportData = dadosProcessados.produtos.map(item => [
          item.descricao,
          item.local,
          item.enviosList,
          item.statusGeral,
          item.previsaoGeral,
          item.total
        ]);
        handleExport(type, "Relatorio_Reposicao_Resumido_Produtos", headers, exportData);
      }
    } else {
      const headers = ["SKU Sênior", "SKU Plataforma", "Descrição", "Local de Destino", "Envio (NF)", "Status", "Previsão", "Quantidade"];
      const exportData = [];
      dadosProcessados.envios.forEach(item => {
        Object.values(item.modelos).forEach(model => {
          Object.values(model.cores).forEach(corObj => {
            corObj.variacoes.forEach(v => {
              const colorPart = corObj.cor && corObj.cor !== 'SEM COR' ? ` ${corObj.cor}` : '';
              const sizePart = v.size && v.size !== 'U' ? ` Tam ${v.size}` : '';
              const fullDesc = `${model.baseTitle}${colorPart}${sizePart}`;
              
              exportData.push([
                v.sku,
                v.skuPlat || '-',
                toTitleCase(fullDesc),
                item.local,
                item.envio,
                item.status,
                item.previsao,
                v.quantidade
              ]);
            });
          });
        });
      });
      handleExport(type, "Relatorio_Reposicao_Detalhado", headers, exportData);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
    setExpandedEnvio(null);
  }, [filtroLocal, filtroMarca, filtroStatus, dataIni, dataFim, busca, selectedCompany, visao]);

  if (loading) {
    return (
      <div className="header-main">
        <h1>Reposição</h1>
        <div className="skeleton-loader" style={{ height: '80px', width: '100%', marginBottom: '24px' }}></div>
        <div className="skeleton-loader" style={{ height: '400px', width: '100%' }}></div>
      </div>
    );
  }

  if (error) return <div style={{ color: 'red' }}>Erro ao carregar reposição: {error}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-main">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Reposição A Caminho</h1>
          <p>Acompanhamento de pedidos em trânsito</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          
          {/* Seletor de Visão */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '4px', alignItems: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)' }}>
            <button 
              className="btn-padrao" 
              style={{ 
                background: visao === 'envio' ? 'white' : 'transparent', 
                color: visao === 'envio' ? '#8b5cf6' : '#64748b',
                boxShadow: visao === 'envio' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                minHeight: 'auto',
                lineHeight: '1.2'
              }}
              onClick={() => setVisao('envio')}
            >
              <Package size={16} style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }}/> Lotes (NF)
            </button>
            <button 
              className="btn-padrao"
              style={{ 
                background: visao === 'produto' ? 'white' : 'transparent', 
                color: visao === 'produto' ? '#8b5cf6' : '#64748b',
                boxShadow: visao === 'produto' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                minHeight: 'auto',
                lineHeight: '1.2'
              }}
              onClick={() => setVisao('produto')}
            >
              <ShoppingBag size={16} style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }}/> Por Produto
            </button>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
            <Truck size={24} />
            <div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.9 }}>TOTAL A CAMINHO</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{dadosProcessados.totalGeral.toLocaleString('pt-BR')}</div>
            </div>
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
                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>EXPORTAR RESUMIDO ({visao === 'envio' ? 'LOTES' : 'MODELOS'})</div>
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
      </div>

      <div className="filters-container">
        <CompanySelector />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '280px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>PESQUISAR (SKU, DESCRIÇÃO OU NF)</label>
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
            placeholder="Todas as Marcas"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL / CANAL</label>
          <Select 
            isMulti
            options={locais.map(l => ({ value: l, label: toTitleCase(l) }))}
            value={filtroLocal}
            onChange={setFiltroLocal}
            placeholder="Todos os Locais"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>STATUS</label>
          <Select 
            options={[
              { value: '', label: 'Todos' },
              ...statusSet.map(s => ({ value: s, label: toTitleCase(s) }))
            ]}
            value={{ value: filtroStatus, label: filtroStatus ? toTitleCase(filtroStatus) : 'Todos' }}
            onChange={opt => setFiltroStatus(opt.value)}
            placeholder="Todos os Status"
            classNamePrefix="react-select"
            styles={{ control: (b) => ({ ...b, borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '42px' }) }}
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

      <MobileTable
        columns={visao === 'envio' ? [
          {
            key: 'local',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local de Destino {getSortIcon('local')}</div>,
            rawLabel: 'Local de Destino',
            render: (row) => <span style={{ fontWeight: 600 }}>{toTitleCase(row.local)}</span>,
            onSort: () => requestSort('local'),
          },
          {
            key: 'envio',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Envio (NF) {getSortIcon('envio')}</div>,
            rawLabel: 'Envio (NF)',
            render: (row) => <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{row.envio}</span>,
            onSort: () => requestSort('envio'),
          },
          {
            key: 'listaProdutos',
            label: 'Produtos no Envio',
            rawLabel: 'Produtos no Envio',
            render: (row) => (
              <span style={{ 
                fontSize: '12px', 
                color: '#475569', 
                maxWidth: '300px', 
                display: 'inline-block', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }} title={row.listaProdutos}>
                {row.listaProdutos}
              </span>
            ),
          },
          {
            key: 'total',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total de Peças {getSortIcon('total')}</div>,
            rawLabel: 'Total de Peças',
            render: (row) => <span style={{ fontWeight: 600 }}>{row.total.toLocaleString('pt-BR')}</span>,
            onSort: () => requestSort('total'),
          },
          {
            key: 'status',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Status {getSortIcon('status')}</div>,
            rawLabel: 'Status',
            render: (row) => (
              <span style={{ 
                background: row.status.includes('CONFER') ? '#fef08a' : row.status === 'FINALIZADO' ? '#bbf7d0' : row.status === 'A CAMINHO' ? '#fecaca' : '#e2e8f0', 
                color: row.status.includes('CONFER') ? '#a16207' : row.status === 'FINALIZADO' ? '#166534' : row.status === 'A CAMINHO' ? '#991b1b' : '#475569', 
                padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' 
              }}>
                {row.status}
              </span>
            ),
            onSort: () => requestSort('status'),
          },
          {
            key: 'previsao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Previsão {getSortIcon('previsao')}</div>,
            rawLabel: 'Previsão',
            render: (row) => row.previsao,
            onSort: () => requestSort('previsao'),
          },
        ] : [
          {
            key: 'descricao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Descrição do Produto {getSortIcon('descricao')}</div>,
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
            key: 'envio',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Envios (NFs) {getSortIcon('envio')}</div>,
            rawLabel: 'Envios (NFs)',
            render: (row) => <span style={{ color: '#475569', fontSize: '12px' }}>{row.enviosList}</span>,
            onSort: () => requestSort('envio'),
          },
          {
            key: 'total',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total A Caminho {getSortIcon('total')}</div>,
            rawLabel: 'Total A Caminho',
            render: (row) => <span style={{ fontWeight: 800 }}>{row.total.toLocaleString('pt-BR')}</span>,
            onSort: () => requestSort('total'),
          },
          {
            key: 'status',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Status Geral {getSortIcon('status')}</div>,
            rawLabel: 'Status Geral',
            render: (row) => (
              <span style={{ 
                background: row.statusGeral.includes('CONFER') ? '#fef08a' : row.statusGeral === 'FINALIZADO' ? '#bbf7d0' : row.statusGeral === 'A CAMINHO' ? '#fecaca' : '#e2e8f0', 
                color: row.statusGeral.includes('CONFER') ? '#a16207' : row.statusGeral === 'FINALIZADO' ? '#166534' : row.statusGeral === 'A CAMINHO' ? '#991b1b' : '#475569', 
                padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' 
              }}>
                {row.statusGeral}
              </span>
            ),
            onSort: () => requestSort('status'),
          },
          {
            key: 'previsao',
            label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Previsão {getSortIcon('previsao')}</div>,
            rawLabel: 'Previsão',
            render: (row) => row.previsaoGeral,
            onSort: () => requestSort('previsao'),
          },
        ]}
        rows={linhasPaginadas}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setExpandedEnvio(expandedEnvio === row.id ? null : row.id)}
        isExpanded={(row) => expandedEnvio === row.id}
        renderExpandedDesktop={(item) => (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {visao === 'envio' ? (
                Object.values(item.modelos).map((model) => (
                  <div key={model.baseTitle} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden', padding: '16px' }}>
                    {/* Cabeçalho do Modelo */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingBag size={18} color="#64748b" />
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{toTitleCase(model.baseTitle)}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '20px', border: '1px solid #ddd6fe' }}>
                        {model.total.toLocaleString('pt-BR')} peças
                      </span>
                    </div>

                    {/* Cores do Modelo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Object.values(model.cores).map((corObj) => (
                        <div key={corObj.cor} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          {/* Cabeçalho da Cor */}
                          <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Palette size={14} color="#64748b" />
                              <span style={{ fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cor: {corObj.cor || 'Sem Cor'}</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px' }}>
                              {corObj.total.toLocaleString('pt-BR')} un
                            </span>
                          </div>

                          {/* Tabela de Tamanhos */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                                <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '100px' }}>Tamanho</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>SKU Sênior</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>SKU Plataforma</th>
                                <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px' }}>Quantidade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {corObj.variacoes.sort((a, b) => {
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
                              }).map((v, idx) => (
                                <tr key={v.sku + idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                    <span style={{ display: 'inline-block', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '28px', padding: '3px 6px', borderRadius: '5px', textAlign: 'center' }}>
                                      {v.size || 'U'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 16px', fontFamily: 'monospace', color: '#475569', fontWeight: 500 }}>
                                    {v.sku}
                                  </td>
                                  <td style={{ padding: '8px 16px', fontFamily: 'monospace', color: '#64748b', fontSize: '12px' }}>
                                    {v.skuPlat || '-'}
                                  </td>
                                  <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                    {v.quantidade.toLocaleString('pt-BR')} un
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                Object.values(item.cores).map((corObj) => (
                  <div key={corObj.cor} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                    {/* Cabeçalho da Cor */}
                    <div style={{ padding: '12px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={16} color="#64748b" />
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cor: {corObj.cor || 'Sem Cor'}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '20px', border: '1px solid #ddd6fe' }}>
                        {corObj.total.toLocaleString('pt-BR')} peças
                      </span>
                    </div>

                    {/* Tabela de Variações */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                          <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '100px' }}>Tamanho</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>SKU Sênior</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>SKU Plataforma</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', width: '150px' }}>Envio (NF)</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', width: '120px' }}>Previsão</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', width: '120px' }}>Status</th>
                          <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#64748b', width: '120px' }}>Quantidade</th>
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
                        }).map((v, idx) => (
                          <tr key={v.sku + idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                            <td style={{ padding: '10px 20px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '32px', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
                                {v.size || 'U'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#475569', fontWeight: 500 }}>
                              {v.sku}
                            </td>
                            <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#64748b', fontSize: '12px' }}>
                              {v.skuPlat || '-'}
                            </td>
                            <td style={{ padding: '10px 20px' }}>
                              <span style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '12px', color: '#475569' }}>
                                {v.envio || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 20px', color: '#475569' }}>
                              {v.previsao}
                            </td>
                            <td style={{ padding: '10px 20px' }}>
                              <span style={{ 
                                background: v.status.includes('CONFER') ? '#fef08a' : v.status === 'FINALIZADO' ? '#bbf7d0' : v.status === 'A CAMINHO' ? '#fecaca' : '#e2e8f0', 
                                color: v.status.includes('CONFER') ? '#a16207' : v.status === 'FINALIZADO' ? '#166534' : v.status === 'A CAMINHO' ? '#991b1b' : '#475569', 
                                padding: '3px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '11px' 
                              }}>
                                {v.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                              {v.quantidade.toLocaleString('pt-BR')} un
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
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
              {visao === 'envio' ? (
                Object.values(item.modelos).map((model) => (
                  <div key={model.baseTitle} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{toTitleCase(model.baseTitle)}</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#8b5cf6', background: '#f5f3ff', padding: '2px 8px', borderRadius: '12px' }}>
                        {model.total} peças
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Object.values(model.cores).map((corObj) => (
                        <div key={corObj.cor} style={{ border: '1px solid #f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}><Palette size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}/> Cor: {corObj.cor || 'Sem Cor'}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563' }}>{corObj.total} un</span>
                          </div>
                          <div style={{ padding: '0 10px' }}>
                            {corObj.variacoes.sort((a, b) => {
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
                            }).map((v, idx, arr) => (
                              <div key={v.sku + idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '24px', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px' }}>
                                    {v.size || 'U'}
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '11px' }}>{v.sku}</span>
                                    {v.skuPlat && <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '9px' }}>Plat: {v.skuPlat}</span>}
                                  </div>
                                </div>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>{v.quantidade} un</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                Object.values(item.cores).map((corObj) => (
                  <div key={corObj.cor} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px', textTransform: 'uppercase' }}><Palette size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}/> Cor: {corObj.cor || 'Sem Cor'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', padding: '2px 8px', borderRadius: '12px' }}>
                        {corObj.total} un
                      </span>
                    </div>

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
                      }).map((v, idx, arr) => (
                        <div key={v.sku + idx} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '28px', padding: '3px 6px', borderRadius: '5px', textAlign: 'center', fontSize: '12px' }}>
                                {v.size || 'U'}
                              </span>
                              <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>{v.sku}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                              {v.quantidade} un
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                            <span>NF: {v.envio || '-'}</span>
                            <span>Previsão: {v.previsao}</span>
                            <span style={{ fontWeight: 600, color: v.status === 'A CAMINHO' ? '#b91c1c' : '#15803d' }}>{v.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
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
