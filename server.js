import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Usa variáveis de ambiente para as credenciais
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let tokenCache = null;
let tokenExpiry = null;

// Função para obter um token novo
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
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // expira em ~1 hora
  return tokenCache;
}

// Endpoint para buscar uma entidade
app.get('/entity/:id', async (req, res) => {
  try {
    const token = await getToken();
    const entityId = req.params.id;

    const response = await fetch(`https://id.who.int/icd/entity/${entityId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar entidade' });
  }
});

// Endpoint para buscar termos
app.get('/search', async (req, res) => {
  try {
    const token = await getToken();
    const { term, release = '2020-09', linearization = 'mms' } = req.query;

    const url = `https://id.who.int/icd/release/11/${release}/${linearization}/search?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar termo' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
