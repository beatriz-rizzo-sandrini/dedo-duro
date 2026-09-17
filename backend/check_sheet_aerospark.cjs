const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    return [];
  }
}

async function checkSheet() {
  console.log('Fetching Google Sheet ESTOQUE tab...');
  const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const rows = parseGoogleJSON(res.data);
  console.log('Total rows in ESTOQUE tab:', rows.length);

  const aeroSparkRows = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.c) continue;
    const dataStr = r.c[0]?.f || r.c[0]?.v;
    const sku = String(r.c[1]?.v || '');
    const desc = String(r.c[2]?.v || '');
    const local = String(r.c[3]?.v || '');
    const marca = String(r.c[4]?.v || '');
    const qtd = r.c[5]?.v;

    if (
      sku.toUpperCase().includes('1841') ||
      sku.toUpperCase().includes('SPARK') ||
      sku.toUpperCase().includes('AERO') ||
      desc.toUpperCase().includes('SPARK') ||
      desc.toUpperCase().includes('AERO')
    ) {
      aeroSparkRows.push({ rowIdx: i + 2, data: dataStr, sku, desc, local, marca, qtd });
    }
  }

  console.log(`Found ${aeroSparkRows.length} rows related to Aero/Spark in the Google Sheet ESTOQUE:`);
  console.log(JSON.stringify(aeroSparkRows, null, 2));
}

checkSheet().catch(console.error);
