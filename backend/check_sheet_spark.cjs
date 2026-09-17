const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    return JSON.parse(jsonStr).table.rows;
  } catch (e) {
    return [];
  }
}

async function checkSheet() {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const text = await res.text();
  const rows = parseGoogleJSON(text);
  
  let allSpark = [];
  for (const r of rows) {
    if (!r || !r.c) continue;
    const date = String(r.c[0]?.f || r.c[0]?.v || '').trim();
    const sku = String(r.c[1]?.v || '').trim();
    const desc = String(r.c[2]?.v || '').trim();
    const local = String(r.c[3]?.v || '').trim();
    const qtd = Number(r.c[5]?.v) || 0;
    
    if (sku.toUpperCase().includes('1841') || desc.toUpperCase().includes('1841') || desc.toUpperCase().includes('SPARK')) {
      allSpark.push({ date, sku, desc, local, qtd });
    }
  }

  console.log('Total spark rows in sheet:', allSpark.length);
  const byDate = {};
  for (const r of allSpark) {
    byDate[dateKey(r.date)] = (byDate[dateKey(r.date)] || 0) + r.qtd;
  }
  console.log('By date total in sheet:', byDate);

  const byDateMeliSp = {};
  for (const r of allSpark) {
    if (r.local.toUpperCase().includes('MELI SP')) {
      byDateMeliSp[dateKey(r.date)] = (byDateMeliSp[dateKey(r.date)] || 0) + r.qtd;
    }
  }
  console.log('By date MELI SP in sheet:', byDateMeliSp);
}

function dateKey(d) {
  if (!d) return 'EMPTY';
  if (d.startsWith('Date(')) {
    const p = d.replace('Date(', '').replace(')', '').split(',');
    return `${String(p[2]).padStart(2,'0')}/${String(Number(p[1])+1).padStart(2,'0')}`;
  }
  return d;
}

checkSheet();
