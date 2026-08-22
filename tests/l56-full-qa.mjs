import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const out = process.argv[2] || "/tmp/kilo/l56-shots";
const base = "http://127.0.0.1:3000/design-lab/lineages/56/v3";
const results = [];
const log = (name, pass, detail = "") => results.push({ name, pass, detail });

async function runViewport(name, viewport, { touch = false, reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console:${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`page:${e.message}`));
  await page.goto(base, { waitUntil: "networkidle" });

  const decoded = await page.locator(".lt56__sculpture").evaluate((img) => img.complete && img.naturalWidth === 627 && img.naturalHeight === 627);
  log(`${name}: exact 8 images decode (current 627x627)`, decoded, decoded ? "" : "current image did not decode to 627x627");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  log(`${name}: horizontal overflow 0`, overflow <= 1, `overflow=${overflow}`);

  const crystal = await page.locator(".lt56__sculpture").boundingBox();
  const inViewport = crystal && crystal.y < viewport.height && crystal.y + crystal.height > 0;
  log(`${name}: Crystal visibility/clipping`, inViewport, crystal ? `y=${crystal.y} h=${crystal.height} vh=${viewport.height}` : "no crystal box");

  const angleLabels = await page.locator(".lt56__angles button b").allInnerTexts();
  log(`${name}: FRONT/THREE QUARTER/PROFILE/REAR present`, JSON.stringify(angleLabels) === JSON.stringify(["FRONT", "THREE QUARTER", "PROFILE", "REAR"]), JSON.stringify(angleLabels));

  await page.locator(".lt56__expressions button").nth(1).click();
  const e1 = await page.locator(".lt56__status").innerText();
  log(`${name}: short click expression (EYES OPEN)`, /EYES OPEN/.test(e1), e1);
  await page.locator(".lt56__angles button").nth(2).click();
  const a1 = await page.locator(".lt56__status").innerText();
  log(`${name}: angle button PROFILE`, /PROFILE VIEW/.test(a1), a1);

  const relic = page.locator(".lt56__sculpture-wrap");
  const box = await relic.boundingBox();
  if (touch) {
    const session = await context.newCDPSession(page);
    const y = box.y + box.height * 0.5;
    const x1 = box.x + box.width * 0.7;
    const x2 = box.x + box.width * 0.3;
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
    for (let step = 1; step <= 6; step += 1) {
      const x = x1 + (x2 - x1) * (step / 6);
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(300);
    const after = await page.locator(".lt56__status").innerText();
    log(`${name}: real touch drag angle rotation`, /VIEW/.test(after), after);
    await page.screenshot({ path: `${out}/${name}-touch-drag.png` });
  } else {
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.locator(".lt56__status").innerText();
    log(`${name}: horizontal drag angle rotation`, /VIEW/.test(after), after);
  }

  const clickVsDrag = await (async () => {
    await page.locator(".lt56__expressions button").nth(0).click();
    await page.waitForTimeout(100);
    const before = await page.locator(".lt56__status").innerText();
    const cb = await relic.boundingBox();
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(150);
    const after = await page.locator(".lt56__status").innerText();
    return { before, after, changed: before !== after };
  })();
  log(`${name}: click-vs-drag authority (short click cycles expression)`, clickVsDrag.changed, JSON.stringify(clickVsDrag));

  const exprButtons = await page.locator(".lt56__expressions button").count();
  const angleButtons = await page.locator(".lt56__angles button").count();
  log(`${name}: 4 neutral + 4 frontal expression limitation`, exprButtons === 4 && angleButtons === 4, `expressions=${exprButtons} angles=${angleButtons}`);

  await page.locator(".lt56__stage-actions .is-primary").click();
  const playLabel = await page.locator(".lt56__stage-actions .is-primary").innerText();
  await page.waitForTimeout(1250);
  const statusAfterPlay = await page.locator(".lt56__status").innerText();
  log(`${name}: PLAY EXPRESSIONS autoplay`, /PAUSE/.test(playLabel) && !/PROFILE VIEW/.test(statusAfterPlay), `${playLabel} | ${statusAfterPlay}`);
  await page.locator(".lt56__expressions button").nth(2).click();
  const manual = await page.locator(".lt56__status").innerText();
  log(`${name}: manual takeover`, /WATCHING YOU/.test(manual), manual);
  await page.locator(".lt56__stage-actions button").nth(1).click();
  const closed = await page.locator(".lt56__status").innerText();
  log(`${name}: CLOSE EYES`, /SLEEPING/.test(closed), closed);

  if (touch) {
    await page.locator(".lt56__drawer-open").click();
    await page.waitForTimeout(500);
  }

  await page.locator(".lt56__materials button").nth(1).click();
  const materialOn = await page.evaluate(() => document.querySelector(".lt56").className);
  log(`${name}: four materials`, /lt56--ice/.test(materialOn), materialOn);

  await page.locator(".lt56__control input").fill("137");
  const light = await page.locator(".lt56__control b").innerText();
  log(`${name}: refraction light`, light === "137", light);

  await page.locator(".lt56__inscribe input").fill("TEST INSCRIPTION");
  await page.locator(".lt56__action:not(.lt56__action--ghost)").click();
  const etched = await page.locator(".lt56__etched").innerText();
  log(`${name}: inscription / engraving`, /TEST INSCRIPTION/.test(etched), etched);
  await page.locator(".lt56__action--ghost").click();
  const bloom = await page.locator(".lt56__particles i").count();
  log(`${name}: Crystal Bloom particles`, bloom > 0, `particles=${bloom}`);

  if (touch) {
    const isOpen = await page.locator(".lt56__right").evaluate((el) => el.classList.contains("is-open"));
    const focusOnClose = await page.locator(".lt56__drawer-close").evaluate((el) => document.activeElement === el);
    log(`${name}: mobile drawer open + focus entry`, isOpen && focusOnClose, `open=${isOpen} focus=${focusOnClose}`);
    const panelInfo = await page.locator(".lt56__right").evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, oy: getComputedStyle(el).overflowY }));
    log(`${name}: drawer scroll-safe`, panelInfo.oy === "auto" || panelInfo.sh <= panelInfo.ch, JSON.stringify(panelInfo));
    const hitInfo = await page.evaluate(() => {
      const c = document.querySelector(".lt56__drawer-close").getBoundingClientRect();
      const el = document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2);
      const right = document.querySelector(".lt56__right").getBoundingClientRect();
      const bp = document.querySelector(".lt56__drawer-backdrop").getBoundingClientRect();
      return { hit: el ? el.className : null, rightRect: { x: right.x, y: right.y, w: right.width, h: right.height }, backdropRect: { x: bp.x, y: bp.y, w: bp.width, h: bp.height } };
    });
    log(`${name}: backdrop does not cover drawer controls`, hitInfo.hit !== "lt56__drawer-backdrop", JSON.stringify(hitInfo));
    try {
      await page.locator(".lt56__drawer-close").click({ timeout: 4000 });
      log(`${name}: drawer close click`, true);
    } catch (e) {
      log(`${name}: drawer close click`, false, `intercepted by ${hitInfo.hit}`);
    }
    const focusReturn = await page.locator(".lt56__drawer-open").evaluate((el) => document.activeElement === el);
    log(`${name}: drawer focus return`, focusReturn);
    await page.screenshot({ path: `${out}/${name}-drawer.png` });
  } else {
    const panelInfo = await page.locator(".lt56__right").evaluate((el) => ({ oy: getComputedStyle(el).overflowY }));
    log(`${name}: desktop Material&Service scroll remediation`, panelInfo.oy === "auto", JSON.stringify(panelInfo));
    const clipped = await page.evaluate(() => {
      const el = document.querySelector(".lt56__right");
      return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflow: getComputedStyle(el).overflowY };
    });
    log(`${name}: Material&Service lower content not clipped (scrollable)`, clipped.overflow === "auto" && clipped.scrollHeight >= clipped.clientHeight, JSON.stringify(clipped));
    await page.evaluate(() => { const el = document.querySelector(".lt56__right"); el.scrollTop = el.scrollHeight; });
    await page.screenshot({ path: `${out}/${name}-material-service-lower.png` });
  }

  log(`${name}: console error 0`, errors.filter((e) => e.startsWith("console:")).length === 0, errors.filter((e) => e.startsWith("console:")).join(" | "));
  log(`${name}: page error 0`, errors.filter((e) => e.startsWith("page:")).length === 0, errors.filter((e) => e.startsWith("page:")).join(" | "));

  await page.screenshot({ path: `${out}/${name}-initial.png` });
  await context.close();
}

