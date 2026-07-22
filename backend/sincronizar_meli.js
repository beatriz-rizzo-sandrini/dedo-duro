const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

let xlsx;
try {
  xlsx = require('xlsx');
} catch (e) {
  try {
    xlsx = require('../node_modules/xlsx');
  } catch (err) {
    // Graceful fallback
  }
}

// Supabase config
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function obterTokenValido(credentialsPath) {
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Credenciais do Mercado Livre não encontradas em: ${credentialsPath}. Rode o processo de login primeiro.`);
  }

  const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const updatedAt = new Date(creds.updated_at).getTime();
  const agora = Date.now();
  const cincoHorasMs = 5 * 60 * 60 * 1000;

  if (agora - updatedAt < cincoHorasMs) {
    return creds.access_token;
  }

  console.log(`🔄 Renovando token para ${path.basename(credentialsPath)} via refresh_token...`);
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', creds.client_id);
    params.append('client_secret', creds.client_secret);
    params.append('refresh_token', creds.refresh_token);

    const res = await axios.post('https://api.mercadolibre.com/oauth/token', params, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = res.data;
    creds.access_token = data.access_token;
    creds.refresh_token = data.refresh_token;
    creds.updated_at = new Date().toISOString();

    fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2), 'utf8');
    console.log('✅ Token renovado com sucesso!');
    return creds.access_token;
  } catch (err) {
    console.error('Erro ao renovar token:', err.response ? err.response.data : err.message);
    throw err;
  }
}

// Extrai e limpa a marca a partir do anúncio ou dos atributos
function extrairMarca(item) {
  const brandAttr = item.attributes?.find(a => a.id === 'BRAND');
  if (brandAttr && brandAttr.value_name && brandAttr.value_name.trim() !== '') {
    return brandAttr.value_name.trim();
  }
  return 'Sem Marca';
}

async function carregarMapeamentoDoBanco() {
  const mapping = {};
  console.log('📡 Carregando mapeamentos de Full do Supabase (MELI_FULL_MAP)...');
  try {
    let hasMore = true;
    let offset = 0;
    const limit = 1000;

    while (hasMore) {
      const { data: dbMaps, error: dbMapsErr } = await supabase
        .from('silver_mapeamento_sku')
        .select('sku_plataforma, sku_senior')
        .eq('plataforma', 'MELI_FULL_MAP')
        .range(offset, offset + limit - 1);
        
      if (dbMapsErr) {
        console.error('⚠️ Erro ao carregar mapeamentos de Full do Supabase:', dbMapsErr.message);
        break;
      }
      
      dbMaps.forEach(m => {
        mapping[m.sku_plataforma] = m.sku_senior;
      });
      
      if (dbMaps.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
    console.log(`✅ Total de ${Object.keys(mapping).length} mapeamentos de Full do Supabase carregados.`);
  } catch (err) {
    console.error('⚠️ Erro ao acessar Supabase para mapeamento:', err.message);
  }
  return mapping;
}

async function run() {
  const args = process.argv;
  const isWrite = args.includes('--write');
  const localIndex = args.indexOf('--local');
  const localEstoque = (localIndex !== -1 && args[localIndex + 1]) ? args[localIndex + 1] : 'MELI SP';

  let credentialsFile = 'meli_sp_credentials.json';
  if (localEstoque.toUpperCase().includes('MG')) {
    credentialsFile = 'meli_mg_credentials.json';
  }
  const credentialsPath = path.join(__dirname, credentialsFile);

  console.log('====================================================');
  console.log(`       SINCRONIZADOR MERCADO LIVRE -> DEDO DURO      `);
  console.log(`       Modo: ${isWrite ? '🔥 GRAVAÇÃO EM SUPABASE' : '🔍 APENAS SIMULAÇÃO (DRY RUN)'}`);
  console.log(`       Local de Estoque Destino: "${localEstoque}"`);
  console.log(`       Arquivo de Credenciais: "${credentialsFile}"`);
  console.log('====================================================\n');

  try {
    const token = await obterTokenValido(credentialsPath);
    const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const userId = creds.user_id;
    const excelMapping = await carregarMapeamentoDoBanco();

    console.log(`📡 Obtendo lista completa de anúncios ativos para o vendedor ${userId}...`);
    
    let allItemIds = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const searchUrl = `https://api.mercadolibre.com/users/${userId}/items/search?status=active&offset=${offset}&limit=${limit}`;
      const searchRes = await axios.get(searchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const results = searchRes.data.results || [];
      allItemIds = allItemIds.concat(results);
      
      console.log(`- Carregados ${allItemIds.length} de ${searchRes.data.paging.total} anúncios...`);

      if (results.length < limit || allItemIds.length >= searchRes.data.paging.total) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`\n✅ Total de ${allItemIds.length} anúncios ativos mapeados.`);

    if (allItemIds.length === 0) {
      console.log('Nenhum anúncio ativo para processar.');
      return;
    }

    console.log('\n📡 Consultando detalhes dos anúncios em lotes de 20...');
    const consolidatedStock = {};
    const batchSize = 20;

    for (let i = 0; i < allItemIds.length; i += batchSize) {
      const batchIds = allItemIds.slice(i, i + batchSize);
      const multigetUrl = `https://api.mercadolibre.com/items?ids=${batchIds.join(',')}`;

      try {
        const itemsRes = await axios.get(multigetUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const details = itemsRes.data || [];
        
        details.forEach(wrapped => {
          const item = wrapped.body;
          if (!item || item.status !== 'active') return;

          const marca = extrairMarca(item);
          const preco = item.price || 0;

          // Se tiver variações (tamanho/cor), processamos cada variação individualmente
          if (item.variations && item.variations.length > 0) {
            item.variations.forEach(v => {
              let sku = null;
              const skuAttr = v.attributes && Array.isArray(v.attributes) ? v.attributes.find(a => a.id === 'SELLER_SKU') : null;
              if (skuAttr && skuAttr.value_name) {
                sku = String(skuAttr.value_name).trim();
              }
              if (!sku && v.seller_custom_field) {
                sku = String(v.seller_custom_field).trim();
              }
              if (!sku && v.inventory_id && excelMapping[v.inventory_id]) {
                sku = excelMapping[v.inventory_id];
              }
              const qtd = Number(v.available_quantity) || 0;
              
              if (sku) {
                const cleanSku = sku.toUpperCase();
                if (!consolidatedStock[cleanSku]) {
                  consolidatedStock[cleanSku] = {
                    sku_produto: cleanSku,
                    descricao_produto: item.title,
                    marca: marca,
                    quantidade_disponivel: 0,
                    valor_unitario: preco
                  };
                }
                consolidatedStock[cleanSku].quantidade_disponivel += qtd;
              }
            });
          } else {
            // Anúncio simples sem variações
            let sku = null;
            const skuAttr = item.attributes && Array.isArray(item.attributes) ? item.attributes.find(a => a.id === 'SELLER_SKU') : null;
            if (skuAttr && skuAttr.value_name) {
              sku = String(skuAttr.value_name).trim();
            }
            if (!sku && item.seller_custom_field) {
              sku = String(item.seller_custom_field).trim();
            }
            if (!sku && item.inventory_id && excelMapping[item.inventory_id]) {
              sku = excelMapping[item.inventory_id];
            }
            const qtd = Number(item.available_quantity) || 0;

            if (sku) {
              const cleanSku = sku.toUpperCase();
              if (!consolidatedStock[cleanSku]) {
                consolidatedStock[cleanSku] = {
                  sku_produto: cleanSku,
                  descricao_produto: item.title,
                  marca: marca,
                  quantidade_disponivel: 0,
                  valor_unitario: preco
                };
              }
              consolidatedStock[cleanSku].quantidade_disponivel += qtd;
            }
          }
        });

      } catch (batchErr) {
        console.error(`Erro ao consultar lote de anúncios ${i} a ${i + batchSize}:`, batchErr.message);
      }
    }

    const itemsToSave = Object.values(consolidatedStock);
    console.log(`\n📦 Estoque Consolidado por SKU terminado.`);
    console.log(`- Total de SKUs únicos mapeados com estoque ativo: ${itemsToSave.length}`);
    const totalQtdPecas = itemsToSave.reduce((acc, curr) => acc + curr.quantidade_disponivel, 0);
    console.log(`- Soma total de peças no Mercado Livre: ${totalQtdPecas}`);

    if (itemsToSave.length > 0) {
      console.log('\nExemplo dos primeiros 5 SKUs consolidados:');
      itemsToSave.slice(0, 5).forEach(item => {
        console.log(`  - SKU: ${item.sku_produto} | Qtd: ${item.quantidade_disponivel} | R$ ${item.valor_unitario} | Marca: ${item.marca} | Desc: "${item.descricao_produto.substring(0, 40)}..."`);
      });
    }

    // Se estiver no modo gravação, deleta o estoque anterior da data de hoje para esse local e grava
    if (isWrite) {
      const targetTable = args.includes('--test-table') ? 'silver_estoque_teste' : 'silver_estoque';
      // Data de hoje formatada no padrão DD/MM (ex: 13/07)
      const dataDeHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      console.log(`\n💾 Salvando dados no Supabase (Tabela: "${targetTable}") para a data "${dataDeHoje}" e local "${localEstoque}"...`);

      // Prepara os objetos para inserção
      const finalRows = itemsToSave.map(item => ({
        data_atualizacao: dataDeHoje,
        sku_produto: item.sku_produto,
        descricao_produto: item.descricao_produto,
        marca: item.marca,
        local_estoque: localEstoque,
        quantidade_disponivel: item.quantidade_disponivel,
        valor_unitario: item.valor_unitario
      }));

      // 1. Limpa os registros do local selecionado na data de hoje para evitar duplicidades
      console.log(`- Limpando registros antigos em ${localEstoque} para a data ${dataDeHoje} na tabela ${targetTable}...`);
      const { error: deleteError } = await supabase
        .from(targetTable)
        .delete()
        .eq('data_atualizacao', dataDeHoje)
        .eq('local_estoque', localEstoque);

      if (deleteError) {
        throw new Error(`Erro ao limpar registros antigos: ${deleteError.message}`);
      }

      // 2. Insere os novos dados em lotes de 200 registros
      const batchSaveSize = 200;
      for (let i = 0; i < finalRows.length; i += batchSaveSize) {
        const batch = finalRows.slice(i, i + batchSaveSize);
        const { error: insertError } = await supabase
          .from(targetTable)
          .insert(batch);

        if (insertError) {
          throw new Error(`Erro ao inserir lote no Supabase: ${insertError.message}`);
        }
        console.log(`  - Lote ${Math.floor(i / batchSaveSize) + 1} de ${Math.ceil(finalRows.length / batchSaveSize)} gravado...`);
      }

      console.log('\n🎉 Sincronização e gravação concluídas com sucesso no Supabase!');
    } else {
      console.log('\n💡 Dica: Para gravar esses dados de verdade no Supabase, rode com o parâmetro:');
      console.log(`   node backend/sincronizar_meli.js --write --local "${localEstoque}"`);
    }

  } catch (error) {
    console.error('\n❌ Erro durante o processo:', error.message);
  }
}

run();
