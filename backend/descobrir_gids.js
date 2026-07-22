const axios = require('axios');

async function descobrir() {
  const url = `https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/edit`;
  console.log('📡 Buscando HTML da planilha...');
  try {
    const response = await axios.get(url);
    const html = response.data;
    
    // Search for occurrences of the word "MAPEAMENTO" in the HTML source
    let index = 0;
    let occurrences = 0;
    while (true) {
      index = html.indexOf('MAPEAMENTO', index);
      if (index === -1) break;
      occurrences++;
      console.log(`\n🔍 Ocorrência #${occurrences} de "MAPEAMENTO" na posição ${index}:`);
      // Print 200 characters before and after
      const start = Math.max(0, index - 150);
      const end = Math.min(html.length, index + 150);
      console.log(html.substring(start, end).replace(/\n/g, ' '));
      index += 10;
    }
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

descobrir().catch(console.error);
