import assert from "node:assert/strict";
import test from "node:test";

import {
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  CANONICAL_JOURNEY_STEPS,
  createJourneyJournal,
  validateJourneyContractPayload,
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

test("DESKTOP_CONTRACT: Desktop viewport is 1280x800", () => {
  assert.deepEqual(DESKTOP_VIEWPORT, { width: 1280, height: 800 });
});

test("MOBILE_CONTRACT: Mobile viewport is 390x844", () => {
  assert.deepEqual(MOBILE_VIEWPORT, { width: 390, height: 844 });
});

test("PREFLIGHT_REUSE: Preflight authority requires approved E2E identities", () => {
  const authority = createRuntimeE2EAuthority({
    baseUrl: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedOrigin: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedWorker: "lovetree-limone-e2e-preview",
    expectedFirebaseProjectId: "relovetree-e2e",
    expectedNeonBranchId: APPROVED_E2E_NEON_BRANCH_ID,
    expectedDatabaseHost: APPROVED_E2E_NEON_HOST,
    expectedAppEnv: "e2e",
  });
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
  const authority = createRuntimeE2EAuthority({
    baseUrl: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedOrigin: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedWorker: "lovetree-limone-e2e-preview",
    expectedFirebaseProjectId: "relovetree-e2e",
    expectedNeonBranchId: APPROVED_E2E_NEON_BRANCH_ID,
    expectedDatabaseHost: APPROVED_E2E_NEON_HOST,
    expectedAppEnv: "e2e",
  });

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
    cleanupResult: { ok: true, memoryDeleted: true, treeDeleted: true },
    durationMs: 1250,
  });

  assert.equal(report.treeId, "tree-evidence-1");
  assert.equal(report.firstMemoryId, "mem-evidence-1");
  assert.equal(report.allStepsCompleted, true);
  assert.equal(report.cleanupHandoffOk, true);

  const rawJson = JSON.stringify(report);
  assert.equal(rawJson.includes("password"), false);
  assert.equal(rawJson.includes("token"), false);
  assert.equal(rawJson.includes("apiKey"), false);
});

test("CANONICAL_JOURNEY_WORKFLOW: Executes full 20-step journey with mock driver and #241 cleanup handoff", async () => {
  const authority = createRuntimeE2EAuthority({
    baseUrl: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedOrigin: "https://lovetree-limone-e2e-preview.charliekant.workers.dev",
    expectedWorker: "lovetree-limone-e2e-preview",
    expectedFirebaseProjectId: "relovetree-e2e",
    expectedNeonBranchId: APPROVED_E2E_NEON_BRANCH_ID,
    expectedDatabaseHost: APPROVED_E2E_NEON_HOST,
    expectedAppEnv: "e2e",
  });

  const pageDriverCalls = [];
  const mockDriver = {
    async goto(url, vp) {
      pageDriverCalls.push({ action: "goto", url, vp });
    },
    async executeFirstMomentCreate(args) {
      pageDriverCalls.push({ action: "createFirst", args });
      return { treeId: "tree-e2e-canonical", firstMemoryId: "mem-e2e-1" };
    },
    async executeSecondMomentCreate(args) {
      pageDriverCalls.push({ action: "createSecond", args });
      return { secondMemoryId: "mem-e2e-2" };
    },
    async verifyWorkspaceHighlight(args) {
      pageDriverCalls.push({ action: "verifyHighlight", args });
    },
    async reload(vp) {
      pageDriverCalls.push({ action: "reload", vp });
    },
    async verifyTreeState(args) {
      pageDriverCalls.push({ action: "verifyTreeState", args });
    },
    async signOut() {
      pageDriverCalls.push({ action: "signOut" });
    },
    async signIn() {
      pageDriverCalls.push({ action: "signIn" });
    },
    async executeMomentEdit(args) {
      pageDriverCalls.push({ action: "editMoment", args });
    },
    async executeThirdMomentCreate(args) {
      pageDriverCalls.push({ action: "createThird", args });
      return { thirdMemoryId: "mem-e2e-3" };
    },
  };

  // Mock fetch for #241 cleanup handoff
  const mockFetch = async (_url, options) => {
    if (options?.method === "DELETE") {
      return {
        ok: true,
        status: 200,
        async json() {
          return { success: true };
        },
      };
    }
    if (options?.method === "GET") {
      return {
        ok: false,
        status: 404,
        async json() {
          return { error: "Not found" };
        },
      };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  const disposableCreds = {
    apiKey: "mock-api-key-safe",
    user: {
      email: "disposable-user@example.com",
      password: "mock-password-safe",
      uid: "uid-disposable-123",
      idToken: "mock-id-token-safe",
    },
  };

  const journeyPayload = {
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

  const result = await executeCanonicalJourneyWorkflow({
    authority,
    viewport: DESKTOP_VIEWPORT,
    disposableCreds,
    journeyPayload,
    pageDriver: mockDriver,
    fetchImpl: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.journal.treeId, "tree-e2e-canonical");
  assert.equal(result.journal.firstMemoryId, "mem-e2e-1");
  assert.equal(result.journal.secondMemoryId, "mem-e2e-2");
  assert.equal(result.journal.thirdMemoryId, "mem-e2e-3");
  assert.equal(result.journal.completedSteps.length, 20);
  assert.equal(result.cleanupResult.memoryDeleted, true);
  assert.equal(result.cleanupResult.treeDeleted, true);
  assert.equal(result.evidenceReport.allStepsCompleted, true);
});
