import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.SOURCE57_NATIVE_QA_URL || "http://127.0.0.1:3000";
const ROUTE = "/design-lab/source-tracks/57/v1-3-native";
const OUT = path.resolve(process.cwd(), "qa-artifacts/source-track57-living-glass");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const evidence = [];

function captureErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function open(page, name) {
  const response = await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${name}: route must return 200`);
  await page.getByTestId("source57-native-root").waitFor({ state: "visible" });
  const cards = page.locator('[data-source57-card="true"]');
  assert.equal(await cards.count(), 3, `${name}: three Living Glass cards required`);
  return cards;
}

async function noDocumentOverflow(page, name) {
  const result = await page.evaluate(() => ({
    innerWidth,
    root: document.documentElement.scrollWidth,
    rootClient: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(result.root <= result.rootClient + 1, `${name}: root horizontal overflow ${JSON.stringify(result)}`);
  assert.ok(result.body <= result.innerWidth + 1, `${name}: body horizontal overflow ${JSON.stringify(result)}`);
  return result;
}

function visibleWidth(rect, viewportWidth) {
  return Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
}

async function cardRects(cards) {
  return cards.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const glass = node.querySelector(".living-glass-card");
    const style = glass ? getComputedStyle(glass) : null;
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      opacity: Number(style?.opacity ?? 1),
      filter: style?.filter ?? "none",
      boxShadow: style?.boxShadow ?? "none",
    };
  }));
}

async function auditDesktop() {
  const name = "repair-desktop-1280x800";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const cards = await open(page, name);
  await noDocumentOverflow(page, name);

  const initial = await cardRects(cards);
  for (const [index, rect] of initial.entries()) {
    assert.ok(visibleWidth(rect, 1280) >= rect.width * .82, `${name}: card ${index + 1} must remain readable in three-card staging`);
  }
  await page.screenshot({ path: path.join(OUT, "repair-desktop-1280x800-01-initial-3-card.png"), fullPage: false });

  const first = cards.nth(0);
  const box = await first.boundingBox();
  assert.ok(box, `${name}: first card geometry missing`);
  const before = await first.evaluate((node) => node.style.getPropertyValue("--ry"));
  await page.mouse.move(box.x + box.width * .84, box.y + box.height * .24);
  await page.waitForTimeout(90);
  const after = await first.evaluate((node) => node.style.getPropertyValue("--ry"));
  const glare = Number(await first.locator(".living-glass-glare").evaluate((node) => getComputedStyle(node).opacity));
  assert.notEqual(after, before, `${name}: pointer tilt/parallax must react`);
  assert.ok(glare > .35, `${name}: glare must remain visible`);
  await page.screenshot({ path: path.join(OUT, "repair-desktop-1280x800-02-pointer-depth-glare.png"), fullPage: false });

  const selected = cards.nth(1);
  await selected.click();
  const inspector = page.getByTestId("source57-inspector");
  await inspector.waitFor({ state: "visible" });
  await page.waitForTimeout(430);
  assert.equal(await selected.getAttribute("data-selected"), "true", `${name}: selected identity missing`);

  const selectedRects = await cardRects(cards);
  assert.ok(selectedRects[1].opacity > selectedRects[0].opacity, `${name}: selected card lacks visual authority`);
  assert.ok(selectedRects[0].opacity <= .75, `${name}: non-selected card must recede`);
  assert.notEqual(selectedRects[0].filter, "none", `${name}: recede filter missing`);
  assert.notEqual(selectedRects[1].boxShadow, "none", `${name}: selected glass depth shadow missing`);
  for (const rect of selectedRects) {
    assert.ok(visibleWidth(rect, 1280) >= Math.min(120, rect.width * .35), `${name}: selected state erased three-card world context`);
  }

  const bloom = Number(await selected.locator(".living-glass-selection-bloom").evaluate((node) => getComputedStyle(node).opacity));
  assert.ok(bloom >= .35, `${name}: selected bloom too weak (${bloom})`);
  assert.match(await inspector.innerText(), /WHY NEXT/, `${name}: WHY NEXT missing`);
  const inspectorVisual = await inspector.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const media = node.querySelector(".living-glass-inspector-media")?.getBoundingClientRect();
    return {
      position: style.position,
      top: rect.top,
      right: innerWidth - rect.right,
      bottom: rect.bottom,
      backgroundImage: style.backgroundImage,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      mediaHeight: media?.height ?? 0,
    };
  });
  assert.equal(inspectorVisual.position, "fixed", `${name}: inspector must be viewport composition layer`);
  assert.ok(inspectorVisual.top <= 130 && inspectorVisual.bottom <= 800, `${name}: inspector must stay in first viewport`);
  assert.ok(inspectorVisual.mediaHeight >= 180, `${name}: media must outrank metadata`);
  assert.notEqual(inspectorVisual.backgroundImage, "none", `${name}: layered translucent material background missing`);
  assert.notEqual(inspectorVisual.boxShadow, "none", `${name}: inspector depth shadow missing`);
  await page.screenshot({ path: path.join(OUT, "repair-desktop-1280x800-03-selected-inspector.png"), fullPage: false });
  await page.screenshot({ path: path.join(OUT, "repair-desktop-1280x800-04-inspector-why-next.png"), fullPage: false });

  await inspector.getByRole("button", { name: "Moment 상세 닫기" }).click();
  const third = cards.nth(2);
  await third.focus();
  const focus = await third.evaluate((node) => ({
    outlineStyle: getComputedStyle(node).outlineStyle,
    outlineWidth: getComputedStyle(node).outlineWidth,
  }));
  assert.notEqual(focus.outlineStyle, "none", `${name}: visible focus missing`);
  assert.notEqual(focus.outlineWidth, "0px", `${name}: focus width missing`);
  await page.keyboard.press("Enter");
  await page.getByTestId("source57-inspector").waitFor({ state: "visible" });
  assert.equal(await third.getAttribute("data-selected"), "true", `${name}: keyboard selection failed`);

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors ${errors.pageErrors.join(" | ")}`);
  evidence.push({ name, initial, selectedRects, bloom, inspectorVisual, glare, pointer: { before, after }, focus });
  await context.close();
}

