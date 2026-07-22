const fs = require('fs');
const readline = require('readline');

const TRANSCRIPT_PATH = 'C:\\Users\\beatriz.rizzo\\.gemini\\antigravity\\brain\\067fc73d-81bd-4a81-9b1d-d23cb3a8792b\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  console.log('🔍 Procurando pelas regras de SKU e Cores enviadas pelo usuário...');
  
  if (!fs.existsSync(TRANSCRIPT_PATH)) {
    console.error('Arquivo transcript.jsonl não encontrado.');
    return;
  }

  const fileStream = fs.createReadStream(TRANSCRIPT_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      const content = obj.content || '';
      
      // Let's check for messages that explain how to extract or map based on SKU structure
      const isExplanation = 
        (/tamanho/i.test(content) || /cor/i.test(content) || /descri/i.test(content)) && 
        (/posição/i.test(content) || /posicao/i.test(content) || /caracter/i.test(content) || /dígito/i.test(content) || /digito/i.test(content) || /letra/i.test(content) || /final/i.test(content) || /começo/i.test(content));

      if (isExplanation && obj.source === 'USER_EXPLICIT') {
        console.log(`\n========================================`);
        console.log(`[Passo ${obj.step_index}] Entrada do Usuário:`);
        console.log(content);
        console.log(`========================================`);
      }
    } catch (e) {
      // Ignora JSONs malformados
    }
  }
}

run();
