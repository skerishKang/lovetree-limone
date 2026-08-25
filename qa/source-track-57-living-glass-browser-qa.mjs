import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.SOURCE57_NATIVE_QA_URL || "http://127.0.0.1:3000";
const ROUTE = "/design-lab/source-tracks/57/v1-3-native";
const OUT = path.resolve(process.cwd(), "qa-artifacts/source-track57-living-glass");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, touch: false },
  { name: "phone-390x844", width: 390, height: 844, touch: true },
  { name: "mobile-320x720", width: 320, height: 720, touch: true },
];

const browser = await chromium.launch({ headless: true });
const evidence = [];

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
    assert.ok(response, `${viewport.name}: route response missing`);
    assert.equal(response.status(), 200, `${viewport.name}: route must return 200`);
    await page.getByTestId("source57-native-root").waitFor({ state: "visible" });

    const cards = page.locator(".living-glass-card-wrap");
    assert.equal(await cards.count(), 3, `${viewport.name}: expected three Source57 Moment cards`);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    assert.ok(
      overflow.scrollWidth <= overflow.clientWidth + 1 && overflow.bodyScrollWidth <= overflow.clientWidth + 1,
      `${viewport.name}: horizontal overflow ${JSON.stringify(overflow)}`,
    );

    await page.screenshot({
      path: path.join(OUT, `${viewport.name}-initial.png`),
      fullPage: true,
    });

    if (!viewport.touch) {
      const first = cards.nth(0);
      const box = await first.boundingBox();
      assert.ok(box, "desktop: first card box missing");
      const beforeRy = await first.evaluate((element) => element.style.getPropertyValue("--ry"));
      await page.mouse.move(box.x + box.width * 0.84, box.y + box.height * 0.24);
      await page.waitForTimeout(80);
      const afterRy = await first.evaluate((element) => element.style.getPropertyValue("--ry"));
      assert.notEqual(afterRy, beforeRy, "desktop: pointer depth response must update card rotation variable");
    }

    const selectTarget = cards.nth(viewport.touch ? 1 : 0);
    if (viewport.touch) await selectTarget.tap();
    else await selectTarget.click();

    const inspector = page.getByTestId("source57-inspector");
    await inspector.waitFor({ state: "visible" });
    assert.equal(await selectTarget.getAttribute("data-selected"), "true", `${viewport.name}: selected state must be explicit`);
    assert.match(await inspector.innerText(), /WHY NEXT/, `${viewport.name}: selected inspector must expose WHY NEXT`);

    await page.screenshot({
      path: path.join(OUT, `${viewport.name}-selected.png`),
      fullPage: true,
    });

    await inspector.getByRole("button", { name: "Moment 상세 닫기" }).click();
    await inspector.waitFor({ state: "detached" });

    const keyboardCard = cards.nth(2);
    await keyboardCard.focus();
    const focusStyle = await keyboardCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    assert.notEqual(focusStyle.outlineStyle, "none", `${viewport.name}: focused card needs a visible outline`);
    assert.notEqual(focusStyle.outlineWidth, "0px", `${viewport.name}: focused card outline width must be visible`);
    await page.keyboard.press("Enter");
    await page.getByTestId("source57-inspector").waitFor({ state: "visible" });
    assert.equal(await keyboardCard.getAttribute("data-selected"), "true", `${viewport.name}: Enter must select focused Moment`);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(50);
    const reducedTransform = await keyboardCard.locator(".living-glass-card").evaluate((element) => getComputedStyle(element).transform);
    assert.equal(reducedTransform, "none", `${viewport.name}: reduced motion must suppress card transform`);

    assert.deepEqual(pageErrors, [], `${viewport.name}: page errors ${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `${viewport.name}: console errors ${consoleErrors.join(" | ")}`);

    evidence.push({ viewport: viewport.name, overflow, pageErrors, consoleErrors, reducedTransform });
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, "browser-qa.json"), JSON.stringify({ route: ROUTE, evidence }, null, 2));
console.log("SOURCE57_NATIVE_BROWSER_QA_PASS");
console.log(JSON.stringify(evidence, null, 2));
