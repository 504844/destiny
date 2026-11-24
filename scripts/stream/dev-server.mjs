// Local test server for the stream overlays (public/stream).
// Serves public/ and a stand-in for /api/stream that keeps the content in a local JSON file.
// Any PIN is accepted. Nothing here talks to the live site, Vercel or the Blob store.
//
//   npm run stream:dev                 -> http://127.0.0.1:8765/stream/edit/
//   node scripts/stream/dev-server.mjs --port 8799 --store some.json
//
// Also used by scripts/stream/check.mjs (startServer).
import { createServer } from 'node:http';
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '../../public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
};

// three gigs in the future, so all three cards show
export function sampleData() {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  return {
    gig: {
      show: true,
      items: [
        { date: day(11), venue: 'Graffitti Underground', place: '', city: 'Kaunas', tag: 'TRANCE' },
        { date: day(25), venue: 'Test Club', place: '', city: 'Vilnius', tag: 'TECHNO' },
        { date: day(46), venue: 'Third Venue', place: '', city: 'Riga', tag: 'HOUSE' },
      ],
    },
  };
}

export async function startServer({ port = 8765, store, seed = sampleData(), quiet = false } = {}) {
  store = store || join(tmpdir(), 'dj-stream-dev.json');
  await mkdir(dirname(store), { recursive: true });
  try { await stat(store); } catch { await writeFile(store, JSON.stringify(seed, null, 2)); }

  const send = (res, status, body, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  async function api(req, res) {
    if (req.method === 'GET') {
      let data = null;
      try { data = JSON.parse(await readFile(store, 'utf8')); } catch { data = null; }
      return send(res, 200, { data });
    }
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      let j;
      try { j = JSON.parse(body); } catch { return send(res, 400, { error: 'Bad request' }); }
      if (typeof j.pin !== 'string' || !j.pin.trim()) return send(res, 401, { error: 'Wrong PIN' });
      if (j.check) return send(res, 200, { ok: true });
      if (!j.data || typeof j.data !== 'object' || Array.isArray(j.data)) return send(res, 400, { error: 'Nothing to save' });
      await writeFile(store, JSON.stringify(j.data, null, 2));
      return send(res, 200, { ok: true, savedAt: new Date().toISOString() });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/stream') return api(req, res);
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[\\/]+/, '');
    if (rel.split(/[\\/]/).includes('..')) return send(res, 403, 'Forbidden', 'text/plain');
    let file = join(PUBLIC, rel);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      send(res, 200, await readFile(file), TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
    } catch {
      send(res, 404, 'Not found', 'text/plain');
    }
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', ok); });
  if (!quiet) {
    console.log(`Stream overlays, local test server (any PIN works, content in ${store})`);
    console.log(`  editor:  http://127.0.0.1:${port}/stream/edit/`);
    console.log(`  overlay: http://127.0.0.1:${port}/stream/all/`);
  }
  return { server, store, url: `http://127.0.0.1:${port}` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  startServer({ port: Number(arg('--port')) || 8765, store: arg('--store') }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
