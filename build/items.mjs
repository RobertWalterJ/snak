// Build the deck the app loads: words + sentences + questions -> app/data/deck.json
//
//   node build/items.mjs
//
// The same file builds Snak and Saga; content/lang.mjs says what differs. Every answer comes from a source:
//   word meanings, genders, verb parts, noun tables  <- English Wiktionary (corpus/words.json)
//   example sentences and their English            <- Tatoeba (corpus/sentences.json) and Wiktionary examples
// Distractors (wrong answers) are real words or forms taken from other entries, never invented.
// build/verify.mjs re-derives every answer from the corpus and fails the build if one differs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const WORDS = JSON.parse(readFileSync(join(ROOT, 'corpus', 'words.json'), 'utf8'));
const SENTS = JSON.parse(readFileSync(join(ROOT, 'corpus', 'sentences.json'), 'utf8'));


// a small seeded random source, so the same corpus always gives the same deck
let seed = 20261008;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pickN = (pool, n) => shuffle(pool).slice(0, n);

const cuts = LANG.stageCuts;
const stageOfRank = (r) => { const i = cuts.findIndex((c) => r <= c); return i < 0 ? cuts.length - 1 : i; };
const words = WORDS.slice(0, cuts[cuts.length - 1]);
words.forEach((w, i) => { w.stage = stageOfRank(i + 1); });
const stages = cuts.map((c, n) => ({ id: 's' + (n + 1), title: LANG.stageTitles[n], why: LANG.stageWhy[n], words: words.map((w, i) => (w.stage === n ? i : -1)).filter((i) => i >= 0), gate: 0.6 }));

