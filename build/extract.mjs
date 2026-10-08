// Snak — from the open sources to corpus/*.json.
//
//   node build/extract.mjs
//
// Sources (see README.md for licences):
//   FrequencyWords da_50k (hermitdave, CC BY-SA 4.0): how often each spelling is said in
//       Danish film and TV subtitles (OpenSubtitles).
//   English Wiktionary via kaikki.org (CC BY-SA): meanings, IPA, gender, inflected forms,
//       verb principal parts. Every gloss in the deck comes from one of its senses.
//
// Output:
//   corpus/lexicon.json   lemma entries (pos, glosses, ipa, gender, forms, verb parts, etymology)
//   corpus/freq.json      lemma|pos -> weight, built from the subtitle counts by lemmatising
//
// Lemmatising: a subtitle spelling is mapped to a headword in this order.
//   1. If Wiktionary lists it as a verb/adjective form (present, past, participle, ...) of a
//      headword, that headword gets the count.
//   2. If it is also a headword itself, the count is split equally between the two readings.
//   3. A noun/adjective inflection (plural, definite) maps to its headword.
//   4. An imperative-only reading is ignored when the spelling is a headword itself
//      (hus is a noun, not the imperative of huse).

import { createReadStream, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(ROOT, 'corpus'), { recursive: true });

export const POS_OK = { noun: 'n', verb: 'v', adj: 'adj', adv: 'adv', pron: 'pron', prep: 'prep', conj: 'conj', det: 'det', num: 'num', intj: 'intj', article: 'det', particle: 'part' };
const BAD_TAGS = new Set(['obsolete', 'archaic', 'dated', 'rare', 'historical', 'dialectal', 'vulgar', 'offensive', 'derogatory', 'poetic', 'no-gloss', 'ethnic', 'slur', 'euphemistic', 'abbreviation', 'misspelling', 'uncommon']);

const isFormSense = (s) => !!(s.form_of?.length || s.alt_of?.length) || (s.tags || []).includes('form-of') || (s.tags || []).includes('alt-of');

