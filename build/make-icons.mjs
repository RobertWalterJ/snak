// The app icon: a white speech bubble on the app's accent colour. Run: node build/make-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const COLOR = { da: ['#C42631', '#8F1A24'], is: ['#157C9B', '#0B5068'] }[LANG.id];
const OUT = join(ROOT, 'app', 'icons');
mkdirSync(OUT, { recursive: true });
const BUBBLE = '<path d="M5 4h14a3 3 0 013 3v8a3 3 0 01-3 3h-7l-5 4v-4H5a3 3 0 01-3-3V7a3 3 0 013-3z"/>';
const svg = (s, scale, round) => {
  const m = (s * scale) / 24, off = (s - 24 * m) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLOR[0]}"/><stop offset="1" stop-color="${COLOR[1]}"/></linearGradient></defs><rect width="${s}" height="${s}" ${round ? `rx="${s * 0.22}"` : ''} fill="url(#g)"/><g transform="translate(${off} ${off}) scale(${m})" fill="#fff">${BUBBLE}</g></svg>`);
};
for (const [name, size, scale, round] of [['icon-192.png', 192, 0.6, true], ['icon-512.png', 512, 0.6, true], ['icon-maskable-512.png', 512, 0.48, false], ['apple-touch-icon.png', 180, 0.6, false]]) { await sharp(svg(size, scale, round)).png().toFile(join(OUT, name)); console.log('wrote', name); }
