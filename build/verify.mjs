// Check the SHIPPED deck (app/data/deck.json) against the corpus it was built from.
//
//   node build/verify.mjs          exits 1 and lists every fault if anything is wrong
//
// This reads the built deck, not the build script, so a deck that is older than the corpus, or edited
// by hand, is caught. For every question the answer is re-derived from Wiktionary (corpus/lexicon.json)
// or Tatoeba (corpus/sentences.json) and compared.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const { GLOSS } = await import(pathToFileURL(join(ROOT, 'content', 'glosses.mjs')).href);

export function verifyDeck(deck, LEX, SENTS) {
  const faults = [];
  const bad = (id, why) => faults.push(`${id}: ${why}`);
  const byWord = new Map(deck.words.map((w, i) => [w.w, i]));

  // the lexicon, as one lookup: key -> { glosses:Set, gen, parts, decl }
  const lex = new Map();
  if (Array.isArray(LEX)) for (const r of LEX) lex.set(`${r.w}|${r.pos}`, { glosses: new Set(r.entries.flatMap((e) => e.senses.map((s) => s.g))), gen: r.entries[0]?.gen, decl: r.entries[0]?.decl });
  else for (const [k, r] of Object.entries(LEX)) lex.set(k, { glosses: new Set(r.senses.map((s) => s.g)), gen: r.gen, parts: r.parts });
  const sent = new Map(SENTS.map((s) => [s.id, s]));

  deck.words.forEach((w, i) => {
    const e = lex.get(w.key);
    if (!e) return bad(w.w, 'not in the Wiktionary extract');
    if (!e.glosses.has(w.g) && GLOSS[w.w] !== w.g) bad(w.w, `gloss "${w.g}" is not a Wiktionary sense and not a hand-checked override`);
    if (w.stage == null || !deck.stages[w.stage]?.words.includes(i)) bad(w.w, 'not in its stage');
  });
  const ids = new Set();
  for (const it of deck.items) {
    if (ids.has(it.id)) bad(it.id, 'duplicate id'); ids.add(it.id);
    const w = deck.words[it.i];
    if (!w) { bad(it.id, 'no such word'); continue; }
    const o = it.options || [];
    if (o.some((x) => x == null || String(x).trim() === '' || /^(null|undefined)$/.test(String(x)))) bad(it.id, 'empty or null option');
    if (new Set(o.map((x) => String(x).toLowerCase())).size !== o.length) bad(it.id, 'duplicate options');
    if (!o.includes(it.answer)) bad(it.id, 'answer not among options');
    if (o.length < 2) bad(it.id, 'fewer than two options');
    const e = lex.get(w.key);
    switch (it.k) {
      case 'read': case 'listen':
        if (it.answer !== w.g) bad(it.id, 'answer is not the word’s gloss');
        for (const x of o) if (x !== w.g && deck.words.some((v) => v.w === w.w && v.g === x)) bad(it.id, 'distractor equals the answer');
        break;
      case 'recall':
        if (it.answer !== w.w) bad(it.id, 'answer is not the word');
        for (const x of o) if (x !== w.w && !byWord.has(x)) bad(it.id, `distractor "${x}" is not a deck word`);
        break;
      case 'gender': {
        const g = LANG.genders[e?.gen];
        if (!g || it.answer !== g.key) bad(it.id, `gender answer ${it.answer} differs from Wiktionary (${e?.gen})`);
        break;
      }
      case 'cloze': {
        const s = deck.sentences[it.sent];
        const src = s && sent.get(s.id);
        if (!src || src.t !== s.t) bad(it.id, 'sentence is not a Tatoeba sentence');
        else if (it.pre + it.answer + it.post !== src.t) bad(it.id, 'the gap does not rebuild the sentence');
        if (it.answer.toLowerCase() !== w.w) bad(it.id, 'the gap is not the word');
        if (src && o.some((x) => x !== it.answer && src.t.toLowerCase().split(/[^\p{L}]+/u).includes(x.toLowerCase()))) bad(it.id, 'a distractor is already in the sentence');
        break;
      }
      case 'form': {
        let truth, same = [];
        if (LANG.id === 'da') { const p = e?.parts; truth = { pr: p?.pr, pa: p?.pa, pf: (p?.pf || '').split(' ').pop() }[it.id.split('/')[2]]; }
        else { truth = e?.decl?.[it.id.split('/')[2]]?.[0]; if (e?.decl) same = e.decl[it.id.split('/')[2]]; }
        if (!truth || truth !== it.answer) bad(it.id, `form answer "${it.answer}" differs from Wiktionary ("${truth}")`);
        for (const x of o) if (x !== it.answer && same.includes(x)) bad(it.id, 'a distractor is another valid form of the same slot');
        break;
      }
      default: bad(it.id, 'unknown question kind ' + it.k);
    }
  }
  return faults;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const deck = read('app/data/deck.json');
  const faults = verifyDeck(deck, read('corpus/lexicon.json'), read('corpus/sentences.json'));
  if (faults.length) { console.error(`VERIFY FAILED: ${faults.length} fault(s)`); faults.slice(0, 40).forEach((f) => console.error('  ' + f)); process.exit(1); }
  const by = {};
  for (const it of deck.items) by[it.k] = (by[it.k] || 0) + 1;
  console.log(`verify: OK — ${deck.words.length} words, ${deck.items.length} questions re-derived from the corpus`, by);
}
