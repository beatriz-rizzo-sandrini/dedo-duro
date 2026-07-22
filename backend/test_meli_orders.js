const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    console.log(`📡 Buscando últimas vendas (pedidos) da conta SP (${userId})...`);
    
    // Query recent orders
    const res = await axios.get(`https://api.mercadolibre.com/orders/search?seller=${userId}&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const orders = res.data.results || [];
    console.log(`✅ Encontrados ${orders.length} pedidos recentes.`);

    if (orders.length > 0) {
      console.log('\n--- DETALHES DO PRIMEIRO PEDIDO ---');
      const order = orders[0];
      
      console.log(`ID do Pedido: ${order.id}`);
      console.log(`Data de Criação: ${order.date_created}`);
      console.log(`Status: ${order.status}`);
      
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach((item, index) => {
          console.log(`\nItem ${index}:`);
          console.log(`  ID do Anúncio: ${item.item.id}`);
          console.log(`  Título: ${item.item.title}`);
          console.log(`  Variação ID: ${item.item.variation_id}`);
          console.log(`  Quantidade: ${item.quantity}`);
          console.log(`  Preço: ${item.unit_price}`);
          console.log(`  SKU (seller_sku): "${item.item.seller_sku}"`);
          console.log(`  Custom Field (seller_custom_field): "${item.item.seller_custom_field}"`);
        });
      }
    } else {
      console.log('Nenhum pedido encontrado.');
    }

  } catch (error) {
    console.error('Erro na execução:', error.response ? error.response.data : error.message);
  }
}

run();
