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

async function fetchSandriniCasa() {
  const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/export?format=csv&gid=1363555604`;
  const res = await axios.get(url);
  const text = res.data;
  const lines = text.split(/\r?\n/);
  const map = {};
  
  if (lines.length > 1) {
    const headers = parseCSVLine(lines[0]);
    const skuIdx = headers.findIndex(h => h.toUpperCase().trim() === 'SKU');
    const qtdIdx = headers.findIndex(h => h.toUpperCase().trim() === 'QUANTIDADE' || h.toUpperCase().trim() === 'QTD');
    const brandIdx = headers.findIndex(h => h.toUpperCase().trim() === 'MARCA');
    const descIdx = headers.findIndex(h => h.toUpperCase().trim().includes('DESC'));
    const costIdx = headers.findIndex(h => h.toUpperCase().trim().includes('CUSTO UNIT'));
    const totalCasaIdx = headers.findIndex(h => h.toUpperCase().trim().includes('CUSTO EM CASA') || h.toUpperCase().trim().includes('CUSTO CASA'));
    
    const finalSkuIdx = skuIdx !== -1 ? skuIdx : 4;
    const finalQtdIdx = qtdIdx !== -1 ? qtdIdx : 6;
    const finalBrandIdx = brandIdx !== -1 ? brandIdx : 3;
    const finalDescIdx = descIdx !== -1 ? descIdx : 5;
    const finalCostIdx = costIdx !== -1 ? costIdx : 8;
    const finalTotalCasaIdx = totalCasaIdx !== -1 ? totalCasaIdx : 9;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const sku = String(cols[finalSkuIdx] || '').trim().toUpperCase();
      const qtdStr = String(cols[finalQtdIdx] || '').replace(/\./g, '').trim();
      const qtd = Number(qtdStr) || 0;
      
      const brand = String(cols[finalBrandIdx] || 'SANDRINI').trim().toUpperCase();
      const desc = cols[finalDescIdx] || '';
      const costStr = String(cols[finalCostIdx] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
      const cost = Number(costStr) || 0;
      const totalCasaStr = String(cols[finalTotalCasaIdx] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9\.-]/g, '');
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

  // Load Sandrini Exp
  try {
    const sandriniExpUrl = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210`;
    const expRes = await axios.get(sandriniExpUrl);
    const expText = expRes.data;
    const expLines = expText.split(/\r?\n/);
    if (expLines.length > 1) {
      const expHeaders = parseCSVLine(expLines[1]);
      const expIdx = expHeaders.indexOf('EXPEDIÇÃO -105');
      const finalExpIdx = expIdx !== -1 ? expIdx : 4;
      
      const skuIdx = expHeaders.findIndex(h => h.toUpperCase().trim() === 'SKU' || h.toUpperCase().trim().includes('CÓDIGO') || h.toUpperCase().trim().includes('CODIGO'));
      const costIdx = expHeaders.findIndex(h => h.toUpperCase().trim().includes('CUSTO UNIT') || h.toUpperCase().trim().includes('VALOR UNIT'));
      
      const finalSkuIdx = skuIdx !== -1 ? skuIdx : 0;
      const finalCostIdx = costIdx !== -1 ? costIdx : 7;

      for (let i = 2; i < expLines.length; i++) {
        if (!expLines[i].trim()) continue;
        const cols = parseCSVLine(expLines[i]);
        const sku = String(cols[finalSkuIdx] || '').trim().toUpperCase();
        const expedicaoStr = String(cols[finalExpIdx] || '').replace(/\./g, '').trim();
        const expedicaoVal = Number(expedicaoStr) || 0;

        const unitCostStr = String(cols[finalCostIdx] || '').replace(/[^0-9,\.-]/g, '').replace(',', '.');
        const unitCostVal = Number(unitCostStr) || 0;
        const totalExpCostVal = expedicaoVal * unitCostVal;

        if (sku && expedicaoVal > 0) {
          if (!map[sku]) {
            map[sku] = { estoqueCasa: 0, expedicao: 0, brand: 'SANDRINI', desc: '', cost: 0, totalCasaCost: 0, totalExpedicaoCost: 0 };
          }
          map[sku].expedicao += Math.round(expedicaoVal);
          map[sku].totalExpedicaoCost = (map[sku].totalExpedicaoCost || 0) + totalExpCostVal;
          if (unitCostVal > 0 && (!map[sku].cost || map[sku].cost === 0)) {
            map[sku].cost = unitCostVal;
          }
        }
      }
    }
  } catch (err) {
    console.error(err.message);
  }
  return map;
}

