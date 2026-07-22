const axios = require('axios');
const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

const SHEET_URLS = {
  vendas: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`,
  estoque: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`
};

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse", error);
    return [];
  }
}

async function run() {
  try {
    console.log('📖 Lendo aba ESTOQUE da planilha do Google Sheets...');
    const res = await axios.get(SHEET_URLS.estoque);
    const rows = parseGoogleJSON(res.data);
    
    const locals = new Set();
    
    for (const row of rows) {
      if (!row.c) continue;
      // Colunas do estoque: Data, SKU, Produto, Local, Marca, Qtd, Valor
      // Local é a coluna index 3
      const localVal = row.c[3] ? String(row.c[3].v).trim().toUpperCase() : null;
      if (localVal) {
        locals.add(localVal);
      }
    }
    
    console.log('Locais encontrados na planilha de ESTOQUE:', Array.from(locals));
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
