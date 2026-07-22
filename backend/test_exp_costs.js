

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
  const expUrl = "https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210";
  const expRes = await fetch(expUrl);
  const expText = await expRes.text();
  const expLines = expText.split(/\r?\n/);

  let sumExpQtd = 0;
  let sumExpColI = 0;
  let sumExpMath = 0;

  for (let i = 2; i < expLines.length; i++) {
    if (!expLines[i].trim()) continue;
    const cols = parseCSVLine(expLines[i]);
    const expedicaoStr = String(cols[4] || '').replace(/\./g, '').trim();
    const expedicaoVal = Number(expedicaoStr) || 0;

    const unitCostStr = String(cols[7] || '');
    const unitCost = Number(unitCostStr.replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;

    const totalExpStr = String(cols[8] || '');
    const totalExpColI = Number(totalExpStr.replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;

    if (expedicaoVal > 0) {
      sumExpQtd += Math.round(expedicaoVal);
      sumExpColI += totalExpColI;
      sumExpMath += Math.round(expedicaoVal) * unitCost;
    }
  }

  console.log("=== Sandrini Expedicao ===");
  console.log("QTD (Coluna E):", sumExpQtd);
  console.log("Custo Total (Math: Qtd x Unit): R$", sumExpMath.toFixed(2));
  console.log("COLUNA I (Total Cost lido direto): R$", sumExpColI.toFixed(2));
}

run();
