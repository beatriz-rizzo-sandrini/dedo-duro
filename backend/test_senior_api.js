const axios = require('axios');

const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
const tenantName = 'gruposandrinicombr';

async function testarConsultaEstoque() {
    try {
        console.log('Autenticando na Senior X Platform (App Key)...');
        
        const loginUrl = 'https://api.senior.com.br/platform/authentication/anonymous/loginWithKey';
        const loginResponse = await axios.post(loginUrl, {
            accessKey: tenant_access_key,
            secret: tenant_secret,
            tenantName: tenantName
        }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'client_id': gateway_client_id }
        });

        const token = JSON.parse(loginResponse.data.jsonToken).access_token;
        console.log('✅ Token gerado com sucesso!\n');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'client_id': gateway_client_id,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Tenant': tenantName
        };

        const endpointsToTest = [
            { method: 'POST', url: `https://platform.senior.com.br/t/${tenantName}/bridge/1.0/rest/erpx_sup/estoque/queries/consultaSaldoFisico`, params: null, body: { depositoId: "", produtos: [] } },
            { method: 'GET', url: `https://platform.senior.com.br/t/${tenantName}/bridge/1.0/rest/erpx_sup/estoque/queries/buscarEstoque`, params: { filtro: '[]', paginacao: '{"pagina":0,"quantidadeRegistrosPagina":10}' }, body: null },
            { method: 'POST', url: `https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/erpx_sup/estoque/queries/consultaSaldoFisico`, params: null, body: { depositoId: "", produtos: [] } },
        ];

        for (const req of endpointsToTest) {
            console.log(`Testando ${req.method} em: ${req.url}`);
            try {
                let response;
                if (req.method === 'GET') {
                    response = await axios.get(req.url, { headers, params: req.params });
                } else {
                    response = await axios.post(req.url, req.body, { headers });
                }
                
                console.log('✅ SUCESSO NESTA URL!');
                console.log(JSON.stringify(response.data, null, 2));
                return; 
            } catch (error) {
                if (error.response) {
                    console.log(`❌ Falhou com status ${error.response.status}`);
                    if(error.response.status !== 404) {
                        console.log(`Detalhes:`, error.response.data);
                    }
                } else {
                    console.log(`❌ Falhou com erro: ${error.message}`);
                }
            }
            console.log('-----------------------------------');
        }

    } catch (error) {
        console.error('❌ Erro na autenticação:', error.message);
    }
}

testarConsultaEstoque();
