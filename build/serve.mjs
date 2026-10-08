// A plain static server, so the browser can run the real app (service worker and all).
//
//   node build/serve.mjs [--port N]     serves app/ on http://localhost:8911 (Danish) or :8912 (Icelandic)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const { LANG } = await import(pathToFileURL(join(ROOT, 'content', 'lang.mjs')).href);
const arg = process.argv.indexOf('--port');
const PORT = arg > 0 ? Number(process.argv[arg + 1]) : (LANG.id === 'da' ? 8911 : 8912);
const APP = join(ROOT, 'app');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = normalize(path === '/' ? 'index.html' : path.slice(1)).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(APP, rel));
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not here');
  }
}).listen(PORT, () => console.log(`${LANG.app}: http://localhost:${PORT}/`));
