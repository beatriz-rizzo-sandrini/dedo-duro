const fs = require('fs');
const content = fs.readFileSync('src/pages/Estoque.jsx', 'utf8');

const mainKpiIndex = content.indexOf('{/* Main KPIs Section */}');
const brandKpiIndex = content.indexOf('{/* Brand KPIs Section */}');
const brandChartsIndex = content.indexOf('{/* Brand Charts Section */}');

if (mainKpiIndex !== -1 && brandKpiIndex !== -1 && brandChartsIndex !== -1) {
  const beforeMain = content.slice(0, mainKpiIndex);
  const mainKpiSection = content.slice(mainKpiIndex, brandKpiIndex);
  const brandKpiSection = content.slice(brandKpiIndex, brandChartsIndex);
  const afterBrand = content.slice(brandChartsIndex);

  const newContent = beforeMain + brandKpiSection + mainKpiSection + afterBrand;
  fs.writeFileSync('src/pages/Estoque.jsx', newContent);
  console.log('Ordem invertida com sucesso!');
} else {
  console.log('Não foi possível encontrar as seções.');
}
