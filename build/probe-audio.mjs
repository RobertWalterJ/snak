// Which Tatoeba recordings of our sentences still exist?
//
//   node build/probe-audio.mjs      (after build/sentences.mjs)
//
// Tatoeba's export lists recordings that have since been deleted, so a listed recording is not a recording.
// This asks the audio server (a cheap HEAD request) about every sentence of ours that is recorded under a
// Creative Commons licence, and keeps the ones that answer. Writes corpus/audio-ok.json: [{id (sentence), aid (audio), by, lic}].

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const S = (f) => join(ROOT, 'sources', f);
if (!existsSync(S('sentences_with_audio.csv'))) {
  if (!existsSync(S('sentences_with_audio.tar.bz2'))) { const r = await fetch('https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2'); writeFileSync(S('sentences_with_audio.tar.bz2'), Buffer.from(await r.arrayBuffer())); }
  execFileSync('python', ['-c', 'import tarfile,sys;t=tarfile.open(sys.argv[1]);open(sys.argv[2],"wb").write(t.extractfile("sentences_with_audio.csv").read())', S('sentences_with_audio.tar.bz2'), S('sentences_with_audio.csv')]);
}
const ours = new Map(JSON.parse(readFileSync(join(ROOT, 'corpus', 'sentences.json'), 'utf8')).map((s) => [String(s.id), s]));
// audio_id, sentence_id, username, license, attribution_url. Any Creative Commons licence: CC BY-NC-ND and CC BY-NC allow
// redistribution, unmodified and credited, for non-commercial use. Recordings with no licence stated are left out.
const todo = [];
for (const line of readFileSync(S('sentences_with_audio.csv'), 'utf8').split(/\r?\n/)) {
  const [aid, sid, user, lic] = line.split('\t');
  // CK is left out: one contributor who recorded thousands of sentences in languages they do not speak, so these are
  // not recordings by a native speaker and may be machine-made. Tatoeba shows no audio on those pages either.
  if (ours.has(sid) && /^CC/.test(lic || '') && user !== 'CK') todo.push({ id: Number(sid), aid: Number(aid), by: user, lic });
}
console.log(`${todo.length} recorded sentences under a Creative Commons licence to check`);
const ok = [];
let n = 0;
const queue = [...todo];
// Tatoeba answers 429 (too many requests) when asked quickly. Everyone waits for it together, and only a
// few requests are in flight at once. A 404 means the recording is gone; a 429 is never counted as a miss.
let pausedUntil = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const worker = async () => {
  while (queue.length) {
    const j = queue.shift();
    for (let attempt = 0; attempt < 8; attempt++) {
      const wait = pausedUntil - Date.now(); if (wait > 0) await sleep(wait);
      try {
        const r = await fetch(`https://tatoeba.org/en/audio/download/${j.aid}`, { method: 'HEAD', redirect: 'follow' });
        if (r.status === 429 || r.status >= 500) { pausedUntil = Math.max(pausedUntil, Date.now() + ((Number(r.headers.get('retry-after')) || 10) + 1) * 1000); continue; }
        if (r.ok && /audio/.test(r.headers.get('content-type') || '')) ok.push(j);
        break;
      } catch { await sleep(1000); }
    }
    if (++n % 200 === 0) console.log(`  ${n}`);
    await sleep(120);
  }
};
await Promise.all(Array.from({ length: 3 }, worker));
writeFileSync(join(ROOT, 'corpus', 'audio-ok.json'), JSON.stringify(ok.sort((a, b) => a.id - b.id)));
console.log(`${ok.length} recordings answer`);
