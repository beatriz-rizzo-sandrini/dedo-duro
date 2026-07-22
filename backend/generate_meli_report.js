const fs = require('fs');
const path = require('path');
const axios = require('axios');
const XLSX = require('xlsx');

const credentialsPath = path.join(__dirname, 'meli_sp_credentials.json');

async function obterTokenValido(credentialsPath) {
  const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const updatedAt = new Date(creds.updated_at).getTime();
  const agora = Date.now();
  const cincoHorasMs = 5 * 60 * 60 * 1000;

  if (agora - updatedAt < cincoHorasMs) {
    return creds.access_token;
  }

  console.log(`🔄 Renovando token via refresh_token...`);
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

function carregarMapeamentoPlanilhaExcel() {
  const excelPath = 'C:\\Users\\beatriz.rizzo\\Downloads\\estoque_meli_sp.xlsx';
  const mapping = {};
  if (fs.existsSync(excelPath)) {
    console.log(`📖 Carregando mapeamentos de SKU a partir do arquivo local: ${excelPath}...`);
    try {
      const workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      rows.forEach(r => {
        const invId = r['Código ML'] ? String(r['Código ML']).trim() : null;
        const sku = r['SKU'] ? String(r['SKU']).trim() : null;
        if (invId && sku) {
          mapping[invId] = sku;
        }
      });
      console.log(`✅ Sucesso! Carregados ${Object.keys(mapping).length} mapeamentos a partir do Excel.`);
    } catch (err) {
      console.error('⚠️ Erro ao ler mapeamento do Excel:', err.message);
    }
  } else {
    console.log('⚠️ Planilha estoque_meli_sp.xlsx não encontrada na pasta Downloads.');
  }
  return mapping;
}

function extrairMarca(item) {
  const brandAttr = item.attributes?.find(a => a.id === 'BRAND');
  if (brandAttr && brandAttr.value_name && brandAttr.value_name.trim() !== '') {
    return brandAttr.value_name.trim();
  }
  return 'Sem Marca';
}

async function run() {
  console.log('📡 Iniciando extração completa de SKUs para geração de relatório...');
  try {
    const excelMapping = carregarMapeamentoPlanilhaExcel();
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

    console.log(`✅ Total de ${allItemIds.length} anúncios ativos encontrados. Buscando detalhes...`);

    const consolidatedStock = {};
    const batchSize = 20;

    for (let i = 0; i < allItemIds.length; i += batchSize) {
      const batchIds = allItemIds.slice(i, i + batchSize);
      const itemsRes = await axios.get(`https://api.mercadolibre.com/items?ids=${batchIds.join(',')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const details = itemsRes.data || [];
      details.forEach(wrapped => {
        const item = wrapped.body;
        if (!item || item.status !== 'active') return;

        const marca = extrairMarca(item);
        const preco = item.price || 0;

        if (item.variations && item.variations.length > 0) {
          item.variations.forEach(v => {
            let sku = null;
            // 1. Tentar do atributo SELLER_SKU
            const skuAttr = v.attributes && Array.isArray(v.attributes) ? v.attributes.find(a => a.id === 'SELLER_SKU') : null;
            if (skuAttr && skuAttr.value_name) {
              sku = String(skuAttr.value_name).trim();
            }
            // 2. Fallback para seller_custom_field
            if (!sku && v.seller_custom_field) {
              sku = String(v.seller_custom_field).trim();
            }
            // 3. Fallback para mapeamento Excel (usando inventory_id / Código ML)
            if (!sku && v.inventory_id && excelMapping[v.inventory_id]) {
              sku = excelMapping[v.inventory_id];
            }

            const qtd = Number(v.available_quantity) || 0;

            if (sku) {
              const cleanSku = sku.toUpperCase();
              if (!consolidatedStock[cleanSku]) {
                consolidatedStock[cleanSku] = { sku: cleanSku, desc: item.title, brand: marca, qty: 0, price: preco };
              }
              consolidatedStock[cleanSku].qty += qtd;
            }
          });
        } else {
          let sku = null;
          // 1. Tentar do atributo SELLER_SKU
          const skuAttr = item.attributes && Array.isArray(item.attributes) ? item.attributes.find(a => a.id === 'SELLER_SKU') : null;
          if (skuAttr && skuAttr.value_name) {
            sku = String(skuAttr.value_name).trim();
          }
          // 2. Fallback para seller_custom_field
          if (!sku && item.seller_custom_field) {
            sku = String(item.seller_custom_field).trim();
          }
          // 3. Fallback para mapeamento Excel
          if (!sku && item.inventory_id && excelMapping[item.inventory_id]) {
            sku = excelMapping[item.inventory_id];
          }

          const qtd = Number(item.available_quantity) || 0;

          if (sku) {
            const cleanSku = sku.toUpperCase();
            if (!consolidatedStock[cleanSku]) {
              consolidatedStock[cleanSku] = { sku: cleanSku, desc: item.title, brand: marca, qty: 0, price: preco };
            }
            consolidatedStock[cleanSku].qty += qtd;
          }
        }
      });
    }

    const items = Object.values(consolidatedStock);
    items.sort((a, b) => a.sku.localeCompare(b.sku));

    // Escrever para arquivo CSV
    const csvPath = path.join(__dirname, 'meli_extracted_skus.csv');
    const headers = 'SKU;Quantidade;Preco;Marca;Descricao\n';
    const lines = items.map(item => {
      const cleanDesc = item.desc.replace(/;/g, ',').replace(/"/g, '""');
      return `"${item.sku}";${item.qty};${item.price};"${item.brand}";"${cleanDesc}"`;
    }).join('\n');

    fs.writeFileSync(csvPath, headers + lines, 'utf8');
    console.log(`\n🎉 Sucesso! Relatório gerado em: ${csvPath}`);
    console.log(`Total de SKUs extraídos: ${items.length}`);
  } catch (err) {
    console.error('❌ Falha na geração do relatório:', err.message);
  }
}

run();
