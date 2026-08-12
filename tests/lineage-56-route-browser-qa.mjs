import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const baseURL = process.env.LOVETREE_QA_BASE_URL || "http://127.0.0.1:3000";
const route = "/design-lab/lineages/56/v3";
const gate = spawnSync(process.execPath, ["scripts/verify-lineage-56-assets.mjs"], { encoding: "utf8" });
if (gate.status !== 0) {
  console.error(gate.stdout);
  console.error(gate.stderr);
  throw new Error("EXACT_ASSET_TRANSFER_HOLD: Lineage 56 browser QA requires the exact 8/8 PNG gate first.");
}
assert.match(gate.stdout, /LINEAGE_56_EXACT_ASSET_GATE_PASS/);

const browser = await chromium.launch({ headless: true });
const cases = [
  { name: "desktop", viewport: { width: 1280, height: 800 }, touch: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, touch: true },
];

try {
  for (const spec of cases) {
    const context = await browser.newContext({ viewport: spec.viewport, hasTouch: spec.touch, isMobile: spec.touch });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
    page.on("pageerror", (error) => errors.push(`page:${error.message}`));
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    const decoded = await page.locator(".lt56__sculpture").evaluate((img) => img.complete && img.naturalWidth === 627 && img.naturalHeight === 627);
    assert.equal(decoded, true, `${spec.name}: current exact Crystal asset decodes`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${spec.name}: horizontal overflow must be zero`);

    await page.locator('.lt56__expressions button').nth(1).click();
    assert.match(await page.locator('.lt56__status').innerText(), /EYES OPEN/);
    await page.locator('.lt56__expressions button').nth(3).click();
    assert.match(await page.locator('.lt56__status').innerText(), /SMILING/);
    await page.locator('.lt56__angles button').nth(2).click();
    assert.match(await page.locator('.lt56__status').innerText(), /PROFILE VIEW/);
    assert.ok((await page.locator('.lt56__sculpture').getAttribute('src'))?.endsWith('/crystal-profile.png'));

    const relic = page.locator('.lt56__sculpture-wrap');
    const box = await relic.boundingBox();
    assert.ok(box);
    if (spec.touch) {
      const session = await context.newCDPSession(page);
      const y = box.y + box.height * .5;
      const x1 = box.x + box.width * .70;
      const x2 = box.x + box.width * .30;
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
      for (let step = 1; step <= 6; step += 1) {
        const x = x1 + (x2 - x1) * (step / 6);
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(box.x + box.width * .65, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .35, box.y + box.height * .5, { steps: 6 });
      await page.mouse.up();
    }
    assert.match(await page.locator('.lt56__status').innerText(), /VIEW/);
    if (spec.touch) {
      const sculptureBox = await page.locator('.lt56__sculpture').boundingBox();
      assert.ok(sculptureBox && sculptureBox.y < spec.viewport.height, "mobile: Crystal begins within the first viewport");
    }

    await page.locator('.lt56__stage-actions .is-primary').click();
    await page.waitForTimeout(1250);
    assert.doesNotMatch(await page.locator('.lt56__status').innerText(), /PROFILE VIEW/);
    await page.locator('.lt56__stage-actions button').nth(1).click();
    assert.match(await page.locator('.lt56__status').innerText(), /SLEEPING/);

    if (spec.touch) {
      await page.locator('.lt56__drawer-open').click();
      assert.equal(await page.locator('.lt56__right').evaluate((el) => el.classList.contains('is-open')), true);
      assert.equal(await page.locator('.lt56__drawer-close').evaluate((el) => document.activeElement === el), true, 'mobile drawer moves focus inside');
      const panel = page.locator('.lt56__right');
      assert.ok((await panel.evaluate((el) => el.scrollHeight)) <= (await panel.evaluate((el) => el.clientHeight)) || (await panel.evaluate((el) => getComputedStyle(el).overflowY)) === 'auto');
      await page.locator('.lt56__drawer-close').click();
      assert.equal(await page.locator('.lt56__drawer-open').evaluate((el) => document.activeElement === el), true, "mobile drawer returns focus");
    } else {
      const panel = page.locator('.lt56__right');
      assert.equal(await panel.evaluate((el) => getComputedStyle(el).overflowY), 'auto', "desktop source clipping remediation stays scroll-safe");
    }
    assert.deepEqual(errors, [], `${spec.name}: no console/page errors`);
    await context.close();
  }

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await reduced.newPage();
  await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
  const autoplay = page.locator('.lt56__stage-actions .is-primary');
  await page.waitForFunction(() => document.querySelector('.lt56__stage-actions .is-primary')?.matches(':disabled') === true);
  assert.equal(await autoplay.isDisabled(), true, "reduced motion disables continuous expression autoplay");
  await page.locator('.lt56__expressions button').nth(2).click();
  assert.match(await page.locator('.lt56__status').innerText(), /WATCHING YOU/);
  await reduced.close();
  console.log("LINEAGE_56_ROUTE_BROWSER_QA_PASS");
} finally {
  await browser.close();
}
