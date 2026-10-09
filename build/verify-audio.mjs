// Check the sound that ships.
//
//   node build/verify-audio.mjs           exits 1 and lists every fault
//   node build/test-audio.mjs             plants faults to prove the checks catch them
//
// Three kinds of check:
//   FILES      every clip the manifest names exists and starts like an audio file;
//   COVERAGE   every word, ladder form, note term and sentence the app can speak has a clip;
//   PROVENANCE every recording by a real person is of a single word, its Commons file name contains that word,
//              and it names a speaker, a source and a licence. No sentence may be a human recording: the
//              only ones we ever found were wrong (they belonged to translations in other languages).

import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const norm = (x) => x.toLowerCase().replace(/ \(.*\)$/, '').trim();
export const nameHasWord = (file, word) => { const n = norm(file.replace(/\.\w+$/, '')); return n.split(/[-_ ]/).includes(word) || n.endsWith('-' + word); };

export function verifyAudio(deck, man, files = { exists: (f) => existsSync(join(ROOT, 'app', 'audio', f)), size: (f) => statSync(join(ROOT, 'app', 'audio', f)).size, magic: (f) => { const fd = openSync(join(ROOT, 'app', 'audio', f), 'r'); const b = Buffer.alloc(4); readSync(fd, b, 0, 4, 0); closeSync(fd); return b.toString('latin1'); } }) {
  const faults = [];
  const counts = { hw: 0, pw: 0, ps: 0 };
  for (const kind of ['w', 's']) {
    for (const [key, c] of Object.entries(man[kind])) {
      const id = `${kind}/${key}`;
      if (!files.exists(c.f)) { faults.push(`${id}: file ${c.f} is missing`); continue; }
      if (files.size(c.f) < 500) faults.push(`${id}: ${c.f} is too small to be audio`);
      const m = files.magic(c.f);
      if (!(m === 'OggS' || m.startsWith('ID3') || m.charCodeAt(0) === 0xff)) faults.push(`${id}: ${c.f} does not start like an ogg or mp3 file`);
      if (c.k === 'h') {
        if (kind === 's') { faults.push(`${id}: a sentence may not be a human recording`); continue; }
        counts.hw++;
        if (!c.by || !c.src || !c.lic) faults.push(`${id}: a recording with no speaker, source or licence (${[c.by, c.src, c.lic].map(String).join(' / ')})`);
        if (!c.file || !nameHasWord(c.file, key)) faults.push(`${id}: the Commons file "${c.file}" does not carry this word in its name`);
      } else if (c.k === 'p') { kind === 'w' ? counts.pw++ : counts.ps++; } else faults.push(`${id}: unknown clip kind`);
    }
  }
  const need = new Set();
  deck.words.forEach((w) => need.add('w/' + w.w.toLowerCase()));
  deck.items.filter((it) => it.k === 'form').forEach((it) => it.options.forEach((o) => need.add('w/' + o.toLowerCase())));
  deck.notes.forEach((n) => n.terms.forEach((t) => need.add('w/' + t.toLowerCase())));
  deck.sentences.forEach((s) => need.add('s/' + s.id));
  let missing = 0;
  for (const k of need) { const kind = k[0], key = k.slice(2); if (!man[kind][key]) { missing++; if (missing <= 8) faults.push(`no clip for ${k}`); } }
  if (missing > 8) faults.push(`…and ${missing - 8} more without a clip`);
  return { faults, counts, total: need.size, covered: need.size - missing };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
  const man = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'audio.json'), 'utf8'));
  const r = verifyAudio(deck, man);
  console.log(`clips: ${r.counts.hw} word recordings by real people, ${r.counts.pw} word + ${r.counts.ps} sentence computer-voice clips; ${r.covered} of ${r.total} spoken things covered`);
  console.log('credit:', man.voice?.p);
  if (r.faults.length) { console.error('VERIFY-AUDIO FAILED'); r.faults.forEach((f) => console.error('  ' + f)); process.exit(1); }
  console.log('verify-audio: OK');
}
