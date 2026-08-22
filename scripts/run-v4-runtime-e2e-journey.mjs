#!/usr/bin/env node

// Real mutable Runtime E2E journey runner.
// The CLI performs no work unless an isolated E2E authority passes preflight
// and health. Each viewport consumes a different disposable Firebase user.

import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import {
  createRuntimeE2EAuthority,
  verifyRuntimeE2EHealth,
  assertCleanupTombstoneSecretFree,
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
    evidenceDir: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--desktop-only") args.desktopOnly = true;
    else if (arg === "--mobile-only") args.mobileOnly = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--creds" && argv[index + 1]) {
      args.credsPath = argv[index + 1];
      index += 1;
    } else if (arg === "--base-url" && argv[index + 1]) {
      args.baseUrl = argv[index + 1];
      index += 1;
    } else if (arg === "--expected-origin" && argv[index + 1]) {
      args.expectedOrigin = argv[index + 1];
      index += 1;
    } else if (arg === "--evidence-dir" && argv[index + 1]) {
      args.evidenceDir = argv[index + 1];
      index += 1;
    }
  }
  if (args.desktopOnly && args.mobileOnly) {
    throw new Error("--desktop-only and --mobile-only cannot be combined");
  }
  return args;
}

async function parseJsonResponse(response, label) {
  const body = await response.json().catch(() => null);
  const ok =
    typeof response.ok === "function" ? response.ok() : response.ok === true;
  const status =
    typeof response.status === "function" ? response.status() : response.status;
  if (!ok || !body || typeof body !== "object") {
    throw new Error(`${label} failed with HTTP ${status}`);
  }
  return body;
}

function createAuthorizedRequest(targetOrigin, getSession, fetchImpl = fetch) {
  return async function authorizedJson(path, { method = "GET", body = null, idToken } = {}) {
    const session = getSession();
    if (
      !session ||
      typeof session.idToken !== "string" ||
      session.idToken.length === 0 ||
      session.idToken !== idToken
    ) {
      throw new Error("authenticated browser session token is missing or stale");
    }
    const response = await fetchImpl(`${targetOrigin}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.idToken}`,
        ...(body === null ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === null ? {} : { body: JSON.stringify(body) }),
      redirect: "error",
    });
    return { response, body: await response.json().catch(() => null) };
  };
}

