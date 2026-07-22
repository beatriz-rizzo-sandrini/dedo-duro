const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const itemId = 'MLB3222983060';

    console.log(`📡 Buscando atributos do anúncio simples ${itemId}...`);
    const res = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const item = res.data;
    console.log(`Título: "${item.title}"`);
    console.log(`seller_custom_field: "${item.seller_custom_field}"`);
    
    console.log('\n--- ATRIBUTOS DO ITEM ---');
    for (const attr of item.attributes) {
      if (attr.id.includes('SKU') || attr.id.includes('seller') || attr.id === 'SELLER_SKU' || attr.name.includes('SKU')) {
        console.log(`👉 ENCONTRADO ATRIBUTO DE SKU:`, attr);
      } else {
        console.log(`Atributo: ${attr.id} | Nome: ${attr.name} | Valor: ${attr.value_name}`);
      }
    }

  } catch (error) {
    console.error('Erro na execução:', error.response ? error.response.data : error.message);
  }
}

run();
