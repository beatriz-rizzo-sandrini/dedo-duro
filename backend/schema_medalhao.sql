CREATE DATABASE IF NOT EXISTS dedo_duro DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dedo_duro;

-- ==========================================
-- CAMADA BRONZE (Dados Brutos)
-- ==========================================
CREATE TABLE IF NOT EXISTS bronze_vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coluna_data VARCHAR(255),
    coluna_local VARCHAR(255),
    coluna_sku VARCHAR(255),
    coluna_descricao VARCHAR(255),
    coluna_quantidade VARCHAR(255),
    coluna_valor VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS bronze_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coluna_data_atualizacao VARCHAR(255),
    coluna_sku VARCHAR(255),
    coluna_descricao VARCHAR(255),
    coluna_local VARCHAR(255),
    coluna_quantidade VARCHAR(255),
    coluna_valor VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS bronze_caminho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coluna_sku VARCHAR(255),
    coluna_descricao VARCHAR(255),
    coluna_local_destino VARCHAR(255),
    coluna_quantidade VARCHAR(255),
    coluna_status VARCHAR(255),
    coluna_previsao VARCHAR(255),
    coluna_envio_nf VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS bronze_badstock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coluna_sku VARCHAR(255),
    coluna_local VARCHAR(255)
);

-- ==========================================
-- CAMADA SILVER (Dados Limpos e Tipados)
-- ==========================================
CREATE TABLE IF NOT EXISTS silver_vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_venda DATE NOT NULL,
    local_venda VARCHAR(255) NOT NULL,
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    quantidade_vendida DECIMAL(10, 2) DEFAULT 0,
    -- Unique constraint to prevent duplicate sales entries for the same day/local/sku combination
    UNIQUE KEY uk_venda_diaria (data_venda, local_venda, sku_produto)
);

CREATE TABLE IF NOT EXISTS silver_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_atualizacao VARCHAR(50),
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    local_estoque VARCHAR(255) NOT NULL,
    quantidade_disponivel DECIMAL(10, 2) DEFAULT 0,
    valor_unitario DECIMAL(10, 2) DEFAULT 0,
    UNIQUE KEY uk_estoque_local (sku_produto, local_estoque)
);

CREATE TABLE IF NOT EXISTS silver_reposicao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    local_destino VARCHAR(255) NOT NULL,
    quantidade_enviada DECIMAL(10, 2) DEFAULT 0,
    status_envio VARCHAR(100),
    previsao_chegada VARCHAR(100),
    numero_nota_fiscal VARCHAR(100),
    UNIQUE KEY uk_reposicao_sku_envio (sku_produto, numero_nota_fiscal, local_destino)
);

CREATE TABLE IF NOT EXISTS silver_badstock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_produto VARCHAR(255) NOT NULL,
    local_badstock VARCHAR(255) NOT NULL,
    UNIQUE KEY uk_badstock (sku_produto, local_badstock)
);

-- ==========================================
-- CAMADA GOLD (Vistas Prontas para o Dashboard)
-- ==========================================
-- Views can be created later via Node.js migrations or here.
