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

const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
export const ICON = {
  today: svg('<path d="M4 12l8-8 8 8"/><path d="M6 10v10h12V10"/>'),
  course: svg('<path d="M4 19V5l8 3 8-3v14l-8-3z"/><path d="M12 8v11"/>'),
  words: svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
  notes: svg('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/><path d="M9 8h6"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  speaker: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
};

export const iconBtn = (name, label, onclick) => h('button', { class: 'icon', type: 'button', 'aria-label': label, title: label, onclick, html: ICON[name] });

// A bottom sheet: content over the current screen; tap outside or the close button to leave.
export function sheet(build) {
  const back = h('div', { class: 'sheet-back', onclick: (e) => { if (e.target === back) close(); } });
  const close = () => back.remove();
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
  box.append(h('div', { class: 'row split', style: 'margin-bottom:8px' }, h('span'), iconBtn('close', 'Close', close)), build(close));
  back.append(box);
  document.body.append(back);
  return close;
}

export const seg = (value, options, onchange) => {
  const el = h('div', { class: 'seg', role: 'group' });
  for (const [v, label] of options) el.append(h('button', { type: 'button', 'aria-pressed': String(v === value), onclick: () => onchange(v) }, label));
  return el;
};

export const n = (x) => Number(x).toLocaleString('en-CA');
