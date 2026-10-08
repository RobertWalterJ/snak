// Snak and Saga — one app, two languages. The deck says which language it is (deck.lang).
//
// Screens: Today, Course, Words, Notes, Settings; a round (new-word cards and questions); sheets.
// Nothing here runs on a timer. Nothing speaks unless the learner pressed a speaker or turned on read-aloud.

import { h, ICON, iconBtn, sheet, seg, n } from './ui.js';
import { LOGO, HERO_ART, COVER, ring } from './art.js';
import { State, dayKey } from './store.js';
import * as S from './sched.js';
import { onVoices, say } from './voice.js';
import * as A from './audio.js';
const stop = A.stop;

let deck, L;
const app = document.getElementById('app');
let tab = 'today';
let installPrompt = null;
let effDark = false;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (tab === 'settings') render(); });

const POS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun', prep: 'preposition', conj: 'conjunction', det: 'determiner', num: 'number', intj: 'interjection', part: 'particle' };
const KIND = { culture: 'Culture', history: 'History', language: 'Language' };
const canSound = () => A.canHear(L.voice.prefix);
const svgIcon = (name) => h('span', { html: ICON[name], style: 'display:contents' });

// ── look ──
function applyLook() {
  const s = State.s;
  const theme = L.themes.some((t) => t.id === s.theme) ? s.theme : L.themes[0].id;
  effDark = s.scheme === 'dark' || (s.scheme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const el = document.documentElement;
  el.setAttribute('data-theme', theme); el.setAttribute('data-eff', effDark ? 'dark' : 'light');
  el.classList.toggle('big', !!s.big);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', getComputedStyle(document.body).backgroundColor);
}
const toggleScheme = () => { State.set('scheme', effDark ? 'light' : 'dark'); applyLook(); if (round) show(); else render(); };

// ── speaking ──
// A speaker button and a Slow button, shown only if there is a recording, a computer-voice clip or a phone voice.
// ref = ['w', word] (the default, keyed by the text) or ['s', Tatoeba sentence id].
const play = (text, ref, slow = false) => A.play(ref?.[0] || 'w', ref?.[1] ?? text, text, L.voice.prefix, { slow });
function speak(text, ref = null, { slowToo = true, big = false } = {}) {
  if (!canSound()) return null;
  const go = (slow) => (e) => { e.stopPropagation(); play(text, ref, slow); };
  return h('span', { class: 'speak' + (big ? ' big' : '') },
    h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Hear it', title: 'Hear it', onclick: go(false), html: ICON.speaker }),
    slowToo ? h('button', { class: 'slow', type: 'button', 'aria-label': 'Hear it slowly', title: 'Hear it slowly', onclick: go(true) }, svgIcon('turtle'), 'Slow') : null);
}
const withSpeaker = (node, text, ref) => h('div', { class: 'row' }, h('div', { class: 'grow' }, node), speak(text, ref));
const creditLine = (kind, key) => { const c = A.credit(kind, key, L.voice.prefix); return c ? h('p', { class: 'credit' }, c) : null; };

// ── a word, shown in full: the new-word card and the word sheet ──
const genderText = (code) => { const g = L.genders[code]; return g ? `${g.label} (${g.note})` : null; };
function wordBody(i) {
  const w = deck.words[i];
  const b = h('div', { class: 'teach' });
  b.append(h('div', { class: 'word-top' }, h('p', { class: 'big-word' }, w.w), speak(w.w, null, { big: true })), creditLine('w', w.w));
  const bits = [h('span', { class: 'chip' }, POS[w.k] || w.k)];
  if (w.gen && genderText(w.gen)) bits.push(h('span', { class: 'chip' }, genderText(w.gen)));
  b.append(h('p', {}, ...bits, (w.ipa || w.ipa2) ? h('span', { class: 'ipa' }, [w.ipa, w.ipa2].filter(Boolean).join('  ')) : null));
  b.append(h('p', { class: 'label' }, 'Meaning'), h('p', { class: 'meaning' }, w.g));
  const alts = (w.alt || []).filter((a) => !a.toLowerCase().includes(w.g.toLowerCase()) && !w.g.toLowerCase().includes(a.toLowerCase()));
  if (alts.length) b.append(h('p', { class: 'note' }, 'Also: ' + alts.join('; ')));
  if (w.k === 'v' && w.parts?.pr && L.id === 'da') {
    const p = w.parts;
    b.append(h('p', { class: 'label' }, 'Forms'), h('table', { class: 'forms' }, ...[['Infinitive', 'at ' + w.w], ['Present', p.pr], ['Past', p.pa], ['Perfect', p.pf]].filter((r) => r[1]).map(([a, c]) => h('tr', {}, h('th', {}, a), h('td', { class: 'tx' }, c)))));
  }
  if (w.k === 'n' && w.decl) {
    const d = w.decl, cell = (s) => d[s]?.[0] || '–';
    b.append(h('p', { class: 'label' }, 'Cases'), h('table', { class: 'forms' },
      h('tr', {}, h('th', {}, 'Case'), h('th', {}, 'Singular'), h('th', {}, 'Plural')),
      ...[['Nominative', 'nom'], ['Accusative', 'acc'], ['Dative', 'dat'], ['Genitive', 'gen']].map(([a, c]) => h('tr', {}, h('th', {}, a), h('td', { class: 'tx' }, cell('sg.ind.' + c)), h('td', { class: 'tx' }, cell('pl.ind.' + c))))));
  }
  const ex = deck.examples[i] || [];
  if (ex.length || w.ex?.length) b.append(h('p', { class: 'label' }, 'In a sentence'));
  for (const si of ex) { const s = deck.sentences[si]; b.append(h('div', { class: 'ex' }, withSpeaker(h('div', { class: 'tx' }, s.t), s.t, ['s', s.id]), h('div', { class: 'note' }, s.e), A.isHuman('s', s.id) ? creditLine('s', s.id) : null)); }
  if (!ex.length && w.ex?.length) for (const s of w.ex) b.append(h('div', { class: 'ex' }, withSpeaker(h('div', { class: 'tx' }, s.t), s.t), h('div', { class: 'note' }, s.e)));
  if (L.pronNote && i < 400) b.append(h('p', { class: 'note', style: 'margin-top:14px' }, L.pronNote));
  return b;
}
const openWord = (i) => sheet(() => h('div', {}, wordBody(i), stateLine(i)));
function stateLine(i) {
  const r = deck.readOf.get(i), c = r && S.cardOf(r);
  return h('p', { class: 'note', style: 'margin-top:16px' }, !c ? 'You have not met this word yet.' : S.wordKnown(i) ? 'You know this word. It comes back rarely.' : 'You are learning this word.');
}

// ── a round ──
let round = null;                                   // { steps, at, right, missed, total, done, only }
function startRound(only = null) {
  const steps = S.buildRound({ canSound: canSound(), only });
  if (!steps.some((x) => x.type === 'q')) { sheet(() => h('div', {}, h('h2', {}, 'Nothing to ask yet'), h('p', {}, only ? 'This opens as you learn words. Do a normal round first.' : 'You have finished everything available. Come back later.'))); return; }
  round = { steps, at: 0, right: 0, missed: [], total: steps.filter((x) => x.type === 'q').length, done: 0, only };
  show();
}
function leaveRound() { stop(); round = null; render(); }

function chrome(content, { focus = false } = {}) {
  app.className = focus ? 'focus' : '';
  app.replaceChildren(...[
    focus ? null : h('header', { class: 'bar' }, h('span', { class: 'wordmark' }, h('span', { html: LOGO, style: 'display:contents' }), L.app), iconBtn(effDark ? 'sun' : 'moon', effDark ? 'Switch to light' : 'Switch to dark', toggleScheme, 'flat')),
    content,
    focus ? null : tabsEl()].filter(Boolean));
  window.scrollTo(0, 0);
}

function show() {
  if (!round) return render();
  const step = round.steps[round.at];
  if (!step) return finish();
  if (step.type === 'teach') return showTeach(step.i);
  return showQuestion(step.id);
}
const advance = () => { round.at++; show(); };

function roundTop() {
  const pct = Math.round((round.done / round.total) * 100);
  return h('div', { class: 'round-top' },
    iconBtn('close', 'Stop this round', () => { if (confirm('Stop this round? Your answers so far are saved.')) leaveRound(); }, 'flat'),
    h('div', { class: 'prog', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Round progress' }, h('i', { style: `width:${pct}%` })),
    h('span', { class: 'count' }, `${Math.min(round.done + 1, round.total)} / ${round.total}`));
}
const kindChip = (icon, label) => h('span', { class: 'kind' }, svgIcon(icon), label);

function showTeach(i) {
  const dock = h('div', { class: 'dock' }, h('button', { class: 'btn', type: 'button', onclick: () => { S.markSeen(i); stop(); advance(); } }, 'Got it', svgIcon('arrow')));
  chrome(h('div', { style: 'display:contents' }, roundTop(), h('main', {}, h('div', { class: 'qcard rise' }, kindChip('spark', 'A new word'), wordBody(i)), h('div', { class: 'spacer' }), dock)), { focus: true });
  if (State.s.autoRead && canSound()) play(deck.words[i].w);
}

const gtext = (key) => { const g = Object.values(L.genders).find((x) => x.key === key); return g ? `${g.label} (${g.note})` : key; };

function questionParts(it) {
  const w = deck.words[it.i];
  const wordRow = (text, say_) => h('div', { class: 'q-head' }, h('div', { class: 'grow' }, text), speak(say_, null, { big: true }));
  switch (it.k) {
    case 'read': return { prompt: 'What does this word mean?', main: wordRow(h('p', { class: 'big-word' }, w.w), w.w), optTx: false };
    case 'recall': return { prompt: 'Which word means this?', main: h('p', { class: 'big-word ui' }, w.g), optTx: true };
    case 'listen': return { prompt: 'Listen. What does the word mean?', main: h('div', { style: 'padding:6px 0 4px' }, speak(w.w, null, { big: true })), optTx: false, autoplay: true };
    case 'cloze': {
      const s = deck.sentences[it.sent];
      return { prompt: 'Choose the word that fits the gap.', main: h('div', {}, h('p', { class: 'sent' }, it.pre, h('span', { class: 'blank' }, ' '), it.post), h('p', { class: 'note', style: 'margin:0' }, s.e)), optTx: true };
    }
    case 'gender': return { prompt: L.genderPrompt, main: wordRow(h('div', {}, h('p', { class: 'big-word' }, w.w), h('p', { class: 'note', style: 'margin:0' }, w.g)), w.w), optTx: false, label: gtext };
    case 'form': return { prompt: it.ask.charAt(0).toUpperCase() + it.ask.slice(1) + '. Which form is it?', main: wordRow(h('div', {}, h('p', { class: 'big-word' }, it.prompt), h('p', { class: 'note', style: 'margin:0' }, w.g)), w.w), optTx: true };
    case 'note': return { prompt: `From the note “${deck.notes[it.n].title}”`, main: h('p', { class: 'qtext' }, it.ask), optTx: false };
    default: return { prompt: '', main: h('p', {}, it.k), optTx: false };
  }
}
const kindFor = (it) => ({ read: ['book', 'Meaning'], recall: ['words', 'Recall'], listen: ['ear', 'Listening'], cloze: ['words', 'Fill the gap'], gender: ['spark', 'Gender'], form: ['course', deck.ladder.title], note: ['notes', 'Note'] })[it.k] || ['spark', it.k];

function showQuestion(id) {
  const it = deck.byId.get(id);
  const q = questionParts(it);
  const w = deck.words[it.i];
  const [ki, kl] = kindFor(it);
  const card = h('div', { class: 'qcard rise' }, kindChip(ki, kl), h('p', { class: 'prompt' }, q.prompt), q.main);
  const choices = h('div', { class: 'choices rise d1' });
  const dockSlot = h('div');
  let answered = false;
  const btns = [];
  const finishQ = (picked) => {
    if (answered) return; answered = true; stop();
    const correct = picked === it.answer;
    S.answer(id, correct);
    round.done++;
    if (correct) round.right++; else if (it.i != null) round.missed.push(it.i);
    btns.forEach(({ b, o, badge }) => {
      b.setAttribute('aria-disabled', 'true');
      if (o === it.answer) { b.classList.add('right'); badge.innerHTML = ICON.check; }
      else if (o === picked) { b.classList.add('wrong'); badge.innerHTML = ICON.cross; }
      else b.classList.add('dim');
    });
    skip.remove();
    dockSlot.replaceWith(dockFor(it, w, correct, picked));
    document.querySelector('.dock')?.scrollIntoView({ block: 'nearest' });
    if (State.s.autoRead) afterSpeak(it, w);
  };
  for (const o of it.options) {
    const badge = h('span', { class: 'badge' });
    const b = h('button', { class: 'opt' + (q.optTx ? ' tx' : ''), type: 'button', onclick: () => finishQ(o) }, h('span', { class: 'label' }, q.label ? q.label(o) : o), badge);
    btns.push({ b, o, badge });
    choices.append(h('div', { class: 'choice' }, b, q.optTx ? speak(o, null, { slowToo: false }) : null));
  }
  const skip = h('button', { class: 'skip', type: 'button', onclick: () => finishQ(null) }, 'I don’t know');
  chrome(h('div', { style: 'display:contents' }, roundTop(), h('main', {}, card, choices, skip, h('div', { class: 'spacer' }), dockSlot)), { focus: true });
  if (q.autoplay && canSound()) play(w.w);
  else if (State.s.autoRead && ['read', 'gender', 'form'].includes(it.k)) play(w.w);
}

// the dock: right or wrong, what the answer is, and Continue
function dockFor(it, w, correct, picked) {
  const d = h('div', { class: 'dock ' + (correct ? 'good' : 'bad'), role: 'status', 'aria-live': 'polite' });
  d.append(h('div', { class: 'verdict' }, h('span', { class: 'badge', html: correct ? ICON.check : ICON.cross }), h('b', {}, correct ? 'Right' : picked == null ? 'Here is the answer' : 'Not quite')));
  const ans = it.k === 'gender' ? gtext(it.answer) : it.answer;
  if (!correct && it.k !== 'read' && it.k !== 'listen') d.append(h('p', { class: 'detail' }, 'The answer is ', h('b', { class: it.k === 'note' ? '' : 'tx' }, ans), '.'));
  if (it.k === 'note') d.append(h('p', { class: 'detail' }, deck.notes[it.n].claims[it.claim]));
  else if (it.k === 'cloze') { const s = deck.sentences[it.sent]; d.append(h('div', { class: 'detail' }, withSpeaker(h('div', { class: 'tx' }, it.pre + it.answer + it.post), s.t, ['s', s.id]), h('div', { class: 'note', style: 'margin:2px 0 0' }, s.e), A.isHuman('s', s.id) ? creditLine('s', s.id) : null)); }
  else if (it.k === 'form') d.append(h('div', { class: 'detail' }, withSpeaker(h('span', {}, h('span', { class: 'tx' }, `${it.prompt} → ${it.answer}`), ' ', h('span', { class: 'note' }, `(${it.ask})`)), it.answer)));
  else d.append(h('div', { class: 'detail' }, withSpeaker(h('span', {}, h('span', { class: 'tx' }, w.w), '  =  ', w.g), w.w)));
  d.append(h('div', { class: 'links' }, it.k === 'note' ? h('button', { type: 'button', onclick: () => noteSheet(it.n) }, 'Read the note again') : h('button', { type: 'button', onclick: () => openWord(it.i) }, 'See the whole word')));
  d.append(h('button', { class: 'btn', type: 'button', onclick: () => { stop(); advance(); } }, 'Continue', svgIcon('arrow')));
  return d;
}
function afterSpeak(it, w) { if (!canSound() || it.k === 'note') return; if (it.k === 'cloze') { const s = deck.sentences[it.sent]; play(s.t, ['s', s.id]); } else play(it.k === 'form' ? it.answer : w.w); }

function finish() {
  const r = round; stop();
  const pct = Math.round((100 * r.right) / r.total);
  const uniq = [...new Set(r.missed)];
  chrome(h('main', { style: 'padding-top:calc(24px + env(safe-area-inset-top))' },
    h('section', { class: 'hero rise' }, h('div', { class: 'art', html: HERO_ART[L.id] }),
      h('div', { class: 'hero-top' }, h('div', { class: 'ring-wrap', html: ring(pct, pct + '%') }), h('div', {}, h('p', { class: 'eyebrow' }, 'Round done'), h('h1', {}, `${r.right} of ${r.total} right`), h('p', {}, uniq.length ? 'The words you missed are below.' : 'Nothing missed. Well done.'))),
      h('button', { class: 'btn', type: 'button', onclick: () => startRound(r.only) }, 'Another round', svgIcon('arrow')),
      h('button', { class: 'btn ghost', type: 'button', onclick: leaveRound }, 'Back to Today')),
    uniq.length ? h('div', { class: 'sect' }, h('h2', {}, 'Look at these again')) : null,
    uniq.length ? h('ul', { class: 'list rise d1' }, ...uniq.map((i) => wordRow(i))) : null), { focus: true });
}

const wordRow = (i) => { const w = deck.words[i]; return h('li', { onclick: () => openWord(i) }, h('div', {}, h('div', { class: 'w' }, w.w), h('div', { class: 'g' }, w.g))); };

// ── tabs ──
const TABS = [['today', 'Today', 'today'], ['course', 'Course', 'course'], ['words', 'Words', 'words'], ['notes', 'Notes', 'notes'], ['settings', 'Settings', 'settings']];
const tabsEl = () => h('nav', { class: 'tabs', 'aria-label': 'Main' }, ...TABS.map(([id, label, icon]) => h('button', { type: 'button', 'aria-current': tab === id ? 'page' : null, onclick: () => { tab = id; render(); } }, svgIcon(icon), label)));

function render() {
  if (round) return show();
  applyLook();
  const main = h('main', {});
  ({ today: todayScreen, course: courseScreen, words: wordsScreen, notes: notesScreen, settings: settingsScreen })[tab](main);
  chrome(main);
}

const tile = (icon, title, sub, onclick, disabled = false) => h('button', { class: 'tile rise', type: 'button', onclick, disabled: disabled ? true : null }, h('span', { class: 'ico' }, svgIcon(icon)), h('b', {}, title), h('span', { class: 'sub' }, sub));

function todayScreen(m) {
  const c = S.counts(canSound());
  const st = S.stageState();
  const si = Math.min(st.current, deck.stages.length - 1);
  const cur = st.stages[si];
  const pct = Math.round((100 * cur.have) / cur.words.length);
  const log = State.data.log[dayKey()] || { n: 0 };
  m.append(h('section', { class: 'hero rise' }, h('div', { class: 'art', html: HERO_ART[L.id] }),
    h('div', { class: 'hero-top' },
      h('div', { class: 'ring-wrap', html: ring(st.done ? 100 : pct, (st.done ? 100 : pct) + '%') }),
      h('div', {}, h('p', { class: 'eyebrow' }, st.done ? 'Every stage started' : `Stage ${si + 1} of ${deck.stages.length}`), h('h1', {}, cur.title), h('p', {}, `${c.known} known · ${c.due} to review`))),
    h('button', { class: 'btn', type: 'button', onclick: () => startRound() }, `Start a round · ${State.s.sitting}`, svgIcon('arrow'))));
  const next = nextNote();
  const open = deck.items.filter((it) => it.k === 'form' && (S.met(it.id) || S.wordStarted(it.i) || State.data.seen[it.i])).length;
  m.append(h('div', { class: 'tiles' },
    tile('course', deck.ladder.title, open ? `${n(open)} questions ready` : 'Opens as you learn words', () => startRound((it) => it.k === 'form'), !open),
    next != null ? tile('notes', deck.notes[next].title, `${KIND[deck.notes[next].kind]} · a short reading`, () => noteSheet(next)) : tile('notes', 'Notes', 'Culture, history, language', () => { tab = 'notes'; render(); })));
  const nw = deck.words.findIndex((_, i) => !S.wordStarted(i) && !State.data.seen[i]);
  if (nw >= 0) { const w = deck.words[nw]; m.append(h('div', { class: 'card wotd rise d2', onclick: () => openWord(nw), style: 'cursor:pointer' }, h('div', { class: 'grow' }, h('p', { class: 'eyebrow' }, 'Next new word'), h('p', { class: 'big-word' }, w.w), h('p', { class: 'g' }, 'Tap to meet it')), speak(w.w, null, { slowToo: false }))); }
  if (log.n) m.append(h('p', { class: 'softline' }, `You have answered ${n(log.n)} question${log.n === 1 ? '' : 's'} today.`));
  if (!canSound()) m.append(h('div', { class: 'card', style: 'margin-top:14px' }, h('h2', {}, `No ${L.voice.label} voice on this device`), h('p', { class: 'note', style: 'margin-top:6px' }, `Listening questions are switched off, and there are no read-aloud buttons for ${L.name}. Install a ${L.voice.label} voice in your phone’s text-to-speech settings to turn them on.`)));
  if (!State.persistent) m.append(h('div', { class: 'card', style: 'margin-top:14px' }, h('p', { class: 'note', style: 'margin:0' }, 'This browser is not saving your progress. Settings has a backup button.')));
}

// ── notes: culture, history and language readings ──
const noteStatus = (i) => (S.startedCount() < deck.notes[i].gate ? 'locked' : S.noteRead(deck.notes[i].id) ? 'read' : 'new');
const nextNote = () => { let best = null; deck.notes.forEach((nt, i) => { if (noteStatus(i) === 'new' && (best == null || nt.gate < deck.notes[best].gate)) best = i; }); return best; };

function noteSheet(i) {
  const nt = deck.notes[i];
  sheet((close) => {
    const body = h('div', {}, h('p', {}, h('span', { class: 'chip' }, KIND[nt.kind])), h('h2', {}, nt.title));
    for (const c of nt.claims) body.append(h('p', { class: 'claim' }, c));
    if (nt.terms.length) body.append(h('p', { class: 'label', style: 'font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);font-weight:700;margin:20px 0 6px' }, 'Words from this note'), h('div', { class: 'card flat', style: 'padding:6px 16px;box-shadow:none;background:var(--sf2)' }, ...nt.terms.map((t) => h('div', { class: 'row split', style: 'padding:8px 0' }, h('span', { class: 'tx', style: 'font-size:1.2rem' }, t), speak(t, ['w', t], { slowToo: false })))));
    body.append(h('p', { class: 'note', style: 'margin-top:16px' }, 'Written from the English Wikipedia article “', h('a', { href: nt.source.url, target: '_blank', rel: 'noopener' }, nt.source.title), `”, revision ${nt.source.revid} (${nt.source.license}). Every sentence is quoted from that article.`));
    body.append(h('button', { class: 'btn quiet', type: 'button', onclick: () => { stop(); say(nt.claims.join(' '), 'en', { rate: 0.95 }); } }, svgIcon('speaker'), 'Read it aloud'));
    body.append(h('button', { class: 'btn', type: 'button', onclick: () => { stop(); S.markNoteRead(nt.id); close(); render(); } }, S.noteRead(nt.id) ? 'Done' : 'I have read this'));
    return body;
  });
}

function notesScreen(m) {
  const started = S.startedCount();
  m.append(h('h1', { class: 'title rise' }, 'Notes'), h('p', { class: 'lede rise d1' }, 'Short readings about culture, history and the language. Each is written from a Wikipedia article, and every sentence is quoted from it. Questions about a note join your rounds after you read it.'));
  for (const kind of ['culture', 'history', 'language']) {
    m.append(h('div', { class: 'sect' }, h('h2', {}, KIND[kind])));
    deck.notes.map((_, i) => i).filter((i) => deck.notes[i].kind === kind).sort((a, b) => deck.notes[a].gate - deck.notes[b].gate).forEach((i) => {
      const nt = deck.notes[i], st = noteStatus(i);
      const chip = st === 'locked' ? h('span', { class: 'chip mute' }, svgIcon('lock'), `Opens at ${nt.gate} words`) : st === 'read' ? h('span', { class: 'chip ok' }, svgIcon('check'), 'Read') : h('span', { class: 'chip' }, 'New');
      m.append(h('button', { class: 'notecard' + (st === 'locked' ? ' locked' : ''), type: 'button', onclick: () => (st === 'locked' ? sheet(() => h('div', {}, h('h2', {}, nt.title), h('p', {}, `This note opens when you have started ${nt.gate} words. You have started ${started}.`))) : noteSheet(i)) },
        h('span', { html: COVER[nt.kind], style: 'display:contents' }), h('div', {}, h('b', {}, nt.title), chip)));
    });
  }
}

function courseScreen(m) {
  const st = S.stageState();
  m.append(h('h1', { class: 'title rise' }, 'Course'), h('p', { class: 'lede rise d1' }, `${n(deck.words.length)} words in ${deck.stages.length} stages, commonest first. A stage opens the next when you have started 60% of its words.`));
  const tl = h('div', { class: 'timeline' });
  for (const s of st.stages) {
    const pct = Math.min(100, Math.round((100 * s.have) / s.words.length));
    tl.append(h('div', { class: 'stage' + (s.n === st.current ? ' now' : '') },
      h('div', { class: 'mark', html: ring(pct, String(s.n + 1), 56, 6) }),
      h('div', { class: 'body' },
        h('div', { class: 'row split' }, h('h2', {}, s.title), s.n === st.current ? h('span', { class: 'chip' }, 'You are here') : s.n < (State.s.floor || 0) ? h('span', { class: 'chip mute' }, 'Skipped') : s.passed ? h('span', { class: 'chip ok' }, svgIcon('check'), 'Open') : null),
        h('p', { class: 'note', style: 'margin:2px 0 0' }, s.why),
        h('div', { class: 'minibar' }, h('i', { style: `width:${pct}%` })),
        h('p', { class: 'note', style: 'margin:0' }, `${s.have} of ${s.words.length} started · ${s.known} known`))));
  }
  m.append(tl);
}

let wordLimit = 100, wordFilter = 'all';
function wordsScreen(m) {
  const q = h('input', { type: 'search', placeholder: `Search ${L.name} or English`, 'aria-label': 'Search words', autocomplete: 'off', value: wordsScreen.q || '' });
  const list = h('ul', { class: 'list' });
  const filters = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter words' });
  const stateOf = (i) => (S.wordKnown(i) ? 'known' : S.wordStarted(i) ? 'learning' : 'new');
  const draw = () => {
    wordsScreen.q = q.value;
    const t = q.value.trim().toLowerCase();
    const hits = deck.words.map((_, i) => i).filter((i) => (wordFilter === 'all' || stateOf(i) === wordFilter) && (!t || deck.words[i].w.includes(t) || deck.words[i].g.toLowerCase().includes(t)));
    list.replaceChildren(...hits.slice(0, wordLimit).map((i) => { const li = wordRow(i); const s = stateOf(i); li.append(h('span', { class: 'state chip ' + (s === 'known' ? 'ok' : s === 'new' ? 'mute' : '') }, s)); return li; }));
    if (hits.length > wordLimit) list.append(h('li', { onclick: () => { wordLimit += 200; draw(); } }, h('b', {}, `Show more (${n(hits.length - wordLimit)} left)`)));
    if (!hits.length) list.append(h('li', {}, 'No word found.'));
    filters.replaceChildren(...[['all', 'All'], ['new', 'New'], ['learning', 'Learning'], ['known', 'Known']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(wordFilter === v), onclick: () => { wordFilter = v; wordLimit = 100; draw(); } }, l)));
  };
  q.addEventListener('input', () => { wordLimit = 100; draw(); });
  m.append(h('h1', { class: 'title rise' }, 'Words'), h('div', { class: 'search rise d1', html: ICON.search }, q), filters, list);
  draw();
}

function settingsScreen(m) {
  const s = State.s;
  const row = (title, note, control) => h('div', { class: 'setting' }, h('b', {}, title), note ? h('p', { class: 'note' }, note) : null, control);
  const group = (title, ...rows) => [h('p', { class: 'group-title' }, title), h('div', { class: 'group' }, ...rows.filter(Boolean))];
  const set = (k, v) => { State.set(k, v); applyLook(); render(); };
  m.append(h('h1', { class: 'title rise' }, 'Settings'),
    ...group('Look',
      row('Colours', null, swatches()),
      row('Light or dark', null, seg(s.scheme, [['auto', 'Phone'], ['light', 'Light'], ['dark', 'Dark']], (v) => set('scheme', v))),
      row('Text size', null, seg(s.big ? 'big' : 'normal', [['normal', 'Normal'], ['big', 'Large']], (v) => set('big', v === 'big')))),
    ...group('Sound',
      row('About the voices', A.hasClips() ? 'Every word and example has a clip. A recording by a real person is used when there is one. If not, a computer voice made for this app is used. The phone’s own voice is the last choice.' : (A.canHear(L.voice.prefix) ? 'There are no clips yet. The phone’s own voice is used. It is a machine voice.' : `This device has no ${L.voice.label} voice and the app has no clips, so nothing can be read aloud.`), null),
      row('Speed', 'Slower speech helps with new sounds. Every speaker has a Slow button too.', seg(String(s.speed || 1), [['1', 'Normal'], ['0.8', 'Slow'], ['0.65', 'Very slow']], (v) => set('speed', Number(v)))),
      row('Read aloud automatically', 'Say each new word and each answer without pressing a speaker.', seg(s.autoRead ? 'on' : 'off', [['off', 'Off'], ['on', 'On']], (v) => set('autoRead', v === 'on'))),
      A.hasClips() ? row('Keep the audio offline', 'Saves every clip on this device, so it works without a connection.', offlineButton()) : null),
    ...group('Rounds',
      row('Questions in a round', 'A round is never cut short. There is always an “Another round” button.', seg(String(s.sitting), [['12', '12'], ['18', '18'], ['25', '25'], ['40', '40']], (v) => set('sitting', Number(v)))),
      row('New questions in a round', 'The rest are reviews.', seg(String(s.newPerRound), [['6', '6'], ['9', '9'], ['14', '14']], (v) => set('newPerRound', Number(v)))),
      row('New-word cards', 'Show the meaning, sound and examples before a new word.', seg(s.teach ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], (v) => set('teach', v === 'on')))),
    ...group('Where you start',
      row('I already know the first…', 'Skipped stages are not asked as new questions. You can still look up any word.', skipSelect())),
    ...group('Your progress',
      row('Saved on this device', 'Save a backup file to move your progress or keep it safe.', h('div', {}, h('button', { class: 'btn quiet', type: 'button', onclick: exportBackup }, 'Save a backup file'), h('button', { class: 'btn ghost', type: 'button', onclick: importBackup }, 'Restore from a backup file'))),
      row('Start again', 'Erase everything you have learned on this device.', h('button', { class: 'btn ghost', type: 'button', onclick: () => { if (confirm('Erase all your progress on this device? This cannot be undone.')) { State.reset(); render(); } } }, 'Erase my progress'))),
    ...group('About',
      row('Install', installPrompt ? null : 'Open the browser menu and choose “Install app” or “Add to Home screen”. If it says the app is already installed, open it from your home screen.', installPrompt ? h('button', { class: 'btn', type: 'button', onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); } }, `Install ${L.app}`) : null),
      row(`${L.app} and its sources`, null, h('button', { class: 'btn quiet', type: 'button', onclick: aboutSheet }, 'Sources and licences'))));
}
const swatches = () => { const cur = L.themes.some((t) => t.id === State.s.theme) ? State.s.theme : L.themes[0].id; return h('div', { class: 'swatches', role: 'group', 'aria-label': 'Colours' }, ...L.themes.map((t) => h('button', { class: 'swatch', type: 'button', 'data-theme': t.id, 'data-eff': effDark ? 'dark' : 'light', 'aria-pressed': String(t.id === cur), onclick: () => { State.set('theme', t.id); applyLook(); render(); } }, h('span', { class: 'sw-chip' }), t.name))); };
const skipSelect = () => { const sel = h('select', { 'aria-label': 'Stages to skip', onchange: () => { State.set('floor', Number(sel.value)); render(); } }, ...deck.stages.slice(0, -1).map((st, k) => h('option', { value: k }, k === 0 ? 'Nothing. I am starting from the beginning.' : `The first ${k} stage${k > 1 ? 's' : ''} (${n(deck.stages.slice(0, k).reduce((a, x) => a + x.words.length, 0))} words)`))); sel.value = String(State.s.floor || 0); return sel; };

