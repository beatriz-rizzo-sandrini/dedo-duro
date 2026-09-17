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

async function testFetchEstoque(targetDate = null) {
  let possibleDbValues = null;
  let targetNormalizedDate = "";

  if (targetDate) {
    targetNormalizedDate = normalizeDateStr(targetDate);
    possibleDbValues = [];
    const parts = targetNormalizedDate.split('/');
    if (parts.length === 3) {
      possibleDbValues.push(`${parts[0]}/${parts[1]}`);
      possibleDbValues.push(targetNormalizedDate);
      possibleDbValues.push(`${parts[2]}-${parts[1]}-${parts[0]}`);
      possibleDbValues.push(`${parts[0]}/${parts[1]}/${parts[2].slice(2)}`);
      possibleDbValues.push(`${parseInt(parts[0], 10)}/${parseInt(parts[1], 10)}`);
    } else {
      possibleDbValues.push(targetNormalizedDate);
    }
  } else {
    const { data: latestRows, error: dateError } = await supabase
      .from('vw_estoque_consolidado')
      .select('data_atualizacao')
      .order('id', { ascending: false })
      .limit(1);
    
    console.log('latestRows without targetDate:', latestRows);
    if (!dateError && latestRows && latestRows.length > 0) {
      const rawLatest = latestRows[0].data_atualizacao;
      targetNormalizedDate = normalizeDateStr(rawLatest);

      possibleDbValues = [];
      const parts = targetNormalizedDate.split('/');
      if (parts.length === 3) {
        possibleDbValues.push(`${parts[0]}/${parts[1]}`);
        possibleDbValues.push(targetNormalizedDate);
        possibleDbValues.push(`${parts[2]}-${parts[1]}-${parts[0]}`);
        possibleDbValues.push(`${parts[0]}/${parts[1]}/${parts[2].slice(2)}`);
        possibleDbValues.push(`${parseInt(parts[0], 10)}/${parseInt(parts[1], 10)}`);
      } else {
        possibleDbValues.push(targetNormalizedDate);
      }
    }
  }

  console.log('targetNormalizedDate:', targetNormalizedDate);
  console.log('possibleDbValues:', possibleDbValues);

  let query = supabase.from('vw_estoque_consolidado').select('*', { count: 'exact', head: true });
  if (possibleDbValues && possibleDbValues.length > 0) {
    query = query.in('data_atualizacao', possibleDbValues);
  }
  const { count } = await query;
  console.log('Count returned:', count);
}

testFetchEstoque(null);
