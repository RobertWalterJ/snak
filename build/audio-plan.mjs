// Which words have a recording by a real person, and where is it?
//
//   node build/items.mjs && node build/audio-plan.mjs
//
// Three places, all on Wikimedia Commons (free licences; each file's own page names its licence):
//   1. Lingua Libre recordings, "LL-Q<language> (<code>)-<speaker>-<word>.wav" (CC0 or CC BY-SA, by speaker)
//   2. older single-word files, "Da-<word>.ogg" / "Is-<word>.ogg"
//   3. the audio files Wiktionary links from a word's entry (kaikki "sounds")
// A word keeps at most one recording; Lingua Libre wins because its speaker and licence are on record.
// Writes build/_audio-plan.json: { words: [{ i, f, by, src, url, orig }], }

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const UA = `${LANG.app}/0.1 (a personal language-learning app; https://github.com/RobertWalterJ/snak)`;
const AUDIO_EXT = /\.(wav|ogg|oga|mp3|flac)$/i;
const wordIndex = new Map(deck.words.map((w, i) => [w.w.toLowerCase(), i]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Commons keeps a transcoded mp3 of audio files at a path derived from the md5 of the file name
const commonsUrls = (file) => {
  let u = file.replace(/ /g, '_');
  u = u.charAt(0).toUpperCase() + u.slice(1);                    // Commons stores a file name with a capital first letter
  const md5 = createHash('md5').update(u).digest('hex');
  const enc = encodeURIComponent(u).replace(/\(/g, '%28').replace(/\)/g, '%29');
  const dir = `${md5[0]}/${md5.slice(0, 2)}`;
  return { mp3: `https://upload.wikimedia.org/wikipedia/commons/transcoded/${dir}/${enc}/${enc}.mp3`, orig: `https://upload.wikimedia.org/wikipedia/commons/${dir}/${enc}` };
};

async function listPrefix(prefix) {
  const out = [];
  let cont = null;
  do {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    for (const [k, v] of Object.entries({ action: 'query', list: 'allpages', apnamespace: 6, apprefix: prefix, aplimit: 500, format: 'json', ...(cont ? { apcontinue: cont } : {}) })) url.searchParams.set(k, v);
    let j;
    for (let t = 0; t < 5 && !j; t++) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (r.ok) j = await r.json(); } catch { /* retry */ } if (!j) await sleep(3000); }
    if (!j) break;
    for (const p of j.query.allpages) out.push(p.title.replace(/^File:/, ''));
    cont = j.continue?.apcontinue || null;
    await sleep(300);
  } while (cont);
  return out;
}

const cand = new Map();                                      // word index -> [{ f, by, src, ...urls }]
const add = (i, c) => { if (!cand.has(i)) cand.set(i, []); if (!cand.get(i).some((x) => x.f === c.f)) cand.get(i).push(c); };

