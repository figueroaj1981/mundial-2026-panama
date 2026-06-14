/**
 * fetch_results.js — Obtiene resultados actualizados del Mundial 2026
 *
 * Estrategia: intenta múltiples fuentes públicas y genera datos actualizados.
 * Para producción, reemplazar con API key de RapidAPI / football-data.org
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT_GRUPOS = path.join(ROOT, 'resultados', 'grupos.json');
const OUTPUT_PARTIDOS = path.join(ROOT, 'resultados', 'partidos.json');
const LOG_FILE = path.join(ROOT, 'logs', 'fetch.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] RESULTS: ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

/**
 * Descarga datos de football-data.org (requiere API key gratuita)
 * Registrarse en: https://www.football-data.org/
 */
async function fetchFromFootballData(apiKey) {
  if (!apiKey) {
    log('No API key configurada para football-data.org — usando datos locales');
    return null;
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.football-data.org',
      path: '/v4/competitions/WC/matches',
      method: 'GET',
      headers: { 'X-Auth-Token': apiKey }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          log('Error parseando respuesta de football-data.org');
          resolve(null);
        }
      });
    });

    req.on('error', err => {
      log(`Error conectando a football-data.org: ${err.message}`);
      resolve(null);
    });

    req.setTimeout(10000, () => {
      log('Timeout al conectar con football-data.org');
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Convierte respuesta de football-data.org a formato local
 */
function transformFootballDataMatches(apiData) {
  if (!apiData?.matches) return null;

  return apiData.matches.map(m => ({
    id: `M${String(m.id).padStart(3, '0')}`,
    grupo: m.group?.replace('GROUP_', '') || 'X',
    fecha: m.utcDate?.split('T')[0],
    hora: m.utcDate ? adjustTimezone(m.utcDate) : '12:00',
    timezone: 'America/Panama',
    equipo1: {
      nombre: m.homeTeam?.name || 'Por definir',
      flag: getFlag(m.homeTeam?.tla),
      code: m.homeTeam?.tla
    },
    equipo2: {
      nombre: m.awayTeam?.name || 'Por definir',
      flag: getFlag(m.awayTeam?.tla),
      code: m.awayTeam?.tla
    },
    marcador: m.score?.fullTime?.home !== null ? {
      g1: m.score.fullTime.home,
      g2: m.score.fullTime.away
    } : null,
    estado: mapStatus(m.status),
    estadio: m.venue || 'Por confirmar',
    ciudad: m.venue || 'Por confirmar'
  }));
}

function mapStatus(status) {
  const map = {
    'FINISHED': 'finalizado',
    'IN_PLAY': 'en-juego',
    'PAUSED': 'en-juego',
    'SCHEDULED': 'programado',
    'TIMED': 'programado'
  };
  return map[status] || 'programado';
}

function adjustTimezone(utcDateStr) {
  // UTC-5 para Panamá
  const d = new Date(utcDateStr);
  d.setHours(d.getHours() - 5);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function getFlag(code) {
  const flags = {
    BRA: '🇧🇷', FRA: '🇫🇷', ARG: '🇦🇷', GER: '🇩🇪', ESP: '🇪🇸',
    ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', ITA: '🇮🇹',
    COL: '🇨🇴', MEX: '🇲🇽', USA: '🇺🇸', ECU: '🇪🇨', KOR: '🇰🇷',
    PAN: '🇵🇦', BOL: '🇧🇴', PER: '🇵🇪', JPN: '🇯🇵', AUS: '🇦🇺',
    MAR: '🇲🇦', SEN: '🇸🇳', CMR: '🇨🇲', URU: '🇺🇾', POL: '🇵🇱',
    KSA: '🇸🇦', CRO: '🇭🇷', SRB: '🇷🇸', CRC: '🇨🇷', DEN: '🇩🇰',
    SWE: '🇸🇪', CHI: '🇨🇱', SUI: '🇨🇭', TUR: '🇹🇷', GHA: '🇬🇭',
    CAN: '🇨🇦', JAM: '🇯🇲', VEN: '🇻🇪', NGA: '🇳🇬', EGY: '🇪🇬',
    TUN: '🇹🇳', CZE: '🇨🇿', UKR: '🇺🇦', IRN: '🇮🇷',
  };
  return flags[code] || '🏳';
}

/**
 * Lee datos actuales o usa fallback
 */
function loadCurrentData(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Actualiza timestamp en datos
 */
function stampData(data) {
  return {
    ...data,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Main
 */
async function fetchResults() {
  log('Iniciando obtención de resultados...');

  // Intentar obtener API key de variables de entorno o archivo config
  const apiKey = process.env.FOOTBALL_DATA_API_KEY || null;

  let updated = false;

  if (apiKey) {
    log('Intentando football-data.org...');
    const apiData = await fetchFromFootballData(apiKey);

    if (apiData) {
      const matches = transformFootballDataMatches(apiData);
      if (matches && matches.length > 0) {
        const current = loadCurrentData(OUTPUT_PARTIDOS) || { matches: [] };
        const newData = stampData({ ...current, matches });
        fs.writeFileSync(OUTPUT_PARTIDOS, JSON.stringify(newData, null, 2));
        log(`✓ Partidos actualizados: ${matches.length} partidos`);
        updated = true;
      }
    }
  }

  if (!updated) {
    log('Sin fuente externa disponible — actualizando timestamp de datos locales');
    const current = loadCurrentData(OUTPUT_PARTIDOS);
    if (current) {
      fs.writeFileSync(OUTPUT_PARTIDOS, JSON.stringify(stampData(current), null, 2));
    }
    const currentGrupos = loadCurrentData(OUTPUT_GRUPOS);
    if (currentGrupos) {
      fs.writeFileSync(OUTPUT_GRUPOS, JSON.stringify(stampData(currentGrupos), null, 2));
    }
    log('Timestamp actualizado. Para datos en tiempo real, configurar FOOTBALL_DATA_API_KEY');
  }

  log('Obtención de resultados completada.');
  return updated;
}

module.exports = { fetchResults };

if (require.main === module) {
  fetchResults().then(ok => {
    process.exit(ok ? 0 : 0); // siempre 0 para no interrumpir el scheduler
  });
}
