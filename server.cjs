// Servidor sin dependencias: sirve /dist (build de Vite) y guarda el estado compartido en data/state.json
const http = require('http');
const fs = require('fs');
const path = require('path');

const argPort = (process.argv.find((a) => a.startsWith('--port=')) || '').split('=')[1];
const PORT = argPort || process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'dist'); // resultado de `npm run build`
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE); // escritura atómica
}

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validRow(r) {
  return r && typeof r.id === 'string' && typeof r.client === 'string';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/state') {
    if (req.method === 'GET') {
      return sendJson(res, 200, readState() || { rows: null });
    }
    if (req.method === 'PUT') {
      try {
        const body = JSON.parse(await readBody(req));
        if (!Array.isArray(body.rows) || !body.rows.every(validRow)) {
          return sendJson(res, 400, { error: 'Formato de datos no válido' });
        }
        const state = {
          rows: body.rows,
          sla: Number(body.sla) > 0 ? Number(body.sla) : 3,
          source: body.source === 'excel' ? 'excel' : body.source === 'vacio' ? 'vacio' : 'manual',
          note: String(body.note || ''),
          updatedAt: Date.now(),
        };
        writeState(state);
        return sendJson(res, 200, { ok: true, updatedAt: state.updatedAt });
      } catch (e) {
        return sendJson(res, 400, { error: 'No se pudo guardar: ' + e.message });
      }
    }
    return sendJson(res, 405, { error: 'Método no permitido' });
  }

  // Archivos estáticos
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Prohibido');
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(rel === '/index.html' ? 'Falta compilar la interfaz: ejecuta `npm run build`.' : 'No encontrado');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SLA Dashboard corriendo en http://localhost:${PORT}`);
});