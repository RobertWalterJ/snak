// What to ask, and when.
//
// FSRS (ts-fsrs, MIT) decides how long a memory lasts: 88% requested retention, no short steps,
// at most 270 days. A miss comes back tomorrow. A word counts as KNOWN once its first question
// has a stability of 21 days or more, so "known" has been proven over weeks, not guessed.
//
// A round is the learner's sitting. Reviews come first, then new questions (about nine). The
// sitting is never cut short: if there are not enough reviews or new questions to fill it, the
// round is topped up from what is already met. New questions are gated by stage (the commonest
// words first) and by word: a word's other questions open once its first question has been
// answered right.

import { fsrs, generatorParameters, createEmptyCard, Rating } from './vendor/ts-fsrs.mjs';
import { State, bump } from './store.js';

const F = fsrs(generatorParameters({ request_retention: 0.88, enable_fuzz: false, enable_short_term: false, maximum_interval: 270 }));
const DAY = 86400000;

let deck = null;
export const setDeck = (d) => {
  deck = d;
  deck.byId = new Map(d.items.map((it) => [it.id, it]));
  deck.readOf = new Map(d.items.filter((it) => it.k === 'read').map((it) => [it.i, it.id]));
};

const rehydrate = (c) => ({ ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined });
const dehydrate = (c) => ({ ...c, due: c.due.toISOString(), last_review: c.last_review ? c.last_review.toISOString() : null });
export const cardOf = (id) => State.data.cards[id];
export const met = (id) => !!State.data.cards[id];

export function answer(id, correct, now = new Date()) {
  const prev = State.data.cards[id];
  if (!prev) bump('w');
  const card = prev ? rehydrate(prev) : createEmptyCard(now);
  let next = F.next(card, now, correct ? Rating.Good : Rating.Again).card;
  if (!correct) { const t = new Date(now); t.setHours(0, 0, 0, 0); next = { ...next, due: new Date(t.getTime() + DAY) }; }   // a miss is due tomorrow
  State.data.cards[id] = dehydrate(next);
  bump('n'); if (correct) bump('c');
  State.save();
}

// ── what the learner has shown ──
export const wordStarted = (i) => { const r = deck.readOf.get(i); return r != null && met(r); };
export const wordKnown = (i) => { const r = deck.readOf.get(i); const c = r != null && cardOf(r); return !!c && c.stability >= 21; };
export const isDue = (id, now = new Date()) => { const c = cardOf(id); return !!c && new Date(c.due) <= now; };

export function stageState() {
  const stages = deck.stages.map((st, n) => {
    const have = st.words.filter(wordStarted).length;
    const need = Math.max(1, Math.ceil(st.words.length * st.gate));
    return { ...st, n, have, need, known: st.words.filter(wordKnown).length, passed: have >= need };
  });
  const first = stages.findIndex((s) => !s.passed);
  const current = Math.max(first < 0 ? stages.length : first, State.s.floor || 0);
  return { stages, current, done: current >= stages.length };
}

const SUPPLY = 150;
// can this question be asked, if it is new? (voice needed? word started?)
function eligible(it, canSound) {
  if (it.needsVoice && !canSound) return false;
  if (met(it.id)) return true;
  if (it.k === 'read') return true;
  if (it.k === 'form' && State.data.seen[it.i]) return true;               // the card showed the whole table, so practising it is fair
  return wordStarted(it.i);
}

export function counts(canSound, now = new Date()) {
  const { current } = stageState();
  let due = 0, fresh = 0;
  for (const it of deck.items) {
    if (!eligible(it, canSound)) continue;
    if (met(it.id)) { if (isDue(it.id, now)) due++; } else if (it.stage >= (State.s.floor || 0) && it.stage <= current) fresh++;
  }
  return { due, fresh, known: deck.words.filter((_, i) => wordKnown(i)).length };
}

