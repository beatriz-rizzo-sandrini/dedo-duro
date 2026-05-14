export const getLatestDates = (estoqueRows = [], vendasRows = []) => {
  let dataEstoque = "";
  if (estoqueRows.length > 0) {
    // Apenas pega a data da primeira linha, assumindo que o banco retorna ordenado
    // Ou procura a primeira data válida
    dataEstoque = estoqueRows[0]?.c?.[0]?.f || String(estoqueRows[0]?.c?.[0]?.v || "");
  }

  let dataVendas = "";
  if (vendasRows.length > 0) {
    let maxDate = 0;
    let maxDateStr = "";
    vendasRows.forEach(r => {
      const dStr = r?.c?.[0]?.f || String(r?.c?.[0]?.v || "");
      if (dStr && dStr.includes('/')) {
        const [dia, mes, ano] = dStr.split("/");
        if (dia && mes && ano) {
          const t = new Date(`${ano}-${mes}-${dia}`).getTime();
          if (t > maxDate) {
            maxDate = t;
            maxDateStr = dStr;
          }
        }
      }
    });
    dataVendas = maxDateStr;
  }

  return { dataEstoque, dataVendas };
};

// Mantemos essa função apenas para ajudar na comparação caso as strings sejam levemente diferentes
export const normalizeDate = (dStr) => {
  if (!dStr) return "";
  return String(dStr).split(' ')[0].trim(); // Pega apenas a parte da data
};
