/**
 * update_worldcup.js — Scheduler principal del Mundial 2026
 *
 * Ejecuta diariamente a las 6:00 AM (hora Panamá, UTC-5)
 *
 * USO:
 *   node scheduler/update_worldcup.js          → ejecuta una vez ahora
 *   node scheduler/update_worldcup.js --watch  → loop diario automático
 *
 * CONFIGURACIÓN AUTOMÁTICA (Windows Task Scheduler):
 *   Correr setup-task.bat como administrador para registrar la tarea.
 *
 * Variables de entorno opcionales:
 *   FOOTBALL_DATA_API_KEY  → API key de football-data.org (gratuita)
 *   NEWS_API_KEY           → API key de NewsAPI.org (gratuita)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'update.log');
const LOCK_FILE = path.join(LOG_DIR, '.lock');

// =============================================
// LOGGER
// =============================================
function log(level, msg) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const line = `[${new Date().toISOString()}] [${level.padEnd(5)}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

const logger = {
  info: msg => log('INFO', msg),
  warn: msg => log('WARN', msg),
  error: msg => log('ERROR', msg),
  ok: msg => log('OK', msg),
};

// =============================================
// LOCK — evitar ejecuciones simultáneas
// =============================================
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const lockTime = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
    const age = Date.now() - lockTime;
    if (age < 1800000) { // 30 min
      logger.warn(`Ya hay una actualización en curso (lock de hace ${Math.floor(age/60000)}m). Saltando.`);
      return false;
    }
    logger.warn('Lock expirado. Continuando...');
  }
  fs.writeFileSync(LOCK_FILE, String(Date.now()));
  return true;
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
}

// =============================================
// BACKUP — guarda versión anterior
// =============================================
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const backupPath = filePath + '.bak';
  try {
    fs.copyFileSync(filePath, backupPath);
  } catch (e) {
    logger.warn(`No se pudo hacer backup de ${path.basename(filePath)}: ${e.message}`);
  }
}

// =============================================
// RESTORE — revierte si hay error
// =============================================
function restoreBackup(filePath) {
  const backupPath = filePath + '.bak';
  if (fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(backupPath, filePath);
      logger.warn(`Restaurado backup de ${path.basename(filePath)}`);
    } catch {}
  }
}

// =============================================
// ROTATE LOGS — máximo 500KB
// =============================================
function rotateLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > 500 * 1024) {
      const archivePath = LOG_FILE.replace('.log', `-${Date.now()}.log`);
      fs.renameSync(LOG_FILE, archivePath);
      logger.info(`Log rotado a ${path.basename(archivePath)}`);
    }
  } catch {}
}

// =============================================
// RETRY — reintenta operaciones fallidas
// =============================================
async function withRetry(fn, name, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result !== false) return result;
      throw new Error('Retornó false');
    } catch (e) {
      if (attempt === maxRetries) {
        logger.error(`${name} falló después de ${maxRetries} intentos: ${e.message}`);
        return false;
      }
      logger.warn(`${name} falló (intento ${attempt}/${maxRetries}): ${e.message}. Reintentando en 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// =============================================
// MAIN UPDATE
// =============================================
async function runUpdate() {
  const startTime = Date.now();
  logger.info('='.repeat(60));
  logger.info('INICIANDO ACTUALIZACIÓN MUNDIAL 2026');
  logger.info(`Hora: ${new Date().toLocaleString('es-PA', { timeZone: 'America/Panama' })} (Panamá)`);
  logger.info('='.repeat(60));

  if (!acquireLock()) return;

  const filesToBackup = [
    path.join(ROOT, 'resultados', 'grupos.json'),
    path.join(ROOT, 'resultados', 'partidos.json'),
    path.join(ROOT, 'noticias', 'noticias.json'),
  ];

  // 1. Backup archivos actuales
  logger.info('Paso 1/4: Creando backups...');
  filesToBackup.forEach(backupFile);

  let resultsOk = false;
  let newsOk = false;

  try {
    // 2. Obtener resultados
    logger.info('Paso 2/4: Actualizando resultados...');
    const { fetchResults } = require('./fetch_results');
    resultsOk = await withRetry(fetchResults, 'fetch_results');

    // 3. Obtener noticias
    logger.info('Paso 3/4: Actualizando noticias...');
    const { fetchNews } = require('./fetch_news');
    newsOk = await withRetry(fetchNews, 'fetch_news');

    // 4. Resumen
    logger.info('Paso 4/4: Generando resumen...');
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const summary = {
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      results: resultsOk ? 'OK' : 'FALLIDO (datos locales mantenidos)',
      news: newsOk ? 'OK' : 'FALLIDO (datos locales mantenidos)',
    };

    const summaryPath = path.join(LOG_DIR, 'last_update.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    logger.ok('='.repeat(60));
    logger.ok(`ACTUALIZACIÓN COMPLETADA en ${elapsed}s`);
    logger.ok(`Resultados: ${summary.results}`);
    logger.ok(`Noticias:   ${summary.news}`);
    logger.ok('='.repeat(60));

  } catch (e) {
    logger.error(`Error crítico: ${e.message}`);
    logger.warn('Restaurando backups...');
    filesToBackup.forEach(restoreBackup);
  } finally {
    releaseLock();
    rotateLogs();
  }
}

// =============================================
// WATCH MODE — loop diario
// =============================================
function msUntilNextRun(targetHour = 6) {
  const now = new Date();
  // Convertir a hora Panamá (UTC-5)
  const panamaOffset = -5 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const panama = new Date(utcMs + panamaOffset * 60000);

  const next = new Date(panama);
  next.setHours(targetHour, 0, 0, 0);
  if (next <= panama) next.setDate(next.getDate() + 1);

  const diffMs = next - panama;
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  logger.info(`Próxima actualización en ${h}h ${m}m (${targetHour}:00 AM hora Panamá)`);

  return diffMs;
}

async function watchMode() {
  logger.info('MODO WATCH ACTIVADO — actualizaciones diarias a las 6:00 AM (hora Panamá)');

  // Primera ejecución inmediata
  await runUpdate();

  // Loop diario
  function scheduleNext() {
    const delay = msUntilNextRun(6);
    setTimeout(async () => {
      await runUpdate();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}

// =============================================
// ENTRY POINT
// =============================================
const args = process.argv.slice(2);

if (args.includes('--watch')) {
  watchMode().catch(e => {
    logger.error(`Error fatal en watch mode: ${e.message}`);
    process.exit(1);
  });
} else {
  runUpdate().then(() => {
    if (!args.includes('--no-exit')) process.exit(0);
  }).catch(e => {
    logger.error(`Error fatal: ${e.message}`);
    process.exit(1);
  });
}
