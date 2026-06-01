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
  console.log('🚀 [Mercado Livre Sync] Starting sync...');

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

      // Save updated credentials back to file
      credentials.access_token = accessToken;
      credentials.refresh_token = refreshToken;
      credentials.last_updated = new Date().toISOString();
      fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), 'utf8');
      
      console.log('✅ Access Token refreshed and saved successfully!');
    } catch (err) {
      console.warn('⚠️ Warning: Failed to refresh token using client credentials. Falling back to active token.', err.response?.data || err.message);
    }
  } else {
    console.log('ℹ️ Info: MELI_CLIENT_ID / CLIENT_SECRET not configured in .env. Skipping token auto-refresh, using active token.');
  }

  // 3. Fetch sales from Mercado Livre API (Paginated to get all orders)
  console.log('📥 Querying paid orders from Mercado Livre...');
  let orders = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  // Dynamically calculate date filter (orders from the last 3 days)
  const today = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(today.getDate() - 3);
  const dateFromStr = dateFrom.toISOString().substring(0, 10) + 'T00:00:00.000-03:00';
  console.log(`📅 Syncing orders created since (last 3 days): ${dateFromStr}`);

  try {
    while (hasMore) {
      console.log(`   ⏳ Fetching page (offset: ${offset})...`);
      
      let res = null;
      let retries = 3;
      while (retries > 0) {
        try {
          res = await axios.get('https://api.mercadolibre.com/orders/search', {
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
            params: {
              seller: sellerId,
              'order.status': 'paid',
              'order.date_created.from': dateFromStr,
              sort: 'date_desc',
              limit: limit,
              offset: offset
            }
          });
          break; // Success, break the retry loop
        } catch (err) {
          if (err.response?.status === 429) {
            console.warn(`   ⚠️ Hit rate limit (429) at offset ${offset}. Waiting 20 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 20000));
            retries--;
          } else {
            throw err; // Other HTTP error, throw immediately
          }
        }
      }

      if (!res) {
        throw new Error(`Failed to fetch orders at offset ${offset} after multiple retries.`);
      }

      const results = res.data.results || [];
      if (results.length === 0) break;

      orders = orders.concat(results);

      const paging = res.data.paging || {};
      offset += results.length;
      hasMore = offset < paging.total && results.length === limit;

      // Safe delay of 600ms between requests to avoid Meli 429 rate limiting in normal flow
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    console.log(`📦 Retrieved a total of ${orders.length} orders from Mercado Livre.`);
  } catch (err) {
    console.error('❌ Error fetching orders from Mercado Livre:', err.response?.data || err.message);
    process.exit(1);
  }

  if (orders.length === 0) {
    console.log('🎉 No paid orders found. Sync completed successfully.');
    process.exit(0);
  }

  // 4. Parse orders into database-ready rows
  const parsedSales = [];
  const processedKeys = new Set(); // to avoid duplicates in the same payload

  for (const ord of orders) {
    const closedDateRaw = ord.date_closed || ord.date_created;
    if (!closedDateRaw) continue;

    // Convert date string "2026-06-01T10:00:00.000-04:00" to "2026-06-01"
    const dataVenda = closedDateRaw.substring(0, 10);

    for (const itemObj of ord.order_items) {
      const platformSku = itemObj.item.seller_custom_field || itemObj.item.id;
      if (!platformSku) continue;

      const cleanSku = String(platformSku).trim();
      const desc = itemObj.item.title || 'Produto sem descrição';
      const quantity = Number(itemObj.quantity) || 1;

      // Unique key: data + local + sku
      const uniqueKey = `${dataVenda}|MELI SP|${cleanSku}`;
      
      if (processedKeys.has(uniqueKey)) {
        // Aggregate quantity if order contains multiple rows with the same SKU on the same date
        const existing = parsedSales.find(s => s.data_venda === dataVenda && s.sku_produto === cleanSku);
        if (existing) {
          existing.quantidade_vendida += quantity;
        }
      } else {
        processedKeys.add(uniqueKey);
        parsedSales.push({
          data_venda: dataVenda,
          local_venda: 'MELI SP',
          sku_produto: cleanSku,
          descricao_produto: desc,
          marca: 'SANDRINI',
          quantidade_vendida: quantity
        });
      }
    }
  }

  console.log(`📊 Parsed ${parsedSales.length} unique sales rows. Preparing database upsert...`);

  // 5. Upsert sales to Supabase (tabela silver_vendas)
  try {
    const { error } = await supabase
      .from('silver_vendas')
      .upsert(parsedSales, { onConflict: 'data_venda, local_venda, sku_produto' });

    if (error) {
      console.error('❌ Error during database upsert:', error.message);
      process.exit(1);
    }

    console.log('✅ Sales synced and upserted to Supabase successfully!');
  } catch (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('💥 General failure:', err.message);
  process.exit(1);
});
