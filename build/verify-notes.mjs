// Check the culture, history and language notes against the articles they were written from.
//
//   node build/verify-notes.mjs          exits 1 and lists every fault
//
// A note shows only its claims. For each claim this checks that the quotation really is in the saved Wikipedia
// article (sources/notes/<src>.txt), that the sentence is 20 words or fewer, and, for each note, that every
// target-language term shown is in the article, that the quiz answers are backed by a claim, and that no wrong
// answer repeats the right one. Wrong answers that appear in the claim that gives the answer are listed for a
// human to look at: they are sometimes fine ("Swedish" in a question about what is NOT understood).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const words = (s) => s.split(/\s+/).filter(Boolean).length;

export function loadSource(src) {
  const f = join(ROOT, 'sources', 'notes', src + '.txt');
  if (!existsSync(f)) return null;
  const raw = readFileSync(f, 'utf8');
  const nl = raw.indexOf('\n');
  return { meta: JSON.parse(raw.slice(0, nl)), text: norm(raw.slice(nl + 1)) };
}

export function verifyNotes(NOTES, load = loadSource) {
  const faults = [], looks = [];
  const bad = (id, why) => faults.push(`${id}: ${why}`);
  const ids = new Set();
  for (const n of NOTES) {
    if (ids.has(n.id)) bad(n.id, 'duplicate note id'); ids.add(n.id);
    if (!['culture', 'history', 'language'].includes(n.kind)) bad(n.id, 'unknown kind ' + n.kind);
    const s = load(n.src);
    if (!s) { bad(n.id, `source ${n.src} is not saved`); continue; }
    const low = s.text.toLowerCase();
    n.claims.forEach((c, i) => {
      if (!c.q || !s.text.includes(norm(c.q))) bad(`${n.id}#${i}`, `quotation not found in ${n.src}: "${(c.q || '').slice(0, 60)}"`);
      if (words(c.t) > 20) bad(`${n.id}#${i}`, `sentence has ${words(c.t)} words (20 at most)`);
      if (c.t.includes(';')) bad(`${n.id}#${i}`, 'semicolon: write two sentences');
    });
    if (n.claims.length < 3 || n.claims.length > 8) bad(n.id, `${n.claims.length} claims (want 3 to 8)`);
    for (const t of n.terms || []) if (!low.includes(t.toLowerCase())) bad(n.id, `term "${t}" is not in the article`);
    if (!n.quiz?.length) bad(n.id, 'no quiz questions');
    for (const [k, q] of (n.quiz || []).entries()) {
      const id = `${n.id}/q${k}`;
      const c = n.claims[q.claim];
      if (!c) { bad(id, 'no such claim'); continue; }
      if (!norm(c.t).toLowerCase().includes(norm(q.answer).toLowerCase())) bad(id, `answer "${q.answer}" is not stated in claim ${q.claim}`);
      const all = [q.answer, ...q.wrong].map((x) => x.toLowerCase());
      if (new Set(all).size !== all.length || q.wrong.length !== 3) bad(id, 'options must be 4 different answers');
      for (const w of q.wrong) { if (norm(c.t).toLowerCase().includes(w.toLowerCase())) looks.push(`${id}: wrong answer "${w}" appears in the claim that gives the answer`); }
      if (words(q.ask) > 20) bad(id, 'question is longer than 20 words');
    }
  }
  return { faults, looks };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const { NOTES } = await import(pathToFileURL(join(ROOT, 'content', 'notes.mjs')).href);
  const { faults, looks } = verifyNotes(NOTES);
  looks.forEach((l) => console.log('look: ' + l));
  if (faults.length) { console.error(`VERIFY-NOTES FAILED: ${faults.length} fault(s)`); faults.forEach((f) => console.error('  ' + f)); process.exit(1); }
  console.log(`verify-notes: OK — ${NOTES.length} notes, ${NOTES.reduce((a, n) => a + n.claims.length, 0)} claims quoted from their articles, ${NOTES.reduce((a, n) => a + n.quiz.length, 0)} quiz questions`);
}
