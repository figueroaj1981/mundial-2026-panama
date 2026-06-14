/* ===== MUNDIAL 2026 — APP PRINCIPAL ===== */

// =============================================
// FRASES DIARIAS PANAMÁ
// =============================================
const FRASES_PANAMA = [
  { texto: "Después de la infancia que tuve, ¿a quién iba a temer? Yo nunca me rendí.", autor: "Roberto Durán — Mano de Piedra" },
  { texto: "Los campeones no nacen en vecindarios ricos. Nacen del hambre, del sacrificio y del corazón.", autor: "Roberto Durán — Mano de Piedra" },
  { texto: "Mis padres me enseñaron: para ser alguien hay que trabajar, actuar con seriedad y respetar. Eso es todo lo que necesitas.", autor: "Roberto Durán — Mano de Piedra" },
  { texto: "Yo soy de Panamá y le enseñé al mundo de qué estamos hechos.", autor: "Roberto Durán — Mano de Piedra" },
  { texto: "¡Vamos Panamá! Un país entero empuja cada gol.", autor: null },
  { texto: "Cada partido es una oportunidad de escribir historia.", autor: null },
  { texto: "Del Pacífico al Atlántico, todos somos uno.", autor: null },
  { texto: "Somos pequeños en mapa, enormes en corazón.", autor: null },
  { texto: "El Canal une al mundo. Panamá une a los corazones.", autor: null },
  { texto: "¡Arriba Panamá! El mundo nos está mirando.", autor: null },
  { texto: "La perseverancia vence lo que la fuerza no puede.", autor: null },
  { texto: "No hay rival que se compare con un pueblo que cree en sí mismo.", autor: null },
];

const MENSAJES_EMPATE = [
  "¡Un punto ganado! Panamá demostró carácter.",
  "El camino continúa. El próximo partido es una nueva oportunidad.",
  "Con garra panameña, empatar también es luchar.",
  "Seguimos en la pelea. ¡Vamos Panamá!",
];

const MENSAJES_VICTORIA = [
  "¡PANAMÁ GANÓ! 🎉 Un momento histórico para toda la nación.",
  "¡Lo logramos! Panamá sigue avanzando con gloria.",
  "¡Campeones del corazón! Panamá triunfa en el mundo.",
];

const MENSAJES_DERROTA = [
  "Seguimos adelante. Cada minuto jugado construye historia.",
  "No bajamos la cabeza. Panamá vive para el próximo desafío.",
  "La resiliencia panameña es más fuerte que cualquier marcador.",
  "Los que nunca se rinden siempre tienen otra oportunidad.",
];

// =============================================
// UTILIDADES
// =============================================
function getFraseDelDia() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return FRASES_PANAMA[dayOfYear % FRASES_PANAMA.length];
}

function renderFrase(frase) {
  if (!frase) return '';
  if (typeof frase === 'string') return `"${frase}"`;
  return frase.autor
    ? `"${frase.texto}" <span class="frase-autor">— ${frase.autor}</span>`
    : `"${frase.texto}"`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr, timeStr) {
  return `${formatDate(dateStr)} — ${timeStr} (hora PA)`;
}

function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr)) / 60000;
  if (diff < 1) return 'ahora mismo';
  if (diff < 60) return `hace ${Math.floor(diff)}m`;
  if (diff < 1440) return `hace ${Math.floor(diff/60)}h`;
  return `hace ${Math.floor(diff/1440)}d`;
}

function getCategoryClass(cat) {
  const map = { 'Panamá': 'cat-panama', 'Resultados': 'cat-resultados', 'Mundial 2026': 'cat-mundial' };
  return map[cat] || 'cat-mundial';
}

function getStatusLabel(estado) {
  const map = { 'finalizado': 'Finalizado', 'en-juego': 'En vivo', 'programado': 'Próximo' };
  return map[estado] || estado;
}

function getStatusClass(estado) {
  const map = { 'finalizado': 'status-finalizado', 'en-juego': 'status-en-juego', 'programado': 'status-programado' };
  return map[estado] || '';
}

function isPanamaMatch(match) {
  return match.equipo1?.panama || match.equipo2?.panama;
}

// =============================================
// DATA LOADER — fetch JSON con fallback a datos embebidos
// =============================================
async function loadJSON(path) {
  try {
    const r = await fetch(path + '?v=' + Date.now());
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.info('Usando datos embebidos (modo offline):', path);
    return null;
  }
}

