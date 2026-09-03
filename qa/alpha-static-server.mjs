// Local-only E2E helper: serves public/ statically and reverse-proxies
// everything else to the production app server.
//
// Background: the local `vinext start` emulation does not provide the
// Cloudflare env.ASSETS binding, so /mvp/* static paths 500 locally
// (production is unaffected — core worker code is untouched by this change).
// This helper exists ONLY so Playwright can exercise the real shell +
// real surfaces end to end on a developer machine. Not used in CI.
//
// Usage:
//   node qa/alpha-static-server.mjs [staticPort] [appPort]
//   ALPHA_QA_URL=http://127.0.0.1:3001 node qa/productized-alpha-journey.mjs

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const staticPort = Number(process.argv[2] ?? process.env.ALPHA_STATIC_PORT ?? 3001);
const appPort = Number(process.argv[3] ?? process.env.ALPHA_APP_PORT ?? 3000);
const publicDir = new URL('../public/', import.meta.url);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://local');
    if (url.pathname === '/mvp' || url.pathname.startsWith('/mvp/')) {
      let relPath = url.pathname;
      if (relPath === '/mvp') relPath = '/mvp/01/index.html';
      else if (relPath.endsWith('/')) relPath += 'index.html';
      else if (!relPath.split('/').pop().includes('.')) relPath += '/index.html';
      const abs = normalize(fileURLToPath(new URL(`../public${relPath}`, import.meta.url).href.split('?')[0]));
      const root = normalize(fileURLToPath(publicDir));
      if (!abs.startsWith(root)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      try {
        const body = await readFile(abs);
        const dot = abs.lastIndexOf('.');
        const type = TYPES[abs.slice(dot).toLowerCase()] ?? 'application/octet-stream';
        res.writeHead(200, { 'content-type': type }).end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
      return;
    }
    const proxy = http.request(
      { host: '127.0.0.1', port: appPort, path: req.url, method: req.method, headers: req.headers },
      (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on('error', () => res.writeHead(502).end('proxy error'));
    req.pipe(proxy);
  } catch {
    try {
      res.writeHead(500).end('helper error');
    } catch {}
  }
});

server.listen(staticPort, '127.0.0.1', () => {
  console.log(`alpha static helper on http://127.0.0.1:${staticPort} -> app :${appPort}`);
});
