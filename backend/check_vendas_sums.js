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

async function run() {
  const res = await axios.get('https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/export?format=csv&gid=1070878202');
  const lines = res.data.split(/\r?\n/);
  
  let totalQtd = 0;
  let totalValor = 0;
  
  for(let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    const dataStr = cols[0] || '';
    const plat = String(cols[3] || '').trim().toUpperCase();
    const qtdStr = String(cols[5] || '').replace(/\./g, '').trim();
    const qtd = Number(qtdStr) || 0;
    
    // O Valor é a coluna 6 (VALOR) ou 7 (VALOR TOTAL)
    const valorStr = String(cols[7] || '').replace(/[^0-9,\.-]/g, '').replace(',', '.');
    const valor = Number(valorStr) || 0;
    
    if (plat.includes('MELI SP') && dataStr.includes('17/07/2026')) {
      totalQtd += qtd;
      totalValor += valor;
    }
  }
  
  console.log(`Planilha VENDAS 17/07/2026 MELI SP:`);
  console.log(`Qtd Peças (soma coluna Quantidade): ${totalQtd}`);
  console.log(`Soma Valor Total: R$ ${totalValor.toFixed(2)}`);
}
run();
