import assert from "node:assert/strict";
import test from "node:test";

import {
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  CANONICAL_JOURNEY_STEPS,
  createJourneyJournal,
  validateJourneyContractPayload,
  validateDisposableCredentials,
  buildSecretFreeEvidenceReport,
  executeCanonicalJourneyWorkflow,
} from "../scripts/lib/v4-runtime-e2e-runner.mjs";
import {
  createRuntimeE2EAuthority,
} from "../scripts/lib/v4-runtime-e2e-operator.mjs";
import {
  APPROVED_E2E_NEON_BRANCH_ID,
  APPROVED_E2E_NEON_HOST,
} from "../scripts/lib/v4-runtime-e2e-preflight.mjs";

function getTestAuthority() {
  return createRuntimeE2EAuthority({
    baseUrl: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedOrigin: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedWorker: "lovetree-limone-e2e-preview",
    expectedFirebaseProjectId: "relovetree-e2e",
    expectedNeonBranchId: APPROVED_E2E_NEON_BRANCH_ID,
    expectedDatabaseHost: APPROVED_E2E_NEON_HOST,
    expectedAppEnv: "e2e",
  });
}

function getValidDisposableCreds() {
  return {
    apiKey: "mock-api-key-safe",
    users: [
      {
        email: "disposable-user@example.com",
        password: "mock-password-safe",
        uid: "uid-disposable-123",
      },
    ],
  };
}

function getValidJourneyPayload() {
  return {
    treeTitle: "아이유 음악 여정",
    firstMoment: {
      title: "좋은 날 3단 고음 무대",
      sourceUrl: "https://www.youtube.com/watch?v=jeqdYqsrsA0",
    },
    secondMoment: {
      title: "너랑 나 뮤직비디오",
      sourceUrl: "https://www.youtube.com/watch?v=NJR8Inf7tJg",
      connectionReason: "좋은 날의 밝은 에너지가 너랑 나의 판타지 세계관으로 이어짐",
    },
    editMoment: {
      title: "좋은 날 3단 고음 무대 (입덕의 시작)",
    },
    thirdMoment: {
      title: "밤편지 오피셜 라이브",
      sourceUrl: "https://www.youtube.com/watch?v=BzYnNdJhZQw",
      connectionReason: "빠른 댄스곡 너랑 나 이후 아티스트의 서정적인 밤편지로 심화됨",
    },
  };
}

function createMockPageDriver(events) {
  return {
    async goto(url, vp) {
      events.push({ action: "goto", url, vp });
    },
    async executeFirstMomentCreate(args) {
      events.push({ action: "createFirst", args });
      return { treeId: "tree-e2e-canonical", firstMemoryId: "mem-e2e-1" };
    },
    async executeSecondMomentCreate(args) {
      events.push({ action: "createSecond", args });
      return { secondMemoryId: "mem-e2e-2" };
    },
    async verifyWorkspaceHighlight(args) {
      events.push({ action: "verifyHighlight", args });
    },
    async reload(vp) {
      events.push({ action: "reload", vp });
    },
    async verifyTreeState(args) {
      events.push({ action: "verifyTreeState", args });
    },
    async signOut() {
      events.push({ action: "signOut" });
    },
    async signIn() {
      events.push({ action: "signIn" });
    },
    async executeMomentEdit(args) {
      events.push({ action: "editMoment", args });
    },
    async executeThirdMomentCreate(args) {
      events.push({ action: "createThird", args });
      return { thirdMemoryId: "mem-e2e-3" };
    },
  };
}

function createMockFetch(deletedUrls = new Set()) {
  return async (url, options) => {
    const method = options?.method || "GET";
    if (method === "DELETE") {
      deletedUrls.add(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return { success: true };
        },
      };
    }
    if (method === "GET") {
      if (deletedUrls.has(url)) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "Not found" };
          },
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { id: "existing" };
        },
      };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };
}