// Save every clip into the cache so the app speaks offline. Progress is a count, not a timer.
function offlineButton() {
  const files = A.allClipFiles();
  const note = h('p', { class: 'note', style: 'margin:10px 0 0' }, '');
  const btn = h('button', { class: 'btn quiet', type: 'button', onclick: async () => {
    if (!('caches' in window)) { note.textContent = 'This browser cannot keep files offline.'; return; }
    btn.disabled = true;
    const cache = await caches.open(L.slug + '-audio');
    let done = 0, bad = 0;
    const queue = [...files];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (queue.length) { const f = queue.shift(); try { if (!(await cache.match(f))) { const r = await fetch(f); if (r.ok) await cache.put(f, r); else bad++; } } catch { bad++; } note.textContent = `Saved ${++done} of ${files.length} clips.`; }
    }));
    note.textContent = bad ? `Saved ${files.length - bad} of ${files.length} clips. ${bad} could not be fetched.` : `All ${files.length} clips are saved on this device.`;
    btn.disabled = false;
  } }, `Save ${n(files.length)} clips`);
  return h('div', {}, btn, note);
}

function exportBackup() {
  const a = h('a', { href: URL.createObjectURL(new Blob([State.exportJson()], { type: 'application/json' })), download: `${L.slug}-progress-${dayKey()}.json` });
  document.body.append(a); a.click(); a.remove();
}
function importBackup() {
  const inp = h('input', { type: 'file', accept: 'application/json', onchange: async () => {
    try { State.importJson(await inp.files[0].text()); render(); alert('Your progress is restored.'); } catch (e) { alert(e.message); }
  } });
  inp.click();
}

