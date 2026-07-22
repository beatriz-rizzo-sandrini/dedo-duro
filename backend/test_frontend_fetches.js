const axios = require('axios');

// Mimic parseCSVLine from DataContext.jsx
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
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
}

async function fetchSandriniCasa() {
  try {
    console.log('Buscando estoque Sandrini Casa (CSV)...');
    const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/export?format=csv&gid=1363555604`;
    const res = await axios.get(url);
    const text = res.data;
    const lines = text.split(/\r?\n/);
    const map = {};
    
    console.log(`Linhas obtidas do CSV Sandrini Casa: ${lines.length}`);
    if (lines.length > 0) {
      console.log(`Primeira linha (Cabeçalho):`, parseCSVLine(lines[0]));
      console.log(`Segunda linha (Amostra):`, parseCSVLine(lines[1]));
    }
    
    if (lines.length > 1) {
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseCSVLine(lines[i]);
        
        const sku = String(cols[4] || '').trim().toUpperCase();
        const qtdStr = String(cols[6] || '').replace(/\./g, '').trim();
        const qtd = Number(qtdStr) || 0;
        
        const brand = String(cols[3] || 'SANDRINI').trim().toUpperCase();
        const desc = cols[5] || '';
        const costStr = String(cols[8] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
        const cost = Number(costStr) || 0;
        const totalCasaStr = String(cols[9] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
        const totalCasaCostVal = Number(totalCasaStr) || 0;

        if (sku && qtd > 0) {
          if (!map[sku]) {
            map[sku] = { estoqueCasa: 0, expedicao: 0, brand, desc, cost, totalCasaCost: 0, totalExpedicaoCost: 0 };
          }
          map[sku].estoqueCasa += Math.round(qtd);
          map[sku].totalCasaCost = (map[sku].totalCasaCost || 0) + totalCasaCostVal;
        }
      }
    }
    console.log(`Loaded ${Object.keys(map).length} records successfully from Sandrini Casa CSV.`);
  } catch (err) {
    console.error("Erro no Sandrini Casa CSV:", err.message);
  }
}

async function fetchBuyclockCasa() {
  try {
    console.log('\nBuscando estoque Buyclock Casa (CSV)...');
    const url = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1072598256`;
    const res = await axios.get(url);
    const text = res.data;
    const lines = text.split(/\r?\n/);
    const map = {};
    
    console.log(`Linhas obtidas do CSV Buyclock Casa: ${lines.length}`);
    if (lines.length > 0) {
      console.log(`Primeira linha (Cabeçalho):`, parseCSVLine(lines[0]));
      console.log(`Segunda linha (Cabeçalho 2):`, parseCSVLine(lines[1]));
      console.log(`Terceira linha (Cabeçalho 3):`, parseCSVLine(lines[2]));
      console.log(`Quarta linha (Amostra):`, parseCSVLine(lines[3]));
    }
    
    if (lines.length > 2) {
      const headers = parseCSVLine(lines[2]);
      const estoqueCasaIdx = headers.indexOf('ESTOQUE CASA');
      const expedicaoIdx = headers.indexOf('EXPEDIÇÃO -105');
      
      const finalEstoqueIdx = estoqueCasaIdx !== -1 ? estoqueCasaIdx : 37;
      const finalExpedicaoIdx = expedicaoIdx !== -1 ? expedicaoIdx : 4;
      
      console.log(`Index do ESTOQUE CASA: ${estoqueCasaIdx} (final: ${finalEstoqueIdx})`);
      console.log(`Index do EXPEDIÇÃO -105: ${expedicaoIdx} (final: ${finalExpedicaoIdx})`);
      
      for (let i = 3; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseCSVLine(lines[i]);
        const sku = String(cols[0] || '').trim().toUpperCase();
        const ean = String(cols[1] || '').trim();
        const brand = String(cols[2] || '').trim().toUpperCase();
        const estoqueCasaStr = String(cols[finalEstoqueIdx] || '').replace(/\./g, '').trim();
        const estoqueCasaVal = Number(estoqueCasaStr) || 0;
        const expedicaoStr = String(cols[finalExpedicaoIdx] || '').replace(/\./g, '').trim();
        const expedicaoVal = Number(expedicaoStr) || 0;
        const costValStr = String(cols[34] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
        const cost = Number(costValStr) || 0;
        
        if (sku) {
          if (!map[sku]) {
            map[sku] = { estoqueCasa: 0, expedicao: 0, brand: '', ean: '', cost: 0, totalCasaCost: 0, totalExpedicaoCost: 0 };
          }
          const finalCasa = Math.round(estoqueCasaVal);
          const finalExp = Math.round(expedicaoVal);
          map[sku].estoqueCasa += finalCasa;
          map[sku].expedicao += finalExp;
          map[sku].totalCasaCost = (map[sku].totalCasaCost || 0) + (finalCasa * cost);
          map[sku].totalExpedicaoCost = (map[sku].totalExpedicaoCost || 0) + (finalExp * cost);
        }
      }
    }
    console.log(`Loaded ${Object.keys(map).length} records successfully from Buyclock Casa CSV.`);
  } catch (err) {
    console.error("Erro no Buyclock Casa CSV:", err.message);
  }
}

async function run() {
  await fetchSandriniCasa();
  await fetchBuyclockCasa();
}

run();
