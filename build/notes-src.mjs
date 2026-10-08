// Save the Wikipedia articles the notes are written from: full plain text + the exact revision.
//
//   node build/notes-src.mjs
//
// Text is CC BY-SA 4.0 (Wikipedia contributors). Each file starts with a header naming the article, the
// revision id and the URL of that revision, so a note can say exactly what it was written from.
// build/verify-notes.mjs later checks that every sentence in a note is backed by a quote found in these files.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { TOPICS } = await import(pathToFileURL(join(ROOT, 'content', 'notes-topics.mjs')).href);
mkdirSync(join(ROOT, 'sources', 'notes'), { recursive: true });
export const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const [kind, title] of TOPICS) {
  if (existsSync(join(ROOT, 'sources', 'notes', slug(title) + '.txt'))) continue;          // already saved: keep that exact revision
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|revisions&explaintext=1&exlimit=1&titles=${encodeURIComponent(title)}&format=json&rvprop=ids|timestamp&redirects=1`;
  let page;
  for (let t = 0; t < 6 && !page; t++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'LanguageNotesBuilder/0.1 (personal learning app)' } }); if (r.ok) { const j = await r.json(); page = Object.values(j.query.pages)[0]; } } catch { /* retry */ }
    if (!page) await new Promise((r) => setTimeout(r, 4000));
  }
  if (!page || page.missing != null || !page.extract) { console.error('MISSING', title); continue; }
  const rev = page.revisions?.[0];
  const head = JSON.stringify({ kind, title: page.title, revid: rev?.revid, timestamp: rev?.timestamp, url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title.replace(/ /g, '_'))}&oldid=${rev?.revid}`, license: 'CC BY-SA 4.0, Wikipedia contributors' });
  writeFileSync(join(ROOT, 'sources', 'notes', slug(title) + '.txt'), head + '\n' + page.extract);
  console.log('saved', title, '·', page.extract.length, 'chars · rev', rev?.revid);
  await new Promise((r) => setTimeout(r, 1500));
}