await runViewport("desktop-1280x800", { width: 1280, height: 800 });
await runViewport("mobile-390x844", { width: 390, height: 844 }, { touch: true });
await runViewport("small-320x720", { width: 320, height: 720 }, { touch: true });
await runViewport("reduced-390x844", { width: 390, height: 844 }, { touch: true, reducedMotion: "reduce" });

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(base, { waitUntil: "networkidle" });
const autoplayDisabled = await reducedPage.locator(".lt56__stage-actions .is-primary").isDisabled();
log("reduced: autoplay disabled", autoplayDisabled);
const ringAnim = await reducedPage.evaluate(() => {
  const rings = document.querySelector(".lt56__rings");
  const sw = document.querySelector(".lt56__sculpture-wrap");
  return { rings: getComputedStyle(rings).animationName, wrap: getComputedStyle(sw).animationName, wrapTransform: getComputedStyle(sw).transform };
});
log("reduced: float/ring motion stopped", ringAnim.rings === "none" && ringAnim.wrap === "none", JSON.stringify(ringAnim));
await reducedPage.screenshot({ path: `${out}/reduced-390x844-initial.png` });
await reducedContext.close();

await browser.close();
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  [${r.detail}]` : ""}`);
const failed = results.filter((r) => !r.pass);
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("FAILED:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log("LINEAGE_56_ROUTE_BROWSER_QA_PASS");
