import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.resolve('data', 'data.json');

// Persists contacts/messages to data/data.json through GET/PUT /api/data (dev and preview servers).
function jsonFileStorage() {
  const handler = (req, res, next) => {
    if (req.url.split('?')[0] !== '/api/data') return next();

    if (req.method === 'GET') {
      if (!fs.existsSync(DATA_FILE)) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      return res.end(fs.readFileSync(DATA_FILE));
    }

    if (req.method === 'PUT') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!parsed || !Array.isArray(parsed.contacts)) throw new Error('invalid payload');
          fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
          const tmp = `${DATA_FILE}.tmp`;
          fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2));
          fs.renameSync(tmp, DATA_FILE);
          res.statusCode = 204;
        } catch {
          res.statusCode = 400;
        }
        res.end();
      });
      return;
    }

    res.statusCode = 405;
    res.end();
  };

  return {
    name: 'json-file-storage',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

// Single-file build so dist/index.html can be opened directly from disk (file://).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile(), jsonFileStorage()],
});
