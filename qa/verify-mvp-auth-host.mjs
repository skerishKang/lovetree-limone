import assert from 'node:assert/strict';
import { mkdir, writeFile, cp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Product auth-host E2E (Issue #596 PRODUCTION_AUTH_HOST lane).
//
// Serves a faithful production-layout replica: current public/ plus the
// freshly built dist/client/mvp/01/auth-host.js (built with FAKE Firebase
// client config — never real secrets — so the host takes its real
// SDK-signed-out path headlessly).
//
// Proves in a real browser:
//   B. signed-out gate visible, no fixture content, no authenticated mutation
//   C. restoration settles; no Authorization header is ever sent while
//      no session exists (no premature/unsigned authed burst)
//   E. iframe URLs, postMessage payloads, web storage, and the evidence
//      manifest contain no token/JWT-shaped material
// Authenticated save + transition paths are covered by unit tests
// (tests/mvp001-auth-host.test.mjs) and the stub-provider Slice J script
// (qa/verify-src057-update.mjs); real Google sign-in is not drivable
// headlessly in CI.

const baseUrl = process.env.MVP_AUTH_QA_URL || 'http://127.0.0.1:3102';
const shotDir = process.argv[2] || process.env.MVP_AUTH_SCREENSHOT_DIR || '/tmp/mvp-auth-host-evidence';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const replicaDir = process.env.MVP_AUTH_REPLICA_DIR || '/tmp/mvp-auth-host-replica';

const JWT_SHAPED = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/;

let passed = 0;
function check(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`ok - ${name}`);
}

async function buildReplica() {
  const publicDir = path.join(repoRoot, 'public');
  const builtHost = path.join(repoRoot, 'dist', 'client', 'mvp', '01', 'auth-host.js');
  if (!existsSync(builtHost)) {
    throw new Error(
      'dist/client/mvp/01/auth-host.js missing — run node scripts/build-mvp-auth-host.mjs first'
    );
  }
  await mkdir(replicaDir, { recursive: true });
  await cp(publicDir, replicaDir, { recursive: true });
  await cp(builtHost, path.join(replicaDir, 'mvp', '01', 'auth-host.js'));
}

async function main() {
  await buildReplica();
  await mkdir(shotDir, { recursive: true });
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const browser = await chromium.launch();

  const seen = {
    apiAuthHeaders: [],
    apiRequests: 0,
    frameUrls: [],
    postMessages: [],
  };

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Record every postMessage payload headed anywhere (frames included).
  await page.addInitScript(() => {
    window.__mvpAuthQaPosts = [];
    const raw = window.postMessage.bind(window);
    window.postMessage = (...args) => {
      try {
        window.__mvpAuthQaPosts.push(JSON.stringify(args[0] ?? null).slice(0, 4000));
      } catch {
        // ignore unserializable
      }
      return raw(...args);
    };
  });
  page.on('popup', async (popup) => {
    try {
      await popup.close();
    } catch {
      // ignore
    }
  });
  // Unsigned backend: 401 everything lacking a Bearer token (fail-closed
  // server semantics); record any Authorization header actually sent.
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    seen.apiRequests += 1;
    const authz = req.headers().authorization || req.headers().Authorization || null;
    if (authz) seen.apiAuthHeaders.push(authz);
    if (authz && authz.startsWith('Bearer ') && authz.length > 10) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' });
  });

  await page.goto(`${baseUrl}/mvp/01?step=memory&tree=alpha-tree-1&memory=alpha-m1`, {
    waitUntil: 'domcontentloaded',
  });
  // Settle: host state global leaves BOOTING/AUTH_RESTORING (bounded).
  await page.waitForFunction(
    () => {
      const s = window.__MVP01_AUTH_STATE__;
      return s === 'AUTHENTICATED' || s === 'SIGNED_OUT' || s === 'AUTH_ERROR' || s === 'CONFIG_MISSING';
    },
    null,
    { timeout: 30000 }
  );
  const authState = await page.evaluate(() => window.__MVP01_AUTH_STATE__);
  console.log(`info - host settled state: ${authState}`);
  check('host settles to signed-out with fake unsigned config', authState === 'SIGNED_OUT');

  // Provider seam: installed exactly once, frozen, with refresh.
  const seam = await page.evaluate(() => {
    const fn = window.__MVP01_GET_ACCESS_TOKEN__;
    const desc = Object.getOwnPropertyDescriptor(window, '__MVP01_GET_ACCESS_TOKEN__');
    return {
      isFunction: typeof fn === 'function',
      hasRefresh: fn && typeof fn.refresh === 'function',
      writable: desc ? desc.writable : null,
      configurable: desc ? desc.configurable : null,
      token: typeof fn === 'function' ? null : 'missing',
    };
  });
  check('token provider installed as a function', seam.isFunction);
  check('provider exposes refresh()', seam.hasRefresh);
  check('provider is non-writable/non-configurable', seam.writable === false && seam.configurable === false);
  const providerToken = await page.evaluate(async () => {
    const fn = window.__MVP01_GET_ACCESS_TOKEN__;
    return typeof fn === 'function' ? await fn() : 'missing';
  });
  check('unsigned provider resolves null (no header downstream)', providerToken === null);

  // Signed-out gate: Product-owned, top-level document only.
  const gate = await page.evaluate(() => {
    const root = document.getElementById('mvp-auth-gate');
    if (!root || root.hidden) return null;
    return {
      heading: root.querySelector('h2')?.textContent ?? null,
      body: root.querySelector('p')?.textContent ?? null,
      button: root.querySelector('button')?.textContent ?? null,
    };
  });
  check('signed-out gate visible', gate !== null);
  check('gate heading exact', gate && gate.heading === '로그인이 필요합니다');
  check('gate body carries no-fixture statement', gate && gate.body !== null && gate.body.includes('데모나 가짜 내용'));
  check('gate offers Google sign-in', gate && gate.button === 'Google로 로그인');
  await page.screenshot({ path: `${shotDir}/desktop-auth-gate.png` });

  // Gate sign-in attempt with fake config: must fail closed with inline
  // error text (no popup success possible headlessly), gate stays up.
  await page.locator('#mvp-auth-gate button').click();
  await page.waitForTimeout(4000);
  const afterClick = await page.evaluate(() => {
    const root = document.getElementById('mvp-auth-gate');
    return {
      visible: !!root && !root.hidden,
      err: root?.querySelector('.mvp-auth-gate-err')?.textContent ?? null,
      state: window.__MVP01_AUTH_STATE__ ?? null,
    };
  });
  check('failed sign-in keeps gate visible (fail closed)', afterClick.visible === true);
  check('failed sign-in shows inline error text', afterClick.err !== null && afterClick.err.length > 0);
  check('failed sign-in never authenticates', afterClick.state !== 'AUTHENTICATED');

  // No fixture content anywhere in the top document.
  const bodyText = await page.evaluate(() => document.body.innerText);
  check('no fixture fallback text in host document', !/fixture/i.test(bodyText));

  // Collect frame URLs + postMessage payloads for the security inspection.
  seen.frameUrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('iframe')).map((f) => f.src)
  );
  seen.postMessages = (await page.evaluate(() => window.__mvpAuthQaPosts || [])).slice();
  const storage = await page.evaluate(() => {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        out.push(`local:${k}=${(localStorage.getItem(k) || '').slice(0, 200)}`);
      }
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const k = sessionStorage.key(i);
        out.push(`session:${k}=${(sessionStorage.getItem(k) || '').slice(0, 200)}`);
      }
    } catch {
      // ignore
    }
    return out;
  });

  check('unsigned run sends zero Authorization headers', seen.apiAuthHeaders.length === 0);
  const pageUrl = page.url();
  check(
    'no JWT-shaped material in iframe URLs',
    seen.frameUrls.every((u) => !JWT_SHAPED.test(u))
  );
  // MVP surface frames (same-origin /mvp/) must carry only the bridge
  // session+source identity. The Firebase SDK itself injects one hidden
  // cross-origin auth helper iframe (https://<authDomain>/__/auth/iframe)
  // carrying the PUBLIC Web API key — standard SDK behavior, also present
  // in the main app; it is allow-listed here and separately asserted
  // JWT-free above. It never touches Source surfaces.
  const mvpFrames = seen.frameUrls.filter((u) => {
    try {
      const url = new URL(u);
      return url.origin === new URL(pageUrl).origin && url.pathname.startsWith('/mvp/');
    } catch {
      return false;
    }
  });
  const sdkAuthFrames = seen.frameUrls.filter((u) => u.includes('/__/auth/iframe'));
  check('at least one MVP surface frame observed', mvpFrames.length > 0);
  check(
    'iframe bootstrap carries only session+source identity',
    mvpFrames.every((u) => {
      try {
        const url = new URL(u);
        const keys = Array.from(url.searchParams.keys()).sort();
        const ok = JSON.stringify(keys) === JSON.stringify(['mvpSession', 'mvpSource']);
        if (!ok) console.log(`info - non-conforming frame url: ${u}`);
        return ok;
      } catch {
        return u === '' || u === 'about:blank';
      }
    })
  );
  check('SDK auth helper iframe carries no JWT-shaped material',
    sdkAuthFrames.every((u) => !JWT_SHAPED.test(u)));
  check(
    'no JWT-shaped material in postMessage payloads',
    seen.postMessages.every((p) => !JWT_SHAPED.test(p))
  );
  check(
    'no JWT-shaped material in web storage',
    storage.every((s) => !JWT_SHAPED.test(s))
  );
  check('no JWT-shaped material in page URL', !JWT_SHAPED.test(pageUrl));

  // Mobile gate.
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await mobileCtx.newPage();
  await mobile.route('**/api/**', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' })
  );
  await mobile.goto(`${baseUrl}/mvp/01?step=memory&tree=alpha-tree-1&memory=alpha-m1`, {
    waitUntil: 'domcontentloaded',
  });
  await mobile.waitForFunction(
    () => {
      const s = window.__MVP01_AUTH_STATE__;
      return s === 'AUTHENTICATED' || s === 'SIGNED_OUT' || s === 'AUTH_ERROR' || s === 'CONFIG_MISSING';
    },
    null,
    { timeout: 30000 }
  );
  const mobileGate = await mobile.evaluate(() => {
    const root = document.getElementById('mvp-auth-gate');
    if (!root || root.hidden) return null;
    return root.querySelector('h2')?.textContent ?? null;
  });
  check('mobile signed-out gate visible', mobileGate === '로그인이 필요합니다');
  await mobile.screenshot({ path: `${shotDir}/mobile-auth-gate.png` });
  await mobile.close();

  await browser.close();
  const manifest = {
    headSha,
    passed,
    firebaseConfig: 'FAKE-qa-config (never real secrets)',
    authState,
    apiRequests: seen.apiRequests,
    apiAuthHeadersSent: seen.apiAuthHeaders.length,
    framesObserved: seen.frameUrls.length,
    postMessagesObserved: seen.postMessages.length,
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  if (JWT_SHAPED.test(manifestText)) throw new Error('manifest contains JWT-shaped material');
  await writeFile(`${shotDir}/manifest.json`, manifestText);
  const shotManifest = await readFile(`${shotDir}/manifest.json`, 'utf8');
  if (JWT_SHAPED.test(shotManifest)) throw new Error('manifest on disk contains JWT-shaped material');
  console.log(`MVP_AUTH_HOST_VERIFY PASS=${passed}`);
}

main().catch((e) => {
  console.error('MVP_AUTH_HOST_VERIFY FAIL:', e);
  process.exit(1);
});
