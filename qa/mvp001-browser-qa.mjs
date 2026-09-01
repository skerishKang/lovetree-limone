#!/usr/bin/env node
/**
 * qa/mvp001-browser-qa.mjs
 *
 * Enhanced Central-Grade Runtime Parity & Browser QA Suite for MVP001.
 *
 * Requirements:
 * 1. Fail-closed zero errors:
 *    - PAGE_ERRORS === 0
 *    - CONSOLE_ERRORS === 0
 * 2. True A/B Runtime Parity:
 *    - A = direct run of src/03_sources/SRCxxx/split/index.html
 *    - B = execution INSIDE the actual /mvp/01 shell iframe (?step=<step>)
 * 3. Multi-viewport verification:
 *    - 1440x900 (Desktop)
 *    - 430x932 (Mobile iPhone 15 Pro Max)
 *    - 390x844 (Mobile iPhone 14/15)
 * 4. Deterministic matched screenshots saved to evidence/mvp001/a-b-parity/
 * 5. Iframe-specific gates:
 *    - Pointer/mouse input into iframe
 *    - Viewport 100% sizing
 *    - Primary source interaction inside iframe
 *    - Shell navigation non-occlusion & autohide toggle
 *    - Single active iframe lifecycle (flush on step switch)
 */

import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const ROOT = join(import.meta.dirname, '..');
const EVIDENCE_DIR = join(ROOT, 'evidence/mvp001/a-b-parity');
mkdirSync(EVIDENCE_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// Static server simulating Cloudflare Worker static adapter:
// /mvp/01 and /mvp/01/ -> /mvp/01/index.html
function createStaticServer() {
  return http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(u.pathname);

    const mvpMatch = pathname.match(/^\/mvp\/(\d{2})(\/.*)?$/);
    if (mvpMatch) {
      const slot = mvpMatch[1];
      const rest = mvpMatch[2];
      if (!rest || rest === '/') {
        pathname = `/mvp/${slot}/index.html`;
      }
    }

    let filePath;
    if (pathname.startsWith('/src/03_sources/')) {
      filePath = join(ROOT, pathname);
    } else {
      filePath = join(ROOT, 'public', pathname);
    }

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.end(readFileSync(filePath));
  });
}

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, isDesktop: true },
  { name: '430x932', width: 430, height: 932, isDesktop: false },
  { name: '390x844', width: 390, height: 844, isDesktop: false },
];