function aboutSheet() {
  sheet(() => h('div', {},
    h('h2', {}, `${L.app}`),
    h('p', { class: 'note' }, `Version ${window.APP_BUILD?.v || 'dev'}${window.APP_BUILD?.commit ? ' (' + window.APP_BUILD.commit + ')' : ''}, built ${window.APP_BUILD?.date || deck.built}. ${n(deck.words.length)} words, ${n(deck.items.length)} questions.`),
    h('p', {}, 'Word meanings, genders, sounds and word forms come from English Wiktionary (CC BY-SA 4.0), through kaikki.org. Example sentences come from Tatoeba and its contributors (CC BY 2.0 FR). Word order by frequency comes from the OpenSubtitles-based FrequencyWords list (CC BY-SA 4.0).'),
    h('p', {}, 'Recordings by real people come from Wikimedia Commons (Lingua Libre and others) and Tatoeba, and each is credited to its speaker. The computer voice is Piper.'),
    h('p', {}, 'A few meanings for the commonest function words were checked by hand because Wiktionary lists a rare meaning first. Wrong answers are real words taken from other entries.'),
    h('p', { class: 'note' }, 'The scheduler is FSRS (ts-fsrs, MIT). Fonts: Atkinson Hyperlegible and Fraunces (SIL OFL).')));
}

