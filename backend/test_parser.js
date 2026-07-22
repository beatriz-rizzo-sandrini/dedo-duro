function parseProductDescription(desc, sku = '') {
  if (!desc) {
    return {
      baseTitle: sku || 'Produto Sem Descrição',
      color: 'Sem Cor',
      size: 'U'
    };
  }

  let baseTitle = desc.trim();
  let size = '';
  let color = '';

  // 1. Extract Size
  const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|CORL)\s*([GPM]|GG|XG|\d+(?:\/\d+)?)/i;
  const sizeMatch = baseTitle.match(sizeRegex);
  if (sizeMatch) {
    size = sizeMatch[1].toUpperCase();
    baseTitle = baseTitle.replace(sizeRegex, '').trim();
  } else {
    const endSizeRegex = /\b(\d{2}|[GPM]|GG|XG)$/i;
    const endSizeMatch = baseTitle.match(endSizeRegex);
    if (endSizeMatch) {
      size = endSizeMatch[1].toUpperCase();
      baseTitle = baseTitle.replace(endSizeRegex, '').trim();
    }
  }

  // 2. Extract Color
  const colorSlashRegex = /\b([A-Z]{3,}(?:\/[A-Z0-9]{2,})+|[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+\/[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+)\b/;
  const slashMatch = baseTitle.match(colorSlashRegex);
  if (slashMatch) {
    color = slashMatch[1].trim();
    baseTitle = baseTitle.replace(colorSlashRegex, '').trim();
  } else {
    const commonColors = [
      'PRETO', 'BRANCO', 'CINZA', 'MARINHO', 'NUDE', 'AREIA', 'GELO', 'GRAFITE', 'AZUL', 
      'VERMELHO', 'VERDE', 'ROSA', 'CORAL', 'CARAMELO', 'CAQUI', 'KHAKI', 'OFF BRANCO', 
      'OFF-BRANCO', 'OFF WHITE', 'OFF-WHITE'
    ];
    for (const c of commonColors) {
      const colorWordRegex = new RegExp(`\\b${c}\\b`, 'i');
      if (colorWordRegex.test(baseTitle)) {
        color = c;
        baseTitle = baseTitle.replace(colorWordRegex, '').trim();
        break;
      }
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return {
    baseTitle: toTitleCase(baseTitle),
    color: color ? color.toUpperCase() : 'SEM COR',
    size: size ? size.toUpperCase() : 'U'
  };
}

const samples = [
  "PAPETE KLIN TIC TAC CASUAL 171266000 171 MARINHO/CARAMELO TAM. 22",
  "TENIS ADIDAS DURAMO RC2 M KJ0082 TAM. 40",
  "TENIS FILA FREESTYLE II FEMININO GDNA/RSE/AZL F02TR00106 7274 Tam:37",
  "TENIS FILA SPRITZ MASCULINO F01TR00067 BCO/MAR/EVPR 4802 Tam:43",
  "TENIS NB 413V3 MASCULINO M413V3 CNZA M413ZD3 Tam:43",
  "TENIS NB 413V3 MASCULINO-PTO/LRJA - M413ZE3 - M413V3 - Tam:42",
  "CAMISA POLO TOMMY HILFINGER IM 1985 REGULAR POLO SEASON - THMW0MW32346 - THGWP - KHAKI - P",
  "MEIA SIGVARIS 170 TRAVENO PANTURRILHA UNISEX PONT FECHADA PEQUENA CINZA",
  "TENIS SANDRINI P345N07 PRETO/PRETO TAM. 39",
  "TENIS SANDRINI SD2513 OFF BRANCO/MARINHO TAM. 37",
  "KIT TENIS SANDRINI AERO RUN - SD2513 - GRAFITE/PTO - MAIS 12 PARES DE MEIA SAPATILHA - 39",
  "TENIS SANDRINI FEMININO SD2513 GRAFITE/NUDE TAM. 39",
  "TENIS SANDRINI SD2513 PRETO/GRAFITE TAM. 44"
];

console.log('Testing parseProductDescription:');
samples.forEach(s => {
  const result = parseProductDescription(s);
  console.log(`\nOriginal: "${s}"`);
  console.log(`  -> Base:  "${result.baseTitle}"`);
  console.log(`  -> Color: "${result.color}"`);
  console.log(`  -> Size:  "${result.size}"`);
});
