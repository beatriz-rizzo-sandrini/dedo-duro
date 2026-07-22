const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    return [];
  }
}

async function run() {
  console.log("Analyzing skipped rows in Google Sheet...");
  const response = await axios.get(url);
  const rows = parseGoogleJSON(response.data);
  
  let skippedQty = 0;
  let skippedCount = 0;
  
  rows.forEach((r, idx) => {
    if (!r || !r.c) return;
    const sku = r.c[1]?.v;
    const local = r.c[3]?.v;
    const qty = Number(r.c[5]?.v) || 0;
    
    if (qty > 0) {
      if (!sku || !local) {
        skippedCount++;
        skippedQty += qty;
        console.log(`- Linha ${idx + 1}: Qtd=${qty} pulada porque SKU='${sku}' ou Local='${local}'`);
      }
    }
  });

  console.log(`\nTotal de linhas puladas com quantidade > 0: ${skippedCount}`);
  console.log(`Quantidade total de peças puladas: ${skippedQty}`);
}

run().catch(console.error);
