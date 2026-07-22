const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { count, error } = await supabase
      .from('silver_mapeamento_sku')
      .select('*', { count: 'exact', head: true })
      .eq('plataforma', 'MELI_FULL_MAP');

    if (error) throw error;
    console.log(`📊 Mapeamentos MELI_FULL_MAP no Supabase: ${count}`);

    const { count: totalCount, error: err2 } = await supabase
      .from('silver_mapeamento_sku')
      .select('*', { count: 'exact', head: true });

    if (err2) throw err2;
    console.log(`📊 Total de mapeamentos (todas as plataformas): ${totalCount}`);

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