const SOURCES = [
  {
    id: 'SRC064',
    step: 'entry',
    label: '입장 포털',
    splitUrl: '/src/03_sources/SRC064/split/index.html',
    async verifyState(contextHandle) {
      // Returns element count and card count
      return contextHandle.evaluate(() => {
        const track = window.__TRACK64__;
        return {
          cards: track?.getCards?.()?.length ?? document.querySelectorAll('.card').length,
          hasApp: !!document.getElementById('app'),
          hasMenuBtn: !!document.getElementById('menuBtn'),
        };
      });
    },
    async exerciseInteraction(contextHandle) {
      // Click #menuBtn to open menu panel
      await contextHandle.click('#menuBtn');
      await contextHandle.waitForFunction(() => {
        const panel = document.getElementById('menuPanel');
        return panel?.classList.contains('open') === true;
      }, null, { timeout: 5000 });
      return { menuOpen: true };
    },
  },
  {
    id: 'SRC058',
    step: 'board',
    label: '리빙 보드',
    splitUrl: '/src/03_sources/SRC058/split/index.html',
    async verifyState(contextHandle) {
      return contextHandle.evaluate(() => {
        const cards = document.querySelectorAll('#cardLayer [data-id]').length;
        const lt = window.__LT58;
        return {
          cards,
          hasApp: !!document.getElementById('app'),
          hasFitBtn: !!document.getElementById('fitBtn'),
          selected: lt?.state?.selected ?? null,
        };
      });
    },
    async exerciseInteraction(contextHandle) {
      // Click fit button
      await contextHandle.click('#fitBtn');
      await contextHandle.waitForTimeout(300);
      return contextHandle.evaluate(() => ({
        fitClicked: true,
        zoomLabel: document.getElementById('zoomLabel')?.textContent ?? null,
      }));
    },
  },
  {
    id: 'SRC056',
    step: 'relationships',
    label: '관계망',
    splitUrl: '/src/03_sources/SRC056/split/index.html',
    async verifyState(contextHandle) {
      return contextHandle.evaluate(() => {
        const canvas = document.getElementById('stage');
        return {
          hasStage: !!canvas,
          canvasWidth: canvas?.width ?? 0,
          canvasHeight: canvas?.height ?? 0,
          hasOverviewBtn: !!document.getElementById('overviewBtn'),
          mode: window.__lt?.state?.mode ?? null,
        };
      });
    },
    async exerciseInteraction(contextHandle) {
      // Click help button to open help modal
      await contextHandle.click('#helpBtn');
      await contextHandle.waitForTimeout(300);
      return contextHandle.evaluate(() => ({
        helpModalOpen: document.getElementById('helpModal')?.classList.contains('show') ?? false,
      }));
    },
  },
  {
    id: 'SRC057',
    step: 'memory',
    label: '모먼트 상세',
    splitUrl: '/src/03_sources/SRC057/split/index.html',
    async verifyState(contextHandle) {
      return contextHandle.evaluate(() => {
        const cards = document.querySelectorAll('.card-wrap').length;
        return {
          cards,
          hasCollection: !!document.getElementById('collection'),
          hasResetBtn: !!document.getElementById('resetBtn'),
          selectedId: window.__LT57__?.selectedId ?? null,
        };
      });
    },
    async exerciseInteraction(contextHandle) {
      // Select first card
      await contextHandle.click('.card-wrap');
      await contextHandle.waitForTimeout(300);
      return contextHandle.evaluate(() => ({
        selectedId: window.__LT57__?.selectedId ?? null,
        detailOpen: document.getElementById('detailPanel')?.classList.contains('open') ?? false,
      }));
    },
  },
  {
    id: 'SRC060',
    step: 'explore',
    label: '심층 탐색',
    splitUrl: '/src/03_sources/SRC060/split/index.html',
    async verifyState(contextHandle) {
      return contextHandle.evaluate(() => {
        const canvas = document.getElementById('stage');
        return {
          hasStage: !!canvas,
          canvasWidth: canvas?.width ?? 0,
          canvasHeight: canvas?.height ?? 0,
          hasBridgeModeBtn: !!document.getElementById('bridgeMode'),
        };
      });
    },
    async exerciseInteraction(contextHandle) {
      // Toggle bridge mode
      await contextHandle.click('#bridgeMode');
      await contextHandle.waitForTimeout(300);
      return contextHandle.evaluate(() => ({
        bridgeActive: document.getElementById('bridgeMode')?.classList.contains('active') ?? false,
      }));
    },
  },
];