test("DESKTOP_CONTRACT: Desktop viewport is 1280x800", () => {
  assert.deepEqual(DESKTOP_VIEWPORT, { width: 1280, height: 800 });
});

test("MOBILE_CONTRACT: Mobile viewport is 390x844", () => {
  assert.deepEqual(MOBILE_VIEWPORT, { width: 390, height: 844 });
});

test("PREFLIGHT_REUSE: Preflight authority requires approved E2E identities", () => {
  const authority = getTestAuthority();
  assert.equal(authority.worker, "lovetree-limone-e2e-preview");
  assert.equal(authority.firebaseProjectId, "relovetree-e2e");
  assert.equal(authority.appEnv, "e2e");
});

test("FIRST_CREATE_CONTRACT: Rejects invalid or missing tree/moment payload", () => {
  assert.throws(
    () => validateJourneyContractPayload({}),
    /treeTitle is required/
  );
  assert.throws(
    () => validateJourneyContractPayload({ treeTitle: "My Tree" }),
    /firstMoment object is required/
  );
});

test("SECOND_MOMENT_WHY_NEXT: Rejects second moment without WHY NEXT connectionReason", () => {
  assert.throws(
    () =>
      validateJourneyContractPayload({
        treeTitle: "My Tree",
        firstMoment: { title: "First", sourceUrl: "https://youtu.be/1" },
        secondMoment: { title: "Second", sourceUrl: "https://youtu.be/2" },
      }),
    /secondMoment.connectionReason \(WHY NEXT\) is required/
  );
});

test("DISPOSABLE_CREDS_CONTRACT: Validates disposable credentials payload", () => {
  assert.throws(
    () => validateDisposableCredentials({}),
    /disposable credentials apiKey is required/
  );
  assert.throws(
    () => validateDisposableCredentials({ apiKey: "test-key" }),
    /disposable credentials requires at least one user/
  );
  const validated = validateDisposableCredentials(getValidDisposableCreds());
  assert.equal(validated.apiKey, "mock-api-key-safe");
  assert.equal(validated.user.email, "disposable-user@example.com");
});

test("EXACT_ID_JOURNAL: Accurately tracks all created entities and steps", () => {
  const journal = createJourneyJournal();
  journal.setTreeId("tree-123");
  journal.addMemoryId("mem-1", "first");
  journal.addMemoryId("mem-2", "second");
  journal.addMemoryId("mem-3", "third");
  journal.setUserUid("uid-user-abc");
  journal.recordStep("STEP_A");
  journal.recordStep("STEP_B");

  const snap = journal.getSnapshot();
  assert.equal(snap.treeId, "tree-123");
  assert.equal(snap.firstMemoryId, "mem-1");
  assert.equal(snap.secondMemoryId, "mem-2");
  assert.equal(snap.thirdMemoryId, "mem-3");
  assert.equal(snap.userUid, "uid-user-abc");
  assert.deepEqual(snap.memoryIds, ["mem-1", "mem-2", "mem-3"]);
  assert.deepEqual(snap.completedSteps, ["STEP_A", "STEP_B"]);
});

test("SECRET_SAFE_EVIDENCE: Evidence report never exposes secret fields or tokens", () => {
  const authority = getTestAuthority();
  const journal = createJourneyJournal();
  journal.setTreeId("tree-evidence-1");
  journal.addMemoryId("mem-evidence-1", "first");
  for (const step of CANONICAL_JOURNEY_STEPS) {
    journal.recordStep(step);
  }

  const report = buildSecretFreeEvidenceReport({
    viewport: DESKTOP_VIEWPORT,
    authority,
    journalSnapshot: journal.getSnapshot(),
    cleanupResult: {
      ok: true,
      allMemoryIdsVerified404: true,
      treeVerified404: true,
      accountDeletionVerified: true,
    },
    durationMs: 1250,
  });

  assert.equal(report.treeId, "tree-evidence-1");
  assert.equal(report.firstMemoryId, "mem-evidence-1");
  assert.equal(report.allStepsCompleted, true);
  assert.equal(report.cleanupHandoffOk, true);
  assert.equal(report.allMemoryIdsVerified404, true);
  assert.equal(report.treeVerified404, true);
  assert.equal(report.accountDeletionVerified, true);

  const rawJson = JSON.stringify(report);
  assert.equal(rawJson.includes("password"), false);
  assert.equal(rawJson.includes("token"), false);
  assert.equal(rawJson.includes("apiKey"), false);
});

