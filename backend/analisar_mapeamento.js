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

async function testCSV() {
  const url = `https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/export?format=csv&gid=525427301`;
  console.log('📡 Buscando e processando dados via CSV...');
  try {
    const response = await axios.get(url);
    const csvText = response.data;
    
    const rawLines = csvText.split(/\r?\n/);
    console.log(`📊 Linhas brutas totais no CSV: ${rawLines.length}`);
    
    let validRows = [];
    let emptyRows = 0;
    
    const header = parseCSVLine(rawLines[0]);
    console.log('📝 Cabeçalho detectado:', header);
    
    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line.trim()) {
        emptyRows++;
        continue;
      }
      
      const cols = parseCSVLine(line);
      const skuSen = cols[0] || null;
      const desc = cols[1] || null;
      const plat = cols[2] || null;
      const skuPlat = cols[3] || null;
      
      if (!skuPlat || !plat) {
        emptyRows++;
        continue;
      }
      
      validRows.push({ skuSen, desc, plat, skuPlat });
    }
    
    console.log(`❌ Linhas vazias/inválidas ignoradas: ${emptyRows}`);
    console.log(`✅ Linhas válidas extraídas: ${validRows.length}`);
    
    const unique = {};
    for (const item of validRows) {
      const key = `${item.skuPlat}|${item.plat.toUpperCase()}`;
      unique[key] = item;
    }
    console.log(`✨ Registros únicos dedupados: ${Object.keys(unique).length}`);
    
  } catch (error) {
    console.log('❌ Erro:', error.stack);
  }
}

testCSV().catch(console.error);
