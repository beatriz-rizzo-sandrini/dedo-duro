import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileEdit, ClipboardCopy, CheckCircle, FileText, Settings, Plus, Trash2, Search, HelpCircle } from 'lucide-react';

const DEFAULT_STANDARD_COLORS = {
  'PRETO': 'PTO',
  'BRANCO': 'BCO',
  'AZUL': 'AZ',
  'MARINHO': 'MAR',
  'AZUL MARINHO': 'MAR',
  'CINZA': 'CZ',
  'VERMELHO': 'VM',
  'BEGE': 'BGE',
  'MARROM': 'MRM',
  'VERDE MILITAR': 'VDM',
  'VERDE': 'VD',
  'BORDÔ': 'BRD',
  'BORDO': 'BRD',
  'AZUL ESCURO': 'AZE',
  'VERDE LIMÃO': 'VDL',
  'VERDE LIMAO': 'VDL',
  'VINHO': 'VNH',
  'AZUL CLARO': 'AZC',
  'AZUL ROYAL': 'AZR',
  'AZUL NAVY': 'AZN',
  'ROSA': 'RS',
  'ROSA CLARO': 'RSC',
  'AMARELO': 'AM',
  'AMARELO FLUORESCENTE': 'AMF',
  'LARANJA': 'LRJ',
  'VERDE CLARO': 'VDC',
  'CHOCOLATE': 'CHO',
  'CARAMELO': 'CRM',
  'CINZA CLARO': 'CZC',
  'MESCLA': 'MES',
  'MARROM CLARO': 'MRC',
  'SALMÃO': 'SLM',
  'SALMAO': 'SLM',
  'CORAL': 'CRL',
  'VERMELHO ESCURO': 'VME',
  'MOSTARDA': 'MST',
  'CÁQUI': 'CAQ',
  'CAQUI': 'CAQ',
  'NUDE': 'BGE',
  'CHAMPANHE': 'CHM',
  'LAVANDA': 'LVD',
  'VERDE ESCURO': 'VDE',
  'VERDE ÁGUA': 'VDA',
  'VERDE AGUA': 'VDA',
  'AMARELO LIMÃO': 'AML',
  'AMARELO LIMAO': 'AML',
  'AZUL TURQUESA': 'AZT',
  'VERDE MUSGO': 'VDG',
  'GRAFITE': 'GRF',
  'ROSA NEON': 'RSN',
  'JEANS': 'JNS',
  'MARSALA': 'MSL',
  'OURO VELHO': 'ORV',
  'AZUL PETRÓLEO': 'AZP',
  'AZUL PETROLEO': 'AZP',
  'LILÁS': 'LLS',
  'LILAS': 'LLS',
  'PINK': 'PNK',
  'VERMELHO CLARO': 'VMC',
  'OFF WHITE': 'OFW',
  'OFF-WHITE': 'OFW',
  'OFFWHITE': 'OFW',
  'ROSA BEBÊ': 'RSB',
  'ROSA BEBE': 'RSB',
  'PALHA': 'PLH',
  'DOURADO': 'DORD',
  'ROXO': 'RX',
  'AMÊNDOA': 'AMD',
  'AMENDOA': 'AMD',
  'AREIA': 'ARA',
  'VERDE OLIVA': 'VDO',
  'ROSA ESCURO': 'RSE',
  'TABACO': 'TBC',
  'MARFIM': 'MRF',
  'ROSÊ': 'RSE',
  'ROSE': 'RSE',
  'RUBI': 'RBI',
  'PRATA': 'PRT',
  'SORTIDO': 'SORT',
  'SEM COR': 'SC',
  'MULTICOLOR': 'MULT',
  'CHUMBO': 'CHB',
  'AZUL BEBE': 'AZB',
  'AZUL BEBÊ': 'AZB',
  'LOTUS': 'LTS',
  'COBRE': 'COB',
  'CREME': 'CRM',
  'LIMA': 'LIM',
  'TRANSPARENTE': 'TRP',
  'MARROM ESCURO': 'MRE',
  'CAFÉ': 'CFE',
  'CAFE': 'CFE',
  'NATURAL': 'NAT',
  'MASCAVO': 'MSC',
  'GOIABA': 'GIB',
  'TELHA': 'TLH',
  'NECTARINE': 'NCT',
  'LÁTEX': 'LTX',
  'LATEX': 'LTX'
};

