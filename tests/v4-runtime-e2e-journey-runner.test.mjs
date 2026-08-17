import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_JOURNEY_STEPS,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  assertPersistedServerId,
  buildSecretFreeEvidenceReport,
  createJourneyJournal,
  executeCanonicalJourneyWorkflow,
  validateDisposableCredentials,
  validateJourneyContractPayload,
} from "../scripts/lib/v4-runtime-e2e-runner.mjs";
import { createRuntimeE2EAuthority } from "../scripts/lib/v4-runtime-e2e-operator.mjs";

const unitApiKey = ["unit", "api", "key"].join(".");
const unitCredential = ["unit", "credential", "value"].join(".");
const unitTokenA = ["unit", "token", "a"].join(".");
const unitTokenB = ["unit", "token", "b"].join(".");

const IDs = Object.freeze({
  tree: "10000000-0000-4000-8000-000000000001",
  first: "20000000-0000-4000-8000-000000000001",
  second: "30000000-0000-4000-8000-000000000001",
  third: "40000000-0000-4000-8000-000000000001",
});

const authority = createRuntimeE2EAuthority({
  baseUrl: "http://localhost:8787",
  expectedOrigin: "http://localhost:8787",
  expectedWorker: "lovetree-limone-runtime-e2e-test-preview",
  expectedFirebaseProjectId: "lovetree-runtime-e2e-test",
  expectedNeonBranchId: "br-runtime-e2e-test",
  expectedDatabaseHost: "localhost",
  expectedAppEnv: "e2e",
  allowLocalhostHttp: true,
});

const creds = Object.freeze({
  apiKey: unitApiKey,
  users: [
    Object.freeze({
      email: "runtime-e2e-unit@example.test",
      password: unitCredential,
    }),
  ],
});

const journeyPayload = Object.freeze({
  treeTitle: "Runtime E2E Tree",
  firstMoment: Object.freeze({
    title: "First Moment",
    sourceUrl: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
    memo: "first",
  }),
  secondMoment: Object.freeze({
    title: "Second Moment",
    sourceUrl: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
    memo: "second",
    connectionReason: "WHY NEXT exact persisted reason",
  }),
  editMoment: Object.freeze({
    title: "First Moment Edited",
  }),
  thirdMoment: Object.freeze({
    title: "Third Moment",
    sourceUrl: "https://www.youtube.com/watch?v=ccccccccccc",
    memo: "third",
    connectionReason: "Second continues into third",
  }),
});

