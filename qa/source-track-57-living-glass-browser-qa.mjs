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

async function openRoute(page, name) {
  const response = await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
  assert.ok(response, `${name}: route response missing`);
  assert.equal(response.status(), 200, `${name}: route must return 200`);
  await page.getByTestId("source57-native-root").waitFor({ state: "visible" });
  const cards = page.locator('[data-source57-card="true"]');
  assert.equal(await cards.count(), 3, `${name}: expected three Source57 Moment cards`);
  return cards;
}

async function assertNoDocumentOverflow(page, name) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  assert.ok(
    overflow.rootScrollWidth <= overflow.rootClientWidth + 1 && overflow.bodyScrollWidth <= overflow.innerWidth + 1,
    `${name}: document horizontal overflow ${JSON.stringify(overflow)}`,
  );
  return overflow;
}

function visibleWidth(rect, viewportWidth) {
  return Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
}

async function galleryMetrics(page) {
  return page.evaluate(() => {
    const gallery = document.querySelector('[data-testid="source57-gallery"]');
    const cards = [...document.querySelectorAll('[data-source57-card="true"]')];
    if (!(gallery instanceof HTMLElement) || cards.length < 3) return null;
    const style = getComputedStyle(gallery);
    const cardRects = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      const inner = card.querySelector(".living-glass-card");
      const innerStyle = inner ? getComputedStyle(inner) : null;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        opacity: innerStyle?.opacity ?? "1",
        filter: innerStyle?.filter ?? "none",
      };
    });
    return {
      display: style.display,
      overflowX: style.overflowX,
      scrollSnapType: style.scrollSnapType,
      scrollLeft: gallery.scrollLeft,
      scrollWidth: gallery.scrollWidth,
      clientWidth: gallery.clientWidth,
      cards: cardRects,
    };
  });
}

