// Does verify-audio catch the faults that actually happened? Plant each one in a copy of the real manifest.
//
//   node build/test-audio.mjs

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAudio } from './verify-audio.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const real = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'audio.json'), 'utf8'));
const fresh = () => structuredClone(real);
const firstHuman = (m) => Object.entries(m.w).find(([, c]) => c.k === 'h');

const FAULTS = {
  // the real bug: sentence recordings that belonged to other sentences
  'a sentence marked as a human recording': (m) => { const [id, c] = Object.entries(m.s)[0]; m.s[id] = { ...c, k: 'h', by: 'someone', src: 'Tatoeba', lic: 'CC BY 4.0' }; },
  'a recording whose file is for a different word': (m) => { const [k, c] = firstHuman(m); c.file = 'LL-Q1 (xxx)-Speaker-zzzzzz.wav'; },
  'a recording with no licence': (m) => { const [k, c] = firstHuman(m); delete c.lic; },
  'a recording with no speaker': (m) => { const [k, c] = firstHuman(m); c.by = ''; },
  'a manifest entry pointing at a missing file': (m) => { const k = Object.keys(m.w)[3]; m.w[k] = { ...m.w[k], f: 'p/does-not-exist.ogg' }; },
  'a word with no clip at all': (m) => { delete m.w[deck.words[2].w.toLowerCase()]; },
  'a sentence with no clip at all': (m) => { delete m.s[String(deck.sentences[2].id)]; },
};

const clean = verifyAudio(deck, real);
if (clean.faults.length) { console.error('the real manifest already fails:', clean.faults.slice(0, 3)); process.exit(1); }
let miss = 0;
for (const [name, plant] of Object.entries(FAULTS)) {
  const m = fresh(); plant(m);
  const found = verifyAudio(deck, m).faults;
  if (!found.length) { miss++; console.error(`NOT CAUGHT: ${name}`); } else console.log(`caught: ${name}`);
}
console.log(miss ? `test-audio: ${miss} fault(s) went unnoticed` : `test-audio: OK — all ${Object.keys(FAULTS).length} planted faults were caught`);
process.exit(miss ? 1 : 0);
