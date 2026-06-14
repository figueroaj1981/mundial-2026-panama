/**
 * fetch_news.js — Obtiene noticias del Mundial 2026
 *
 * Fuentes: NewsAPI (gratuita), Google News RSS, fuentes configurables.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'noticias', 'noticias.json');
const LOG_FILE = path.join(ROOT, 'logs', 'fetch.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] NEWS: ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

/**
 * Fetch de NewsAPI.org (requiere API key gratuita)
 * Registrarse en: https://newsapi.org/
 */
async function fetchFromNewsAPI(apiKey) {
  if (!apiKey) return null;

  const queries = [
    'Panamá Mundial 2026',
    'FIFA World Cup 2026',
    'Copa del Mundo 2026',
  ];

  const allArticles = [];

  for (const q of queries) {
    const data = await new Promise((resolve) => {
      const encoded = encodeURIComponent(q);
      const options = {
        hostname: 'newsapi.org',
        path: `/v2/everything?q=${encoded}&language=es&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
      req.end();
    });

    if (data?.articles) {
      allArticles.push(...data.articles);
    }
  }

  return allArticles;
}

/**
 * Transforma artículos de NewsAPI a formato local
 */
function transformArticles(articles) {
  const seen = new Set();
  return articles
    .filter(a => a.title && a.url && !seen.has(a.url) && seen.add(a.url))
    .slice(0, 10)
    .map((a, i) => {
      const isPanama = /panam[aá]/i.test(a.title + ' ' + (a.description || ''));
      const categoria = isPanama ? 'Panamá'
        : /resultado|gol|partido|marcador/i.test(a.title) ? 'Resultados'
        : 'Mundial 2026';

      return {
        id: `N${String(i + 1).padStart(3, '0')}`,
        titulo: a.title?.replace(/ - [^-]+$/, '') || 'Sin título',
        resumen: a.description || a.content?.slice(0, 200) || 'Ver artículo completo.',
        imagen: a.urlToImage || null,
        categoria,
        fecha: a.publishedAt || new Date().toISOString(),
        fuente: a.source?.name || 'Desconocido',
        url: a.url,
        destacada: isPanama
      };
    });
}

/**
 * Genera noticias de respaldo basadas en los resultados actuales
 */
function generateFallbackNews() {
  const now = new Date().toISOString();
  const today = new Date().toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' });

  return [
    {
      id: 'N001',
      titulo: `Resumen del día: los mejores momentos del Mundial 2026 — ${today}`,
      resumen: 'El Mundial 2026 continúa con partidos emocionantes. Revisa los resultados del día y mantente al tanto de todos los grupos.',
      imagen: null,
      categoria: 'Mundial 2026',
      fecha: now,
      fuente: 'FIFA',
      url: 'https://www.fifa.com/worldcup/2026',
      destacada: false
    },
    {
      id: 'N002',
      titulo: 'Panamá sigue construyendo su historia en el Mundial 2026',
      resumen: 'La Selección Panameña continúa su participación en el torneo. El equipo dirigido por Thomas Christiansen trabaja para conseguir los mejores resultados posibles.',
      imagen: null,
      categoria: 'Panamá',
      fecha: now,
      fuente: 'FEPAFUT',
      url: 'https://www.fepafut.com',
      destacada: true
    }
  ];
}

/**
 * Main
 */
async function fetchNews() {
  log('Iniciando obtención de noticias...');

  const apiKey = process.env.NEWS_API_KEY || null;
  let noticias = null;

  if (apiKey) {
    log('Intentando NewsAPI.org...');
    const articles = await fetchFromNewsAPI(apiKey);
    if (articles && articles.length > 0) {
      noticias = transformArticles(articles);
      log(`✓ ${noticias.length} noticias obtenidas de NewsAPI`);
    }
  }

  if (!noticias || noticias.length === 0) {
    log('Sin fuente externa — verificando datos locales...');
    try {
      const current = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
      noticias = current.noticias;
      log(`Manteniendo ${noticias.length} noticias existentes`);
    } catch {
      log('Generando noticias de respaldo...');
      noticias = generateFallbackNews();
    }
  }

  const output = {
    lastUpdated: new Date().toISOString(),
    noticias
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  log(`✓ Noticias guardadas: ${noticias.length} artículos`);
  log('Para noticias en tiempo real, configurar NEWS_API_KEY');

  return true;
}

module.exports = { fetchNews };

if (require.main === module) {
  fetchNews().then(() => process.exit(0));
}
