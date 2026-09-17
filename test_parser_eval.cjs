const fs = require('fs');

// Ler o código de productParser.js e avaliar localmente
let code = fs.readFileSync('./src/utils/productParser.js', 'utf8');

// Remover export statements para rodar no eval
code = code.replace(/export function /g, 'function ');
code = code.replace(/export const /g, 'const ');
code = code.replace(/import .* from .*;/g, '');

const mockSeniorCatalog = require('./src/utils/seniorCatalog.json');

// injetar mock
code = `
  const seniorCatalog = mockSeniorCatalog;
  ${code}
  
  console.log("Result:", parseProductDescription('#N/A', 'KSA12000002350AA0P0396', false, 'Sandrini'));
`;

eval(code);
