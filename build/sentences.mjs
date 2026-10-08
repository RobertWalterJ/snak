// Tatoeba sentences with a human English translation -> corpus/sentences.json
//
//   node build/sentences.mjs
//
// Sources (CC BY 2.0 FR, Tatoeba contributors): the target-language sentence export, the links to English,
// and the English sentence export. A sentence is kept if it is short (3-11 words), has an English
// translation, and passes the suitability filter in content/unsuitable.mjs (read on the English).
// The same file is used by Snak and Saga; what differs is content/lang.mjs.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const { unsuitable } = await import(pathToFileURL(join(ROOT, 'content', 'unsuitable.mjs')).href);
const S = (f) => join(ROOT, 'sources', f);

// the exports come bzip2-compressed; unpack once, with the Python that ships with most machines
for (const f of [LANG.tatoeba.sentences, LANG.tatoeba.links, 'eng_sentences.tsv']) {
  if (!existsSync(S(f)) && existsSync(S(f + '.bz2'))) {
    execFileSync('python', ['-c', 'import bz2,sys,shutil;shutil.copyfileobj(bz2.open(sys.argv[1],"rb"),open(sys.argv[2],"wb"))', S(f + '.bz2'), S(f)]);
  }
}
const lines = (f) => readFileSync(S(f), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));

const eng = new Map(lines('eng_sentences.tsv').map((r) => [r[0], r[2]]));
const link = new Map();
for (const r of lines(LANG.tatoeba.links)) if (!link.has(r[0])) link.set(r[0], r[1]);

const out = [];
const seen = new Set();
for (const [id, , text] of lines(LANG.tatoeba.sentences)) {
  const e = eng.get(link.get(id));
  if (!e || !text) continue;
  const n = text.split(/\s+/).length;
  if (n < 3 || n > 11 || text.length > 90) continue;
  if (unsuitable(e) || unsuitable(text)) continue;
  if (/[0-9@#]/.test(text)) continue;
  const key = text.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({ id: Number(id), t: text, e });
}
writeFileSync(join(ROOT, 'corpus', 'sentences.json'), JSON.stringify(out));
console.log(`sentences kept: ${out.length.toLocaleString()} of ${link.size.toLocaleString()} linked`);
