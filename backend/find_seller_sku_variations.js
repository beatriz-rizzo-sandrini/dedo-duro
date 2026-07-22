const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    console.log(`📡 Buscando todos os IDs de anúncios ativos do vendedor ${userId}...`);
    let itemIds = [];
    let scrollId = null;
    let hasMore = true;

    while (hasMore) {
      let url = `https://api.mercadolibre.com/users/${userId}/items/search?status=active&limit=100`;
      if (scrollId) {
        url += `&scroll_id=${scrollId}`;
      }
      
      const searchRes = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const ids = searchRes.data.results || [];
      itemIds = itemIds.concat(ids);
      
      scrollId = searchRes.data.scroll_id;
      if (ids.length < 100 || !scrollId) {
        hasMore = false;
      }
    }

    console.log(`Carregados ${itemIds.length} anúncios ativos. Buscando variações com SELLER_SKU...`);

    // Fetch items in chunks to avoid rate limiting
    const chunkSize = 20;
    let foundCount = 0;

    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunk = itemIds.slice(i, i + chunkSize);
      const idsStr = chunk.join(',');
      
      const itemsRes = await axios.get(`https://api.mercadolibre.com/items?ids=${idsStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      for (const resItem of itemsRes.data) {
        if (resItem.code !== 200 || !resItem.body) continue;
        const item = resItem.body;
        
        // Scan item variations
        if (item.variations && item.variations.length > 0) {
          for (const v of item.variations) {
            // Check if there is an attributes array in the variation object
            if (v.attributes && Array.isArray(v.attributes)) {
              const skuAttr = v.attributes.find(a => a.id === 'SELLER_SKU');
              if (skuAttr) {
                console.log(`✅ Encontrado no anúncio ${item.id} (${item.title}):`);
                console.log(`   Variação ID: ${v.id} | SKU: ${skuAttr.value_name}`);
                foundCount++;
              }
            }
            // Check if it's stored in seller_custom_field
            if (v.seller_custom_field) {
              console.log(`✅ Encontrado no custom field de ${item.id}:`);
              console.log(`   Variação ID: ${v.id} | Custom Field: ${v.seller_custom_field}`);
              foundCount++;
            }
          }
        }
      }
    }

    console.log(`\nFim da varredura. Total de variações com SKU/SELLER_SKU encontradas: ${foundCount}`);

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

run();
