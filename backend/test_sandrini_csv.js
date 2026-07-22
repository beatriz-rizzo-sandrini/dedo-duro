async function testSandrini() {
  const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/export?format=csv&gid=1363555604`;
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  
  let totalSjn = 0;
  for(let i=1; i<lines.length; i++) {
     if (!lines[i].trim()) continue;
     const cols = lines[i].split(',').map(s => s.replace(/^"|"$/g, ''));
     const qStr = String(cols[6] || '').replace(/\./g, '').trim();
     const q = Number(qStr) || 0;
     totalSjn += q;
  }
  console.log("Total Casa (CD SJN) sum:", totalSjn);

  const invUrl = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210`;
  const resInv = await fetch(invUrl);
  const textInv = await resInv.text();
  const linesInv = textInv.split(/\r?\n/);
  
  let totalExp = 0;
  for(let i=2; i<linesInv.length; i++) {
     if (!linesInv[i].trim()) continue;
     const cols = linesInv[i].split(',').map(s => s.replace(/^"|"$/g, ''));
     const qStr = String(cols[4] || '').replace(/\./g, '').trim();
     const q = Number(qStr) || 0;
     totalExp += q;
  }
  console.log("Total Expedicao (INVENTARIO_SANDRINI) sum:", totalExp);
}
testSandrini();
