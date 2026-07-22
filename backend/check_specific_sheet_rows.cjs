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
    
    const linesToInspect = [437, 443, 458, 463, 468, 478, 491, 533];
    console.log('Inspecting specific stock rows:');
    
    linesToInspect.forEach(lineNum => {
      const idx = lineNum - 2;
      const r = rows[idx];
      if (r && r.c) {
        console.log(`Row ${lineNum}:`, {
          col0_f: r.c[0]?.f,
          col0_v: r.c[0]?.v,
          sku: r.c[1]?.v,
          desc: r.c[2]?.v,
          local: r.c[3]?.v,
          qtd: r.c[5]?.v
        });
      } else {
        console.log(`Row ${lineNum} not found or empty.`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

run();
