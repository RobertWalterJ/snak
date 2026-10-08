// The phone's own voices. There are no recordings in this prototype, so every spoken word is a machine
// voice, and the app says so. If the phone has no voice for the language, listening questions are
// switched off and the read-aloud buttons for the language are hidden, rather than reading it in an English voice.

let voices = [];
const listeners = new Set();
const load = () => { voices = (window.speechSynthesis?.getVoices?.() || []); listeners.forEach((f) => f()); };
if ('speechSynthesis' in window) { load(); speechSynthesis.addEventListener?.('voiceschanged', load); }

export const onVoices = (f) => { listeners.add(f); return () => listeners.delete(f); };
const best = (list) => list.find((v) => v.localService === false && /google|natural|neural/i.test(v.name)) || list.find((v) => /google|natural|neural/i.test(v.name)) || list[0] || null;
const forLang = (prefix) => best(voices.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith(prefix)));
export const targetVoice = (prefix) => forLang(prefix);
export const hasVoice = (prefix) => !!forLang(prefix);

export function stop() { try { speechSynthesis.cancel(); } catch { /* none */ } }

// Say `text` in the target language (prefix 'da', 'is') or in English ('en'). Returns false if it cannot.
export function say(text, prefix, { rate = 0.9, onend = null } = {}) {
  if (!('speechSynthesis' in window) || !text) return false;
  const v = forLang(prefix);
  if (!v && prefix !== 'en') return false;
  stop();
  const u = new SpeechSynthesisUtterance(text);
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-CA';
  u.rate = rate;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
  return true;
}
