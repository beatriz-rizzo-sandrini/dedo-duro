const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const CREDENTIALS_PATH = path.join(__dirname, 'meli_credentials.json');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_KEY not found in environment variables.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Mercado Livre App Settings
const CLIENT_ID = process.env.MELI_CLIENT_ID;
const CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;

async function run() {
  console.log('🚀 [Mercado Livre Stock Sync] Starting sync...');

  // 1. Load active credentials
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ Error: meli_credentials.json not found.');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  let accessToken = credentials.access_token;
  let refreshToken = credentials.refresh_token;
  const sellerId = credentials.seller_id || '427063369';

  console.log(`📡 Using Seller ID: ${sellerId}`);

  // 2. Try to refresh the token if credentials are provided in .env
  if (CLIENT_ID && CLIENT_SECRET && refreshToken) {
    console.log('🔄 Attempting to automatically refresh Mercado Livre Access Token...');
    try {
      const res = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken
        }
      });

      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;

      credentials.access_token = accessToken;
      credentials.refresh_token = refreshToken;
      credentials.last_updated = new Date().toISOString();
      fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), 'utf8');
      
      console.log('✅ Access Token refreshed and saved successfully!');
    } catch (err) {
      console.warn('⚠️ Warning: Failed to refresh token using client credentials. Falling back to active token.', err.response?.data || err.message);
    }
  }

  // 3. Fetch all active items search list (returns item IDs)
  console.log('📥 Fetching active items list from Mercado Livre...');
  let itemIds = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  try {
    while (hasMore) {
      console.log(`   ⏳ Fetching items page (offset: ${offset})...`);
      
      let res = null;
      let retries = 3;
      while (retries > 0) {
        try {
          res = await axios.get(`https://api.mercadolibre.com/users/${sellerId}/items/search`, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
            params: {
              status: 'active',
              limit: limit,
              offset: offset
            }
          });
          break;
        } catch (err) {
          if (err.response?.status === 429) {
            console.warn(`   ⚠️ Hit rate limit (429) at offset ${offset}. Waiting 20 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 20000));
            retries--;
          } else {
            throw err;
          }
        }
      }

      if (!res) {
        throw new Error(`Failed to fetch items at offset ${offset} after multiple retries.`);
      }

      const results = res.data.results || [];
      if (results.length === 0) break;

      itemIds = itemIds.concat(results);

      const paging = res.data.paging || {};
      offset += results.length;
      hasMore = offset < paging.total && results.length === limit;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`📦 Retrieved a total of ${itemIds.length} active item IDs.`);
  } catch (err) {
    console.error('❌ Error fetching item IDs from Mercado Livre:', err.response?.data || err.message);
    process.exit(1);
  }

  if (itemIds.length === 0) {
    console.log('🎉 No active items found. Sync completed successfully.');
    process.exit(0);
  }

  // 4. Fetch details of all items in batches of 20 (multiget limit)
  console.log('📥 Fetching detailed inventory stock in batches of 20...');
  
  const parsedStock = [];
  const todayDate = new Date();
  const d = String(todayDate.getDate()).padStart(2, '0');
  const m = String(todayDate.getMonth() + 1).padStart(2, '0');
  const y = todayDate.getFullYear();
  const dataAtualizacao = `${d}/${m}/${y}`; // Matches Brazilian string format dd/mm/yyyy

  const batchSize = 20;

  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize);
    console.log(`   ⏳ Querying details for batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(itemIds.length / batchSize)} (IDs: ${batch.length})...`);

    let res = null;
    let retries = 3;
    while (retries > 0) {
      try {
        res = await axios.get('https://api.mercadolibre.com/items', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            ids: batch.join(',')
          }
        });
        break;
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn(`   ⚠️ Hit rate limit (429) in details batch. Waiting 20 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 20000));
          retries--;
        } else {
          throw err;
        }
      }
    }

    if (!res) {
      console.error(`❌ Failed to fetch details for batch starting at index ${i} after multiple retries. Skipping batch.`);
      continue;
    }

    const itemsData = res.data || [];
    for (const itemObj of itemsData) {
      if (itemObj.code !== 200 || !itemObj.body) continue;
      const item = itemObj.body;

      const title = item.title || 'Produto sem descrição';
      const itemSku = item.seller_custom_field ? String(item.seller_custom_field).trim() : null;

      // Check if it has variations (sizes, colors, etc.)
      if (item.variations && item.variations.length > 0) {
        for (const v of item.variations) {
          const varSku = v.seller_custom_field ? String(v.seller_custom_field).trim() : null;
          
          // Naming logic: use variation SKU if available, otherwise composite fallback {ITEM_ID}_{VARIATION_ID}
          const finalSku = varSku || `${item.id}_${v.id}`;
          const qty = Number(v.available_quantity) || 0;

          // Determine description by appending variation values (Size/Color)
          const sizeAttr = v.attribute_combinations.find(a => a.id === 'SIZE');
          const colorAttr = v.attribute_combinations.find(a => a.id === 'COLOR');
          const sizeVal = sizeAttr ? sizeAttr.value_name : '';
          const colorVal = colorAttr ? colorAttr.value_name : '';
          const finalDesc = `${title}${sizeVal ? ' Tam: ' + sizeVal : ''}${colorVal ? ' Cor: ' + colorVal : ''}`;

          parsedStock.push({
            data_atualizacao: dataAtualizacao,
            sku_produto: finalSku,
            descricao_produto: finalDesc,
            marca: 'SANDRINI',
            local_estoque: 'MELI SP',
            quantidade_disponivel: qty,
            valor_unitario: 0
          });
        }
      } else {
        // No variations: use item SKU or item ID
        const finalSku = itemSku || item.id;
        const qty = Number(item.available_quantity) || 0;

        parsedStock.push({
          data_atualizacao: dataAtualizacao,
          sku_produto: finalSku,
          descricao_produto: title,
          marca: 'SANDRINI',
          local_estoque: 'MELI SP',
          quantidade_disponivel: qty,
          valor_unitario: 0
        });
      }
    }

    // Delay to respect rate limits
    if (i + batchSize < itemIds.length) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  console.log(`📊 Parsed a total of ${parsedStock.length} variation stock rows for MELI SP.`);

  if (parsedStock.length === 0) {
    console.log('🎉 No active stocks parsed. Sync completed.');
    process.exit(0);
  }

  // 5. Deduplicate before inserting (just in case)
  const dedupedStock = [];
  const seenKeys = new Set();
  for (const row of parsedStock) {
    const key = `${row.data_atualizacao}|${row.sku_produto}|${row.local_estoque}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      dedupedStock.push(row);
    }
  }

  console.log(`🧹 Deduplicated into ${dedupedStock.length} unique stock records. Preparing database upsert...`);

  // 6. Delete existing MELI SP stocks for today to start clean (avoids old/inactive listings remaining)
  try {
    console.log(`🗑️ Clearing old MELI SP database stock records for date ${dataAtualizacao}...`);
    const { error: deleteError } = await supabase
      .from('silver_estoque')
      .delete()
      .eq('local_estoque', 'MELI SP')
      .eq('data_atualizacao', dataAtualizacao);

    if (deleteError) {
      console.warn('⚠️ Warning: Failed to clear old MELI SP stock records:', deleteError.message);
    }
  } catch (err) {
    console.warn('⚠️ Warning: Failed to clear old stock records:', err.message);
  }

  // 7. Upsert in batches of 500
  const chunkSize = 500;
  try {
    for (let i = 0; i < dedupedStock.length; i += chunkSize) {
      const chunk = dedupedStock.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('silver_estoque')
        .upsert(chunk, { onConflict: 'data_atualizacao, sku_produto, local_estoque' });

      if (error) {
        console.error(`❌ Error during stock batch upsert starting at ${i}:`, error.message);
        process.exit(1);
      }
      console.log(`   📦 Batch ${Math.floor(i / chunkSize) + 1}: ${chunk.length} stock records synced...`);
    }

    console.log('✅ Mercado Livre SP active listing stock synced successfully!');
  } catch (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('💥 General failure:', err.message);
  process.exit(1);
});
