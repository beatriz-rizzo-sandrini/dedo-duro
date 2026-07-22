const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

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

function obterMarcaPorSkuEDesc(sku, desc) {
  const cleanSku = String(sku || "").trim().toUpperCase();
  const cleanDesc = String(desc || "").trim().toUpperCase();

  if (cleanSku.startsWith('SA') || cleanSku.startsWith('KSA') || cleanSku.startsWith('K4C') || cleanSku.startsWith('129') || cleanSku.startsWith('K10') || cleanSku.startsWith('000')) {
    return 'SANDRINI';
  }
  if (cleanSku.startsWith('FL') || cleanSku.startsWith('KFL') || cleanSku.startsWith('F0')) {
    return 'FILA';
  }
  if (cleanSku.startsWith('AD') || cleanSku.startsWith('KAD')) {
    return 'ADIDAS';
  }
  if (cleanSku.startsWith('LP') || cleanSku.startsWith('KLP') || cleanSku.startsWith('523') || cleanSku.startsWith('LU') || cleanSku.startsWith('K64') || cleanSku.startsWith('K6M')) {
    return 'LUPO';
  }
  if (cleanSku.startsWith('UM') || cleanSku.startsWith('KUM')) {
    return 'UMBRO';
  }
  if (cleanSku.startsWith('KA') && !cleanSku.startsWith('KAD')) {
    return 'KAGIVA';
  }
  if (cleanSku.startsWith('NB') || cleanSku.startsWith('KNB')) {
    return 'NEW BALANCE';
  }
  if (cleanSku.startsWith('PM') || cleanSku.startsWith('KPM') || cleanSku.startsWith('K5C') || cleanSku.startsWith('K9M') || cleanSku.startsWith('ME')) {
    return 'PUMA';
  }
  if (cleanSku.startsWith('OL')) {
    return 'OLYMPIKUS';
  }
  if (cleanSku.startsWith('AS')) {
    return 'ASICS';
  }
  if (cleanSku.startsWith('MO')) {
    return 'MOLECA';
  }
  if (cleanSku.startsWith('VI') || cleanSku.startsWith('VZ')) {
    return 'VIZZANO';
  }
  if (cleanSku.startsWith('AZ')) {
    return 'AZALEIA';
  }
  if (cleanSku.startsWith('TO')) {
    return 'TOPPER';
  }
  if (cleanSku.startsWith('KO')) {
    return 'KORTEX';
  }
  if (cleanSku.startsWith('BE')) {
    return 'BEIRA RIO';
  }
  if (cleanSku.startsWith('MR')) {
    return 'MORMAII';
  }
  if (cleanSku.startsWith('AC')) {
    return 'ACTVITA';
  }
  if (cleanSku.startsWith('BO')) {
    return 'BOTTES';
  }
  if (cleanSku.startsWith('CO')) {
    return 'CONFORT';
  }
  if (cleanSku.startsWith('NA') || cleanSku.startsWith('KNA')) {
    return 'NAUTICA';
  }
  if (cleanSku.startsWith('13')) {
    return 'SPEEDO';
  }
  if (cleanSku.startsWith('20')) {
    return 'MORMAII';
  }
  if (cleanSku.startsWith('21')) {
    return 'TECHNOS';
  }
  if (cleanSku.startsWith('32')) {
    return 'MONDAINE';
  }
  if (cleanSku.startsWith('40')) {
    return 'LOBA';
  }
  if (cleanSku.startsWith('44')) {
    return 'SECULUS';
  }
  if (cleanSku.startsWith('54') || cleanSku.startsWith('55') || cleanSku.startsWith('56')) {
    return 'MOLECA';
  }
  if (cleanSku.startsWith('71')) {
    return 'MODARE';
  }
  if (cleanSku.startsWith('78')) {
    return 'ZORBA';
  }
  if (cleanSku.startsWith('83') || cleanSku.startsWith('99')) {
    return 'MONDAINE';
  }
  if (cleanSku.startsWith('SU')) {
    return 'SPEEDO';
  }
  if (cleanSku.startsWith('CU')) {
    return 'SANDRINI';
  }
  if (cleanSku.startsWith('CP')) {
    return 'CHAMPION';
  }
  if (cleanSku.startsWith('RO')) {
    return 'ORIENT';
  }
  if (cleanSku.startsWith('MB')) {
    return 'ORIENT';
  }
  if (cleanSku.startsWith('CN')) {
    return 'CHAMPION';
  }
  if (cleanSku.startsWith('RT')) {
    return 'TECHNOS';
  }
  if (cleanSku.startsWith('JP')) {
    return 'JOTA PE';
  }
  if (cleanSku.startsWith('SK')) {
    return 'SKECHERS';
  }
  if (cleanSku.startsWith('KMS')) {
    return 'MASH';
  }
  if (cleanSku.startsWith('KRB')) {
    return 'REEBOK';
  }
  if (cleanSku.startsWith('KZB')) {
    return 'ZORBA';
  }
  if (cleanSku.startsWith('SP')) {
    return 'SPEEDO';
  }
  if (cleanSku.startsWith('PN') || cleanSku.startsWith('DT')) {
    return 'PENALTY';
  }
  if (cleanSku.startsWith('DM')) {
    return 'DEMOCRATA';
  }
  if (cleanSku.startsWith('MD')) {
    return 'MODARE';
  }
  if (cleanSku.startsWith('PE')) {
    return 'PEGADA';
  }
  if (cleanSku.startsWith('SI')) {
    return 'SIGVARIS';
  }
  if (cleanSku.startsWith('FE')) {
    return 'FERRACINI';
  }
  if (cleanSku.startsWith('KL')) {
    return 'KLIN';
  }
  if (cleanSku.startsWith('KCV')) {
    return 'CAVALERA';
  }
  if (cleanSku.startsWith('BT')) {
    return 'BULL TERRIER';
  }
  if (cleanSku.startsWith('TM') || cleanSku.startsWith('TMW')) {
    return 'TOMMY HILFIGER';
  }
  if (cleanSku.startsWith('AM')) {
    return 'ARAMIS';
  }
  if (cleanSku.startsWith('KRP')) {
    return 'ROSA PURPURA';
  }
  if (cleanSku.startsWith('CL')) {
    return 'CHANTAL';
  }
  if (cleanSku.startsWith('KRS')) {
    return 'ROSSI';
  }
  if (cleanSku.startsWith('VN')) {
    return 'VENOSAN';
  }
  if (cleanSku.startsWith('UA')) {
    return 'UNDER ARMOUR';
  }
  if (cleanSku.startsWith('BB')) {
    return 'BIBI';
  }
  if (cleanSku.startsWith('EV')) {
    return 'EVERLAST';
  }
  if (cleanSku.startsWith('RI')) {
    return 'RIDER';
  }

  if (cleanDesc.includes('SANDRINI') || cleanSku.includes('SANDRINI')) return 'SANDRINI';
  if (cleanDesc.includes('FILA') || cleanSku.includes('FILA')) return 'FILA';
  if (cleanDesc.includes('ADIDAS') || cleanSku.includes('ADIDAS')) return 'ADIDAS';
  if (cleanDesc.includes('LUPO') || cleanSku.includes('LUPO')) return 'LUPO';
  if (cleanDesc.includes('UMBRO') || cleanSku.includes('UMBRO')) return 'UMBRO';
  if (cleanDesc.includes('KAGIVA') || cleanSku.includes('KAGIVA')) return 'KAGIVA';
  if (cleanDesc.includes('NEW BALANCE') || cleanDesc.includes('NEWBALANCE')) return 'NEW BALANCE';
  if (cleanDesc.includes('PUMA') || cleanSku.includes('PUMA')) return 'PUMA';
  if (cleanDesc.includes('OLYMPIKUS') || cleanSku.includes('OLYMPIKUS')) return 'OLYMPIKUS';
  if (cleanDesc.includes('ASICS') || cleanSku.includes('ASICS')) return 'ASICS';
  if (cleanDesc.includes('MOLECA') || cleanSku.includes('MOLECA')) return 'MOLECA';
  if (cleanDesc.includes('VIZZANO') || cleanSku.includes('VIZZANO')) return 'VIZZANO';
  if (cleanDesc.includes('AZALEIA') || cleanSku.includes('AZALEIA')) return 'AZALEIA';
  if (cleanDesc.includes('TOPPER') || cleanSku.includes('TOPPER')) return 'TOPPER';
  if (cleanDesc.includes('KORTEX') || cleanSku.includes('KORTEX')) return 'KORTEX';
  if (cleanDesc.includes('BEIRA RIO') || cleanDesc.includes('BEIRARIO')) return 'BEIRA RIO';
  if (cleanDesc.includes('MORMAII') || cleanSku.includes('MORMAII')) return 'MORMAII';
  if (cleanDesc.includes('ACTVITA') || cleanSku.includes('ACTVITA')) return 'ACTVITA';
  if (cleanDesc.includes('NAUTICA') || cleanSku.includes('NAUTICA')) return 'NAUTICA';
  if (cleanDesc.includes('REEBOK') || cleanSku.includes('REEBOK')) return 'REEBOK';
  if (cleanDesc.includes('ZORBA') || cleanSku.includes('ZORBA')) return 'ZORBA';
  if (cleanDesc.includes('SPEEDO') || cleanSku.includes('SPEEDO')) return 'SPEEDO';
  if (cleanDesc.includes('PENALTY') || cleanSku.includes('PENALTY')) return 'PENALTY';
  if (cleanDesc.includes('DEMOCRATA') || cleanSku.includes('DEMOCRATA')) return 'DEMOCRATA';
  if (cleanDesc.includes('MODARE') || cleanSku.includes('MODARE')) return 'MODARE';
  if (cleanDesc.includes('PEGADA') || cleanSku.includes('PEGADA')) return 'PEGADA';
  if (cleanDesc.includes('SIGVARIS') || cleanSku.includes('SIGVARIS')) return 'SIGVARIS';
  if (cleanDesc.includes('FERRACINI') || cleanSku.includes('FERRACINI')) return 'FERRACINI';
  if (cleanDesc.includes('KLIN') || cleanSku.includes('KLIN')) return 'KLIN';
  if (cleanDesc.includes('CAVALERA') || cleanSku.includes('CAVALERA')) return 'CAVALERA';
  if (cleanDesc.includes('BULL TERRIER') || cleanDesc.includes('BULLTERRIER')) return 'BULL TERRIER';
  if (cleanDesc.includes('TOMMY') || cleanSku.includes('TOMMY')) return 'TOMMY HILFIGER';
  if (cleanDesc.includes('ARAMIS') || cleanSku.includes('ARAMIS')) return 'ARAMIS';
  if (cleanDesc.includes('WILSON') || cleanSku.includes('WILSON')) return 'WILSON';
  if (cleanDesc.includes('ROSA PURPURA') || cleanDesc.includes('ROSA PÚRPURA') || cleanSku.includes('KRP')) return 'ROSA PURPURA';
  if (cleanDesc.includes('CHANTAL') || cleanDesc.includes('BARUK') || cleanSku.includes('CL')) return 'CHANTAL';
  if (cleanDesc.includes('ROSSI') || cleanSku.includes('KRS')) return 'ROSSI';
  if (cleanDesc.includes('VENOSAN') || cleanSku.includes('VN')) return 'VENOSAN';
  if (cleanDesc.includes('UNDER ARMOUR') || cleanSku.includes('UA')) return 'UNDER ARMOUR';
  if (cleanDesc.includes('BIBI') || cleanSku.includes('BB')) return 'BIBI';
  if (cleanDesc.includes('EVERLAST') || cleanSku.includes('EV')) return 'EVERLAST';
  if (cleanDesc.includes('RIDER') || cleanSku.includes('RI')) return 'RIDER';

  return 'Sem Marca';
}

