const axios = require('axios');
async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=ESTOQUE';
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.substring(res.data.indexOf('{'), res.data.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonStr);
    
    // Print first 5 rows to see what columns exist
    const rows = data.table.rows.slice(0, 5);
    rows.forEach(r => {
      console.log(r.c.map(cell => cell ? cell.v : null));
    });
  } catch (e) {
    console.error("Erro:", e.message);
  }
}
run();
