const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const estoqueUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

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
    const res = await axios.get(estoqueUrl);
    const rows = parseGoogleJSON(res.data);
    
    console.log('Sample stock rows (first 10):');
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const r = rows[i];
      if (r && r.c) {
        console.log(`Row ${i + 2}:`, {
          col0_f: r.c[0]?.f,
          col0_v: r.c[0]?.v,
          sku: r.c[1]?.v,
          desc: r.c[2]?.v,
          local: r.c[3]?.v,
          qtd: r.c[5]?.v
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