async function upsertEmLotes(tabela, dados, onConflict, tamanhoLote = 500) {
  for (let i = 0; i < dados.length; i += tamanhoLote) {
    const lote = dados.slice(i, i + tamanhoLote);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict });
    if (error) {
      console.error(`Erro no lote ${i / tamanhoLote + 1} de ${tabela}:`, error.message);
      throw error;
    }
    console.log(`- ${tabela}: lote ${i / tamanhoLote + 1} (${lote.length} registros) enviado.`);
  }
}

async function run() {
  const args = process.argv;
  const isWrite = args.includes('--write');
  const localIndex = args.indexOf('--local');
  const localEstoque = (localIndex !== -1 && args[localIndex + 1]) ? args[localIndex + 1] : 'MELI SP';
  
  // N dias a sincronizar
  const daysIndex = args.indexOf('--days');
  const days = (daysIndex !== -1 && args[daysIndex + 1]) ? Number(args[daysIndex + 1]) : 3;

  let credentialsFile = 'meli_sp_credentials.json';
  if (localEstoque.toUpperCase().includes('MG')) {
    credentialsFile = 'meli_mg_credentials.json';
  }
  const credentialsPath = path.join(__dirname, credentialsFile);

  console.log('====================================================');
  console.log(`     SINCRONIZADOR DE VENDAS MELI -> DEDO DURO      `);
  console.log(`     Modo: ${isWrite ? '🔥 GRAVAÇÃO EM SUPABASE' : '🔍 APENAS SIMULAÇÃO (DRY RUN)'}`);
  console.log(`     Origem das Vendas: "${localEstoque}"`);
  console.log(`     Dias a sincronizar: últimos ${days} dias`);
  console.log(`     Arquivo de Credenciais: "${credentialsFile}"`);
  console.log('====================================================\n');

  try {
    const token = await obterTokenValido(credentialsPath);
    const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const userId = creds.user_id;

    // Calcular data limite
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    console.log(`📅 Limite de data da busca: ${dateThreshold.toISOString()}`);

    let allOrders = [];
    let offset = 0;
    const limit = 50;
    let keepFetching = true;

    console.log(`📡 Buscando pedidos recentes via API...`);

    while (keepFetching) {
      const res = await axios.get(`https://api.mercadolibre.com/orders/search`, {
        params: {
          seller: userId,
          limit,
          offset,
          sort: 'date_desc',
          'order.date_created.from': dateThreshold.toISOString()
        },
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const orders = res.data.results || [];
      if (orders.length === 0) {
        keepFetching = false;
        break;
      }

      console.log(`- Carregando lote offset ${offset}... (${orders.length} pedidos encontrados)`);

      for (const order of orders) {
        const dateCreated = new Date(order.date_created);
        
        // Se encontramos um pedido mais antigo que a data limite, paramos a busca!
        if (dateCreated < dateThreshold) {
          keepFetching = false;
          break;
        }

        allOrders.push(order);
      }

      if (orders.length < limit) {
        keepFetching = false;
      } else {
        offset += limit;
      }
    }

    console.log(`\n✅ Total de pedidos na data solicitada: ${allOrders.length}`);

    // Filtrar apenas pedidos PAGOS e extrair itens
    const rawSales = [];
    let ignoredCount = 0;

    for (const order of allOrders) {
      if (order.status !== 'paid') {
        ignoredCount++;
        continue;
      }

      // Obter data no formato YYYY-MM-DD da criação local
      const dataSQL = order.date_created.split('T')[0];

      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          let sku = item.item.seller_sku || item.item.seller_custom_field || null;
          
          // Mapear SKU do vendedor antigo
          if (sku === 'SA0A6230063ABBYCN390409') {
            sku = 'SA0A6230063ABBYCN390408';
          }

          if (sku) {
            const cleanSku = String(sku).trim().toUpperCase();
            const desc = item.item.title;
            const qtd = Number(item.quantity) || 0;
            const brand = obterMarcaPorSkuEDesc(cleanSku, desc);

            rawSales.push({
              data_venda: dataSQL,
              local_venda: localEstoque.toUpperCase().trim(),
              sku_produto: cleanSku,
              descricao_produto: desc,
              marca: brand,
              quantidade_vendida: qtd
            });
          }
        });
      }
    }

    console.log(`📊 Pedidos não pagos/cancelados ignorados: ${ignoredCount}`);
    console.log(`📦 Itens vendidos processados: ${rawSales.length}`);

    if (rawSales.length === 0) {
      console.log('Nenhuma venda válida encontrada no período.');
      return;
    }

    // Consolidar vendas por (data, local, SKU)
    const consolidado = {};
    for (const sale of rawSales) {
      const key = `${sale.data_venda}|${sale.local_venda}|${sale.sku_produto}`;
      if (consolidado[key]) {
        consolidado[key].quantidade_vendida += sale.quantidade_vendida;
      } else {
        consolidado[key] = { ...sale };
      }
    }

    const uniqueSales = Object.values(consolidado);
    console.log(`📉 Vendas consolidadas para inserção: ${uniqueSales.length} registros.`);

    if (isWrite) {
      const datasNoPeriodo = [...new Set(uniqueSales.map(s => s.data_venda))];
      console.log(`🧹 Limpando histórico em Supabase para ${localEstoque} nas datas: ${datasNoPeriodo.join(', ')}...`);
      
      for (const data of datasNoPeriodo) {
        const { error: delErr } = await supabase
          .from('silver_vendas')
          .delete()
          .eq('data_venda', data)
          .eq('local_venda', localEstoque.toUpperCase().trim());

        if (delErr) {
          console.error(`Erro ao limpar vendas de ${data}:`, delErr.message);
          throw delErr;
        }
      }

      console.log(`📤 Enviando novas vendas para o Supabase...`);
      await upsertEmLotes('silver_vendas', uniqueSales, 'data_venda, local_venda, sku_produto');
      console.log(`\n🎉 Sincronização de vendas de ${localEstoque} CONCLUÍDA com sucesso!`);
    } else {
      console.log('\n🔍 --- SIMULAÇÃO (DRY RUN) ---');
      console.log('As seguintes vendas seriam gravadas no Supabase:');
      console.table(uniqueSales.slice(0, 20));
      if (uniqueSales.length > 20) {
        console.log(`... e mais ${uniqueSales.length - 20} registros.`);
      }
    }

  } catch (error) {
    console.error('❌ Ocorreu um erro fatal durante a sincronização:', error.message);
  }
}

run();
