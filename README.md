# Sistema de Gestão de Estoque - Dedo Duro

Este é um sistema fullstack desenvolvido para consolidar, analisar e sincronizar dados de vendas, estoque e reposição de múltiplos canais (como planilhas do Google Sheets e a API do ERP Senior X) utilizando uma arquitetura baseada em bancos PostgreSQL (Supabase) e MySQL local.

## Estrutura do Projeto

O projeto é dividido em duas partes principais no mesmo repositório:

* **Frontend**: Aplicação SPA construída com **React 19** e **Vite** para exibição do painel (dashboard), relatórios e KPIs de estoque.
* **Backend**: Servidor API em **Express** e robôs de sincronização que rodam em segundo plano (via `node-cron`) para atualizar as tabelas do banco de dados.

---

## Tecnologias Utilizadas

### Frontend
* React 19
* Vite (HMR)
* Chart.js & React-select (visualização e filtros de dados)
* Framer Motion (animações de interface)

### Backend & Banco de Dados
* Node.js
* Express (API REST)
* Supabase SDK (Banco de dados PostgreSQL na nuvem)
* MySQL2 (Banco de dados local)
* Axios (Integrações com APIs)
* Node-cron (Agendador de tarefas)

---

## Como Configurar e Rodar o Projeto

### Pré-requisitos
* Node.js instalado (versão 18 ou superior recomendada)
* Um servidor MySQL ativo localmente (porta 3306) se desejar usar a sincronização local.

### 1. Instalação de Dependências

Instale as dependências da interface na raiz do projeto:
```bash
npm install
```

Navegue até a pasta do backend e instale as dependências correspondentes:
```bash
cd backend
npm install
```

### 2. Variáveis de Ambiente

Crie um arquivo `.env` dentro da pasta `backend` com as configurações do banco de dados MySQL local e outras chaves necessárias:
```env
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=dedo_duro
PORT=3001
```

### 3. Rodando o Frontend
Na raiz do projeto, execute o servidor de desenvolvimento do Vite:
```bash
npm run dev
```
O frontend estará acessível em `http://localhost:5173`.

### 4. Rodando o Servidor API (Backend)
Na pasta do backend, inicie o servidor:
```bash
node server.js
```
A API estará acessível em `http://localhost:3001`.

---

## Scripts de Sincronização e Utilitários

Na pasta `backend`, você pode rodar manualmente os seguintes scripts de manutenção:

* **Sincronizador Supabase**: Sincroniza os dados brutos do Google Sheets com o banco de dados Supabase na nuvem (rodam de hora em hora por padrão).
  ```bash
  node sincronizador_supabase.js
  ```
  *(Use a flag `--once` para rodar apenas uma vez sem iniciar o agendador).*

* **Sincronizar Supabase para MySQL**: Copia as tabelas atualizadas do Supabase para o banco de dados MySQL local.
  ```bash
  node sincronizar_supabase_para_mysql.js
  ```

* **Sincronizador Senior**: Atualiza o catálogo e os códigos EAN locais a partir da API da Senior X.
  ```bash
  node sincronizar_senior.js
  ```

* **Backup Total (JSON)**: Exporta todas as tabelas e dados brutos do Supabase em um único arquivo JSON.
  ```bash
  node backup_total_supabase.js
  ```

* **Backup SQL**: Gera um arquivo de dump em SQL com os comandos estruturais e inserções dos dados atuais das tabelas.
  ```bash
  node backup_sql_supabase.js
  ```
