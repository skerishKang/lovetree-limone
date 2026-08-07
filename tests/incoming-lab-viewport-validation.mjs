// Cross-viewport validation harness for incoming lab screens.
// Usage: node --import tsx tests/incoming-lab-viewport-validation.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:4000";

const SCREENS = [
  "/v4/labs/incoming",
  "/v4/labs/incoming/template-composer",
  "/v4/labs/incoming/live-flow-map",
  "/v4/labs/incoming/memory-terrain",
  "/v4/labs/incoming/film-studio",
  "/v4/labs/incoming/popup-season-book",
];

const VIEWPORTS = [
  { name: "desktop-1536", width: 1536, height: 960 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 720 },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const screen of SCREENS) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const consoleErrors = [];
      const pageErrors = [];
      const onConsole = (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      };
      const onPageError = (err) => pageErrors.push(String(err));
      page.on("console", onConsole);
      page.on("pageerror", onPageError);

      await page.goto(`${BASE}${screen}`, { waitUntil: "networkidle", timeout: 20000 }).catch((e) => {
        pageErrors.push(`goto: ${e.message}`);
      });

      // allow client-side render + animations to settle
      await page.waitForTimeout(1200);

      const dims = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          scrollHeight: doc.scrollHeight,
        };
      }).catch((e) => ({ error: String(e) }));

      const overflow = dims && typeof dims.scrollWidth === "number" ? dims.scrollWidth > dims.clientWidth : null;

      results.push({
        screen,
        viewport: vp.name,
        w: vp.width,
        h: vp.height,
        overflow,
        scrollWidth: dims?.scrollWidth ?? null,
        clientWidth: dims?.clientWidth ?? null,
        consoleErrors,
        pageErrors,
        pass: !overflow && consoleErrors.length === 0 && pageErrors.length === 0,
      });

      page.removeListener("console", onConsole);
      page.removeListener("pageerror", onPageError);
    }
  }

  await browser.close();

  let failed = 0;
  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    if (!r.pass) failed += 1;
    console.log(
      `${status} | ${r.screen.padEnd(48)} | ${r.viewport.padEnd(16)} | overflow=${r.overflow === null ? "n/a" : r.overflow} (${r.scrollWidth}/${r.clientWidth}) | consoleErrors=${r.consoleErrors.length} | pageErrors=${r.pageErrors.length}`,
    );
    if (!r.pass) {
      if (r.consoleErrors.length) console.log(`   console: ${r.consoleErrors.slice(0, 3).join(" | ")}`);
      if (r.pageErrors.length) console.log(`   page: ${r.pageErrors.slice(0, 3).join(" | ")}`);
    }
  }
  console.log(`\n${results.length - failed}/${results.length} passed.`);
  process.exit(failed ? 1 : 0);
}

main();
