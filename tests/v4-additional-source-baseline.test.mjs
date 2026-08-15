import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const VIEWPORTS = [
  { name: "desktop", width: 1536, height: 960 },
  { name: "tablet", width: 390, height: 844 },
  { name: "mobile", width: 320, height: 720 },
];

async function openPage(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => {
    errors.push({ type: "pageerror", route: url, viewport: viewport.name, message: err.message });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console:error", route: url, viewport: viewport.name, message: msg.text() });
    }
  });

  await page.route("**/fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("**/fonts.gstatic.com/**", (route) => route.fulfill({ status: 200, contentType: "application/octet-stream", body: "" }));

  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  return { page, errors, status: resp.status() };
}

function formatErrorDetail(errors) {
  if (errors.length === 0) return "";
  return "\n" + errors.map((e, i) =>
    `  [${i + 1}] ${e.type} @ ${e.route} [${e.viewport}]: ${e.message}`
  ).join("\n");
}

async function checkCommon(page) {
  const iframes = await page.$$eval("iframe", (els) => els.length);
  const dupIds = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
    const seen = new Set();
    const dupes = new Set();
    for (const id of ids) {
      if (seen.has(id)) dupes.add(id);
      seen.add(id);
    }
    return { total: ids.length, duplicates: [...dupes] };
  });
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth > document.body.clientWidth,
    };
  });
  return { iframes, dupIds: dupIds.duplicates, overflow: overflow.bodyOverflow };
}

test("V4 additional source baseline — rest screen", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(
        browser,
        `${BASE}/v4/trees/demo/rest`,
        vp,
      );
      const common = await checkCommon(page);
      assert.equal(status, 200, `rest ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `rest ${vp.name}: no errors${formatErrorDetail(errors)}`);
      assert.equal(common.iframes, 0, `rest ${vp.name}: no iframes`);
      assert.equal(common.dupIds.length, 0, `rest ${vp.name}: no duplicate IDs`);
      assert.equal(
        common.overflow,
        false,
        `rest ${vp.name}: no horizontal overflow`,
      );

      const noteArea = page.locator("#v4-rest-note");
      await noteArea.fill("테스트 메모");
      await page.waitForTimeout(100);

      const saveBtn = page.locator(
        'button:has-text("이 나무를 잠시 쉬게 하기"), button:has-text("계속 자라게 두기")',
      ).first();
      await saveBtn.click();
      await page.waitForTimeout(300);

      const stored = await page.evaluate(() =>
        localStorage.getItem("lovetree-v4-rest-state"),
      );
      assert.ok(stored, "rest: localStorage saved after save click");

      const returnBtn = page.locator('button:has-text("지금 다시 돌아오기")');
      const returnVisible = await returnBtn.isVisible();
      if (returnVisible) {
        await returnBtn.click();
        await page.waitForTimeout(300);
      }

      await page.reload();
      await page.waitForLoadState("networkidle");
      const restored = await page.evaluate(() =>
        localStorage.getItem("lovetree-v4-rest-state"),
      );
      assert.ok(restored, "rest: localStorage persists after refresh");

      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("V4 additional source baseline — state screen", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(
        browser,
        `${BASE}/v4/trees/demo/state`,
        vp,
      );
      const common = await checkCommon(page);
      assert.equal(status, 200, `state ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `state ${vp.name}: no errors${formatErrorDetail(errors)}`);
      assert.equal(common.iframes, 0, `state ${vp.name}: no iframes`);
      assert.equal(
        common.dupIds.length,
        0,
        `state ${vp.name}: no duplicate IDs`,
      );
      assert.equal(
        common.overflow,
        false,
        `state ${vp.name}: no horizontal overflow`,
      );

      const treeStateBtns = page.locator(".v4-state-option").first();
      await treeStateBtns.click();
      await page.waitForTimeout(200);

      const visBtns = page.locator(".v4-state-option").nth(3);
      await visBtns.click();
      await page.waitForTimeout(200);

      const privateNote = page.locator(".v4-private-note textarea");
      await privateNote.fill("비공개 테스트 메모");
      await page.waitForTimeout(100);

      const saveBtn = page.locator('button:has-text("이 설정 저장")');
      await saveBtn.click();
      await page.waitForTimeout(300);

      const stored = await page.evaluate(() =>
        localStorage.getItem("lovetree-v4-tree-state"),
      );
      assert.ok(stored, "state: localStorage saved");
      const parsed = JSON.parse(stored);
      assert.ok(parsed.treeState, "state: treeState in localStorage");
      assert.ok(parsed.visibility, "state: visibility in localStorage");
      assert.ok(parsed.privateNote, "state: privateNote in localStorage");

      await page.reload();
      await page.waitForLoadState("networkidle");
      const restored = await page.evaluate(() =>
        localStorage.getItem("lovetree-v4-tree-state"),
      );
      assert.ok(restored, "state: localStorage persists after refresh");

      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("V4 additional source baseline — 300-plus screen", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(
        browser,
        `${BASE}/v4/trees/demo/growth/300-plus`,
        vp,
      );
      const common = await checkCommon(page);
      assert.equal(status, 200, `300-plus ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `300-plus ${vp.name}: no errors${formatErrorDetail(errors)}`);
      assert.equal(
        common.iframes,
        0,
        `300-plus ${vp.name}: no iframes`,
      );
      assert.equal(
        common.dupIds.length,
        0,
        `300-plus ${vp.name}: no duplicate IDs`,
      );
      assert.equal(
        common.overflow,
        false,
        `300-plus ${vp.name}: no horizontal overflow`,
      );

      const nodes = await page.$$(".v4-plus-node");
      assert.ok(nodes.length > 0, "300-plus: nodes exist");

      const zoomMinus = page.locator('button:has-text("−")').first();
      await zoomMinus.click({ force: true });
      await page.waitForTimeout(200);

      const fitBtn = page.locator('button:has-text("전체 맞춤")');
      await fitBtn.click({ force: true });
      await page.waitForTimeout(200);

      const addBtn = page.locator('button:has-text("+ 순간 추가")');
      const addVisible = await addBtn.isVisible();
      if (addVisible) {
        await page.evaluate(() => {
          const btn = Array.from(
            document.querySelectorAll("button"),
          ).find(
            (b) => b.textContent.includes("+ 순간 추가"),
          );
          if (btn) btn.click();
        });
        await page.waitForTimeout(300);

        const drawer = page.locator(".v4-plus-drawer");
        const drawerVisible = await drawer.isVisible();
        assert.ok(drawerVisible, "300-plus: drawer opened");

        const closeBtn = drawer.locator('button:has-text("닫기")');
        await closeBtn.click({ force: true });
        await page.waitForTimeout(300);
      }

      const minimap = page.locator(".v4-plus-minimap");
      await minimap.count();

      const stage = page.locator(".v4-plus-stage");
      const stageVisible = await stage.isVisible().catch(() => false);
      if (stageVisible && vp.name === "desktop") {
        const box = await stage.boundingBox().catch(() => null);
        if (box) {
          await page.mouse.move(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
          await page.mouse.down();
          await page.mouse.move(
            box.x + box.width / 2 + 50,
            box.y + box.height / 2 + 50,
          );
          await page.mouse.up();
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("V4 additional source baseline — seasons screen", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(
        browser,
        `${BASE}/v4/trees/demo/seasons`,
        vp,
      );
      const common = await checkCommon(page);
      assert.equal(status, 200, `seasons ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `seasons ${vp.name}: no errors${formatErrorDetail(errors)}`);
      assert.equal(common.iframes, 0, `seasons ${vp.name}: no iframes`);
      assert.equal(
        common.dupIds.length,
        0,
        `seasons ${vp.name}: no duplicate IDs`,
      );
      assert.equal(
        common.overflow,
        false,
        `seasons ${vp.name}: no horizontal overflow`,
      );

      const tabs = await page.$$(".v4-season-tab");
      if (tabs.length > 1) {
        await tabs[1].click({ force: true });
        await page.waitForTimeout(300);
      }

      const themeSelect = page
        .locator("select")
        .filter({ has: page.locator("option") });
      const themeOptions = await themeSelect.locator("option").count();
      if (themeOptions > 1) {
        await themeSelect.selectOption({ index: 1 });
        await page.waitForTimeout(200);
      }

      const repBtns = page.locator(".v4-representative");
      const repCount = await repBtns.count();
      if (repCount > 0) {
        await repBtns.first().click({ force: true });
        await page.waitForTimeout(200);
      }

      const nameInput = page
        .locator('input[maxlength="50"]')
        .filter({ has: page.locator("") });
      const nameVisible = await nameInput.isVisible().catch(() => false);
      if (nameVisible) {
        await nameInput.fill("테스트 시즌");
        await page.waitForTimeout(100);
      }

      const createBtn = page.locator(
        'button:has-text("기존 기록을 보존하고 다음 시즌 시작")',
      );
      const createVisible = await createBtn.isVisible();
      if (createVisible) {
        await createBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const ribbonTexts = await page.$$eval(
          ".v4-season-ribbon",
          (els) => els.map((el) => el.textContent.trim()),
        );
        assert.ok(
          ribbonTexts.length > 0,
          "seasons: season ribbons exist",
        );
        const hasArchived = ribbonTexts.some(
          (t) => t.includes("ARCHIVED") || t.includes("PROTECTED"),
        );
        const hasActive = ribbonTexts.some(
          (t) => t.includes("ACTIVE") || t.includes("GROWING"),
        );
        assert.ok(
          hasArchived || hasActive,
          "seasons: season status badges present",
        );
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }
});