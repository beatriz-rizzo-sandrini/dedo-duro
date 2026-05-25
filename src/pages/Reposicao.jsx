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
import { parseProductDescription } from '../utils/productParser';
import MobileTable from '../components/MobileTable';

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

      const parsed = parseProductDescription(descricao, sku);
      const colorPart = parsed.color && parsed.color !== 'SEM COR' ? ` ${parsed.color}` : '';
      const sizePart = parsed.size && parsed.size !== 'U' ? ` Tam ${parsed.size}` : '';
      const cleanDesc = `${parsed.baseTitle}${colorPart}${sizePart}`;

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
    });

    let envios = Object.values(agrupadoEnvio);

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

  const handleExportData = (type, mode = 'detalhado') => {
    if (mode === 'resumido') {
      const headers = ["Local de Destino", "Envio (NF)", "Status", "Previsão", "Quantidade Total"];
      const exportData = dadosProcessados.envios.map(item => [
        item.local,
        item.envio,
        item.status,
        item.previsao,
        item.total
      ]);
      handleExport(type, "Relatorio_Reposicao_Resumido", headers, exportData);
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
                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>EXPORTAR RESUMIDO (LOTES)</div>
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

      <MobileTable
        columns={[
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
        ]}
        rows={linhasPaginadas}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setExpandedEnvio(expandedEnvio === row.id ? null : row.id)}
        isExpanded={(row) => expandedEnvio === row.id}
        renderExpandedDesktop={(env) => (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.values(env.modelos).map((model) => (
                <div key={model.baseTitle} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden', padding: '16px' }}>
                  {/* Cabeçalho do Modelo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>👟</span>
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
                            <span style={{ fontSize: '14px' }}>🎨</span>
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
                            {corObj.variacoes.map((v, idx) => (
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
              ))}
            </div>
          </motion.div>
        )}
        renderExpanded={(env) => (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.values(env.modelos).map((model) => (
                <div key={model.baseTitle} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  {/* Cabeçalho do Modelo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{toTitleCase(model.baseTitle)}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#8b5cf6', background: '#f5f3ff', padding: '2px 8px', borderRadius: '12px' }}>
                      {model.total} peças
                    </span>
                  </div>

                  {/* Cores */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.values(model.cores).map((corObj) => (
                      <div key={corObj.cor} style={{ border: '1px solid #f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>🎨 Cor: {corObj.cor || 'Sem Cor'}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563' }}>{corObj.total} un</span>
                        </div>
                        <div style={{ padding: '0 10px' }}>
                          {corObj.variacoes.map((v, idx, arr) => (
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
