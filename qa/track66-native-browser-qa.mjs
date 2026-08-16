import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

// Track66 V1.2 native browser QA evidence helper.
// Intentionally lives OUTSIDE the standard `tests/*.test.mjs` corpus so it is
// NOT picked up by the shared A-track fail-closed browser inventory. It is run
// only by `.github/workflows/track66-native-browser-qa.yml` (dedicated Track66
// evidence gate) and by local manual evidence runs.
//
// Evidence artifact emitted under qa-artifacts/track66-native/ for PR #217:
//   7 PNG screenshots + qa-results.json  (8 files total)
//   - desktop-1280x800.png (fullPage)
//   - desktop-1280x800-viewport.png
//   - desktop-1280x800-reduced-motion.png
//   - phone-390x844.png (fullPage)
//   - phone-390x844-viewport.png
//   - mobile-320x720.png (fullPage)
//   - mobile-320x720-viewport.png
//   - qa-results.json
const BASE = process.env.TRACK66_QA_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.cwd(), "qa-artifacts/track66-native");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "phone-390x844", width: 390, height: 844 },
  { name: "mobile-320x720", width: 320, height: 720 },
];
const STEP_ORDER = ["첫 순간 발견", "마음 남기기", "WHY NEXT", "MAIN / BRANCH", "완성!"];

async function main() {
  const browser = await chromium.launch();
  const checks = [];
  const record = (vp, name, ok, detail = "") => checks.push({ viewport: vp, check: name, pass: ok, detail });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.width <= 390,
      isMobile: vp.width <= 390,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(`${BASE}/v4/journey?v12=1`, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator(".v4-j-v12-scroll").waitFor({ state: "visible", timeout: 8000 });
    record(vp.name, "V1.2 rendered", true);

    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    );
    record(vp.name, "horizontal overflow 0", overflow === 0, `overflow px: ${overflow}`);

    const stepLabel = page.locator(".v4-j-v12-step-label");
    const before = (await stepLabel.textContent())?.trim() || "";
    await page.mouse.move(Math.round(vp.width / 2), Math.round(vp.height / 2));
    await page.mouse.wheel(0, Math.round(vp.height * 0.9));
    await page.waitForTimeout(1200);
    const afterFwd = (await stepLabel.textContent())?.trim() || "";
    record(vp.name, "forward scroll advances", afterFwd !== before, `${before} -> ${afterFwd}`);

    await page.mouse.move(Math.round(vp.width / 2), Math.round(vp.height / 2));
    await page.mouse.wheel(0, -Math.round(vp.height * 1.4));
    await page.waitForTimeout(1200);
    const afterRev = (await stepLabel.textContent())?.trim() || "";
    record(vp.name, "reverse scroll returns", STEP_ORDER.indexOf(afterRev) >= 0 && STEP_ORDER.indexOf(afterRev) <= STEP_ORDER.indexOf(afterFwd), `${afterFwd} -> ${afterRev}`);

    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName.toLowerCase()}${el.getAttribute("data-testid") ? `[${el.getAttribute("data-testid")}]` : ""}` : "none";
    });
    record(vp.name, "keyboard focus reaches control", focused !== "none" && focused !== "body", `focused: ${focused}`);

    const cta = page.locator('button[data-testid="save-first-moment"], button.v4-j-v12-cta').first();
    if (await cta.count()) {
      await cta.click();
      await page.waitForTimeout(600);
      const saved = await page.locator('[data-testid="first-saved"]').count();
      const done = await page.locator(".v4-j-v12-done").count();
      const authOpened = await page.locator(".auth-modal-backdrop").count();
      // BLOCKER 5 (anonymous truthfulness): the anonymous save MUST open the
      // existing auth modal AND must NOT claim any durable saved/done state.
      // Permissive OR is forbidden — require all three conditions together.
      record(
        vp.name,
        "anonymous save opens auth, no durable success",
        authOpened >= 1 && saved === 0 && done === 0,
        `auth-modal:${authOpened} first-saved:${saved} done:${done}`,
      );
    } else {
      record(vp.name, "anonymous save opens auth, no durable success", false, "CTA not found");
    }

    record(vp.name, "console error 0", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
    record(vp.name, "page error 0", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

    await page.screenshot({ path: path.join(OUT, `${vp.name}.png`), fullPage: true });
    await page.screenshot({ path: path.join(OUT, `${vp.name}-viewport.png`) });
    await ctx.close();
  }

  // reduced-motion parity sweep on desktop
  {
    const vp = VIEWPORTS[0];
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/v4/journey?v12=1`, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator(".v4-j-v12-scroll").waitFor({ state: "visible", timeout: 8000 });
    const sections = await page.locator(".v4-j-v12-section").count();
    record(vp.name, "reduced-motion sections present", sections >= 5, `sections: ${sections}`);
    await page.locator(".v4-j-v12-scroll").screenshot({ path: path.join(OUT, `${vp.name}-reduced-motion.png`) });
    await ctx.close();
  }

  await browser.close();

  const failures = checks.filter((c) => !c.pass).length;
  fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ summary: { checks: checks.length, failures, artifact_files: 8 }, results: checks }, null, 2));
  console.log(`CHECKS: ${checks.length}, FAILURES: ${failures}`);
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.viewport}  ${c.check}${c.detail ? "  [" + c.detail + "]" : ""}`);
  if (failures > 0) {
    console.error(`Track66 native QA had ${failures} failures`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
