const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CREDENTIALS_PATH = path.join(__dirname, 'meli_credentials.json');

async function run() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const accessToken = credentials.access_token;
  const sellerId = credentials.seller_id || '427063369';

  let orders = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  const today = new Date();
  const dateFromStr = today.toISOString().substring(0, 10) + 'T00:00:00.000-03:00';
  console.log(`📅 Date from: ${dateFromStr}`);

  while (hasMore) {
    const res = await axios.get('https://api.mercadolibre.com/orders/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        seller: sellerId,
        'order.status': 'paid',
        'order.date_created.from': dateFromStr,
        sort: 'date_desc',
        limit: limit,
        offset: offset
      }
    });

    const results = res.data.results || [];
    if (results.length === 0) break;
    orders = orders.concat(results);
    const paging = res.data.paging || {};
    offset += results.length;
    hasMore = offset < paging.total && results.length === limit;
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`Retrieved ${orders.length} orders.`);
  
  const dates = {};
  const quantities = {};
  
  for (const ord of orders) {
    const closedDateRaw = ord.date_closed || ord.date_created;
    const dataVenda = closedDateRaw ? closedDateRaw.substring(0, 10) : 'NO_DATE';
    
    dates[dataVenda] = (dates[dataVenda] || 0) + 1;
    
    for (const itemObj of ord.order_items) {
      const qty = Number(itemObj.quantity) || 1;
      quantities[dataVenda] = (quantities[dataVenda] || 0) + qty;
    }
  }
  
  console.log('Orders per date:', dates);
  console.log('Quantities per date:', quantities);
}

run().catch(console.error);
