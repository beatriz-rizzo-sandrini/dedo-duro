/**
 * Utility to parse complex product descriptions into structured fields:
 * - baseTitle (general product name, stripped of size and color)
 * - color (extracted color/variation, e.g. "PRETO/GRAFITE")
 * - size (extracted size, e.g. "44", "G")
 */
const SKU_COLOR_MAP = {
  "00": "SEM COR",
  "AA": "PTO", "AB": "BCO", "AC": "AZ", "AD": "MAR", "AE": "CZ", "AF": "VM", "AG": "BGE", "AH": "MRM",
  "AI": "VDM", "AJ": "VD", "AK": "BDO", "AL": "AZE", "AM": "VDL", "AN": "VIN", "AO": "AZC", "AP": "AZR",
  "AQ": "NAV", "AR": "RS", "AS": "RSC", "AT": "AM", "AU": "AM", "AV": "LRJ", "AW": "VDC", "AX": "CHO",
  "AY": "CAR", "AZ": "CZC", "BA": "MES", "BB": "MRC", "BC": "SLM", "BD": "CRL", "BE": "VME", "BF": "MOS",
  "BG": "CAQ", "BH": "NDE", "BI": "CHA", "BJ": "LAV", "BK": "VDE", "BL": "VDA", "BM": "AM", "BN": "TUR",
  "BO": "MUS", "BP": "GRF", "BQ": "RSN", "BR": "JNS", "BS": "MRS", "BT": "OVL", "BU": "AZP", "BV": "LIL",
  "BW": "PNK", "BX": "VMC", "BY": "OFW", "BZ": "RSB", "CA": "PLH", "CB": "DOR", "CC": "RX", "CD": "AMD",
  "CE": "ARE", "CF": "OLV", "CG": "RSE", "CH": "TBK", "CI": "MIF", "CJ": "RSE", "CK": "RUB", "CL": "PRT",
  "CM": "SORT", "CN": "SEM COR", "CO": "MULT", "CP": "CHM", "CQ": "AZB", "CR": "LTS", "CS": "CBR",
  "CT": "CRM", "CU": "LMA", "CV": "TRP", "CW": "MRE", "CX": "CAF", "CY": "NAT", "CZ": "MSV", "DA": "GOI",
  "DB": "TLH", "FA": "MES"
};

