// Download the recordings by real people that build/audio-plan.mjs found, and credit every speaker.
//
//   node build/audio-plan.mjs && node build/fetch-audio.mjs
//
// Words: Wikimedia Commons (Lingua Libre and older files). Sentences: Tatoeba recordings that still answer.
// Clips are named by a hash of the word, or by the Tatoeba sentence id, never by the word's rank, so a deck
// that is rebuilt in a different order cannot point a clip at the wrong word. app/data/audio-human.json records, for
// each clip, who made it, where it came from and under what licence. Files already on disk are kept, so this
// can be stopped and run again.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const plan = JSON.parse(readFileSync(join(ROOT, 'build', '_audio-plan.json'), 'utf8'));
const DIR = join(ROOT, 'app', 'audio', 'h');
mkdirSync(DIR, { recursive: true });
// recordings by real people go in their own file; the computer-voice generator merges it into data/audio.json
const MAN = join(ROOT, 'app', 'data', 'audio-human.json');
const man = { w: {}, s: {} };
const UA = `${LANG.app}/0.1 (a personal language-learning app; wjster@gmail.com)`;
export const hash = (t) => createHash('md5').update(t.toLowerCase()).digest('hex').slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const jobs = [];
for (const w of plan.words) { const text = deck.words[w.i].w; jobs.push({ kind: 'w', key: text.toLowerCase(), urls: [[w.url, 'mp3'], [w.orig, /\.(ogg|oga)$/i.test(w.f) ? 'ogg' : null]].filter((u) => u[1]), name: `w-${hash(text)}`, meta: { by: w.by, src: w.src, file: w.f } }); }
for (const s of plan.sentences) jobs.push({ kind: 's', key: String(s.id), urls: [[`https://tatoeba.org/en/audio/download/${s.aid}`, 'mp3']], name: `s-${s.id}`, meta: { by: s.by, src: 'Tatoeba', lic: s.lic } });

let pausedUntil = 0, done = 0;
const failed = [];
const get = async (j) => {
  for (const [url, ext] of j.urls) {
    const file = join(DIR, `${j.name}.${ext}`);
    if (existsSync(file) && statSync(file).size > 800) return `h/${j.name}.${ext}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = pausedUntil - Date.now(); if (wait > 0) await sleep(wait);
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
        if (r.status === 429 || r.status >= 500) { pausedUntil = Math.max(pausedUntil, Date.now() + ((Number(r.headers.get('retry-after')) || 15) + 2) * 1000); continue; }
        if (!r.ok) break;                                  // 404: try the next url
        const buf = Buffer.from(await r.arrayBuffer());
        if (!/audio|octet/.test(r.headers.get('content-type') || '') || buf.length < 800) break;
        writeFileSync(file, buf);
        return `h/${j.name}.${ext}`;
      } catch { await sleep(1500); }
    }
  }
  return null;
};
const queue = [...jobs];
const worker = async () => {
  while (queue.length) {
    const j = queue.shift();
    const f = await get(j);
    if (f) man[j.kind][j.key] = { k: 'h', f, ...j.meta }; else failed.push(j.key);
    if (++done % 50 === 0) console.log(`  ${done}/${jobs.length} (${failed.length} failed)`);
    await sleep(j.kind === 'w' ? 350 : 100);
  }
};
await Promise.all(Array.from({ length: 3 }, worker));
writeFileSync(MAN, JSON.stringify(man));
console.log(`recordings by real people: ${Object.keys(man.w).length} words, ${Object.keys(man.s).length} sentences; ${failed.length} failed${failed.length ? ': ' + failed.slice(0, 8).join(', ') : ''}`);