function response(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function createCleanupFetch({ non404MemoryId = null } = {}) {
  return async (url, options = {}) => {
    const method = options.method || "GET";
    if (method === "DELETE") {
      return response(200, { success: true });
    }
    if (method === "GET") {
      if (non404MemoryId && String(url).includes(non404MemoryId)) {
        return response(200, { id: non404MemoryId });
      }
      return response(404, { error: "Not found" });
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
}

function createDriver(overrides = {}) {
  let signInCount = 0;
  const driver = {
    async signIn() {
      signInCount += 1;
      return {
        authenticated: true,
        idToken: signInCount === 1 ? unitTokenA : unitTokenB,
        localId: "uid-runtime-e2e-unit",
      };
    },
    async goto() {},
    async executeFirstMomentCreate() {
      return {
        requestObserved: true,
        serverCreated: true,
        treeId: IDs.tree,
        firstMemoryId: IDs.first,
      };
    },
    async executeSecondMomentCreate({ parentId, secondMoment }) {
      return {
        requestObserved: true,
        serverCreated: true,
        serverReread: true,
        secondMemoryId: IDs.second,
        parentId,
        connectionReason: secondMoment.connectionReason,
      };
    },
    async verifyWorkspaceHighlight() {
      return { highlightVerified: true, serverReread: true };
    },
    async reload() {
      return { hardReload: true };
    },
    async verifyTreeState() {
      return { serverReread: true };
    },
    async signOut() {
      return { signedOut: true, browserContextClosed: true };
    },
    async executeMomentEdit({ updates }) {
      return {
        saveSubmitted: true,
        serverPutSucceeded: true,
        hardReload: true,
        reloadReread: true,
        editedTitle: updates.title,
      };
    },
    async executeThirdMomentCreate({ parentId }) {
      return {
        requestObserved: true,
        serverCreated: true,
        serverReread: true,
        thirdMemoryId: IDs.third,
        parentId,
      };
    },
  };
  return Object.assign(driver, overrides);
}

function successDependencies(overrides = {}) {
  return {
    authority,
    viewport: DESKTOP_VIEWPORT,
    disposableCreds: creds,
    journeyPayload,
    pageDriver: createDriver(),
    deleteAccountImpl: async () => ({}),
    verifyUserDeletedImpl: async () => ({ deleted: true }),
    writeTombstoneImpl: async () => ({ written: true }),
    retireCredentialsImpl: async () => ({ retired: true }),
    fetchImpl: createCleanupFetch(),
    ...overrides,
  };
}

async function rejectsCode(factory, code) {
  await assert.rejects(factory, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

test("canonical viewports remain Desktop 1280x800 and Mobile 390x844", () => {
  assert.deepEqual(DESKTOP_VIEWPORT, { width: 1280, height: 800 });
  assert.deepEqual(MOBILE_VIEWPORT, { width: 390, height: 844 });
});

test("credentials require exactly one disposable user per viewport", () => {
  assert.equal(validateDisposableCredentials(creds).user.email, creds.users[0].email);
  assert.throws(
    () => validateDisposableCredentials({ apiKey: unitApiKey, users: [] }),
    /exactly one isolated disposable Firebase user/
  );
});

test("journey payload requires WHY NEXT, edit, and third Moment", () => {
  assert.equal(validateJourneyContractPayload(journeyPayload), true);
  assert.throws(
    () =>
      validateJourneyContractPayload({
        ...journeyPayload,
        secondMoment: { ...journeyPayload.secondMoment, connectionReason: "" },
      }),
    /connectionReason/
  );
});

test("journal preserves exact canonical step order", () => {
  const journal = createJourneyJournal();
  for (const step of CANONICAL_JOURNEY_STEPS) journal.recordStep(step);
  assert.deepEqual(journal.getSnapshot().completedSteps, CANONICAL_JOURNEY_STEPS);
});

test("manufactured persisted IDs are rejected", () => {
  for (const id of [
    "tree-persisted-id",
    "mem-first-id",
    "mem-second-id",
    "mem-third-id",
    "mock-tree-id",
    "fake-memory-id",
  ]) {
    assert.throws(
      () => assertPersistedServerId(id),
      (error) => error.code === "V4_RUNTIME_E2E_FAKE_ID_REJECTED"
    );
  }
});

test("full contract succeeds only with server/action proof", async () => {
  const result = await executeCanonicalJourneyWorkflow(successDependencies());
  assert.equal(result.ok, true);
  assert.equal(result.evidenceReport.allStepsCompleted, true);
  assert.deepEqual(result.journal.memoryIds, [IDs.first, IDs.second, IDs.third]);
  assert.equal(result.journal.completedSteps.length, CANONICAL_JOURNEY_STEPS.length);
});

test("hardcoded ID cannot satisfy production path", async () => {
  const driver = createDriver({
    async executeFirstMomentCreate() {
      return {
        requestObserved: true,
        serverCreated: true,
        treeId: "tree-persisted-id",
        firstMemoryId: IDs.first,
      };
    },
  });
  await rejectsCode(
    () => executeCanonicalJourneyWorkflow(successDependencies({ pageDriver: driver })),
    "V4_RUNTIME_E2E_FAKE_ID_REJECTED"
  );
});

test("missing server ID fails closed", async () => {
  const driver = createDriver({
    async executeFirstMomentCreate() {
      return {
        requestObserved: true,
        serverCreated: true,
        treeId: IDs.tree,
      };
    },
  });
  await rejectsCode(
    () => executeCanonicalJourneyWorkflow(successDependencies({ pageDriver: driver })),
    "V4_RUNTIME_E2E_SERVER_ID_MISSING"
  );
});

test("no-op signIn fails before any journey mutation", async () => {
  const driver = createDriver({ async signIn() {} });
  await rejectsCode(
    () => executeCanonicalJourneyWorkflow(successDependencies({ pageDriver: driver })),
    "V4_RUNTIME_E2E_AUTH_FAILED"
  );
});

test("failed relogin fails closed", async () => {
  let calls = 0;
  const driver = createDriver({
    async signIn() {
      calls += 1;
      if (calls === 1) {
        return {
          authenticated: true,
          idToken: unitTokenA,
          localId: "uid-runtime-e2e-unit",
        };
      }
      return { authenticated: false };
    },
  });
  await rejectsCode(
    () => executeCanonicalJourneyWorkflow(successDependencies({ pageDriver: driver })),
    "V4_RUNTIME_E2E_AUTH_FAILED"
  );
});

test("third create without observed request/result fails", async () => {
  const driver = createDriver({
    async executeThirdMomentCreate({ parentId }) {
      return {
        requestObserved: false,
        serverCreated: false,
        serverReread: false,
        thirdMemoryId: IDs.third,
        parentId,
      };
    },
  });
  await rejectsCode(
    () => executeCanonicalJourneyWorkflow(successDependencies({ pageDriver: driver })),
    "V4_RUNTIME_E2E_THIRD_CREATE_UNVERIFIED"
  );
});

test("edit without save + PUT + reload reread fails", async () => {
  const driver = createDriver({
    async executeMomentEdit({ updates }) {
      return {
        saveSubmitted: false,
        serverPutSucceeded: false,
        hardReload: false,
        reloadReread: false,
        editedTitle: updates.title,
      };
    },
  });
  await rejectsCode(
    () => executeCanonicalJourneyWorkflow(successDependencies({ pageDriver: driver })),
    "V4_RUNTIME_E2E_EDIT_UNVERIFIED"
  );
});

test("WHY NEXT mismatch fails even when second create returned an ID", async () => {
  const driver = createDriver({
    async executeSecondMomentCreate({ parentId }) {
      return {
        requestObserved: true,
        serverCreated: true,
        serverReread: true,
        secondMemoryId: IDs.second,
        parentId,
        connectionReason: "different persisted reason",
      };
    },
  });
  await rejectsCode(
    () => executeCanonicalJourneyWorkflow(successDependencies({ pageDriver: driver })),
    "V4_RUNTIME_E2E_WHY_NEXT_MISMATCH"
  );
});

for (const [label, id] of [
  ["second", IDs.second],
  ["third", IDs.third],
]) {
  test(`${label} Memory not 404 makes exact cleanup fail`, async () => {
    await rejectsCode(
      () =>
        executeCanonicalJourneyWorkflow(
          successDependencies({
            fetchImpl: createCleanupFetch({ non404MemoryId: id }),
          })
        ),
      "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED"
    );
  });
}

test("account deletion unverified fails", async () => {
  await rejectsCode(
    () =>
      executeCanonicalJourneyWorkflow(
        successDependencies({
          verifyUserDeletedImpl: async () => ({ deleted: false }),
        })
      ),
    "V4_RUNTIME_E2E_ACCOUNT_DELETE_UNVERIFIED"
  );
});

test("missing durable tombstone prevents PASS", async () => {
  await rejectsCode(
    () =>
      executeCanonicalJourneyWorkflow(
        successDependencies({
          writeTombstoneImpl: async () => ({ written: false }),
        })
      ),
    "V4_RUNTIME_E2E_EVIDENCE_INCOMPLETE"
  );
});

test("missing credential retirement prevents PASS", async () => {
  await rejectsCode(
    () =>
      executeCanonicalJourneyWorkflow(
        successDependencies({
          retireCredentialsImpl: async () => ({ retired: false }),
        })
      ),
    "V4_RUNTIME_E2E_EVIDENCE_INCOMPLETE"
  );
});

test("journal length alone cannot make evidence PASS", () => {
  const journal = createJourneyJournal();
  journal.setTreeId(IDs.tree);
  journal.addMemoryId(IDs.first, "first");
  journal.addMemoryId(IDs.second, "second");
  journal.addMemoryId(IDs.third, "third");
  for (const step of CANONICAL_JOURNEY_STEPS) journal.recordStep(step);

  const proof = {
    initialAuthenticatedLogin: true,
    firstCreateServerIds: true,
    secondCreateServerId: true,
    whyNextPersisted: true,
    workspaceHighlight: true,
    preReloadReread: true,
    hardReloadReread: true,
    signedOut: true,
    reloginAuthenticated: true,
    restoredCanonicalData: true,
    editSavePutReread: true,
    thirdCreateMutationReread: false,
    allCreatedMemories404: true,
    tree404: true,
    accountDeleted: true,
    accountDeletionVerified: true,
    tombstoneWritten: true,
    credentialsRetired: true,
  };

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
    proof,
    durationMs: 1,
  });

  assert.equal(report.completedStepsCount, CANONICAL_JOURNEY_STEPS.length);
  assert.equal(report.allExecutionProofs, false);
  assert.equal(report.allStepsCompleted, false);
});
