export const normalizeDateStr = (dStr) => {
  if (!dStr) return "";
  let clean = String(dStr).trim().split(' ')[0]; // remove time part
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      // "27/05" -> "27/05/2026"
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/2026`;
    } else if (parts.length === 3) {
      // "27/05/2026" -> "27/05/2026"
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${year}`;
    }
  }
  return clean;
};

export const parseToTimestamp = (dStr) => {
  if (!dStr) return 0;
  const clean = String(dStr).trim().split(' ')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      return new Date(`2026-${parts[1]}-${parts[0]}`).getTime();
    } else if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return new Date(`${year}-${parts[1]}-${parts[0]}`).getTime();
    }
  }
  const t = Date.parse(clean);
  return isNaN(t) ? 0 : t;
};

export const getLatestDates = (estoqueRows = [], vendasRows = []) => {
  let dataEstoque = "";
  if (estoqueRows.length > 0) {
    // Count occurrences of normalized dates
    const dateCounts = {};
    estoqueRows.forEach(r => {
      const dStr = r?.c?.[0]?.f || String(r?.c?.[0]?.v || "");
      if (dStr) {
        const norm = normalizeDateStr(dStr);
        dateCounts[norm] = (dateCounts[norm] || 0) + 1;
      }
    });

    // Find the latest chronological date that has at least 200 rows (complete sync)
    let maxTimestamp = 0;
    let latestCompleteDate = "";
    
    // As a fallback, if no date has >= 200 rows, we take the one with the maximum count
    let maxCount = 0;
    let fallbackDate = "";

    Object.entries(dateCounts).forEach(([normDate, count]) => {
      if (count > maxCount) {
        maxCount = count;
        fallbackDate = normDate;
      }
      
      if (count >= 200) {
        const ts = parseToTimestamp(normDate);
        if (ts > maxTimestamp) {
          maxTimestamp = ts;
          latestCompleteDate = normDate;
        }
      }
    });

    dataEstoque = latestCompleteDate || fallbackDate;
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
