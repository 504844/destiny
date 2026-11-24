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

// Local viewer (/view): the overlays are see-through with white text, so on a plain browser tab
// they're invisible. This shows them on a dark backdrop at TikTok Studio's Link size, like on stream.
const VIEW = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Overlay viewer (local)</title>
<style>
  html, body { margin: 0; height: 100%; background: #1a1d21; color: #c9ced6; font: 13px system-ui, sans-serif; }
  .bar { display: flex; gap: 14px; align-items: center; padding: 8px 14px; border-bottom: 1px solid #2b2f35; }
  .bar a { color: #8fb4ff; }
  .bar select { background: #121418; color: inherit; border: 1px solid #3a3f46; border-radius: 6px; padding: 3px 6px; }
  .wrap { display: grid; place-items: center; height: calc(100% - 42px); }
  .box { position: relative; outline: 1px dashed #3a3f46; background: linear-gradient(160deg, #2a2f38, #14161a); }
  iframe { border: 0; width: 1080px; height: 1000px; transform-origin: top left; display: block; color-scheme: light; background: transparent; }
</style></head><body>
<div class="bar">
  <b>Local overlay viewer</b>
  <label>Page <select id="page">
    <option value="all">All in one (1080 x 1000)</option>
    <option value="prices">Prices</option><option value="commands">Chat commands</option><option value="gig">Gigs</option>
  </select></label>
  <a href="/stream/edit/" target="_blank">Open the editor</a>
  <span>Changes saved in the editor show here within a few seconds. Nothing here is live.</span>
</div>
<div class="wrap"><div class="box" id="box"><iframe id="f"></iframe></div></div>
<script>
  const f = document.getElementById('f'), box = document.getElementById('box'), sel = document.getElementById('page');
  const sizes = { all: [1080, 1000], prices: [900, 300], commands: [900, 200], gig: [900, 320] };
  function show() {
    const [w, h] = sizes[sel.value];
    f.style.width = w + 'px'; f.style.height = h + 'px';
    f.src = '/stream/' + sel.value + '/';
    fit();
  }
  function fit() {
    const [w, h] = sizes[sel.value];
    const s = Math.min((innerWidth - 40) / w, (innerHeight - 82) / h, 1);
    f.style.transform = 'scale(' + s + ')';
    box.style.width = w * s + 'px'; box.style.height = h * s + 'px';
  }
  sel.onchange = show; addEventListener('resize', fit); show();
</script></body></html>`;

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
    if (url.pathname === '/view' || url.pathname === '/view/') return send(res, 200, VIEW, 'text/html; charset=utf-8');
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
    console.log(`  viewer:  http://127.0.0.1:${port}/view  (overlays on a dark backdrop, like on stream)`);
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