// ── example sentences: a sentence whose words include the headword exactly ──
const tok = (t) => t.toLowerCase().replace(/[.,!?;:"“”„«»()¿¡]/g, ' ').split(/\s+/).filter(Boolean);
const sentIdx = new Map();                                  // token -> sentence indexes
SENTS.forEach((s, i) => { s.tokens = tok(s.t); for (const w of new Set(s.tokens)) { if (!sentIdx.has(w)) sentIdx.set(w, []); sentIdx.get(w).push(i); } });
const sentences = [];                                       // only the ones used
const sentSlot = new Map();
const useSentence = (i) => { if (!sentSlot.has(i)) { sentSlot.set(i, sentences.length); sentences.push({ id: SENTS[i].id, t: SENTS[i].t, e: SENTS[i].e }); } return sentSlot.get(i); };
const examples = {};                                        // word index -> [sentence slot]
const clozeOf = new Map();                                  // word index -> sentence index (for the gap question)
words.forEach((w, i) => {
  const hits = (sentIdx.get(w.w) || []).filter((s) => SENTS[s].tokens.length <= 9).sort((a, b) => SENTS[a].t.length - SENTS[b].t.length);
  const take = hits.slice(0, 2);
  if (take.length) { examples[i] = take.map(useSentence); clozeOf.set(i, take[0]); }
});

// ── questions ──
const items = [];
const glossOf = (w) => w.g.toLowerCase();
const nearby = (i, test, span = 180) => {
  const out = [];
  for (let d = 1; d <= span && out.length < 40; d++) for (const j of [i - d, i + d]) if (words[j] && test(words[j], j)) out.push(j);
  return out;
};
const sameKind = (i) => nearby(i, (x) => x.k === words[i].k && glossOf(x) !== glossOf(words[i]) && !glossOf(x).includes(glossOf(words[i])) && !glossOf(words[i]).includes(glossOf(x)) && x.w !== words[i].w);

words.forEach((w, i) => {
  const pool = sameKind(i);
  if (pool.length < 3) return;
  const dg = [], usedG = new Set([glossOf(w)]);
  for (const j of shuffle(pool)) { if (dg.length === 3) break; const g = glossOf(words[j]); if (usedG.has(g)) continue; usedG.add(g); dg.push(words[j]); }
  if (dg.length < 3) return;
  items.push({ id: `rd/${w.w}`, k: 'read', i, stage: w.stage, answer: w.g, options: shuffle([w.g, ...dg.map((x) => x.g)]), level: 1 });
  items.push({ id: `rc/${w.w}`, k: 'recall', i, stage: w.stage, answer: w.w, options: shuffle([w.w, ...dg.map((x) => x.w)]), level: 2 });
  items.push({ id: `ls/${w.w}`, k: 'listen', i, stage: w.stage, answer: w.g, options: shuffle([w.g, ...dg.map((x) => x.g)]), level: 2, needsVoice: true });
  if (w.k === 'n' && w.gen && LANG.genders[w.gen]) items.push({ id: `gn/${w.w}`, k: 'gender', i, stage: w.stage, answer: LANG.genders[w.gen].key, options: Object.values(LANG.genders).map((g) => g.key), level: 3 });
  if (clozeOf.has(i)) {
    const s = SENTS[clozeOf.get(i)];
    const alts = pickN(nearby(i, (x) => x.k === w.k && x.w !== w.w && !s.tokens.includes(x.w), 120), 3).map((j) => words[j].w);
    if (alts.length === 3) {
      const at = s.tokens.indexOf(w.w);
      const segs = s.t.split(new RegExp(`(?<![\\p{L}])${w.w}(?![\\p{L}])`, 'iu'));
      const surface = (s.t.match(new RegExp(`(?<![\\p{L}])${w.w}(?![\\p{L}])`, 'iu')) || [w.w])[0];
      // a gap at the start of a sentence is capitalised: capitalise every option, so case never gives the answer away
      const cased = (x) => (surface[0] !== surface[0].toLowerCase() ? x[0].toUpperCase() + x.slice(1) : x);
      if (at >= 0 && segs.length === 2) items.push({ id: `cz/${w.w}`, k: 'cloze', i, stage: w.stage, sent: sentSlot.get(clozeOf.get(i)), pre: segs[0], post: segs[1], answer: surface, options: shuffle([surface, ...alts.map(cased)]), level: 3 });
    }
  }
});

// ── the ladder ──
const ladder = { id: LANG.ladder.id, title: LANG.ladder.title, intro: LANG.ladder.intro, rungs: [] };
if (LANG.id === 'da') {
  const verbs = words.map((w, i) => [w, i]).filter(([w]) => w.k === 'v' && w.parts && w.parts.pr && w.parts.pa && w.parts.pf && !/\s/.test(w.parts.pa + w.parts.pr));
  // Wiktionary gives either the bare participle (haft) or the whole perfect (har været): keep the participle
  for (const [w] of verbs) { const p = w.parts.pf.split(' '); w.parts.pp = p.length === 1 ? p[0] : (['har', 'er'].includes(p[0]) && p.length === 2 ? p[1] : null); }
  verbs.splice(0, verbs.length, ...verbs.filter(([w]) => w.parts.pp));
  const SLOTS = [['pr', 'present tense (what happens now)'], ['pa', 'past tense (what happened)'], ['pf', 'past participle (as in "har ___")']];
  ladder.rungs = SLOTS.map(([s, t]) => ({ id: s, title: t }));
  const top = verbs.slice(0, 160);
  for (const [w, i] of top) {
    for (const [ri, [slot]] of SLOTS.entries()) {
      const answer = w.parts[slot === 'pf' ? 'pp' : slot];
      const own = ['inf', 'pr', 'pa', 'pp'].map((s) => w.parts[s]).filter((x) => x && x !== answer);
      const others = verbs.filter(([, j]) => j !== i).map(([x]) => x.parts[slot === 'pf' ? 'pp' : slot]).filter((x) => x && x !== answer && !own.includes(x));
      const opts = [...new Set([...pickN([...new Set(own)], 2), ...pickN(others, 3)])].slice(0, 3);
      if (opts.length < 3) continue;
      items.push({ id: `vb/${w.w}/${slot}`, k: 'form', i, rung: ri, stage: Math.min(cuts.length - 1, w.stage + ri), answer, prompt: `at ${w.w}`, ask: SLOTS[ri][1], options: shuffle([answer, ...opts]), level: 3 + ri });
    }
  }
} else {
  const nouns = words.map((w, i) => [w, i]).filter(([w]) => w.k === 'n' && w.decl);
  ladder.rungs = LANG.ladder.slots.map(([s, t]) => ({ id: s, title: t }));
  const top = nouns.slice(0, 220);
  for (const [w, i] of top) {
    for (const [ri, [slot, label]] of LANG.ladder.slots.entries()) {
      const answer = w.decl[slot][0];
      const isForm = (f) => typeof f === 'string' && /\p{L}/u.test(f);           // a table cell can hold a dash for a form that does not exist
      const own = Object.entries(w.decl).filter(([s]) => s !== slot).map(([, f]) => f[0]).filter((f) => isForm(f) && f !== answer);
      const others = nouns.filter(([, j]) => j !== i).map(([x]) => x.decl[slot][0]).filter((f) => isForm(f) && f !== answer && !own.includes(f));
      const opts = [...new Set([...pickN([...new Set(own)], 2), ...pickN(others, 3)])].slice(0, 3);
      if (opts.length < 3) continue;
      items.push({ id: `dc/${w.w}/${slot}`, k: 'form', i, rung: ri, stage: Math.min(cuts.length - 1, w.stage + Math.floor(ri / 2)), answer, prompt: w.w, ask: label, options: shuffle([answer, ...opts]), level: 3 + ri });
    }
  }
}

// ── notes: culture, history and language readings, each from a saved Wikipedia article (build/verify-notes.mjs) ──
const { NOTES } = await import(pathToFileURL(join(ROOT, 'content', 'notes.mjs')).href);
const { loadSource } = await import(pathToFileURL(join(ROOT, 'build', 'verify-notes.mjs')).href);
const notes = NOTES.map((n) => { const src = loadSource(n.src).meta; return { id: n.id, kind: n.kind, title: n.title, gate: n.gate, terms: n.terms || [], claims: n.claims.map((c) => c.t), source: { title: src.title, revid: src.revid, url: src.url, license: src.license } }; });
NOTES.forEach((n, ni) => n.quiz.forEach((q, k) => items.push({ id: `nq/${n.id}/${k}`, k: 'note', n: ni, stage: stageOfRank(n.gate + 1), claim: q.claim, ask: q.ask, answer: q.answer, options: shuffle([q.answer, ...q.wrong]), level: 3 })));

mkdirSync(join(ROOT, 'app', 'data'), { recursive: true });
const deck = { built: new Date().toISOString().slice(0, 10), lang: { id: LANG.id, app: LANG.app, slug: LANG.slug, name: LANG.name, native: LANG.native, voice: LANG.voice, genders: LANG.genders, genderPrompt: LANG.genderPrompt, genderHelp: LANG.genderHelp, pronNote: LANG.pronNote, themes: LANG.themes }, stages, words, sentences, examples, ladder, notes, items };
writeFileSync(join(ROOT, 'app', 'data', 'deck.json'), JSON.stringify(deck));
const by = {};
for (const it of items) by[it.k] = (by[it.k] || 0) + 1;
console.log(`deck: ${words.length} words · ${stages.length} stages · ${sentences.length} sentences · ${items.length} questions`, by);