// The word a file name says it is. A file may be named by a speaker with a hyphen in their name, so every split is tried,
// and only a split whose right-hand side is a word of the deck counts.
const norm = (x) => x.toLowerCase().replace(/ \(.*\)$/, '').trim();
const nameHasWord = (file, word) => norm(file.replace(/\.\w+$/, '')).split(/[-_ ]/).includes(word) || norm(file.replace(/\.\w+$/, '')).endsWith('-' + word);
// 1. Lingua Libre
for (const f of (await listPrefix(LANG.audio.ll)).filter((f) => AUDIO_EXT.test(f))) {
  const m = /^LL-Q\d+ \(\w+\)-(.+)\.\w+$/.exec(f);
  if (!m) continue;
  const parts = m[1].split('-');
  for (let k = 1; k < parts.length; k++) {
    const word = norm(parts.slice(k).join('-')), speaker = parts.slice(0, k).join('-');
    if (wordIndex.has(word)) { add(wordIndex.get(word), { f, by: speaker, src: 'Lingua Libre', rank: 0, ...commonsUrls(f) }); break; }
  }
}
// 2. older Da-/Is- files
for (const f of (await listPrefix(LANG.audio.old)).filter((f) => AUDIO_EXT.test(f))) {
  const word = f.slice(LANG.audio.old.length).replace(/\.\w+$/, '').toLowerCase();
  if (wordIndex.has(word)) add(wordIndex.get(word), { f, by: 'a Wikimedia Commons contributor', src: 'Wikimedia Commons', rank: 1, ...commonsUrls(f) });
}
// 3. Wiktionary-linked audio
const rl = createInterface({ input: createReadStream(join(ROOT, 'sources', LANG.audio.kaikki), { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.includes('"audio"')) continue;
  const o = JSON.parse(line);
  const i = wordIndex.get(String(o.word).toLowerCase());
  if (i == null) continue;
  for (const s of o.sounds || []) if (s.audio && AUDIO_EXT.test(s.audio) && nameHasWord(s.audio, String(o.word).toLowerCase())) add(i, { f: s.audio, by: s.note ? `a speaker (${s.note})` : 'a Wikimedia Commons contributor', src: 'Wikimedia Commons', rank: 2, ...commonsUrls(s.audio) });
}

const words = [];
for (const [i, list] of [...cand.entries()].sort((a, b) => a[0] - b[0])) { const c = list.sort((a, b) => a.rank - b.rank)[0]; words.push({ i, f: c.f, by: c.by, src: c.src, lic: null, url: c.mp3, orig: c.orig }); }

// Who made each file, and under what licence, straight from its own Commons page (not from guessing at the file name).
// Lingua Libre writes "Speaker: A Recorder: B"; show the speaker, and the recorder only if it is someone else
const tidy = (a) => { const m = /^Speaker:\s*(.+?)\s+Recorder:\s*(.+)$/.exec(a); if (!m) return a.replace(/^(User|Gebruiker):/i, ''); return m[1] === m[2] ? m[1] : `${m[1]} (recorded by ${m[2]})`; };
const strip = (h) => String(h || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
for (let i = 0; i < words.length; i += 40) {
  const chunk = words.slice(i, i + 40);
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  for (const [k, v] of Object.entries({ action: 'query', prop: 'imageinfo', iiprop: 'extmetadata', titles: chunk.map((w) => 'File:' + w.f).join('|'), format: 'json' })) u.searchParams.set(k, v);
  let j; for (let t = 0; t < 5 && !j; t++) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (r.ok) j = await r.json(); } catch { /* retry */ } if (!j) await sleep(3000); }
  if (!j) throw new Error('could not read the Commons file pages');
  const key = (t) => { const x = t.replace(/^File:/, '').replace(/_/g, ' '); return x.charAt(0).toUpperCase() + x.slice(1); };
  const byTitle = new Map(Object.values(j.query.pages).map((p) => [key(p.title), p.imageinfo?.[0]?.extmetadata]));
  for (const w of chunk) {
    const meta = byTitle.get(key(w.f));
    if (!meta) { w.drop = true; console.log('dropped (no Commons file page):', w.f); continue; }
    const artist = strip(meta.Artist?.value), lic = strip(meta.LicenseShortName?.value);
    if (artist) w.by = tidy(artist);
    w.lic = lic || null;
  }
  await sleep(400);
}
for (let k = words.length - 1; k >= 0; k--) if (words[k].drop) words.splice(k, 1);
const nolic = words.filter((w) => !w.lic);
if (nolic.length) console.log('WARNING: no licence found for', nolic.length, 'files:', nolic.slice(0, 5).map((w) => w.f).join(', '));
writeFileSync(join(ROOT, 'build', '_audio-plan.json'), JSON.stringify({ words }));
const top = (n) => words.filter((w) => w.i < n).length;
console.log(`recordings by real people: ${words.length} words (${top(200)} of the first 200, ${top(500)} of the first 500)`);
console.log('by source:', Object.entries(words.reduce((a, w) => ((a[w.src] = (a[w.src] || 0) + 1), a), {})).map(([k, v]) => `${k} ${v}`).join(', '));