const COLOR_ABBR_MAP = {
  'PTO': 'PTO', 'PT': 'PTO', 'BLK': 'PTO', 'PRETO': 'PTO',
  'BCO': 'BCO', 'BC': 'BCO', 'BRANCO': 'BCO',
  'CZ': 'CZ', 'CZA': 'CZ', 'CNZA': 'CZ', 'CINZA': 'CZ',
  'GRF': 'GRF', 'GP': 'GRF', 'GRAFITE': 'GRF',
  'AZ': 'AZ', 'AZL': 'AZ', 'AZUL': 'AZ',
  'AZC': 'AZC', 'AZUL CLARO': 'AZC',
  'AZR': 'AZR', 'AZUL ROYAL': 'AZR',
  'NAV': 'NAV', 'AZUL NAVY': 'NAV',
  'MAR': 'MAR', 'MARINHO': 'MAR',
  'VM': 'VM', 'VERMELHO': 'VM',
  'VD': 'VD', 'VERDE': 'VD',
  'RS': 'RS', 'ROSA': 'RS',
  'RSE': 'RSE', 'ROSA ESCURO': 'RSE',
  'AM': 'AM', 'AMARELO': 'AM',
  'DOR': 'DOR', 'DORD': 'DOR', 'DOURADO': 'DOR',
  'PRT': 'PRT', 'PRATA': 'PRT',
  'SORT': 'SORT', 'SORTIDO': 'SORT',
  'BGE': 'BGE', 'BEGE': 'BGE',
  'OFW': 'OFW', 'OFF WHITE': 'OFW', 'OFF-WHITE': 'OFW',
  'MRM': 'MRM', 'MARROM': 'MRM',
  'MRC': 'MRC', 'MARROM CLARO': 'MRC',
  'CAF': 'CAF', 'CAFÉ': 'CAF',
  'VDM': 'VDM', 'VERDE MILITAR': 'VDM',
  'BDO': 'BDO', 'BORDÔ': 'BDO',
  'AZE': 'AZE', 'AZUL ESCURO': 'AZE',
  'VDL': 'VDL', 'VERDE LIMÃO': 'VDL',
  'VIN': 'VIN', 'VINHO': 'VIN',
  'RSC': 'RSC', 'ROSA CLARO': 'RSC',
  'CAQ': 'CAQ', 'CÁQUI': 'CAQ',
  'NDE': 'NDE', 'NUDE': 'NDE',
  'CHM': 'CHM', 'CHUMBO': 'CHM',
  'ARE': 'ARE', 'AREIA': 'ARE',
  'OLV': 'OLV', 'VERDE OLIVA': 'OLV',
  'TBK': 'TBK', 'TABACO': 'TBK',
  'AMD': 'AMD', 'AMÊNDOA': 'AMD',
  'PLH': 'PLH', 'PALHA': 'PLH',
  'RUB': 'RUB', 'RUBI': 'RUB',
  'MULT': 'MULT', 'MULTICOLOR': 'MULT',
  'AZB': 'AZB', 'AZUL BEBÊ': 'AZB',
  'LTS': 'LTS', 'LOTUS': 'LTS',
  'CBR': 'CBR', 'COBRE': 'CBR',
  'CRM': 'CRM', 'CREME': 'CRM',
  'LMA': 'LMA', 'LIMA': 'LMA',
  'TRP': 'TRP', 'TRANSPARENTE': 'TRP',
  'MRE': 'MRE', 'MARROM ESCURO': 'MRE',
  'NAT': 'NAT', 'NATURAL': 'NAT',
  'MSV': 'MSV', 'MASCAVO': 'MSV',
  'GOI': 'GOI', 'GOIABA': 'GOI',
  'TLH': 'TLH', 'TELHA': 'TLH',
  'MES': 'MES', 'MESCLA': 'MES',
  'LIL': 'LIL', 'LILÁS': 'LIL',
  'PNK': 'PNK', 'PINK': 'PNK',
  'LRJ': 'LRJ', 'LARANJA': 'LRJ',
  'LRJA': 'LRJ', 'GEL': 'GEL', 'GELO': 'GEL',
  'CAR': 'CAR', 'CARAMELO': 'CAR'
};

