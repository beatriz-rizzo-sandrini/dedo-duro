const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

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
    console.log('📡 Buscando dados da planilha de ESTOQUE...');
    const res = await axios.get(URL);
    const rows = parseGoogleJSON(res.data);
    
    console.log('Procurando correspondências na planilha de ESTOQUE para "Cuecas Boxer Lupo"...');
    let found = 0;
    rows.forEach((r, idx) => {
      if (r && r.c) {
        const sku = String(r.c[1]?.v || '');
        const desc = String(r.c[2]?.v || '');
        const local = String(r.c[3]?.v || '');
        
        if (desc.includes('Cuecas Boxer Lupo') || desc.includes('Cueca Boxer Lupo')) {
          found++;
          console.log(`Linha ${idx + 2}: SKU="${sku}" | Local="${local}" | Desc="${desc.substring(0, 45)}..." | Qtd="${r.c[5]?.v}"`);
        }
      }
    });

    console.log(`Total de correspondências encontradas: ${found}`);

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
