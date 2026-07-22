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

function carregarMapeamentoExcel() {
  const excelPath = 'C:\\Users\\beatriz.rizzo\\Downloads\\estoque_meli_sp.xlsx';
  const mapping = {};
  if (fs.existsSync(excelPath)) {
    console.log(`📖 Carregando mapeamentos de SKU a partir do arquivo Excel: ${excelPath}...`);
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
      console.log(`✅ Mapeamentos carregados do Excel: ${Object.keys(mapping).length}`);
    } catch (err) {
      console.error('⚠️ Erro ao ler Excel:', err.message);
    }
  } else {
    console.log('⚠️ Planilha estoque_meli_sp.xlsx não encontrada na pasta Downloads.');
  }
  return mapping;
}

async function run() {
  const args = process.argv;
  const isExecute = args.includes('--execute');
  const limitUpdates = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) || 5 : null;

  console.log('====================================================');
  console.log(`   ATUALIZADOR DE SKUs NAS LISTAGENS DO MERCADO LIVRE   `);
  console.log(`   Modo: ${isExecute ? '🔥 EXECUÇÃO DE GRAVAÇÃO (API)' : '🔍 APENAS SIMULAÇÃO (DRY RUN)'}`);
  if (limitUpdates) {
    console.log(`   Limite de atualizações: ${limitUpdates}`);
  }
  console.log('====================================================\n');

  try {
    const excelMapping = carregarMapeamentoExcel();
    if (Object.keys(excelMapping).length === 0) {
      console.error('❌ Abortado: Nenhum mapeamento carregado da planilha.');
      return;
    }

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

    console.log(`✅ Total de ${allItemIds.length} anúncios ativos encontrados.`);
    
    let processedCount = 0;
    let updateCount = 0;
    const batchSize = 20;

    for (let i = 0; i < allItemIds.length; i += batchSize) {
      const batchIds = allItemIds.slice(i, i + batchSize);
      const itemsRes = await axios.get(`https://api.mercadolibre.com/items?ids=${batchIds.join(',')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      for (const wrapped of itemsRes.data) {
        const item = wrapped.body;
        if (!item || item.status !== 'active') continue;

        if (item.variations && item.variations.length > 0) {
          for (const v of item.variations) {
            // Verificar se o SKU está ausente na API
            const skuAttr = v.attributes && Array.isArray(v.attributes) ? v.attributes.find(a => a.id === 'SELLER_SKU') : null;
            const currentSku = (skuAttr && skuAttr.value_name) ? String(skuAttr.value_name).trim() : (v.seller_custom_field ? String(v.seller_custom_field).trim() : null);

            if (!currentSku && v.inventory_id && excelMapping[v.inventory_id]) {
              const newSku = excelMapping[v.inventory_id];
              updateCount++;
              
              console.log(`[${updateCount}] Variação ID ${v.id} do anúncio ${item.id} (${item.title.substring(0, 30)}...):`);
              console.log(`   - ID de estoque (Full): ${v.inventory_id}`);
              console.log(`   - Novo SKU a gravar: "${newSku}"`);

              if (isExecute) {
                try {
                  const updateUrl = `https://api.mercadolibre.com/items/${item.id}/variations/${v.id}`;
                  await axios.put(updateUrl, {
                    seller_custom_field: newSku
                  }, {
                    headers: { 
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  console.log(`   ✅ Gravação realizada com sucesso!`);
                  // Sleep de 100ms para evitar hitting rate limit
                  await new Promise(r => setTimeout(r, 100));
                } catch (err) {
                  console.error(`   ❌ Falha ao atualizar:`, err.response ? err.response.data : err.message);
                }
              }

              if (limitUpdates && updateCount >= limitUpdates) {
                console.log(`\n⚠️ Limite de ${limitUpdates} atualizações atingido.`);
                break;
              }
            }
          }
        }
        if (limitUpdates && updateCount >= limitUpdates) break;
      }
      if (limitUpdates && updateCount >= limitUpdates) break;
    }

    console.log('\n====================================================');
    console.log(`Varredura concluída.`);
    console.log(`Total de variações sem SKU que possuem mapeamento: ${updateCount}`);
    if (isExecute) {
      console.log(`Atualizações gravadas na API.`);
    } else {
      console.log(`Nenhuma alteração foi realizada. Para gravar de verdade, execute com o parâmetro: --execute`);
    }
    console.log('====================================================');

  } catch (err) {
    console.error('❌ Erro no processo:', err.message);
  }
}

run();
