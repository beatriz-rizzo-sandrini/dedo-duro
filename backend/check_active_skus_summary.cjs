const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CREDENTIALS_PATH = path.join(__dirname, 'meli_credentials.json');

async function run() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const accessToken = credentials.access_token;
  const sellerId = credentials.seller_id || '427063369';

  try {
    let allItemIds = [];
    let offset = 0;
    let hasMore = true;

    console.log('Scanning active listings to count variations with custom SKUs...');

    while (hasMore && allItemIds.length < 100) {
      const res = await axios.get(`https://api.mercadolibre.com/users/${sellerId}/items/search`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { status: 'active', limit: 50, offset }
      });

      const results = res.data.results || [];
      if (results.length === 0) break;
      allItemIds = allItemIds.concat(results);
      offset += results.length;
      hasMore = allItemIds.length < res.data.paging.total;
    }

    console.log(`Found ${allItemIds.length} active item IDs. Querying details in batches of 20...`);

    let totalItems = 0;
    let totalVariations = 0;
    let variationsWithSku = 0;
    let itemsWithoutVariations = 0;
    let itemsWithoutVariationsWithSku = 0;

    for (let i = 0; i < allItemIds.length; i += 20) {
      const batchIds = allItemIds.slice(i, i + 20);
      const multigetRes = await axios.get('https://api.mercadolibre.com/items', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { ids: batchIds.join(',') }
      });

      for (const itemObj of multigetRes.data) {
        const item = itemObj.body;
        totalItems++;
        if (item.variations && item.variations.length > 0) {
          totalVariations += item.variations.length;
          for (const v of item.variations) {
            if (v.seller_custom_field) {
              variationsWithSku++;
            }
          }
        } else {
          itemsWithoutVariations++;
          if (item.seller_custom_field) {
            itemsWithoutVariationsWithSku++;
          }
        }
      }
    }

    console.log(`\n📊 SUMMARY OF ACTIVE LISTINGS:`);
    console.log(`- Total listings scanned: ${totalItems}`);
    console.log(`- Listings without variations: ${itemsWithoutVariations}`);
    console.log(`  - Of which have SKU defined: ${itemsWithoutVariationsWithSku}`);
    console.log(`- Total variations across all listings: ${totalVariations}`);
    console.log(`  - Of which have variation-level SKU defined: ${variationsWithSku}`);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
