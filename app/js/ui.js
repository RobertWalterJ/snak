// Small DOM helpers and icons shared by every screen.

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

// One icon family: 24px grid, 1.8 stroke, round caps. Names match what they mean on screen.
const i = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
export const ICON = {
  today: i('<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/>'),
  course: i('<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M8 6h6a3 3 0 010 6h-4a3 3 0 000 6h6"/>'),
  words: i('<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>'),
  notes: i('<path d="M6 4h9a3 3 0 013 3v13H9a3 3 0 01-3-3z"/><path d="M6 17a3 3 0 013-3h9"/><path d="M10 8h5"/>'),
  settings: i('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>'),
  speaker: i('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 010 6"/><path d="M18 6.5a7.5 7.5 0 010 11"/>'),
  close: i('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: i('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  cross: i('<path d="M7 7l10 10M17 7L7 17"/>'),
  moon: i('<path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z"/>'),
  sun: i('<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>'),
  search: i('<circle cx="11" cy="11" r="6.2"/><path d="M16 16l4 4"/>'),
  lock: i('<rect x="5.5" y="10.5" width="13" height="9" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>'),
  arrow: i('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  ear: i('<path d="M8 15c0-3 4-3.5 4-7a3.5 3.5 0 00-7 0"/><path d="M12 8a3.5 3.5 0 017 0c0 4-3 4.5-3 8a3 3 0 01-5.5 1.7"/>'),
  book: i('<path d="M5 5.5A2.5 2.5 0 017.5 3H19v15H7.5A2.5 2.5 0 005 20.5z"/><path d="M5 20.5A2.5 2.5 0 007.5 23H19"/>'),
  spark: i('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  turtle: i('<path d="M5 16c0-4 3-7 7-7s7 3 7 7z"/><path d="M5 16l-2 1.5M19 16l2 1.5M9 16l-.5 2M15 16l.5 2"/>'),
};

export const iconBtn = (name, label, onclick, cls = '') => h('button', { class: 'iconbtn ' + cls, type: 'button', 'aria-label': label, title: label, onclick, html: ICON[name] });

// A bottom sheet: content over the current screen. Tap outside, press the close button or Escape to leave.
export function sheet(build) {
  const back = h('div', { class: 'sheet-back', onclick: (e) => { if (e.target === back) close(); } });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  document.addEventListener('keydown', onKey);
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
  box.append(h('div', { class: 'grabber', 'aria-hidden': 'true' }), h('div', { class: 'sheet-top' }, h('span'), iconBtn('close', 'Close', close)), build(close));
  back.append(box);
  document.body.append(back);
  return close;
}

// Segmented control: one choice of a few.
export const seg = (value, options, onchange) => {
  const el = h('div', { class: 'seg', role: 'group' });
  for (const [v, label] of options) el.append(h('button', { type: 'button', 'aria-pressed': String(v === value), onclick: () => onchange(v) }, label));
  return el;
};

export const n = (x) => Number(x).toLocaleString('en-CA');
