import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, ChevronRight, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { handleExport } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import { getLatestDates } from '../utils/dateUtils';
import HeaderDates from '../components/HeaderDates';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_ESTOQUE, COL_VENDAS, COL_BADSTOCK, COL_CAMINHO } from '../utils/sheetColumns';
import { parseProductDescription } from '../utils/productParser';
import MobileTable from '../components/MobileTable';

function SkuRow({ s, loc, addToCart }) {
  const [repoQtd, setRepoQtd] = React.useState(s.reposicaoSugerida);

  // Sincroniza quando dias alvo muda e o pai recalcula o valor sugerido
  React.useEffect(() => {
    setRepoQtd(s.reposicaoSugerida);
  }, [s.reposicaoSugerida]);

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '10px 20px', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '32px', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
          {s.size || 'Único'}
        </span>
      </td>
      <td style={{ padding: '10px 20px', fontFamily: 'monospace', color: '#475569', fontWeight: 500 }}>
        {s.sku} 
        {s.skuPlat && s.skuPlat !== s.sku && (
          <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
            Plat: {s.skuPlat}
          </span>
        )}
        {s.isRuptura && ' 🔴'} 
        {s.isBad && ' ⛔'}
      </td>
      <td style={{ textAlign: 'center', padding: '10px 20px' }}>{s.estoque} un</td>
      <td style={{ textAlign: 'center', padding: '10px 20px', fontWeight: 600, color: s.aCaminho > 0 ? '#3b82f6' : '#475569' }}>
        {s.aCaminho > 0 ? `${s.aCaminho} un` : '-'}
      </td>
      <td style={{ textAlign: 'center', padding: '10px 20px' }}>{s.vendas} un</td>
      <td style={{ textAlign: 'center', padding: '10px 20px' }}>{s.cobertura === -1 ? "∞" : Math.round(s.cobertura) + " dias"}</td>
      <td style={{ padding: '10px 20px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            className="input-padrao"
            style={{ width: '70px', padding: '4px 8px', minHeight: '32px' }}
            value={repoQtd}
            onChange={e => setRepoQtd(Number(e.target.value))}
          />
          <button
            className="btn-padrao"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', minHeight: '32px' }}
            onClick={() => addToCart(s, loc, repoQtd)}
          >
            <ShoppingCart size={13} /> Add
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Produto() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();

  const estoqueRows = data.estoque || [];
  const vendasRows = data.vendas || [];
  const badStockRows = data.badstock || [];

  const [busca, setBusca] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasCobertura, setDiasCobertura] = useState(60);

  const [sortConfig, setSortConfig] = useState({ key: 'reposicaoTotal', direction: 'desc' });
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

  useEffect(() => {
    if (!dataIni && !dataFim) {
      const hoje = new Date();
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(hoje.getDate() - 30);
      setDataFim(hoje.toISOString().split('T')[0]);
      setDataIni(trintaDiasAtras.toISOString().split('T')[0]);
    }
  }, [dataIni, dataFim]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busca, dataIni, dataFim, diasCobertura, selectedCompany]);

  const dadosProcessados = useMemo(() => {
    if (!estoqueRows.length && !vendasRows.length) return null;

    let diasPeriodo = 30;
    if (dataIni && dataFim) {
      diasPeriodo = (new Date(dataFim) - new Date(dataIni)) / (1000 * 60 * 60 * 24) + 1;
    }

    const { dataEstoque, dataVendas } = getLatestDates(estoqueRows, vendasRows);

    const skuToDesc = {};
    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      if (dataEstoque && dataStr !== dataEstoque) return;

      const sku = r?.c?.[COL_ESTOQUE.SKU]?.v || "";
      const desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });
    vendasRows.forEach(r => {
      const sku = r?.c?.[COL_VENDAS.SKU]?.v || "";
      const desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      if (sku && desc && !skuToDesc[sku]) skuToDesc[sku] = desc;
    });
    const caminhoRows = data.caminho || [];
    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      const desc = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      if (sku && desc && !skuToDesc[sku]) skuToDesc[sku] = desc;
    });

    const aCaminhoMap = {};
    caminhoRows.forEach(r => {
      const sku = String(r?.c?.[COL_CAMINHO.SKU]?.v || "").trim().toUpperCase();
      const local = String(r?.c?.[COL_CAMINHO.LOCAL]?.v || "OUTROS").toUpperCase().trim();
      const qtd = Number(r?.c?.[COL_CAMINHO.QTD]?.v) || 0;
      const status = String(r?.c?.[COL_CAMINHO.STATUS]?.v || "").toUpperCase().trim();

      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (status === 'FINALIZADO') return;

      if (!aCaminhoMap[local]) aCaminhoMap[local] = {};
      if (!aCaminhoMap[local][sku]) aCaminhoMap[local][sku] = 0;
      aCaminhoMap[local][sku] += qtd;
    });

    const agrupado = {};

    estoqueRows.forEach(r => {
      const dataStr = r?.c?.[COL_ESTOQUE.DATA]?.f || String(r?.c?.[COL_ESTOQUE.DATA]?.v || "");
      if (dataEstoque && dataStr !== dataEstoque) return;

      const sku = String(r?.c?.[COL_ESTOQUE.SKU]?.v || "").trim().toUpperCase();
      const skuPlat = r?.c?.[7]?.v || "";
      let desc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      const local = (r?.c?.[COL_ESTOQUE.LOCAL]?.v || "OUTROS").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;
      const custoUnitario = Number(r?.c?.[COL_ESTOQUE.VALOR]?.v) || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      const parsed = parseProductDescription(desc, sku);
      const prodKey = `${parsed.baseTitle}|${local}`;

      if (!agrupado[prodKey]) {
        agrupado[prodKey] = {
          descricao: parsed.baseTitle,
          local,
          valorEstoque: 0,
          estoqueTotal: 0,
          vendasTotal: 0,
          caminhoTotal: 0,
          reposicaoTotal: 0,
          id: prodKey,
          cores: {}
        };
      }

      agrupado[prodKey].estoqueTotal += qtd;
      agrupado[prodKey].valorEstoque += (custoUnitario * qtd);

      const corKey = parsed.color || 'SEM COR';
      if (!agrupado[prodKey].cores[corKey]) {
        agrupado[prodKey].cores[corKey] = {
          cor: corKey,
          totalEstoque: 0,
          totalCaminho: 0,
          totalVendas: 0,
          totalReposicao: 0,
          variacoes: {}
        };
      }

      const varKey = `${sku}|${parsed.size}`;
      if (!agrupado[prodKey].cores[corKey].variacoes[varKey]) {
        agrupado[prodKey].cores[corKey].variacoes[varKey] = {
          sku,
          skuPlat: skuPlat,
          estoque: 0,
          vendas: 0,
          aCaminho: 0,
          color: corKey,
          size: parsed.size
        };
      }
      agrupado[prodKey].cores[corKey].variacoes[varKey].estoque += qtd;
      if (skuPlat && !agrupado[prodKey].cores[corKey].variacoes[varKey].skuPlat) {
        agrupado[prodKey].cores[corKey].variacoes[varKey].skuPlat = skuPlat;
      }
    });

    vendasRows.forEach(r => {
      const dataStr = r?.c?.[COL_VENDAS.DATA]?.f || "";
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dataVenda = new Date(`${y}-${m}-${d}`);
      if (dataIni && dataFim && (dataVenda < new Date(dataIni) || dataVenda > new Date(dataFim))) return;

      const sku = String(r?.c?.[COL_VENDAS.SKU]?.v || "").trim().toUpperCase();
      const skuPlat = r?.c?.[6]?.v || "";
      let desc = r?.c?.[COL_VENDAS.DESC]?.v || "";
      const local = (r?.c?.[COL_VENDAS.LOCAL]?.v || "OUTROS").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const qtd = Number(r?.c?.[COL_VENDAS.QTD]?.v) || 0;

      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      if (!desc && skuToDesc[sku]) desc = skuToDesc[sku];
      if (!sku && !desc) return;
      if (!desc) desc = `SKU: ${sku}`;

      const parsed = parseProductDescription(desc, sku);
      const prodKey = `${parsed.baseTitle}|${local}`;

      if (!agrupado[prodKey]) {
        agrupado[prodKey] = {
          descricao: parsed.baseTitle,
          local,
          valorEstoque: 0,
          estoqueTotal: 0,
          vendasTotal: 0,
          caminhoTotal: 0,
          reposicaoTotal: 0,
          id: prodKey,
          cores: {}
        };
      }

      agrupado[prodKey].vendasTotal += qtd;

      const corKey = parsed.color || 'SEM COR';
      if (!agrupado[prodKey].cores[corKey]) {
        agrupado[prodKey].cores[corKey] = {
          cor: corKey,
          totalEstoque: 0,
          totalCaminho: 0,
          totalVendas: 0,
          totalReposicao: 0,
          variacoes: {}
        };
      }

      const varKey = `${sku}|${parsed.size}`;
      if (!agrupado[prodKey].cores[corKey].variacoes[varKey]) {
        agrupado[prodKey].cores[corKey].variacoes[varKey] = {
          sku,
          skuPlat: skuPlat,
          estoque: 0,
          vendas: 0,
          aCaminho: 0,
          color: corKey,
          size: parsed.size
        };
      }
      agrupado[prodKey].cores[corKey].variacoes[varKey].vendas += qtd;
      if (skuPlat && !agrupado[prodKey].cores[corKey].variacoes[varKey].skuPlat) {
        agrupado[prodKey].cores[corKey].variacoes[varKey].skuPlat = skuPlat;
      }
    });

    let linhas = Object.values(agrupado).map(prod => {
      let localACaminho = 0;
      let localReposicao = 0;

      const coresArray = Object.values(prod.cores).map(corObj => {
        let corACaminho = 0;
        let corReposicao = 0;

        const variacoesArray = Object.values(corObj.variacoes).map(v => {
          const aCaminho = aCaminhoMap[prod.local]?.[v.sku] || 0;
          localACaminho += aCaminho;
          corACaminho += aCaminho;
          v.aCaminho = aCaminho;

          const media = v.vendas / diasPeriodo;
          const repo = Math.round((media * diasCobertura) - v.estoque - aCaminho);
          const finalRepo = repo > 0 ? repo : 0;
          localReposicao += finalRepo;
          corReposicao += finalRepo;
          v.reposicaoSugerida = finalRepo;

          v.cobertura = media > 0 ? v.estoque / media : (v.vendas > 0 ? 0 : -1);
          v.isBad = badStockRows.some(bs => String(bs?.c?.[COL_BADSTOCK.SKU]?.v || "").trim().toLowerCase() === v.sku.toLowerCase() && (bs?.c?.[COL_BADSTOCK.LOCAL]?.v || "").trim().toUpperCase() === prod.local);
          v.isRuptura = v.estoque === 0 && v.vendas > 0;

          return v;
        });

        const sizeWeights = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'XG': 6, 'XXG': 7, 'U': 99, 'ÚNICO': 99, 'UNICO': 99 };
        variacoesArray.sort((a, b) => {
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

        corObj.variacoes = variacoesArray;
        corObj.totalEstoque = variacoesArray.reduce((acc, v) => acc + v.estoque, 0);
        corObj.totalCaminho = corACaminho;
        corObj.totalVendas = variacoesArray.reduce((acc, v) => acc + v.vendas, 0);
        corObj.totalReposicao = corReposicao;

        return corObj;
      });

      prod.caminhoTotal = localACaminho;
      prod.reposicaoTotal = localReposicao;
      prod.cores = coresArray;

      const mediaLocal = prod.vendasTotal / diasPeriodo;
      prod.cobertura = mediaLocal > 0 ? prod.estoqueTotal / mediaLocal : -1;

      return prod;
    });

    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      linhas = linhas.filter(item => {
        const descLower = item.descricao.toLowerCase();
        const localLower = item.local.toLowerCase();
        const skuMatch = item.cores.some(c => 
          c.variacoes.some(v => 
            v.sku.toLowerCase().includes(termos[0]) || 
            (v.skuPlat && v.skuPlat.toLowerCase().includes(termos[0]))
          )
        );

        return termos.every(termo => 
          descLower.includes(termo) || 
          localLower.includes(termo) || 
          skuMatch
        );
      });
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

    const totalGeralEstoque = linhas.reduce((acc, l) => acc + l.estoqueTotal, 0);
    const totalGeralValor = linhas.reduce((acc, l) => acc + l.valorEstoque, 0);
    const totalGeralSkus = linhas.reduce((acc, l) => acc + l.cores.reduce((sum, c) => sum + c.variacoes.length, 0), 0);

    return { 
      linhas, 
      totalGeralEstoque, 
      totalGeralValor, 
      totalGeralSkus,
      dataEstoque,
      dataVendas
    };
  }, [estoqueRows, vendasRows, badStockRows, data.caminho, dataIni, dataFim, diasCobertura, selectedCompany, busca, sortConfig]);

  const addToCart = (skuObj, localObj, customRepo) => {
    if (carrinho.find(c => c.sku === skuObj.sku && c.local === localObj.local)) return alert("Já está no carrinho!");
    setCarrinho(prev => [...prev, {
      produto: skuObj.color && skuObj.color !== 'SEM COR' ? `${localObj.descricao} ${skuObj.color}` : localObj.descricao, 
      local: localObj.local, 
      sku: skuObj.sku, 
      estoque: skuObj.estoque,
      vendas: skuObj.vendas, 
      cobertura: skuObj.cobertura === -1 ? "∞" : Math.round(skuObj.cobertura), 
      reposicao: customRepo
    }]);
  };

  const addAll = (localObj) => {
    const novos = [];
    localObj.cores.forEach(corObj => {
      corObj.variacoes.forEach(s => {
        if (!carrinho.find(c => c.sku === s.sku && c.local === localObj.local)) {
          novos.push({
            produto: s.color && s.color !== 'SEM COR' ? `${localObj.descricao} ${s.color}` : localObj.descricao, 
            local: localObj.local, 
            sku: s.sku, 
            estoque: s.estoque,
            vendas: s.vendas, 
            cobertura: s.cobertura === -1 ? "∞" : Math.round(s.cobertura), 
            reposicao: s.reposicaoSugerida
          });
        }
      });
    });
    if (novos.length) setCarrinho(p => [...p, ...novos]);
  };

  if (loading) return <div className="header-main"><h1>Carregando dados das planilhas...</h1></div>;
  if (error) return <div style={{ color: 'red', padding: '40px' }}>Erro: {error}</div>;

  const totalPaginas = dadosProcessados && busca.trim() ? Math.ceil(dadosProcessados.linhas.length / itensPorPagina) : 0;
  const linhasPaginadas = dadosProcessados && busca.trim() ? dadosProcessados.linhas.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-main" style={{ paddingBottom: '100px' }}>
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1>Análise de Produto</h1>
          <p>Análise de vendas, cobertura de estoque e sugestão de reposição inteligente</p>
          {busca.trim() && dadosProcessados && (
            <HeaderDates dataEstoque={dadosProcessados.dataEstoque} dataVendas={dadosProcessados.dataVendas} />
          )}
        </div>
        <button
          onClick={() => setIsCartOpen(true)}
          style={{ background: '#334155', color: 'white', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <ShoppingCart size={18} /> Carrinho ({carrinho.length})
        </button>
      </div>

      <div className="filters-container" style={{ marginBottom: '30px' }}>
        <CompanySelector />
        
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>BUSCA (PRODUTO, LOCAL OU SKU)</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="input-padrao" 
              style={{ width: '100%', paddingLeft: '42px' }} 
              placeholder="Digite para buscar..." 
              value={busca} 
              onChange={e => setBusca(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ flex: '1 1 250px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>PERÍODO VENDAS</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date" className="input-padrao" style={{ flex: 1 }} value={dataIni} onChange={e => setDataIni(e.target.value)} />
            <input type="date" className="input-padrao" style={{ flex: 1 }} value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>

        <div style={{ flex: '0 0 120px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>DIAS ALVO</label>
          <input type="number" className="input-padrao" style={{ width: '100%' }} value={diasCobertura} onChange={e => setDiasCobertura(Number(e.target.value))} />
        </div>
      </div>

      {busca.trim() && dadosProcessados ? (
        <>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px', background: 'white', padding: '20px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ESTOQUE FÍSICO</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#334155', marginTop: '4px' }}>{dadosProcessados.totalGeralEstoque.toLocaleString('pt-BR')} un</div>
            </div>
            <div style={{ flex: '1 1 150px', background: 'white', padding: '20px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL SKUs</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{dadosProcessados.totalGeralSkus.toLocaleString('pt-BR')}</div>
            </div>
            <div style={{ flex: '1 1 200px', background: 'white', padding: '20px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VALOR TOTAL ESTOQUE</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{dadosProcessados.totalGeralValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>

          <MobileTable
            columns={[
              {
                key: 'descricao',
                label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Produto {getSortIcon('descricao')}</div>,
                rawLabel: 'Produto',
                render: (row) => <span style={{ fontWeight: 600, color: '#1e293b' }}>{toTitleCase(row.descricao)}</span>,
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
                key: 'valorEstoque',
                label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Valor Estoque {getSortIcon('valorEstoque')}</div>,
                rawLabel: 'Valor Estoque',
                render: (row) => row.valorEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                onSort: () => requestSort('valorEstoque'),
              },
              {
                key: 'estoqueTotal',
                label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Estoque {getSortIcon('estoqueTotal')}</div>,
                rawLabel: 'Estoque',
                render: (row) => `${row.estoqueTotal} un`,
                onSort: () => requestSort('estoqueTotal'),
              },
              {
                key: 'caminhoTotal',
                label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>A Caminho {getSortIcon('caminhoTotal')}</div>,
                rawLabel: 'A Caminho',
                render: (row) => row.caminhoTotal > 0 ? <span style={{ fontWeight: 600, color: '#3b82f6' }}>{row.caminhoTotal} un</span> : '-',
                onSort: () => requestSort('caminhoTotal'),
              },
              {
                key: 'vendasTotal',
                label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Vendas {getSortIcon('vendasTotal')}</div>,
                rawLabel: 'Vendas',
                render: (row) => `${row.vendasTotal} un`,
                onSort: () => requestSort('vendasTotal'),
              },
              {
                key: 'cobertura',
                label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Cobertura {getSortIcon('cobertura')}</div>,
                rawLabel: 'Cobertura',
                render: (row) => row.cobertura === -1 ? '∞' : `${Math.round(row.cobertura)} dias`,
                onSort: () => requestSort('cobertura'),
              },
              {
                key: 'reposicaoTotal',
                label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Reposição Sugerida {getSortIcon('reposicaoTotal')}</div>,
                rawLabel: 'Reposição Sugerida',
                render: (row) => <span style={{ fontWeight: 700, color: row.reposicaoTotal > 0 ? '#e74c3c' : '#64748b' }}>{row.reposicaoTotal || '-'}</span>,
                onSort: () => requestSort('reposicaoTotal'),
              },
              {
                key: 'acoes',
                label: 'Ações',
                render: (row) => (
                  <button 
                    className="btn-padrao" 
                    onClick={e => { e.stopPropagation(); addAll(row); }}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <ShoppingCart size={13} /> Todos
                  </button>
                )
              }
            ]}
            rows={linhasPaginadas}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
            isExpanded={(row) => expandedId === row.id}
            renderExpandedDesktop={(row) => (
              <div style={{ padding: '20px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {row.cores.map((corObj) => (
                  <div key={corObj.cor} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                    {/* Cabeçalho da Cor */}
                    <div style={{ padding: '12px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🎨</span>
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cor: {corObj.cor || 'Sem Cor'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', background: '#eff6ff', padding: '4px 10px', borderRadius: '20px', border: '1px solid #dbeafe' }}>
                          Estoque: {corObj.totalEstoque} un
                        </span>
                        {corObj.totalCaminho > 0 && (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                            A Caminho: {corObj.totalCaminho} un
                          </span>
                        )}
                        <span style={{ fontSize: '12px', fontWeight: 600, color: corObj.totalReposicao > 0 ? '#ef4444' : '#64748b', background: corObj.totalReposicao > 0 ? '#fef2f2' : '#f8fafc', padding: '4px 10px', borderRadius: '20px', border: corObj.totalReposicao > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}>
                          Sugestão: {corObj.totalReposicao} un
                        </span>
                      </div>
                    </div>
                    
                    {/* Tabela de Variações */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '120px', background: '#fafafa' }}>Tamanho</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>SKU</th>
                          <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>Estoque</th>
                          <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>A Caminho</th>
                          <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>Vendas</th>
                          <th style={{ padding: '10px 20px', textAlign: 'center', fontWeight: 600, color: '#64748b', background: '#fafafa' }}>Cobertura</th>
                          <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', width: '180px', background: '#fafafa' }}>Add Reposição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {corObj.variacoes.map((s) => (
                          <SkuRow key={`${row.local}-${s.sku}`} s={s} loc={row} addToCart={addToCart} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
            renderExpanded={(row) => (
              <div style={{ padding: '16px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {row.cores.map((corObj) => (
                  <div key={corObj.cor} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    {/* Cabeçalho Cor Mobile */}
                    <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px', textTransform: 'uppercase' }}>🎨 Cor: {corObj.cor || 'Sem Cor'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '12px' }}>
                        {corObj.totalEstoque} un
                      </span>
                    </div>

                    {/* Lista de Variações Mobile */}
                    <div style={{ padding: '0 14px' }}>
                      {corObj.variacoes.map((s, sIdx, arr) => (
                        <div key={s.sku} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: sIdx === arr.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', minWidth: '28px', padding: '3px 6px', borderRadius: '5px', textAlign: 'center', fontSize: '12px' }}>
                                {s.size || 'U'}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '11px' }}>{s.sku}</span>
                                {s.skuPlat && s.skuPlat !== s.sku && (
                                  <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '10px' }}>Plat: {s.skuPlat}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {s.isRuptura && <span style={{ fontSize: '10px', color: '#ef4444', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>🔴 Ruptura</span>}
                              {s.isBad && <span style={{ fontSize: '10px', color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>⛔ Bad</span>}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', textAlign: 'center', fontSize: '11px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '9px', fontWeight: 600 }}>ESTOQUE</div>
                              <div style={{ fontWeight: 600, color: '#334155' }}>{s.estoque}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '9px', fontWeight: 600 }}>A CAMINHO</div>
                              <div style={{ fontWeight: 600, color: s.aCaminho > 0 ? '#3b82f6' : '#94a3b8' }}>{s.aCaminho > 0 ? s.aCaminho : '-'}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '9px', fontWeight: 600 }}>VENDAS</div>
                              <div style={{ fontWeight: 600, color: '#334155' }}>{s.vendas}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '9px', fontWeight: 600 }}>COBERTURA</div>
                              <div style={{ fontWeight: 600, color: '#334155' }}>{s.cobertura === -1 ? '∞' : Math.round(s.cobertura)}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <input
                              type="number"
                              className="input-padrao"
                              style={{ flex: 1, padding: '4px 8px', minHeight: '32px', fontSize: '12px' }}
                              defaultValue={s.reposicaoSugerida}
                              id={`mob-repo-${row.local}-${s.sku}`}
                            />
                            <button
                              className="btn-padrao"
                              style={{ padding: '4px 10px', flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '32px', fontSize: '12px' }}
                              onClick={() => {
                                const val = Number(document.getElementById(`mob-repo-${row.local}-${s.sku}`)?.value || 0);
                                addToCart(s, row, val);
                              }}
                            >
                              <ShoppingCart size={12} /> Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                  <ChevronRight size={20} color={currentPage === 1 ? '#94a3b8' : '#0f172a'} style={{ transform: 'rotate(180deg)' }} />
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
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1', padding: '40px', textAlign: 'center', margin: '20px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔎</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#334155', margin: '0 0 8px 0' }}>Análise de Produto</h3>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: 0 }}>
            Digite no campo de busca acima para carregar e analisar as informações do produto desejado.
          </p>
        </div>
      )}

      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '800px', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Carrinho de Reposição ({carrinho.length})</h2>
              <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Produto</th><th>Local</th><th>SKU</th><th>Reposição</th><th></th></tr></thead>
                <tbody>
                  {carrinho.map((item, i) => (
                    <tr key={i}><td>{toTitleCase(item.produto)}</td><td>{item.local}</td><td>{item.sku}</td><td style={{ fontWeight: 'bold', color: '#e74c3c' }}>{item.reposicao}</td><td><button onClick={() => setCarrinho(p => p.filter((_, idx) => idx !== i))}>❌</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-padrao" style={{ background: '#10b981', color: 'white' }} onClick={() => {
                handleExport('xlsx', "Carrinho_Reposicao", ["Produto", "Local", "SKU", "Estoque", "Vendas", "Cobertura", "Reposição"], carrinho.map(i => [i.produto, i.local, i.sku, i.estoque, i.vendas, i.cobertura, i.reposicao]));
                setCarrinho([]); setIsCartOpen(false);
              }}>Exportar Excel</button>
              <button className="btn-padrao" onClick={() => setIsCartOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
