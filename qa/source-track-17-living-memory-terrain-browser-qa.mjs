import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.TRACK17_TERRAIN_QA_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.cwd(), "qa-artifacts/source-track17-living-memory-terrain");
fs.mkdirSync(OUT, { recursive: true });

const TREE = {
  id: "qa-track17",
  ownerId: "qa-owner",
  title: "QA Canonical Tree",
  memo: "Track17 donor browser QA",
  visibility: "public",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
};

const MOMENTS = [
  { id: "qa-m1", treeId: TREE.id, title: "첫 순간", memo: "첫 기록", sourceType: "book", createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "qa-m2", treeId: TREE.id, parentId: "qa-m1", connectionReason: "다음 순간으로 이어진 실제 저장 이유", title: "둘째 순간", memo: "연결된 기록", sourceType: "song", emotionTags: ["그리움"], createdAt: "2026-08-02T00:00:00.000Z" },
  { id: "qa-m3", treeId: TREE.id, parentId: "qa-m2", connectionReason: "한 번 더 이어진 저장 이유", title: "셋째 순간", sourceType: "video", createdAt: "2026-08-03T00:00:00.000Z" },
  { id: "qa-m4", treeId: TREE.id, parentId: "not-in-response", connectionReason: "부분 응답 orphan", title: "넷째 순간", sourceType: "other", createdAt: "2026-08-04T00:00:00.000Z" },
];

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "landscape-844x390", width: 844, height: 390 },
  { name: "phone-390x844", width: 390, height: 844 },
  { name: "mobile-320x720", width: 320, height: 720 },
];

async function installCanonicalApi(context) {
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/trees/${TREE.id}`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TREE) });
      return;
    }
    if (url.pathname === `/api/trees/${TREE.id}/memories`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOMENTS) });
      return;
    }
    await route.continue();
  });
}

async function main() {
  const browser = await chromium.launch();
  const checks = [];
  const record = (viewport, check, pass, detail = "") => checks.push({ viewport, check, pass, detail });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.width <= 390,
      isMobile: viewport.width <= 390,
    });
    await installCanonicalApi(context);
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`${BASE}/trees/${TREE.id}/terrain`, { waitUntil: "networkidle", timeout: 30000 });
    const surface = page.getByTestId("living-memory-terrain");
    await surface.waitFor({ state: "visible", timeout: 10000 });

    const nodes = page.getByTestId("terrain-moment-node");
    const nodeCount = await nodes.count();
    record(viewport.name, "canonical API rows rendered", nodeCount === MOMENTS.length, `nodes:${nodeCount}`);
    record(viewport.name, "canonical tree title rendered", (await page.getByRole("heading", { name: TREE.title }).count()) === 1);

    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    record(viewport.name, "horizontal overflow 0", overflow === 0, `overflow:${overflow}`);

    const second = page.locator('[data-moment-id="qa-m2"]');
    await second.click();
    const inspector = page.getByTestId("terrain-inspector");
    record(viewport.name, "stored WHY NEXT reason survives projection", (await inspector.textContent())?.includes("다음 순간으로 이어진 실제 저장 이유") === true);
    const detailHref = await inspector.getByRole("link", { name: "canonical Moment 상세 열기" }).getAttribute("href");
    record(viewport.name, "detail handoff keeps persisted Moment ID", detailHref === "/trees/qa-track17?moment=qa-m2", String(detailHref));

    await second.focus();
    record(viewport.name, "Moment node keyboard focusable", await second.evaluate((element) => document.activeElement === element));

    const copy = await surface.textContent();
    record(viewport.name, "source sample return/season claims not promoted", !copy?.includes("24 MOMENTS") && !copy?.includes("2 RETURNS") && !copy?.includes("SEASON FORMATION"));
    record(viewport.name, "orphan relation fails closed", (await page.getByRole("status").textContent())?.includes("1개") === true);
    record(viewport.name, "page errors 0", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

    await page.screenshot({ path: path.join(OUT, `${viewport.name}.png`), fullPage: true });
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await installCanonicalApi(context);
    const page = await context.newPage();
    await page.goto(`${BASE}/trees/${TREE.id}/terrain`, { waitUntil: "networkidle", timeout: 30000 });
    await page.getByTestId("living-memory-terrain").waitFor({ state: "visible", timeout: 10000 });
    const animationNames = await page.locator("svg path").evaluateAll((paths) => paths.map((item) => getComputedStyle(item).animationName));
    record("reduced-motion", "connection animation disabled", animationNames.every((name) => name === "none"), animationNames.join(","));
    await page.screenshot({ path: path.join(OUT, "desktop-1280x800-reduced-motion.png"), fullPage: true });
    await context.close();
  }

  await browser.close();
  const failures = checks.filter((check) => !check.pass);
  const output = { summary: { checks: checks.length, failures: failures.length }, results: checks };
  fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify(output, null, 2));
  for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.viewport}  ${check.check}${check.detail ? `  [${check.detail}]` : ""}`);
  if (failures.length) {
    console.error(`Track17 Living Memory Terrain QA had ${failures.length} failure(s)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
