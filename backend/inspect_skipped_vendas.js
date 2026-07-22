const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=vendas`;

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

function parseDateToSQL(f, v) {
  if (f && typeof f === 'string' && f.includes('/')) {
    const parts = f.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (v && typeof v === 'string' && v.startsWith('Date(')) {
    const match = v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const year = match[1];
      const month = String(parseInt(match[2]) + 1).padStart(2, '0');
      const day = String(match[3]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

async function run() {
  console.log('📡 Fetching sales sheet from Google Sheets...');
  const res = await axios.get(url);
  const rows = parseGoogleJSON(res.data);
  console.log(`Total rows in sheet: ${rows.length}`);

  let totalQtySkipped = 0;
  let missingDateCount = 0;
  let missingSkuCount = 0;
  let missingLocalCount = 0;
  let emptyRowCount = 0;

  const sampleSkipped = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.c) {
      emptyRowCount++;
      continue;
    }
    const dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
    const local = r.c[1]?.v || null;
    const sku = r.c[2]?.v || null;
    const qtd = r.c[4]?.v || null;

    const numericQtd = Number(qtd) || 0;

    if (!dataSQL || !sku || !local) {
      totalQtySkipped += numericQtd;
      
      let reasons = [];
      if (!dataSQL) {
        missingDateCount++;
        reasons.push(`date_null (raw: f="${r.c[0]?.f}", v="${r.c[0]?.v}")`);
      }
      if (!sku) {
        missingSkuCount++;
        reasons.push('sku_null');
      }
      if (!local) {
        missingLocalCount++;
        reasons.push('local_null');
      }

      if (sampleSkipped.length < 15 && numericQtd > 0) {
        sampleSkipped.push({
          rowIdx: i + 1,
          dateRaw: r.c[0]?.f || r.c[0]?.v,
          local,
          sku,
          qtd: numericQtd,
          reasons: reasons.join(', ')
        });
      }
    }
  }

  console.log(`Empty/null rows: ${emptyRowCount}`);
  console.log(`Missing dates: ${missingDateCount}`);
  console.log(`Missing SKU: ${missingSkuCount}`);
  console.log(`Missing local: ${missingLocalCount}`);
  console.log(`Total quantity in skipped rows: ${totalQtySkipped}`);

  console.log('\n--- Sample of Skipped Rows with Qtd > 0 ---');
  for (const s of sampleSkipped) {
    console.log(`Row ${s.rowIdx}: Qtd: ${s.qtd} | Reasons: [${s.reasons}] | SKU: "${s.sku}" | Local: "${s.local}" | DateRaw: "${s.dateRaw}"`);
  }
}

run().catch(console.error);
