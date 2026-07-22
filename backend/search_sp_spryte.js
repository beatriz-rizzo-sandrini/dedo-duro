const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    console.log(`📡 Buscando anúncios com título "Spryte" do vendedor ${userId}...`);
    const searchRes = await axios.get(`https://api.mercadolibre.com/users/${userId}/items/search?status=active&q=Spryte`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const results = searchRes.data.results || [];
    console.log(`Encontrados ${results.length} anúncios.`);
    
    if (results.length > 0) {
      console.log('IDs encontrados:', results);
      
      // Fetch details of the first one
      const itemRes = await axios.get(`https://api.mercadolibre.com/items/${results[0]}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('\n--- DETALHES DO PRIMEIRO ANÚNCIO ---');
      console.log(`Título: "${itemRes.data.title}"`);
      console.log(`Tem variações? ${itemRes.data.variations ? itemRes.data.variations.length : 0}`);
      if (itemRes.data.variations && itemRes.data.variations.length > 0) {
        console.log('Primeira variação:', JSON.stringify(itemRes.data.variations[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Erro na execução:', error.response ? error.response.data : error.message);
  }
}

run();
