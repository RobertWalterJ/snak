// Snak — service worker: the app works offline once it has been opened.
//
// Two caches. The shell is snak-v-<build>; clips the learner saved for offline use are snak-audio, which this worker never deletes.
// The shell cache is named snak-v-<build>. This worker deletes ONLY caches that start with "snak-v-" and are
// not the current one. Other apps share this origin (robertwalterj.github.io): never delete a cache that
// is not ours. The manifest is never cached, so a change to it is always seen.

const BUILD = 'dev';                                   // stamped per deploy by build/make-deploy.mjs
const NAME = 'snak-v-' + BUILD;
const OURS = /^snak-v-/;
const SHELL = ['./', 'index.html', 'style.css', 'fonts/fonts.css', 'js/app.js', 'js/ui.js', 'js/store.js', 'js/sched.js', 'js/voice.js', 'js/audio.js', 'js/vendor/ts-fsrs.mjs', 'data/deck.json', 'icons/icon-192.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(NAME).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => OURS.test(k) && k !== NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('manifest.webmanifest')) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.status === 200 && url.pathname.startsWith(new URL('./', location).pathname)) { const copy = res.clone(); caches.open(NAME).then((c) => c.put(e.request, copy)); }
    return res;
  })));
});
