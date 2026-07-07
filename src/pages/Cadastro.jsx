import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, ClipboardCopy, CheckCircle, RefreshCw, FileText, Settings, HelpCircle, Plus, Trash2, Palette } from 'lucide-react';
import { toTitleCase } from '../utils/stringUtils';

// Standard color list from the official guidelines
const DEFAULT_STANDARD_COLORS = {
  'PRETO': 'PTO',
  'BRANCO': 'BCO',
  'CINZA': 'CZ',
  'AZUL': 'AZ',
  'MARINHO': 'MAR',
  'DOURADO': 'DORD',
  'SORTIDO': 'SORT',
  'VERMELHO': 'VM',
  'VERDE': 'VD',
  'ROSA': 'RS',
  'AMARELO': 'AM',
  'GRAFITE': 'GRF',
  'PRATA': 'PRT',
  'NUDE': 'BGE',
  'BEGE': 'BGE',
  'CAQUI': 'CAQ',
  'CÁQUI': 'CAQ',
  'TERRACOTA': 'TC',
  'OCRE': 'OC',
  'VERDE CLARO': 'VDC',
  'VERDE MILITAR': 'VDM'
};

// Initial synonym mapping for specific supplier colors
const DEFAULT_COLOR_SYNONYMS = {
  'FLAMINGO SCARLET': 'VERMELHO',
  'FLAMENGOSCARLET': 'VERMELHO',
  'SCARLET': 'VERMELHO',
  'PÊSSEGO': 'AMARELO',
  'PESSEGO': 'AMARELO',
  'PEACH': 'AMARELO',
  'OFF WHITE': 'BRANCO',
  'OFF-WHITE': 'BRANCO',
  'OFW': 'BRANCO',
  'BLACK': 'PRETO',
  'WHITE': 'BRANCO',
  'GREY': 'CINZA',
  'BLUE': 'AZUL',
  'RED': 'VERMELHO',
  'GREEN': 'VERDE',
  'PINK': 'ROSA',
  'NAVY': 'MARINHO',
  'MILITAR': 'VERDE MILITAR',
  'MUSTARD': 'AMARELO',
  'MOSTARDA': 'AMARELO',
  'ROXO': 'AZUL' // standard color group mapping example
};

