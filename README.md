# ⚽ Mundial FIFA 2026 — Sitio Web Panameño

> Centro de seguimiento del Mundial FIFA 2026 con identidad visual panameña.  
> Diseñado con orgullo desde Panamá 🇵🇦

---

## Estructura del proyecto

```
pagina-web-del-mundial/
├── index.html                  → Página principal
├── resultados/
│   ├── grupos.json             → Clasificación por grupos (16 grupos)
│   ├── partidos.json           → Resultados y partidos programados
│   └── clasificacion.json      → Clasificados a ronda de 32
├── noticias/
│   └── noticias.json           → Noticias del día
├── assets/
│   ├── css/styles.css          → Estilos principales (tema Panamá)
│   └── js/app.js               → Lógica del sitio
├── scheduler/
│   ├── update_worldcup.js      → Scheduler principal (ejecutar a las 6 AM)
│   ├── fetch_results.js        → Obtiene resultados de APIs externas
│   ├── fetch_news.js           → Obtiene noticias de APIs externas
│   ├── serve.js                → Servidor local (puerto 3026)
│   └── setup-task.bat          → Registra tarea en Windows (admin)
├── logs/
│   ├── update.log              → Log de actualizaciones
│   └── last_update.json        → Resumen de última actualización
└── .claude/launch.json         → Configuración del servidor para preview
```

---

## Inicio rápido

### Ver el sitio ahora

```bash
cd pagina-web-del-mundial
node scheduler/serve.js
```

Abre en el navegador: **http://localhost:3026**

---

## Actualización automática diaria

### Opción 1: Windows Task Scheduler (recomendado)

1. Haz clic derecho en `scheduler/setup-task.bat`
2. Selecciona **Ejecutar como administrador**
3. La tarea se registra para ejecutarse todos los días a las **6:00 AM**

Para ejecutar manualmente:
```cmd
schtasks /Run /TN "MundialFIFA2026_Update"
```

### Opción 2: Loop automático (Node.js)

```bash
node scheduler/update_worldcup.js --watch
```

Mantiene el proceso activo y actualiza cada 24 horas.

### Opción 3: Ejecución manual

```bash
node scheduler/update_worldcup.js
```

---

## APIs externas (opcionales)

Para datos en tiempo real, configura estas variables de entorno:

### football-data.org (resultados)
1. Regístrate gratis en https://www.football-data.org/
2. Obtén tu API key
3. Configura:
   ```cmd
   set FOOTBALL_DATA_API_KEY=tu_api_key_aqui
   ```

### NewsAPI.org (noticias)
1. Regístrate gratis en https://newsapi.org/
2. Obtén tu API key
3. Configura:
   ```cmd
   set NEWS_API_KEY=tu_api_key_aqui
   ```

Sin estas variables, el sitio funciona con datos locales que se actualizan en timestamp solamente.

---

## Qué hace la actualización diaria

Cada ejecución de `update_worldcup.js` realiza:

1. **Backup** de todos los archivos JSON actuales
2. **Resultados** → intenta obtener de football-data.org
3. **Noticias** → intenta obtener de NewsAPI.org
4. **Resumen** → guarda `logs/last_update.json`
5. **Restaura** backups si algo falla

---

## Secciones del sitio

| Sección | Descripción |
|---------|-------------|
| 🏠 Hero | Cuenta regresiva al próximo partido de Panamá + frase del día |
| 🇵🇦 Panamá | Próximo partido, resultados anteriores, mensaje motivacional |
| ⚽ Resultados | Partidos de hoy, todos los partidos, próximos |
| 📊 Grupos | Tabla de clasificación de los 16 grupos (A–P) |
| 📰 Noticias | Últimas noticias con énfasis en Panamá |
| 🏟 Sedes | Los 16 estadios del Mundial (USA, México, Canadá) |
| 🏆 Historia | Campeones históricos y récords del torneo |

---

## Frases diarias de Panamá

El sistema genera automáticamente una frase de apoyo diferente cada día. Las frases incluyen:

- Mensajes de victoria (cuando Panamá gana)
- Mensajes de resiliencia (cuando Panamá pierde)
- Mensajes de ánimo (empates y partidos futuros)

---

## Tecnologías

- **Frontend**: HTML5, CSS3 (custom), JavaScript vanilla (ES2020)
- **Datos**: JSON estático servido localmente
- **Servidor**: Node.js (http nativo, sin dependencias)
- **Scheduler**: Node.js + Windows Task Scheduler
- **Diseño**: Glassmorphism dark theme · Colores Panamá

Sin dependencias npm. Solo Node.js instalado es suficiente.

---

## Logs

```bash
# Ver log en tiempo real
Get-Content logs\update.log -Wait -Tail 50

# Ver última actualización
cat logs\last_update.json
```

---

*Mundial FIFA 2026 · USA · México · Canadá · 🇵🇦 Panamá está en el Mundial*
