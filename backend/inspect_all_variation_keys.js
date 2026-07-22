const fs = require('fs');
const path = require('path');
const axios = require('axios');

const credentialsPath = path.join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    console.log(`📡 Buscando todos os IDs de anúncios ativos do vendedor ${userId}...`);
    let allItemIds = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const searchRes = await axios.get(`https://api.mercadolibre.com/users/${userId}/items/search?status=active&offset=${offset}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const results = searchRes.data.results || [];
      allItemIds = allItemIds.concat(results);
      if (results.length < limit || allItemIds.length >= searchRes.data.paging.total) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`Carregados ${allItemIds.length} anúncios ativos.`);

    const allKeysFound = new Set();
    const batchSize = 20;

    for (let i = 0; i < allItemIds.length; i += batchSize) {
      const batch = allItemIds.slice(i, i + batchSize);
      const res = await axios.get(`https://api.mercadolibre.com/items?ids=${batch.join(',')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      res.data.forEach(wrapped => {
        const item = wrapped.body;
        if (!item) return;

        if (item.variations && item.variations.length > 0) {
          item.variations.forEach(v => {
            Object.keys(v).forEach(k => allKeysFound.add(k));
          });
        }
      });
    }

    console.log('\n📋 Chaves encontradas dentro do objeto de VARIAÇÕES dos anúncios:');
    console.log(Array.from(allKeysFound).join(', '));

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
