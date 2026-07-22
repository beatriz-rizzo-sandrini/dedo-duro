const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('📡 Buscando mapeamentos no Supabase para o anúncio MLB5113808724...');
  try {
    const { data, error } = await supabase
      .from('silver_mapeamento_sku')
      .select('*')
      .or('sku_plataforma.ilike.%5113808724%,sku_plataforma.ilike.%186527109281%');

    if (error) {
      console.error(error);
      return;
    }

    console.log(`Mapeamentos encontrados: ${data.length}`);
    data.forEach(r => {
      console.log(`- Plataforma: ${r.plataforma} | SKU Plataforma: "${r.sku_plataforma}" | SKU Senior: "${r.sku_senior}" | Desc: "${r.descricao_oficial}"`);
    });

  } catch (err) {
    console.error(err);
  }
}

run();
