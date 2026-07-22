async function audit() {
  const url = 'https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/export?format=csv&gid=1363555604';
  const res = await fetch(url);
  const data = await res.text();
  const lines = data.split(/\r?\n/);
  
  let rawQtd = 0;
  let rawCost = 0;
  let validQtd = 0;
  let validCost = 0;
  let noSkuQtd = 0;
  let skippedTotalQtd = 0;
  let countNegative = 0;
  
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map(s => s.trim().replace(/^"|"$/g, ''));
  };

  for(let i=1; i<lines.length; i++) {
    if(!lines[i].trim()) continue;
    
    const cols = parseCSVLine(lines[i]);
    const sku = String(cols[4] || '').trim();
    const qtdStr = String(cols[6] || '').replace(/\./g, '').trim();
    const qtd = Number(qtdStr) || 0;
    const costStr = String(cols[8] || ''); // The cost in J is totalCost, but wait, totalCasaCostVal is cols[9], let's check both
    const totalCasaCostVal = Number(String(cols[9] || '').replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;
    
    rawQtd += Math.round(qtd);
    rawCost += totalCasaCostVal;
    
    if (qtd < 0) countNegative++;
    
    if (sku && qtd > 0) {
      validQtd += Math.round(qtd);
      validCost += totalCasaCostVal;
    } else if (!sku && qtd > 0) {
      noSkuQtd += Math.round(qtd);
    } else {
      skippedTotalQtd += Math.round(qtd);
    }
  }
  
  console.log('--- ABA CD SJN ---');
  console.log('RAW PLANILHA -> Qtd: ' + rawQtd + ' | Custo J: ' + rawCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  console.log('VALID (com SKU > 0) -> Qtd: ' + validQtd + ' | Custo J: ' + validCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  console.log('NO SKU (sem codigo) -> Qtd: ' + noSkuQtd);
  console.log('SKIPPED (qtd <= 0) -> Qtd: ' + skippedTotalQtd + ' | Negatives count: ' + countNegative);
  console.log('Primeira linha lida: ', parseCSVLine(lines[1]).slice(0, 10));
}

audit().catch(console.error);
