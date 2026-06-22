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
  'BCO': 'BCO', 'BC': 'BCO', 'BRANCO': 'BCO', 'BRC': 'BCO',
  'CZ': 'CZ', 'CZA': 'CZ', 'CNZA': 'CZ', 'CINZA': 'CZ', 'CNZ': 'CZ',
  'GRF': 'GRF', 'GP': 'GRF', 'GRAFITE': 'GRF',
  'AZ': 'AZ', 'AZL': 'AZ', 'AZUL': 'AZ',
  'AZC': 'AZC', 'AZUL CLARO': 'AZC', 'PLEIN AIR': 'AZC', 'PLAIN AIR': 'AZC', 'PLEINAIR': 'AZC', 'PLAINAIR': 'AZC',
  'AZR': 'AZR', 'AZUL ROYAL': 'AZR',
  'NAV': 'NAV', 'AZUL NAVY': 'NAV',
  'MAR': 'MAR', 'MARINHO': 'MAR',
  'VM': 'VM', 'VERMELHO': 'VM', 'VRM': 'VM', 'VVR': 'VM', 'SCARLET': 'VM', 'FLAMENGO SCARLET': 'VM', 'FLAMENGOSCARLET': 'VM',
  'VD': 'VD', 'VERDE': 'VD',
  'RS': 'RS', 'ROSA': 'RS',
  'RSE': 'RSE', 'ROSA ESCURO': 'RSE',
  'AM': 'AM', 'AMARELO': 'AM',
  'DOR': 'DOR', 'DORD': 'DOR', 'DOURADO': 'DOR',
  'PRT': 'PRT', 'PRATA': 'PRT',
  'SORT': 'SORT', 'SORTIDO': 'SORT',
  'BGE': 'BGE', 'BEGE': 'BGE',
  'OFW': 'OFW', 'OFF WHITE': 'OFW', 'OFF-WHITE': 'OFW',
  'OFF BRANCO': 'OFW', 'OFF-BRANCO': 'OFW',
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
  'ALL BLACK': 'ALL BLACK', 'ALLBLACK': 'ALL BLACK',
  'MILITAR': 'VDM', 'SORTIDOG': 'SORT',
  'SORTIDO': 'SORT', 'SORTIDOS': 'SORT',
  'SORTIDA': 'SORT', 'SORTIDAS': 'SORT',
  'PRETA': 'PTO', 'PRETAS': 'PTO',
  'BRANCA': 'BCO', 'BRANCAS': 'BCO',
  'VERMELHA': 'VM', 'VERMELHAS': 'VM',
  'AMARELA': 'AM', 'AMARELAS': 'AM',
  'COLORIDA': 'MULT', 'COLORIDAS': 'MULT', 'COLORIDO': 'MULT', 'COLORIDOS': 'MULT',
  'MESCLADO': 'MES', 'MESCLADA': 'MES', 'MESCLADOS': 'MES', 'MESCLADAS': 'MES'
};

function isValidSize(val) {
  if (!val) return false;
  const valUpper = val.toUpperCase().trim();
  if (['G1', 'G2', 'G3', 'G4', 'GG', 'XG', 'G', 'P', 'M', 'U', 'ÚNICO', 'UNICO', 'UNISSEX', 'UNISEX'].includes(valUpper)) {
    return true;
  }
  if (/^\d{2}\/\d{2}$/.test(valUpper)) {
    const parts = valUpper.split('/');
    const n1 = parseInt(parts[0]);
    const n2 = parseInt(parts[1]);
    return n1 >= 14 && n1 <= 48 && n2 >= 14 && n2 <= 48;
  }
  const num = parseInt(valUpper);
  if (!isNaN(num) && num >= 14 && num <= 48) {
    return true;
  }
  return false;
}