test("INITIAL_AUTH_ACTUALLY_EXECUTES: Sign-in failure halts journey with zero mutations", async () => {
  const authority = getTestAuthority();
  const pageEvents = [];
  const mockDriver = createMockPageDriver(pageEvents);

  const failingSignIn = async () => {
    const err = new Error("INVALID_LOGIN_CREDENTIALS");
    err.code = "SIGN_IN_FAILED";
    throw err;
  };

  await assert.rejects(
    async () => {
      await executeCanonicalJourneyWorkflow({
        authority,
        viewport: DESKTOP_VIEWPORT,
        disposableCreds: getValidDisposableCreds(),
        journeyPayload: getValidJourneyPayload(),
        pageDriver: mockDriver,
        signInWithPasswordImpl: failingSignIn,
      });
    },
    { code: "V4_RUNTIME_E2E_AUTH_FAILED" }
  );

  // Assert zero page driver mutations occurred
  assert.equal(pageEvents.length, 0);
});

test("ALL_JOURNALED_MEMORY_IDS_404: Fails if second or third memory is unverified (not 404)", async () => {
  const authority = getTestAuthority();
  const pageEvents = [];
  const mockDriver = createMockPageDriver(pageEvents);

  // Mock fetch where second memory remains 200 (not 404)
  const mockFetchWithLeakingSecondMemory = async (url, options) => {
    const method = options?.method || "GET";
    if (method === "DELETE") return { ok: true, status: 200, async json() { return { success: true }; } };
    if (method === "GET") {
      if (url.includes("mem-e2e-2")) {
        // Leaking second memory returns 200 OK instead of 404
        return { ok: true, status: 200, async json() { return { id: "mem-e2e-2" }; } };
      }
      return { ok: false, status: 404, async json() { return { error: "Not found" }; } };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  const mockSignIn = async () => ({ idToken: "mock-valid-id-token", localId: "uid-123" });
  const mockDeleteAccount = async () => ({});
  const mockVerifyUserDeleted = async () => ({ deleted: true, reasonCode: "VERIFIED" });

  await assert.rejects(
    async () => {
      await executeCanonicalJourneyWorkflow({
        authority,
        viewport: DESKTOP_VIEWPORT,
        disposableCreds: getValidDisposableCreds(),
        journeyPayload: getValidJourneyPayload(),
        pageDriver: mockDriver,
        signInWithPasswordImpl: mockSignIn,
        deleteAccountImpl: mockDeleteAccount,
        verifyUserDeletedImpl: mockVerifyUserDeleted,
        fetchImpl: mockFetchWithLeakingSecondMemory,
      });
    },
    { code: "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED" }
  );
});

test("ACCOUNT_DELETE_INDEPENDENT_VERIFY: Fails if account deletion verification is false", async () => {
  const authority = getTestAuthority();
  const pageEvents = [];
  const mockDriver = createMockPageDriver(pageEvents);
  const deletedUrls = new Set();
  const mockFetch = createMockFetch(deletedUrls);

  const mockSignIn = async () => ({ idToken: "mock-valid-id-token", localId: "uid-123" });
  const mockDeleteAccount = async () => ({});
  const mockVerifyUserDeletedFailing = async () => ({
    deleted: false,
    reasonCode: "DELETE_UNVERIFIED",
    detail: "lookup still returns the user",
  });

  await assert.rejects(
    async () => {
      await executeCanonicalJourneyWorkflow({
        authority,
        viewport: DESKTOP_VIEWPORT,
        disposableCreds: getValidDisposableCreds(),
        journeyPayload: getValidJourneyPayload(),
        pageDriver: mockDriver,
        signInWithPasswordImpl: mockSignIn,
        deleteAccountImpl: mockDeleteAccount,
        verifyUserDeletedImpl: mockVerifyUserDeletedFailing,
        fetchImpl: mockFetch,
      });
    },
    { code: "V4_RUNTIME_E2E_ACCOUNT_DELETION_UNVERIFIED" }
  );
});

test("CANONICAL_JOURNEY_WORKFLOW_DESKTOP: Full 20-step execution passes for Desktop 1280x800", async () => {
  const authority = getTestAuthority();
  const pageEvents = [];
  const mockDriver = createMockPageDriver(pageEvents);
  const deletedUrls = new Set();
  const mockFetch = createMockFetch(deletedUrls);

  let tombstoneWritten = false;
  let credentialsRetired = false;

  const mockSignIn = async () => ({ idToken: "mock-valid-id-token", localId: "uid-123" });
  const mockDeleteAccount = async () => ({});
  const mockVerifyUserDeleted = async () => ({ deleted: true, reasonCode: "VERIFIED" });
  const mockWriteTombstone = async () => { tombstoneWritten = true; };
  const mockRetireCredentials = async () => { credentialsRetired = true; };

  const result = await executeCanonicalJourneyWorkflow({
    authority,
    viewport: DESKTOP_VIEWPORT,
    disposableCreds: getValidDisposableCreds(),
    journeyPayload: getValidJourneyPayload(),
    pageDriver: mockDriver,
    signInWithPasswordImpl: mockSignIn,
    deleteAccountImpl: mockDeleteAccount,
    verifyUserDeletedImpl: mockVerifyUserDeleted,
    writeTombstoneImpl: mockWriteTombstone,
    retireCredentialsImpl: mockRetireCredentials,
    fetchImpl: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.evidenceReport.viewport, "1280x800");
  assert.equal(result.evidenceReport.allStepsCompleted, true);
  assert.equal(result.evidenceReport.allMemoryIdsVerified404, true);
  assert.equal(result.evidenceReport.treeVerified404, true);
  assert.equal(result.evidenceReport.accountDeletionVerified, true);
  assert.equal(tombstoneWritten, true);
  assert.equal(credentialsRetired, true);

  // Verify exact journaled memories (all 3 memories)
  assert.deepEqual(result.journal.memoryIds, ["mem-e2e-1", "mem-e2e-2", "mem-e2e-3"]);
});

test("CANONICAL_JOURNEY_WORKFLOW_MOBILE: Full 20-step execution passes for Mobile 390x844", async () => {
  const authority = getTestAuthority();
  const pageEvents = [];
  const mockDriver = createMockPageDriver(pageEvents);
  const deletedUrls = new Set();
  const mockFetch = createMockFetch(deletedUrls);

  const mockSignIn = async () => ({ idToken: "mock-valid-id-token", localId: "uid-123" });
  const mockDeleteAccount = async () => ({});
  const mockVerifyUserDeleted = async () => ({ deleted: true, reasonCode: "VERIFIED" });

  const result = await executeCanonicalJourneyWorkflow({
    authority,
    viewport: MOBILE_VIEWPORT,
    disposableCreds: getValidDisposableCreds(),
    journeyPayload: getValidJourneyPayload(),
    pageDriver: mockDriver,
    signInWithPasswordImpl: mockSignIn,
    deleteAccountImpl: mockDeleteAccount,
    verifyUserDeletedImpl: mockVerifyUserDeleted,
    fetchImpl: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.evidenceReport.viewport, "390x844");
  assert.equal(result.evidenceReport.allStepsCompleted, true);
  assert.equal(result.evidenceReport.allMemoryIdsVerified404, true);
  assert.equal(result.evidenceReport.treeVerified404, true);
  assert.equal(result.evidenceReport.accountDeletionVerified, true);
});
