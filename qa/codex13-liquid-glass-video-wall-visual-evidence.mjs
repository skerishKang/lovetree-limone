import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.CODEX13_SCREENSHOT_DIR ?? "/tmp/codex13-browser-qa";
const route = "/v4/trees/codex13-visual/archive/video-wall";

const palette = [
  ["#0b2d3f", "#45d3c7", "#f2c879"],
  ["#251326", "#d572a5", "#7ee2dc"],
  ["#111b34", "#6f8ee8", "#c9ecff"],
  ["#311912", "#ed8c63", "#f4d5a2"],
  ["#132a22", "#75c99e", "#d7f2be"],
  ["#24192d", "#9f78d4", "#edb6d8"],
  ["#092a31", "#42bfd0", "#e7f4c7"],
  ["#2c2112", "#d5aa57", "#f7e5bd"],
  ["#131826", "#718bc5", "#e1e7f5"],
];

function visualPoster(index) {
  const [base, glow, accent] = palette[index % palette.length];
  const no = String(index + 1).padStart(2, "0");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
    <defs>
      <radialGradient id="r" cx="32%" cy="28%" r="78%"><stop stop-color="${glow}" stop-opacity=".9"/><stop offset=".46" stop-color="${base}"/><stop offset="1" stop-color="#05070a"/></radialGradient>
      <linearGradient id="l" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${accent}" stop-opacity=".42"/><stop offset=".55" stop-color="transparent"/></linearGradient>
    </defs>
    <rect width="960" height="600" fill="url(#r)"/>
    <rect width="960" height="600" fill="url(#l)"/>
    <circle cx="${150 + index * 67}" cy="${120 + (index % 3) * 90}" r="${90 + (index % 4) * 24}" fill="none" stroke="white" stroke-opacity=".16" stroke-width="3"/>
    <path d="M0 ${460 - index * 11} C 210 ${330 + index * 8}, 560 ${570 - index * 9}, 960 ${360 + index * 7}" fill="none" stroke="white" stroke-opacity=".2" stroke-width="2"/>
    <text x="52" y="510" fill="white" fill-opacity=".94" font-family="Arial,sans-serif" font-size="70" font-weight="700">Memory ${no}</text>
    <text x="56" y="554" fill="white" fill-opacity=".56" font-family="Arial,sans-serif" font-size="18" letter-spacing="5">CANONICAL MOMENT · VISUAL QA</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const tree = { id: "codex13-visual", title: "Liquid Glass Memories", ownerId: "qa-owner", visibility: "public" };
const memories = Array.from({ length: 9 }, (_, index) => ({
  id: `visual-${index + 1}`,
  treeId: tree.id,
  title: ["Shared Signal", "Blue Garden", "Quiet Orbit", "Golden Light", "Hidden Dream", "Parallel Memory", "Tender Journey", "First Gravity", "Infinite Afterimage"][index],
  memo: `Codex13 visual fidelity evidence ${index + 1}`,
  sourceType: "image",
  sourceUrl: visualPoster(index),
  thumbnail: visualPoster(index),
  emotionTags: [index % 2 === 0 ? "기억" : "설렘"],
  discoveryDate: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  timestamp: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  sortOrder: index,
}));

async function installApiMocks(page) {
  await page.route("**/api/trees/codex13-visual", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) });
  });
  await page.route("**/api/trees/codex13-visual/memories", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memories) });
  });
}

async function openPage(browser, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await installApiMocks(page);
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), "visual evidence route must return 2xx");
  await page.getByRole("heading", { name: tree.title }).waitFor();
  await page.locator("main[data-codex13-native='archive-video-wall']").waitFor();
  return { context, page, pageErrors, consoleErrors };
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
}

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  {
    const { context, page, pageErrors, consoleErrors } = await openPage(browser, {
      viewport: { width: 1280, height: 800 },
      reducedMotion: "no-preference",
    });
    const main = page.locator("main[data-codex13-native='archive-video-wall']");
    const nearest = () => page.locator("[data-wall-slot][tabindex='0']").first();

    await page.waitForTimeout(80);
    await screenshot(page, "visual-desktop-1280x800-initial");

    await main.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
    await screenshot(page, "visual-desktop-1280x800-spatial-travel");

    await nearest().focus();
    await screenshot(page, "visual-desktop-1280x800-selected-media");

    await main.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await screenshot(page, "visual-desktop-1280x800-inspector-open");

    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForTimeout(100);
    await screenshot(page, "visual-desktop-1280x800-inspector-close-resumed");

    assert.deepEqual(pageErrors, [], `desktop visual evidence page errors: ${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `desktop visual evidence console errors: ${consoleErrors.join(" | ")}`);
    await context.close();
  }

  {
    const { context, page, pageErrors, consoleErrors } = await openPage(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: "no-preference",
    });
    const main = page.locator("main[data-codex13-native='archive-video-wall']");
    await page.waitForTimeout(80);
    await screenshot(page, "visual-mobile-390x844-initial");
    await main.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await screenshot(page, "visual-mobile-390x844-inspector-open");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await screenshot(page, "visual-mobile-390x844-inspector-close-resumed");
    assert.deepEqual(pageErrors, [], `390 visual evidence page errors: ${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `390 visual evidence console errors: ${consoleErrors.join(" | ")}`);
    await context.close();
  }

  {
    const { context, page, pageErrors, consoleErrors } = await openPage(browser, {
      viewport: { width: 320, height: 720 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: "no-preference",
    });
    await page.waitForTimeout(80);
    await screenshot(page, "visual-mobile-320x720-initial");
    assert.deepEqual(pageErrors, [], `320 visual evidence page errors: ${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `320 visual evidence console errors: ${consoleErrors.join(" | ")}`);
    await context.close();
  }

  {
    const { context, page, pageErrors, consoleErrors } = await openPage(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: "reduce",
    });
    const main = page.locator("main[data-codex13-native='archive-video-wall']");
    assert.equal(await main.getAttribute("data-reduced-motion"), "true");
    await screenshot(page, "visual-mobile-390x844-reduced-motion");
    assert.deepEqual(pageErrors, [], `reduced visual evidence page errors: ${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `reduced visual evidence console errors: ${consoleErrors.join(" | ")}`);
    await context.close();
  }

  console.log("CODEX13_VISUAL_EVIDENCE_CAPTURE=PASS");
} finally {
  await browser.close();
}
