// Stream overlay content for /stream/* pages.
// GET  /api/stream          -> { data } (CDN-cached, purged on every save)
// GET  /api/stream?fresh=1  -> same, never cached (used by the editor)
// POST /api/stream          -> { pin, check: true } verifies the PIN
//                              { pin, data } saves new content
import { get, put, BlobNotFoundError } from '@vercel/blob';
import { invalidateByTag } from '@vercel/functions';
import { createHash, timingSafeEqual } from 'node:crypto';

const PATH = 'stream/overlays.json';
const TAG = 'stream-overlays';
const MAX_BYTES = 40_000;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pinMatches(pin: unknown): boolean {
  const expected = process.env.STREAM_EDIT_PIN;
  if (!expected || typeof pin !== 'string') return false;
  const a = createHash('sha256').update(pin.trim()).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

async function readData(): Promise<unknown> {
  try {
    const r = await get(PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch (e) {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  }
}

async function handleGet(request: Request) {
  const fresh = new URL(request.url).searchParams.has('fresh');
  const data = await readData();
  if (fresh) return json({ data });
  return json({ data }, 200, {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vercel-CDN-Cache-Control': 'max-age=86400',
    'Vercel-Cache-Tag': TAG,
  });
}

async function handlePost(request: Request) {
  let body: { pin?: unknown; check?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  if (!pinMatches(body.pin)) {
    await sleep(800); // slows down guessing
    return json({ error: 'Wrong PIN' }, 401);
  }
  if (body.check) return json({ ok: true });

  const data = body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ error: 'Nothing to save' }, 400);
  }
  const text = JSON.stringify(data);
  if (text.length > MAX_BYTES) return json({ error: 'Too much text' }, 413);

  const savedAt = new Date().toISOString();
  await put(PATH, text, {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  // keep every version so an old one can be restored by hand if needed
  await put(`stream/history/${savedAt.replace(/[:.]/g, '-')}.json`, text, {
    access: 'private',
    contentType: 'application/json',
  });
  await invalidateByTag(TAG);
  return json({ ok: true, savedAt });
}

export default {
  async fetch(request: Request) {
    try {
      if (request.method === 'GET') return await handleGet(request);
      if (request.method === 'POST') return await handlePost(request);
      return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
    } catch (e) {
      console.error('stream api error', e);
      return json({ error: 'Server error, try again' }, 500);
    }
  },
};