// Build one round: [{ type: 'teach', i } | { type: 'q', id }]
export function buildRound({ size = State.s.sitting, newPerRound = State.s.newPerRound, canSound = true, only = null, now = new Date() } = {}) {
  const st = stageState();
  const floor = State.s.floor || 0;
  const inMode = (it) => !only || only(it);
  const pool = deck.items.filter((it) => inMode(it) && eligible(it, canSound));
  const due = pool.filter((it) => met(it.id) && isDue(it.id, now)).sort((a, b) => new Date(cardOf(a.id).due) - new Date(cardOf(b.id).due));
  const unseen = pool.filter((it) => !met(it.id) && it.stage >= floor);
  // how far the course reaches: past the current stage until there is a real supply of new questions
  let horizon = Math.min(st.current, deck.stages.length - 1);
  const count = (h) => unseen.filter((it) => it.stage <= h).length;
  while (horizon < deck.stages.length - 1 && count(horizon) < SUPPLY) horizon++;
  const fresh = unseen.filter((it) => it.stage <= horizon).sort((a, b) => a.stage - b.stage || (a.rung ?? 0) - (b.rung ?? 0) || a.level - b.level || a.i - b.i);
  const chosen = [], used = new Set();
  const take = (list, n) => { for (const it of list) { if (n <= 0) break; const g = 'w' + it.i; if (used.has(g)) continue; used.add(g); chosen.push(it); n--; } return n; };
  const newWanted = only ? 0 : Math.min(newPerRound, size);
  take(due, size - newWanted);
  // the new questions: about six in ten bring in new words, the rest are new kinds of question on words already met
  const freshReads = fresh.filter((it) => it.k === 'read'), freshSibs = fresh.filter((it) => it.k !== 'read');
  const wantReads = only ? 0 : Math.ceil(newWanted * 0.6);
  const left = take(freshReads, wantReads);
  take(freshSibs, newWanted - wantReads + left);
  if (chosen.length < size) take(due, size - chosen.length);                // then more reviews
  // Still short (a first sitting, with little to review): ask a second question about the words that are
  // new in this round, later in the same round. It comes after the word's first question.
  const sibs = [];
  if (chosen.length < size && !only) {
    const SECOND = ['recall', 'cloze', 'gender', 'listen'];
    for (const first of chosen.filter((it) => it.k === 'read' && !met(it.id))) {
      if (chosen.length + sibs.length >= size) break;
      const next = SECOND.map((k) => deck.items.find((it) => it.i === first.i && it.k === k && !met(it.id) && !(it.needsVoice && !canSound))).find(Boolean);
      if (next) sibs.push(next);
    }
  }
  if (chosen.length + sibs.length < size) take(fresh, size - chosen.length - sibs.length);   // then more new, beyond the usual nine
  if (chosen.length + sibs.length < size) {                                 // then practice on what is met but not yet due
    const later = pool.filter((it) => met(it.id) && !isDue(it.id, now)).sort((a, b) => new Date(cardOf(a.id).due) - new Date(cardOf(b.id).due));
    take(later, size - chosen.length - sibs.length);
  }
  // order: the new questions go in among the reviews, not all at the end
  const olds = chosen.filter((it) => met(it.id)), news = chosen.filter((it) => !met(it.id));
  const mixed = [];
  const step = news.length ? Math.max(1, Math.floor(olds.length / news.length)) : 1e9;
  let ni = 0;
  olds.forEach((it, k) => { if (ni < news.length && k > 0 && k % step === 0) mixed.push(news[ni++]); mixed.push(it); });
  while (ni < news.length) mixed.push(news[ni++]);
  // a word is taught before its first question
  const out = [], taught = new Set();
  for (const it of mixed) {
    if (State.s.teach && it.i != null && !State.data.seen[it.i] && !met(it.id) && !taught.has(it.i)) { out.push({ type: 'teach', i: it.i }); taught.add(it.i); }
    out.push({ type: 'q', id: it.id });
  }
  for (const it of sibs) out.push({ type: 'q', id: it.id });               // (their words are taught by now)
  return out;
}

export const markSeen = (i) => { State.data.seen[i] = true; State.save(); };
