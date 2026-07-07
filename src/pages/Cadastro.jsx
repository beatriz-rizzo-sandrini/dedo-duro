import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, ClipboardCopy, CheckCircle, FileText, Settings, Plus, Trash2, Search, HelpCircle } from 'lucide-react';

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
  'ROXO': 'AZUL'
};

// Color codes used to form the SKU
const SKU_COLOR_CODES = [
  { code: 'AA', seq: '1', color: 'Preto' },
  { code: 'AB', seq: '2', color: 'Branco' },
  { code: 'AC', seq: '3', color: 'Azul' },
  { code: 'AD', seq: '4', color: 'Marinho' },
  { code: 'AE', seq: '5', color: 'Cinza' },
  { code: 'AF', seq: '6', color: 'Vermelho' },
  { code: 'AG', seq: '7', color: 'Bege' },
  { code: 'AH', seq: '8', color: 'Marrom' },
  { code: 'AI', seq: '9', color: 'Verde Militar' },
  { code: 'AJ', seq: '10', color: 'Verde' },
  { code: 'AK', seq: '11', color: 'Bordô' },
  { code: 'AL', seq: '12', color: 'Azul Escuro' },
  { code: 'AM', seq: '13', color: 'Verde Limão' },
  { code: 'AN', seq: '14', color: 'Vinho' },
  { code: 'AO', seq: '15', color: 'Azul Claro' },
  { code: 'AP', seq: '16', color: 'Azul Royal' },
  { code: 'AQ', seq: '17', color: 'Azul Navy' },
  { code: 'AR', seq: '18', color: 'Rosa' },
  { code: 'AS', seq: '19', color: 'Rosa Claro' },
  { code: 'AT', seq: '20', color: 'Amarelo' },
  { code: 'AU', seq: '21', color: 'Amarelo Fluorescente' },
  { code: 'AV', seq: '22', color: 'Laranja' },
  { code: 'AW', seq: '23', color: 'Verde Claro' },
  { code: 'AX', seq: '24', color: 'Chocolate' },
  { code: 'AY', seq: '25', color: 'Caramelo' },
  { code: 'AZ', seq: '26', color: 'Cinza Claro' },
  { code: 'BA', seq: '27', color: 'Mescla' },
  { code: 'BB', seq: '28', color: 'Marrom Claro' },
  { code: 'BC', seq: '29', color: 'Salmão' },
  { code: 'BD', style: {}, seq: '30', color: 'Coral' },
  { code: 'BE', seq: '31', color: 'Vermelho Escuro' },
  { code: 'BF', seq: '32', color: 'Mostarda' },
  { code: 'BG', seq: '33', color: 'Cáqui' },
  { code: 'BH', seq: '34', color: 'Nude' },
  { code: 'BI', seq: '35', color: 'Champanhe' },
  { code: 'BJ', seq: '36', color: 'Lavanda' },
  { code: 'BK', seq: '37', color: 'Verde Escuro' },
  { code: 'BL', seq: '38', color: 'Verde Água' },
  { code: 'BM', seq: '39', color: 'Amarelo Limão' },
  { code: 'BN', seq: '40', color: 'Azul Turquesa' },
  { code: 'BO', seq: '41', color: 'Verde Musgo' },
  { code: 'BP', seq: '42', color: 'Grafite' },
  { code: 'BQ', seq: '43', color: 'Rosa Neon' },
  { code: 'BR', seq: '44', color: 'Jeans' },
  { code: 'BS', seq: '45', color: 'Marsala' },
  { code: 'BT', seq: '46', color: 'Ouro Velho' },
  { code: 'BU', seq: '47', color: 'Azul Petróleo' },
  { code: 'BV', seq: '48', color: 'Lilás' },
  { code: 'BW', seq: '49', color: 'Pink' },
  { code: 'BX', seq: '50', color: 'Vermelho Claro' },
  { code: 'BY', seq: '51', color: 'Off White' },
  { code: 'BZ', seq: '52', color: 'Rosa Bebê' },
  { code: 'CA', seq: '53', color: 'Palha' },
  { code: 'CB', seq: '54', color: 'Dourado' },
  { code: 'CC', seq: '55', color: 'Roxo' },
  { code: 'CD', seq: '56', color: 'Amêndoa' },
  { code: 'CE', seq: '57', color: 'Areia' },
  { code: 'CF', seq: '58', color: 'Verde Oliva' },
  { code: 'CG', seq: '59', color: 'Rosa Escuro' },
  { code: 'CH', seq: '60', color: 'Tabaco' },
  { code: 'CI', seq: '61', color: 'Marfim' },
  { code: 'CJ', seq: '62', color: 'Rosê' },
  { code: 'CK', seq: '63', color: 'Rubi' },
  { code: 'CL', seq: '64', color: 'Prata' },
  { code: 'CM', seq: '65', color: 'Sortido' },
  { code: 'CN', seq: '66', color: 'Sem cor' },
  { code: 'CO', seq: '67', color: 'Multicolor' },
  { code: 'CP', seq: '68', color: 'Chumbo' },
  { code: 'CQ', seq: '69', color: 'Azul Bebe' },
  { code: 'CR', seq: '70', color: 'Lotus' },
  { code: 'CS', seq: '71', color: 'Cobre' },
  { code: 'CT', seq: '72', color: 'Creme' },
  { code: 'CU', seq: '73', color: 'Lima' },
  { code: 'CV', seq: '74', color: 'Transparente' },
  { code: 'CW', seq: '75', color: 'Marrom Escuro' },
  { code: 'CX', seq: '', color: 'Café' },
  { code: 'CY', seq: '', color: 'Natural' },
  { code: 'CZ', seq: '', color: 'Mascavo' },
  { code: 'DA', seq: '', color: 'Goiaba' },
  { code: 'DB', seq: '', color: 'Telha' },
  { code: 'DC', seq: '', color: 'Nectarine' },
  { code: 'DD', seq: '', color: 'Látex' }
];

