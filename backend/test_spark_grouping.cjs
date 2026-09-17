const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    return JSON.parse(jsonStr).table.rows;
  } catch (e) {
    return [];
  }
}

// We can import or require parseProductDescription
// Let's create a test script that loads the parser logic or tests the output
async function testParserOnAllSpark() {
  const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const sheetRows = parseGoogleJSON(res.data);

  // Let's dynamically import parseProductDescription from src/utils/productParser.js using esm or rollup
  // Or write the exact logic:
  const catalogPath = path.join(__dirname, '..', 'src', 'utils', 'seniorCatalog.json');
  const seniorCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const byBaseTitle = {};

  for (const r of sheetRows) {
    if (!r || !r.c) continue;
    const sku = String(r.c[1]?.v || '').trim().toUpperCase();
    const desc = String(r.c[2]?.v || '').trim();
    const local = String(r.c[3]?.v || '').trim().toUpperCase();
    const qtd = Number(r.c[5]?.v) || 0;

    const isAeroSpark = 
      sku.includes('1841') ||
      sku.includes('SPARK') ||
      desc.toUpperCase().includes('SPARK') ||
      desc.toUpperCase().includes('1841');

    if (isAeroSpark && local === 'MELI SP') {
      const cat = seniorCatalog[sku];
      const officialDesc = cat?.descricao_oficial || desc;
      
      if (!byBaseTitle[officialDesc]) byBaseTitle[officialDesc] = { sumQty: 0, count: 0, sampleSkus: [] };
      byBaseTitle[officialDesc].sumQty += qtd;
      byBaseTitle[officialDesc].count++;
      if (byBaseTitle[officialDesc].sampleSkus.length < 3) byBaseTitle[officialDesc].sampleSkus.push(sku);
    }
  }

  console.log('--- Breakdown of 9,718 Aero Spark in Meli SP by Official/Sheet Desc ---');
  console.log(JSON.stringify(byBaseTitle, null, 2));
}

testParserOnAllSpark().catch(console.error);
