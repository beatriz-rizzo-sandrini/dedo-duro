-- ===============================================================
-- OTIMIZAÇÃO DEDO DURO: VIEWS E ÍNDICES PARA ALTA PERFORMANCE
-- ===============================================================

-- 1. ÍNDICES (Para buscas instantâneas mesmo com milhões de linhas)
CREATE INDEX IF NOT EXISTS idx_vendas_data ON silver_vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_local ON silver_vendas(local_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_sku ON silver_vendas(sku_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_sku ON silver_estoque(sku_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_local ON silver_estoque(local_estoque);

-- 2. VIEW: Vendas Mapeadas (Aplica o De-Para automaticamente)
CREATE OR REPLACE VIEW v_vendas_mapeadas AS
SELECT 
    v.id,
    v.data_venda,
    v.local_venda,
    v.sku_produto,
    COALESCE(m.descricao_oficial, v.descricao_produto) as descricao_produto,
    COALESCE(m.marca_oficial, v.marca, 'SEM MARCA') as marca,
    v.quantidade_vendida,
    m.sku_senior
FROM silver_vendas v
LEFT JOIN silver_mapeamento_sku m ON (v.sku_produto = m.sku_plataforma AND v.local_venda = m.plataforma);

-- 3. VIEW: Resumo de Share por Marca (Cálculo Pesado no Banco)
-- Esta view facilita a vida do frontend retornando o total por marca
CREATE OR REPLACE VIEW v_resumo_vendas_marca AS
SELECT 
    marca,
    local_venda,
    data_venda,
    SUM(quantidade_vendida) as total_vendido
FROM v_vendas_mapeadas
GROUP BY marca, local_venda, data_venda;

-- 4. VIEW: Estoque Mapeado
CREATE OR REPLACE VIEW v_estoque_mapeado AS
SELECT 
    e.id,
    e.data_atualizacao,
    e.sku_produto,
    COALESCE(m.descricao_oficial, e.descricao_produto) as descricao_produto,
    COALESCE(m.marca_oficial, e.marca, 'SEM MARCA') as marca,
    e.local_estoque,
    e.quantidade_disponivel,
    e.valor_unitario,
    m.sku_senior
FROM silver_estoque e
LEFT JOIN silver_mapeamento_sku m ON (e.sku_produto = m.sku_plataforma AND e.local_estoque = m.plataforma);
