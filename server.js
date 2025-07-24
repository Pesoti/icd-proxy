import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Credenciais da OMS (via variáveis de ambiente)
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let tokenCache = null;
let tokenExpiry = null;

// Função para obter e renovar o token automaticamente
async function getToken() {
  if (tokenCache && Date.now() < tokenExpiry) {
    return tokenCache;
  }

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', 'icdapi_access');
  params.append('grant_type', 'client_credentials');

  const res = await fetch('https://icdaccessmanagement.who.int/connect/token', {
    method: 'POST',
    body: params,
  });

  const data = await res.json();
  tokenCache = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 1h menos 1min
  return tokenCache;
}

// Endpoint original (resposta completa)
app.get('/entity/:id', async (req, res) => {
  try {
    const token = await getToken();
    const entityId = req.params.id;

    const response = await fetch(`https://id.who.int/icd/entity/${entityId}`, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        Accept: 'application/json',
        'API-Version': '2020-09'
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar entidade' });
  }
});

// Endpoint simplificado (resposta enxuta)
app.get('/entity-slim/:id', async (req, res) => {
  try {
    const token = await getToken();
    const entityId = req.params.id;

    const response = await fetch(`https://id.who.int/icd/entity/${entityId}`, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        Accept: 'application/json',
        'API-Version': '2020-09'
      },
    });
    const fullData = await response.json();

    // Filtrar apenas os campos essenciais
    const slimData = {
      id: entityId,
      title: fullData?.title?.["@value"] || "Sem título",
      definition: fullData?.definition?.["@value"] || "Sem definição disponível",
      synonyms: fullData?.synonym?.slice(0, 3).map(s => s.label?.["@value"]) || [],
      foundationURI: `https://id.who.int/icd/entity/${entityId}`
    };

    res.json(slimData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados simplificados' });
  }
});

// Endpoint de busca por termo
app.get('/search', async (req, res) => {
  try {
    const token = await getToken();
    const { term, release = '2020-09', linearization = 'mms' } = req.query;

    const url = `https://id.who.int/icd/release/11/${release}/${linearization}/search?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        Accept: 'application/json',
        'API-Version': '2020-09'
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar termo' });
  }
});

// Rota raiz só para teste
app.get('/', (req, res) => {
  res.send('ICD-11 Proxy está ativo.');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
