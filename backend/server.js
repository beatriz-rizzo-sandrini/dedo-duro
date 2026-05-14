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
      SELECT DATE_FORMAT(data_venda, '%d/%m/%Y') as data_formatada,
             local_venda, sku_produto, descricao_produto, quantidade_vendida 
      FROM silver_vendas
      ORDER BY data_venda DESC
    `);
    
    // Convert to Google Sheets API mock format to easily adapt frontend temporarily
    // Later we can fully refactor the frontend, but this minimizes immediate breakage
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            { f: r.data_formatada }, // 0: Data
            { v: r.local_venda },    // 1: Local
            { v: r.sku_produto },    // 2: SKU
            { v: r.descricao_produto }, // 3: Descrição
            { v: r.quantidade_vendida } // 4: Quantidade
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
      SELECT data_atualizacao, sku_produto, descricao_produto, 
             local_estoque, quantidade_disponivel, valor_unitario
      FROM silver_estoque
    `);
    
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            { f: r.data_atualizacao }, // 0: Data
            { v: r.sku_produto },      // 1: SKU
            { v: r.descricao_produto }, // 2: Descricao
            { v: r.local_estoque },    // 3: Local
            null,                      // 4: vazio
            { v: Number(r.quantidade_disponivel) }, // 5: Qtd
            { v: Number(r.valor_unitario) }         // 6: Valor
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
      SELECT sku_produto, descricao_produto, local_destino, quantidade_enviada,
             status_envio, previsao_chegada, numero_nota_fiscal
      FROM silver_reposicao
    `);
    
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            { v: r.sku_produto },        // 0: SKU
            { v: r.descricao_produto },  // 1: Descricao
            { v: r.local_destino },      // 2: Local
            null,                        // 3: Vazio
            { v: Number(r.quantidade_enviada) }, // 4: Qtd
            { v: r.status_envio },       // 5: Status
            { f: r.previsao_chegada },   // 6: Previsão
            { f: r.numero_nota_fiscal }  // 7: NF
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
      SELECT sku_produto, local_badstock FROM silver_badstock
    `);
    
    const fakeGoogleFormat = {
      table: {
        rows: rows.map(r => ({
          c: [
            null,                        // 0
            { v: r.sku_produto },        // 1: SKU
            { v: r.local_badstock }      // 2: Local
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
