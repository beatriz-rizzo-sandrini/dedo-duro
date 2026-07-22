async function testInventario() {
  const url = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210`;
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  
  console.log("Total lines in INVENTÁRIO_SANDRINI:", lines.length);
  if (lines.length > 1) {
     console.log("Headers (Line 1):", lines[1]);
  }
}
testInventario();
