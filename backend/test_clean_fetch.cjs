const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeDateStr(dStr) {
  if (!dStr) return "";
  let clean = String(dStr).trim().split(' ')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/2026`;
    } else if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${year}`;
    }
  }
  return clean;
}

async function testFetch(targetDate = null) {
  console.log('Testing fetch with targetDate =', targetDate);

  // 1. If targetDate is not provided, get the latest date directly from silver_estoque
  let activeDate = targetDate;
  if (!activeDate) {
    const { data: latestRows, error: errLatest } = await supabase
      .from('silver_estoque')
      .select('data_atualizacao')
      .order('id', { ascending: false })
      .limit(1);
    
    if (!errLatest && latestRows && latestRows.length > 0) {
      activeDate = latestRows[0].data_atualizacao;
    }
  }

  console.log('activeDate resolved to:', activeDate);
  const targetNormalizedDate = normalizeDateStr(activeDate);
  console.log('targetNormalizedDate:', targetNormalizedDate);

  // Generate possible database date formats
  const parts = targetNormalizedDate.split('/');
  const possibleDbValues = [];
  if (parts.length === 3) {
    possibleDbValues.push(`${parts[0]}/${parts[1]}`); // "08/09"
    possibleDbValues.push(targetNormalizedDate); // "08/09/2026"
    possibleDbValues.push(`${parts[2]}-${parts[1]}-${parts[0]}`); // "2026-09-08"
    possibleDbValues.push(`${parts[0]}/${parts[1]}/${parts[2].slice(2)}`); // "08/09/26"
    possibleDbValues.push(`${parseInt(parts[0], 10)}/${parseInt(parts[1], 10)}`); // "8/9"
  } else if (activeDate) {
    possibleDbValues.push(activeDate);
  }

  console.log('possibleDbValues:', possibleDbValues);

  // Query vw_estoque_consolidado (or silver_estoque) with in filter
  const { data, error } = await supabase
    .from('vw_estoque_consolidado')
    .select('id, data_atualizacao, sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel, valor_unitario, sku_original_plataforma')
    .in('data_atualizacao', possibleDbValues)
    .limit(5000);

  if (error) {
    console.error('Query error:', error);
    return;
  }

  console.log('Total rows returned:', data.length);
  const locals = new Set();
  data.forEach(r => locals.add(r.local_estoque));
  console.log('Locals returned:', Array.from(locals));
}

testFetch();
testFetch('08/09/2026');