const DEFAULT_COLOR_SYNONYMS = {
  'FLAMINGO SCARLET': 'VERMELHO',
  'FLAMENGOSCARLET': 'VERMELHO',
  'SCARLET': 'VERMELHO',
  'SCARLAT': 'VERMELHO',
  'PÊSSEGO': 'AMARELO',
  'PESSEGO': 'AMARELO',
  'PEACH': 'AMARELO',
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
  'AZULMARINHO': 'MARINHO',
  'AZUL MARINHO': 'MARINHO',
  'VERDEMILITAR': 'VERDE MILITAR',
  'AZULCLARO': 'AZUL CLARO',
  'AZULESCURO': 'AZUL ESCURO',
  'AZULROYAL': 'AZUL ROYAL',
  'AZULNAVY': 'AZUL NAVY',
  'AZULPETROLEO': 'AZUL PETRÓLEO',
  'VERDECLARO': 'VERDE CLARO',
  'VERDEESCURO': 'VERDE ESCURO',
  'VERDEOLIVA': 'VERDE OLIVA',
  'VERDEAGUA': 'VERDE ÁGUA',
  'VERDEMUSGO': 'VERDE MUSGO',
  'VERDELIMAO': 'VERDE LIMÃO',
  'ROSACLARO': 'ROSA CLARO',
  'ROSAESCURO': 'ROSA ESCURO',
  'ROSABEBE': 'ROSA BEBÊ',
  'ROSANEON': 'ROSA NEON',
  'CINZACLARO': 'CINZA CLARO',
  'MARROMCLARO': 'MARROM CLARO',
  'MARROMESCURO': 'MARROM ESCURO',
  'VERMELHOCLARO': 'VERMELHO CLARO',
  'VERMELHOESCURO': 'VERMELHO ESCURO',
  'AMARELOCLARO': 'AMARELO',
  'AMARELOLIMAO': 'AMARELO LIMÃO',
  'AMARELOFLUORESCENTE': 'AMARELO FLUORESCENTE'
};

