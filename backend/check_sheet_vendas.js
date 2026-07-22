const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=vendas`;

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse do JSON", error);
    return [];
  }
}

async function run() {
  console.log('📡 Buscando aba "vendas" do Google Sheets...');
  try {
    const res = await axios.get(url);
    const rows = parseGoogleJSON(res.data);
    
    console.log(`Total de linhas na planilha de vendas: ${rows.length}`);
    
    if (rows.length === 0) {
      console.log('Aba de vendas está vazia!');
      return;
    }

    const uniqueDates = new Set();
    let sampleRowsWithDates = [];

    rows.forEach(r => {
      if (r && r.c) {
        const dateVal = r.c[0]?.f || r.c[0]?.v;
        if (dateVal) {
          uniqueDates.add(dateVal);
        }
      }
    });

    const datesArray = Array.from(uniqueDates).sort((a, b) => {
      if (a.includes('/') && b.includes('/')) {
        const [d1, m1, y1] = a.split('/');
        const [d2, m2, y2] = b.split('/');
        return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
      }
      return a.localeCompare(b);
    });

    console.log('\n--- ESTATÍSTICAS DA PLANILHA GOOGLE ---');
    console.log('Número de datas únicas:', datesArray.length);
    console.log('Primeira data na planilha:', datesArray[0]);
    console.log('Última data na planilha:', datesArray[datesArray.length - 1]);
    
    console.log('\nÚltimas 10 datas na planilha:');
    console.log(datesArray.slice(-10).join('\n'));

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
