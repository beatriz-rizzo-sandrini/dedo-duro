// ============================================================
// CONTRATO DE COLUNAS DAS ABAS DO GOOGLE SHEETS
// ============================================================
// Cada objeto mapeia um NOME LEGÍVEL para o ÍNDICE da coluna
// na aba correspondente do Google Sheets.
//
// Se a planilha mudar a ordem de uma coluna, basta atualizar
// o número aqui — todas as páginas se corrigem automaticamente.
// ============================================================

// Aba: "ESTOQUE"
// c[0]=data  c[1]=sku  c[2]=desc  c[3]=local  c[4]=marca  c[5]=qtd  c[6]=valor
export const COL_ESTOQUE = {
  DATA:   0,
  SKU:    1,
  DESC:   2,
  LOCAL:  3,
  MARCA:  4,
  QTD:    5,
  VALOR:  6,
};

// Aba: "vendas" (Google Sheets) / silver_vendas (Supabase)
// c[0]=data  c[1]=local  c[2]=sku  c[3]=desc  c[4]=qtd  c[5]=marca
export const COL_VENDAS = {
  DATA:   0,
  LOCAL:  1,
  SKU:    2,
  DESC:   3,
  QTD:    4,
  MARCA:  5,
};

// Aba: "CAMINHO" (Reposição)
// c[0]=sku  c[1]=desc  c[2]=local  c[3]=(não usado)  c[4]=qtd  c[5]=status  c[6]=previsao  c[7]=nf
export const COL_CAMINHO = {
  SKU:      0,
  DESC:     1,
  LOCAL:    2,
  // índice 3 não utilizado
  QTD:      4,
  STATUS:   5,
  PREVISAO: 6,
  NF:       7,
};

// Aba: "badstock"
// c[0]=(não usado)  c[1]=sku  c[2]=local
export const COL_BADSTOCK = {
  // índice 0 não utilizado
  SKU:   1,
  LOCAL: 2,
};

// Aba: "MAPEAMENTO" (De-Para SKU)
// c[0]=sku_senior  c[1]=desc  c[2]=plataforma  c[3]=sku_plataforma
export const COL_MAPEAMENTO = {
  SKU_SENIOR:      0,
  DESC:            1,
  PLATAFORMA:      2,
  SKU_PLATAFORMA:  3,
};
