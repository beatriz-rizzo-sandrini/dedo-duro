async function testGviz() {
  const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/gviz/tq?tqx=out:json&gid=1363555604&tq=select%20*`;
  const res = await fetch(url);
  const text = await res.text();
  
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const parsed = JSON.parse(jsonStr);
    const rows = parsed.table.rows;
    console.log("Total rows returned via GViz SELECT *:", rows.length);
  } catch(e) {
    console.log("Error parsing");
  }
}
testGviz();
