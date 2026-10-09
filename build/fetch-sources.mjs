// Download the open data this app is built from, into sources/ (not kept in git: it is large).
//
//   node build/fetch-sources.mjs        then:  npm run corpus
//
// Files that are already there are kept. Everything is open data; see CREDITS.md for the licences.

import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const T = 'https://downloads.tatoeba.org/exports/per_language';
const code = LANG.audio.tatoeba;                                     // 'dan' or 'isl'
const FILES = {
  da: [['kaikki-da.jsonl', 'https://kaikki.org/dictionary/Danish/kaikki.org-dictionary-Danish.jsonl'], ['da_50k.txt', 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/da/da_50k.txt']],
  is: [['kaikki-is.jsonl', 'https://kaikki.org/dictionary/Icelandic/kaikki.org-dictionary-Icelandic.jsonl'], ['is_50k.txt', 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/is/is_50k.txt']],
}[LANG.id].concat([
  [`${code}_sentences.tsv.bz2`, `${T}/${code}/${code}_sentences.tsv.bz2`],
  [`${code}-eng_links.tsv.bz2`, `${T}/${code}/${code}-eng_links.tsv.bz2`],
  ['eng_sentences.tsv.bz2', `${T}/eng/eng_sentences.tsv.bz2`],
]);
mkdirSync(join(ROOT, 'sources'), { recursive: true });
for (const [name, url] of FILES) {
  const to = join(ROOT, 'sources', name);
  if (existsSync(to) && statSync(to).size > 1000) { console.log('have', name); continue; }
  console.log('fetching', name);
  const r = await fetch(url, { headers: { 'User-Agent': `${LANG.app} source fetch (personal learning app)` } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(to));
}
console.log('done. Next: npm run corpus (words, sentences), npm run notes (Wikipedia articles), then npm run deck.');
