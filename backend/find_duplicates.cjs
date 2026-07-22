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
  console.log("Analyzing duplicates in Google Sheet...");
  const response = await axios.get(url);
  const rows = parseGoogleJSON(response.data);
  
  const seen = {};
  const duplicates = [];
  let totalQtyBruta = 0;
  let totalQtyUnica = 0;
  
  rows.forEach((r, idx) => {
    if (!r || !r.c) return;
    const dateStr = r.c[0]?.f || r.c[0]?.v || null;
    const sku = r.c[1]?.v;
    const local = r.c[3]?.v;
    const qty = Number(r.c[5]?.v) || 0;
    
    if (sku && local) {
      const key = `${dateStr}|${sku}|${local}`;
      totalQtyBruta += qty;
      
      if (seen[key]) {
        duplicates.push({
          row: idx + 1,
          key,
          sku,
          local,
          qty,
          previousRow: seen[key].row,
          previousQty: seen[key].qty
        });
        // We accumulate the duplicate sum but let's see how the sync deduplicates.
        // In the sync:
        // mapaEstoque[chave] = item;
        // This overwrites the previous item. So only the last one is kept.
        // The difference in total quantity would be the previousQty that got overwritten!
      } else {
        seen[key] = { row: idx + 1, qty };
      }
    }
  });

  // Calculate unique sum in the same way as the synchronizer
  const uniqueItems = Object.values(seen);
  uniqueItems.forEach(item => {
    totalQtyUnica += item.qty;
  });

  console.log(`Diferença total de quantidade: ${totalQtyBruta - totalQtyUnica} peças`);
  console.log(`Total de linhas duplicadas: ${duplicates.length}`);
  
  console.log("\nAmostra de SKUs Duplicados na planilha (mesmo SKU, mesmo Local e mesma data):");
  duplicates.slice(0, 10).forEach(d => {
    console.log(`- Linha ${d.row}: SKU ${d.sku} no local ${d.local} tem Qtd=${d.qty} (Substitui a linha ${d.previousRow} que tinha Qtd=${d.previousQty})`);
  });
}

run().catch(console.error);
