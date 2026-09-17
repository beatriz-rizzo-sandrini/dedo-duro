const fs = require('fs');

let code = fs.readFileSync('./src/utils/productParser.js', 'utf8');

code = code.replace(/export function /g, 'function ');
code = code.replace(/export const /g, 'const ');
code = code.replace(/import .* from .*;/g, '');

const mockSeniorCatalog = require('./src/utils/seniorCatalog.json');

code = code.replace(/let baseTitle = cleanDesc;/g, 'let baseTitle = cleanDesc; console.log("1 baseTitle:", baseTitle);');
code = code.replace(/baseTitle = cleanedWords\.join\(' '\);/g, 'baseTitle = cleanedWords.join(" "); console.log("2 baseTitle:", baseTitle);');
code = code.replace(/return {/g, 'console.log("3 baseTitle before return:", baseTitle); return {');

code = `
  const seniorCatalog = mockSeniorCatalog;
  ${code}
  
  parseProductDescription('#N/A', 'KSA12000002350AA0P0396', false, 'Sandrini');
`;

eval(code);
