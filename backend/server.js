const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Endpoint Vendas (Retorna formato consumido pelo Vendas.jsx)
app.get('/api/vendas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(v.data_venda, '%d/%m/%Y') as data_formatada,
             v.local_venda, 
             v.sku_produto as sku_plataforma,
             COALESCE(m.sku_senior, v.sku_produto) as sku_produto, 
             COALESCE(m.descricao_oficial, v.descricao_produto) as descricao_produto, 
             v.quantidade_vendida 
      FROM silver_vendas v
      LEFT JOIN silver_mapeamento_sku m ON v.sku_produto = m.sku_plataforma AND v.local_venda = m.plataforma
      ORDER BY v.data_venda DESC
    `);
    
    // Convert to Google Sheets API mock format to easily adapt frontend temporarily
    // Later we can fully refactor the frontend, but this minimizes immediate breakage
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            { f: r.data_formatada }, // 0: Data
            { v: r.local_venda },    // 1: Local
            { v: r.sku_produto },    // 2: SKU (Senior)
            { v: r.descricao_produto }, // 3: Descrição
            { v: Number(r.quantidade_vendida) || 0 }, // 4: Quantidade
            null, // 5: Marca placeholder
            { v: r.sku_plataforma } // 6: SKU da Plataforma (Original)
          ]
        }))
      }
    };
    res.json(fakeGoogleFormat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint Estoque
app.get('/api/estoque', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.data_atualizacao, 
             e.sku_produto as sku_plataforma,
             COALESCE(m.sku_senior, e.sku_produto) as sku_produto, 
             COALESCE(m.descricao_oficial, e.descricao_produto) as descricao_produto, 
             e.local_estoque, 
             e.quantidade_disponivel, 
             e.valor_unitario
      FROM silver_estoque e
      LEFT JOIN silver_mapeamento_sku m ON e.sku_produto = m.sku_plataforma AND e.local_estoque = m.plataforma
    `);
    
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            { f: r.data_atualizacao }, // 0: Data
            { v: r.sku_produto },      // 1: SKU (Senior)
            { v: r.descricao_produto }, // 2: Descricao
            { v: r.local_estoque },    // 3: Local
            null,                      // 4: vazio
            { v: Number(r.quantidade_disponivel) }, // 5: Qtd
            { v: Number(r.valor_unitario) },         // 6: Valor
            { v: r.sku_plataforma } // 7: SKU da Plataforma (Original)
          ]
        }))
      }
    };
    res.json(fakeGoogleFormat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint Caminho (Reposição)
app.get('/api/caminho', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.sku_produto as sku_plataforma,
             COALESCE(m.sku_senior, r.sku_produto) as sku_produto, 
             COALESCE(m.descricao_oficial, r.descricao_produto) as descricao_produto, 
             r.local_destino, 
             r.quantidade_enviada,
             r.status_envio, 
             r.previsao_chegada, 
             r.numero_nota_fiscal
      FROM silver_reposicao r
      LEFT JOIN silver_mapeamento_sku m ON r.sku_produto = m.sku_plataforma AND r.local_destino = m.plataforma
    `);
    
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            { v: r.sku_produto },        // 0: SKU (Senior)
            { v: r.descricao_produto },  // 1: Descricao
            { v: r.local_destino },      // 2: Local
            null,                        // 3: Vazio
            { v: Number(r.quantidade_enviada) }, // 4: Qtd
            { v: r.status_envio },       // 5: Status
            { f: r.previsao_chegada },   // 6: Previsão
            { f: r.numero_nota_fiscal }, // 7: NF
            { v: r.sku_plataforma }      // 8: SKU da Plataforma (Original)
          ]
        }))
      }
    };
    res.json(fakeGoogleFormat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint Badstock
app.get('/api/badstock', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.sku_produto as sku_plataforma,
             COALESCE(m.sku_senior, b.sku_produto) as sku_produto, 
             b.local_badstock 
      FROM silver_badstock b
      LEFT JOIN silver_mapeamento_sku m ON b.sku_produto = m.sku_plataforma AND b.local_badstock = m.plataforma
    `);
    
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            null,                        // 0
            { v: r.sku_produto },        // 1: SKU (Senior)
            { v: r.local_badstock },     // 2: Local
            { v: r.sku_plataforma }      // 3: SKU da Plataforma (Original)
          ]
        }))
      }
    };
    res.json(fakeGoogleFormat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
