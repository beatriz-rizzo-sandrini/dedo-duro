import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { produto } = req.body;
    if (!produto) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Chave da API do Gemini não está configurada no servidor (Vercel Env).' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Você é um especialista em SEO para e-commerce. 
Escreva uma descrição atraente, focada em SEO e conversão para o produto: "${produto}".
Destaque características como conforto, materiais de alta qualidade, leveza e indique para quais situações o produto é ideal (ex: dia a dia, trabalho, eventos casuais, esportes, etc.). 
Não precisa criar um título, apenas escreva o parágrafo da descrição em texto corrido (máximo 2 parágrafos) de forma fluída e profissional.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ descricao: text });
  } catch (error) {
    console.error('Erro ao gerar descrição no Gemini:', error);
    return res.status(500).json({ error: `Erro do Gemini: ${error.message}` });
  }
}
