const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const itemId = 'MLB5113808724';

    console.log(`📡 Buscando JSON completo do anúncio ${itemId}...`);
    const res = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const jsonString = JSON.stringify(res.data);
    
    console.log('\n🔍 Procurando padrões no JSON...');
    const searchTerms = ['CHUTEIRA124281', 'CAMRBRT41', '124281', '7901157713832'];
    
    searchTerms.forEach(term => {
      const found = jsonString.includes(term);
      console.log(`- Termo "${term}": ${found ? '✅ ENCONTRADO!' : '❌ Não encontrado'}`);
    });

    if (jsonString.includes('CHUTEIRA124281')) {
      console.log('\nSubtermo encontrado! Mostrando trecho ao redor:');
      const idx = jsonString.indexOf('CHUTEIRA124281');
      console.log(jsonString.substring(idx - 100, idx + 100));
    }

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
