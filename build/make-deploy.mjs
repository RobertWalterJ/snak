// Write docs/ for GitHub Pages.
//
//   node build/make-deploy.mjs
//
// Pages serves this at https://robertwalterj.github.io/<slug>/ — a SUBPATH. Every URL here is relative
// ('./sw.js', 'icons/…'), never '/…', which would work on localhost and break once deployed.
//
//   app.<hash>.js, style.<hash>.css, data/deck.<hash>.json, data/audio.<hash>.json
//       named by content, so the service worker can serve them cache-first and a changed file is a new
//       name, never a stale copy;
//   index.html  small, and fetched network-first, so a new deploy is noticed;
//   audio/      the clips (recordings by real people and the computer voice), exactly those the manifest names;
//   sw.js       stamped with the build, with the hashed files in its shell.
//
// docs/ is generated. Never edit it by hand: run this again.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'app'), OUT = join(ROOT, 'docs');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const hash = (b) => createHash('sha256').update(b).digest('hex').slice(0, 10);
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

rmSync(OUT, { recursive: true, force: true });
for (const d of ['data', 'icons', 'audio']) mkdirSync(join(OUT, d), { recursive: true });

// the build stamp shown in About
let commit = 'local';
try {
  commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  if (execFileSync('git', ['status', '--porcelain', '--', 'app', 'content', 'build', ':!app/data', ':!app/audio'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) commit += '+';
} catch { /* not a repo yet */ }
const d = new Date();
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// script, style, data
const js = (await build({ entryPoints: [join(APP, 'js', 'app.js')], bundle: true, format: 'esm', write: false, minify: true, target: 'es2020', legalComments: 'none' })).outputFiles[0].text;
const jsName = `app.${hash(js)}.js`;
writeFileSync(join(OUT, jsName), js);
const css = readFileSync(join(APP, 'style.css'), 'utf8');
const cssName = `style.${hash(css)}.css`;
writeFileSync(join(OUT, cssName), css);
const deck = readFileSync(join(APP, 'data', 'deck.json'));
const deckName = `data/deck.${hash(deck)}.json`;
writeFileSync(join(OUT, deckName), deck);
const aidx = readFileSync(join(APP, 'data', 'audio.json'));
const aidxName = `data/audio.${hash(aidx)}.json`;
writeFileSync(join(OUT, aidxName), aidx);

// the audio that ships: exactly the files the manifest names, so nothing unlisted goes out
const man = JSON.parse(aidx);
let clips = 0, bytes = 0, missing = [];
for (const kind of ['w', 's']) for (const c of Object.values(man[kind])) {
  const from = join(APP, 'audio', c.f);
  if (!existsSync(from)) { missing.push(c.f); continue; }
  mkdirSync(dirname(join(OUT, 'audio', c.f)), { recursive: true });
  cpSync(from, join(OUT, 'audio', c.f));
  clips++; bytes += statSync(from).size;
}
if (missing.length) throw new Error(`the audio manifest names ${missing.length} files that do not exist (first: ${missing[0]}). Run node build/verify-audio.mjs`);

// fonts, icons, manifest
cpSync(join(APP, 'fonts'), join(OUT, 'fonts'), { recursive: true });
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) cpSync(join(APP, 'icons', f), join(OUT, 'icons', f));
cpSync(join(APP, 'manifest.webmanifest'), join(OUT, 'manifest.webmanifest'));

// the page
const BUILD = JSON.stringify({ v: pkg.version, commit, date });
let html = readFileSync(join(APP, 'index.html'), 'utf8');
const sub = (a, b) => { if (!html.includes(a)) throw new Error('index.html is missing: ' + a); html = html.replace(a, () => b); };
sub('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="${cssName}">`);
sub('<script type="module" src="js/app.js"></script>', `<script>window.APP_BUILD=${BUILD};window.APP_DECK=${JSON.stringify(deckName)};window.APP_AUDIO_INDEX=${JSON.stringify(aidxName)};</script>\n<script type="module" src="${jsName}"></script>`);
if (/(href|src)="\/(?!\/)/.test(html)) throw new Error(`a root-absolute URL would break under /${LANG.slug}/`);
writeFileSync(join(OUT, 'index.html'), html);

// the service worker: this app's prefix, the build, and the files to keep for offline use
const fonts = readdirSync(join(APP, 'fonts')).filter((f) => f.endsWith('.woff2') || f === 'fonts.css').map((f) => 'fonts/' + f);
const shell = ['./', cssName, jsName, deckName, aidxName, 'icons/icon-192.png', 'icons/icon-512.png', ...fonts];
let sw = readFileSync(join(APP, 'sw.js'), 'utf8');
const stamp = `${pkg.version}-${hash(js + css + deck + aidx)}`;
const swSub = (a, b) => { if (!sw.includes(a)) throw new Error('sw.js is missing: ' + a); sw = sw.replace(a, () => b); };
swSub("const PREFIX = 'snak-';", `const PREFIX = '${LANG.slug}-';`);
swSub("const BUILD = 'dev';", `const BUILD = ${JSON.stringify(stamp)};`);
swSub("const SHELL = ['./'];", `const SHELL = ${JSON.stringify(shell)};`);
writeFileSync(join(OUT, 'sw.js'), sw);
writeFileSync(join(OUT, '.nojekyll'), '');

// everything the worker precaches must exist, and the page must stay small
const gone = shell.filter((u) => u !== './' && !existsSync(join(OUT, u)));
if (gone.length) throw new Error('the service worker precaches files that do not exist: ' + gone.join(', '));
if (statSync(join(OUT, 'index.html')).size > 8000) throw new Error('index.html has grown: the page should stay a small shell');

const mb = (n) => (n / 1048576).toFixed(1);
const total = readdirSync(OUT, { recursive: true }).reduce((n, f) => { try { const s = statSync(join(OUT, f)); return n + (s.isFile() ? s.size : 0); } catch { return n; } }, 0);
console.log(`wrote docs/ — v${pkg.version} ${commit}; script ${(statSync(join(OUT, jsName)).size / 1024).toFixed(0)} KB, deck ${mb(deck.length)} MB, ${clips} clips ${mb(bytes)} MB; whole site ${mb(total)} MB`);
