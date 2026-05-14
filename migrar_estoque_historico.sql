-- Passo 1: Remove a constraint antiga (sku+local)
ALTER TABLE silver_estoque DROP CONSTRAINT IF EXISTS silver_estoque_sku_produto_local_estoque_key;

-- Passo 2: Adiciona a nova constraint incluindo a data (sku+local+data = único por dia)
ALTER TABLE silver_estoque ADD CONSTRAINT silver_estoque_sku_local_data_key 
  UNIQUE (sku_produto, local_estoque, data_atualizacao);
