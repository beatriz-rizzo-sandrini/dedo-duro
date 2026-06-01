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
  'AZC': 'AZC', 'AZUL CLARO': 'AZC', 'PLEIN AIR': 'AZC', 'PLAIN AIR': 'AZC', 'PLEINAIR': 'AZC', 'PLAINAIR': 'AZC',
  'AZR': 'AZR', 'AZUL ROYAL': 'AZR',
  'NAV': 'NAV', 'AZUL NAVY': 'NAV',
  'MAR': 'MAR', 'MARINHO': 'MAR',
  'VM': 'VM', 'VERMELHO': 'VM', 'SCARLET': 'VM', 'FLAMENGO SCARLET': 'VM', 'FLAMENGOSCARLET': 'VM',
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
  'CAR': 'CAR', 'CARAMELO': 'CAR',
  'ALL BLACK': 'PTO', 'ALLBLACK': 'PTO',
  'MILITAR': 'VDM', 'SORTIDOG': 'SORT',
  'SORTIDO': 'SORT', 'SORTIDOS': 'SORT'
};

export function parseProductDescription(desc, sku = '', isWatch = false) {
  const skuUpper = String(sku || '').trim().toUpperCase();
  
  // Verifica se é um SKU customizado conhecido ou Senior SKU
  let isCustomOrSenior = false;
  if (skuUpper) {
    const isSenior = (skuUpper.length === 23 || skuUpper.length === 22);
    const isSandrini = skuUpper.includes('DRY') || skuUpper.includes('235') || skuUpper.includes('2350') || skuUpper.includes('2351') || skuUpper.includes('2352') || skuUpper.includes('2353') || skuUpper.includes('2355');
    const isCustom = skuUpper.startsWith('TENIS433951') || skuUpper.startsWith('NB000GM500V2');
    
    if (isSenior || isSandrini || isCustom) {
      isCustomOrSenior = true;
    }
  }

  if (!desc) {
    if (isCustomOrSenior) {
      desc = '';
    } else {
      return {
        baseTitle: sku || 'Produto Sem Descrição',
        color: 'SEM COR',
        size: 'U',
        descricaoFormatada: sku || 'Produto Sem Descrição'
      };
    }
  }

  // Identificação automática caso isWatch não seja passado
  let isWatchObj = isWatch;
  if (!isWatchObj) {
    const descUpper = desc.toUpperCase();
    if (descUpper.includes('RELOGIO') || descUpper.includes('RELÓGIO') || descUpper.includes('WATCH') || descUpper.includes('PERFUME')) {
      isWatchObj = true;
    }
  }

  sku = String(sku).trim();

  if (isWatchObj) {
    let title = desc.trim();
    // Limpezas básicas de parâmetros do Sheets para relógios
    title = title.replace(/(?:Cor|Tamanho|Tam|Ref|cós|cos)\s*:\s*.*$/i, '');
    title = title.replace(/;\s*.*$/i, '');
    title = title.replace(/[\s\-,;:]+$/, '').trim();

    const toTitleCase = (str) => {
      return str
        .toLowerCase()
        .split(' ')
        .map(word => {
          const cleanWord = word.replace(/[()]/g, '');
          if (word.startsWith('(') && word.endsWith(')')) {
            return word.toUpperCase();
          }
          if (['chm', 'tc', 'sp', 'mg', 'ch30475g', 'ca31426d', 'rchch22788b'].includes(cleanWord.toLowerCase())) {
            return word.toUpperCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    };

    const titleCased = toTitleCase(title);
    
    // Adiciona o SKU na descrição base do relógio para agrupamento único
    const baseTitle = sku && !titleCased.toUpperCase().includes(sku.toUpperCase())
      ? `${titleCased} (${sku})`
      : titleCased;

    return {
      baseTitle,
      color: 'SEM COR',
      size: 'U',
      descricaoFormatada: baseTitle
    };
  }

  sku = String(sku).trim();
  let size = '';
  let color = '';

  // 0. Extração precoce do tamanho a partir da descrição original
  const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|Tamanho|CORL)\s*(GG|EG|XG|[GPM]|G\d|\d+(?:\/\d+)?)/i;
  const endSizeRegex = /\b(G\d|GG|EG|XG|[GPM]|\d{2})$/i;

  const originalSizeMatch = desc.match(sizeRegex);
  if (originalSizeMatch) {
    size = originalSizeMatch[1].toUpperCase();
  } else {
    const originalEndSizeMatch = desc.match(endSizeRegex);
    if (originalEndSizeMatch) {
      size = originalEndSizeMatch[1].toUpperCase();
    }
  }

  // Extração precoce de cor a partir da descrição original (padrão Cor:xxx)
  const corParamRegex = /\b(?:Cor|Cores)\s*:\s*([^;]+)/i;
  const originalCorMatch = desc.match(corParamRegex);
  if (originalCorMatch) {
    color = originalCorMatch[1].toUpperCase().trim();
  }

  let cleanDesc = desc.trim();
  // Remove raw parameter garbage from Google Sheets (e.g. Cor:sortidos;tamanho...)
  cleanDesc = cleanDesc.replace(/(?:Cor|Tamanho|Tam|Ref|cós|cos)\s*:\s*.*$/i, '');
  cleanDesc = cleanDesc.replace(/;\s*.*$/i, '');
  cleanDesc = cleanDesc.replace(/[\s\-,;:]+$/, '').trim();

  let baseTitle = cleanDesc;

  // 1. Check if SKU matches the standard Senior SKU pattern or custom kit SKU pattern
  let isSeniorSKU = false;
  let skuColor = '';
  let skuSize = '';

  // Sandrini Custom SKU Parser (e.g. CAMISETADRY2350CPTOTP, K4CAMISETADRY2350CSORT1TG)
  let isSandriniSKU = false;
  if (skuUpper.includes('DRY') || skuUpper.includes('2350') || skuUpper.includes('2351') || skuUpper.includes('2352') || skuUpper.includes('2353') || skuUpper.includes('2355')) {
    if (!skuUpper.startsWith('LP') && !skuUpper.startsWith('KLP')) {
      isSandriniSKU = true;
      
      const isKit = skuUpper.startsWith('K') || skuUpper.includes('KIT');
      
      if (isKit) {
        const sizeMatch = skuUpper.match(/T?(GG|G|M|P|XG)$/);
        size = sizeMatch ? sizeMatch[1] : 'U';
        
        const prefixMatch = skuUpper.match(/^(K\d+)?(?:CAMISETADRY|CAMIDRY|CAMISETAS|CAMISADRY)235\d/);
        const prefix = prefixMatch ? prefixMatch[0] : '';
        const colorBlock = skuUpper.substring(prefix.length, skuUpper.length - (sizeMatch ? sizeMatch[0].length : 0));
        
        let cleanColor = colorBlock.replace(/^C/, '');
        if (cleanColor.startsWith('SORT') || cleanColor === 'CS') {
          color = 'SORT';
        } else if (cleanColor === 'PTO' || cleanColor === 'PT') {
          color = 'PTO';
        } else if (cleanColor === 'BCO' || cleanColor === 'BC') {
          color = 'BCO';
        } else if (cleanColor === 'CZ') {
          color = 'CZ';
        } else if (cleanColor === 'MAR') {
          color = 'MAR';
        } else {
          const foundColors = [];
          const possibleColors = ['PTO', 'PT', 'BCO', 'BC', 'MAR', 'CZ', 'AZ', 'VM', 'VD', 'RS'];
          let remaining = cleanColor;
          while (remaining.length > 0) {
            let matched = false;
            for (const pc of possibleColors) {
              if (remaining.startsWith(pc)) {
                foundColors.push(COLOR_ABBR_MAP[pc] || pc);
                remaining = remaining.substring(pc.length);
                matched = true;
                break;
              }
            }
            if (!matched) {
              foundColors.push(remaining);
              break;
            }
          }
          color = foundColors.length > 0 ? foundColors.join('/') : 'SORT';
        }
      } else {
        const match = skuUpper.match(/C?([A-Z]{2,4})T?([GPM]|GG|XG)$/);
        if (match) {
          const rawColor = match[1];
          size = match[2];
          color = COLOR_ABBR_MAP[rawColor] || rawColor;
        } else {
          size = 'U';
          color = 'SEM COR';
        }
      }
    }
  }

  const kitMatch = sku.match(/^([A-Z0-9]+?)(CS|PT|BC|CZ|AZ|VM|VD|AA|AB|AC|AD)TOT(GG|G|M|P)$/i);
  if (kitMatch) {
    isSeniorSKU = true;
    const rawColor = kitMatch[2].toUpperCase();
    skuSize = kitMatch[3].toUpperCase();
    if (rawColor === 'CS') {
      skuColor = 'SORT';
    } else if (rawColor === 'PT') {
      skuColor = 'PTO';
    } else if (rawColor === 'BC') {
      skuColor = 'BCO';
    } else {
      skuColor = SKU_COLOR_MAP[rawColor] || rawColor;
    }
  } else if (sku.length === 23) {
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
  let isOlympikusCustomSKU = false;
  if (skuUpper.startsWith('TENIS433951')) {
    isOlympikusCustomSKU = true;
    const sizeMatch = skuUpper.match(/(\d{2})$/);
    size = sizeMatch ? sizeMatch[1] : 'U';
    if (skuUpper.includes('CPTODOUT')) {
      color = 'PTO/DOUT';
    } else if (skuUpper.includes('CPTO')) {
      color = 'PTO';
    } else {
      color = 'SEM COR';
    }
  }

  let isNewBalanceSKU = false;
  if (skuUpper.startsWith('NB000GM500V2')) {
    isNewBalanceSKU = true;
    const block = skuUpper.substring(12, 18);
    const p1 = block.substring(0, 2);
    const p2 = block.substring(2, 4);
    const p3 = block.substring(4, 6);

    const colors = [];
    if (SKU_COLOR_MAP[p1] && p1 !== 'CN' && p1 !== '00') colors.push(SKU_COLOR_MAP[p1]);
    if (SKU_COLOR_MAP[p2] && p2 !== 'CN' && p2 !== '00') colors.push(SKU_COLOR_MAP[p2]);
    if (SKU_COLOR_MAP[p3] && p3 !== 'CN' && p3 !== '00') colors.push(SKU_COLOR_MAP[p3]);
    
    const uniqueColors = Array.from(new Set(colors));
    color = uniqueColors.length > 0 ? uniqueColors.join('/').toUpperCase() : 'SEM COR';

    const sizeMatch = skuUpper.substring(18, 20);
    size = sizeMatch ? sizeMatch.toUpperCase() : 'U';
  }

  if (isSeniorSKU) {
    color = skuColor;
    
    if (skuSize.startsWith('0') && skuSize.length === 2) {
      size = skuSize.substring(1).toUpperCase();
    } else {
      size = skuSize.toUpperCase();
    }

    baseTitle = baseTitle.replace(sizeRegex, '');
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
  } else if (isOlympikusCustomSKU) {
    // Already extracted color and size from SKU!
    // Clean up baseTitle
    baseTitle = baseTitle.replace(sizeRegex, '');
    baseTitle = baseTitle.replace(endSizeRegex, '');
  } else if (isNewBalanceSKU) {
    // Already extracted color and size from SKU!
    // Clean up baseTitle
    baseTitle = baseTitle.replace(sizeRegex, '');
    baseTitle = baseTitle.replace(endSizeRegex, '');
  } else if (isSandriniSKU) {
    // Already extracted color and size from SKU!
    // Clean up baseTitle
    baseTitle = baseTitle.replace(sizeRegex, '');
    baseTitle = baseTitle.replace(endSizeRegex, '');

    // Se a descrição tiver 'LUPO' por conta de mapeamento incorreto na planilha, forçamos para ser Sandrini
    if (baseTitle.toUpperCase().includes('DRY') && baseTitle.toUpperCase().includes('LUPO')) {
      baseTitle = 'Camiseta Dry Fit Sandrini M.c';
      if (skuUpper.includes('2351') || skuUpper.includes('2352') || skuUpper.includes('2353') || skuUpper.includes('ML')) {
        baseTitle = 'Camiseta Dry Fit Sandrini M.l';
      }
    }
  } else {
    // Fallback parsing
    if (!size) {
      const sizeMatch = baseTitle.match(sizeRegex);
      if (sizeMatch) {
        size = sizeMatch[1].toUpperCase();
        baseTitle = baseTitle.replace(sizeRegex, '').trim();
      } else {
        const endSizeMatch = baseTitle.match(endSizeRegex);
        if (endSizeMatch) {
          size = endSizeMatch[1].toUpperCase();
          baseTitle = baseTitle.replace(endSizeRegex, '').trim();
        }
      }
    } else {
      // Remove any size suffix from baseTitle if we already have it pre-extracted
      baseTitle = baseTitle.replace(sizeRegex, '').trim();
      baseTitle = baseTitle.replace(endSizeRegex, '').trim();
    }

    // Pre-replace multi-word color names with their single-word abbreviations to handle slashes correctly
    const multiWordColors = [
      'AZUL CLARO', 'AZUL ESCURO', 'AZUL ROYAL', 'AZUL NAVY', 'AZUL BEBÊ',
      'VERDE MILITAR', 'VERDE LIMÃO', 'VERDE OLIVA',
      'ROSA CLARO', 'ROSA ESCURO',
      'MARROM CLARO', 'MARROM ESCURO',
      'OFF WHITE', 'OFF-WHITE',
      'PLEIN AIR', 'PLAIN AIR', 'FLAMENGO SCARLET'
    ];
    for (const phrase of multiWordColors) {
      const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
      baseTitle = baseTitle.replace(regex, COLOR_ABBR_MAP[phrase] || phrase);
    }

    if (!color || color === 'SEM COR') {
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
    } else {
      // Remove color word from baseTitle if we already have it pre-extracted
      const commonColors = Object.keys(COLOR_ABBR_MAP);
      for (const c of commonColors) {
        const colorWordRegex = new RegExp(`\\b${c}\\b`, 'i');
        if (colorWordRegex.test(baseTitle)) {
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

  const baseTitleUpper = baseTitle.toUpperCase();
  if (skuUpper.startsWith('KSA08000002350')) {
    baseTitle = 'Kit 4 Camisetas Dry (2350) + 4 Shorts Tactel (77046)';
  } else if (skuUpper.startsWith('KSA05000002355')) {
    baseTitle = 'Kit 3 Regatas Dry (2355) + 2 Shorts Tactel (77046)';
  } else if (baseTitleUpper.includes('CAMISETA') && baseTitleUpper.includes('DRY') && (baseTitleUpper.includes('2350') || skuUpper.includes('2350'))) {
    baseTitle = 'Kit 4 Camisetas Dry Sandrini Manga Curta';
  } else if (baseTitleUpper.includes('SD2513') || skuUpper.includes('SD2513')) {
    baseTitle = 'Tenis Sandrini Aero Run (SD2513)';
  } else if (baseTitleUpper.includes('A623') || skuUpper.includes('A623')) {
    baseTitle = 'Tenis Sandrini Spryte (A623)';
  } else if (baseTitleUpper.includes('A593') || skuUpper.includes('A593')) {
    baseTitle = 'Sapatênis Casual Sandrini (A593)';
  } else if (baseTitleUpper.includes('77046') || skuUpper.includes('77046')) {
    let qty = 2; // default fallback
    const kitSkuMatch = skuUpper.match(/^K[A-Z]{2}(\d{2})/);
    if (kitSkuMatch) {
      qty = parseInt(kitSkuMatch[1], 10);
    } else {
      const kitDescMatch = cleanDesc.toUpperCase().match(/KIT\s*(\d+)/i);
      if (kitDescMatch) {
        qty = parseInt(kitDescMatch[1], 10);
      }
    }
    
    const isKit = skuUpper.startsWith('K') || skuUpper.includes('KIT') || cleanDesc.toUpperCase().includes('KIT');
    if (isKit) {
      baseTitle = `Kit ${qty} Shorts Sandrini Tactel Elástico (77046)`;
    } else {
      baseTitle = 'Shorts Sandrini Tactel Elástico (77046)';
    }
  } else if (baseTitleUpper.includes('433951') || skuUpper.includes('433951')) {
    baseTitle = 'Tênis Olympikus Marte (433951)';
  } else if (baseTitleUpper.includes('GM500') || skuUpper.includes('GM500')) {
    baseTitle = 'Tênis New Balance 500 V2 (GM500V2)';
  } else if (baseTitleUpper.includes('1371421') || skuUpper.includes('1371421') || baseTitleUpper.includes('U01FB00376') || skuUpper.includes('U01FB00376')) {
    baseTitle = 'Chuteira Umbro Campo Fast II (U01FB00376)';
  } else if (baseTitleUpper.includes('1371440') || skuUpper.includes('1371440') || baseTitleUpper.includes('U01FB00454') || skuUpper.includes('U01FB00454')) {
    baseTitle = 'Chuteira Umbro Futsal Invictus (U01FB00454)';
  } else if (baseTitleUpper.includes('1371649') || skuUpper.includes('1371649') || baseTitleUpper.includes('U01FB00455') || skuUpper.includes('U01FB00455')) {
    baseTitle = 'Chuteira Umbro Society Invictus (U01FB00455)';
  } else if (baseTitleUpper.includes('CUECA') && baseTitleUpper.includes('SANDRINI') && (baseTitleUpper.includes('ALGOD') || baseTitleUpper.includes('ALGODA')) && (baseTitleUpper.includes('10') || baseTitleUpper.includes('K10') || skuUpper.includes('K10BMS'))) {
    baseTitle = 'Kit 10 Cuecas Sandrini Algodão';
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
        if (['nb', 'bb80', 'bdp', 'rc2', 'fba', 'sd2513', 'sn-465', 'sn465', 'gm500', 'gm500v2', 'ii'].includes(cleanWord)) {
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