const SKU_COLOR_CODES = [
  { code: 'AA', color: 'Preto', abbr: 'PTO' },
  { code: 'AB', color: 'Branco', abbr: 'BCO' },
  { code: 'AC', color: 'Azul', abbr: 'AZ' },
  { code: 'AD', color: 'Marinho', abbr: 'MAR' },
  { code: 'AE', color: 'Cinza', abbr: 'CZ' },
  { code: 'AF', color: 'Vermelho', abbr: 'VM' },
  { code: 'AG', color: 'Bege', abbr: 'BGE' },
  { code: 'AH', color: 'Marrom', abbr: 'MRM' },
  { code: 'AI', color: 'Verde Militar', abbr: 'VDM' },
  { code: 'AJ', color: 'Verde', abbr: 'VD' },
  { code: 'AK', color: 'Bordô', abbr: 'BRD' },
  { code: 'AL', color: 'Azul Escuro', abbr: 'AZE' },
  { code: 'AM', color: 'Verde Limão', abbr: 'VDL' },
  { code: 'AN', color: 'Vinho', abbr: 'VNH' },
  { code: 'AO', color: 'Azul Claro', abbr: 'AZC' },
  { code: 'AP', color: 'Azul Royal', abbr: 'AZR' },
  { code: 'AQ', color: 'Azul Navy', abbr: 'AZN' },
  { code: 'AR', color: 'Rosa', abbr: 'RS' },
  { code: 'AS', color: 'Rosa Claro', abbr: 'RSC' },
  { code: 'AT', color: 'Amarelo', abbr: 'AM' },
  { code: 'AU', color: 'Amarelo Fluorescente', abbr: 'AMF' },
  { code: 'AV', color: 'Laranja', abbr: 'LRJ' },
  { code: 'AW', color: 'Verde Claro', abbr: 'VDC' },
  { code: 'AX', color: 'Chocolate', abbr: 'CHO' },
  { code: 'AY', color: 'Caramelo', abbr: 'CRM' },
  { code: 'AZ', color: 'Cinza Claro', abbr: 'CZC' },
  { code: 'BA', color: 'Mescla', abbr: 'MES' },
  { code: 'BB', color: 'Marrom Claro', abbr: 'MRC' },
  { code: 'BC', color: 'Salmão', abbr: 'SLM' },
  { code: 'BD', color: 'Coral', abbr: 'CRL' },
  { code: 'BE', color: 'Vermelho Escuro', abbr: 'VME' },
  { code: 'BF', color: 'Mostarda', abbr: 'MST' },
  { code: 'BG', color: 'Cáqui', abbr: 'CAQ' },
  { code: 'BH', color: 'Nude', abbr: 'BGE' },
  { code: 'BI', color: 'Champanhe', abbr: 'CHM' },
  { code: 'BJ', color: 'Lavanda', abbr: 'LVD' },
  { code: 'BK', color: 'Verde Escuro', abbr: 'VDE' },
  { code: 'BL', color: 'Verde Água', abbr: 'VDA' },
  { code: 'BM', color: 'Amarelo Limão', abbr: 'AML' },
  { code: 'BN', color: 'Azul Turquesa', abbr: 'AZT' },
  { code: 'BO', color: 'Verde Musgo', abbr: 'VDG' },
  { code: 'BP', color: 'Grafite', abbr: 'GRF' },
  { code: 'BQ', color: 'Rosa Neon', abbr: 'RSN' },
  { code: 'BR', color: 'Jeans', abbr: 'JNS' },
  { code: 'BS', color: 'Marsala', abbr: 'MSL' },
  { code: 'BT', color: 'Ouro Velho', abbr: 'ORV' },
  { code: 'BU', color: 'Azul Petróleo', abbr: 'AZP' },
  { code: 'BV', color: 'Lilás', abbr: 'LLS' },
  { code: 'BW', color: 'Pink', abbr: 'PNK' },
  { code: 'BX', color: 'Vermelho Claro', abbr: 'VMC' },
  { code: 'BY', color: 'Off White', abbr: 'OFW' },
  { code: 'BZ', color: 'Rosa Bebê', abbr: 'RSB' },
  { code: 'CA', color: 'Palha', abbr: 'PLH' },
  { code: 'CB', color: 'Dourado', abbr: 'DORD' },
  { code: 'CC', color: 'Roxo', abbr: 'RX' },
  { code: 'CD', color: 'Amêndoa', abbr: 'AMD' },
  { code: 'CE', color: 'Areia', abbr: 'ARA' },
  { code: 'CF', color: 'Verde Oliva', abbr: 'VDO' },
  { code: 'CG', color: 'Rosa Escuro', abbr: 'RSE' },
  { code: 'CH', color: 'Tabaco', abbr: 'TBC' },
  { code: 'CI', color: 'Marfim', abbr: 'MRF' },
  { code: 'CJ', color: 'Rosê', abbr: 'RSE' },
  { code: 'CK', color: 'Rubi', abbr: 'RBI' },
  { code: 'CL', color: 'Prata', abbr: 'PRT' },
  { code: 'CM', color: 'Sortido', abbr: 'SORT' },
  { code: 'CN', color: 'Sem cor', abbr: 'SC' },
  { code: 'CO', color: 'Multicolor', abbr: 'MULT' },
  { code: 'CP', color: 'Chumbo', abbr: 'CHB' },
  { code: 'CQ', color: 'Azul Bebe', abbr: 'AZB' },
  { code: 'CR', color: 'Lotus', abbr: 'LTS' },
  { code: 'CS', color: 'Cobre', abbr: 'COB' },
  { code: 'CT', color: 'Creme', abbr: 'CRM' },
  { code: 'CU', color: 'Lima', abbr: 'LIM' },
  { code: 'CV', color: 'Transparente', abbr: 'TRP' },
  { code: 'CW', color: 'Marrom Escuro', abbr: 'MRE' },
  { code: 'CX', color: 'Café', abbr: 'CFE' },
  { code: 'CY', color: 'Natural', abbr: 'NAT' },
  { code: 'CZ', color: 'Mascavo', abbr: 'MSC' },
  { code: 'DA', color: 'Goiaba', abbr: 'GIB' },
  { code: 'DB', color: 'Telha', abbr: 'TLH' },
  { code: 'DC', color: 'Nectarine', abbr: 'NCT' },
  { code: 'DD', color: 'Látex', abbr: 'LTX' }
];

