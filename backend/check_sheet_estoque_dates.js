const axios = require('axios');
const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

const SHEET_URLS = {
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
    console.log('📖 Lendo datas e locais da aba ESTOQUE no Google Sheets...');
    const res = await axios.get(SHEET_URLS.estoque);
    const rows = parseGoogleJSON(res.data);
    
    const locationDates = {};
    
    for (const row of rows) {
      if (!row.c) continue;
      // Coluna 0: Data, Coluna 3: Local
      const dateVal = row.c[0] ? String(row.c[0].f || row.c[0].v).trim() : null;
      const localVal = row.c[3] ? String(row.c[3].v).trim().toUpperCase() : null;
      
      if (localVal && dateVal) {
        if (!locationDates[localVal]) {
          locationDates[localVal] = new Set();
        }
        locationDates[localVal].add(dateVal);
      }
    }
    
    console.log('\nDatas de estoque encontradas na planilha por Local:');
    for (const [loc, dates] of Object.entries(locationDates)) {
      console.log(`- ${loc}:`, Array.from(dates));
    }
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