async function auditDesktop() {
  const name = "desktop-1280x800";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const cards = await openRoute(page, name);
  const overflow = await assertNoDocumentOverflow(page, name);

  const initialMetrics = await galleryMetrics(page);
  assert.ok(initialMetrics, `${name}: initial gallery metrics unavailable`);
  for (const [index, rect] of initialMetrics.cards.entries()) {
    assert.ok(visibleWidth(rect, 1280) >= rect.width * 0.82, `${name}: initial card ${index + 1} is not simultaneously readable`);
  }
  await page.screenshot({ path: path.join(OUT, `${name}-01-initial-3-card.png`), fullPage: false });

  const first = cards.nth(0);
  const firstBox = await first.boundingBox();
  assert.ok(firstBox, `${name}: first card box missing`);
  const beforeRy = await first.evaluate((element) => element.style.getPropertyValue("--ry"));
  await page.mouse.move(firstBox.x + firstBox.width * 0.84, firstBox.y + firstBox.height * 0.24);
  await page.waitForTimeout(100);
  const afterRy = await first.evaluate((element) => element.style.getPropertyValue("--ry"));
  assert.notEqual(afterRy, beforeRy, `${name}: pointer depth response must update card rotation variable`);
  const glareOpacity = await first.locator(".living-glass-glare").evaluate((element) => getComputedStyle(element).opacity);
  assert.ok(Number(glareOpacity) > 0.35, `${name}: glare must remain visible during pointer depth`);
  await page.screenshot({ path: path.join(OUT, `${name}-02-pointer-depth-glare.png`), fullPage: false });

  const selected = cards.nth(1);
  await selected.click();
  const inspector = page.getByTestId("source57-inspector");
  await inspector.waitFor({ state: "visible" });
  assert.equal(await selected.getAttribute("data-selected"), "true", `${name}: selected card identity missing`);
  assert.match(await inspector.innerText(), /WHY NEXT/, `${name}: selected inspector must expose WHY NEXT`);
  await page.waitForTimeout(420);

  const selectedMetrics = await galleryMetrics(page);
  assert.ok(selectedMetrics, `${name}: selected gallery metrics unavailable`);
  for (const [index, rect] of selectedMetrics.cards.entries()) {
    assert.ok(visibleWidth(rect, 1280) >= Math.min(120, rect.width * 0.35), `${name}: selected state removed card ${index + 1} from staging`);
  }
  assert.ok(
    Number(selectedMetrics.cards[1].opacity) > Number(selectedMetrics.cards[0].opacity),
    `${name}: selected card must outrank non-selected card opacity`,
  );
  assert.notEqual(selectedMetrics.cards[0].filter, "none", `${name}: non-selected card should visibly recede`);

  const selectedBloom = await selected.locator(".living-glass-selection-bloom").evaluate((element) => getComputedStyle(element).opacity);
  assert.ok(Number(selectedBloom) >= 0.35, `${name}: selected bloom is too weak (${selectedBloom})`);
  const selectedShadow = await selected.locator(".living-glass-card").evaluate((element) => getComputedStyle(element).boxShadow);
  assert.notEqual(selectedShadow, "none", `${name}: selected glass depth shadow missing`);

  const inspectorGeometry = await inspector.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const media = element.querySelector(".living-glass-inspector-media");
    const mediaRect = media?.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      top: rect.top,
      right: innerWidth - rect.right,
      bottom: rect.bottom,
      mediaHeight: mediaRect?.height ?? 0,
    };
  });
  assert.equal(inspectorGeometry.position, "fixed", `${name}: inspector must stay spatially attached as a viewport layer`);
  assert.ok(inspectorGeometry.top <= 130, `${name}: inspector is pushed too far below staging (${inspectorGeometry.top}px)`);
  assert.ok(inspectorGeometry.bottom <= 800, `${name}: inspector leaves first viewport`);
  assert.ok(inspectorGeometry.mediaHeight >= 180, `${name}: inspector media must outrank metadata`);
  await page.screenshot({ path: path.join(OUT, `${name}-03-selected-inspector-why-next.png`), fullPage: false });

  const close = inspector.getByRole("button", { name: "Moment 상세 닫기" });
  await close.click();
  await inspector.waitFor({ state: "detached" });

  const keyboardCard = cards.nth(2);
  await keyboardCard.focus();
  const focusStyle = await keyboardCard.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  assert.notEqual(focusStyle.outlineStyle, "none", `${name}: focused card needs visible outline`);
  assert.notEqual(focusStyle.outlineWidth, "0px", `${name}: focused card outline width must be visible`);
  await page.keyboard.press("Enter");
  await page.getByTestId("source57-inspector").waitFor({ state: "visible" });
  assert.equal(await keyboardCard.getAttribute("data-selected"), "true", `${name}: Enter must select focused Moment`);

  assert.deepEqual(errors.pageErrors, [], `${name}: page errors ${errors.pageErrors.join(" | ")}`);
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors ${errors.consoleErrors.join(" | ")}`);
  evidence.push({ name, overflow, inspectorGeometry, pointerRy: { beforeRy, afterRy }, glareOpacity });
  await context.close();
}

async function auditMobile({ name, width, height }) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const cards = await openRoute(page, name);
  const gallery = page.getByTestId("source57-gallery");
  const cue = page.getByTestId("source57-mobile-travel-cue");
  const overflow = await assertNoDocumentOverflow(page, `${name}-initial`);

  const initial = await galleryMetrics(page);
  assert.ok(initial, `${name}: initial mobile gallery metrics unavailable`);
  assert.equal(initial.display, "flex", `${name}: authoritative mobile gallery must be flex rail`);
  assert.ok(["auto", "scroll"].includes(initial.overflowX), `${name}: gallery must own horizontal travel`);
  assert.match(initial.scrollSnapType, /x/, `${name}: scroll snap must stay on X axis`);
  assert.ok(initial.scrollWidth > initial.clientWidth + 80, `${name}: horizontal continuation is missing`);
  assert.ok(
    Math.abs(initial.cards[1].centerX - initial.cards[0].centerX) > Math.abs(initial.cards[1].centerY - initial.cards[0].centerY) * 3,
    `${name}: cards collapsed into a vertical feed`,
  );
  assert.ok(visibleWidth(initial.cards[0], width) >= initial.cards[0].width * 0.80, `${name}: current card lacks main authority`);
  assert.ok(visibleWidth(initial.cards[1], width) >= 4, `${name}: adjacent card/continuation cue is not visible`);
  assert.equal(await cue.isVisible(), true, `${name}: swipe affordance cue must be visible`);
  await page.screenshot({ path: path.join(OUT, `${name}-01-initial-horizontal-gallery.png`), fullPage: false });

  await gallery.evaluate((element) => {
    const second = element.children.item(1);
    if (!(second instanceof HTMLElement)) return;
    element.scrollTo({ left: Math.max(0, second.offsetLeft - 20), behavior: "auto" });
  });
  await page.waitForTimeout(80);
  const travelled = await galleryMetrics(page);
  assert.ok(travelled, `${name}: travelled gallery metrics unavailable`);
  assert.ok(travelled.scrollLeft > 20, `${name}: horizontal gallery did not travel`);
  assert.ok(visibleWidth(travelled.cards[1], width) >= travelled.cards[1].width * 0.55, `${name}: travelled card did not become readable`);
  await page.screenshot({ path: path.join(OUT, `${name}-02-horizontal-travel-adjacent.png`), fullPage: false });

  const second = cards.nth(1);
  await second.tap();
  const inspector = page.getByTestId("source57-inspector");
  await inspector.waitFor({ state: "visible" });
  assert.equal(await second.getAttribute("data-selected"), "true", `${name}: tap must select current Moment`);
  assert.match(await inspector.innerText(), /WHY NEXT/, `${name}: WHY NEXT must remain readable`);
  const inspectorMetrics = await inspector.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const closeButton = element.querySelector('button[aria-label="Moment 상세 닫기"]');
    const closeRect = closeButton?.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      top: rect.top,
      bottom: rect.bottom,
      backdrop: getComputedStyle(element).backdropFilter,
      closeWidth: closeRect?.width ?? 0,
      closeHeight: closeRect?.height ?? 0,
    };
  });
  assert.equal(inspectorMetrics.position, "fixed", `${name}: selected detail must be a foreground sheet`);
  assert.ok(inspectorMetrics.top >= height * 0.20, `${name}: inspector erased gallery context (${inspectorMetrics.top}px)`);
  assert.ok(inspectorMetrics.bottom <= height, `${name}: inspector overflows viewport`);
  assert.notEqual(inspectorMetrics.backdrop, "none", `${name}: translucent glass sheet depth missing`);
  assert.ok(inspectorMetrics.closeWidth >= 34 && inspectorMetrics.closeHeight >= 34, `${name}: close touch target too small`);
  await assertNoDocumentOverflow(page, `${name}-selected`);
  await page.screenshot({ path: path.join(OUT, `${name}-03-selected-bottom-sheet.png`), fullPage: false });

  const selectedScroll = await gallery.evaluate((element) => element.scrollLeft);
  await inspector.getByRole("button", { name: "Moment 상세 닫기" }).tap();
  await inspector.waitFor({ state: "detached" });
  const afterCloseScroll = await gallery.evaluate((element) => element.scrollLeft);
  assert.ok(Math.abs(afterCloseScroll - selectedScroll) < 8, `${name}: closing inspector lost horizontal gallery context`);
  await page.screenshot({ path: path.join(OUT, `${name}-04-post-selection-gallery-context.png`), fullPage: false });

  const secondBox = await second.boundingBox();
  assert.ok(secondBox, `${name}: swipe source card box missing`);
  const startX = secondBox.x + secondBox.width * 0.70;
  const startY = secondBox.y + Math.min(160, secondBox.height * 0.35);

  await second.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 71, clientX: startX, clientY: startY, isPrimary: true });
  await second.dispatchEvent("pointermove", { pointerType: "touch", pointerId: 71, clientX: startX - 20, clientY: startY + 2, isPrimary: true });
  await second.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 71, clientX: startX - 20, clientY: startY + 2, isPrimary: true });
  await page.waitForTimeout(40);
  assert.equal(await page.locator(".living-glass-gallery-shell").getAttribute("data-selected-id"), "", `${name}: short drag must not cause accidental selection`);

  await second.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 72, clientX: startX, clientY: startY, isPrimary: true });
  await second.dispatchEvent("pointermove", { pointerType: "touch", pointerId: 72, clientX: startX - 90, clientY: startY + 3, isPrimary: true });
  await second.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 72, clientX: startX - 90, clientY: startY + 3, isPrimary: true });
  await page.waitForTimeout(360);
  const third = cards.nth(2);
  await page.getByTestId("source57-inspector").waitFor({ state: "visible" });
  assert.equal(await third.getAttribute("data-selected"), "true", `${name}: horizontal swipe must advance to next Moment`);
  assert.equal(await page.locator(".living-glass-gallery-shell").getAttribute("data-selected-index"), "2", `${name}: swipe must advance selected index`);
  await page.screenshot({ path: path.join(OUT, `${name}-05-swipe-next-selected.png`), fullPage: false });

  assert.deepEqual(errors.pageErrors, [], `${name}: page errors ${errors.pageErrors.join(" | ")}`);
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors ${errors.consoleErrors.join(" | ")}`);
  evidence.push({ name, overflow, initial, travelled, inspectorMetrics, selectedScroll, afterCloseScroll });
  await context.close();
}