export default function Cadastro() {
  const [activeTab, setActiveTab] = useState('assistente');
  const [rawInput, setRawInput] = useState('');
  
  // Fields for manual correction & real-time preview
  const [tipo, setTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [cores, setCores] = useState('');
  const [tamanho, setTamanho] = useState('');

  // Color synonyms state
  const [synonyms, setSynonyms] = useState(() => {
    const saved = localStorage.getItem('__dedo_duro_color_synonyms__');
    return saved ? JSON.parse(saved) : DEFAULT_COLOR_SYNONYMS;
  });

  const [newSynKey, setNewSynKey] = useState('');
  const [newSynVal, setNewSynVal] = useState('PRETO');

  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedSku, setCopiedSku] = useState(false);

  useEffect(() => {
    localStorage.setItem('__dedo_duro_color_synonyms__', JSON.stringify(synonyms));
  }, [synonyms]);

  // Main Parsing Logic
  const handleParse = (text) => {
    if (!text) return;
    
    let workingText = text.trim().replace(/\s+/g, ' ');
    const upperText = workingText.toUpperCase();

    // 1. Identify "Tamanho"
    let parsedSize = '';
    const sizeRegex = /\b(?:TAM\.?|TAMANHO|Tam:?|tam\.?|Tamanho|CORL)\s*(GG|XG|EGG|EG|XXG|XGG|XP|XM|G\d|[GPM]|\d+(?:\/\d+)?)\b/i;
    const sizeMatch = workingText.match(sizeRegex);
    if (sizeMatch) {
      parsedSize = sizeMatch[1].toUpperCase();
      workingText = workingText.replace(sizeRegex, '');
    } else {
      const endSizeRegex = /\b(G\d|GG|XG|EGG|EG|XXG|XGG|XP|XM|[GPM]|\d{2}(?:\/\d{2})?)$/i;
      const endSizeMatch = workingText.match(endSizeRegex);
      if (endSizeMatch) {
        parsedSize = endSizeMatch[1].toUpperCase();
        workingText = workingText.replace(endSizeRegex, '');
      }
    }
    if (!parsedSize) parsedSize = 'U';

    // 2. Identify "Referência" (Codes like F02TR00072, U01FB00454, 016RPB21, or terms in parenthesis)
    let parsedRef = '';
    const refRegex = /\b([A-Z]\d{2}[A-Z]{1,2}\d{3,5}|\d{2,3}[A-Z]{2,3}\d{2,3}|[A-Z]{2,3}\d{2,5})\b/i;
    const parenRefRegex = /\(([^)]+)\)/;
    
    const parenMatch = workingText.match(parenRefRegex);
    if (parenMatch) {
      parsedRef = parenMatch[1].trim().toUpperCase();
      workingText = workingText.replace(parenRefRegex, '');
    } else {
      const refMatch = workingText.match(refRegex);
      if (refMatch) {
        parsedRef = refMatch[1].toUpperCase();
        workingText = workingText.replace(refRegex, '');
      }
    }

    // 3. Identify "Marca"
    let parsedMarca = '';
    const marcasConhecidas = ['FILA', 'ADIDAS', 'NEW BALANCE', 'OLYMPIKUS', 'PUMA', 'UMBRO', 'SANDRINI', 'RVL', 'BIBI', 'KLIN'];
    for (const m of marcasConhecidas) {
      const mRegex = new RegExp(`\\b${m}\\b`, 'i');
      if (mRegex.test(workingText)) {
        parsedMarca = m;
        workingText = workingText.replace(mRegex, '');
        break;
      }
    }

    // 4. Identify "Tipo"
    let parsedTipo = '';
    const tiposConhecidos = [
      { term: 'TENIS', output: 'Tenis' },
      { term: 'TÊNIS', output: 'Tenis' },
      { term: 'CHUTEIRA', output: 'Chuteira' },
      { term: 'CHINELO', output: 'Chinelo' },
      { term: 'SAPATENIS', output: 'Sapatenis' },
      { term: 'SAPATÊNIS', output: 'Sapatenis' },
      { term: 'SANDALIA', output: 'Sandalia' },
      { term: 'SANDÁLIA', output: 'Sandalia' },
      { term: 'BOTA', output: 'Bota' },
      { term: 'CAMISETA REGATA', output: 'Camiseta Regata' },
      { term: 'REGATA', output: 'Camiseta Regata' },
      { term: 'CAMISETA', output: 'Camiseta' },
      { term: 'CAMISA', output: 'Camiseta' },
      { term: 'SHORTS', output: 'Shorts' },
      { term: 'SHORT', output: 'Shorts' },
      { term: 'CALÇA', output: 'Calça' },
      { term: 'CALCA', output: 'Calça' },
      { term: 'CUECA', output: 'Cueca' },
      { term: 'MEIA', output: 'Meia' }
    ];

    // Check if it is a Kit first
    const isKit = /\bKIT\s*(\d*)\b/i.test(workingText);
    let kitQty = '';
    if (isKit) {
      const qtyMatch = workingText.match(/\bKIT\s*(\d+)\b/i);
      kitQty = qtyMatch ? qtyMatch[1] : '';
      workingText = workingText.replace(/\bKIT\s*(\d*)\b/i, '');
    }

    for (const t of tiposConhecidos) {
      const tRegex = new RegExp(`\\b${t.term}\\b`, 'i');
      if (tRegex.test(workingText)) {
        parsedTipo = t.output;
        workingText = workingText.replace(tRegex, '');
        break;
      }
    }
    if (isKit) {
      parsedTipo = `Kit ${kitQty || 'X'} ${parsedTipo || 'Unidades'}`.trim();
    }

    // 5. Identify "Cores"
    const foundColors = [];
    const words = workingText.toUpperCase().split(/[\s,;/-]+/);
    
    // Look for synonyms or direct colors in standard
    const allKnownColors = { ...synonyms, ...DEFAULT_STANDARD_COLORS };
    
    words.forEach(w => {
      if (!w) return;
      // Check multi-word matching or direct matching
      if (allKnownColors[w]) {
        const stdColor = allKnownColors[w]; // e.g. "VERMELHO" or "PTO"
        const abbr = DEFAULT_STANDARD_COLORS[stdColor] || stdColor;
        if (!foundColors.includes(abbr)) {
          foundColors.push(abbr);
        }
        // Remove word from text
        const wRegex = new RegExp(`\\b${w}\\b`, 'i');
        workingText = workingText.replace(wRegex, '');
      }
    });

    // Fallback for multi-word supplier color synonyms (e.g. Flamingo Scarlet)
    Object.keys(synonyms).forEach(syn => {
      const synRegex = new RegExp(`\\b${syn}\\b`, 'i');
      if (synRegex.test(workingText)) {
        const stdColor = synonyms[syn];
        const abbr = DEFAULT_STANDARD_COLORS[stdColor] || stdColor;
        if (!foundColors.includes(abbr)) {
          foundColors.push(abbr);
        }
        workingText = workingText.replace(synRegex, '');
      }
    });

    // 6. Modelo is the remaining clean text
    // Clean up residual dashes, commas, spaces
    let parsedModelo = workingText
      .replace(/\b(MASCULINO|MASCULINA|FEMININO|FEMININA|UNISEX|UNISSEX|INFANTIL|JUVENIL)\b/gi, '')
      .replace(/[\s\-,;:/()]+$/, '')
      .replace(/^[\s\-,;:/()]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    parsedModelo = toTitleCase(parsedModelo);

    // Update states
    setTipo(parsedTipo || 'Produto');
    setMarca(toTitleCase(parsedMarca) || 'Sandrini');
    setModelo(parsedModelo || 'Modelo');
    setReferencia(parsedRef);
    setCores(foundColors.length > 0 ? foundColors.slice(0, 3).join('/') : 'SORT');
    setTamanho(parsedSize);
  };

  useEffect(() => {
    handleParse(rawInput);
  }, [rawInput]);

  // Output Standardized Text
  const formatStandardDescription = () => {
    const refPart = referencia ? ` (${referencia})` : '';
    const colorPart = cores ? ` ${cores.toUpperCase()}` : '';
    const sizePart = tamanho ? ` Tam ${tamanho.toUpperCase()}` : '';
    return `${tipo} ${marca} ${modelo}${refPart}${colorPart}${sizePart}`.replace(/\s+/g, ' ').trim();
  };

  // Sugerir SKU para Cadastro
  const suggestSKU = () => {
    if (!modelo || !marca) return 'SA0000000000000000000000';
    
    // Extrar modelo numérico ou gerar abreviação
    const digitsMatch = modelo.match(/\d+/);
    let modelCode = digitsMatch ? digitsMatch[0] : '';
    if (modelCode.length < 4) {
      modelCode = modelCode.padStart(4, '0');
    }
    
    const isSandrini = marca.toUpperCase() === 'SANDRINI';
    const prefix = isSandrini ? 'SA' : 'FL';
    
    const cleanColor = cores.split('/')[0] || 'CN';
    const cleanSize = tamanho.toUpperCase() === 'G' ? '0G' : tamanho.toUpperCase() === 'M' ? '0M' : tamanho.toUpperCase() === 'P' ? '0P' : tamanho.toUpperCase();
    
    return `${prefix}000${modelCode.substring(0, 4)}${cleanColor}CNCN0${cleanSize.substring(0, 2)}0000`.toUpperCase();
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(formatStandardDescription());
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  const handleCopySku = () => {
    navigator.clipboard.writeText(suggestSKU());
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const addSynonym = () => {
    if (!newSynKey) return;
    setSynonyms(prev => ({
      ...prev,
      [newSynKey.trim().toUpperCase()]: newSynVal.toUpperCase()
    }));
    setNewSynKey('');
  };

  const removeSynonym = (key) => {
    setSynonyms(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  return (
    <div className="header-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Cadastro de Produtos</h1>
          <p>Padronização de descrições e auxílio de cadastro (Guia Oficial)</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', paddingBottom: '1px' }}>
        <button 
          onClick={() => setActiveTab('assistente')}
          style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'assistente' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'assistente' ? '#3b82f6' : '#64748b'
          }}
        >
          <ClipboardList size={16} style={{ marginRight: '6px', display: 'inline' }} /> Assistente de Cadastro
        </button>
        <button 
          onClick={() => setActiveTab('guia')}
          style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'guia' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'guia' ? '#3b82f6' : '#64748b'
          }}
        >
          <FileText size={16} style={{ marginRight: '6px', display: 'inline' }} /> Guia de Regras
        </button>
        <button 
          onClick={() => setActiveTab('mapeador')}
          style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'mapeador' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'mapeador' ? '#3b82f6' : '#64748b'
          }}
        >
          <Settings size={16} style={{ marginRight: '6px', display: 'inline' }} /> Mapeador de Cores
        </button>
      </div>

      {/* Tab: Assistente */}
      {activeTab === 'assistente' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          
          {/* Inputs Section */}
          <div style={{ flex: '1 1 500px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              <RefreshCw size={18} color="#3b82f6" /> Entrada de Dados
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>COLE O TEXTO DA NOTA FISCAL / FORNECEDOR</label>
                <textarea 
                  placeholder="Ex: SHORT SANDRINI MASCULINO LINHO 2032VD VERDE CLARO TAM. M"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', resize: 'vertical', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>TIPO</label>
                  <input type="text" className="input-padrao" value={tipo} onChange={(e) => setTipo(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MARCA</label>
                  <input type="text" className="input-padrao" value={marca} onChange={(e) => setMarca(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MODELO</label>
                  <input type="text" className="input-padrao" value={modelo} onChange={(e) => setModelo(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>REFERÊNCIA</label>
                  <input type="text" className="input-padrao" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Opcional" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>SIGLAS DAS CORES (MAX 3 - SEP. POR BARRA)</label>
                  <input type="text" className="input-padrao" value={cores} onChange={(e) => setCores(e.target.value)} placeholder="Ex: PTO/BCO" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>TAMANHO</label>
                  <input type="text" className="input-padrao" value={tamanho} onChange={(e) => setTamanho(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Outputs Section */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Standard Title Card */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Descrição Padronizada</h3>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>
                {formatStandardDescription() || 'Aguardando entrada...'}
              </div>

              <button 
                className="btn-padrao" 
                onClick={handleCopyDescription} 
                disabled={!rawInput}
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                {copiedDesc ? <CheckCircle size={16} /> : <ClipboardCopy size={16} />}
                {copiedDesc ? 'Copiado!' : 'Copiar Descrição'}
              </button>
            </div>

            {/* Suggested SKU Card */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Sugestão de SKU (Sênior)</h3>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', color: '#475569', textAlign: 'center', letterSpacing: '1px' }}>
                {suggestSKU()}
              </div>

              <button 
                className="btn-padrao" 
                onClick={handleCopySku} 
                disabled={!rawInput}
                style={{ width: '100%', justifyContent: 'center', gap: '8px', background: '#475569', borderColor: '#475569' }}
              >
                {copiedSku ? <CheckCircle size={16} /> : <ClipboardCopy size={16} />}
                {copiedSku ? 'Copiado!' : 'Copiar SKU Sugerido'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Guia de Regras */}
      {activeTab === 'guia' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginTop: 0, color: '#1e293b', borderBottom: '2px solid #ef4444', paddingBottom: '10px' }}>Guia Oficial de Cadastro: Sandrini</h2>
          
          <div style={{ background: '#f8fafc', borderLeft: '4px solid #ef4444', padding: '16px', borderRadius: '0 8px 8px 0', margin: '20px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Por que padronizar?</strong> Nossas descrições vão para a Nota Fiscal (NF-e), E-commerce e Dashboards internos. Um padrão limpo melhora a busca dos clientes, evita problemas de logística e organiza os relatórios.
          </div>

          <h3 style={{ color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginTop: '24px' }}>1. O Template Base (Com Referência)</h3>
          <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.5px', color: '#0f172a', borderLeft: '4px solid #ef4444' }}>
            [Tipo] [Marca] [Modelo] [(Ref)] [Cores Abreviadas] Tam [Tamanho]
          </div>

          <h3 style={{ color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginTop: '30px' }}>2. Siglas das Cores Padrão (Uso Obrigatório)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Cor</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Sigla</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Cor</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Sigla</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>Preto</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>PTO</td>
                <td style={{ padding: '10px 12px' }}>Vermelho</td><td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#ef4444' }}>VM</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>Branco</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>BCO</td>
                <td style={{ padding: '10px 12px' }}>Verde</td><td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#10b981' }}>VD</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>Cinza</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>CZ</td>
                <td style={{ padding: '10px 12px' }}>Rosa</td><td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#ec4899' }}>RS</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>Azul</td><td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#3b82f6' }}>AZ</td>
                <td style={{ padding: '10px 12px' }}>Amarelo</td><td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#f59e0b' }}>AM</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>Marinho</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>MAR</td>
                <td style={{ padding: '10px 12px' }}>Grafite</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>GRF</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>Dourado</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>DORD</td>
                <td style={{ padding: '10px 12px' }}>Prata</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>PRT</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>Sortido</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>SORT</td>
                <td style={{ padding: '10px 12px' }}>Nude / Bege</td><td style={{ padding: '10px 12px', fontWeight: 'bold' }}>BGE</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginTop: '30px' }}>3. Regras de Ouro</h3>
          <ul style={{ paddingLeft: '20px', lineHeight: '2', color: '#475569', fontSize: '13.5px' }}>
            <li><strong>Ordem das Palavras:</strong> Sempre inicie com o Tipo do produto, seguido pela Marca e depois o Modelo (ex: <code>Tenis Fila Ride 2</code>, nunca <code>Fila Tenis...</code>).</li>
            <li><strong>Código de Referência:</strong> Deve ser colocado após o modelo em parênteses (ex: <code>Tenis Fila Ride 2 (F02TR00072)</code>).</li>
            <li><strong>Cores Limites:</strong> No máximo 3 cores, separadas por barra literal (ex: <code>PTO/BCO/VM</code>). Evite usar conjunções como "e".</li>
            <li><strong>Tamanho:</strong> Deve estar obrigatoriamente no final da string precedido por "Tam " (ex: <code>Tam 42</code> ou <code>Tam GG</code>).</li>
            <li><strong>Caixa Alta:</strong> É expressamente proibido usar textos totalmente em maiúsculas (ex: <code>Tenis Fila Ride</code>, nunca <code>TENIS FILA RIDE</code>). Apenas marcas abreviadas como NB podem ficar em caixa alta.</li>
            <li><strong>Kits:</strong> Indique a quantidade de itens no início do nome (ex: <code>Kit 12 Cuecas Boxer RVL (016RPB21) SORT Tam GG</code>).</li>
          </ul>
        </div>
      )}

      {/* Tab: Mapeador de Cores */}
      {activeTab === 'mapeador' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          
          {/* Add Synonym Form */}
          <div style={{ flex: '1 1 300px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>Cadastrar Equivalência</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>Adicione mapeamentos de cores fornecidas pela nota fiscal que devem se tornar cores padrão no sistema.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>COR DO FORNECEDOR (EX: FLAMINGO SCARLET)</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  placeholder="Ex: FLAMINGO SCARLET"
                  value={newSynKey}
                  onChange={(e) => setNewSynKey(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>COR PADRÃO DESEJADA</label>
                <select 
                  className="input-padrao"
                  value={newSynVal}
                  onChange={(e) => setNewSynVal(e.target.value)}
                  style={{ background: 'white' }}
                >
                  {Object.keys(DEFAULT_STANDARD_COLORS).filter(c => c === c.toUpperCase()).map(c => (
                    <option key={c} value={c}>{c} ({DEFAULT_STANDARD_COLORS[c]})</option>
                  ))}
                </select>
              </div>

              <button className="btn-padrao" onClick={addSynonym} style={{ width: '100%', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                <Plus size={16} /> Adicionar Regra
              </button>
            </div>
          </div>

          {/* List of Custom Synonyms */}
          <div style={{ flex: '1 1 500px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '16px' }}>Tabela de Equivalência Ativa</h3>
            
            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Cor no Fornecedor</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Cor Padronizada</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '80px' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(synonyms).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 600 }}>{k}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                          {v} ({DEFAULT_STANDARD_COLORS[v] || v})
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button 
                          onClick={() => removeSynonym(k)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
