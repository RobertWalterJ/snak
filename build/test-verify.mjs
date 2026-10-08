// Does verify.mjs actually catch faults? Plant one deliberate fault at a time in a copy of the shipped
// deck and require verifyDeck to report it. A check that has never failed has not been shown to work.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDeck } from './verify.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const LEX = read('corpus/lexicon.json'), SENTS = read('corpus/sentences.json');
const fresh = () => structuredClone(read('app/data/deck.json'));
const swap = (o, a) => o.find((x) => x !== a);

const FAULTS = {
  'a wrong gloss on a word': (d) => { d.words[5].g = 'a banana'; },
  'a read answer that is not the gloss': (d) => { const it = d.items.find((x) => x.k === 'read'); it.answer = swap(it.options, it.answer); },
  'an answer missing from the options': (d) => { const it = d.items.find((x) => x.k === 'recall'); it.options = it.options.map((x) => (x === it.answer ? 'zzz' : x)); },
  'duplicate options': (d) => { const it = d.items.find((x) => x.k === 'read'); it.options[1] = it.options[0]; },
  'a null option': (d) => { const it = d.items.find((x) => x.k === 'listen'); it.options[2] = 'null'; },
  'a wrong gender answer': (d) => { const it = d.items.find((x) => x.k === 'gender'); it.answer = swap(it.options, it.answer); },
  'a cloze whose gap does not rebuild the sentence': (d) => { const it = d.items.find((x) => x.k === 'cloze'); it.post = it.post + ' x'; },
  'a cloze with a distractor already in the sentence': (d) => { const it = d.items.find((x) => x.k === 'cloze'); const s = d.sentences[it.sent].t.split(/[^\p{L}]+/u).find((t) => t.length > 1 && t.toLowerCase() !== it.answer.toLowerCase()); if (s) { const k = it.options.findIndex((x) => x !== it.answer); it.options[k] = s.toLowerCase(); } },
  'a wrong form answer': (d) => { const it = d.items.find((x) => x.k === 'form'); const w = swap(it.options, it.answer); it.answer = w; },
  'a duplicate question id': (d) => { d.items.push({ ...d.items[0] }); },
  'a word taken out of its stage': (d) => { d.stages[0].words.shift(); },
  'a sentence that is not in Tatoeba': (d) => { const it = d.items.find((x) => x.k === 'cloze'); d.sentences[it.sent].t = d.sentences[it.sent].t + '!'; },
};

let miss = 0;
const clean = verifyDeck(fresh(), LEX, SENTS);
if (clean.length) { console.error('the unmodified deck already fails:', clean.slice(0, 3)); process.exit(1); }
for (const [name, plant] of Object.entries(FAULTS)) {
  const d = fresh();
  plant(d);
  const found = verifyDeck(d, LEX, SENTS);
  if (!found.length) { miss++; console.error(`NOT CAUGHT: ${name}`); } else console.log(`caught: ${name}`);
}
console.log(miss ? `test-verify: ${miss} fault(s) went unnoticed` : `test-verify: OK — all ${Object.keys(FAULTS).length} planted faults were caught`);
process.exit(miss ? 1 : 0);
