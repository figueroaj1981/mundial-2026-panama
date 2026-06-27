/**
 * generate_data_js.js — Genera assets/js/data.js con datos embebidos
 * Esto permite que index.html funcione sin servidor (file://)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'logs', 'fetch.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] DATAGEN: ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function generateDataJs() {
  const gruposPath  = path.join(ROOT, 'resultados', 'grupos.json');
  const partidosPath = path.join(ROOT, 'resultados', 'partidos.json');
  const noticiasPath = path.join(ROOT, 'noticias', 'noticias.json');
  const knockoutPath = path.join(ROOT, 'resultados', 'knockout.json');
  const outputPath  = path.join(ROOT, 'assets', 'js', 'data.js');

  let grupos, partidos, noticias, knockout = { knockout: [] };

  try {
    grupos   = JSON.parse(fs.readFileSync(gruposPath, 'utf8'));
    partidos = JSON.parse(fs.readFileSync(partidosPath, 'utf8'));
    noticias = JSON.parse(fs.readFileSync(noticiasPath, 'utf8'));
  } catch (e) {
    log(`Error leyendo JSON: ${e.message}`);
    return false;
  }
  try { knockout = JSON.parse(fs.readFileSync(knockoutPath, 'utf8')); } catch (e) { /* opcional */ }

  const now = new Date().toISOString();

  const content = `/**
 * data.js — Datos embebidos del Mundial 2026
 * Generado automáticamente por el scheduler.
 * Última actualización: ${now}
 */

window.MUNDIAL_DATA = {
  lastUpdated: ${JSON.stringify(now)},
  grupos: ${JSON.stringify(grupos.groups || [], null, 2)},
  partidos: ${JSON.stringify(partidos.matches || [], null, 2)},
  noticias: ${JSON.stringify(noticias.noticias || [], null, 2)},
  knockout: ${JSON.stringify(knockout.knockout || [], null, 2)}
};
`;

  fs.writeFileSync(outputPath, content);
  log(`✓ data.js generado (${(content.length / 1024).toFixed(1)} KB)`);
  return true;
}

module.exports = { generateDataJs };

if (require.main === module) {
  const ok = generateDataJs();
  process.exit(ok ? 0 : 1);
}
