import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, ChevronRight, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { handleExport } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import HeaderDates from '../components/HeaderDates';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';

function SkuRow({ s, loc, addToCart }) {
  const [repoQtd, setRepoQtd] = React.useState(s.reposicaoSugerida);

  // Sincroniza quando dias alvo muda e o pai recalcula o valor sugerido
  React.useEffect(() => {
    setRepoQtd(s.reposicaoSugerida);
  }, [s.reposicaoSugerida]);

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{s.sku} {s.isRuptura && '🔴'} {s.isBad && '⛔'}</td>
      <td>{s.estoque}</td>
      <td>{s.vendas}</td>
      <td>{s.cobertura === -1 ? "∞" : Math.round(s.cobertura)}</td>
      <td>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            className="input-padrao"
            style={{ width: '70px', padding: '4px' }}
            value={repoQtd}
            onChange={e => setRepoQtd(Number(e.target.value))}
          />
          <button
            className="btn-padrao"
            style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => addToCart(s, loc.local, repoQtd)}
          >
            <ShoppingCart size={14} /> Add
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

  const [termoBusca, setTermoBusca] = useState('');
  const [skuBusca, setSkuBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  
  const [showSugestoes, setShowSugestoes] = useState(false);
  const dropdownRef = useRef(null);

  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasCobertura, setDiasCobertura] = useState(60);

  const [expandedLocal, setExpandedLocal] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowSugestoes(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!dataIni && !dataFim) {
      const hoje = new Date();
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(hoje.getDate() - 30);
      setDataFim(hoje.toISOString().split('T')[0]);
      setDataIni(trintaDiasAtras.toISOString().split('T')[0]);
    }
  }, [dataIni, dataFim]);

  const sugestoes = useMemo(() => {
    const termo = termoBusca.toLowerCase().trim();
    if (!termo) return [];
    const setSug = new Set();
    estoqueRows.forEach(r => {
      const l = (r?.c?.[3]?.v || "").toUpperCase().trim();
      const loja = l.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      const nome = (r?.c?.[2]?.v || "").toLowerCase();
      if (nome.includes(termo)) setSug.add(r?.c?.[2]?.v);
    });
    return Array.from(setSug).sort().slice(0, 50);
  }, [termoBusca, estoqueRows, selectedCompany]);

  const handleSkuSearch = (e) => {
    if (e.key === 'Enter') {
      const sku = skuBusca.trim().toUpperCase();
      const item = estoqueRows.find(r => String(r?.c?.[1]?.v || "").trim().toUpperCase() === sku);
      if (item) {
        setProdutoSelecionado(item?.c?.[2]?.v);
        setTermoBusca(item?.c?.[2]?.v);
      } else alert("SKU não encontrado.");
    }
  };

  const dadosProcessados = useMemo(() => {
    if (!produtoSelecionado || !estoqueRows.length) return null;
    const descSelecionada = produtoSelecionado.toLowerCase().trim();
    
    let diasPeriodo = 30;
    if (dataIni && dataFim) {
      diasPeriodo = (new Date(dataFim) - new Date(dataIni)) / (1000 * 60 * 60 * 24) + 1;
    }

    const skusMapByLocal = {};
    let valorTotalGeral = 0;
    const skusUnicosSet = new Set();

    // 1. Processar Estoque
    estoqueRows.forEach(r => {
      const desc = (r?.c?.[2]?.v || "").toLowerCase().trim();
      if (desc !== descSelecionada) return;

      const local = (r?.c?.[3]?.v || "OUTROS").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      const sku = String(r?.c?.[1]?.v || "");
      const qtd = r?.c?.[5]?.v || 0;
      const valor = r?.c?.[6]?.v || 0;

      if (!skusMapByLocal[local]) skusMapByLocal[local] = {};
      if (!skusMapByLocal[local][sku]) skusMapByLocal[local][sku] = { estoque: 0, vendas: 0, valor: 0 };
      
      skusMapByLocal[local][sku].estoque += qtd;
      skusMapByLocal[local][sku].valor += valor;
      valorTotalGeral += valor;
      skusUnicosSet.add(sku);
    });

    // 2. Processar Vendas
    vendasRows.forEach(r => {
      const dataStr = r?.c?.[0]?.f || "";
      if (!dataStr) return;
      const [d, m, y] = dataStr.split("/");
      const dataVenda = new Date(`${y}-${m}-${d}`);
      if (dataIni && dataFim && (dataVenda < new Date(dataIni) || dataVenda > new Date(dataFim))) return;

      const descVenda = (r?.c?.[3]?.v || "").toLowerCase().trim();
      if (descVenda !== descSelecionada) return;

      const local = (r?.c?.[1]?.v || "OUTROS").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;

      const sku = String(r?.c?.[2]?.v || "");
      const qtd = r?.c?.[4]?.v || 0;

      if (!skusMapByLocal[local]) skusMapByLocal[local] = {};
      if (!skusMapByLocal[local][sku]) skusMapByLocal[local][sku] = { estoque: 0, vendas: 0, valor: 0 };
      
      skusMapByLocal[local][sku].vendas += qtd;
    });

    const locais = Object.entries(skusMapByLocal).map(([local, skus]) => {
      let localVendas = 0, localEstoque = 0, localValor = 0, localReposicaoSugerida = 0;
      const skusArray = Object.entries(skus).map(([sku, info]) => {
        localVendas += info.vendas;
        localEstoque += info.estoque;
        localValor += info.valor;

        const media = info.vendas / diasPeriodo;
        const repo = Math.round((media * diasCobertura) - info.estoque);
        const finalRepo = repo > 0 ? repo : 0;
        localReposicaoSugerida += finalRepo;

        return {
          sku, estoque: info.estoque, vendas: info.vendas,
          cobertura: media > 0 ? info.estoque / media : (info.vendas > 0 ? 0 : -1),
          reposicaoSugerida: finalRepo,
          isBad: badStockRows.some(bs => String(bs?.c?.[1]?.v || "").trim().toLowerCase() === sku.toLowerCase() && (bs?.c?.[2]?.v || "").trim().toUpperCase() === local),
          isRuptura: info.estoque === 0 && info.vendas > 0
        };
      });

      return {
        local, valor: localValor, estoque: localEstoque, vendas: localVendas,
        cobertura: (localVendas / diasPeriodo) > 0 ? localEstoque / (localVendas / diasPeriodo) : -1,
        reposicaoSugerida: localReposicaoSugerida,
        skus: skusArray.sort((a, b) => b.vendas - a.vendas)
      };
    });

    return { locais, valorTotalGeral, skusUnicos: skusUnicosSet.size };
  }, [produtoSelecionado, estoqueRows, vendasRows, badStockRows, dataIni, dataFim, diasCobertura, selectedCompany]);

  const addToCart = (skuObj, local, customRepo) => {
    if (carrinho.find(c => c.sku === skuObj.sku && c.local === local)) return alert("Já está no carrinho!");
    setCarrinho(prev => [...prev, {
      produto: produtoSelecionado, local, sku: skuObj.sku, estoque: skuObj.estoque, 
      vendas: skuObj.vendas, cobertura: skuObj.cobertura === -1 ? "∞" : Math.round(skuObj.cobertura), reposicao: customRepo
    }]);
  };

  const addAll = (localObj) => {
    const novos = localObj.skus
      .filter(s => !carrinho.find(c => c.sku === s.sku && c.local === localObj.local))
      .map(s => ({
        produto: produtoSelecionado, local: localObj.local, sku: s.sku, estoque: s.estoque,
        vendas: s.vendas, cobertura: s.cobertura === -1 ? "∞" : Math.round(s.cobertura), reposicao: s.reposicaoSugerida
      }));
    if (novos.length) setCarrinho(p => [...p, ...novos]);
  };

  if (loading) return <div className="header-main"><h1>Carregando dados das planilhas...</h1></div>;

  return (
    <div className="header-main" style={{ paddingBottom: '100px' }}>
      <button onClick={() => setIsCartOpen(true)} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, background: '#334155', color: 'white', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
        <ShoppingCart size={20} style={{ marginRight: '8px' }} /> Carrinho ({carrinho.length})
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1>Análise de Produto</h1>
        <p>Visão detalhada de estoque e performance por SKU (Google Sheets 📊)</p>
      </div>

      <div className="filters-container" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '30px' }}>
        <CompanySelector />
        <div style={{ flex: 1.5, position: 'relative' }} ref={dropdownRef}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>BUSCAR PRODUTO</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
            <input type="text" className="input-padrao" style={{ width: '100%', paddingLeft: '42px' }} placeholder="Digite parte do nome..." value={termoBusca} onChange={e => { setTermoBusca(e.target.value); setShowSugestoes(true); }} onFocus={() => setShowSugestoes(true)} />
          </div>
          {showSugestoes && sugestoes.length > 0 && (
            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto', padding: 0, listStyle: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              {sugestoes.map((s, i) => <li key={i} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => { setProdutoSelecionado(s); setTermoBusca(s); setShowSugestoes(false); }}>{toTitleCase(s)}</li>)}
            </ul>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>BUSCAR POR SKU</label>
          <input type="text" className="input-padrao" placeholder="Aperte Enter..." value={skuBusca} onChange={e => setSkuBusca(e.target.value)} onKeyDown={handleSkuSearch} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>PERÍODO VENDAS</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date" className="input-padrao" value={dataIni} onChange={e => setDataIni(e.target.value)} />
            <input type="date" className="input-padrao" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>
        <div style={{ width: '100px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>DIAS ALVO</label>
          <input type="number" className="input-padrao" value={diasCobertura} onChange={e => setDiasCobertura(Number(e.target.value))} />
        </div>
      </div>

      {dadosProcessados && (
        <>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            <div style={{ flex: 2, background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>PRODUTO SELECIONADO</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{toTitleCase(produtoSelecionado)}</div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL SKUs</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6' }}>{dadosProcessados.skusUnicos}</div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>VALOR TOTAL</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{dadosProcessados.valorTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>LOCAL</th>
                <th>VALOR DO ESTOQUE</th>
                <th>ESTOQUE ATUAL</th>
                <th>VENDAS (31D)</th>
                <th>COBERTURA</th>
                <th>REPOSIÇÃO SUGERIDA</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {dadosProcessados.locais.map((loc, idx) => {
                const isExp = expandedLocal === loc.local;
                return (
                  <React.Fragment key={loc.local}>
                    <tr onClick={() => setExpandedLocal(isExp ? null : loc.local)} style={{ cursor: 'pointer', background: isExp ? '#f1f5f9' : 'none' }}>
                      <td style={{ fontWeight: 700 }}><ChevronRight size={18} style={{ transform: isExp ? 'rotate(90deg)' : 'none', marginRight: '8px' }} />{toTitleCase(loc.local)}</td>
                      <td>{loc.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{loc.estoque} un</td>
                      <td>{loc.vendas} un</td>
                      <td>{loc.cobertura === -1 ? "∞" : Math.round(loc.cobertura) + " dias"}</td>
                      <td style={{ fontWeight: 600, color: loc.reposicaoSugerida > 0 ? '#e74c3c' : '#64748b' }}>{loc.reposicaoSugerida || '-'}</td>
                      <td><button className="btn-padrao" onClick={e => { e.stopPropagation(); addAll(loc); }}><ShoppingCart size={14} /> Todos</button></td>
                    </tr>
                    {isExp && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ background: '#f8fafc', padding: '15px 20px', borderBottom: '2px solid #cbd5e1' }}>
                            <table style={{ width: '100%', fontSize: '13px' }}>
                              <thead><tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px' }}>SKU</th><th style={{ textAlign: 'left', padding: '8px' }}>ESTOQUE</th><th style={{ textAlign: 'left', padding: '8px' }}>VENDAS</th><th style={{ textAlign: 'left', padding: '8px' }}>COBERTURA</th><th style={{ textAlign: 'left', padding: '8px' }}>ADD REPOSIÇÃO</th></tr></thead>
                              <tbody>
                                {loc.skus.map((s, i) => (
                                  <SkuRow key={`${loc.local}-${s.sku}`} s={s} loc={loc} addToCart={addToCart} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </>
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
    </div>
  );
}