async function auditReducedMotion() {
  const name = "reduced-motion-390x844";
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const cards = await openRoute(page, name);
  await assertNoDocumentOverflow(page, name);
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(OUT, `${name}-01-initial.png`), fullPage: false });

  const second = cards.nth(1);
  await second.tap();
  const inspector = page.getByTestId("source57-inspector");
  await inspector.waitFor({ state: "visible" });
  const reducedTransform = await second.locator(".living-glass-card").evaluate((element) => getComputedStyle(element).transform);
  assert.ok(
    reducedTransform === "none" || reducedTransform === "matrix(1, 0, 0, 1, 0, 0)",
    `${name}: reduced motion must suppress decorative card transform (received ${reducedTransform})`,
  );
  const runningAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert.equal(runningAnimations, 0, `${name}: reduced motion left running decorative animations`);
  assert.match(await inspector.innerText(), /WHY NEXT/, `${name}: semantic inspector/WHY NEXT must remain available`);
  await page.screenshot({ path: path.join(OUT, `${name}-02-selected-inspector.png`), fullPage: false });

  assert.deepEqual(errors.pageErrors, [], `${name}: page errors ${errors.pageErrors.join(" | ")}`);
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors ${errors.consoleErrors.join(" | ")}`);
  evidence.push({ name, reducedTransform, runningAnimations });
  await context.close();
}

try {
  await auditDesktop();
  await auditMobile({ name: "mobile-390x844", width: 390, height: 844 });
  await auditMobile({ name: "mobile-320x720", width: 320, height: 720 });
  await auditReducedMotion();
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, "browser-qa.json"), JSON.stringify({ route: ROUTE, evidence }, null, 2));
console.log("SOURCE57_NATIVE_BROWSER_QA_PASS");
console.log("SOURCE57_DESKTOP_SELECTED_HIERARCHY=PASS");
console.log("SOURCE57_MOBILE_V13_HORIZONTAL_GALLERY=PASS");
console.log("SOURCE57_SCREENSHOT_FULLPAGE=FALSE");
console.log(JSON.stringify(evidence, null, 2));
