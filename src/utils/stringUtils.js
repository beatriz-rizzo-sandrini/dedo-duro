export const toTitleCase = (str) => {
  if (!str) return '';
  
  // Lista de siglas de cores e marcas que devem ficar em CAIXA ALTA
  const caixaAlta = new Set([
    'NB', 'BDP', 'FBA', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'PTO', 'BCO', 'AZ', 'MAR', 'CZ', 'VM', 'BGE', 'MRM', 'VDM', 'VD', 'BDO', 'AZE', 'VDL', 'VIN',
    'AZC', 'AZR', 'NAV', 'RS', 'RSC', 'AM', 'AV', 'LRJ', 'AW', 'VDC', 'CHO', 'CAR', 'CZC', 'MES',
    'BB', 'BC', 'SLM', 'BD', 'BE', 'VME', 'BF', 'MOS', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM',
    'BN', 'TUR', 'BO', 'BP', 'GRF', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX', 'BY', 'BZ',
    'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO',
    'CP', 'CQ', 'CR', 'CS', 'CT', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DA', 'DB', 'FA', 'GEL'
  ]);

  const pequenas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'com', 'por', 'para'];

  const titleCased = str
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return '';
      
      const cleanWord = word.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      
      // Regra 1: Se contém dígitos, deixa em CAIXA ALTA (ex: SD2513, 413V3, JJ7822)
      if (/\d/.test(word)) {
        return word.toUpperCase();
      }
      
      // Regra 2: Se é uma sigla conhecida, deixa em CAIXA ALTA (ex: NB, PTO)
      if (caixaAlta.has(cleanWord)) {
        return word.toUpperCase();
      }
      
      // Regra 3: Se é palavra de ligação, deixa em minúscula (exceto se for a primeira)
      const wordLower = word.toLowerCase();
      if (pequenas.includes(wordLower) && index !== 0) {
        return wordLower;
      }
      
      // Regra 4: Padrão Title Case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  // Deixa tudo que estiver entre parênteses em CAIXA ALTA
  return titleCased.replace(/\(([^)]+)\)/g, (match) => match.toUpperCase());
};