export default function Cadastro() {
  const [activeTab, setActiveTab] = useState('assistente');
  
  // Fields for manual input
  const [tipo, setTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [cores, setCores] = useState('');
  const [tamanho, setTamanho] = useState('');

  // Searches
  const [synonymSearch, setSynonymSearch] = useState('');
  const [skuColorSearch, setSkuColorSearch] = useState('');

  // Color synonyms state
  const [synonyms, setSynonyms] = useState(() => {
    const saved = localStorage.getItem('__dedo_duro_color_synonyms__');
    return saved ? JSON.parse(saved) : DEFAULT_COLOR_SYNONYMS;
  });

  const [newSynKey, setNewSynKey] = useState('');
  const [newSynVal, setNewSynVal] = useState('PRETO');

  const [copiedDesc, setCopiedDesc] = useState(false);

  useEffect(() => {
    localStorage.setItem('__dedo_duro_color_synonyms__', JSON.stringify(synonyms));
  }, [synonyms]);

  // Helper to capitalize each word cleanly
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str
      .trim()
      .split(/\s+/)
      .map(w => {
        const u = w.toUpperCase();
        if (['NB', 'FBA', 'RVL', 'BY', 'BZ', 'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO', 'CP', 'CQ', 'CR', 'CS', 'CT', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DA', 'DB', 'DC', 'DD'].includes(u)) return u;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Output Standardized Text
  const formatStandardDescription = () => {
    const cleanTipo = capitalizeWords(tipo);
    const cleanMarca = capitalizeWords(marca);
    const cleanModelo = capitalizeWords(modelo);
    const cleanSize = tamanho.trim().toUpperCase();
    
    const refPart = referencia ? ` (${referencia.trim().toUpperCase()})` : '';
    const colorPart = cores ? ` ${cores.trim().toUpperCase()}` : '';
    const sizePart = cleanSize ? ` Tam ${cleanSize}` : '';
    
    return `${cleanTipo} ${cleanMarca} ${cleanModelo}${refPart}${colorPart}${sizePart}`.replace(/\s+/g, ' ').trim();
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(formatStandardDescription());
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
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

  // Filtered color synonyms
  const filteredSynonyms = Object.entries(synonyms).filter(([k, v]) => {
    const term = synonymSearch.toLowerCase();
    return k.toLowerCase().includes(term) || v.toLowerCase().includes(term);
  });

  // Filtered SKU color codes
  const filteredSkuColors = SKU_COLOR_CODES.filter(item => {
    const term = skuColorSearch.toLowerCase();
    return item.code.toLowerCase().includes(term) || item.color.toLowerCase().includes(term) || item.seq.includes(term);
  });

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
        <button 
          onClick={() => setActiveTab('tabelasku')}
          style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'tabelasku' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'tabelasku' ? '#3b82f6' : '#64748b'
          }}
        >
          <Search size={16} style={{ marginRight: '6px', display: 'inline' }} /> Tabela de Cores (SKU)
        </button>
      </div>

      {/* Tab: Assistente */}
      {activeTab === 'assistente' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          
          {/* Manual Input Form */}
          <div style={{ flex: '1 1 500px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              Preencher Campos do Produto
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>TIPO (EX: TENIS, CAMISETA)</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  value={tipo} 
                  onChange={(e) => setTipo(e.target.value)} 
                  placeholder="Tenis, Camiseta, Shorts..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MARCA (EX: FILA, SANDRINI)</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  value={marca} 
                  onChange={(e) => setMarca(e.target.value)} 
                  placeholder="Fila, Adidas, Sandrini..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MODELO (EX: RIDE 2, LINHO)</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  value={modelo} 
                  onChange={(e) => setModelo(e.target.value)} 
                  placeholder="Ride 2, Linho 2032..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>REFERÊNCIA (OPCIONAL)</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  value={referencia} 
                  onChange={(e) => setReferencia(e.target.value)} 
                  placeholder="F02TR00072..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>SIGLAS DAS CORES (MAX 3 - SEP. POR BARRA)</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  value={cores} 
                  onChange={(e) => setCores(e.target.value)} 
                  placeholder="Ex: PTO/BCO/VM"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>TAMANHO</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  value={tamanho} 
                  onChange={(e) => setTamanho(e.target.value)} 
                  placeholder="Ex: 37, M, GG"
                />
              </div>
            </div>
          </div>

          {/* Standard Title Card Output */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Descrição Padronizada</h3>
              
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 600, fontSize: '16px', color: '#1e293b', lineHeight: '1.4' }}>
                {formatStandardDescription() || 'Preencha os campos para visualizar a descrição padronizada...'}
              </div>

              <button 
                className="btn-padrao" 
                onClick={handleCopyDescription} 
                disabled={!tipo && !marca && !modelo}
                style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '14px' }}
              >
                {copiedDesc ? <CheckCircle size={16} /> : <ClipboardCopy size={16} />}
                {copiedDesc ? 'Copiado!' : 'Copiar Descrição'}
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

          {/* List of Custom Synonyms with Search */}
          <div style={{ flex: '1 1 500px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Tabela de Equivalência Ativa</h3>
              
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input 
                  type="text"
                  placeholder="Buscar cor..."
                  className="input-padrao"
                  style={{ paddingLeft: '32px', height: '32px', fontSize: '12px', width: '100%' }}
                  value={synonymSearch}
                  onChange={(e) => setSynonymSearch(e.target.value)}
                />
              </div>
            </div>
            
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
                  {filteredSynonyms.length > 0 ? (
                    filteredSynonyms.map(([k, v]) => (
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        Nenhuma equivalência encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab: Tabela de Cores (SKU) */}
      {activeTab === 'tabelasku' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Códigos de Cores para Formação de SKU</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>Use esta tabela de consulta para encontrar o código de 2 letras que deve ser inserido no SKU da Sênior.</p>
            </div>
            
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Buscar por cor ou código..."
                className="input-padrao"
                style={{ paddingLeft: '38px', height: '38px', fontSize: '13px', width: '100%' }}
                value={skuColorSearch}
                onChange={(e) => setSkuColorSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold', width: '150px' }}>CÓDIGO (SKU)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold', width: '150px' }}>Sequência</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Cor</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkuColors.length > 0 ? (
                  filteredSkuColors.map((item, idx) => (
                    <tr key={item.code + idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'transparent' : '#fcfcfc' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#3b82f6', fontSize: '14px' }}>
                        {item.code}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {item.seq || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {item.color}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                      Nenhuma cor ou código encontrado para a busca realizada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
