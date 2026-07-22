const fs = require('fs');
const path = require('path');

const brainPath = 'C:\\Users\\beatriz.rizzo\\.gemini\\antigravity\\brain';

async function run() {
  console.log("Listing directories in brain:");
  try {
    const files = fs.readdirSync(brainPath);
    files.forEach(f => {
      const p = path.join(brainPath, f);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        console.log(`- Diretório: ${f} (Criado/Modificado: ${stat.mtime})`);
      } else {
        console.log(`- Arquivo: ${f}`);
      }
    });
  } catch (e) {
    console.error(e.message);
  }
}

run();
