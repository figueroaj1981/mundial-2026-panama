/**
 * serve.js — Servidor local para el sitio del Mundial 2026
 * Puerto: 3026
 * Uso: node scheduler/serve.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3026;
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Seguridad: no salir del directorio raíz
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found: ' + urlPath);
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n⚽ Mundial 2026 — Servidor iniciado`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📁 Sirviendo: ${ROOT}`);
  console.log(`\nPresiona Ctrl+C para detener.\n`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} en uso. Intenta: http://localhost:${PORT}`);
  } else {
    console.error('Error del servidor:', err.message);
  }
  process.exit(1);
});