function getEmbeddedData() {
  const d = window.MUNDIAL_DATA;
  if (!d) return { grupos: null, partidos: null, noticias: null };
  return {
    grupos:   { lastUpdated: d.lastUpdated, groups: d.grupos },
    partidos: { lastUpdated: d.lastUpdated, matches: d.partidos },
    noticias: { lastUpdated: d.lastUpdated, noticias: d.noticias },
  };
}

// =============================================
// COUNTDOWN TIMER
// =============================================
function startCountdown(targetDateStr, targetTimeStr, matchInfo) {
  const countdownEl = document.getElementById('countdown-display');
  const labelEl = document.getElementById('countdown-label');
  const matchInfoEl = document.getElementById('countdown-match');

  if (!countdownEl) return;

  const target = new Date(`${targetDateStr}T${targetTimeStr}:00-05:00`).getTime();

  if (matchInfoEl && matchInfo) {
    matchInfoEl.innerHTML = `
      <div class="countdown-match-teams">${matchInfo.equipo1.flag} ${matchInfo.equipo1.nombre} <span style="color:var(--text-muted);font-weight:300">vs</span> ${matchInfo.equipo2.flag} ${matchInfo.equipo2.nombre}</div>
      <div class="countdown-match-detail">📍 ${matchInfo.estadio} · ${matchInfo.ciudad}</div>
    `;
  }

  function update() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      countdownEl.innerHTML = '<div class="countdown-number" style="color:var(--live-color);font-size:2rem">¡En Juego Ahora!</div>';
      if (labelEl) labelEl.textContent = '🔴 PARTIDO EN CURSO';
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const pad = n => String(n).padStart(2, '0');

    countdownEl.innerHTML = `
      <div class="countdown-unit">
        <div class="countdown-number">${pad(days)}</div>
        <div class="countdown-unit-label">días</div>
      </div>
      <div class="countdown-separator">:</div>
      <div class="countdown-unit">
        <div class="countdown-number">${pad(hours)}</div>
        <div class="countdown-unit-label">horas</div>
      </div>
      <div class="countdown-separator">:</div>
      <div class="countdown-unit">
        <div class="countdown-number">${pad(mins)}</div>
        <div class="countdown-unit-label">min</div>
      </div>
      <div class="countdown-separator">:</div>
      <div class="countdown-unit">
        <div class="countdown-number">${pad(secs)}</div>
        <div class="countdown-unit-label">seg</div>
      </div>
    `;
  }

  update();
  setInterval(update, 1000);
}

// =============================================
// BUILD MATCH CARD
// =============================================
function buildMatchCard(m) {
  const isPan = isPanamaMatch(m);
  const scoreHtml = m.estado === 'programado'
    ? `<div class="match-vs">VS</div><div style="color:var(--text-muted);font-size:0.75rem;margin-top:4px">${m.hora}</div>`
    : `<div class="match-score">${m.marcador.g1} - ${m.marcador.g2}</div>`;
  return `
    <div class="match-card fade-in-up ${isPan ? 'panama-match' : ''}">
      ${isPan ? '<div class="panama-match-tag">🇵🇦 Panamá</div>' : ''}
      <div class="match-card-header">
        <span class="match-group">Grupo ${m.grupo}</span>
        <span class="match-status ${getStatusClass(m.estado)}">${getStatusLabel(m.estado)}</span>
      </div>
      <div class="match-teams">
        <div class="match-team">
          <div class="match-team-flag">${m.equipo1.flag}</div>
          <div class="match-team-name">${m.equipo1.nombre}</div>
        </div>
        <div class="match-score-area">${scoreHtml}</div>
        <div class="match-team">
          <div class="match-team-flag">${m.equipo2.flag}</div>
          <div class="match-team-name">${m.equipo2.nombre}</div>
        </div>
      </div>
      <div class="match-card-footer">
        <span class="match-venue">📍 ${m.estadio}</span>
        <span class="match-time">${formatDate(m.fecha)}</span>
      </div>
    </div>
  `;
}

