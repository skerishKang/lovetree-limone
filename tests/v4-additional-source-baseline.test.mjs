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

// Issue #402 transition-wait hardening: fixed setTimeout-style waits are replaced
// by bounded semantic condition waits with explicit timeout, explicit polling and
// a descriptive timeout diagnostic. No wait is relaxed into a longer sleep and no
// asserted postcondition is weakened.
const CONDITION_WAIT_TIMEOUT_MS = 10000;
const CONDITION_WAIT_POLLING_MS = 100;

async function waitForPageCondition(page, description, pagePredicate, predicateArg) {
  try {
    await page.waitForFunction(pagePredicate, predicateArg, {
      timeout: CONDITION_WAIT_TIMEOUT_MS,
      polling: CONDITION_WAIT_POLLING_MS,
    });
  } catch (error) {
    throw new Error(
      `CONDITION_WAIT_TIMEOUT after ${CONDITION_WAIT_TIMEOUT_MS}ms: ${description}`,
      { cause: error },
    );
  }
}

async function waitForLocatorState(locator, state, description) {
  try {
    await locator.waitFor({ state, timeout: CONDITION_WAIT_TIMEOUT_MS });
  } catch (error) {
    throw new Error(
      `CONDITION_WAIT_TIMEOUT after ${CONDITION_WAIT_TIMEOUT_MS}ms: ${description}`,
      { cause: error },
    );
  }
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

      const saveBtn = page.locator(
        'button:has-text("이 나무를 잠시 쉬게 하기"), button:has-text("계속 자라게 두기")',
      ).first();
      await saveBtn.click();
      // #402: wait until the save handler's synchronous localStorage write is
      // observable instead of a fixed 300ms transition sleep.
      await waitForPageCondition(
        page,
        'rest: localStorage["lovetree-v4-rest-state"] written after save click',
        () => window.localStorage.getItem("lovetree-v4-rest-state") !== null,
      );

      const returnBtn = page.locator('button:has-text("지금 다시 돌아오기")');
      const returnVisible = await returnBtn.isVisible();
      if (returnVisible) {
        await returnBtn.click();
        // #402: the return button re-saves with status "active"; the same write
        // is the observable for the state/view transition.
        await waitForPageCondition(
          page,
          'rest: localStorage["lovetree-v4-rest-state"].status flipped to "active" after return click',
          () => {
            try {
              return JSON.parse(window.localStorage.getItem("lovetree-v4-rest-state") || "null")?.status === "active";
            } catch {
              return false;
            }
          },
        );
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

      // #402: option buttons carry .is-selected when their value is applied
      // (V4TreeState renders className `v4-state-option${... ? " is-selected" : ""}`).
      // Wait for the selection marker instead of a fixed 200ms sleep.
      const treeStateBtns = page.locator(".v4-state-option").first();
      await treeStateBtns.click();
      await waitForPageCondition(
        page,
        "state: first tree-state option has is-selected after click",
        () => document.querySelector(".v4-state-option")?.classList.contains("is-selected") === true,
      );

      const visBtns = page.locator(".v4-state-option").nth(3);
      await visBtns.click();
      await waitForPageCondition(
        page,
        "state: fourth option (first visibility option) has is-selected after click",
        () => document.querySelectorAll(".v4-state-option")[3]?.classList.contains("is-selected") === true,
      );

      const privateNote = page.locator(".v4-private-note textarea");
      await privateNote.fill("비공개 테스트 메모");

      const saveBtn = page.locator('button:has-text("이 설정 저장")');
      await saveBtn.click();
      // #402: wait until lovetree-v4-tree-state exists AND carries all three
      // asserted fields; replaces both the fixed 300ms sleep and the former
      // bare truthiness check on the raw string. Field assertions are kept
      // below unchanged for explicit failure messages.
      await waitForPageCondition(
        page,
        'state: localStorage["lovetree-v4-tree-state"] written with treeState/visibility/privateNote fields',
        () => {
          try {
            const parsed = JSON.parse(window.localStorage.getItem("lovetree-v4-tree-state") || "null");
            return Boolean(parsed?.treeState && parsed?.visibility && parsed?.privateNote);
          } catch {
            return false;
          }
        },
      );

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

      // #402: the zoom readout in .v4-plus-top renders Math.round(zoom*100)%
      // as its last span (initial 72%). The − button sets zoom to
      // max(.45, zoom-.1), so the readout must drop below 72 — an observable
      // transform-state change.
      const zoomMinus = page.locator('button:has-text("−")').first();
      await zoomMinus.click({ force: true });
      await waitForPageCondition(
        page,
        "300-plus: zoom percentage readout decreased below 72% after zoom-minus click",
        () => {
          const spans = document.querySelectorAll(".v4-plus-top span");
          const readout = spans[spans.length - 1];
          const value = Number.parseInt(readout?.textContent ?? "", 10);
          return Number.isFinite(value) && value < 72;
        },
      );

      // #402: "전체 맞춤" resets zoom to 0.72 and pan offset to (0,0); the
      // canvas transform is the observable fit result.
      const fitBtn = page.locator('button:has-text("전체 맞춤")');
      await fitBtn.click({ force: true });
      await waitForPageCondition(
        page,
        '300-plus: canvas transform reset to scale(0.72) translate(0px, 0px) after "전체 맞춤" click',
        () => {
          const transform = document.querySelector(".v4-plus-canvas")?.style.transform ?? "";
          return transform.includes("scale(0.72)") && transform.includes("translate(0px, 0px)");
        },
      );

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
        // #402: wait for the drawer element to be attached and visible
        // (drawer is conditionally rendered on open).
        await waitForLocatorState(
          page.locator(".v4-plus-drawer").first(),
          "visible",
          "300-plus: .v4-plus-drawer visible after add click",
        );

        const drawer = page.locator(".v4-plus-drawer");
        const drawerVisible = await drawer.isVisible();
        assert.ok(drawerVisible, "300-plus: drawer opened");

        const closeBtn = drawer.locator('button:has-text("닫기")');
        await closeBtn.click({ force: true });
        // #402: drawer close unmounts the conditional element; wait for it
        // to leave the DOM instead of a fixed 300ms sleep.
        await waitForLocatorState(
          page.locator(".v4-plus-drawer").first(),
          "detached",
          "300-plus: .v4-plus-drawer detached from DOM after close click",
        );
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
        // #402: tabs carry .is-selected for the active season
        // (`v4-season-tab${selected === index ? " is-selected" : ""}`); wait
        // for the clicked tab to become selected instead of a fixed sleep.
        await waitForPageCondition(
          page,
          "seasons: second season tab has is-selected after tab click",
          () => document.querySelectorAll(".v4-season-tab")[1]?.classList.contains("is-selected") === true,
        );
      }

      const themeSelect = page
        .locator("select")
        .filter({ has: page.locator("option") });
      const themeOptions = await themeSelect.locator("option").count();
      if (themeOptions > 1) {
        // #402: the select's value is React-controlled (value={theme}); wait
        // for the controlled value to equal the chosen option instead of a
        // fixed 200ms sleep. The option's value is passed via predicateArg
        // because page.waitForFunction predicates run in the page context.
        const themeValue = await themeSelect.locator("option").nth(1).getAttribute("value");
        await themeSelect.selectOption({ index: 1 });
        await waitForPageCondition(
          page,
          "seasons: theme select value applied to second theme option",
          (expected) => document.querySelector("select")?.value === expected,
          themeValue,
        );
      }

      const repBtns = page.locator(".v4-representative");
      const repCount = await repBtns.count();
      if (repCount > 0) {
        await repBtns.first().click({ force: true });
        // #402: representative buttons carry .is-selected when chosen
        // (`v4-representative${representative === item ? " is-selected" : ""}`).
        await waitForPageCondition(
          page,
          "seasons: first representative option has is-selected after click",
          () => document.querySelector(".v4-representative")?.classList.contains("is-selected") === true,
        );
      }

      const nameInput = page
        .locator('input[maxlength="50"]')
        .filter({ has: page.locator("") });
      const nameVisible = await nameInput.isVisible().catch(() => false);
      if (nameVisible) {
        // #402: no debounce exists on this input (V4SeasonArchive wires
        // onChange directly to state) and Playwright fill() already awaits
        // input completion, so the former fixed 100ms sleep had no contract.
        // The post-create assertions below are ribbon/status-based and never
        // read the season name, so removal keeps their meaning identical.
        await nameInput.fill("테스트 시즌");
      }

      const createBtn = page.locator(
        'button:has-text("기존 기록을 보존하고 다음 시즌 시작")',
      );
      const createVisible = await createBtn.isVisible();
      if (createVisible) {
        await createBtn.click({ force: true });
        // #402: createSeason appends a new active season, so a third
        // .v4-season-tab appears — the direct observable of the create
        // transition (the page renders a single .v4-season-ribbon for the
        // selected season, so ribbon count is not a create signal). The fixed
        // 1000ms sleep is replaced by waiting for that postcondition; the
        // original ribbon/status assertions below are preserved verbatim.
        await waitForPageCondition(
          page,
          "seasons: third season tab rendered after season create",
          () => document.querySelectorAll(".v4-season-tab").length >= 3,
        );

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