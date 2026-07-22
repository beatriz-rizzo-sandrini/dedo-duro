-- ==========================================
-- ESTRUTURA DO BANCO DE DADOS SUPABASE (PostgreSQL)
-- ==========================================

-- 1. CAMADA SILVER (Tabelas de Dados Limpos)

CREATE TABLE IF NOT EXISTS silver_vendas (
    id SERIAL PRIMARY KEY,
    data_venda DATE NOT NULL,
    local_venda VARCHAR(255) NOT NULL,
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    marca VARCHAR(255),
    quantidade_vendida NUMERIC(10, 2) DEFAULT 0,
    CONSTRAINT uk_venda_diaria UNIQUE (data_venda, local_venda, sku_produto)
);

CREATE TABLE IF NOT EXISTS silver_estoque (
    id SERIAL PRIMARY KEY,
    data_atualizacao VARCHAR(50),
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    marca VARCHAR(255),
    local_estoque VARCHAR(255) NOT NULL,
    quantidade_disponivel NUMERIC(10, 2) DEFAULT 0,
    valor_unitario NUMERIC(10, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS silver_reposicao (
    id SERIAL PRIMARY KEY,
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    local_destino VARCHAR(255) NOT NULL,
    quantidade_enviada NUMERIC(10, 2) DEFAULT 0,
    status_envio VARCHAR(100),
    previsao_chegada VARCHAR(100),
    numero_nota_fiscal VARCHAR(100),
    CONSTRAINT uk_reposicao_sku_envio UNIQUE (sku_produto, numero_nota_fiscal, local_destino)
);

CREATE TABLE IF NOT EXISTS silver_badstock (
    id SERIAL PRIMARY KEY,
    sku_produto VARCHAR(255) NOT NULL,
    local_badstock VARCHAR(255) NOT NULL,
    CONSTRAINT uk_badstock UNIQUE (sku_produto, local_badstock)
);

CREATE TABLE IF NOT EXISTS silver_mapeamento_sku (
    id SERIAL PRIMARY KEY,
    sku_plataforma VARCHAR(255) NOT NULL,
    plataforma VARCHAR(255) NOT NULL,
    sku_senior VARCHAR(255) NOT NULL,
    descricao_oficial VARCHAR(255),
    marca_oficial VARCHAR(255),
    CONSTRAINT uk_mapeamento UNIQUE (sku_plataforma, plataforma)
);

-- ==========================================
-- 2. CAMADA GOLD (Views Consolidadas para o Frontend)
-- ==========================================

-- View: vw_estoque_consolidado
CREATE OR REPLACE VIEW vw_estoque_consolidado AS
SELECT e.id,
       e.data_atualizacao, 
       e.sku_produto as sku_plataforma,
       COALESCE(m.sku_senior, e.sku_produto) as sku_produto, 
       COALESCE(m.descricao_oficial, e.descricao_produto) as descricao_produto, 
       e.local_estoque, 
       e.quantidade_disponivel, 
       e.valor_unitario,
       COALESCE(m.marca_oficial, e.marca) as marca,
       e.sku_produto as sku_original_plataforma
FROM silver_estoque e
LEFT JOIN silver_mapeamento_sku m ON e.sku_produto = m.sku_plataforma AND e.local_estoque = m.plataforma;

-- View: vw_vendas_consolidadas
CREATE OR REPLACE VIEW vw_vendas_consolidadas AS
SELECT v.id,
       v.data_venda, 
       v.sku_produto as sku_plataforma,
       COALESCE(m.sku_senior, v.sku_produto) as sku_produto, 
       COALESCE(m.descricao_oficial, v.descricao_produto) as descricao_produto, 
       v.local_venda, 
       v.quantidade_vendida,
       COALESCE(m.marca_oficial, v.marca) as marca,
       v.sku_produto as sku_original_plataforma
FROM silver_vendas v
LEFT JOIN silver_mapeamento_sku m ON v.sku_produto = m.sku_plataforma AND v.local_venda = m.plataforma;
