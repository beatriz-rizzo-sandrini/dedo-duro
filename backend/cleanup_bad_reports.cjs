const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vckcnhwqucnsajpdkkfl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.log("ERRO: VITE_SUPABASE_ANON_KEY não encontrada.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Deletando relatórios com 'Período Desconhecido'...");
  const { data, error } = await supabase
    .from('tiktok_reports')
    .delete()
    .eq('period', 'Período Desconhecido');
    
  if (error) {
    console.error("Erro ao deletar:", error);
  } else {
    console.log("Relatórios corrompidos deletados com sucesso!");
  }
}

run();