const entries = [];                     // raw, reduced
const rl = createInterface({ input: createReadStream(join(ROOT, 'sources', 'kaikki-da.jsonl'), { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line) continue;
  const e = JSON.parse(line);
  if (e.lang_code !== 'da') continue;
  entries.push({
    word: e.word, pos: e.pos, senses: (e.senses || []).map((s) => ({ glosses: s.glosses || [], tags: s.tags || [], raw_tags: s.raw_tags || [], form_of: (s.form_of || []).map((f) => f.word), alt_of: (s.alt_of || []).map((f) => f.word) })),
    forms: (e.forms || []).map((f) => ({ form: f.form, tags: f.tags || [], source: f.source || null })),
    ipa: (e.sounds || []).map((x) => x.ipa).filter(Boolean),
    head: e.head_templates?.[0]?.args || {},
    etym: e.etymology_text || null,
  });
}
console.log(`Wiktionary Danish entries: ${entries.length.toLocaleString()}`);

// ── index by spelling ────────────────────────────────────────────────────
const byWord = new Map();
for (const e of entries) { if (!byWord.has(e.word)) byWord.set(e.word, []); byWord.get(e.word).push(e); }
const nonForm = (e) => e.senses.some((s) => !isFormSense(s));
const lemmaEntries = (w) => (byWord.get(w) || []).filter((e) => POS_OK[e.pos] && nonForm(e));

// form-of targets of an entry: [{lemma, tags}]
function formTargets(e) {
  const out = [];
  for (const s of e.senses) for (const l of s.form_of) out.push({ lemma: l, tags: s.tags, pos: e.pos });
  return out;
}

// ── frequency, lemmatised ────────────────────────────────────────────────
const CLOSED = new Set(['pron', 'prep', 'conj', 'article', 'det', 'adv', 'intj', 'num', 'particle']);
const PRIORITY = ['pron', 'prep', 'conj', 'article', 'det', 'adv', 'intj', 'num', 'particle', 'verb', 'adj', 'noun'];
const freq = new Map();                 // 'lemma|pos' -> weight
const add = (lemma, pos, n) => { const k = lemma + '|' + pos; freq.set(k, (freq.get(k) || 0) + n); };
let tokens = 0, unmapped = 0;
for (const line of readFileSync(join(ROOT, 'sources', 'da_50k.txt'), 'utf8').split('\n')) {
  const [tok, c] = line.trim().split(' ');
  const n = parseInt(c, 10);
  if (!tok || !n) continue;
  tokens++;
  const own = lemmaEntries(tok);
  const readings = [];                  // {lemma,pos}
  for (const e of byWord.get(tok) || []) {
    for (const f of formTargets(e)) {
      if (f.tags.includes('imperative') && own.length) continue;         // hus is a noun, not the imperative of huse
      const targets = lemmaEntries(f.lemma);
      const pick = targets.find((t) => t.pos === e.pos) || targets[0];
      if (pick) readings.push({ lemma: f.lemma, pos: pick.pos });
    }
  }
  if (own.length) {
    const best = own.slice().sort((a, b) => PRIORITY.indexOf(a.pos) - PRIORITY.indexOf(b.pos))[0];
    // An open-class headword (a noun such as skal "shell") does not compete with a verb form (skal "shall"):
    // the form reading takes the whole count. A closed-class one (ved "by") shares it.
    if (!readings.length || CLOSED.has(best.pos)) readings.push({ lemma: tok, pos: best.pos });
  }
  const uniq = [...new Map(readings.map((r) => [r.lemma + '|' + r.pos, r])).values()];
  if (!uniq.length) { unmapped++; continue; }
  for (const r of uniq) add(r.lemma, r.pos, n / uniq.length);
}
console.log(`subtitle spellings read: ${tokens.toLocaleString()}; with no Wiktionary headword: ${unmapped.toLocaleString()}`);

// ── lexicon: only the lemmas that have any frequency ─────────────────────
const cleanGloss = (g) => g.replace(/\s+/g, ' ').trim();
const lexicon = {};
for (const [k, wt] of freq) {
  const [w, pos] = k.split('|');
  const es = lemmaEntries(w).filter((e) => e.pos === pos);
  if (!es.length) continue;
  const e = es[0];
  const senses = [];
  for (const s of e.senses) {
    if (isFormSense(s)) continue;
    if (s.tags.some((t) => BAD_TAGS.has(t))) continue;
    const g = cleanGloss(s.glosses[s.glosses.length - 1] || '');
    if (!g) continue;
    senses.push({ g, tags: s.tags });
  }
  const anyBad = e.senses.filter((s) => !isFormSense(s)).some((s) => s.tags.some((t) => ['vulgar', 'offensive', 'derogatory', 'slur', 'ethnic'].includes(t)));
  const lm = { w, pos, k: POS_OK[pos], weight: wt, senses, ipa: e.ipa, anyBad };
  // gender (nouns): the headword line, else the sense tags — only when they agree
  if (pos === 'noun') {
    const g = e.head.g;
    const tagG = new Set(e.senses.flatMap((s) => s.tags).filter((t) => t === 'common-gender' || t === 'neuter').map((t) => (t === 'neuter' ? 'n' : 'c')));
    let gen = null;
    if (g === 'c' || g === 'n') gen = (tagG.size === 0 || (tagG.size === 1 && tagG.has(g))) ? g : null;
    else if (!g && tagG.size === 1) gen = [...tagG][0];
    lm.gen = gen;
    lm.sg_def = e.forms.find((f) => f.tags.includes('definite') && f.tags.includes('singular') && !f.tags.includes('genitive'))?.form || null;
    lm.pl_indef = e.forms.find((f) => f.tags.includes('indefinite') && f.tags.includes('plural') && !f.tags.includes('genitive'))?.form || null;
  }
  if (pos === 'verb') {
    const f = (...tags) => e.forms.find((x) => !x.source && tags.every((t) => x.tags.includes(t)) && x.tags.length === tags.length)?.form || null;
    lm.parts = { inf: e.forms.find((x) => x.source === 'conjugation' && x.tags.length === 2 && x.tags.includes('active') && x.tags.includes('infinitive'))?.form || null, pr: f('present'), pa: f('past'), pf: f('perfect') || f('participle', 'past') };
    lm.parts.pfSrc = f('perfect') ? 'perfect' : f('participle', 'past') ? 'participle' : null;
  }
  if (e.etym) lm.etym = e.etym;
  lexicon[k] = lm;
}
writeFileSync(join(ROOT, 'corpus', 'lexicon.json'), JSON.stringify(lexicon));
writeFileSync(join(ROOT, 'corpus', 'freq.json'), JSON.stringify([...freq].sort((a, b) => b[1] - a[1])));

// ── spelling -> [lemma|pos], for turning sentence tokens into headwords ──
const spell = {};
const put = (sp, k) => { (spell[sp] ||= []); if (!spell[sp].includes(k)) spell[sp].push(k); };
for (const k of Object.keys(lexicon)) {
  const [w, pos] = k.split('|');
  put(w.toLowerCase(), k);
  const es = lemmaEntries(w).filter((e) => e.pos === pos);
  for (const e of es) for (const f of e.forms) {
    if (f.source === 'conjugation' || f.source === 'declension' || !f.source) {
      if (/^(no-table-tags|inflection-box-top|da-.*|.*-infl.*)$/.test(f.form) || f.form.includes(' ') || f.form === '-') continue;
      put(f.form.toLowerCase(), k);
    }
  }
}
// forms listed on their own pages (plural of X, past of Y) also point at their headword
for (const e of entries) for (const f of formTargets(e)) {
  if (f.tags.includes('imperative')) continue;
  const targets = lemmaEntries(f.lemma).filter((t) => lexicon[f.lemma + '|' + t.pos]);
  for (const t of targets) if (t.pos === e.pos || targets.length === 1) put(e.word.toLowerCase(), f.lemma + '|' + t.pos);
}
writeFileSync(join(ROOT, 'corpus', 'spellings.json'), JSON.stringify(spell));
console.log(`lemmas with frequency: ${Object.keys(lexicon).length.toLocaleString()}; spellings indexed: ${Object.keys(spell).length.toLocaleString()}`);
