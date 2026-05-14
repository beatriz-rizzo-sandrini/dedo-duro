
console.log("Chatbot IA com OpenAI carregado!");

const OPENAI_KEY = "SUA_CHAVE_OPENAI_AQUI"; // <-- coloque sua API key da OpenAI

const chatbotToggle = document.querySelector('.chatbot-toggle');
const chatbotContainer = document.getElementById('chatbot');
const chatbotMessages = document.getElementById('chatbot-messages');
const chatbotSend = document.getElementById('chatbot-send');
const chatbotQuestion = document.getElementById('chatbot-question');

chatbotToggle.addEventListener('click', () => {
  chatbotContainer.style.display = chatbotContainer.style.display === 'flex' ? 'none' : 'flex';
});

chatbotSend.addEventListener('click', async () => {
  const question = chatbotQuestion.value.trim();
  if (!question) return;
  addMessage('Você', question);
  chatbotQuestion.value = '';
  await responderIA(question);
});

function addMessage(sender, text) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Função que coleta os dados atuais da cobertura
function coletarResumoDados() {
  // Pega as linhas exibidas na tabela
  const linhas = document.querySelectorAll('#tabela-cobertura tr');
  let resumo = [];
  linhas.forEach(l => {
    const cols = l.querySelectorAll('td');
    if (cols.length >= 6) {
      resumo.push({
        descricao: cols[0].innerText,
        local: cols[1].innerText,
        vendas: cols[2].innerText,
        estoque: cols[3].innerText,
        media: cols[4].innerText,
        dias: cols[5].innerText
      });
    }
  });
  return resumo.slice(0, 50); // limita para não ficar gigante
}

async function responderIA(pergunta) {
  addMessage('IA', '🔄 Analisando seus dados...');
  
  const dadosResumo = coletarResumoDados();
  const prompt = `Você é um analista de estoque. Aqui está um resumo dos dados atuais de cobertura (primeiros 50 itens):
${JSON.stringify(dadosResumo, null, 2)}
Agora responda de forma clara à seguinte pergunta do usuário: ${pergunta}`;

  try {
    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um assistente especializado em análise de estoque, cobertura e reposição." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      })
    });

    const data = await resposta.json();
    if (data.choices && data.choices.length > 0) {
      const msg = data.choices[0].message.content;
      addMessage("IA", msg);
    } else {
      addMessage("IA", "❌ Não consegui obter uma resposta.");
    }
  } catch (err) {
    console.error(err);
    addMessage("IA", "⚠️ Erro ao conectar com a IA.");
  }
}