export function createPlaywrightPageDriver(
  browser,
  { viewport, targetOrigin, fetchImpl = fetch }
) {
  let context = null;
  let page = null;
  let session = null;

  async function ensurePage() {
    if (page && !page.isClosed()) return page;
    context = await browser.newContext({ viewport });
    page = await context.newPage();
    return page;
  }

  const authorizedJson = createAuthorizedRequest(
    targetOrigin,
    () => session,
    fetchImpl
  );

  async function requireApiSuccess(path, options, label) {
    const { response, body } = await authorizedJson(path, options);
    if (!response.ok || !body || typeof body !== "object") {
      throw new Error(`${label} failed with HTTP ${response.status}`);
    }
    return { response, body };
  }

  return {
    async goto(url, nextViewport) {
      const activePage = await ensurePage();
      if (nextViewport) await activePage.setViewportSize(nextViewport);
      const response = await activePage.goto(url, { waitUntil: "networkidle" });
      if (response && !response.ok()) {
        throw new Error(`navigation failed with HTTP ${response.status()}: ${url}`);
      }
    },

    async signIn(validatedCreds) {
      const activePage = await ensurePage();
      await activePage.goto(`${targetOrigin}/my-trees`, { waitUntil: "networkidle" });

      const emailLogin = activePage.getByRole("button", { name: "이메일로 로그인", exact: true });
      if (!(await emailLogin.isVisible())) {
        throw new Error("email login entrypoint is not visible on /my-trees");
      }
      await emailLogin.click();
      await activePage.locator("#auth-email").fill(validatedCreds.user.email);
      await activePage.locator("#auth-password").fill(validatedCreds.user.password);

      const firebaseResponsePromise = activePage.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"),
        { timeout: 15000 }
      );

      await activePage.locator(".auth-submit").click();
      const firebaseResponse = await firebaseResponsePromise;
      const body = await parseJsonResponse(firebaseResponse, "Firebase sign-in");
      if (
        typeof body.idToken !== "string" ||
        !body.idToken ||
        typeof body.localId !== "string" ||
        !body.localId
      ) {
        throw new Error("Firebase sign-in response is missing idToken/localId");
      }

      await activePage.locator(".auth-modal").waitFor({ state: "detached", timeout: 10000 });
      session = { idToken: body.idToken, localId: body.localId };
      return {
        authenticated: true,
        idToken: body.idToken,
        localId: body.localId,
      };
    },

    async signOut() {
      if (!context || !session?.idToken) {
        throw new Error("cannot logout without an authenticated browser context");
      }
      // An incognito BrowserContext is the authenticated client boundary for
      // this runner. Closing it destroys Firebase IndexedDB/localStorage state,
      // cookies, and the in-memory bearer. Relogin must occur in a fresh context.
      await context.close();
      context = null;
      page = null;
      session = null;
      return { signedOut: true, browserContextClosed: true };
    },

    async executeFirstMomentCreate({ treeTitle, firstMoment, idToken }) {
      const { body } = await requireApiSuccess(
        "/api/trees/with-first-memory",
        {
          method: "POST",
          idToken,
          body: {
            clientKey: `runtime-e2e-first-${randomUUID()}`,
            title: treeTitle,
            visibility: "public",
            memory: {
              title: firstMoment.title,
              memo: firstMoment.memo || "",
              source: "YouTube",
              sourceUrl: firstMoment.sourceUrl,
              sourceType: "youtube",
              visibility: "public",
              emotionTags: [],
            },
          },
        },
        "first Tree + Moment create"
      );
      return {
        requestObserved: true,
        serverCreated: true,
        treeId: body.tree?.id,
        firstMemoryId: body.memory?.id,
      };
    },

    async executeSecondMomentCreate({
      treeId,
      parentId,
      secondMoment,
      idToken,
    }) {
      const { body: created } = await requireApiSuccess(
        `/api/trees/${encodeURIComponent(treeId)}/memories`,
        {
          method: "POST",
          idToken,
          body: {
            clientKey: `runtime-e2e-second-${randomUUID()}`,
            parentId,
            title: secondMoment.title,
            memo: secondMoment.memo || "",
            source: "YouTube",
            sourceUrl: secondMoment.sourceUrl,
            sourceType: "youtube",
            visibility: "public",
            connectionReason: secondMoment.connectionReason,
          },
        },
        "second Moment create"
      );
      if (typeof created.id !== "string" || !created.id) {
        throw new Error("second Moment server response did not return id");
      }
      const { body: reread } = await requireApiSuccess(
        `/api/memories/${encodeURIComponent(created.id)}`,
        { idToken },
        "second Moment reread"
      );
      return {
        requestObserved: true,
        serverCreated: true,
        serverReread: true,
        secondMemoryId: created.id,
        parentId: reread.parentId,
        connectionReason: reread.connectionReason,
      };
    },

    async verifyWorkspaceHighlight({ highlightMomentId, idToken }) {
      const activePage = await ensurePage();
      const highlightedId = new URL(activePage.url()).searchParams.get("highlight");
      if (highlightedId !== highlightMomentId) {
        throw new Error("Workspace highlight query does not match second Memory ID");
      }
      await activePage.locator(".memory-record.highlighted").waitFor({
        state: "visible",
        timeout: 10000,
      });
      const highlightedCount = await activePage.locator(".memory-record.highlighted").count();
      if (highlightedCount !== 1) {
        throw new Error(`expected exactly one highlighted Memory, found ${highlightedCount}`);
      }
      await requireApiSuccess(
        `/api/memories/${encodeURIComponent(highlightMomentId)}`,
        { idToken },
        "highlighted Moment reread"
      );
      return { highlightVerified: true, serverReread: true };
    },

    async reload(nextViewport) {
      const activePage = await ensurePage();
      if (nextViewport) await activePage.setViewportSize(nextViewport);
      const response = await activePage.reload({ waitUntil: "networkidle" });
      if (response && !response.ok()) {
        throw new Error(`hard reload failed with HTTP ${response.status()}`);
      }
      return { hardReload: true };
    },

    async verifyTreeState({ treeId, expectedMemoryIds, idToken }) {
      const activePage = await ensurePage();
      await requireApiSuccess(
        `/api/trees/${encodeURIComponent(treeId)}`,
        { idToken },
        "Tree reread"
      );
      for (const memoryId of expectedMemoryIds) {
        await requireApiSuccess(
          `/api/memories/${encodeURIComponent(memoryId)}`,
          { idToken },
          `Memory ${memoryId} reread`
        );
      }
      await activePage.locator(".memory-record").first().waitFor({
        state: "visible",
        timeout: 10000,
      });
      const count = await activePage.locator(".memory-record").count();
      if (count < expectedMemoryIds.length) {
        throw new Error(
          `expected at least ${expectedMemoryIds.length} rendered Memories, found ${count}`
        );
      }
      return { serverReread: true, renderedCount: count };
    },

    async executeMomentEdit({ memoryId, updates, idToken }) {
      const activePage = await ensurePage();
      const { body: saved } = await requireApiSuccess(
        `/api/memories/${encodeURIComponent(memoryId)}`,
        {
          method: "PUT",
          idToken,
          body: { title: updates.title },
        },
        "Moment edit save"
      );
      if (saved.id !== memoryId || saved.title !== updates.title) {
        throw new Error("Moment PUT response did not contain the edited persisted value");
      }

      const response = await activePage.reload({ waitUntil: "networkidle" });
      if (response && !response.ok()) {
        throw new Error(`edit verification reload failed with HTTP ${response.status()}`);
      }
      const { body: reread } = await requireApiSuccess(
        `/api/memories/${encodeURIComponent(memoryId)}`,
        { idToken },
        "edited Moment reread"
      );
      if (reread.title !== updates.title) {
        throw new Error("edited Moment value did not survive hard reload + server reread");
      }
      return {
        saveSubmitted: true,
        serverPutSucceeded: true,
        hardReload: true,
        reloadReread: true,
        editedTitle: reread.title,
      };
    },

    async executeThirdMomentCreate({
      treeId,
      parentId,
      thirdMoment,
      idToken,
    }) {
      const { body: created } = await requireApiSuccess(
        `/api/trees/${encodeURIComponent(treeId)}/memories`,
        {
          method: "POST",
          idToken,
          body: {
            clientKey: `runtime-e2e-third-${randomUUID()}`,
            parentId,
            title: thirdMoment.title,
            memo: thirdMoment.memo || "",
            source: "YouTube",
            sourceUrl: thirdMoment.sourceUrl,
            sourceType: "youtube",
            visibility: "public",
            connectionReason: thirdMoment.connectionReason,
          },
        },
        "third Moment create"
      );
      if (typeof created.id !== "string" || !created.id) {
        throw new Error("third Moment server response did not return id");
      }
      const { body: reread } = await requireApiSuccess(
        `/api/memories/${encodeURIComponent(created.id)}`,
        { idToken },
        "third Moment reread"
      );
      return {
        requestObserved: true,
        serverCreated: true,
        serverReread: true,
        thirdMemoryId: created.id,
        parentId: reread.parentId,
      };
    },

    async close() {
      if (context) await context.close();
      context = null;
      page = null;
      session = null;
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

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

  const health = await verifyRuntimeE2EHealth({
    baseUrl: authority.targetOrigin,
    expectedOrigin: authority.approvedOrigin,
    expectedWorker: authority.worker,
    expectedFirebaseProjectId: authority.firebaseProjectId,
    expectedNeonBranchId: authority.neonBranchId,
    expectedDatabaseHost: authority.databaseHost,
    expectedAppEnv: authority.appEnv,
  });
  console.log(
    `V4_RUNTIME_E2E_JOURNEY_HEALTH_PASS: mutationsEnabled=${health.mutationsEnabled}`
  );

  if (args.dryRun) {
    console.log("V4_RUNTIME_E2E_JOURNEY_DRY_RUN_COMPLETE");
    return;
  }

  if (!args.credsPath) {
    throw new Error("missing required argument --creds <path>");
  }

  const rawCreds = await readFile(args.credsPath, "utf8");
  const creds = JSON.parse(rawCreds);
  const users = Array.isArray(creds.users) ? creds.users : [];

  const viewports = [];
  if (!args.mobileOnly) {
    viewports.push({ name: "desktop", viewport: DESKTOP_VIEWPORT });
  }
  if (!args.desktopOnly) {
    viewports.push({ name: "mobile", viewport: MOBILE_VIEWPORT });
  }
  if (users.length < viewports.length) {
    throw new Error(
      `isolated execution requires ${viewports.length} disposable users, found ${users.length}`
    );
  }

  const defaultJourneyPayload = {
    treeTitle: "아이유 음악 여정 E2E",
    firstMoment: {
      title: "좋은 날 3단 고음 무대",
      sourceUrl: "https://www.youtube.com/watch?v=jeqdYqsrsA0",
      memo: "처음 들었을 때 전율이 돋았던 순간",
    },
    secondMoment: {
      title: "너랑 나 뮤직비디오",
      sourceUrl: "https://www.youtube.com/watch?v=NJR8Inf77Ac",
      memo: "시계바늘 춤과 판타지 세계관",
      connectionReason: "좋은 날의 밝은 에너지가 너랑 나의 세계관으로 이어짐",
    },
    editMoment: {
      title: "좋은 날 3단 고음 무대 (입덕의 시작)",
    },
    thirdMoment: {
      title: "밤편지 오피셜 라이브",
      sourceUrl: "https://www.youtube.com/watch?v=BzYnNdJhZQw",
      memo: "세 번째 실제 Runtime E2E 모먼트",
      connectionReason: "너랑 나 이후 더 서정적인 밤편지의 감정선으로 이어짐",
    },
  };

  const evidenceDir =
    args.evidenceDir || join(dirname(args.credsPath), "v4-runtime-e2e-evidence");
  await mkdir(evidenceDir, { recursive: true });

  let remainingUsers = users.slice(0, viewports.length);
  const browser = await chromium.launch({ headless: true });
  try {
    for (let index = 0; index < viewports.length; index += 1) {
      const { name, viewport } = viewports[index];
      const selectedUser = users[index];
      const viewportCreds = {
        apiKey: creds.apiKey,
        users: [{ ...selectedUser }],
      };
      const driver = createPlaywrightPageDriver(browser, {
        viewport,
        targetOrigin: authority.targetOrigin,
      });

      console.log(
        `Executing Canonical Journey for viewport ${name} (${viewport.width}x${viewport.height})...`
      );

      try {
        const result = await executeCanonicalJourneyWorkflow({
          authority,
          viewport,
          disposableCreds: viewportCreds,
          journeyPayload: defaultJourneyPayload,
          pageDriver: driver,
          writeTombstoneImpl: async ({
            tombstone,
            journalSnapshot,
            cleanupResult,
          }) => {
            const evidence = {
              tombstone,
              journalSnapshot,
              cleanupResult,
              viewport: name,
            };
            assertCleanupTombstoneSecretFree(evidence);
            const path = join(
              evidenceDir,
              `${name}-${Date.now()}-cleanup-evidence.json`
            );
            await writeFile(path, JSON.stringify(evidence, null, 2), {
              encoding: "utf8",
              mode: 0o600,
            });
            return { written: true };
          },
          retireCredentialsImpl: async () => {
            remainingUsers = remainingUsers.filter(
              (candidate) => candidate.email !== selectedUser.email
            );
            if (remainingUsers.length === 0) {
              await rm(args.credsPath, { force: true });
            } else {
              await writeFile(
                args.credsPath,
                JSON.stringify(
                  { apiKey: creds.apiKey, users: remainingUsers },
                  null,
                  2
                ),
                { encoding: "utf8", mode: 0o600 }
              );
              await chmod(args.credsPath, 0o600);
            }
            return { retired: true };
          },
        });

        if (!result.ok || result.evidenceReport.allStepsCompleted !== true) {
          throw new Error(
            `Canonical journey execution failed for viewport ${name}`
          );
        }

        console.log(
          `V4_RUNTIME_E2E_JOURNEY_VIEWPORT_${name.toUpperCase()}_PASS`
        );
        console.log(
          `allMemoryIdsVerified404=${result.evidenceReport.allMemoryIdsVerified404}`
        );
        console.log(
          `treeVerified404=${result.evidenceReport.treeVerified404}`
        );
        console.log(
          `accountDeletionVerified=${result.evidenceReport.accountDeletionVerified}`
        );
      } finally {
        await driver.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log("V4_RUNTIME_E2E_JOURNEY_ALL_PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
