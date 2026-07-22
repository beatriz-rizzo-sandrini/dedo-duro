const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';

const supabase = createClient(supabaseUrl, supabaseKey);

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const parsed = JSON.parse(jsonStr);
    return parsed.table.rows;
  } catch {
    return [];
  }
}

async function fetchSheet(name) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${name}`;
  const res = await axios.get(url);
  return parseGoogleJSON(res.data);
}

async function inspect() {
  console.log('--- BUSCANDO 75040 OU LUPO NO ESTOQUE (SUPABASE) ---');
  const { data: estoqueData, error: estoqueError } = await supabase
    .from('vw_estoque_consolidado')
    .select('*')
    .or('sku_produto.ilike.%75040%,descricao_produto.ilike.%75040%,sku_produto.ilike.%lupo%,descricao_produto.ilike.%lupo%');

  if (estoqueError) {
    console.error('Erro no estoque:', estoqueError);
  } else {
    console.log(`Encontrados ${estoqueData.length} registros no estoque:`);
    estoqueData.forEach(r => {
      console.log(`  SKU: ${r.sku_produto} | Desc: ${r.descricao_produto} | Local: ${r.local_estoque} | Qtd: ${r.quantidade_disponivel}`);
    });
  }

  console.log('\n--- BUSCANDO 75040 OU LUPO NAS VENDAS (SUPABASE) ---');
  const { data: vendasData, error: vendasError } = await supabase
    .from('vw_vendas_consolidadas')
    .select('*')
    .or('sku_produto.ilike.%75040%,descricao_produto.ilike.%75040%,sku_produto.ilike.%lupo%,descricao_produto.ilike.%lupo%');

  if (vendasError) {
    console.error('Erro nas vendas:', vendasError);
  } else {
    console.log(`Encontrados ${vendasData.length} registros nas vendas:`);
    vendasData.forEach(r => {
      console.log(`  Data: ${r.data_venda} | SKU: ${r.sku_produto} | Desc: ${r.descricao_produto} | Local: ${r.local_venda} | Qtd: ${r.quantidade_vendida}`);
    });
  }

  console.log('\n--- BUSCANDO 75040 OU LUPO NO MAPEAMENTO (SHEET) ---');
  const mapeamentoRows = await fetchSheet('MAPEAMENTO');
  console.log(`Total de linhas no Mapeamento: ${mapeamentoRows.length}`);
  
  let matches = 0;
  mapeamentoRows.forEach((r, idx) => {
    const skuSen = r?.c?.[0]?.v || '';
    const desc = r?.c?.[1]?.v || '';
    const plat = r?.c?.[2]?.v || '';
    const skuPlat = r?.c?.[3]?.v || '';

    const text = `${skuSen} ${desc} ${plat} ${skuPlat}`.toLowerCase();
    if (text.includes('75040') || text.includes('lupo')) {
      matches++;
      console.log(`  Linha ${idx + 2}: SKU Sênior: "${skuSen}" | Desc: "${desc}" | Plat: "${plat}" | SKU Plat: "${skuPlat}"`);
    }
  });
  console.log(`Encontrados ${matches} correspondências no Mapeamento.`);
}

inspect().catch(console.error);
