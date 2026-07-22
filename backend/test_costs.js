// using native fetch

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

async function run() {
  const cdUrl = "https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/export?format=csv&gid=1363555604";
  const expUrl = "https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210";

  let sumCasaQtd = 0;
  let sumCasaMath = 0;
  let sumCasaColJ = 0;

  const cdRes = await fetch(cdUrl);
  const cdText = await cdRes.text();
  const cdLines = cdText.split(/\r?\n/);
  for (let i = 2; i < cdLines.length; i++) {
    if (!cdLines[i].trim()) continue;
    const cols = parseCSVLine(cdLines[i]);
    const qtdStr = String(cols[6] || '').replace(/\./g, '').trim();
    const qtd = Number(qtdStr) || 0;
    
    const costStr = String(cols[8] || '');
    const cost = Number(costStr.replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;

    const totalCasaStr = String(cols[9] || '');
    const totalCasaColJ = Number(totalCasaStr.replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;

    if (qtd > 0) {
      sumCasaQtd += Math.round(qtd);
      sumCasaMath += (Math.round(qtd) * cost);
      sumCasaColJ += totalCasaColJ;
    }
  }

  let sumExpQtd = 0;
  let sumExpMath = 0;
  let sumExpColI = 0;

  const expRes = await fetch(expUrl);
  const expText = await expRes.text();
  const expLines = expText.split(/\r?\n/);
  for (let i = 2; i < expLines.length; i++) {
    if (!expLines[i].trim()) continue;
    const cols = parseCSVLine(expLines[i]);
    const expedicaoStr = String(cols[4] || '').replace(/\./g, '').trim();
    const expedicaoVal = Number(expedicaoStr) || 0;

    const costStr = String(cols[6] || ''); // Wait, where is cost unitario? Let's skip math for exp
    const totalExpStr = String(cols[8] || '');
    const totalExpColI = Number(totalExpStr.replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;

    if (expedicaoVal > 0) {
      sumExpQtd += Math.round(expedicaoVal);
      sumExpColI += totalExpColI;
    }
  }

  console.log("=== Sandrini Casa (CD SJN) ===");
  console.log("QTD (Coluna G):", sumCasaQtd);
  console.log("MATEMATICA (Qtd x Coluna I): R$", sumCasaMath.toFixed(2));
  console.log("COLUNA J (Custo em casa): R$", sumCasaColJ.toFixed(2));

  console.log("\n=== Sandrini Expedicao ===");
  console.log("QTD (Coluna E):", sumExpQtd);
  console.log("COLUNA I (Total Cost): R$", sumExpColI.toFixed(2));
}

run();
