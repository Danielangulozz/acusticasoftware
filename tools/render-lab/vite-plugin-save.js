import fs from 'node:fs';
import path from 'node:path';

/**
 * Plugin de Vite (solo `vite dev`) para el laboratorio de renders de POZOLE.
 *
 * El laboratorio (tools/render-lab/index.html) dibuja las escenas 3D en el navegador y
 * envía cada imagen terminada a este endpoint, que la escribe en disco:
 *
 *   POST /__render-lab/save?dir=renders&name=studio-day.webp   → public/renders/
 *   POST /__render-lab/save?dir=qa&name=prueba.jpg             → node_modules/.cache/pozole-qa/
 *
 * Solo acepta peticiones desde la propia máquina, nombres de archivo simples y
 * extensiones de imagen. No existe en el build de producción.
 */
const TARGETS = {
  renders: 'public/renders',
  qa: 'node_modules/.cache/pozole-qa',
};
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,80}\.(webp|png|jpg|json)$/i;
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MAX_BYTES = 40 * 1024 * 1024;

export default function renderLabSave() {
  return {
    name: 'pozole-render-lab-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__render-lab/save', (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const dir = TARGETS[url.searchParams.get('dir') || 'renders'];
        const name = url.searchParams.get('name') || '';
        if (req.method !== 'POST' || !LOOPBACK.has(req.socket.remoteAddress) || !dir || !SAFE_NAME.test(name)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_BYTES) req.destroy();
          else chunks.push(chunk);
        });
        req.on('end', () => {
          const outDir = path.resolve(server.config.root, dir);
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, name), Buffer.concat(chunks));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, file: `${dir}/${name}`, bytes: size }));
        });
      });
    },
  };
}