// =============================================
// RENDER MATCHES
// =============================================
function renderMatches(matches, containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let filtered = matches;
  if (options.filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    filtered = matches.filter(m => m.fecha === today);
  } else if (options.filter === 'panama') {
    filtered = matches.filter(isPanamaMatch);
  } else if (options.filter === 'upcoming') {
    filtered = matches.filter(m => m.estado === 'programado');
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">No hay partidos en esta categoría.</p>';
    return;
  }

  if (options.groupBy) {
    const byGroup = {};
    filtered.forEach(m => {
      if (!byGroup[m.grupo]) byGroup[m.grupo] = [];
      byGroup[m.grupo].push(m);
    });
    const groupOrder = 'ABCDEFGHIJKL'.split('');
    const sortedGroups = Object.keys(byGroup).sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b));

    const played = filtered.filter(m => m.estado === 'finalizado').length;
    const pending = filtered.filter(m => m.estado === 'programado').length;

    container.innerHTML = `
      <div class="grupos-resultados-grid">
        ${sortedGroups.map(grupo => {
          const gMatches = byGroup[grupo];
          const isPanGroup = grupo === 'L';
          const finCount = gMatches.filter(m => m.estado === 'finalizado').length;
          const rows = gMatches.map(m => {
            const isPan = isPanamaMatch(m);
            const scoreHtml = m.estado === 'programado'
              ? `<div class="grupo-score-vs">VS</div><div class="grupo-score-hora">${m.hora}</div>`
              : `<div class="grupo-score-num">${m.marcador.g1} – ${m.marcador.g2}</div>`;
            const isPan1 = m.equipo1.panama;
            const isPan2 = m.equipo2.panama;
            return `
              <div class="grupo-partido-row ${isPan ? 'is-panama' : ''}">
                <div class="grupo-team">
                  <span class="grupo-team-flag">${m.equipo1.flag}</span>
                  <span class="grupo-team-name ${isPan1 ? 'panama-name' : ''}">${m.equipo1.nombre}</span>
                </div>
                <div class="grupo-score-center">
                  ${scoreHtml}
                  <div class="grupo-partido-fecha">${formatDate(m.fecha)}</div>
                </div>
                <div class="grupo-team right">
                  <span class="grupo-team-flag">${m.equipo2.flag}</span>
                  <span class="grupo-team-name ${isPan2 ? 'panama-name' : ''}">${m.equipo2.nombre}</span>
                </div>
              </div>`;
          }).join('');
          return `
            <div class="grupo-panel ${isPanGroup ? 'panama-panel' : ''}">
              <div class="grupo-panel-header">
                <span class="grupo-panel-title">${isPanGroup ? '🇵🇦 ' : ''}Grupo ${grupo}</span>
                <span class="grupo-panel-badge">${finCount}/${gMatches.length} jugados</span>
              </div>
              <div class="grupo-partidos-list">${rows}</div>
            </div>`;
        }).join('')}
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(m => buildMatchCard(m)).join('');
}

// =============================================
// RENDER GROUPS
// =============================================
function renderGroups(groups, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = groups.map(g => {
    const isPan = g.panama;
    const sorted = [...g.teams].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.gf - a.gf;
    });

    const rows = sorted.map((t, i) => {
      const posClass = i === 0 ? 'qualify' : i === 1 ? 'third' : '';
      const isPanTeam = t.panama;
      return `
        <tr class="${isPanTeam ? 'panama-row' : ''}">
          <td><span class="group-row-pos ${posClass}">${i + 1}</span></td>
          <td><div class="team-cell"><span class="team-flag">${t.flag}</span><span class="team-name">${t.name}</span></div></td>
          <td>${t.pj}</td>
          <td>${t.pg}</td>
          <td>${t.pe}</td>
          <td>${t.pp}</td>
          <td>${t.gf}</td>
          <td>${t.gc}</td>
          <td>${t.dg > 0 ? '+' : ''}${t.dg}</td>
          <td class="pts-cell">${t.pts}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="group-card ${isPan ? 'group-panama' : ''} fade-in-up">
        <div class="group-card-header">
          <div class="group-card-title">Grupo ${g.id} ${isPan ? '🇵🇦' : ''}</div>
        </div>
        <table class="group-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>PJ</th>
              <th>PG</th>
              <th>PE</th>
              <th>PP</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join('');
}

