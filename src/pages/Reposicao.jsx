import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet } from 'lucide-react';
import Select from 'react-select';
import { handleExport } from '../utils/exportUtils';
import { toTitleCase } from '../utils/stringUtils';
import { useCompany } from '../contexts/CompanyContext.jsx';
import CompanySelector from '../components/CompanySelector';
import { COL_CAMINHO } from '../utils/sheetColumns';

export default function Reposicao() {
  const { data, loading, error } = useData();
  const { selectedCompany } = useCompany();
  const caminhoRows = data.caminho || [];
  
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [busca, setBusca] = useState('');
  
  const [expandedEnvio, setExpandedEnvio] = useState(null);
  const [expandedDesc, setExpandedDesc] = useState(null);
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

  const dadosProcessados = useMemo(() => {
    if (!caminhoRows.length) return { envios: [], totalGeral: 0 };
    
    // Optional: SKU to Desc map if some descriptions are missing (using only 'caminho' for now, could use others if needed)
    const skuToDesc = {};
    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      const desc = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      if (sku && desc) skuToDesc[sku] = desc;
    });

    let totalGeral = 0;
    const agrupadoEnvio = {};

    const inicioTime = dataIni ? new Date(`${dataIni}T00:00:00`).getTime() : 0;
    const fimTime = dataFim ? new Date(`${dataFim}T23:59:59`).getTime() : Infinity;

    caminhoRows.forEach(r => {
      const sku = r?.c?.[COL_CAMINHO.SKU]?.v || "";
      let descricao = r?.c?.[COL_CAMINHO.DESC]?.v || "";
      const local = String(r?.c?.[COL_CAMINHO.LOCAL]?.v ?? "").toUpperCase().trim();
      const loja = local.includes("BUY CLOCK") ? "BUY CLOCK" : "SANDRINI";
      const quantidade = r?.c?.[COL_CAMINHO.QTD]?.v || 0;
      const status = String(r?.c?.[COL_CAMINHO.STATUS]?.v ?? "").toUpperCase().trim();
      
      if (selectedCompany !== 'TODAS' && loja !== selectedCompany) return;
      
      if (!descricao && skuToDesc[sku]) descricao = skuToDesc[sku];
      if (!sku && !descricao) return;
      if (!descricao) descricao = `SKU: ${sku}`;

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

      if (filtroLocal && local !== filtroLocal) return;
      if (filtroStatus && status !== filtroStatus) return;
      if (inicioTime && previsaoTime && previsaoTime < inicioTime) return;
      if (fimTime !== Infinity && previsaoTime && previsaoTime > fimTime) return;

      totalGeral += quantidade;

      const chaveEnvio = `${local}||${envio}||${status}||${previsao}`;

      if (!agrupadoEnvio[chaveEnvio]) {
        agrupadoEnvio[chaveEnvio] = { id: chaveEnvio, local, envio, status, previsao, total: 0, descricoes: {} };
      }
      agrupadoEnvio[chaveEnvio].total += quantidade;

      if (!agrupadoEnvio[chaveEnvio].descricoes[descricao]) {
        agrupadoEnvio[chaveEnvio].descricoes[descricao] = { descricao, total: 0, skus: [] };
      }
      agrupadoEnvio[chaveEnvio].descricoes[descricao].total += quantidade;
      agrupadoEnvio[chaveEnvio].descricoes[descricao].skus.push({ sku, quantidade, status, previsao });
    });

    let envios = Object.values(agrupadoEnvio);

    if (busca) {
      const termos = busca.toLowerCase().trim().split(/\s+/);
      envios = envios.filter(env => {
        let matches = false;
        const envioLower = (env.envio || "").toLowerCase();
        
        Object.values(env.descricoes).forEach(desc => {
          const descLower = (desc.descricao || "").toLowerCase();
          const skusArray = desc.skus.map(s => (s.sku || "").toLowerCase());
          
          const thisDescMatches = termos.every(termo => 
            envioLower.includes(termo) ||
            descLower.includes(termo) || 
            skusArray.some(sku => sku.includes(termo))
          );
          if (thisDescMatches) matches = true;
        });
        return matches;
      });
    }

    if (sortConfig.key) {
      envios.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return { envios, totalGeral };
  }, [caminhoRows, filtroLocal, filtroStatus, dataIni, dataFim, busca, sortConfig, selectedCompany]);

  // Paginação
  const totalPaginas = Math.ceil(dadosProcessados.envios.length / itensPorPagina);
  const linhasPaginadas = dadosProcessados.envios.slice((currentPage - 1) * itensPorPagina, currentPage * itensPorPagina);

  const handleExportData = (type) => {
    const headers = ["SKU", "Local de Destino", "Envio (NF)", "Status", "Previsão", "Quantidade"];
    const exportData = [];
    dadosProcessados.envios.forEach(item => {
      Object.values(item.descricoes).forEach(d => {
        d.skus.forEach(s => {
          exportData.push([
            s.sku,
            item.local,
            item.envio,
            item.status,
            item.previsao,
            s.quantidade
          ]);
        });
      });
    });
    handleExport(type, "Relatorio_Reposicao", headers, exportData);
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filtroLocal, filtroStatus, dataIni, dataFim, busca, selectedCompany]);

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
        <div style={{ display: 'flex', gap: '15px' }}>
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
                  style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', minWidth: '150px' }}
                >
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => { handleExportData('csv'); setIsExportMenuOpen(false); }}>
                    <FileText size={16} color="#64748b" /> CSV
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => { handleExportData('xlsx'); setIsExportMenuOpen(false); }}>
                    <FileSpreadsheet size={16} color="#10b981" /> Excel (XLSX)
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => { handleExportData('pdf'); setIsExportMenuOpen(false); }}>
                    <FileText size={16} color="#ef4444" /> PDF
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
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>PESQUISAR (SKU OU DESCRIÇÃO)</label>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCAL / CANAL</label>
          <Select 
            options={[
              { value: '', label: 'Todos' },
              ...locais.map(l => ({ value: l, label: toTitleCase(l) }))
            ]}
            value={{ value: filtroLocal, label: filtroLocal ? toTitleCase(filtroLocal) : 'Todos' }}
            onChange={opt => setFiltroLocal(opt.value)}
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

      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('local')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Local de Destino {getSortIcon('local')}</div>
            </th>
            <th onClick={() => requestSort('envio')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Envio (NF) {getSortIcon('envio')}</div>
            </th>
            <th onClick={() => requestSort('total')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Total de Peças {getSortIcon('total')}</div>
            </th>
            <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Status {getSortIcon('status')}</div>
            </th>
            <th onClick={() => requestSort('previsao')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Previsão {getSortIcon('previsao')}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhasPaginadas.map((env, idx) => {
            const isEnvExpanded = expandedEnvio === env.id;
            return (
              <React.Fragment key={env.id}>
                <tr style={{ cursor: 'pointer', background: isEnvExpanded ? '#f8fafc' : 'transparent' }} onClick={() => setExpandedEnvio(isEnvExpanded ? null : env.id)}>
                  <td style={{ fontWeight: 600 }}>{toTitleCase(env.local)}</td>
                  <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{env.envio}</span></td>
                  <td style={{ fontWeight: 600 }}>{env.total.toLocaleString('pt-BR')}</td>
                  <td>
                    <span style={{ 
                      background: env.status.includes('CONFER') ? '#fef08a' : env.status === 'FINALIZADO' ? '#bbf7d0' : env.status === 'A CAMINHO' ? '#fecaca' : '#e2e8f0', 
                      color: env.status.includes('CONFER') ? '#a16207' : env.status === 'FINALIZADO' ? '#166534' : env.status === 'A CAMINHO' ? '#991b1b' : '#475569', 
                      padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' 
                    }}>
                      {env.status}
                    </span>
                  </td>
                  <td>{env.previsao}</td>
                </tr>
                {isEnvExpanded && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <table style={{ width: '100%', fontSize: '13px' }}>
                            <tbody>
                              {Object.values(env.descricoes).map((desc, dIdx) => {
                                const isDescExpanded = expandedDesc === `${env.id}-${desc.descricao}`;
                                return (
                                  <React.Fragment key={dIdx}>
                                    <tr style={{ cursor: 'pointer', background: '#e2e8f0' }} onClick={() => setExpandedDesc(isDescExpanded ? null : `${env.id}-${desc.descricao}`)}>
                                      <td style={{ padding: '12px 40px', fontWeight: 600, width: '40%' }}>{toTitleCase(desc.descricao)}</td>
                                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{desc.total.toLocaleString('pt-BR')} peças</td>
                                    </tr>
                                    {isDescExpanded && desc.skus.map((skuItem, sIdx) => (
                                      <tr key={sIdx}>
                                        <td style={{ padding: '8px 80px', color: '#64748b' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            SKU: <span style={{ fontWeight: 600, color: '#0f172a' }}>{skuItem.sku}</span>
                                          </div>
                                        </td>
                                        <td style={{ padding: '8px 20px' }}>{skuItem.quantidade.toLocaleString('pt-BR')} un</td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
          {linhasPaginadas.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nenhum dado encontrado para os filtros aplicados.</td>
            </tr>
          )}
        </tbody>
      </table>

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
