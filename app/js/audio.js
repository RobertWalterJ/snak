// Playing a word or a sentence out loud, best source first:
//   1. a recording by a real person (Wikimedia Commons / Lingua Libre for words, Tatoeba for sentences)
//   2. a computer-voice clip made at build time (Piper), so every word and example has the same clear voice
//   3. the phone's own voice, if it has one for the language
// data/audio.json says which clips exist and who made them. Every clip is credited on screen.

import { say, stop as stopSpeech, hasVoice } from './voice.js';
import { State } from './store.js';

let man = { w: {}, s: {}, voice: {} };
let current = null;

export async function loadAudio() {
  try { const r = await fetch(window.APP_AUDIO_INDEX || 'data/audio.json'); if (r.ok) man = await r.json(); } catch { /* no clips: the phone voice is used */ }
}
const clip = (kind, key) => man[kind]?.[String(key).toLowerCase()] || null;
export const hasClips = () => Object.keys(man.w || {}).length > 0;
export const canHear = (prefix) => hasClips() || hasVoice(prefix);
export const allClipFiles = () => [...Object.values(man.w || {}), ...Object.values(man.s || {})].map((c) => 'audio/' + c.f);

// who made this clip, in words for the screen ('' if the phone voice would be used)
export function credit(kind, key, prefix) {
  const c = clip(kind, key);
  if (!c) return hasVoice(prefix) ? 'Your phone’s voice (a machine).' : '';
  if (c.k === 'h') return `Recording by ${c.by} (${c.src}${c.lic ? ', ' + c.lic : ''}).`;
  return 'Computer voice (Piper).';                    // the full credit and licence of the voice are in About
}
export const isHuman = (kind, key) => clip(kind, key)?.k === 'h';

export function stop() {
  if (current) { current.pause(); current = null; }
  stopSpeech();
}

// kind 'w' (a word, key = the word) or 's' (a sentence, key = its Tatoeba id). Speed comes from Settings.
export function play(kind, key, text, prefix, { slow = false, onend = null } = {}) {
  stop();
  const rate = (State.s.speed || 1) * (slow ? 0.75 : 1);
  const fallback = () => say(text, prefix, { rate: 0.9 * rate, onend });
  const c = clip(kind, key);
  if (!c) return fallback();
  const a = new Audio('audio/' + c.f);
  a.playbackRate = rate;
  a.preservesPitch = true;
  if (onend) a.onended = onend;
  current = a;
  a.play().catch(() => { if (current === a) fallback(); });
  return true;
}
