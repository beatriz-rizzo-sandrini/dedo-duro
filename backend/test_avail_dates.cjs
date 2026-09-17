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

function parseToTimestamp(dStr) {
  if (!dStr) return 0;
  const clean = String(dStr).trim().split(' ')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      return new Date(`2026-${parts[1]}-${parts[0]}`).getTime();
    } else if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return new Date(`${year}-${parts[1]}-${parts[0]}`).getTime();
    }
  }
  const t = Date.parse(clean);
  return isNaN(t) ? 0 : t;
}

async function testFetchAvailableDates() {
  console.log('Testing fetchAvailableStockDates with silver_estoque:');
  const { data, error } = await supabase
    .from('silver_estoque')
    .select('data_atualizacao')
    .order('id', { ascending: false })
    .limit(10000);

  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Total rows fetched:', data.length);
  const rawDates = [...new Set(data.map(r => r.data_atualizacao))];
  console.log('Raw unique dates in sample:', rawDates);
  
  const uniqueNormalized = [...new Set((data || []).map(r => r.data_atualizacao).filter(Boolean).map(normalizeDateStr))];
  uniqueNormalized.sort((a, b) => parseToTimestamp(b) - parseToTimestamp(a));
  console.log('uniqueNormalized sorted:', uniqueNormalized);
}

testFetchAvailableDates();
