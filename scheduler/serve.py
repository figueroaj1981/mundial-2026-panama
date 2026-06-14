"""
serve.py — Servidor local para el sitio del Mundial 2026 (Python)
Puerto: 3026
Uso: python scheduler/serve.py
"""

import http.server
import socketserver
import os
import sys

PORT = 3026
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):
        pass  # silenciar logs

os.chdir(ROOT)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"\n⚽ Mundial 2026 — Servidor iniciado")
    print(f"🌐 http://localhost:{PORT}")
    print(f"📁 Sirviendo: {ROOT}")
    print(f"\nPresiona Ctrl+C para detener.\n")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