async function auditMobile({ name, width, height }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const cards = await open(page, name);
  const gallery = page.getByTestId("source57-gallery");
  await noDocumentOverflow(page, `${name}-initial`);

  const rail = await gallery.evaluate((node) => {
    const style = getComputedStyle(node);
    return { display: style.display, overflowX: style.overflowX, snap: style.scrollSnapType, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, scrollLeft: node.scrollLeft };
  });
  assert.equal(rail.display, "flex", `${name}: V1.3 mobile must be horizontal flex rail`);
  assert.ok(["auto", "scroll"].includes(rail.overflowX), `${name}: gallery must own horizontal travel`);
  assert.match(rail.snap, /x/, `${name}: X-axis snap missing`);
  assert.ok(rail.scrollWidth > rail.clientWidth + 80, `${name}: horizontal continuation missing`);

  const initial = await cardRects(cards);
  const dx = Math.abs(initial[1].centerX - initial[0].centerX);
  const dy = Math.abs(initial[1].centerY - initial[0].centerY);
  assert.ok(dx > dy * 3, `${name}: cards regressed to vertical feed`);
  assert.ok(visibleWidth(initial[0], width) >= initial[0].width * .76, `${name}: current card lacks main authority`);
  assert.ok(visibleWidth(initial[1], width) >= 4, `${name}: adjacent card/continuation is not visible`);
  assert.equal(await page.getByTestId("source57-mobile-travel-cue").isVisible(), true, `${name}: horizontal travel cue missing`);
  await page.screenshot({ path: path.join(OUT, `${name}-01-initial-horizontal-gallery.png`), fullPage: false });

  await gallery.evaluate((node) => {
    const second = node.children.item(1);
    if (second instanceof HTMLElement) node.scrollTo({ left: Math.max(0, second.offsetLeft - 20), behavior: "auto" });
  });
  await page.waitForTimeout(100);
  const travelledScroll = await gallery.evaluate((node) => node.scrollLeft);
  const travelled = await cardRects(cards);
  assert.ok(travelledScroll > 20, `${name}: rail did not travel`);
  assert.ok(visibleWidth(travelled[1], width) >= travelled[1].width * .52, `${name}: travelled card did not become readable`);
  await page.screenshot({ path: path.join(OUT, `${name}-02-horizontal-travel.png`), fullPage: false });

  const second = cards.nth(1);
  await second.tap();
  const inspector = page.getByTestId("source57-inspector");
  await inspector.waitFor({ state: "visible" });
  await page.waitForTimeout(390);
  assert.equal(await second.getAttribute("data-selected"), "true", `${name}: tap selection failed`);
  assert.match(await inspector.innerText(), /WHY NEXT/, `${name}: WHY NEXT missing on mobile`);
  const inspectorVisual = await inspector.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const close = node.querySelector('button[aria-label="Moment 상세 닫기"]')?.getBoundingClientRect();
    const media = node.querySelector(".living-glass-inspector-media")?.getBoundingClientRect();
    return {
      position: style.position,
      top: rect.top,
      bottom: rect.bottom,
      backgroundImage: style.backgroundImage,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      mediaHeight: media?.height ?? 0,
      closeWidth: close?.width ?? 0,
      closeHeight: close?.height ?? 0,
    };
  });
  assert.equal(inspectorVisual.position, "fixed", `${name}: inspector must be foreground sheet`);
  assert.ok(inspectorVisual.top >= height * .18, `${name}: sheet erased gallery context`);
  assert.ok(inspectorVisual.bottom <= height + 1, `${name}: sheet leaves viewport`);
  assert.notEqual(inspectorVisual.backgroundImage, "none", `${name}: layered glass background missing`);
  assert.notEqual(inspectorVisual.boxShadow, "none", `${name}: sheet depth shadow missing`);
  assert.ok(inspectorVisual.mediaHeight >= 145, `${name}: selected media too small`);
  assert.ok(inspectorVisual.closeWidth >= 34 && inspectorVisual.closeHeight >= 34, `${name}: close touch target too small`);
  await noDocumentOverflow(page, `${name}-selected`);
  await page.screenshot({ path: path.join(OUT, `${name}-03-selected-inspector.png`), fullPage: false });

  const beforeClose = await gallery.evaluate((node) => node.scrollLeft);
  await inspector.getByRole("button", { name: "Moment 상세 닫기" }).tap();
  await inspector.waitFor({ state: "detached" });
  const afterClose = await gallery.evaluate((node) => node.scrollLeft);
  assert.ok(Math.abs(afterClose - beforeClose) < 8, `${name}: close lost gallery travel context`);
  await page.screenshot({ path: path.join(OUT, `${name}-04-post-selection-gallery.png`), fullPage: false });

  const box = await second.boundingBox();
  assert.ok(box, `${name}: second card geometry missing`);
  const startX = box.x + box.width * .72;
  const startY = box.y + Math.min(150, box.height * .34);
  await second.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 72, clientX: startX, clientY: startY, isPrimary: true });
  await second.dispatchEvent("pointermove", { pointerType: "touch", pointerId: 72, clientX: startX - 90, clientY: startY + 2, isPrimary: true });
  await second.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 72, clientX: startX - 90, clientY: startY + 2, isPrimary: true });
  await page.waitForTimeout(420);
  const third = cards.nth(2);
  await page.getByTestId("source57-inspector").waitFor({ state: "visible" });
  assert.equal(await third.getAttribute("data-selected"), "true", `${name}: swipe did not advance to next Moment`);
  assert.equal(await page.locator(".living-glass-gallery-shell").getAttribute("data-selected-index"), "2", `${name}: swipe selected index incorrect`);
  await page.screenshot({ path: path.join(OUT, `${name}-05-swipe-next.png`), fullPage: false });

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors ${errors.pageErrors.join(" | ")}`);
  evidence.push({ name, rail, initial, travelledScroll, travelled, inspectorVisual, beforeClose, afterClose });
  await context.close();
}

async function auditReducedMotion() {
  const name = "repair-reduced-motion-390x844";
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const cards = await open(page, name);
  await noDocumentOverflow(page, name);
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${name}-01-initial.png`), fullPage: false });
  const second = cards.nth(1);
  await second.tap();
  const inspector = page.getByTestId("source57-inspector");
  await inspector.waitFor({ state: "visible" });
  await page.waitForTimeout(450);
  const transform = await second.locator(".living-glass-card").evaluate((node) => getComputedStyle(node).transform);
  assert.ok(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)", `${name}: decorative depth transform must be suppressed`);
  assert.match(await inspector.innerText(), /WHY NEXT/, `${name}: semantic detail remains required`);
  const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert.equal(running, 0, `${name}: running decorative animations remain (${running})`);
  await page.screenshot({ path: path.join(OUT, `${name}-02-selected-inspector.png`), fullPage: false });
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors ${errors.pageErrors.join(" | ")}`);
  evidence.push({ name, transform, running });
  await context.close();
}

try {
  await auditDesktop();
  await auditMobile({ name: "repair-mobile-390x844", width: 390, height: 844 });
  await auditMobile({ name: "repair-mobile-320x720", width: 320, height: 720 });
  await auditReducedMotion();
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, "visual-repair-browser-qa.json"), JSON.stringify({ route: ROUTE, evidence }, null, 2));
console.log("SOURCE57_VISUAL_REPAIR_BROWSER_QA=PASS");
console.log("SOURCE57_DESKTOP_SELECTED_HIERARCHY=PASS");
console.log("SOURCE57_MOBILE390_HORIZONTAL_GALLERY=PASS");
console.log("SOURCE57_MOBILE320_HORIZONTAL_GALLERY=PASS");
console.log("SOURCE57_FULLPAGE_SCREENSHOTS=FALSE");