// ── first launch ──
function skipSheet(done) {
  sheet((close) => h('div', {},
    h('h2', {}, 'Where do you start?'),
    h('p', { class: 'note' }, 'Words in skipped stages are not asked as new questions. You can still look any of them up.'),
    ...deck.stages.slice(0, -1).map((st, k) => h('button', { class: 'btn quiet', type: 'button', onclick: () => { State.set('floor', k); close(); done(); render(); } }, k === 0 ? 'The beginning' : `After the first ${n(deck.stages.slice(0, k).reduce((a, x) => a + x.words.length, 0))} words`))));
}
function welcome() {
  if (State.data.welcomed || Object.keys(State.data.cards).length) return;      // a returning learner is not welcomed again
  const finish_ = () => { State.data.welcomed = true; State.save(); el.remove(); };
  const feature = (icon, title, text) => h('div', { class: 'feature' }, h('span', { class: 'ico' }, svgIcon(icon)), h('div', {}, h('b', {}, title), h('span', {}, text)));
  const el = h('div', { class: 'welcome', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Welcome to ${L.app}` },
    h('div', { class: 'hero' }, h('div', { class: 'art', html: HERO_ART[L.id] }), h('div', { class: 'logo', html: LOGO }), h('p', { class: 'eyebrow' }, 'Welcome to'), h('h1', {}, L.app), h('p', { style: 'font-size:1.08rem;margin-top:8px;color:var(--mu)' }, `Learn ${L.name} by hearing it, reading it and using it.`)),
    h('div', { class: 'body' },
      feature('ear', 'Hear it', 'Real speakers where we have them, and a clear computer voice for everything else. Slow it down any time.'),
      feature('spark', 'Short rounds', 'Eighteen questions at a time. Words come back just before you would forget them.'),
      feature('notes', 'Know the place', 'Short notes on culture, history and the language. Every sentence is quoted from a source.'),
      h('button', { class: 'btn', type: 'button', style: 'margin-top:8px', onclick: finish_ }, 'Start from the beginning', svgIcon('arrow')),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => skipSheet(finish_) }, 'I already know some')));
  document.body.append(el);
}

// ── debugging aid: open with ?debug and call window.__sweep() to draw every question once ──
function sweep() {
  const bad = [];
  const saved = round;
  for (const it of deck.items) {
    round = { steps: [], at: 0, right: 0, missed: [], total: 1, done: 0 };
    try { showQuestion(it.id); const t = app.textContent; if (/\bnull\b|undefined|NaN/.test(t)) bad.push([it.id, 'text']); if (new Set(it.options).size !== it.options.length || !it.options.includes(it.answer)) bad.push([it.id, 'options']); } catch (e) { bad.push([it.id, String(e)]); }
  }
  round = saved; render();
  return { checked: deck.items.length, bad };
}

// ── start ──
async function start() {
  const r = await fetch(window.APP_DECK || 'data/deck.json');
  if (!r.ok) throw new Error('The word list did not load.');
  deck = await r.json(); L = deck.lang;
  S.setDeck(deck);
  await A.loadAudio();
  document.title = `${L.app} — learn ${L.name}`;
  applyLook();
  onVoices(() => { if (!round && (tab === 'today' || tab === 'settings')) render(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (State.s.scheme === 'auto') { applyLook(); if (!round) render(); } });
  render();
  welcome();
  if (/debug/.test(location.search)) { window.__sweep = sweep; window.__S = S; window.__deck = deck; }
  // The offline worker is for the published app. On this computer (localhost) the files are already local, and a worker that keeps
  // old copies only gets in the way while the app is being changed, so it is removed there.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // (open the app with ?sw=1 on this computer to try the offline worker)
    if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && !/[?&]sw=1/.test(location.search)) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      caches.keys().then((ks) => ks.filter((k) => k.startsWith(L.slug + '-v-')).forEach((k) => caches.delete(k))).catch(() => {});
    } else navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
start().catch((e) => { app.replaceChildren(h('main', { class: 'empty' }, h('p', {}, e.message))); });
