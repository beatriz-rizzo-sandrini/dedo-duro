const axios = require('axios');

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

async function fetchSandrini() {
  const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/export?format=csv&gid=1363555604`;
  const res = await axios.get(url);
  const text = res.data;
  const lines = text.split(/\r?\n/);
  
  let totalQty = 0;
  let totalCost = 0;
  
  if (lines.length > 1) {
    const headers = parseCSVLine(lines[0]);
    const skuIdx = headers.findIndex(h => h.toUpperCase().trim() === 'SKU');
    const qtdIdx = headers.findIndex(h => h.toUpperCase().trim() === 'QUANTIDADE' || h.toUpperCase().trim() === 'QTD');
    const costIdx = headers.findIndex(h => h.toUpperCase().trim().includes('CUSTO UNIT'));
    const totalCasaIdx = headers.findIndex(h => h.toUpperCase().trim().includes('CUSTO EM CASA') || h.toUpperCase().trim().includes('CUSTO CASA'));
    
    const finalSkuIdx = skuIdx !== -1 ? skuIdx : 4;
    const finalQtdIdx = qtdIdx !== -1 ? qtdIdx : 6;
    const finalCostIdx = costIdx !== -1 ? costIdx : 8;
    const finalTotalCasaIdx = totalCasaIdx !== -1 ? totalCasaIdx : 9;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const sku = String(cols[finalSkuIdx] || '').trim().toUpperCase();
      const qtdStr = String(cols[finalQtdIdx] || '').replace(/\./g, '').trim();
      const qtd = Number(qtdStr) || 0;
      
      const costStr = String(cols[finalCostIdx] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
      const cost = Number(costStr) || 0;
      
      const totalCasaStr = String(cols[finalTotalCasaIdx] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
      const totalCasaCostVal = Number(totalCasaStr) || 0;

      if (sku && qtd > 0) {
        totalQty += Math.round(qtd);
        totalCost += totalCasaCostVal;
      }
    }
  }
  console.log(`🏠 Sandrini Casa Spreadsheet: Qty = ${totalQty} pcs, Cost = R$ ${totalCost.toFixed(2)}`);
}

async function fetchSandriniExp() {
  const url = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210`;
  const res = await axios.get(url);
  const text = res.data;
  const lines = text.split(/\r?\n/);
  
  let totalQty = 0;
  let totalCost = 0;
  
  if (lines.length > 1) {
    const expHeaders = parseCSVLine(lines[1]);
    const expIdx = expHeaders.indexOf('EXPEDIÇÃO -105');
    const finalExpIdx = expIdx !== -1 ? expIdx : 4;
    
    const skuIdx = expHeaders.findIndex(h => h.toUpperCase().trim() === 'SKU' || h.toUpperCase().trim().includes('CÓDIGO') || h.toUpperCase().trim().includes('CODIGO'));
    const costIdx = expHeaders.findIndex(h => h.toUpperCase().trim().includes('CUSTO UNIT') || h.toUpperCase().trim().includes('VALOR UNIT'));
    
    const finalSkuIdx = skuIdx !== -1 ? skuIdx : 0;
    const finalCostIdx = costIdx !== -1 ? costIdx : 7;

    for (let i = 2; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const sku = String(cols[finalSkuIdx] || '').trim().toUpperCase();
      const expedicaoStr = String(cols[finalExpIdx] || '').replace(/\./g, '').trim();
      const expedicaoVal = Number(expedicaoStr) || 0;

      const unitCostStr = String(cols[finalCostIdx] || '').replace(/[^0-9,\.-]/g, '').replace(',', '.');
      const unitCostVal = Number(unitCostStr) || 0;
      const totalExpCostVal = expedicaoVal * unitCostVal;

      if (sku && expedicaoVal > 0) {
        totalQty += Math.round(expedicaoVal);
        totalCost += totalExpCostVal;
      }
    }
  }
  console.log(`📦 Sandrini Expedição Spreadsheet: Qty = ${totalQty} pcs, Cost = R$ ${totalCost.toFixed(2)}`);
}

async function fetchBuyclock() {
  const url = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1072598256`;
  const res = await axios.get(url);
  const text = res.data;
  const lines = text.split(/\r?\n/);
  
  let totalCasaQty = 0;
  let totalCasaCost = 0;
  let totalExpQty = 0;
  let totalExpCost = 0;
  
  if (lines.length > 2) {
    const headers = parseCSVLine(lines[2]);
    const estoqueCasaIdx = headers.indexOf('ESTOQUE CASA');
    const expedicaoIdx = headers.indexOf('EXPEDIÇÃO -105');
    
    const finalEstoqueIdx = estoqueCasaIdx !== -1 ? estoqueCasaIdx : 37;
    const finalExpedicaoIdx = expedicaoIdx !== -1 ? expedicaoIdx : 4;
    
    const skuIdx = headers.findIndex(h => h.toUpperCase().trim().includes('SKU') || h.toUpperCase().trim() === 'CÓDIGO' || h.toUpperCase().trim() === 'CODIGO');
    const costIdx = headers.findIndex(h => h.toUpperCase().trim().includes('CUSTO UNIT'));
    
    const finalSkuIdx = skuIdx !== -1 ? skuIdx : 0;
    const finalCostIdx = costIdx !== -1 ? costIdx : 34;

    for (let i = 3; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const sku = String(cols[finalSkuIdx] || '').trim().toUpperCase();
      
      const estoqueCasaStr = String(cols[finalEstoqueIdx] || '').replace(/\./g, '').trim();
      const estoqueCasaVal = Number(estoqueCasaStr) || 0;
      
      const expedicaoStr = String(cols[finalExpedicaoIdx] || '').replace(/\./g, '').trim();
      const expedicaoVal = Number(expedicaoStr) || 0;
      
      const costValStr = String(cols[finalCostIdx] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
      const cost = Number(costValStr) || 0;

      if (sku) {
        const finalCasa = Math.round(estoqueCasaVal);
        const finalExp = Math.round(expedicaoVal);
        
        totalCasaQty += finalCasa;
        totalCasaCost += (finalCasa * cost);
        
        totalExpQty += finalExp;
        totalExpCost += (finalExp * cost);
      }
    }
  }
  console.log(`🏠 Buyclock Casa Spreadsheet: Qty = ${totalCasaQty} pcs, Cost = R$ ${totalCasaCost.toFixed(2)}`);
  console.log(`📦 Buyclock Expedição Spreadsheet: Qty = ${totalExpQty} pcs, Cost = R$ ${totalExpCost.toFixed(2)}`);
}

async function run() {
  try {
    await fetchSandrini();
    await fetchSandriniExp();
    await fetchBuyclock();
  } catch (err) {
    console.error(err.message);
  }
}

run();
