// using native fetch

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const parsed = JSON.parse(jsonStr);
    return parsed.table.rows;
  } catch (e) {
    return [];
  }
}

async function testSheets() {
  console.log('Testing Sandrini Casa...');
  const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/gviz/tq?tqx=out:json&gid=1363555604`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseGoogleJSON(text);
  
  let totalCasa = 0;
  let floatRows = 0;
  rows.forEach((r, i) => {
    if (r && r.c) {
       const q = Number(r.c[6]?.v) || 0;
       totalCasa += q;
       if (q % 1 !== 0) {
         console.log(`Float Qty found at Sandrini row ${i}: v=${r.c[6]?.v}, f=${r.c[6]?.f}, sku=${r.c[4]?.v}`);
         floatRows++;
       }
    }
  });
  console.log('Total Casa Qty Parsed:', totalCasa, '| Rows with float qty:', floatRows);

  console.log('\nTesting Buyclock CSV...');
  const urlCsv = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1072598256`;
  const resCsv = await fetch(urlCsv);
  const csvText = await resCsv.text();
  const lines = csvText.split(/\r?\n/);
  
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += char; }
    }
    result.push(current);
    return result.map(s => s.trim().replace(/^"|"$/g, ''));
  }

  const headers = parseCSVLine(lines[2]);
  const estoqueCasaIdx = headers.indexOf('ESTOQUE CASA') !== -1 ? headers.indexOf('ESTOQUE CASA') : 37;
  const expedicaoIdx = headers.indexOf('EXPEDIÇÃO -105') !== -1 ? headers.indexOf('EXPEDIÇÃO -105') : 4;

  let totalBcCasa = 0;
  let floatBcRows = 0;
  for (let i = 3; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    const qCasa = Number(cols[estoqueCasaIdx]) || 0;
    const qExp = Number(cols[expedicaoIdx]) || 0;
    totalBcCasa += qCasa;
    if (qCasa % 1 !== 0) {
      console.log(`Float Qty found at Buyclock row ${i}: Casa=${cols[estoqueCasaIdx]}, Exp=${cols[expedicaoIdx]}, sku=${cols[0]}`);
      floatBcRows++;
    }
    if (qExp % 1 !== 0) {
      console.log(`Float Exp found at Buyclock row ${i}: Exp=${cols[expedicaoIdx]}, sku=${cols[0]}`);
    }
  }
  console.log('Total Buyclock Casa Qty Parsed:', totalBcCasa, '| Rows with float qty:', floatBcRows);
}

testSheets();