function parseProductDescription(desc, sku, isBC, brand) {
  // Simple simulation of product description parser
  return {
    baseTitle: desc || `Produto ${sku}`,
    color: 'SORT',
    size: 'M',
    brand: brand || 'SANDRINI'
  };
}

function normalizeSku(sku) {
  return String(sku).replace(/(_FBA|_FULL|-FBA|-FULL)$/i, '');
}

async function run() {
  const sandriniCasaMap = await fetchSandriniCasa();
  
  // Replicate Estoque.jsx steps 3 & 4
  const stats = {};
  
  // Step 3 (Sandrini loop)
  Object.entries(sandriniCasaMap).forEach(([sku, info]) => {
    const totalCD = (info.estoqueCasa || 0) + (info.expedicao || 0);
    if (totalCD <= 0) return;

    const brand = info.brand || 'SANDRINI';
    const parsed = parseProductDescription(info.desc || '', sku, false, brand);
    const prodKey = `${parsed.baseTitle}|${brand}`;

    if (!stats[prodKey]) {
      stats[prodKey] = {
        descricao: parsed.baseTitle,
        marca: brand,
        total: 0,
        custoTotal: 0,
        estoquePlataforma: 0,
        estoqueCasa: 0,
        expedicao: 0,
        cores: {},
        id: prodKey,
        skusArr: []
      };
    }

    if (!stats[prodKey].skusArr.includes(sku)) {
      stats[prodKey].skusArr.push(sku);
    }

    const corKey = parsed.color;
    if (!stats[prodKey].cores[corKey]) {
      stats[prodKey].cores[corKey] = {
        cor: corKey,
        total: 0,
        custoTotal: 0,
        estoquePlataforma: 0,
        estoqueCasa: 0,
        expedicao: 0,
        variacoes: {}
      };
    }

    const varKey = `${sku}|${parsed.size}`;
    if (!stats[prodKey].cores[corKey].variacoes[varKey]) {
      stats[prodKey].cores[corKey].variacoes[varKey] = {
        sku,
        skuPlat: '',
        size: parsed.size,
        estoquePlataforma: 0,
        estoquePorLocal: {},
        estoqueCasa: 0,
        expedicao: 0,
        total: 0,
        valorUnitario: info.cost || 0,
        custoTotal: 0
      };
    }
  });

  // Step 4
  const usedExternalSkus = new Set();
  Object.values(stats).forEach(prod => {
    Object.values(prod.cores).forEach(cor => {
      Object.values(cor.variacoes).forEach(v => {
        const company = 'SANDRINI';
        let qtyCasa = 0;
        let qtyExpedicao = 0;
        let custoExpedicao = 0;
        const mapToUse = sandriniCasaMap;

        const key1 = String(v.sku || '').toUpperCase().trim();
        const searchKey1 = key1;

        let matchedKey = null;
        if (searchKey1 && mapToUse[searchKey1] !== undefined) matchedKey = searchKey1;

        if (matchedKey) {
          const externalKey = `${company}|${matchedKey}`;
          if (!usedExternalSkus.has(externalKey)) {
            qtyCasa = mapToUse[matchedKey].estoqueCasa || 0;
            qtyExpedicao = mapToUse[matchedKey].expedicao || 0;
            custoExpedicao = mapToUse[matchedKey].totalExpedicaoCost || 0;
            usedExternalSkus.add(externalKey);
          }
        }

        v.estoqueCasa = qtyCasa;
        v.expedicao = qtyExpedicao;
        v.total = v.estoquePlataforma + qtyCasa + qtyExpedicao;
        v.custoCasa = qtyCasa * v.valorUnitario;
        v.custoExpedicao = custoExpedicao;
        v.custoTotal = v.custoPlataforma + v.custoCasa + v.custoExpedicao;
      });
    });
  });

  // Replicate calculation of totalExpedicaoQty and totalExpedicaoCost
  let totalExpedicaoQty = 0;
  let totalExpedicaoCost = 0;
  Object.values(sandriniCasaMap).forEach(info => {
    const brand = info.brand || 'SANDRINI';
    // matchesBrand is true for all here since filter is empty
    totalExpedicaoQty += info.expedicao || 0;
    totalExpedicaoCost += info.totalExpedicaoCost || 0;
  });

  console.log(`\n--- Replicating Estoque.jsx KPIs ---`);
  console.log(`totalExpedicaoQty (KPI Card): ${totalExpedicaoQty}`);
  console.log(`totalExpedicaoCost (KPI Card): R$ ${totalExpedicaoCost.toFixed(2)}`);
}

run();
