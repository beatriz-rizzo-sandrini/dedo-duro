const fs = require('fs');
const path = require('path');
const axios = require('axios');

const credentialsPath = path.join(__dirname, 'meli_sp_credentials.json');

async function obterTokenValido(credentialsPath) {
  const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const updatedAt = new Date(creds.updated_at).getTime();
  const agora = Date.now();
  const cincoHorasMs = 5 * 60 * 60 * 1000;
  if (agora - updatedAt < cincoHorasMs) {
    return creds.access_token;
  }
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', creds.client_id);
  params.append('client_secret', creds.client_secret);
  params.append('refresh_token', creds.refresh_token);
  const res = await axios.post('https://api.mercadolibre.com/oauth/token', params);
  creds.access_token = res.data.access_token;
  creds.refresh_token = res.data.refresh_token;
  creds.updated_at = new Date().toISOString();
  fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2), 'utf8');
  return creds.access_token;
}

async function run() {
  console.log('📡 Analisando distribuição de SKUs nos anúncios ativos...');
  try {
    const token = await obterTokenValido(credentialsPath);
    const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const userId = creds.user_id;

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
      offset += limit;
      hasMore = allItemIds.length < searchRes.data.paging.total;
    }

    console.log(`Total de anúncios ativos encontrados: ${allItemIds.length}`);

    let totalSimpleListings = 0;
    let totalVariations = 0;
    
    let simpleWithSku = 0;
    let simpleWithoutSku = 0;
    
    let variationsWithSku = 0;
    let variationsWithoutSku = 0;

    const skuOccurrences = {}; // SKU -> count
    const itemsWithoutSkuList = [];

    const batchSize = 20;
    for (let i = 0; i < allItemIds.length; i += batchSize) {
      const batchIds = allItemIds.slice(i, i + batchSize);
      const itemsRes = await axios.get(`https://api.mercadolibre.com/items?ids=${batchIds.join(',')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      itemsRes.data.forEach(wrapped => {
        const item = wrapped.body;
        if (!item || item.status !== 'active') return;

        if (item.variations && item.variations.length > 0) {
          item.variations.forEach(v => {
            totalVariations++;
            const skuAttr = v.attributes && Array.isArray(v.attributes) ? v.attributes.find(a => a.id === 'SELLER_SKU') : null;
            const sku = (skuAttr && skuAttr.value_name) ? String(skuAttr.value_name).trim() : (v.seller_custom_field ? String(v.seller_custom_field).trim() : null);

            if (sku) {
              const cleanSku = sku.toUpperCase();
              skuOccurrences[cleanSku] = (skuOccurrences[cleanSku] || 0) + 1;
              variationsWithSku++;
            } else {
              variationsWithoutSku++;
              itemsWithoutSkuList.push({ id: item.id, title: item.title, type: 'Variação', variation_id: v.id });
            }
          });
        } else {
          totalSimpleListings++;
          const skuAttr = item.attributes && Array.isArray(item.attributes) ? item.attributes.find(a => a.id === 'SELLER_SKU') : null;
          const sku = (skuAttr && skuAttr.value_name) ? String(skuAttr.value_name).trim() : (item.seller_custom_field ? String(item.seller_custom_field).trim() : null);

          if (sku) {
            const cleanSku = sku.toUpperCase();
            skuOccurrences[cleanSku] = (skuOccurrences[cleanSku] || 0) + 1;
            simpleWithSku++;
          } else {
            simpleWithoutSku++;
            itemsWithoutSkuList.push({ id: item.id, title: item.title, type: 'Anúncio Simples' });
          }
        }
      });
    }

    const uniqueSkus = Object.keys(skuOccurrences);
    const duplicatedSkus = Object.entries(skuOccurrences).filter(([sku, count]) => count > 1);

    console.log('\n================ RESULTADOS DA ANÁLISE ================');
    console.log(`- Total de anúncios analisados: ${allItemIds.length}`);
    console.log(`- Anúncios simples (sem variação): ${totalSimpleListings}`);
    console.log(`  - Com SKU definido: ${simpleWithSku}`);
    console.log(`  - Sem SKU definido: ${simpleWithoutSku}`);
    console.log(`- Total de variações analisadas: ${totalVariations}`);
    console.log(`  - Com SKU definido: ${variationsWithSku}`);
    console.log(`  - Sem SKU definido: ${variationsWithoutSku}`);
    console.log('------------------------------------------------------');
    console.log(`- Total de SKUs encontrados: ${simpleWithSku + variationsWithSku}`);
    console.log(`- SKUs únicos consolidados: ${uniqueSkus.length}`);
    console.log(`- Quantidade de SKUs que aparecem mais de uma vez (duplicados/kits): ${duplicatedSkus.length}`);
    console.log(`- Total de itens/variações ativos sem nenhum SKU: ${simpleWithoutSku + variationsWithoutSku}`);
    
    if (itemsWithoutSkuList.length > 0) {
      console.log('\nExemplo de itens/variações sem SKU (primeiros 5):');
      itemsWithoutSkuList.slice(0, 5).forEach(it => {
        console.log(`  - ID: ${it.id} | Tipo: ${it.type} | Título: "${it.title}"`);
      });
    }

    if (duplicatedSkus.length > 0) {
      console.log('\nExemplo de SKUs duplicados ou compartilhados (primeiros 5):');
      duplicatedSkus.slice(0, 5).forEach(([sku, count]) => {
        console.log(`  - SKU: ${sku} | Ocorre em: ${count} anúncios/variações diferentes`);
      });
    }
  } catch (err) {
    console.error('Erro na análise:', err.message);
  }
}

run();
