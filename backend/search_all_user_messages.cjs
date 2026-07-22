const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\beatriz.rizzo\\.gemini\\antigravity\\brain\\c6ff5216-3b96-4b3a-85d7-f10120745cdf\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  console.log("=== COMPILING ALL USER MESSAGES ===");
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let stepCount = 0;
  for await (const line of rl) {
    stepCount++;
    try {
      const obj = JSON.parse(line);
      if (obj.source === 'USER_EXPLICIT') {
        console.log(`\n[Passo ${stepCount} - Hora: ${obj.timestamp || 'Desconhecida'}]`);
        console.log(obj.content);
      }
    } catch (e) {
      // skip
    }
  }
}

run().catch(console.error);
