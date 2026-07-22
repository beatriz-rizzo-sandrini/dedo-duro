const axios = require('axios');
async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=ESTOQUE';
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.substring(res.data.indexOf('{'), res.data.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonStr);
    
    let totalQtd = 0;
    
    data.table.rows.forEach(r => {
      if (r.c) {
        const plat = r.c[3] ? String(r.c[3].v).trim().toUpperCase() : '';
        const qtd = r.c[5] ? Number(r.c[5].v) : 0;
        
        if (plat === 'MELI SP') {
          totalQtd += qtd || 0;
        }
      }
    });
    console.log(`Total Qtd in ESTOQUE tab for MELI SP: ${totalQtd}`);
  } catch (e) {
    console.error("Erro:", e.message);
  }
}
run();