// =============================================
// RENDER NEWS
// =============================================
function renderNews(noticias, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const featured = noticias.filter(n => n.destacada).slice(0, 1)[0];
  const rest = noticias.filter(n => !n.destacada || n !== featured).slice(0, 5);

  let html = '';

  if (featured) {
    html += `
      <div class="news-featured fade-in-up">
        <div class="news-featured-image">
          <span style="font-size:80px">${featured.categoria === 'Panamá' ? '🇵🇦' : featured.categoria === 'Resultados' ? '⚽' : '🏆'}</span>
        </div>
        <div class="news-featured-content">
          <span class="news-category-badge ${getCategoryClass(featured.categoria)}">${featured.categoria}</span>
          <div class="news-title">${featured.titulo}</div>
          <div class="news-summary">${featured.resumen}</div>
          <div class="news-footer">
            <div class="news-meta"><strong>${featured.fuente}</strong> · ${timeAgo(featured.fecha)}</div>
            <a href="${featured.url}" target="_blank" rel="noopener" class="btn-read-more">→ Leer reportaje</a>
          </div>
        </div>
      </div>
    `;
  }

  html += rest.map(n => `
    <div class="news-card fade-in-up">
      <div class="news-card-image">
        <span>${n.categoria === 'Panamá' ? '🇵🇦' : n.categoria === 'Resultados' ? '⚽' : '🌍'}</span>
      </div>
      <div class="news-card-content">
        <span class="news-category-badge ${getCategoryClass(n.categoria)}">${n.categoria}</span>
        <div class="news-title">${n.titulo}</div>
        <div class="news-summary">${n.resumen}</div>
        <div class="news-footer">
          <div class="news-meta"><strong>${n.fuente}</strong> · ${timeAgo(n.fecha)}</div>
          <a href="${n.url}" target="_blank" rel="noopener" class="btn-read-more">→ Leer reportaje</a>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

// =============================================
// PANAMA SECTION
// =============================================
function renderPanamaSection(matches) {
  const panamaMatches = matches.filter(isPanamaMatch);
  const nextMatch = panamaMatches.find(m => m.estado === 'programado');
  const pastMatches = panamaMatches.filter(m => m.estado === 'finalizado');

  // Próximo partido
  const nextEl = document.getElementById('panama-next-match');
  if (nextEl && nextMatch) {
    const rival = nextMatch.equipo1.panama ? nextMatch.equipo2 : nextMatch.equipo1;
    const pan = nextMatch.equipo1.panama ? nextMatch.equipo1 : nextMatch.equipo2;
    nextEl.innerHTML = `
      <div class="panama-next-match">
        <div class="panama-team highlight">
          <div class="panama-team-flag">${pan.flag}</div>
          <div class="panama-team-name">Panamá</div>
        </div>
        <div class="panama-vs">VS</div>
        <div class="panama-team">
          <div class="panama-team-flag">${rival.flag}</div>
          <div class="panama-team-name">${rival.nombre}</div>
        </div>
      </div>
      <div class="panama-match-meta">
        <div class="panama-match-date">📅 ${formatDateTime(nextMatch.fecha, nextMatch.hora)}</div>
        <div class="panama-match-venue">📍 ${nextMatch.ciudad}</div>
      </div>
    `;
  } else if (nextEl) {
    nextEl.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px">Sin próximos partidos programados.</p>';
  }

  // Resultados anteriores
  const resultsEl = document.getElementById('panama-results');
  if (resultsEl) {
    if (pastMatches.length === 0) {
      resultsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Aún no hay partidos jugados.</p>';
    } else {
      resultsEl.innerHTML = pastMatches.map(m => {
        const isPanFirst = m.equipo1.panama;
        const panGoals = isPanFirst ? m.marcador.g1 : m.marcador.g2;
        const rivGoals = isPanFirst ? m.marcador.g2 : m.marcador.g1;
        const rival = isPanFirst ? m.equipo2 : m.equipo1;
        let result = 'E';
        let badgeClass = 'badge-draw';
        let msg = 'Empate';
        if (panGoals > rivGoals) { result = 'V'; badgeClass = 'badge-win'; msg = 'Victoria'; }
        if (panGoals < rivGoals) { result = 'D'; badgeClass = 'badge-loss'; msg = 'Derrota'; }

        return `
          <div class="panama-result-item">
            <span class="panama-result-badge ${badgeClass}">${result}</span>
            <div class="panama-result-opponent">${rival.flag} vs ${rival.nombre}</div>
            <div class="panama-result-score">${panGoals} - ${rivGoals}</div>
          </div>
        `;
      }).join('');
    }
  }

  // Mensaje motivacional basado en último resultado
  const msgEl = document.getElementById('panama-message');
  if (msgEl) {
    let msgs = MENSAJES_EMPATE;
    let icon = '💪';

    if (pastMatches.length > 0) {
      const last = pastMatches[pastMatches.length - 1];
      const isPanFirst = last.equipo1.panama;
      const panGoals = isPanFirst ? last.marcador.g1 : last.marcador.g2;
      const rivGoals = isPanFirst ? last.marcador.g2 : last.marcador.g1;
      if (panGoals > rivGoals) { msgs = MENSAJES_VICTORIA; icon = '🎉'; }
      else if (panGoals < rivGoals) { msgs = MENSAJES_DERROTA; icon = '🔥'; }
    }

    const msg = msgs[Math.floor(Date.now() / 86400000) % msgs.length];
    msgEl.innerHTML = `
      <div class="panama-message-icon">${icon}</div>
      <div class="panama-message-text">${msg}</div>
      <div class="panama-message-sub">${renderFrase(getFraseDelDia())}</div>
    `;
  }
}

// =============================================
// TABS
// =============================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tab-container');
      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabGroup.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      const content = tabGroup.querySelector(`[data-tab-content="${target}"]`);
      if (content) content.classList.add('active');
    });
  });
}

// =============================================
// GROUP FILTER
// =============================================
function initGroupFilter(groups) {
  const btns = document.querySelectorAll('.group-filter-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      let toRender = groups;
      if (filter === 'panama') {
        toRender = groups.filter(g => g.panama);
      } else if (filter !== 'all') {
        toRender = groups.filter(g => g.id === filter);
      }
      renderGroups(toRender, 'groups-container');
    });
  });
}

// =============================================
// NAVBAR SCROLL
// =============================================
function initNavbar() {
  const nav = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// =============================================
// SMOOTH SCROLL for nav links
// =============================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// =============================================
// INTERSECTION OBSERVER — fade in on scroll
// =============================================
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in-up').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// =============================================
// LAST UPDATED
// =============================================
function updateLastUpdated(timestamp) {
  const el = document.getElementById('last-updated');
  if (el && timestamp) {
    const d = new Date(timestamp);
    el.textContent = d.toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' });
  }
}

// =============================================
// MAIN INIT
// =============================================
async function init() {
  initNavbar();
  initSmoothScroll();
  initTabs();

  // Frase del día
  const fraseEl = document.getElementById('hero-phrase');
  if (fraseEl) {
    fraseEl.innerHTML = renderFrase(getFraseDelDia());
  }

  // Cargar datos (fetch o datos embebidos)
  const embedded = getEmbeddedData();
  const [gruposData, partidosData, noticiasData] = await Promise.all([
    loadJSON('./resultados/grupos.json'),
    loadJSON('./resultados/partidos.json'),
    loadJSON('./noticias/noticias.json'),
  ]);

  const matches  = (partidosData || embedded.partidos)?.matches   || [];
  const groups   = (gruposData   || embedded.grupos)?.groups      || [];
  const noticias = (noticiasData || embedded.noticias)?.noticias  || [];

  // Update timestamps
  const ts = gruposData?.lastUpdated || embedded.grupos?.lastUpdated;
  if (ts) updateLastUpdated(ts);

  // Countdown: próximo partido de Panamá
  const nextPanamaMatch = matches.find(m => isPanamaMatch(m) && m.estado === 'programado');
  if (nextPanamaMatch) {
    document.getElementById('countdown-label') && (
      document.getElementById('countdown-label').textContent = '⏱ PRÓXIMO PARTIDO DE PANAMÁ'
    );
    startCountdown(nextPanamaMatch.fecha, nextPanamaMatch.hora, nextPanamaMatch);
  } else {
    const nextAnyMatch = matches.find(m => m.estado === 'programado');
    if (nextAnyMatch) startCountdown(nextAnyMatch.fecha, nextAnyMatch.hora, nextAnyMatch);
  }

  // Sección Panamá
  renderPanamaSection(matches);

  // Partidos de hoy (tabs)
  renderMatches(matches, 'matches-today', { filter: 'today' });
  renderMatches(matches, 'matches-all', { groupBy: true });
  renderMatches(matches, 'matches-upcoming', { filter: 'upcoming' });

  // Grupos
  renderGroups(groups, 'groups-container');
  initGroupFilter(groups);

  // Noticias
  renderNews(noticias, 'news-container');

  // Scroll animations (after render)
  setTimeout(initScrollAnimations, 100);
}

document.addEventListener('DOMContentLoaded', init);
