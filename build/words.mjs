// Snak — pick the learner deck's words: corpus/lexicon.json + freq.json -> corpus/words.json
//
//   node build/words.mjs
//
// Words are ranked by lemmatised subtitle frequency. A word is kept only if Wiktionary gives it a
// short, plain sense (no invented glosses), it is not a name, an abbreviation, a vulgar word or a
// multi-word phrase. Change DECK_SIZE to scale the deck.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DECK_SIZE = 2000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { GLOSS, DROP } = await import(pathToFileURL(join(ROOT, 'content', 'glosses.mjs')).href);
const { badWord } = await import(pathToFileURL(join(ROOT, 'content', 'unsuitable.mjs')).href);
const LEX = JSON.parse(readFileSync(join(ROOT, 'corpus', 'lexicon.json'), 'utf8'));
const FREQ = JSON.parse(readFileSync(join(ROOT, 'corpus', 'freq.json'), 'utf8'));

const okGloss = (g) => g.length >= 2 && g.length <= 42 && !/^\(|\bform of\b|\binflection\b|^alternative|^obsolete|^abbreviation|^initialism|^plural of|^definite|^letter/i.test(g) && !g.includes('.') && !g.includes(';');

const out = [];
const seen = new Set();
for (const [k, weight] of FREQ) {
  if (out.length >= DECK_SIZE) break;
  const lm = LEX[k];
  if (!lm) continue;
  const w = lm.w;
  if (seen.has(w)) continue;
  if (!/^[a-zæøåéèüö]+(-[a-zæøåéèüö]+)?$/.test(w)) continue;           // no names, no apostrophes, no phrases
  if (w.length < 2 && !['i', 'å'].includes(w)) continue;
  if (lm.anyBad || badWord(w)) continue;
  const gl = [];
  for (const s of lm.senses) if (okGloss(s.g) && !gl.includes(s.g)) gl.push(s.g);
  if (DROP.has(w)) continue;
  if (GLOSS[w]) { const o = GLOSS[w]; const i = gl.indexOf(o); if (i >= 0) gl.splice(i, 1); gl.unshift(o); }
  if (!gl.length) continue;
  if (lm.k === 'v' && (!lm.parts || !lm.parts.pr)) { /* kept as a word; just not in the verb ladder */ }
  seen.add(w);
  const ipa = lm.ipa.find((x) => x.startsWith('/')) || null;
  const ipa2 = lm.ipa.find((x) => x.startsWith('[')) || null;
  const rec = { w, k: lm.k, r: out.length + 1, g: gl[0], alt: gl.slice(1, 3), ipa, ipa2, key: k };
  if (lm.k === 'v') rec.d = 'at ' + w;
  if (lm.k === 'n') { if (lm.gen) rec.gen = lm.gen; if (lm.sg_def) rec.sgDef = lm.sg_def; if (lm.pl_indef) rec.plIndef = lm.pl_indef; }
  if (lm.k === 'v' && lm.parts) rec.parts = lm.parts;
  if (lm.k === 'num' && lm.etym) rec.etym = lm.etym;
  out.push(rec);
}
writeFileSync(join(ROOT, 'corpus', 'words.json'), JSON.stringify(out));
const by = {};
for (const x of out) by[x.k] = (by[x.k] || 0) + 1;
console.log(`words: ${out.length}`, by);
console.log(out.slice(0, 40).map((x) => `${x.w}=${x.g}`).join(' | '));