export function parseProductDescription(desc, sku = '', isWatch = false, brand = '') {
  if (!desc) {
    return {
      baseTitle: sku || 'Produto Sem Descrição',
      color: 'SEM COR',
      size: 'U',
      descricaoFormatada: sku || 'Produto Sem Descrição'
    };
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
    let cleanBrand = brand;
    if (!cleanBrand || cleanBrand.toUpperCase() === 'SEM MARCA') {
      const descUpper = desc.toUpperCase();
      if (descUpper.includes('TECHNOS')) cleanBrand = 'Technos';
      else if (descUpper.includes('CONDOR')) cleanBrand = 'Condor';
      else if (descUpper.includes('MONDAINE')) cleanBrand = 'Mondaine';
      else if (descUpper.includes('SECULUS')) cleanBrand = 'Seculus';
      else if (descUpper.includes('FOSSIL')) cleanBrand = 'Fossil';
      else if (descUpper.includes('EURO')) cleanBrand = 'Euro';
      else cleanBrand = '';
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
          if (['nb', 'technos', 'condor', 'mondaine', 'seculus', 'fossil', 'euro'].includes(cleanWord.toLowerCase())) {
            return word.toUpperCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    };

    let modelCode = '';
    const cleanSku = String(sku).trim().toUpperCase();
    if (cleanSku && !cleanSku.startsWith('MLB') && cleanSku.length >= 5 && cleanSku.length <= 15) {
      modelCode = cleanSku;
    } else {
      const matches = desc.match(/\b([A-Z0-9]{5,15})\b/g) || [];
      const forbidden = ['RELOGIO', 'RELÓGIO', 'TECHNOS', 'MASCULINO', 'FEMININO', 'PULSEIRA', 'MOSTRADOR', 'DOURADO', 'PRATA', 'SILICONE', 'RACER', 'LEGACY'];
      const candidates = matches.filter(m => !forbidden.includes(m.toUpperCase()));
      if (candidates.length > 0) {
        modelCode = candidates[candidates.length - 1].toUpperCase();
      } else {
        modelCode = cleanSku;
      }
    }

    const brandStr = cleanBrand ? toTitleCase(cleanBrand.trim()) : 'Technos';
    const baseTitle = `Relógio ${brandStr} ${modelCode}`.replace(/\s+/g, ' ').trim();

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
  const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|Tamanho|CORL)\s*(GG|XG|[GPM]|G\d|\d+(?:\/\d+)?)/i;
  const originalSizeMatch = desc.match(sizeRegex);
  if (originalSizeMatch) {
    size = originalSizeMatch[1].toUpperCase();
  } else {
    const endSizeRegex = /\b(G\d|GG|XG|[GPM]|\d{2}(?:\/\d{2})?)$/i;
    const originalEndSizeMatch = desc.match(endSizeRegex);
    if (originalEndSizeMatch) {
      const val = originalEndSizeMatch[1].toUpperCase();
      if (isValidSize(val)) {
        size = val;
      }
    } else {
      const brSizeMatch = desc.match(/\b(\d{2})\s*Br\b/i);
      if (brSizeMatch) {
        size = brSizeMatch[1];
      }
    }
  }

  // Extração precoce de cor a partir da descrição original (padrão Cor:xxx)
  const corParamRegex = /\b(?:Cor|Cores)\s*:\s*([^;]+)/i;
  const originalCorMatch = desc.match(corParamRegex);
  if (originalCorMatch) {
    color = originalCorMatch[1].toUpperCase().trim();
  }

  let cleanDesc = desc.trim();

  // Normalize common color spelling typos early
  cleanDesc = cleanDesc.replace(/\bOFF\s+WHIT\s+E\b/gi, 'OFF WHITE');

  // Strip parenthesis around Fila reference codes (e.g. (F01TR00024) -> F01TR00024)
  cleanDesc = cleanDesc.replace(/\((F\d{2}[A-Z]{1,2}\d{3,5})\)/gi, '$1');

  // 1. Se começar com SKU da Fila (ex: F02TR00095-), removemos o prefixo e guardamos para o final
  let prefixSku = '';
  const prefixSkuRegex = /^\b(F\d{2}[A-Z]{1,2}\d{3,5})\b\s*-\s*/i;
  const prefixMatch = cleanDesc.match(prefixSkuRegex);
  if (prefixMatch) {
    prefixSku = prefixMatch[1].toUpperCase();
    cleanDesc = cleanDesc.replace(prefixSkuRegex, '');
  }

  // Remove raw parameter garbage from Google Sheets (e.g. Cor:sortidos;tamanho...)
  cleanDesc = cleanDesc.replace(/(?:Cor|Tamanho|Tam|Ref|cós|cos)\s*:\s*.*$/i, '');
  cleanDesc = cleanDesc.replace(/;\s*.*$/i, '');
  cleanDesc = cleanDesc.replace(/[\s\-,;:]+$/, '').trim();

  // Padroniza e limpa termos duplicados e formatos de versão
  cleanDesc = cleanDesc
    .replace(/\b(tenis|tênis)\b\s+\b(adidas|fila|nike|olympikus|puma|new\s+balance|nb)\b\s+\b(tenis|tênis)\b/gi, '$1 $2')
    .replace(/\bRC\s*2\b/gi, 'RC2')
    .replace(/\bSL\s*2\b/gi, 'SL2')
    .replace(/\b([0-9])\s+([0-9])\b/g, '$1.$2');

  const cleanSkuForSandrini = String(sku || '').trim().toUpperCase();
  const isSandrini = cleanSkuForSandrini.startsWith('KSA') || /^SA\d+/.test(cleanSkuForSandrini) || /sandrini/i.test(brand || '') || /sandrini/i.test(desc || '');
  const isShoe = /tenis|tênis|papete|bota|sapatenis|sapatênis|slide|sandalia|sandália|chuteira|sapato|chinelo/i.test(cleanDesc);

  if (isShoe) {
    // 2. Remove qualquer código de cor de 4 dígitos para calçados (apenas Fila)
    const isFila = /fila/i.test(cleanDesc) || sku.toUpperCase().startsWith('F');
    if (isFila) {
      cleanDesc = cleanDesc.replace(/\b\d{4}\b/g, '');
    }

    if (!isSandrini) {
      // 3. Remove código de cor específico da Adidas (ex: HQ0236, IH8217, KJ0082)
      cleanDesc = cleanDesc.replace(/\b[A-Z]{2}\d{4}\b/gi, '');

      // 4. Remove código de cor específico da New Balance (ex: M413ZF3, BB480HEB, BB80FAA)
      cleanDesc = cleanDesc.replace(/\b[A-Z]{1,2}\d{3}[A-Z0-9]{3}\b/gi, '');
      cleanDesc = cleanDesc.replace(/\b[A-Z]{3,4}\d{2,3}[A-Z0-9]{2,3}\b/gi, '');

      // 5. Remove códigos numéricos longos (6 a 10 dígitos) - ex: Olympikus, Puma, Bibi, Klin, Democrata
      cleanDesc = cleanDesc.replace(/\b\d{6,10}\b/g, '');

      // 6. Remove códigos específicos da Skechers (ex: GTW128608, 894389BRBBK)
      cleanDesc = cleanDesc.replace(/\b[A-Z]{3}\d{6}\b/gi, '');
      cleanDesc = cleanDesc.replace(/\b\d{6}[A-Z]{3,5}\b/gi, '');
    }

    // Padroniza/espaça as palavras de gênero/categoria
    cleanDesc = cleanDesc.replace(/\b(MASCULINO|MASCULINA|FEMININO|FEMININA|INFANTIL|UNISEX|UNISSEX)\b/gi, ' $1 ');

    // 7. Identifica palavra de gênero/categoria e faz o truncamento inteligente baseado na marca
    const words = cleanDesc.trim().split(/\s+/);
    
    // Lista de marcas conhecidas de calçados
    const brands = ['FILA', 'ADIDAS', 'NEW BALANCE', 'NB', 'OLYMPIKUS', 'OLY', 'PUMA', 'SKECHERS', 'KLIN', 'DEMOCRATA', 'BIBI', 'BULL TERRIER', 'SANDRINI'];
    const genders = ['MASCULINO', 'MASCULINA', 'FEMININO', 'FEMININA', 'INFANTIL', 'UNISEX', 'UNISSEX'];
    
    let brandIdx = -1;
    let genderIdx = -1;

    for (let i = 0; i < words.length; i++) {
      const wUpper = words[i].toUpperCase();
      if (brandIdx === -1 && brands.includes(wUpper)) {
        brandIdx = i;
      }
      if (genderIdx === -1 && genders.includes(wUpper)) {
        genderIdx = i;
      }
    }

    let shouldTruncate = false;
    if (genderIdx !== -1) {
      if (brandIdx !== -1) {
        if (genderIdx - brandIdx >= 2) {
          shouldTruncate = true;
        }
      } else {
        if (genderIdx >= 3) {
          shouldTruncate = true;
        }
      }
    }

    let cleanTitle = cleanDesc;
    if (shouldTruncate && genderIdx !== -1) {
      cleanTitle = words.slice(0, genderIdx + 1).join(' ');
    }

    // Limpezas de caracteres residuais
    cleanTitle = cleanTitle.replace(/[\s\-,;:]+$/, '').replace(/^[\s\-,;:]+/, '').trim();

    // Se tivermos um prefixSku extraído anteriormente, ou se houver um código de referência Fila
    // no original (ex: F02TR00073, F01TR00065), queremos garantir que ele seja adicionado/mantido no final
    let refCode = prefixSku;
    if (!refCode) {
      const refMatch = desc.match(/\b(F\d{2}[A-Z]{1,2}\d{3,5})\b/i);
      if (refMatch) {
        refCode = refMatch[1].toUpperCase();
      }
    }

    if (refCode) {
      // Remove any existing occurrence of the refCode in the cleanTitle so we can append it cleanly at the end
      const refRegex = new RegExp(`\\b${refCode}\\b`, 'gi');
      cleanTitle = cleanTitle.replace(refRegex, '').replace(/\s+/g, ' ').trim();

      // Auto-inject gender based on Fila code (F01 = Masculino, F02 = Feminino) if not already present
      if (refCode.startsWith('F0')) {
        const titleUpper = cleanTitle.toUpperCase();
        const hasMasculino = titleUpper.includes('MASCULINO') || titleUpper.includes('MASCULINA');
        const hasFeminino = titleUpper.includes('FEMININO') || titleUpper.includes('FEMININA');

        if (!hasMasculino && !hasFeminino) {
          if (refCode.startsWith('F01')) {
            cleanTitle = `${cleanTitle} Masculino`;
          } else if (refCode.startsWith('F02')) {
            cleanTitle = `${cleanTitle} Feminino`;
          }
        }
      }

      cleanTitle = `${cleanTitle} ${refCode}`;
    }

    cleanDesc = cleanTitle;
  }

  let baseTitle = cleanDesc;
  baseTitle = baseTitle.replace(/\b\d{2}\s*Br\b/gi, '').trim();

  // Pre-replace multi-word color names with their single-word abbreviations to handle slashes correctly
  const multiWordColors = [
    'AZUL CLARO', 'AZUL ESCURO', 'AZUL ROYAL', 'AZUL NAVY', 'AZUL BEBÊ',
    'VERDE MILITAR', 'VERDE LIMÃO', 'VERDE OLIVA',
    'ROSA CLARO', 'ROSA ESCURO',
    'MARROM CLARO', 'MARROM ESCURO',
    'OFF WHITE', 'OFF-WHITE',
    'OFF BRANCO', 'OFF-BRANCO',
    'PLEIN AIR', 'PLAIN AIR', 'FLAMENGO SCARLET'
  ];
  for (const phrase of multiWordColors) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    baseTitle = baseTitle.replace(regex, COLOR_ABBR_MAP[phrase] || phrase);
  }

  // 1. Check if SKU matches the standard Senior SKU pattern or custom kit SKU pattern
  let isSeniorSKU = false;
  let skuColor = '';
  let skuSize = '';

  // Fila Partner SKU Parser (e.g. F01TR00067CPTOGRFDORT40)
  const partnerFilaMatch = sku.toUpperCase().match(/^(F\d{2}[A-Z]{1,2}\d{3,5})C([A-Z]+)T(\d{2})$/i);
  if (partnerFilaMatch) {
    isSeniorSKU = true;
    skuSize = partnerFilaMatch[3];
    
    const colorGroup = partnerFilaMatch[2];
    const colors = [];
    for (let i = 0; i < colorGroup.length; i += 3) {
      const chunk = colorGroup.substring(i, i + 3);
      if (chunk.length === 3) {
        colors.push(COLOR_ABBR_MAP[chunk] || chunk);
      }
    }
    const uniqueColors = Array.from(new Set(colors));
    skuColor = uniqueColors.length > 0 ? uniqueColors.join('/') : 'SEM COR';

    // Garante que o código de referência (ex: F01TR00067) seja adicionado ao baseTitle
    // para que agrupe perfeitamente com os itens que já possuem a descrição oficial com a referência.
    const refCode = partnerFilaMatch[1].toUpperCase();
    if (!baseTitle.toUpperCase().includes(refCode)) {
      baseTitle = `${baseTitle} ${refCode}`;
    }
  }

  // Sandrini Custom SKU Parser (e.g. CAMISETADRY2350CPTOTP, K4CAMISETADRY2350CSORT1TG)
  let isSandriniSKU = false;
  const skuUpper = sku.toUpperCase();
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

  // Kit Senior SKU Parser (e.g. KSA03000002355CM0G0256, KSA020077046ELCM0G0221)
  // Format: K + 2 letters (brand) + 2 digits (quantity) + 9 chars (model) + 2 chars (color) + 2 chars (size) + 4 chars (suffix) = 22 characters.
  const kitSeniorMatch = skuUpper.match(/^K([A-Z]{2})\d{2}/i);
  if (kitSeniorMatch && (sku.length === 22 || sku.length === 23)) {
    // Try index 14 first
    let colorCode = skuUpper.substring(14, 16);
    let sizeCode = skuUpper.substring(16, 18);
    if (SKU_COLOR_MAP[colorCode]) {
      isSeniorSKU = true;
      skuColor = SKU_COLOR_MAP[colorCode];
      skuSize = sizeCode;
    } else {
      // Try index 15 (if model is 10 characters or prefix has 1 more character)
      colorCode = skuUpper.substring(15, 17);
      sizeCode = skuUpper.substring(17, 19);
      if (SKU_COLOR_MAP[colorCode]) {
        isSeniorSKU = true;
        skuColor = SKU_COLOR_MAP[colorCode];
        skuSize = sizeCode;
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
  } else if (sku.length === 22 || sku.length === 23) {
    let block = sku.substring(11, 17);
    let p1 = block.substring(0, 2);
    let p2 = block.substring(2, 4);
    let p3 = block.substring(4, 6);

    if (SKU_COLOR_MAP[p1] && SKU_COLOR_MAP[p2] && SKU_COLOR_MAP[p3]) {
      isSeniorSKU = true;
      if (block === 'AAAAAA') {
        skuColor = 'ALL BLACK';
      } else {
        const colors = [];
        if (p1 !== 'CN' && p1 !== '00') colors.push(SKU_COLOR_MAP[p1]);
        if (p2 !== 'CN' && p2 !== '00') colors.push(SKU_COLOR_MAP[p2]);
        if (p3 !== 'CN' && p3 !== '00') colors.push(SKU_COLOR_MAP[p3]);
        const uniqueColors = Array.from(new Set(colors));
        skuColor = uniqueColors.length > 0 ? uniqueColors.join('/').toUpperCase() : 'SEM COR';
      }
      skuSize = sku.substring(17, 19);
    } else {
      block = sku.substring(12, 18);
      p1 = block.substring(0, 2);
      p2 = block.substring(2, 4);
      p3 = block.substring(4, 6);

      if (SKU_COLOR_MAP[p1] && SKU_COLOR_MAP[p2] && SKU_COLOR_MAP[p3]) {
        isSeniorSKU = true;
        if (block === 'AAAAAA') {
          skuColor = 'ALL BLACK';
        } else {
          const colors = [];
          if (p1 !== 'CN' && p1 !== '00') colors.push(SKU_COLOR_MAP[p1]);
          if (p2 !== 'CN' && p2 !== '00') colors.push(SKU_COLOR_MAP[p2]);
          if (p3 !== 'CN' && p3 !== '00') colors.push(SKU_COLOR_MAP[p3]);
          const uniqueColors = Array.from(new Set(colors));
          skuColor = uniqueColors.length > 0 ? uniqueColors.join('/').toUpperCase() : 'SEM COR';
        }
        skuSize = sku.substring(18, 20);
      }
    }
  }

  if (isSeniorSKU) {
    color = skuColor;
    
    if (skuSize.startsWith('0') && skuSize.length === 2) {
      size = skuSize.substring(1).toUpperCase();
    } else {
      size = skuSize.toUpperCase();
    }
    if (size === '0' || size === '00') {
      size = 'U';
    }


    const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|Tamanho|CORL)\s*(GG|XG|[GPM]|G\d|\d+(?:\/\d+)?)/i;
    baseTitle = baseTitle.replace(sizeRegex, '');

    const endSizeRegex = /\b(G\d|GG|XG|[GPM]|\d{2}(?:\/\d{2})?)$/i;
    const endSizeMatch = baseTitle.match(endSizeRegex);
    if (endSizeMatch && isValidSize(endSizeMatch[1])) {
      baseTitle = baseTitle.replace(endSizeRegex, '');
    }

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
  } else if (isSandriniSKU) {
    // Already extracted color and size from SKU!
    // Clean up baseTitle
    const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|Tamanho|CORL)\s*(GG|XG|[GPM]|G\d|\d+(?:\/\d+)?)/i;
    baseTitle = baseTitle.replace(sizeRegex, '');

    const endSizeRegex = /\b(G\d|GG|XG|[GPM]|\d{2}(?:\/\d{2})?)$/i;
    const endSizeMatch = baseTitle.match(endSizeRegex);
    if (endSizeMatch && isValidSize(endSizeMatch[1])) {
      baseTitle = baseTitle.replace(endSizeRegex, '');
    }

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
        const endSizeRegex = /\b(G\d|GG|XG|[GPM]|\d{2}(?:\/\d{2})?)$/i;
        const endSizeMatch = baseTitle.match(endSizeRegex);
        if (endSizeMatch && isValidSize(endSizeMatch[1])) {
          size = endSizeMatch[1].toUpperCase();
          baseTitle = baseTitle.replace(endSizeRegex, '').trim();
        }
      }
    } else {
      // Remove any size suffix from baseTitle if we already have it pre-extracted
      baseTitle = baseTitle.replace(sizeRegex, '').trim();
      const endSizeRegex = /\b(G\d|GG|XG|[GPM]|\d{2}(?:\/\d{2})?)$/i;
      const endSizeMatch = baseTitle.match(endSizeRegex);
      if (endSizeMatch && isValidSize(endSizeMatch[1])) {
        baseTitle = baseTitle.replace(endSizeRegex, '').trim();
      }
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

    if (!color) {
      color = 'SEM COR';
    }
  }

  const skuUpperForOverride = String(sku || '').trim().toUpperCase();
  if (skuUpperForOverride.startsWith('NB001323396AJCNCN')) {
    color = 'MUS';
  } else if (skuUpperForOverride.startsWith('NB000GM500V2BOAWCN')) {
    color = 'VD';
  }

  // Global Color Normalization: runs for Senior, Sandrini, and Fallback parsed colors.
  if (color && color.toUpperCase() !== 'SEM COR') {
    let cleanColor = color.toUpperCase()
      .replace(/OFF-WHITE/g, 'OFW')
      .replace(/OFF WHITE/g, 'OFW')
      .replace(/\s*-\s*B\d+/g, '') // remove - B200 etc
      .replace(/\s+-\s+.*/g, '');  // remove any trailing text after space-hyphen-space
    
    const parts = cleanColor.split(/[\s/-]+/);
    const normalizedParts = parts
      .map(p => COLOR_ABBR_MAP[p] || p)
      .filter(p => p && p !== 'SEM COR' && p !== 'E' && p !== 'AND' && p !== 'COM' && p !== 'WITH');
    
    if (!isSandrini) {
      normalizedParts.sort();
    }
    color = normalizedParts.length > 0 ? normalizedParts.join('/') : 'SEM COR';
  } else {
    color = 'SEM COR';
  }

  baseTitle = baseTitle
    .replace(/[\s\-,;:/]+$/, '')
    .replace(/^[\s\-,;:/]+/, '')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\(\s*\)/g, '')
    .trim();

  // Remove termos de gênero para agrupar variações masculinas/femininas/infantis do mesmo modelo
  baseTitle = baseTitle.replace(/\b(masculino|masculina|feminino|feminina|unisex|unissex|infantil|juvenil)\b/gi, '');

  baseTitle = baseTitle.replace(/\s+/g, ' ').trim();

  // 1. Standardize accents on common e-commerce terms
  baseTitle = baseTitle
    .replace(/tênis/gi, 'Tenis')
    .replace(/tenis/gi, 'Tenis')
    .replace(/sapatênis/gi, 'Sapatenis')
    .replace(/sapatenis/gi, 'Sapatenis')
    .replace(/sandália/gi, 'Sandalia')
    .replace(/sandalia/gi, 'Sandalia')
    .replace(/relógio/gi, 'Relogio')
    .replace(/relogio/gi, 'Relogio');

  // 2. Remove redundant NB if New Balance is brand or in title
  if (/NEW BALANCE/i.test(baseTitle) || (brand && brand.toUpperCase() === 'NEW BALANCE') || skuUpper.startsWith('NB')) {
    baseTitle = baseTitle.replace(/\bNB\b/gi, '');
  }

  // 3. Remove generic e-commerce adjectives that hinder grouping
  baseTitle = baseTitle.replace(/\b(original|originals|classico|classica|clássico|clássica|urbano|urbana|casual|esportivo|esportiva|running|kids|adulto|escolar)\b/gi, '');

  // 4. Clean up multiple spaces, dashes, commas, and trim
  baseTitle = baseTitle
    .replace(/\s+/g, ' ')
    .replace(/[\s\-,;:/]+$/, '')
    .replace(/^[\s\-,;:/]+/, '')
    .trim();

  baseTitle = baseTitle.replace(/\bSD-(\d{4})\b/gi, 'SD$1');
  const baseTitleUpper = baseTitle.toUpperCase();

  if (skuUpper.startsWith('KSA08000002350')) {
    baseTitle = 'Kit 8 Camisetas Dry Sandrini Manga Curta';
  } else if (skuUpper.startsWith('KSA05000002355')) {
    baseTitle = 'Kit 3 Regatas Dry (2355) + 2 Shorts Tactel (77046)';
  } else if (baseTitleUpper.includes('CAMISETA') && baseTitleUpper.includes('DRY') && (baseTitleUpper.includes('2350') || skuUpper.includes('2350')) && (baseTitleUpper.includes('KIT 4') || skuUpper.startsWith('KSA04') || skuUpper.startsWith('K4'))) {
    baseTitle = 'Kit 4 Camisetas Dry Sandrini Manga Curta';
  } else if (baseTitleUpper.includes('SD2513') || skuUpper.includes('SD2513')) {
    const isKit = baseTitleUpper.includes('KIT') || skuUpper.startsWith('K') || skuUpper.startsWith('KSA');
    baseTitle = isKit ? 'Kit Tenis Sandrini Aero Run (SD2513)' : 'Tenis Sandrini Aero Run (SD2513)';
  } else if (baseTitleUpper.includes('A623') || skuUpper.includes('A623')) {
    const isKit = baseTitleUpper.includes('KIT') || skuUpper.startsWith('K') || skuUpper.startsWith('KSA');
    baseTitle = isKit ? 'Kit Tenis Sandrini Spryte (A623)' : 'Tenis Sandrini Spryte (A623)';
  } else if (baseTitleUpper.includes('77046') || skuUpper.includes('77046')) {
    baseTitle = 'Kit 2 Shorts Sandrini Tactel Elástico (77046)';
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
        if (['nb', 'bb80', 'bdp', 'rc2', 'fba', 'sd2513', 'sn-465', 'sn465'].includes(cleanWord) || (/[a-z]/i.test(cleanWord) && /\d/.test(cleanWord) && cleanWord.length >= 4)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  // Preenche a marca se ela estiver omitida na descrição oficial
  if (brand && brand.trim() && brand.toUpperCase() !== 'SEM MARCA') {
    const brandUpper = brand.trim().toUpperCase();
    const titleUpper = baseTitle.toUpperCase();
    if (!titleUpper.includes(brandUpper)) {
      const tenisRegex = /^(tenis|tênis|chinelo|bota|sapato|camiseta|regata|shorts?|kit)\b/i;
      const matchTenis = baseTitle.match(tenisRegex);
      if (matchTenis) {
        baseTitle = `${matchTenis[0]} ${toTitleCase(brand)} ${baseTitle.substring(matchTenis[0].length).trim()}`;
      } else {
        baseTitle = `${toTitleCase(brand)} ${baseTitle}`;
      }
    }
  }

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

export function autoResolveMeliSku(sku, desc) {
  const skuUpper = String(sku || '').trim().toUpperCase();
  if (!skuUpper.startsWith('MLB')) return sku;

  const descUpper = String(desc || '').toUpperCase();

  if (descUpper.includes('AERO RUN')) return 'SD2513';
  if (descUpper.includes('SOMA 2')) return 'OLY-SOMA2';
  if (descUpper.includes('NITREL V6')) return 'NB-NITREL-V6';
  if (descUpper.includes('DEFENDER')) return 'BOTA-DEFENDER';
  if (descUpper.includes('CORE HIKE')) return 'BOTA-CORE-HIKE';
  if (descUpper.includes('EVOKE EVO')) return 'EVOKE-EVO';
  if (descUpper.includes('BAGDA') || descUpper.includes('BAGDÁ')) return 'BOTA-BAGDA';
  if (descUpper.includes('QUADRA2') || descUpper.includes('QUADRA 2')) return 'OLY-QUADRA2';
  if (descUpper.includes('EFECTO')) return 'FILA-EFECTO';
  if (descUpper.includes('COMPRESSÃO 2 EM 1') || descUpper.includes('COMPRESSAO 2 EM 1')) return 'SHORT-COMPRESSAO';
  if (descUpper.includes('VL COURT 3.0') || descUpper.includes('VL COURT')) return 'ADIDAS-VL-COURT';
  if (descUpper.includes('FLOW')) return 'FLOW';
  if (descUpper.includes('SIGVARIS')) return 'SIGVARIS';
  if (descUpper.includes('CROSS')) return 'BOTA-CROSS';
  if (descUpper.includes('GO RUN')) return 'SKECHERS-GO-RUN';
  if (descUpper.includes('LITE FLOW')) return 'ADIDAS-LITE-FLOW';
  if (descUpper.includes('ENDURANCE')) return 'FILA-ENDURANCE';
  if (descUpper.includes('BLANC')) return 'SAPATENIS-BLANC';
  if (descUpper.includes('DEMOCRATA BLOCK') || descUpper.includes('SAPATENIS DEMOCRATA')) return 'DEMOCRATA-BLOCK';
  if (descUpper.includes('DEMOCRATA WIDE') || descUpper.includes('WIDE DENIM')) return 'DEMOCRATA-WIDE';
  if (descUpper.includes('DEMOCRATA JAKE') || descUpper.includes('DEMOCRATA DENIM JAKE')) return 'DEMOCRATA-JAKE';
  if (descUpper.includes('BLACKATLAS')) return 'BOTA-BLACKATLAS';
  if (descUpper.includes('FILA RIDE 2') || descUpper.includes('RIDE 2')) return 'FILA-RIDE';
  if (descUpper.includes('BEATS')) return 'OLY-BEATS';
  if (descUpper.includes('REDLINE')) return 'REDLINE';
  if (descUpper.includes('ADVANTAGE BASE')) return 'ADIDAS-ADVANTAGE';
  if (descUpper.includes('URBANCORE')) return 'URBANCORE';
  if (descUpper.includes('ADIZERO')) return 'ADIDAS-ADIZERO';
  if (descUpper.includes('JOTA PE')) return 'JOTA-PE';
  if (descUpper.includes('RAPIDMOVE')) return 'ADIDAS-RAPIDMOVE';
  if (descUpper.includes('MAXXI LITE')) return 'FILA-MAXXI-LITE';
  if (descUpper.includes('CATALYST')) return 'NB-CATALYST';
  if (descUpper.includes('LUUX')) return 'LUUX';
  if (descUpper.includes('LIVELLI')) return 'LIVELLI';
  if (descUpper.includes('DYNAMO RUN')) return 'DYNAMO-RUN';
  if (descUpper.includes('V12 MOLAS')) return 'V12-MOLAS';
  if (descUpper.includes('KLIN')) return 'KLIN';
  if (descUpper.includes('ECLYPTIX')) return 'ADIDAS-ECLYPTIX';
  if (descUpper.includes('FRESH FOAM')) return 'NB-FRESH-FOAM';
  if (descUpper.includes('STRIKER')) return 'FILA-STRIKER';
  if (descUpper.includes('CUECA BOXER') || descUpper.includes('CUECAS BOXER')) return 'CUECA-BOXER';
  if (descUpper.includes('BB80')) return 'NB-BB80';
  if (descUpper.includes('DURAMO SL')) return 'ADIDAS-DURAMO';
  if (descUpper.includes('ADILETTE AQUA')) return 'ADIDAS-ADILETTE';
  if (descUpper.includes('SPRITZ')) return 'FILA-SPRITZ';
  if (descUpper.includes('RETRO CLASS')) return 'RETRO-CLASS';
  if (descUpper.includes('SKYROCKET')) return 'PUMA-SKYROCKET';
  if (descUpper.includes('EVOZ')) return 'NB-EVOZ';
  if (descUpper.includes('AMASTE')) return 'NB-AMASTE';
  if (descUpper.includes('TRAILEDGE')) return 'BOTA-TRAILEDGE';
  if (descUpper.includes('GO TRAINER')) return 'FILA-GO-TRAINER';
  if (descUpper.includes('SLIDE BEAT')) return 'SLIDE-BEAT';
  if (descUpper.includes('BULL TERRIER')) return 'BOTA-BULL-TERRIER';
  if (descUpper.includes('NEOSLIDE')) return 'NEOSLIDE';
  if (descUpper.includes('BLEND')) return 'SAPATENIS-BLEND';
  if (descUpper.includes('PUMA')) return 'PUMA';

  return sku;
}

export function normalizeBrand(brand, sku, desc) {
  const brandUpper = String(brand || '').trim().toUpperCase();
  const skuUpper = String(sku || '').trim().toUpperCase();
  const descUpper = String(desc || '').trim().toUpperCase();

  if (skuUpper.startsWith('NB') || descUpper.includes('NEW BALANCE') || descUpper.includes('NEWBALANCE')) {
    return 'NEW BALANCE';
  }
  if (skuUpper.startsWith('FI') || skuUpper.startsWith('F0') || descUpper.includes('FILA')) {
    return 'FILA';
  }
  if (skuUpper.startsWith('AD') || descUpper.includes('ADIDAS')) {
    return 'ADIDAS';
  }
  if (skuUpper.startsWith('NI') || descUpper.includes('NIKE')) {
    return 'NIKE';
  }
  if (skuUpper.startsWith('OL') || descUpper.includes('OLYMPIKUS')) {
    return 'OLYMPIKUS';
  }
  if (skuUpper.startsWith('PU') || descUpper.includes('PUMA')) {
    return 'PUMA';
  }
  if (skuUpper.startsWith('LU') || descUpper.includes('LUPO') || descUpper.includes('LOBA')) {
    return 'LUPO';
  }
  if (skuUpper.startsWith('SK') || descUpper.includes('SKECHERS')) {
    return 'SKECHERS';
  }
  if (skuUpper.startsWith('KSA') || /^SA\d+/.test(skuUpper) || skuUpper.includes('SANDRINI') || descUpper.includes('SANDRINI')) {
    return 'SANDRINI';
  }

  if (brandUpper === '#N/A' || brandUpper === 'SEM MARCA' || !brandUpper) {
    return 'SEM MARCA';
  }
  return brandUpper;
}
