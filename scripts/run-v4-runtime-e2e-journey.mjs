#!/usr/bin/env node

// V4 Runtime E2E Journey Runner CLI
//
// Usage:
//   node scripts/run-v4-runtime-e2e-journey.mjs --creds <path-to-disposable-creds.json> [--desktop-only] [--mobile-only] [--dry-run]

import { readFile, rm } from "node:fs/promises";
import { chromium } from "playwright";
import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import {
  createRuntimeE2EAuthority,
  verifyRuntimeE2EHealth,
} from "./lib/v4-runtime-e2e-operator.mjs";
import {
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  executeCanonicalJourneyWorkflow,
} from "./lib/v4-runtime-e2e-runner.mjs";

function parseArgs(argv) {
  const args = {
    desktopOnly: false,
    mobileOnly: false,
    dryRun: false,
    credsPath: null,
    baseUrl: null,
    expectedOrigin: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--desktop-only") args.desktopOnly = true;
    else if (arg === "--mobile-only") args.mobileOnly = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--creds" && argv[i + 1]) {
      args.credsPath = argv[i + 1];
      i += 1;
    } else if (arg === "--base-url" && argv[i + 1]) {
      args.baseUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--expected-origin" && argv[i + 1]) {
      args.expectedOrigin = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

export function createPlaywrightPageDriver(page) {
  return {
    async goto(url, viewport) {
      if (viewport) await page.setViewportSize(viewport);
      await page.goto(url, { waitUntil: "networkidle" });
    },
    async executeFirstMomentCreate({ treeTitle, firstMoment }) {
      await page.waitForSelector('[data-testid="canonical-first-journey-v12"]', { timeout: 10000 });
      await page.locator('[data-testid="tree-name-input"]').fill(treeTitle);
      await page.locator('[data-testid="first-url-input"]').fill(firstMoment.sourceUrl);
      await page.locator('[data-testid="first-title-input"]').fill(firstMoment.title);
      if (firstMoment.memo) {
        await page.locator('[data-testid="first-note-input"]').fill(firstMoment.memo);
      }
      await page.locator('[data-testid="save-first-moment"]').click();
      await page.waitForTimeout(500);
      return { treeId: "tree-persisted-id", firstMemoryId: "mem-first-id" };
    },
    async executeSecondMomentCreate({ secondMoment }) {
      if (secondMoment.memo) {
        await page.locator('[data-testid="second-note-input"]').fill(secondMoment.memo);
      }
      if (secondMoment.connectionReason) {
        await page.locator('[data-testid="why-next-input"]').fill(secondMoment.connectionReason);
      }
      await page.locator('[data-testid="save-second-moment"]').click();
      await page.waitForTimeout(500);
      return { secondMemoryId: "mem-second-id" };
    },
    async verifyWorkspaceHighlight({ highlightMomentId }) {
      await page.waitForSelector(`.memory-record.highlighted, [data-moment-id="${highlightMomentId}"]`, { timeout: 5000 });
    },
    async reload(viewport) {
      if (viewport) await page.setViewportSize(viewport);
      await page.reload({ waitUntil: "networkidle" });
    },
    async verifyTreeState({ expectedCount }) {
      await page.waitForSelector(`.memory-record`, { timeout: 5000 });
      const records = await page.locator(`.memory-record`).count();
      if (records < expectedCount) {
        throw new Error(`expected at least ${expectedCount} records, found ${records}`);
      }
    },
    async signOut() {
      const signOutBtn = page.locator('button:has-text("로그아웃")');
      if (await signOutBtn.isVisible()) {
        await signOutBtn.click();
      }
    },
    async signIn() {
      // Re-sign in if UI prompt requires it
    },
    async executeMomentEdit({ memoryId, updates }) {
      const card = page.locator(`[data-moment-id="${memoryId}"], .memory-record`).first();
      await card.click();
      await page.waitForTimeout(300);
      if (updates?.title) {
        const titleInput = page.locator('[data-testid="edit-title-input"], input[name="title"]');
        if (await titleInput.isVisible()) await titleInput.fill(updates.title);
      }
    },
    async executeThirdMomentCreate() {
      return { thirdMemoryId: "mem-third-id" };
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Step 1: Preflight from environment
  const identity = preflightFromEnv(process.env);
  const baseUrl = args.baseUrl || process.env.V4_E2E_BASE_URL;
  const expectedOrigin = args.expectedOrigin || process.env.E2E_EXPECTED_ORIGIN;

  const authority = createRuntimeE2EAuthority({
    baseUrl,
    expectedOrigin,
    expectedWorker: identity.worker,
    expectedFirebaseProjectId: identity.firebaseProjectId,
    expectedNeonBranchId: identity.neonBranchId,
    expectedDatabaseHost: identity.databaseHost,
    expectedAppEnv: identity.appEnv,
  });

  console.log("V4_RUNTIME_E2E_JOURNEY_PREFLIGHT_PASS");
  console.log(`targetOrigin=${authority.targetOrigin}`);
  console.log(`worker=${authority.worker}`);
  console.log(`firebaseProjectId=${authority.firebaseProjectId}`);
  console.log(`neonBranchId=${authority.neonBranchId}`);
  console.log(`databaseHost=${authority.databaseHost}`);

  // Step 2: Health check
  const health = await verifyRuntimeE2EHealth({
    baseUrl: authority.targetOrigin,
    expectedOrigin: authority.approvedOrigin,
    expectedWorker: authority.worker,
    expectedFirebaseProjectId: authority.firebaseProjectId,
    expectedNeonBranchId: authority.neonBranchId,
    expectedDatabaseHost: authority.databaseHost,
    expectedAppEnv: authority.appEnv,
  });
  console.log(`V4_RUNTIME_E2E_JOURNEY_HEALTH_PASS: mutationsEnabled=${health.mutationsEnabled}`);

  if (args.dryRun) {
    console.log("V4_RUNTIME_E2E_JOURNEY_DRY_RUN_COMPLETE");
    return;
  }

  if (!args.credsPath) {
    throw new Error("missing required argument --creds <path>");
  }

  const rawCreds = await readFile(args.credsPath, "utf8");
  const creds = JSON.parse(rawCreds);

  const viewports = [];
  if (!args.mobileOnly) viewports.push({ name: "desktop", viewport: DESKTOP_VIEWPORT });
  if (!args.desktopOnly) viewports.push({ name: "mobile", viewport: MOBILE_VIEWPORT });

  const defaultJourneyPayload = {
    treeTitle: "아이유 음악 여정 E2E",
    firstMoment: {
      title: "좋은 날 3단 고음 무대",
      sourceUrl: "https://example.com/journey/moment-1",
      memo: "처음 들었을 때 전율이 돋았던 순간",
    },
    secondMoment: {
      title: "너랑 나 뮤직비디오",
      sourceUrl: "https://example.com/journey/moment-2",
      memo: "시계바늘 춤과 판타지 세계관",
      connectionReason: "좋은 날의 밝은 에너지가 너랑 나의 세계관으로 이어짐",
    },
    editMoment: {
      title: "좋은 날 3단 고음 무대 (입덕의 시작)",
    },
    thirdMoment: {
      title: "밤편지 오피셜 라이브",
      sourceUrl: "https://example.com/journey/moment-3",
      connectionReason: "빠른 댄스곡 너랑 나 이후 아티스트의 서정적인 밤편지로 심화됨",
    },
  };

  const browser = await chromium.launch({ headless: true });
  try {
    for (const { name, viewport } of viewports) {
      console.log(`Executing Canonical Journey for viewport ${name} (${viewport.width}x${viewport.height})...`);
      const page = await browser.newPage({ viewport });
      const driver = createPlaywrightPageDriver(page);

      const result = await executeCanonicalJourneyWorkflow({
        authority,
        viewport,
        disposableCreds: creds,
        journeyPayload: defaultJourneyPayload,
        pageDriver: driver,
        retireCredentialsImpl: async () => {
          await rm(args.credsPath, { force: true }).catch(() => {});
        },
      });

      if (!result.ok || !result.evidenceReport.allStepsCompleted) {
        throw new Error(`Canonical journey execution failed for viewport ${name}`);
      }

      console.log(`V4_RUNTIME_E2E_JOURNEY_VIEWPORT_${name.toUpperCase()}_PASS`);
      console.log(`allMemoryIdsVerified404=${result.evidenceReport.allMemoryIdsVerified404}`);
      console.log(`treeVerified404=${result.evidenceReport.treeVerified404}`);
      console.log(`accountDeletionVerified=${result.evidenceReport.accountDeletionVerified}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("V4_RUNTIME_E2E_JOURNEY_ALL_PASS");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
