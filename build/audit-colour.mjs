// Contrast check for every palette in app/style.css (light and dark): WCAG 2.x ratios.
//
//   node build/audit-colour.mjs
//
// Text on its background needs 4.5:1. The accent is used as a button fill (with --on text) and as text.
// Right and wrong are never shown by colour alone (an icon and a word go with them), so the red/green
// pair is checked only for legibility. A full colour-blindness simulation is NOT run here (see README).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'style.css'), 'utf8');
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const themes = [...css.matchAll(/\[data-theme=(\w+)\]\[data-eff=(\w+)\]\s*\{([^}]*)\}/g)];
let bad = 0;
for (const [, name, eff, body] of themes) {
  const v = Object.fromEntries([...body.matchAll(/--([A-Za-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
  const checks = [
    ['text on page', v.tx, v.bg, 4.5], ['text on card', v.tx, v.sf, 4.5], ['text on raised card', v.tx, v.sf2, 4.5],
    ['muted on page', v.mu, v.bg, 4.5], ['muted on card', v.mu, v.sf, 4.5], ['muted on raised card', v.mu, v.sf2, 4.5], ['muted on band', v.mu, v.bg2, 4.5],
    ['text on tint', v.tx, v.tint, 4.5], ['muted on tint', v.mu, v.tint, 4.5],
    ['accent on page', v.ac, v.bg, 4.5], ['accent on card', v.ac, v.sf, 4.5], ['accent on tint', v.ac, v.tint, 4.5], ['accent on band', v.ac, v.bg2, 4.5],
    ['button text on accent', v.on, v.ac, 4.5],
    ['text on hero (start)', v.tx, v['hero-a'], 4.5], ['text on hero (end)', v.tx, v['hero-b'], 4.5], ['muted on hero (start)', v.mu, v['hero-a'], 4.5], ['muted on hero (end)', v.mu, v['hero-b'], 4.5],
    ['accent on hero (start)', v.ac, v['hero-a'], 3], ['second accent on page (art, not text)', v.ac2, v.bg, 3],
    ['right on card', v.gd, v.sf, 4.5], ['right on its wash', v.gd, v.gdbg, 4.5], ['text on right wash', v.tx, v.gdbg, 4.5],
    ['wrong on card', v.bd, v.sf, 4.5], ['wrong on its wash', v.bd, v.bdbg, 4.5], ['text on wrong wash', v.tx, v.bdbg, 4.5],
    ['right and wrong badges differ in lightness', v.gd, v.bd, 1.0],
  ];
  for (const [what, a, b, min] of checks) { const r = ratio(a, b); if (r < min) { bad++; console.error(`FAIL ${name}/${eff}: ${what} is ${r.toFixed(2)}:1 (need ${min})`); } }
}
console.log(`audit-colour: ${themes.length} palettes checked, ${bad ? bad + ' failure(s)' : 'all pass'}`);
process.exit(bad ? 1 : 0);