async function runParityQA() {
  console.log('=== MVP001 Central Bounded QA: A/B Runtime Parity ===\n');

  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Static server running at ${baseUrl}`);
  console.log(`Screenshot evidence directory: ${EVIDENCE_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  let totalAssertions = 0;
  const parityResults = {};

  try {
    for (const src of SOURCES) {
      console.log(`==================================================`);
      console.log(`Auditing Source: ${src.id} (${src.label})`);
      console.log(`==================================================`);

      let sourceParityPass = true;

      for (const vp of VIEWPORTS) {
        console.log(`\n  --- Viewport: ${vp.name} ---`);

        // === [A] DIRECT SPLIT RUN ===
        const contextA = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const pageA = await contextA.newPage();

        const pageErrorsA = [];
        const consoleErrorsA = [];
        pageA.on('pageerror', (err) => pageErrorsA.push(err.message));
        pageA.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrorsA.push(msg.text());
        });

        await pageA.goto(`${baseUrl}${src.splitUrl}`, { waitUntil: 'load' });
        await pageA.waitForTimeout(500);

        // Assert zero errors in A
        assert.equal(pageErrorsA.length, 0, `[A direct] ${src.id} ${vp.name}: unexpected page errors: ${pageErrorsA.join('; ')}`);
        assert.equal(consoleErrorsA.length, 0, `[A direct] ${src.id} ${vp.name}: unexpected console errors: ${consoleErrorsA.join('; ')}`);
        totalAssertions += 2;

        const stateA = await src.verifyState(pageA);

        // Capture A initial screenshot
        const shotA = join(EVIDENCE_DIR, `${src.id}_${vp.width}_A_direct.png`);
        await pageA.screenshot({ path: shotA });

        // Capture A interaction
        let interactStateA = null;
        if (vp.isDesktop) {
          interactStateA = await src.exerciseInteraction(pageA);
          const shotAInteract = join(EVIDENCE_DIR, `${src.id}_${vp.width}_A_interact.png`);
          await pageA.screenshot({ path: shotAInteract });
        }

        await contextA.close();

        // === [B] INSIDE ACTUAL /mvp/01 SHELL IFRAME ===
        const contextB = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const pageB = await contextB.newPage();

        const pageErrorsB = [];
        const consoleErrorsB = [];
        pageB.on('pageerror', (err) => pageErrorsB.push(err.message));
        pageB.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrorsB.push(msg.text());
        });

        // Navigate directly to MVP shell query step
        await pageB.goto(`${baseUrl}/mvp/01?step=${src.step}`, { waitUntil: 'load' });
        await pageB.waitForTimeout(500);

        // Assert single active iframe exists
        const iframeLocator = pageB.locator('iframe.mvp-surface-frame');
        assert.equal(await iframeLocator.count(), 1, `[B mvp] ${src.id} ${vp.name}: must have exactly 1 active iframe`);
        totalAssertions++;

        // Assert iframe geometry spans full 100% viewport width and height
        const iframeBox = await iframeLocator.boundingBox();
        assert.ok(iframeBox.width >= vp.width - 16, `[B mvp] ${src.id} ${vp.name}: iframe width must span viewport`);
        assert.equal(iframeBox.height, vp.height, `[B mvp] ${src.id} ${vp.name}: iframe height must span viewport`);
        totalAssertions += 2;

        // Access the actual iframe execution context
        const frame = pageB.frame({ url: (u) => u.pathname.includes(src.id.toLowerCase()) });
        assert.ok(frame, `[B mvp] ${src.id} ${vp.name}: could not locate iframe context for ${src.id}`);
        totalAssertions++;

        // Assert zero errors in B
        assert.equal(pageErrorsB.length, 0, `[B mvp] ${src.id} ${vp.name}: unexpected page errors: ${pageErrorsB.join('; ')}`);
        assert.equal(consoleErrorsB.length, 0, `[B mvp] ${src.id} ${vp.name}: unexpected console errors: ${consoleErrorsB.join('; ')}`);
        totalAssertions += 2;

        // Verify state inside iframe matches state in direct run
        const stateB = await src.verifyState(frame);
        assert.deepEqual(stateB, stateA, `[Parity] ${src.id} ${vp.name}: Initial state in iframe must match direct run`);
        totalAssertions++;

        // Capture B initial screenshot
        const shotB = join(EVIDENCE_DIR, `${src.id}_${vp.width}_B_mvp.png`);
        await pageB.screenshot({ path: shotB });

        // Capture B interaction inside iframe
        let interactStateB = null;
        if (vp.isDesktop) {
          interactStateB = await src.exerciseInteraction(frame);
          assert.deepEqual(interactStateB, interactStateA, `[Parity] ${src.id} ${vp.name}: Interaction state in iframe must match direct run`);
          totalAssertions++;

          const shotBInteract = join(EVIDENCE_DIR, `${src.id}_${vp.width}_B_interact.png`);
          await pageB.screenshot({ path: shotBInteract });
        }

        // Verify shell navigation chrome non-occlusion & toggle
        const navBox = await pageB.locator('#mvp-shell-nav').boundingBox();
        assert.ok(navBox.y + navBox.height <= vp.height, 'Navigation chrome stays within bottom boundary');
        // Toggle nav collapse
        await pageB.click('#toggle-nav-btn');
        assert.ok(await pageB.locator('#mvp-shell-nav').evaluate((el) => el.classList.contains('collapsed')), 'Nav toggle collapses panel');
        await pageB.click('#toggle-nav-btn');
        assert.ok(await pageB.locator('#mvp-shell-nav').evaluate((el) => !el.classList.contains('collapsed')), 'Nav toggle expands panel');
        totalAssertions += 3;

        await contextB.close();
        console.log(`    ✓ ${vp.name}: A/B runtime state matched, 0 errors, screenshots saved.`);
      }

      parityResults[src.id] = sourceParityPass ? 'PASS' : 'FAIL';
    }

    console.log(`\n==================================================`);
    console.log(`SHELL FUNCTIONAL LIFECYCLE & ROUTING AUDIT`);
    console.log(`==================================================`);

    // Verify step progression, unmounting, and back/forward in single session
    const contextShell = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageShell = await contextShell.newPage();
    const shellErrors = [];
    pageShell.on('pageerror', (e) => shellErrors.push(e.message));
    pageShell.on('console', (m) => { if (m.type() === 'error') shellErrors.push(m.text()); });

    await pageShell.goto(`${baseUrl}/mvp/01`, { waitUntil: 'load' });
    await pageShell.waitForTimeout(400);

    // Step through entry -> board -> relationships -> memory -> explore
    for (let i = 1; i < SOURCES.length; i++) {
      await pageShell.click('#next-btn');
      await pageShell.waitForTimeout(400);
      const activeUrl = pageShell.url();
      assert.ok(activeUrl.includes(`step=${SOURCES[i].step}`), `Shell URL updated to step=${SOURCES[i].step}`);
      assert.equal(await pageShell.locator('iframe.mvp-surface-frame').count(), 1, 'Only 1 active iframe on transition');
      totalAssertions += 2;
    }

    // Step backwards
    for (let i = SOURCES.length - 2; i >= 0; i--) {
      await pageShell.click('#prev-btn');
      await pageShell.waitForTimeout(300);
      assert.ok(pageShell.url().includes(`step=${SOURCES[i].step}`), `Shell URL updated backwards to step=${SOURCES[i].step}`);
      assert.equal(await pageShell.locator('iframe.mvp-surface-frame').count(), 1, 'Only 1 active iframe on backwards transition');
      totalAssertions += 2;
    }

    // Invalid step fallback
    await pageShell.goto(`${baseUrl}/mvp/01?step=bogus_step_id`, { waitUntil: 'load' });
    await pageShell.waitForTimeout(300);
    const fallbackSrc = await pageShell.locator('iframe.mvp-surface-frame').getAttribute('src');
    assert.ok(fallbackSrc.includes('src064'), 'Invalid step param falls back to entry');
    totalAssertions++;

    assert.equal(shellErrors.length, 0, `Shell execution had unexpected errors: ${shellErrors.join('; ')}`);
    totalAssertions++;

    await contextShell.close();

    console.log('\n========================================');
    console.log(`ALL TESTS COMPLETE: ${totalAssertions} assertions PASSED`);
    console.log('Parity Summary:');
    for (const [id, res] of Object.entries(parityResults)) {
      console.log(`  ${id}_MVP_RUNTIME_PARITY = ${res}`);
    }
    console.log('PAGE_ERRORS = 0');
    console.log('CONSOLE_ERRORS = 0');
    console.log('========================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runParityQA().catch((err) => {
  console.error('\nQA RUNTIME FAILED:', err);
  process.exit(1);
});
