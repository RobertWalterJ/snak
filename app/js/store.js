// What is kept on this phone: settings, the schedule for every question, and which words have been taught.
// Everything lives in one localStorage key, named in <meta name="app-key"> so Snak and Saga never share it.
// If storage is blocked, the app still works for the session and says so in Settings.

const KEY = document.querySelector('meta[name=app-key]')?.content || 'app.v1';

const DEFAULTS = () => ({
  settings: { theme: null, scheme: 'auto', big: false, sitting: 18, newPerRound: 9, autoRead: false, floor: 0, teach: true },
  cards: {},            // question id -> FSRS card (dates as ISO strings)
  seen: {},             // word index -> true once its teaching card has been shown
  notesRead: {},        // note id -> true once the learner has read it (its quiz questions open then)
  log: {},              // YYYY-MM-DD -> { n: answered, c: correct, w: new questions started }
});

let ok = true;
function read() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return DEFAULTS(); const d = JSON.parse(raw); const base = DEFAULTS(); return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } }; }
  catch { ok = false; return DEFAULTS(); }
}

export const State = {
  data: read(),
  get persistent() { return ok; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); ok = true; } catch { ok = false; } },
  get s() { return this.data.settings; },
  set(k, v) { this.data.settings[k] = v; this.save(); },
  exportJson() { return JSON.stringify({ app: KEY, saved: new Date().toISOString(), data: this.data }, null, 1); },
  importJson(text) {
    const o = JSON.parse(text);
    if (!o || o.app !== KEY || !o.data?.cards) throw new Error('This file is not a backup from this app.');
    this.data = { ...DEFAULTS(), ...o.data, settings: { ...DEFAULTS().settings, ...(o.data.settings || {}) } };
    this.save();
  },
  reset() { this.data = DEFAULTS(); this.save(); },
};

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function bump(field) {
  const k = dayKey();
  const l = (State.data.log[k] ||= { n: 0, c: 0, w: 0 });
  l[field] = (l[field] || 0) + 1;
}
