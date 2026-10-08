// Check the sound that ships: every clip the manifest names exists and is audio, every word and sentence the
// app can speak has a clip, and every recording by a real person names its speaker and source.
//
//   node build/verify-audio.mjs

import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const man = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'audio.json'), 'utf8'));
const faults = [];
const magic = (f) => { const fd = openSync(f, 'r'); const b = Buffer.alloc(4); readSync(fd, b, 0, 4, 0); closeSync(fd); return b.toString('latin1'); };

let human = { w: 0, s: 0 }, machine = { w: 0, s: 0 };
for (const kind of ['w', 's']) {
  for (const [key, c] of Object.entries(man[kind])) {
    const f = join(ROOT, 'app', 'audio', c.f);
    if (!existsSync(f)) { faults.push(`${kind}/${key}: file ${c.f} is missing`); continue; }
    if (statSync(f).size < 500) faults.push(`${kind}/${key}: ${c.f} is too small to be audio`);
    const m = magic(f);
    if (!(m === 'OggS' || m.startsWith('ID3') || m.charCodeAt(0) === 0xff)) faults.push(`${kind}/${key}: ${c.f} does not start like an ogg or mp3 file`);
    if (c.k === 'h') { human[kind]++; if (!c.by || !c.src) faults.push(`${kind}/${key}: a real-person recording with no speaker or source`); }
    else if (c.k === 'p') machine[kind]++; else faults.push(`${kind}/${key}: unknown clip kind`);
  }
}
// everything the app offers a speaker button for
const need = new Set();
deck.words.forEach((w) => need.add('w/' + w.w.toLowerCase()));
deck.items.filter((it) => it.k === 'form').forEach((it) => it.options.forEach((o) => need.add('w/' + o.toLowerCase())));
deck.notes.forEach((n) => n.terms.forEach((t) => need.add('w/' + t.toLowerCase())));
deck.sentences.forEach((s) => need.add('s/' + s.id));
let missing = 0;
for (const k of need) { const [kind, key] = [k[0], k.slice(2)]; if (!man[kind][key]) { missing++; if (missing <= 8) faults.push(`no clip for ${k}`); } }
if (missing > 8) faults.push(`…and ${missing - 8} more without a clip`);
const total = need.size;
console.log(`clips: ${human.w} word + ${human.s} sentence recordings by real people, ${machine.w} word + ${machine.s} sentence computer-voice clips; ${total - missing} of ${total} spoken things covered`);
console.log('credit:', man.voice?.p);
if (faults.length) { console.error('VERIFY-AUDIO FAILED'); faults.forEach((f) => console.error('  ' + f)); process.exit(1); }
console.log('verify-audio: OK');
