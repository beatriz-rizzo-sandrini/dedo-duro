const fs = require('fs');
const readline = require('readline');
const path = require('path');

const TRANSCRIPT_PATH = 'C:\\Users\\beatriz.rizzo\\.gemini\\antigravity\\brain\\067fc73d-81bd-4a81-9b1d-d23cb3a8792b\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  console.log('📖 Lendo histórico da conversa em busca de regras de SKU, Cores e Descrição...');
  
  if (!fs.existsSync(TRANSCRIPT_PATH)) {
    console.error('Arquivo transcript.jsonl não encontrado.');
    return;
  }

  const fileStream = fs.createReadStream(TRANSCRIPT_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    try {
      const obj = JSON.parse(line);
      const content = obj.content || '';
      
      // We look for user messages or model responses containing rules
      const hasKeywords = /código/i.test(content) || /cores/i.test(content) || /senior/i.test(content) || /sku/i.test(content) || /regra/i.test(content) || /descri/i.test(content);
      
      if (hasKeywords && (obj.source === 'USER_EXPLICIT' || obj.type === 'PLANNER_RESPONSE')) {
        console.log(`\n[Passo ${obj.step_index}] Origem: ${obj.source} | Tipo: ${obj.type}`);
        // Print clean content, but limit length
        const lines = content.split('\n');
        lines.forEach(l => {
          if (/sku/i.test(l) || /cor/i.test(l) || /senior/i.test(l) || /descri/i.test(l) || /mapea/i.test(l) || /regra/i.test(l) || /código/i.test(l)) {
            console.log(`  > ${l.substring(0, 150)}`);
          }
        });
      }
    } catch (e) {
      // Ignora JSONs malformados
    }
  }
  console.log(`\nFim da leitura. Total de linhas analisadas: ${lineCount}`);
}

run();
