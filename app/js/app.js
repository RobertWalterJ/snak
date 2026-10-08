// Snak and Saga — one app, two languages. The deck says which language it is (deck.lang).
//
// Screens: Today, Course, Words, Settings; a round (teach cards and questions); a word sheet.
// Nothing here runs on a timer. Nothing speaks unless the learner chose to hear it.

import { h, ICON, iconBtn, sheet, seg, n } from './ui.js';
import { State, dayKey } from './store.js';
import * as S from './sched.js';
import { say, stop, hasVoice, onVoices } from './voice.js';

let deck, L;
const app = document.getElementById('app');
let tab = 'today';
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (tab === 'settings') render(); });

const POS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun', prep: 'preposition', conj: 'conjunction', det: 'determiner', num: 'number', intj: 'interjection', part: 'particle' };
const canSound = () => hasVoice(L.voice.prefix);

// ── look ──
function applyLook() {
  const s = State.s;
  const theme = L.themes.some((t) => t.id === s.theme) ? s.theme : L.themes[0].id;
  const dark = s.scheme === 'dark' || (s.scheme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const el = document.documentElement;
  el.setAttribute('data-theme', theme); el.setAttribute('data-eff', dark ? 'dark' : 'light');
  el.classList.toggle('big', !!s.big);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', getComputedStyle(document.body).backgroundColor);
}

// ── speaking ──
// A speaker button, shown only if the phone can speak that language.
function speak(text, lang = 'target', label = 'Read aloud') {
  const prefix = lang === 'target' ? L.voice.prefix : 'en';
  if (lang === 'target' && !canSound()) return null;
  return h('button', { class: 'icon', type: 'button', 'aria-label': label, title: label, onclick: (e) => { e.stopPropagation(); say(text, prefix); }, html: ICON.speaker });
}
const withSpeaker = (node, text, lang) => h('div', { class: 'row' }, h('div', { class: 'grow' }, node), speak(text, lang));

// ── a word, shown in full: the teaching card and the word sheet ──
const genderText = (code) => { const g = L.genders[code]; return g ? `${g.label} (${g.note})` : null; };
function wordBody(i) {
  const w = deck.words[i];
  const b = h('div');
  b.append(withSpeaker(h('p', { class: 'big-word' }, w.w), w.w));
  const bits = [h('span', { class: 'chip' }, POS[w.k] || w.k)];
  if (w.gen && genderText(w.gen)) bits.push(h('span', { class: 'chip' }, genderText(w.gen)));
  b.append(h('p', {}, ...bits, w.ipa ? h('span', { class: 'ipa' }, w.ipa) : null));
  b.append(h('p', { class: 'prompt' }, 'Meaning'), h('p', { style: 'font-size:1.15rem;margin-top:0' }, w.g));
  const alts = (w.alt || []).filter((a) => !a.toLowerCase().includes(w.g.toLowerCase()) && !w.g.toLowerCase().includes(a.toLowerCase()));
  if (alts.length) b.append(h('p', { class: 'note' }, 'Also: ' + alts.join('; ')));
  if (w.k === 'v' && w.parts?.pr && L.id === 'da') {
    const p = w.parts;
    b.append(h('table', { class: 'forms' }, ...[['Infinitive', 'at ' + w.w], ['Present', p.pr], ['Past', p.pa], ['Perfect', p.pf]].filter((r) => r[1]).map(([a, c]) => h('tr', {}, h('th', {}, a), h('td', { class: 'tx' }, c)))));
  }
  if (w.k === 'n' && w.decl) {
    const d = w.decl, cell = (s) => d[s]?.[0] || '–';
    b.append(h('table', { class: 'forms' },
      h('tr', {}, h('th', {}, 'Case'), h('th', {}, 'Singular'), h('th', {}, 'Plural')),
      ...[['Nominative', 'nom'], ['Accusative', 'acc'], ['Dative', 'dat'], ['Genitive', 'gen']].map(([a, c]) => h('tr', {}, h('th', {}, a), h('td', { class: 'tx' }, cell('sg.ind.' + c)), h('td', { class: 'tx' }, cell('pl.ind.' + c))))));
  }
  const ex = deck.examples[i] || [];
  for (const si of ex) { const s = deck.sentences[si]; b.append(h('div', { class: 'ex' }, withSpeaker(h('div', { class: 'tx' }, s.t), s.t), h('div', { class: 'note' }, s.e))); }
  if (!ex.length && w.ex?.length) for (const s of w.ex) b.append(h('div', { class: 'ex' }, withSpeaker(h('div', { class: 'tx' }, s.t), s.t), h('div', { class: 'note' }, s.e)));
  if (L.pronNote && i < 400) b.append(h('p', { class: 'note' }, L.pronNote));
  return b;
}
const openWord = (i) => sheet(() => h('div', {}, wordBody(i), stateLine(i)));
function stateLine(i) {
  const r = deck.readOf.get(i), c = r && S.cardOf(r);
  return h('p', { class: 'note' }, !c ? 'You have not met this word yet.' : S.wordKnown(i) ? 'You know this word. It comes back rarely.' : 'You are learning this word.');
}

// ── a round ──
let round = null;                                   // { steps, at, right, missed, total }
function startRound(only = null, label = '') {
  const steps = S.buildRound({ canSound: canSound(), only });
  if (!steps.some((x) => x.type === 'q')) { sheet(() => h('div', {}, h('h2', {}, 'Nothing to ask yet'), h('p', {}, only ? `This opens as you learn words. Do a normal round first.` : 'You have finished everything available. Come back later.'))); return; }
  round = { steps, at: 0, right: 0, missed: [], total: steps.filter((x) => x.type === 'q').length, done: 0, label, only };
  show();
}
function leaveRound() { stop(); round = null; render(); }

function chrome(content, { withTabs = true } = {}) {
  app.replaceChildren(
    h('header', { class: 'bar' }, h('span', { class: 'wordmark' }, L.app), iconBtn('gear', 'Settings', () => { round = null; tab = 'settings'; render(); })),
    content,
    withTabs ? tabsEl() : null);
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

function progressEl() {
  const pct = Math.round((round.done / round.total) * 100);
  return h('div', {}, h('div', { class: 'row split' }, h('span', { class: 'note' }, `Question ${Math.min(round.done + 1, round.total)} of ${round.total}`), h('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (confirm('Stop this round? Your answers so far are saved.')) leaveRound(); } }, 'Stop')), h('div', { class: 'prog', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${pct}%` })));
}

function showTeach(i) {
  chrome(h('main', {}, progressEl(), h('div', { class: 'card', style: 'margin-top:14px' }, h('p', { class: 'chip' }, 'A new word'), wordBody(i)), h('button', { class: 'btn', type: 'button', onclick: () => { S.markSeen(i); stop(); advance(); } }, 'Got it')), { withTabs: false });
  if (State.s.autoRead && canSound()) say(deck.words[i].w, L.voice.prefix);
}

const gtext = (key) => { const g = Object.values(L.genders).find((x) => x.key === key); return g ? `${g.label} (${g.note})` : key; };

function questionParts(it) {
  const w = deck.words[it.i];
  switch (it.k) {
    case 'read': return { prompt: 'What does this word mean?', main: h('p', { class: 'big-word' }, w.w), say: w.w, optTx: false };
    case 'recall': return { prompt: 'Which word means this?', main: h('p', { class: 'big-word', style: 'font-family:var(--f-ui)' }, w.g), say: null, optTx: true };
    case 'listen': return { prompt: 'Listen. What does the word mean?', main: h('button', { class: 'btn small', type: 'button', onclick: () => say(w.w, L.voice.prefix, { rate: 0.8 }) }, 'Play the word again'), say: w.w, optTx: false, autoplay: true };
    case 'cloze': {
      const s = deck.sentences[it.sent];
      return { prompt: 'Choose the word that fits the gap.', main: h('div', {}, h('p', { class: 'sent' }, it.pre, h('span', { class: 'blank' }, ' '), it.post), h('p', { class: 'note' }, s.e)), say: null, optTx: true };
    }
    case 'gender': return { prompt: L.genderPrompt, main: h('div', {}, h('p', { class: 'big-word' }, w.w), h('p', { class: 'note' }, w.g)), say: w.w, optTx: false, label: gtext };
    case 'form': return { prompt: it.ask.charAt(0).toUpperCase() + it.ask.slice(1) + '. Which form is it?', main: h('div', {}, h('p', { class: 'big-word' }, it.prompt), h('p', { class: 'note' }, w.g)), say: w.w, optTx: true };
    default: return { prompt: '', main: h('p', {}, it.k), say: null, optTx: false };
  }
}

function showQuestion(id) {
  const it = deck.byId.get(id);
  const q = questionParts(it);
  const w = deck.words[it.i];
  const box = h('div', { class: 'card', style: 'margin-top:14px' });
  const head = h('div', { class: 'row split' }, h('p', { class: 'prompt' }, q.prompt), q.say ? speak(q.say) : null);
  box.append(head, q.main);
  const choices = h('div', { class: 'choices' });
  const fb = h('div');
  let answered = false;
  const btns = [];
  const finishQ = (picked) => {
    if (answered) return; answered = true; stop();
    const correct = picked === it.answer;
    S.answer(id, correct);
    round.done++;
    if (correct) round.right++; else round.missed.push(it.i);
    btns.forEach(({ b, o, mark }) => { b.setAttribute('aria-disabled', 'true'); if (o === it.answer) { b.classList.add('right'); mark.textContent = '✓ right'; } else if (o === picked) { b.classList.add('wrong'); mark.textContent = '✗ not this one'; } });
    skip.remove();
    fb.append(feedback(it, w, correct, picked), h('button', { class: 'btn', type: 'button', onclick: () => { stop(); advance(); } }, 'Next'));
    fb.scrollIntoView({ block: 'nearest' });
    if (State.s.autoRead) afterSpeak(it, w);
  };
  for (const o of it.options) {
    const mark = h('span', { class: 'mark' });
    const text = q.label ? q.label(o) : o;
    const b = h('button', { class: 'opt' + (q.optTx ? ' tx' : ''), type: 'button', onclick: () => finishQ(o) }, text, mark);
    btns.push({ b, o, mark });
    choices.append(h('div', { class: 'choice' }, b, q.optTx && !(it.k === 'recall' && false) ? speak(o) : null));
  }
  const skip = h('button', { class: 'btn ghost small', type: 'button', onclick: () => finishQ(null) }, 'I don’t know');
  chrome(h('main', {}, progressEl(), box, choices, skip, fb), { withTabs: false });
  if (q.autoplay && canSound()) say(w.w, L.voice.prefix, { rate: 0.8 });
  else if (State.s.autoRead && q.say && it.k !== 'listen') say(q.say, L.voice.prefix);
}

function feedback(it, w, correct, picked) {
  const f = h('div', { class: 'fb ' + (correct ? 'good' : 'bad') });
  f.append(h('p', {}, h('b', { class: correct ? 'good' : 'bad' }, correct ? '✓ Right.' : picked == null ? '✗ Here is the answer.' : '✗ Not quite.')));
  const ans = it.k === 'gender' ? gtext(it.answer) : it.answer;
  if (!correct) f.append(h('p', {}, 'The answer is ', h('b', { class: it.k === 'read' || it.k === 'listen' || it.k === 'gender' ? '' : 'tx' }, ans), '.'));
  if (it.k === 'cloze') { const s = deck.sentences[it.sent]; f.append(withSpeaker(h('p', { class: 'tx' }, it.pre + it.answer + it.post), s.t), h('p', { class: 'note' }, s.e)); }
  else if (it.k === 'form') f.append(h('p', {}, h('span', { class: 'tx' }, `${it.prompt} → ${it.answer}`), ' ', h('span', { class: 'note' }, `(${it.ask})`)));
  else f.append(withSpeaker(h('p', {}, h('span', { class: 'tx' }, w.w), ' = ', w.g), w.w));
  f.append(h('button', { class: 'btn ghost small', type: 'button', onclick: () => openWord(it.i) }, 'See the whole word'));
  return f;
}
function afterSpeak(it, w) { if (!canSound()) return; say(it.k === 'cloze' ? it.pre + it.answer + it.post : it.k === 'form' ? it.answer : w.w, L.voice.prefix); }

function finish() {
  const r = round; stop();
  const uniq = [...new Set(r.missed)];
  chrome(h('main', {},
    h('div', { class: 'card hero' }, h('h1', {}, 'Round done'), h('p', {}, `You answered ${r.right} of ${r.total} right.`), h('div', { class: 'prog' }, h('i', { style: `width:${Math.round(100 * r.right / r.total)}%` }))),
    uniq.length ? h('div', { class: 'card' }, h('h2', {}, 'Words to look at again'), h('ul', { class: 'list' }, ...uniq.map((i) => wordRow(i)))) : null,
    h('button', { class: 'btn', type: 'button', onclick: () => startRound(r.only, r.label) }, 'Another round'),
    h('button', { class: 'btn ghost', type: 'button', onclick: leaveRound }, 'Back to Today')), { withTabs: false });
}

const wordRow = (i) => { const w = deck.words[i]; return h('li', { onclick: () => openWord(i) }, h('div', {}, h('div', { class: 'w' }, w.w), h('div', { class: 'g' }, w.g))); };

// ── tabs ──
const TABS = [['today', 'Today'], ['course', 'Course'], ['words', 'Words'], ['settings', 'Settings']];
const tabsEl = () => h('nav', { class: 'tabs', 'aria-label': 'Main' }, ...TABS.map(([id, label]) => h('button', { type: 'button', 'aria-current': tab === id ? 'page' : null, onclick: () => { tab = id; render(); } }, h('span', { html: id === 'settings' ? ICON.gear : ICON[id] }), label)));

function render() {
  if (round) return show();
  applyLook();
  const main = h('main', {});
  ({ today: todayScreen, course: courseScreen, words: wordsScreen, settings: settingsScreen })[tab](main);
  chrome(main);
}

function todayScreen(m) {
  const c = S.counts(canSound());
  const st = S.stageState();
  const log = State.data.log[dayKey()] || { n: 0, c: 0, w: 0 };
  m.append(h('div', { class: 'card hero' },
    h('h1', {}, st.done ? 'You have met every stage' : `Stage ${st.current + 1}: ${deck.stages[Math.min(st.current, deck.stages.length - 1)].title}`),
    h('p', {}, `A round is ${State.s.sitting} questions. ${c.due ? `${c.due} are ready to review.` : 'Nothing is due, so a round will be mostly new.'}`),
    h('button', { class: 'btn', type: 'button', onclick: () => startRound() }, 'Start a round'),
    h('div', { class: 'stats' }, stat(c.known, 'words known'), stat(c.due, 'due to review'), stat(log.n, 'answered today'))));
  const ladderItems = deck.items.filter((it) => it.k === 'form');
  const open = ladderItems.filter((it) => S.met(it.id) || S.wordStarted(it.i) || State.data.seen[it.i]).length;
  m.append(h('div', { class: 'card' }, h('h2', {}, `Practise: ${deck.ladder.title}`), h('p', { class: 'note' }, deck.ladder.intro),
    h('button', { class: 'btn ghost', type: 'button', disabled: open ? null : true, onclick: () => startRound((it) => it.k === 'form') }, open ? 'Start a practice round' : 'Opens as you learn words')));
  if (!canSound()) m.append(h('div', { class: 'card' }, h('h2', {}, `No ${L.voice.label} voice on this device`), h('p', { class: 'note' }, `Listening questions are switched off, and there are no read-aloud buttons for ${L.name}. Install a ${L.voice.label} voice in your phone’s text-to-speech settings to turn them on.`)));
  if (!State.persistent) m.append(h('div', { class: 'card' }, h('p', { class: 'note' }, 'This browser is not saving your progress. Settings has a backup button.')));
}
const stat = (v, l) => h('div', { class: 'stat' }, h('b', {}, n(v)), h('span', {}, l));

function courseScreen(m) {
  const st = S.stageState();
  m.append(h('h1', {}, 'Course'), h('p', { class: 'note' }, `${n(deck.words.length)} words in ${deck.stages.length} stages, commonest first. A stage opens the next one when you have started 60% of its words.`));
  for (const s of st.stages) {
    m.append(h('div', { class: 'card' },
      h('div', { class: 'row split' }, h('h2', {}, `${s.n + 1}. ${s.title}`), s.n === st.current ? h('span', { class: 'chip' }, 'You are here') : s.n < (State.s.floor || 0) ? h('span', { class: 'chip' }, 'Skipped') : null),
      h('p', { class: 'note' }, s.why),
      h('div', { class: 'prog' }, h('i', { style: `width:${Math.min(100, Math.round(100 * s.have / s.words.length))}%` })),
      h('p', { class: 'note', style: 'margin:6px 0 0' }, `${s.have} of ${s.words.length} started · ${s.known} known`)));
  }
}

let wordLimit = 100;
function wordsScreen(m) {
  const q = h('input', { type: 'search', placeholder: `Look up a word in ${L.name} or English`, 'aria-label': 'Search words', autocomplete: 'off', value: wordsScreen.q || '' });
  const list = h('ul', { class: 'list' });
  const draw = () => {
    wordsScreen.q = q.value;
    const t = q.value.trim().toLowerCase();
    const hits = deck.words.map((w, i) => i).filter((i) => !t || deck.words[i].w.includes(t) || deck.words[i].g.toLowerCase().includes(t));
    list.replaceChildren(...hits.slice(0, wordLimit).map((i) => { const li = wordRow(i); li.append(h('span', { class: 'state' }, S.wordKnown(i) ? 'known' : S.wordStarted(i) ? 'learning' : 'new')); return li; }));
    if (hits.length > wordLimit) list.append(h('li', { onclick: () => { wordLimit += 200; draw(); } }, `Show more (${n(hits.length - wordLimit)} left)`));
    if (!hits.length) list.append(h('li', {}, 'No word found.'));
  };
  q.addEventListener('input', () => { wordLimit = 100; draw(); });
  m.append(h('h1', {}, 'Words'), q, list);
  draw();
}

function settingsScreen(m) {
  const s = State.s;
  const row = (title, note, control) => h('div', { class: 'setting' }, h('b', {}, title), note ? h('p', { class: 'note' }, note) : null, control);
  const set = (k, v) => { State.set(k, v); applyLook(); render(); };
  m.append(h('h1', {}, 'Settings'),
    h('div', { class: 'card' }, h('h2', {}, 'Look'),
      row('Colours', null, seg(L.themes.some((t) => t.id === s.theme) ? s.theme : L.themes[0].id, L.themes.map((t) => [t.id, t.name]), (v) => set('theme', v))),
      row('Light or dark', null, seg(s.scheme, [['auto', 'Phone'], ['light', 'Light'], ['dark', 'Dark']], (v) => set('scheme', v))),
      row('Text size', null, seg(s.big ? 'big' : 'normal', [['normal', 'Normal'], ['big', 'Large']], (v) => set('big', v === 'big')))),
    h('div', { class: 'card' }, h('h2', {}, 'Rounds'),
      row('Questions in a round', 'A round is never cut short. There is always an “Another round” button.', seg(String(s.sitting), [['12', '12'], ['18', '18'], ['25', '25'], ['40', '40']], (v) => set('sitting', Number(v)))),
      row('New questions in a round', 'The rest are reviews.', seg(String(s.newPerRound), [['6', '6'], ['9', '9'], ['14', '14']], (v) => set('newPerRound', Number(v)))),
      row('Teaching cards', 'Show a card with the meaning, sound and examples before a new word.', seg(s.teach ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], (v) => set('teach', v === 'on')))),
    h('div', { class: 'card' }, h('h2', {}, 'Sound'),
      row('Read aloud automatically', canSound() ? `Uses your phone’s ${L.voice.label} voice. It is a machine voice, not a recording. There is also a speaker button on every card.` : `This phone has no ${L.voice.label} voice, so there is nothing to read aloud.`, seg(s.autoRead ? 'on' : 'off', [['off', 'Off'], ['on', 'On']], (v) => set('autoRead', v === 'on'))),
      h('p', { class: 'note' }, canSound() ? `Voice found: ${(window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(L.voice.prefix)) || {}).name}.` : '')),
    h('div', { class: 'card' }, h('h2', {}, 'Where you start'),
      row('I already know the first…', 'Skipped stages are not asked as new questions. You can still look up any word.',
        (() => { const sel = h('select', { 'aria-label': 'Stages to skip', onchange: () => set('floor', Number(sel.value)) }, ...deck.stages.slice(0, -1).map((st, k) => h('option', { value: k }, k === 0 ? 'Nothing. I am starting from the beginning.' : `The first ${k} stage${k > 1 ? 's' : ''} (${n(deck.stages.slice(0, k).reduce((a, x) => a + x.words.length, 0))} words)`))); sel.value = String(s.floor || 0); return sel; })())),
    h('div', { class: 'card' }, h('h2', {}, 'Your progress'),
      h('p', { class: 'note' }, 'Progress is saved on this device only. Save a backup file to move it or keep it safe.'),
      h('button', { class: 'btn ghost', type: 'button', onclick: exportBackup }, 'Save a backup file'),
      h('button', { class: 'btn ghost', type: 'button', onclick: importBackup }, 'Restore from a backup file'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { if (confirm('Erase all your progress on this device? This cannot be undone.')) { State.reset(); render(); } } }, 'Erase my progress')),
    h('div', { class: 'card' }, h('h2', {}, 'Install'),
      installPrompt ? h('button', { class: 'btn', type: 'button', onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); } }, `Install ${L.app}`) : h('p', { class: 'note' }, 'To install: open the browser menu and choose “Install app” or “Add to Home screen”. If it says the app is already installed, open it from your home screen.'),
      h('button', { class: 'btn ghost', type: 'button', onclick: aboutSheet }, `About ${L.app} and its sources`)));
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
    h('h2', {}, `${L.app} — prototype`),
    h('p', {}, `Version built ${deck.built}. ${n(deck.words.length)} words, ${n(deck.items.length)} questions.`),
    h('p', {}, `Word meanings, genders, sounds and word forms come from English Wiktionary (CC BY-SA 4.0), through kaikki.org. Example sentences come from Tatoeba and its contributors (CC BY 2.0 FR). Word order by frequency comes from the OpenSubtitles-based FrequencyWords list (CC BY-SA 4.0).`),
    h('p', {}, 'A few meanings for the commonest function words were checked by hand because Wiktionary lists a rare meaning first. Wrong answers are real words taken from other entries.'),
    h('p', { class: 'note' }, 'The scheduler is FSRS (ts-fsrs, MIT). Fonts: Atkinson Hyperlegible and Fraunces (SIL OFL).')));
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
  const r = await fetch('data/deck.json');
  if (!r.ok) throw new Error('The word list did not load.');
  deck = await r.json(); L = deck.lang;
  S.setDeck(deck);
  document.title = `${L.app} — learn ${L.name}`;
  applyLook();
  onVoices(() => { if (!round && (tab === 'today' || tab === 'settings')) render(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (State.s.scheme === 'auto') applyLook(); });
  render();
  if (/debug/.test(location.search)) { window.__sweep = sweep; window.__S = S; window.__deck = deck; }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
start().catch((e) => { app.replaceChildren(h('main', { class: 'empty' }, h('p', {}, e.message))); });
