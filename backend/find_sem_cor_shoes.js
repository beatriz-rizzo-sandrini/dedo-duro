const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Copiado de productParser.js
function parseProductDescription(desc, sku = '') {
  if (!desc) {
    return { baseTitle: sku || 'Produto Sem Descrição', color: 'Sem Cor', size: 'U' };
  }

  let baseTitle = desc.trim();
  let size = '';
  let color = '';

  const sizeRegex = /\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|CORL)\s*([GPM]|GG|XG|\d+(?:\/\d+)?)/i;
  const sizeMatch = baseTitle.match(sizeRegex);
  if (sizeMatch) {
    size = sizeMatch[1].toUpperCase();
    baseTitle = baseTitle.replace(sizeRegex, '').trim();
  } else {
    const endSizeRegex = /\b(\d{2}|[GPM]|GG|XG)$/i;
    const endSizeMatch = baseTitle.match(endSizeRegex);
    if (endSizeMatch) {
      size = endSizeMatch[1].toUpperCase();
      baseTitle = baseTitle.replace(endSizeRegex, '').trim();
    }
  }

  const colorSlashRegex = /\b([A-Z]{3,}(?:\/[A-Z0-9]{2,})+|[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+\/[A-ZÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛa-zãõáéíóúàèìòùâêîôû]+)\b/;
  const slashMatch = baseTitle.match(colorSlashRegex);
  if (slashMatch) {
    color = slashMatch[1].trim();
    baseTitle = baseTitle.replace(colorSlashRegex, '').trim();
  } else {
    const commonColors = [
      'PRETO', 'BRANCO', 'CINZA', 'MARINHO', 'NUDE', 'AREIA', 'GELO', 'GRAFITE', 'AZUL', 
      'VERMELHO', 'VERDE', 'ROSA', 'CORAL', 'CARAMELO', 'CAQUI', 'KHAKI', 'OFF BRANCO', 
      'OFF-BRANCO', 'OFF WHITE', 'OFF-WHITE'
    ];
    for (const c of commonColors) {
      const colorWordRegex = new RegExp(`\\b${c}\\b`, 'i');
      if (colorWordRegex.test(baseTitle)) {
        color = c;
        baseTitle = baseTitle.replace(colorWordRegex, '').trim();
        break;
      }
    }
  }

  let normalizedColor = 'SEM COR';
  if (color) {
    const colorMap = {
      'PTO': 'PRETO',
      'BCO': 'BRANCO',
      'MAR': 'MARINHO',
      'AZL': 'AZUL',
      'RSE': 'ROSA',
      'VM': 'VERMELHO',
      'VD': 'VERDE',
      'CZA': 'CINZA',
      'CNZA': 'CINZA',
      'GEL': 'GELO',
      'CAR': 'CARAMELO',
      'LRJA': 'LARANJA'
    };
    const parts = color.toUpperCase().split('/');
    const normalizedParts = parts.map(p => colorMap[p] || p);
    normalizedColor = normalizedParts.join('/');
  }

  return {
    baseTitle,
    color: normalizedColor,
    size: size ? size.toUpperCase() : 'U'
  };
}

// Executa queries Supabase em chunks/batches de no máximo 100 itens para não dar Headers Overflow
async function queryInBatches(table, selectStr, filterCol, values, chunkSize = 100) {
  let allResults = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from(table)
      .select(selectStr)
      .in(filterCol, chunk);
    
    if (error) {
      throw error;
    }
    if (data) {
      allResults = allResults.concat(data);
    }
  }
  return allResults;
}

async function run() {
  console.log('📡 Analisando vendas recentes no Supabase de forma otimizada com batching...');
  
  // 1. Buscar vendas recentes
  const { data: sales, error } = await supabase
    .from('vw_vendas_consolidadas')
    .select('sku_produto, descricao_produto, local_venda')
    .gte('data_venda', '2026-03-29')
    .limit(1000);

  if (error) {
    console.error('Erro ao buscar vendas:', error);
    return;
  }

  console.log(`Recebido ${sales.length} vendas.`);
  const uniqueSkus = [...new Set(sales.map(s => s.sku_produto))];
  console.log(`Total de SKUs únicos nas vendas: ${uniqueSkus.length}`);

  // 2. Buscar descrições no estoque para todos os SKUs únicos em lote
  console.log('📡 Buscando estoque em lote (com batching)...');
  let estoque;
  try {
    estoque = await queryInBatches('vw_estoque_consolidado', 'sku_produto, descricao_produto', 'sku_produto', uniqueSkus, 80);
  } catch (estErr) {
    console.error('Erro ao buscar estoque:', estErr);
    return;
  }

  const skuToEstoqueDesc = {};
  estoque.forEach(e => {
    skuToEstoqueDesc[e.sku_produto] = e.descricao_produto;
  });

  // 3. Buscar mapeamentos em lote
  console.log('📡 Buscando mapeamentos em lote (com batching)...');
  let mapeamentos;
  try {
    mapeamentos = await queryInBatches('silver_mapeamento_sku', 'sku_plataforma, sku_senior, descricao_oficial', 'sku_plataforma', uniqueSkus, 80);
  } catch (mapErr) {
    console.error('Erro ao buscar mapeamento:', mapErr);
    return;
  }

  const skuToMapeamento = {};
  mapeamentos.forEach(m => {
    skuToMapeamento[m.sku_plataforma] = m;
  });

  // 4. Processar
  const semCorProducts = {};

  for (const s of sales) {
    const descEstoque = skuToEstoqueDesc[s.sku_produto] || null;
    const descFinal = descEstoque || s.descricao_produto;

    const parsed = parseProductDescription(descFinal, s.sku_produto);
    
    if (parsed.color === 'SEM COR') {
      const isShoe = /tenis|sapatenis|bota|sapato/i.test(descFinal);
      const isMapeado = !!skuToMapeamento[s.sku_produto];

      const key = `${s.sku_produto}|${descFinal}`;
      if (!semCorProducts[key]) {
        semCorProducts[key] = {
          sku: s.sku_produto,
          desc: descFinal,
          isShoe,
          isMapeado,
          mapeamento: skuToMapeamento[s.sku_produto] || null,
          localVenda: s.local_venda
        };
      }
    }
  }

  const items = Object.values(semCorProducts);
  console.log(`\nEncontrado ${items.length} combinações SKU+Descrição sem cor.`);
  
  console.log('\n--- CALÇADOS SEM COR ---');
  const shoes = items.filter(i => i.isShoe);
  for (const s of shoes) {
    console.log(`- SKU: ${s.sku} | Mapeado no Banco: ${s.isMapeado ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`  Descrição Utilizada: "${s.desc}"`);
    if (s.isMapeado) {
      console.log(`  🗺️ Mapeamento Encontrado: Sênior SKU: "${s.mapeamento.sku_senior}" | Oficial Desc: "${s.mapeamento.descricao_oficial}"`);
    }
  }

  console.log('\n--- OUTROS PRODUTOS SEM COR (top 15) ---');
  const others = items.filter(i => !i.isShoe).slice(0, 15);
  for (const o of others) {
    console.log(`- SKU: ${o.sku} | Mapeado no Banco: ${o.isMapeado ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`  Descrição Utilizada: "${o.desc}"`);
    if (o.isMapeado) {
      console.log(`  🗺️ Mapeamento Encontrado: Sênior SKU: "${o.mapeamento.sku_senior}" | Oficial Desc: "${o.mapeamento.descricao_oficial}"`);
    }
  }
}

run().catch(console.error);