export function parseProductDescription(desc, sku = '') {
  if (!desc) {
    return {
      baseTitle: sku || 'Produto Sem Descrição',
      color: 'SEM COR',
      size: 'U',
      descricaoFormatada: sku || 'Produto Sem Descrição'
    };
  }

  sku = String(sku).trim();
  let baseTitle = desc.trim();
  let size = '';
  let color = '';

  // 1. Check if SKU matches the standard Senior SKU pattern
  let isSeniorSKU = false;
  let skuColor = '';
  let skuSize = '';

  if (sku.length === 23) {
    const block = sku.substring(11, 17);
    const p1 = block.substring(0, 2);
    const p2 = block.substring(2, 4);
    const p3 = block.substring(4, 6);

    if (SKU_COLOR_MAP[p1] && SKU_COLOR_MAP[p2] && SKU_COLOR_MAP[p3]) {
      isSeniorSKU = true;
      const colors = [];
      if (p1 !== 'CN' && p1 !== '00') colors.push(SKU_COLOR_MAP[p1]);
      if (p2 !== 'CN' && p2 !== '00') colors.push(SKU_COLOR_MAP[p2]);
      if (p3 !== 'CN' && p3 !== '00') colors.push(SKU_COLOR_MAP[p3]);
      
      const uniqueColors = Array.from(new Set(colors));
      skuColor = uniqueColors.length > 0 ? uniqueColors.join('/').toUpperCase() : 'SEM COR';
      skuSize = sku.substring(17, 19);
    }
  } else if (sku.length === 22) {
    const block = sku.substring(14, 16);
    if (SKU_COLOR_MAP[block]) {
      isSeniorSKU = true;
      skuColor = (block !== 'CN' && block !== '00') ? SKU_COLOR_MAP[block].toUpperCase() : 'SEM COR';
      skuSize = sku.substring(16, 18);
    }
  }

  if (isSeniorSKU) {
    color = skuColor;
    
    if (skuSize.startsWith('0') && skuSize.length === 2) {
      size = skuSize.substring(1).toUpperCase();
    } else {
      size = skuSize.toUpperCase();
    }

    const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|Tamanho|CORL)\s*([GPM]|GG|XG|G\d|\d+(?:\/\d+)?)/i;
    baseTitle = baseTitle.replace(sizeRegex, '');

    const endSizeRegex = /\b(G\d|GG|XG|[GPM]|\d{2})$/i;
    baseTitle = baseTitle.replace(endSizeRegex, '');

    const colorSlashRegex = /\b(?:[A-Z0-9]{2,}(?:\/[A-Z0-9]{2,})+|[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+\/[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+)\b/g;
    baseTitle = baseTitle.replace(colorSlashRegex, '');

    const words = baseTitle.split(/\s+/);
    const cleanedWords = words.filter(word => {
      const cleanWord = word.replace(/[^A-Za-z]/g, '').toUpperCase();
      if (COLOR_ABBR_MAP[cleanWord] || Object.values(SKU_COLOR_MAP).includes(cleanWord)) {
        return false;
      }
      return true;
    });
    baseTitle = cleanedWords.join(' ');
  } else {
    // Fallback parsing
    const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|Tamanho|CORL)\s*([GPM]|GG|XG|G\d|\d+(?:\/\d+)?)/i;
    const sizeMatch = baseTitle.match(sizeRegex);
    if (sizeMatch) {
      size = sizeMatch[1].toUpperCase();
      baseTitle = baseTitle.replace(sizeRegex, '').trim();
    } else {
      const endSizeRegex = /\b(G\d|GG|XG|[GPM]|\d{2})$/i;
      const endSizeMatch = baseTitle.match(endSizeRegex);
      if (endSizeMatch) {
        size = endSizeMatch[1].toUpperCase();
        baseTitle = baseTitle.replace(endSizeRegex, '').trim();
      }
    }

    const colorSlashRegex = /\b([A-Z]{2,}(?:\/[A-Z0-9]{2,})+|[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+\/[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+)\b/;
    const slashMatch = baseTitle.match(colorSlashRegex);
    if (slashMatch) {
      color = slashMatch[1].trim();
      baseTitle = baseTitle.replace(colorSlashRegex, '').trim();
    } else {
      const commonColors = Object.keys(COLOR_ABBR_MAP);
      for (const c of commonColors) {
        const colorWordRegex = new RegExp(`\\b${c}\\b`, 'i');
        if (colorWordRegex.test(baseTitle)) {
          color = c;
          baseTitle = baseTitle.replace(colorWordRegex, '').trim();
          break;
        }
      }
    }

    if (color) {
      const parts = color.toUpperCase().split('/');
      const normalizedParts = parts.map(p => COLOR_ABBR_MAP[p] || p);
      color = normalizedParts.join('/');
    } else {
      color = 'SEM COR';
    }
  }

  baseTitle = baseTitle
    .replace(/[\s\-,;:]+$/, '')
    .replace(/^[\s\-,;:]+/, '')
    .trim();

  baseTitle = baseTitle.replace(/\s+/g, ' ');

  if (baseTitle.toUpperCase().includes('SD2513')) {
    baseTitle = 'Tenis Sandrini Aero Run (SD2513)';
  }

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        const cleanWord = word.replace(/[()]/g, '');
        if (word.startsWith('(') && word.endsWith(')')) {
          return word.toUpperCase();
        }
        if (['nb', 'bb80', 'bdp', 'rc2', 'fba', 'sd2513', 'sn-465', 'sn465'].includes(cleanWord)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const titleCasedBase = toTitleCase(baseTitle);
  const colorPart = color && color !== 'SEM COR' ? ` ${color.toUpperCase()}` : '';
  const sizePart = size && size !== 'U' ? ` Tam ${size.toUpperCase()}` : '';
  const descricaoFormatada = `${titleCasedBase}${colorPart}${sizePart}`;

  return {
    baseTitle: titleCasedBase,
    color: color.toUpperCase(),
    size: size ? size.toUpperCase() : 'U',
    descricaoFormatada
  };
}
