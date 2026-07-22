const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('\n🔍 --- VERIFYING SUPABASE STATE AND VIEWS ---\n');

  // 1. Check if Fila Duality 2 platform SKU is mapped
  console.log('1. Checking mapping for platform SKU F02R00172CGRPTCBRT38:');
  const { data: mapData, error: errMap } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .eq('sku_plataforma', 'F02R00172CGRPTCBRT38')
    .limit(1);

  if (errMap) {
    console.error('  ❌ Mapping query error:', errMap.message);
  } else if (!mapData || mapData.length === 0) {
    console.log('  ❌ Mapping NOT found!');
  } else {
    console.log('  ✅ Mapping found:', mapData[0]);
  }

  // 2. Check if Sandrini product still has FILA brand in views
  console.log('\n2. Checking Sandrini products in vw_estoque_consolidado:');
  const { data: sandriniStock, error: errSandrini } = await supabase
    .from('vw_estoque_consolidado')
    .select('sku_produto, descricao_produto, marca, local_estoque')
    .ilike('descricao_produto', '%sandrini%')
    .limit(10);

  if (errSandrini) {
    console.error('  ❌ Stock view query error:', errSandrini.message);
  } else if (!sandriniStock || sandriniStock.length === 0) {
    console.log('  ⚠️ No Sandrini stock items found.');
  } else {
    let hasMismatchedBrand = false;
    sandriniStock.forEach(item => {
      console.log(`  - SKU: ${item.sku_produto} | Desc: ${item.descricao_produto} | Brand: ${item.marca} | Local: ${item.local_estoque}`);
      if (item.marca === 'FILA') {
        hasMismatchedBrand = true;
      }
    });
    if (hasMismatchedBrand) {
      console.log('  ❌ Some Sandrini products still have FILA brand!');
    } else {
      console.log('  ✅ All Sandrini stock items are correctly branded!');
    }
  }

  // 3. Check Duality 2 in consolidated views
  console.log('\n3. Checking Duality 2 platform SKU in vw_estoque_consolidado:');
  const { data: dualityStock, error: errDuality } = await supabase
    .from('vw_estoque_consolidado')
    .select('sku_produto, descricao_produto, marca, local_estoque, sku_original_plataforma')
    .eq('sku_original_plataforma', 'F02R00172CGRPTCBRT38')
    .limit(5);

  if (errDuality) {
    console.error('  ❌ Duality stock view query error:', errDuality.message);
  } else if (!dualityStock || dualityStock.length === 0) {
    console.log('  ⚠️ No stock records found for platform SKU F02R00172CGRPTCBRT38.');
  } else {
    dualityStock.forEach(item => {
      console.log(`  - Original SKU: ${item.sku_original_plataforma} | Resolved SKU: ${item.sku_produto} | Brand: ${item.marca} | Desc: ${item.descricao_produto}`);
    });
    const correctMapping = dualityStock.every(item => item.sku_produto === 'FL000012871BPAACS380259' && item.marca === 'FILA');
    if (correctMapping) {
      console.log('  ✅ Fila Duality 2 stock is correctly mapped and branded!');
    } else {
      console.log('  ❌ Fila Duality 2 mapping or brand resolution is incorrect in view!');
    }
  }
}

run().catch(console.error);
