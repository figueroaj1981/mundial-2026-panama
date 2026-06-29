/**
 * sync_results.js — Sincroniza marcadores del Mundial 2026 desde football-data.org
 *
 * SEGURO POR DISEÑO: NO reescribe la estructura. Solo:
 *   1. Rellena marcador + estado de los partidos que la API reporta como jugados.
 *   2. Recalcula las tablas de grupos a partir de los partidos finalizados.
 * Preserva: IDs (M001..), nombres en español, banderas, sedes, fechas, Grupo L, noticias.
 *
 * Requiere la variable de entorno FOOTBALL_DATA_API_KEY (API gratis de football-data.org).
 * Si no hay key o la API falla, NO escribe nada (sale sin cambios).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PARTIDOS = path.join(ROOT, 'resultados', 'partidos.json');
const GRUPOS = path.join(ROOT, 'resultados', 'grupos.json');
const NOTICIAS = path.join(ROOT, 'noticias', 'noticias.json');
const KNOCKOUT = path.join(ROOT, 'resultados', 'knockout.json');
const LOG = path.join(ROOT, 'logs', 'sync.log');

// Genera/actualiza una noticia automática con los resultados recién actualizados.
// Mantiene un único item id="N-AUTO" arriba; preserva las noticias manuales.
function updateAutoNews(updated, ts) {
  if (!updated.length) return;
  let noticias;
  try { noticias = JSON.parse(fs.readFileSync(NOTICIAS, 'utf8')); } catch { return; }
  if (!Array.isArray(noticias.noticias)) return;
  const lista = updated.map(m => `${m.equipo1.nombre} ${m.marcador.g1}-${m.marcador.g2} ${m.equipo2.nombre}`).join(' · ');
  const item = {
    id: 'N-AUTO',
    titulo: '⚽ Últimos resultados del Mundial 2026',
    resumen: `Marcadores recién actualizados: ${lista}. Las tablas de grupos quedaron al día. (Actualización automática)`,
    imagen: null,
    categoria: 'Resultados',
    fecha: ts,
    fuente: 'Actualización automática',
    url: 'https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026',
    destacada: false
  };
  noticias.noticias = noticias.noticias.filter(n => n.id !== 'N-AUTO');
  noticias.noticias.unshift(item);
  noticias.lastUpdated = ts;
  fs.writeFileSync(NOTICIAS, JSON.stringify(noticias, null, 2));
  log(`✓ Noticia automática actualizada (${updated.length} partidos).`);
}

function log(msg) {
  const line = `[${new Date().toISOString()}] SYNC: ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch {}
}

function nowPanamaISO() {
  // Hora de Panamá = UTC-5 (sin horario de verano)
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  return d.toISOString().replace('Z', '-05:00').replace(/\.\d{3}/, '');
}

function fetchWC(apiKey) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.football-data.org',
      path: '/v4/competitions/WC/matches',
      method: 'GET',
      headers: { 'X-Auth-Token': apiKey }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) { log(`API status ${res.statusCode}: ${data.slice(0,200)}`); return resolve(null); }
        try { resolve(JSON.parse(data)); } catch { log('Respuesta no es JSON válido'); resolve(null); }
      });
    });
    req.on('error', e => { log(`Error de conexión: ${e.message}`); resolve(null); });
    req.setTimeout(15000, () => { log('Timeout'); req.destroy(); resolve(null); });
    req.end();
  });
}

// Normaliza códigos de equipo para emparejar nuestro `code` con el TLA de la API.
const CODE_ALIAS = {
  RSA: ['RSA','ZAF'], KOR: ['KOR'], CZE: ['CZE'], BIH: ['BIH'],
  NED: ['NED','NLD'], GER: ['GER','DEU'], CRO: ['CRO','HRV'], SUI: ['SUI','CHE'],
  POR: ['POR','PRT'], URU: ['URU','URY'], PAR: ['PAR','PRY'], DEN: ['DEN','DNK'],
  CRC: ['CRC'], ALG: ['ALG','DZA'], COD: ['COD','CGO','ZAI'], CPV: ['CPV'],
  IRN: ['IRN'], KSA: ['KSA','SAU'], UZB: ['UZB'], JOR: ['JOR'], IRQ: ['IRQ'],
};
function codeMatches(ourCode, apiTla) {
  if (!apiTla) return false;
  if (ourCode === apiTla) return true;
  const al = CODE_ALIAS[ourCode];
  return al ? al.includes(apiTla) : false;
}

function buildApiIndex(apiData) {
  // Mapa: claves de pares de equipos -> {homeTla, awayTla, g1, g2, finished}
  const list = [];
  for (const m of (apiData.matches || [])) {
    const ft = m.score && m.score.fullTime;
    list.push({
      home: m.homeTeam && m.homeTeam.tla,
      away: m.awayTeam && m.awayTeam.tla,
      g1: ft ? ft.home : null,
      g2: ft ? ft.away : null,
      finished: m.status === 'FINISHED'
    });
  }
  return list;
}

function findApiMatch(apiList, c1, c2) {
  // Busca un partido de la API cuyo par de equipos coincida con {c1,c2} (en cualquier orden)
  return apiList.find(a =>
    (codeMatches(c1, a.home) && codeMatches(c2, a.away)) ||
    (codeMatches(c1, a.away) && codeMatches(c2, a.home))
  );
}

function recomputeGroups(grupos, matches) {
  for (const g of grupos.groups) {
    const stats = {};
    for (const t of g.teams) stats[t.code] = { ...t, pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dg:0,pts:0 };
    for (const m of matches) {
      if (m.grupo !== g.id || m.estado !== 'finalizado' || !m.marcador) continue;
      const a = stats[m.equipo1.code], b = stats[m.equipo2.code];
      if (!a || !b) continue;
      const g1 = m.marcador.g1, g2 = m.marcador.g2;
      a.pj++; b.pj++; a.gf+=g1; a.gc+=g2; b.gf+=g2; b.gc+=g1;
      if (g1>g2){ a.pg++; a.pts+=3; b.pp++; } else if (g1<g2){ b.pg++; b.pts+=3; a.pp++; } else { a.pe++; b.pe++; a.pts++; b.pts++; }
    }
    const sorted = Object.values(stats).map(t => ({ ...t, dg: t.gf - t.gc }))
      .sort((x,y) => y.pts-x.pts || y.dg-x.dg || y.gf-x.gf);
    sorted.forEach((t,i) => t.pos = i+1);
    g.teams = sorted;
  }
}

// Extrae los resultados reales de eliminatorias de la API y los guarda en knockout.json
function syncKnockout(apiData, partidos) {
  try {
    const ourCodes = new Set();
    partidos.matches.forEach(m => { ourCodes.add(m.equipo1.code); ourCodes.add(m.equipo2.code); });
    const toOur = (tla) => {
      if (!tla) return null;
      if (ourCodes.has(tla)) return tla;
      for (const oc of ourCodes) if (codeMatches(oc, tla)) return oc;
      return null;
    };
    const stages = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
    const knockout = [];
    (apiData.matches || []).forEach(m => {
      if (!stages.includes(m.stage) || m.status !== 'FINISHED') return;
      const home = toOur(m.homeTeam && m.homeTeam.tla);
      const away = toOur(m.awayTeam && m.awayTeam.tla);
      if (!home || !away) return;
      const ft = m.score && m.score.fullTime;
      if (!ft || ft.home === null) return;
      let winner = null;
      if (m.score.winner === 'HOME_TEAM') winner = home;
      else if (m.score.winner === 'AWAY_TEAM') winner = away;
      else if (ft.home > ft.away) winner = home;
      else if (ft.away > ft.home) winner = away;
      knockout.push({ stage: m.stage, home, away, g1: ft.home, g2: ft.away, winner });
    });
    fs.writeFileSync(KNOCKOUT, JSON.stringify({ lastUpdated: nowPanamaISO(), knockout }, null, 2));
    log(`✓ Eliminatorias: ${knockout.length} partidos finalizados guardados.`);
  } catch (e) { log(`Knockout error: ${e.message}`); }
}

// Inserta/actualiza los PARTIDOS de eliminatoria en partidos.json (para que las pestañas los muestren)
function syncKnockoutFixtures(apiData, partidos) {
  let changes = 0;
  try {
    const ourCodes = new Set();
    const teamByCode = {};
    partidos.matches.forEach(m => {
      [m.equipo1, m.equipo2].forEach(e => {
        if (e && e.code) { ourCodes.add(e.code); if (!teamByCode[e.code]) teamByCode[e.code] = { nombre: e.nombre, flag: e.flag, code: e.code }; }
      });
    });
    const toOur = (tla) => { if (!tla) return null; if (ourCodes.has(tla)) return tla; for (const oc of ourCodes) if (codeMatches(oc, tla)) return oc; return null; };
    const teamObj = (t) => {
      const c = toOur(t && t.tla);
      if (c && teamByCode[c]) return teamByCode[c];
      if (t && t.name) return { nombre: t.name, flag: '🏳', code: t.tla || '' };
      return null;
    };
    const stageLabel = { LAST_32: '16avos', LAST_16: 'Octavos', QUARTER_FINALS: 'Cuartos', SEMI_FINALS: 'Semifinal', THIRD_PLACE: '3er puesto', FINAL: 'Final' };
    const utcToPanama = (utc) => {
      const d = new Date(new Date(utc).getTime() - 5 * 3600 * 1000);
      const p = n => String(n).padStart(2, '0');
      return { fecha: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`, hora: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` };
    };
    const byId = {};
    partidos.matches.forEach(m => { byId[m.id] = m; });

    (apiData.matches || []).forEach(m => {
      const fase = stageLabel[m.stage];
      if (!fase) return;
      const e1 = teamObj(m.homeTeam), e2 = teamObj(m.awayTeam);
      if (!e1 || !e2) return; // aún por definir
      const id = 'K' + m.id;
      const dt = m.utcDate ? utcToPanama(m.utcDate) : { fecha: '', hora: '' };
      const ft = m.score && m.score.fullTime;
      const finished = m.status === 'FINISHED' && ft && ft.home !== null && ft.home !== undefined;
      const estado = finished ? 'finalizado' : 'programado';
      const marcador = finished ? { g1: ft.home, g2: ft.away } : null;
      const ex = byId[id];
      if (!ex) {
        partidos.matches.push({ id, fase, fecha: dt.fecha, hora: dt.hora, timezone: 'America/Panama', equipo1: e1, equipo2: e2, marcador, estado, estadio: m.venue || 'Por confirmar', ciudad: m.venue || '' });
        changes++;
      } else {
        const before = JSON.stringify([ex.marcador, ex.estado, ex.equipo1.code, ex.equipo2.code, ex.fecha, ex.hora]);
        ex.fase = fase; ex.fecha = dt.fecha; ex.hora = dt.hora; ex.equipo1 = e1; ex.equipo2 = e2; ex.marcador = marcador; ex.estado = estado; ex.estadio = m.venue || ex.estadio; ex.ciudad = m.venue || ex.ciudad;
        if (before !== JSON.stringify([ex.marcador, ex.estado, ex.equipo1.code, ex.equipo2.code, ex.fecha, ex.hora])) changes++;
      }
    });
    if (changes) log(`✓ Fixtures de eliminatoria: ${changes} agregados/actualizados.`);
  } catch (e) { log(`KO fixtures error: ${e.message}`); }
  return changes;
}

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) { log('Sin FOOTBALL_DATA_API_KEY — no se hace nada.'); return; }

  const partidos = JSON.parse(fs.readFileSync(PARTIDOS, 'utf8'));
  const grupos = JSON.parse(fs.readFileSync(GRUPOS, 'utf8'));
  const totalAntes = partidos.matches.length;

  const apiData = await fetchWC(apiKey);
  if (!apiData) { log('API no disponible — sin cambios.'); return; }
  const apiList = buildApiIndex(apiData);
  log(`API devolvió ${apiList.length} partidos.`);

  // Eliminatorias reales (independiente de los grupos): se escribe siempre que la API responda
  syncKnockout(apiData, partidos);

  let cambios = 0;
  const actualizados = [];
  for (const m of partidos.matches) {
    if (m.estado === 'finalizado') continue; // ya está, no tocar
    const found = findApiMatch(apiList, m.equipo1.code, m.equipo2.code);
    if (found && found.finished && found.g1 !== null) {
      // Asignar marcador respetando quién es equipo1/equipo2
      const e1IsHome = codeMatches(m.equipo1.code, found.home);
      m.marcador = e1IsHome ? { g1: found.g1, g2: found.g2 } : { g1: found.g2, g2: found.g1 };
      m.estado = 'finalizado';
      cambios++;
      actualizados.push(m);
      log(`✓ ${m.id} ${m.equipo1.nombre} ${m.marcador.g1}-${m.marcador.g2} ${m.equipo2.nombre}`);
    }
  }

  // Insertar/actualizar fixtures de eliminatoria (16avos → final) para que aparezcan en las pestañas
  const koChanges = syncKnockoutFixtures(apiData, partidos);

  if (cambios === 0 && koChanges === 0) { log('No hay partidos nuevos. Sin cambios.'); return; }

  // VALIDACIÓN DE SEGURIDAD antes de escribir (la lista puede crecer por eliminatorias, nunca encoger por debajo de 72)
  if (partidos.matches.length < 72) {
    log(`ABORT: conteo de partidos inesperado (${partidos.matches.length}).`); return;
  }
  if (!grupos.groups || grupos.groups.length !== 12 || grupos.groups.some(g => g.teams.length !== 4)) {
    log('ABORT: estructura de grupos inesperada.'); return;
  }

  recomputeGroups(grupos, partidos.matches);

  const ts = nowPanamaISO();
  partidos.lastUpdated = ts;
  grupos.lastUpdated = ts;
  fs.writeFileSync(PARTIDOS, JSON.stringify(partidos, null, 2));
  fs.writeFileSync(GRUPOS, JSON.stringify(grupos, null, 2));
  updateAutoNews(actualizados, ts);
  log(`✓ Sincronizados ${cambios} partidos y recalculadas las tablas. Timestamp ${ts}.`);
}

main().then(() => process.exit(0)).catch(e => { log(`Error: ${e.message}`); process.exit(0); });
