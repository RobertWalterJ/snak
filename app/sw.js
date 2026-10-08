// Snak — service worker: the app opens and works offline once it has been opened.
//
// THIS APP SHARES ITS ORIGIN (robertwalterj.github.io) WITH OTHER APPS. So:
//   - every cache here starts with "snak-", and this worker only ever deletes or reads caches that start with it;
//   - it never uses the global caches.match(), which would search every app's caches;
//   - the manifest is never cached, so a change to it is always seen.
// Two caches: snak-v-<build> (the shell, replaced on every deploy) and snak-audio (clips the learner chose to
// keep for offline use, never deleted by an update).
// build/make-deploy.mjs stamps the build and the list of hashed files below.

const PREFIX = 'snak-';
const BUILD = 'dev';                                    // stamped per deploy
const NAME = PREFIX + 'v-' + BUILD;
const AUDIO = PREFIX + 'audio';
const SHELL = ['./'];                                   // filled in per deploy

self.addEventListener('install', (e) => { e.waitUntil(caches.open(NAME).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX + 'v-') && k !== NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// look in our own caches only
async function ours(req) {
  for (const k of await caches.keys()) { if (!k.startsWith(PREFIX)) continue; const hit = await (await caches.open(k)).match(req, { ignoreSearch: true }); if (hit) return hit; }
  return null;
}
// an <audio> element asks for a byte range; a cached whole file has to be cut to match, or playback fails
async function rangeOf(req, res) {
  const range = req.headers.get('range');
  if (!range || res.status !== 200) return res;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const buf = await res.arrayBuffer();
  const start = m && m[1] ? Number(m[1]) : 0, end = m && m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('manifest.webmanifest')) return;
  const here = new URL('./', location).pathname;
  if (!url.pathname.startsWith(here)) return;           // not ours: leave it alone
  // the page itself: network first, so a new deploy is noticed; the cached copy is for offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { if (res.status === 200) { const copy = res.clone(); caches.open(NAME).then((c) => c.put('./', copy)); } return res; }).catch(async () => (await (await caches.open(NAME)).match('./')) || Response.error()));
    return;
  }
  // clips: from the saved audio cache if the learner saved them, otherwise the network (not stored automatically)
  if (url.pathname.startsWith(here + 'audio/')) {
    e.respondWith((async () => { const hit = await ours(req); if (hit) return rangeOf(req, hit); return fetch(req); })());
    return;
  }
  // everything else is named by its content, so cache-first is safe
  e.respondWith((async () => {
    const hit = await ours(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.status === 200) { const copy = res.clone(); caches.open(NAME).then((c) => c.put(req, copy)); }
    return res;
  })());
});