export default function Cadastro() {
  const [activeTab, setActiveTab] = useState('assistente');

  const [tipo, setTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [cores, setCores] = useState('');
  const [tamanho, setTamanho] = useState('');

  const [synonymSearch, setSynonymSearch] = useState('');
  const [skuColorSearch, setSkuColorSearch] = useState('');

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

  const formatStandardDescription = () => {
    const cleanTipo = capitalizeWords(tipo);
    const cleanMarca = capitalizeWords(marca);
    const cleanModelo = capitalizeWords(modelo);
    const cleanSize = tamanho.trim().toUpperCase();

    const blocks = cores.split(/[\/,;]| - /);
    const parsedColors = [];
    const validAbbrs = Object.values(DEFAULT_STANDARD_COLORS);

    for (const block of blocks) {
      const cleanBlock = block.replace(/-/g, ' ').trim().replace(/\s+/g, ' ').toUpperCase();
      if (!cleanBlock) continue;

      let target = synonyms[cleanBlock] || cleanBlock;
      if (DEFAULT_STANDARD_COLORS[target]) {
        parsedColors.push(DEFAULT_STANDARD_COLORS[target]);
        continue;
      }
      if (validAbbrs.includes(cleanBlock)) {
        parsedColors.push(cleanBlock);
        continue;
      }

      const words = cleanBlock.split(/\s+/);
      let i = 0;
      while (i < words.length) {
        if (i + 1 < words.length) {
          const twoWords = `${words[i]} ${words[i+1]}`;
          let targetTwo = synonyms[twoWords] || twoWords;
          if (DEFAULT_STANDARD_COLORS[targetTwo]) {
            parsedColors.push(DEFAULT_STANDARD_COLORS[targetTwo]);
            i += 2;
            continue;
          }
          if (validAbbrs.includes(twoWords)) {
            parsedColors.push(twoWords);
            i += 2;
            continue;
          }
        }

        const oneWord = words[i];
        let targetOne = synonyms[oneWord] || oneWord;
        if (DEFAULT_STANDARD_COLORS[targetOne]) {
          parsedColors.push(DEFAULT_STANDARD_COLORS[targetOne]);
        } else if (validAbbrs.includes(oneWord)) {
          parsedColors.push(oneWord);
        } else {
          parsedColors.push(oneWord);
        }
        i += 1;
      }
    }

    const cleanCores = parsedColors
      .filter(Boolean)
      .slice(0, 3)
      .join('/');

    const refPart = referencia ? ` (${referencia.trim().toUpperCase()})` : '';
    const colorPart = cleanCores ? ` ${cleanCores}` : '';
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

  const filteredSynonyms = Object.entries(synonyms).filter(([k, v]) => {
    const term = synonymSearch.toLowerCase();
    return k.toLowerCase().includes(term) || v.toLowerCase().includes(term);
  });

  const filteredSkuColors = SKU_COLOR_CODES.filter(item => {
    const term = skuColorSearch.toLowerCase();
    return item.code.toLowerCase().includes(term) || item.color.toLowerCase().includes(term) || item.abbr.toLowerCase().includes(term);
  });

  return (
    <div className="header-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Cadastro de Produtos</h1>
          <p>Padronização de descrições e auxílio de cadastro (Guia Oficial)</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', paddingBottom: '1px' }}>
        <button
          onClick={() => setActiveTab('assistente')}
          style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'assistente' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'assistente' ? '#3b82f6' : '#64748b'
          }}
        >
          <FileEdit size={16} style={{ marginRight: '6px', display: 'inline' }} /> Assistente de Cadastro
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

      {activeTab === 'assistente' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ flex: '1 1 500px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              Preencher Campos do Produto
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tipo</label>
                <input
                  type="text"
                  className="input-padrao"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Tenis, Camiseta, Shorts..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Marca</label>
                <input
                  type="text"
                  className="input-padrao"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Fila, Adidas, Sandrini..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Modelo</label>
                <input
                  type="text"
                  className="input-padrao"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ride 2, Aero Spark..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Referência (Opcional)</label>
                <input
                  type="text"
                  className="input-padrao"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex: F02TR00072"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Cores</label>
                <input
                  type="text"
                  className="input-padrao"
                  value={cores}
                  onChange={(e) => setCores(e.target.value)}
                  placeholder="Ex: PTO/BCO/VM"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tamanho</label>
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

      {activeTab === 'mapeador' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
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
              <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '45%' }}>Cor no Fornecedor</th>
                    <th style={{ width: '40%' }}>Cor Padronizada</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSynonyms.length > 0 ? (
                    filteredSynonyms.map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{k}</td>
                        <td>
                          <span style={{ background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                            {v} ({DEFAULT_STANDARD_COLORS[v] || v})
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
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
            <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>CÓDIGO (SKU)</th>
                  <th style={{ width: '40%' }}>Cor</th>
                  <th style={{ width: '30%' }}>Abreviação</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkuColors.length > 0 ? (
                  filteredSkuColors.map((item, idx) => (
                    <tr key={item.code + idx}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#3b82f6', fontSize: '14px' }}>
                        {item.code}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {item.color}
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                        {item.abbr || '-'}
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
