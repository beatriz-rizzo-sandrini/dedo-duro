const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

// Calculate a date 3 days ago
const d = new Date();
d.setDate(d.getDate() - 3);
const y = d.getFullYear();
const m = String(d.getMonth() + 1).padStart(2, '0');
const day = String(d.getDate()).padStart(2, '0');
const dateStr = `${y}-${m}-${day}`;

console.log(`Calculated date 3 days ago: ${dateStr}`);

// Google Sheets Query Language: WHERE A >= date 'YYYY-MM-DD'
const query = encodeURIComponent(`SELECT * WHERE A >= date '${dateStr}'`);
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=vendas&tq=${query}`;

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse do JSON", error);
    return [];
  }
}

async function run() {
  console.log('📡 Buscando com query no Google Sheets (últimos 3 dias)...');
  const startTime = Date.now();
  try {
    const res = await axios.get(url);
    const rows = parseGoogleJSON(res.data);
    
    console.log(`Tempo de resposta da API do Google: ${Date.now() - startTime}ms`);
    console.log(`Total de linhas retornadas: ${rows.length}`);
    if (rows.length > 0) {
      const dates = new Set();
      rows.forEach(r => {
        if (r && r.c) {
          const dateVal = r.c[0]?.f || r.c[0]?.v;
          if (dateVal) dates.add(dateVal);
        }
      });
      console.log('Datas únicas retornadas:', Array.from(dates).sort());
    }
  } catch (err) {
    console.error('Erro na requisição:', err.message);
  }
}

run();
