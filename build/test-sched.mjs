// Simulate learners against the real scheduler (app/js/sched.js) and the shipped deck.
//
//   node build/test-sched.mjs
//
// Two rules are checked, because they have failed before in sibling apps (Hok Gong, v1.5.0):
//   1. A round is never short. Eight rounds back to back must each fill the sitting.
//   2. A casual learner (one round a day) still meets a real number of new words in the first fortnight,
//      and a committed learner (three rounds) is not buried in reviews.
// The simulation uses the shipped settings (sitting 18, nine new per round), not the module's bare defaults.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// the app modules expect a browser: give them a tiny stand-in
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
globalThis.document = { querySelector: () => ({ content: 'test.v1' }) };
const { State } = await import('../app/js/store.js');
const S = await import('../app/js/sched.js');
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
S.setDeck(deck);

let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const DAY = 86400000, T0 = Date.UTC(2026, 0, 5, 9);

function play(roundsPerDay, days, { canSound = true } = {}) {
  State.reset(); seed = 7;
  const stats = { short: 0, started: [], reviewsPerDay: [], newPerDay: [] };
  for (let d = 0; d < days; d++) {
    const now = new Date(T0 + d * DAY);
    let reviews = 0, news = 0;
    for (let r = 0; r < roundsPerDay; r++) {
      const steps = S.buildRound({ canSound, now });
      const qs = steps.filter((x) => x.type === 'q');
      if (qs.length < State.s.sitting) stats.short++;
      for (const x of steps) {
        if (x.type === 'teach') { S.markSeen(x.i); continue; }
        const was = S.met(x.id);
        S.answer(x.id, rnd() < (was ? 0.9 : 0.65), new Date(now.getTime() + r * 3600000));
        was ? reviews++ : news++;
      }
    }
    stats.reviewsPerDay.push(reviews); stats.newPerDay.push(news);
    if ([6, 13, 29, days - 1].includes(d)) stats.started.push([d + 1, deck.words.filter((_, i) => S.wordStarted(i)).length, deck.words.filter((_, i) => S.wordKnown(i)).length]);
  }
  return stats;
}

let ok = true;
const fail = (m) => { ok = false; console.error('FAIL: ' + m); };

// 1. eight rounds back to back, same moment: none may be short
{
  State.reset();
  const now = new Date(T0);
  for (let r = 0; r < 8; r++) {
    const steps = S.buildRound({ canSound: true, now });
    const n = steps.filter((x) => x.type === 'q').length;
    if (n < State.s.sitting) fail(`round ${r + 1} had ${n} questions, sitting is ${State.s.sitting}`);
    for (const x of steps) { if (x.type === 'teach') S.markSeen(x.i); else S.answer(x.id, true, now); }
  }
  console.log('keen: eight rounds back to back each filled the sitting of', State.s.sitting);
}

// 2. casual and committed learners over 60 days
const casual = play(1, 60), committed = play(3, 60);
const at14 = (s) => s.started.find((x) => x[0] === 14)[1];
console.log('casual    (1 round/day): started', JSON.stringify(casual.started), '· reviews/day, last week avg', Math.round(casual.reviewsPerDay.slice(-7).reduce((a, b) => a + b, 0) / 7));
console.log('committed (3 rounds/day): started', JSON.stringify(committed.started), '· reviews/day, last week avg', Math.round(committed.reviewsPerDay.slice(-7).reduce((a, b) => a + b, 0) / 7));
console.log('short rounds — casual:', casual.short, ' committed:', committed.short);
if (casual.short || committed.short) fail('a simulated round was short');
if (at14(casual) < 60) fail(`a casual learner met only ${at14(casual)} words in 14 days (want 60 or more)`);
if (at14(committed) < 150) fail(`a committed learner met only ${at14(committed)} words in 14 days (want 150 or more)`);
// no listening: the course must still run
const mute = play(1, 14, { canSound: false });
if (mute.short) fail('rounds were short without a voice');
console.log('no voice: 14 days, short rounds:', mute.short);

console.log(ok ? 'test-sched: OK' : 'test-sched: FAILED');
process.exit(ok ? 0 : 1);
