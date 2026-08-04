import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:3000';

const ROUTES = [
  '/v4/trees/demo',
  '/v4/community',
  '/v4/trees/demo/nebula',
  '/v4/subjects/demo/motion',
  '/v4/trees/demo/celebrate/300',
  '/v4/trees/demo/celebrate/aurora',
  '/v4/trees/demo/celebrate/canopy',
  '/v4/trees/demo/onboarding/connect',
  '/v4/trees/demo/onboarding/emotion',
  '/v4/trees/demo/growth/300-plus',
  '/v4/trees/demo/seasons',
  '/v4/trees/demo/rest',
  '/v4/trees/demo/state',
];

function isBenignConsoleError(msg) {
  return msg.includes('WebSocket') || msg.includes('HMR') || msg.includes('ERR_INVALID_HTTP');
}

const VIEWPORTS = [
  { name: 'desktop-1536', width: 1536, height: 960 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-320', width: 320, height: 720 },
];

const results = {
  routes: {},
  overflow: {},
  pageErrors: {},
  consoleErrors: {},
  duplicateIds: {},
  iframes: {},
  nestedInteractive: {},
};

const browser = await chromium.launch({ headless: true });

// Test 1: All routes HTTP 200 + no page errors
console.log('\n=== Test 1: Route HTTP status + page errors ===');
for (const route of ROUTES) {
  const page = await browser.newPage();
  const errors = [];
  const consoleErrs = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isBenignConsoleError(msg.text())) consoleErrs.push(msg.text());
  });
  try {
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    results.routes[route] = response?.status() ?? 0;
    results.pageErrors[route] = errors;
    results.consoleErrors[route] = consoleErrs;
    const status = response?.status() ?? 0;
    const errCount = errors.length + consoleErrs.length;
    console.log(`  ${route.padEnd(48)} ${status} ${errCount === 0 ? '✓' : '❌ ' + errCount + ' errors'}`);
  } catch (e) {
    results.routes[route] = 'FAIL';
    console.log(`  ${route.padEnd(48)} FAIL: ${e.message}`);
  }
  await page.close();
}

// Test 2: Horizontal overflow at all viewports
console.log('\n=== Test 2: Horizontal overflow ===');
for (const viewport of VIEWPORTS) {
  const vpPage = await browser.newPage();
  await vpPage.setViewportSize({ width: viewport.width, height: viewport.height });
  for (const route of ROUTES) {
    try {
      await vpPage.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      const overflow = await vpPage.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });
      const key = `${route}@${viewport.name}`;
      results.overflow[key] = overflow;
      const status = overflow <= 0 ? '✓' : '❌';
      console.log(`  ${key.padEnd(48)} overflow: ${overflow}px ${status}`);
    } catch (e) {
      console.log(`  ${route.padEnd(48)}@${viewport.name} ERROR: ${e.message}`);
    }
  }
  await vpPage.close();
}

// Test 3: Duplicate IDs, iframes, nested interactive
console.log('\n=== Test 3: Duplicate IDs, iframes, nested interactive ===');
const page = await browser.newPage();
await page.setViewportSize({ width: 1536, height: 960 });
for (const route of ROUTES) {
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean);
      return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    });
    const iframeCount = await page.locator('iframe').count();
    const nested = await page.evaluate(() => {
      const selectors = ['button button', 'a a', 'button a', 'a button'];
      let count = 0;
      for (const sel of selectors) count += document.querySelectorAll(sel).length;
      return count;
    });
    results.duplicateIds[route] = duplicateIds;
    results.iframes[route] = iframeCount;
    results.nestedInteractive[route] = nested;
    console.log(`  ${route.padEnd(48)} dupIDs:${duplicateIds.length} iframes:${iframeCount} nested:${nested} ${duplicateIds.length === 0 && iframeCount === 0 && nested === 0 ? '✓' : '❌'}`);
  } catch (e) {
    console.log(`  ${route.padEnd(48)} ERROR: ${e.message}`);
  }
}
await page.close();

await browser.close();

// Summary
console.log('\n=== SUMMARY ===');
const routePass = Object.values(results.routes).every((s) => s === 200);
const noOverflow = Object.values(results.overflow).every((v) => typeof v === 'number' && v <= 0);
const noPageErrors = Object.values(results.pageErrors).every((errs) => Array.isArray(errs) && errs.length === 0);
const noConsoleErrors = Object.values(results.consoleErrors).every((errs) => Array.isArray(errs) && errs.length === 0);
const noDuplicates = Object.values(results.duplicateIds).every((ids) => Array.isArray(ids) && ids.length === 0);
const noIframes = Object.values(results.iframes).every((c) => c === 0);
const noNested = Object.values(results.nestedInteractive).every((c) => c === 0);

console.log(`Routes HTTP 200:        ${routePass ? 'PASS' : 'FAIL'}`);
console.log(`No overflow (all VP):   ${noOverflow ? 'PASS' : 'FAIL'}`);
console.log(`No page errors:         ${noPageErrors ? 'PASS' : 'FAIL'}`);
console.log(`No console errors:      ${noConsoleErrors ? 'PASS' : 'FAIL'}`);
console.log(`No duplicate IDs:       ${noDuplicates ? 'PASS' : 'FAIL'}`);
console.log(`No iframes:             ${noIframes ? 'PASS' : 'FAIL'}`);
console.log(`No nested interactive:  ${noNested ? 'PASS' : 'FAIL'}`);

const allPass = routePass && noOverflow && noPageErrors && noConsoleErrors && noDuplicates && noIframes && noNested;
console.log(`\nOverall: ${allPass ? 'V4_REMEDIATION_PASS_MISSING_4_SOURCES' : 'V4_REMEDIATION_CHANGES_REQUIRED'}`);

process.exit(allPass ? 0 : 1);
