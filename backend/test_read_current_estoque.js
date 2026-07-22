const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse do JSON do Google Sheets", error);
    return [];
  }
}

async function run() {
  console.log(`📡 Buscando dados da planilha oficial de Estoque (${SPREADSHEET_ID})...`);
  const response = await axios.get(url);
  const rows = parseGoogleJSON(response.data);
  console.log(`Total de linhas na planilha de ESTOQUE: ${rows.length}`);
  
  const dateCounts = {};
  rows.forEach((r) => {
    if (!r || !r.c) return;
    const dateStr = r.c[0]?.f || r.c[0]?.v || null;
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
  });
  
  console.log("\nDatas encontradas na aba ESTOQUE da planilha:");
  console.log(JSON.stringify(dateCounts, null, 2));
  
  console.log("\nPrimeiras 3 linhas:");
  console.log(JSON.stringify(rows.slice(0, 3).map(r => r?.c?.map(c => c?.v || c?.f)), null, 2));

  console.log("\nÚltimas 3 linhas:");
  console.log(JSON.stringify(rows.slice(-3).map(r => r?.c?.map(c => c?.v || c?.f)), null, 2));
}

run().catch(console.error);
