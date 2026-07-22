const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('📡 Buscando registros com data_atualizacao = "14/07" em silver_estoque...');
  try {
    const { count, error } = await supabase
      .from('silver_estoque')
      .select('*', { count: 'exact', head: true })
      .eq('data_atualizacao', '14/07');

    if (error) throw error;

    console.log(`✅ Sucesso! Encontrados ${count} registros para a data "14/07".`);

    // Let's also check other unique dates in the database using a paginated approach
    let allDates = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    console.log('\n📡 Mapeando todas as datas únicas de estoque na tabela...');
    while (hasMore) {
      const { data, error: err } = await supabase
        .from('silver_estoque')
        .select('data_atualizacao')
        .range(offset, offset + limit - 1);

      if (err) throw err;
      if (data.length === 0) {
        hasMore = false;
      } else {
        allDates = allDates.concat(data.map(r => r.data_atualizacao));
        offset += limit;
      }
    }

    const uniqueDates = [...new Set(allDates.filter(Boolean))].sort();
    console.log('Todas as datas únicas encontradas:', uniqueDates);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

run();
