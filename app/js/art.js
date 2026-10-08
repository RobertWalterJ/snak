// The small drawings the app is made of: the logo, the ring, the hero scenes, and the three note covers.
// All SVG, all drawn with the theme's own colours (currentColor and CSS variables), so every palette,
// light and dark, gets matching art without any image files.

const svg = (vb, body, attrs = '') => `<svg viewBox="${vb}" aria-hidden="true" focusable="false" ${attrs}>${body}</svg>`;

// the mark: a speech bubble with a small tail
export const LOGO = svg('0 0 32 32', '<rect x="2" y="3" width="28" height="21" rx="9" fill="currentColor"/><path d="M10 22l-1 7 8-6z" fill="currentColor"/><circle cx="10.5" cy="13.5" r="1.9" fill="var(--bg)"/><circle cx="16" cy="13.5" r="1.9" fill="var(--bg)"/><circle cx="21.5" cy="13.5" r="1.9" fill="var(--bg)"/>');

// Snak: soft ripples of sound. Saga: layered ridges under a pale sun with an aurora band.
export const HERO_ART = {
  da: svg('0 0 320 180', `
    <g fill="none" stroke="var(--ac)" stroke-linecap="round">
      <circle cx="300" cy="18" r="30" stroke-width="3" opacity=".22"/>
      <circle cx="300" cy="18" r="60" stroke-width="3" opacity=".15"/>
      <circle cx="300" cy="18" r="92" stroke-width="3" opacity=".10"/>
      <circle cx="300" cy="18" r="126" stroke-width="3" opacity=".06"/>
    </g>
    <circle cx="300" cy="18" r="9" fill="var(--ac)" opacity=".35"/>`, 'preserveAspectRatio="xMaxYMax slice"'),
  is: svg('0 0 320 180', `
    <path d="M0 80 C60 40 110 70 170 30 C220 0 270 40 320 14 L320 0 L0 0Z" fill="var(--ac2)" opacity=".10"/>
    <path d="M0 96 C70 60 120 86 190 46 C240 20 285 56 320 34 L320 0 L0 0Z" fill="var(--ac)" opacity=".10"/>
    <circle cx="258" cy="118" r="20" fill="var(--ac)" opacity=".16"/>
    <path d="M0 180 L0 138 L48 104 L82 128 L132 84 L176 126 L214 100 L262 142 L320 110 L320 180Z" fill="var(--ac)" opacity=".12"/>
    <path d="M0 180 L0 158 L60 128 L108 152 L160 118 L212 154 L268 128 L320 150 L320 180Z" fill="var(--ac)" opacity=".18"/>`, 'preserveAspectRatio="xMaxYMax slice"'),
};

// A cover for each kind of note.
export const COVER = {
  culture: svg('0 0 64 64', '<rect width="64" height="64" rx="18" fill="var(--tint)"/><g fill="var(--ac)"><circle cx="24" cy="26" r="9" opacity=".95"/><circle cx="41" cy="31" r="12" opacity=".55"/><circle cx="29" cy="43" r="7" opacity=".35"/></g>'),
  history: svg('0 0 64 64', '<rect width="64" height="64" rx="18" fill="var(--tint)"/><g fill="var(--ac)"><rect x="14" y="38" width="36" height="8" rx="2" opacity=".95"/><rect x="20" y="28" width="24" height="8" rx="2" opacity=".6"/><rect x="26" y="18" width="12" height="8" rx="2" opacity=".35"/></g>'),
  language: svg('0 0 64 64', '<rect width="64" height="64" rx="18" fill="var(--tint)"/><g fill="var(--ac)"><path d="M14 20a6 6 0 016-6h16a6 6 0 016 6v10a6 6 0 01-6 6H27l-8 7v-7h-1a6 6 0 01-4-6z" opacity=".95"/><path d="M34 40h10a6 6 0 006-6v-8" fill="none" stroke="var(--ac)" stroke-width="3" stroke-linecap="round" opacity=".45"/></g>'),
};

// A ring that fills as the learner progresses. pct 0-100. The number inside is passed in as text.
export function ring(pct, inner, size = 92, stroke = 9) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${Math.round(pct)} percent">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ln)" stroke-width="${stroke}" opacity=".9"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ac)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})" class="ring-arc"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-text">${inner}</text></svg>`;
}
