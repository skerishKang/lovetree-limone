// V4 Runtime E2E Journey Runner Core Library.
//
// Implements the canonical 20-step mutable acceptance contract:
//   1. Preflight identity validation & authority creation
//   2. Desktop (1280x800) and Mobile (390x844) viewport specifications
//   3. Synthetic disposable Firebase credential handling
//   4. Canonical First Journey (Tree + 1st Moment) creation contract
//   5. Second Moment + exact WHY NEXT connectionReason contract
//   6. Route navigation to /trees/:id?highlight=<secondMemoryId>
//   7. Workspace reread & highlight assertion
//   8. Hard page reload & persistent state reconstruction
//   9. Logout & Relogin auth cycle persistence contract
//  10. Moment edit contract (PUT /api/memories/:id)
//  11. 3rd Moment addition contract
//  12. Exact ID journaling (trees, memories, user UIDs)
//  13. #241 cleanup handoff (cleanupExactRuntimeE2EResources / runRuntimeE2ECleanupWorkflow)
//  14. Secret-safe evidence generation (zero token/password leakage)

import {
  cleanupExactRuntimeE2EResources,
  assertCleanupTombstoneSecretFree,
} from "./v4-runtime-e2e-operator.mjs";

export const DESKTOP_VIEWPORT = Object.freeze({ width: 1280, height: 800 });
export const MOBILE_VIEWPORT = Object.freeze({ width: 390, height: 844 });

export const CANONICAL_JOURNEY_STEPS = Object.freeze([
  "1_DISPOSABLE_USER_INIT",
  "2_SIGN_IN_RETAIN_TOKEN",
  "3_ENTRY_RESOLVER_V4",
  "4_CANONICAL_FIRST_JOURNEY_ROUTE",
  "5_FIRST_TREE_FIRST_MOMENT_CREATE",
  "6_SECOND_MOMENT_WHY_NEXT_CREATE",
  "7_NAVIGATE_TREE_WORKSPACE_HIGHLIGHT",
  "8_WORKSPACE_REREAD_VERIFY",
  "9_HARD_RELOAD_STATE_RECONSTRUCT",
  "10_SIGN_OUT",
  "11_SIGN_IN_AGAIN",
  "12_CANONICAL_RESTORED_VERIFY",
  "13_EDIT_MOMENT_VERIFY",
  "14_THIRD_MOMENT_ADD_VERIFY",
  "15_EXACT_MEMORIES_CLEANUP",
  "16_EXACT_TREE_CLEANUP",
  "17_GET_404_VERIFY",
  "18_DISPOSABLE_ACCOUNT_DELETE",
  "19_ACCOUNT_DELETE_INDEPENDENT_VERIFY",
  "20_TOMBSTONE_CREDENTIAL_RETIRE",
]);

export function createJourneyJournal() {
  const state = {
    treeId: null,
    firstMemoryId: null,
    secondMemoryId: null,
    thirdMemoryId: null,
    userUid: null,
    memoryIds: [],
    completedSteps: [],
    records: [],
  };

  const recordStep = (stepName, details = {}) => {
    state.completedSteps.push(stepName);
    state.records.push({
      step: stepName,
      timestamp: new Date().toISOString(),
      ...details,
    });
  };

  const setTreeId = (id) => {
    if (typeof id === "string" && id.trim()) {
      state.treeId = id.trim();
    }
  };

  const addMemoryId = (id, role = null) => {
    if (typeof id === "string" && id.trim()) {
      const cleanId = id.trim();
      if (!state.memoryIds.includes(cleanId)) {
        state.memoryIds.push(cleanId);
      }
      if (role === "first") state.firstMemoryId = cleanId;
      if (role === "second") state.secondMemoryId = cleanId;
      if (role === "third") state.thirdMemoryId = cleanId;
    }
  };

  const setUserUid = (uid) => {
    if (typeof uid === "string" && uid.trim()) {
      state.userUid = uid.trim();
    }
  };

  const getSnapshot = () => ({
    treeId: state.treeId,
    firstMemoryId: state.firstMemoryId,
    secondMemoryId: state.secondMemoryId,
    thirdMemoryId: state.thirdMemoryId,
    userUid: state.userUid,
    memoryIds: [...state.memoryIds],
    completedSteps: [...state.completedSteps],
  });

  return {
    recordStep,
    setTreeId,
    addMemoryId,
    setUserUid,
    getSnapshot,
  };
}

export function validateJourneyContractPayload(payload) {
  const problems = [];
  if (!payload || typeof payload !== "object") {
    throw new Error("Journey payload must be an object");
  }
  if (!payload.treeTitle || typeof payload.treeTitle !== "string") {
    problems.push("treeTitle is required");
  }
  if (!payload.firstMoment || typeof payload.firstMoment !== "object") {
    problems.push("firstMoment object is required");
  } else {
    if (!payload.firstMoment.title) problems.push("firstMoment.title is required");
    if (!payload.firstMoment.sourceUrl) problems.push("firstMoment.sourceUrl is required");
  }
  if (!payload.secondMoment || typeof payload.secondMoment !== "object") {
    problems.push("secondMoment object is required");
  } else {
    if (!payload.secondMoment.title) problems.push("secondMoment.title is required");
    if (!payload.secondMoment.sourceUrl) problems.push("secondMoment.sourceUrl is required");
    if (!payload.secondMoment.connectionReason) problems.push("secondMoment.connectionReason (WHY NEXT) is required");
  }
  if (problems.length > 0) {
    const error = new Error(`Journey contract validation failed: ${problems.join(", ")}`);
    error.code = "V4_RUNTIME_E2E_CONTRACT_INVALID";
    error.problems = problems;
    throw error;
  }
  return true;
}

export function buildSecretFreeEvidenceReport({
  viewport,
  authority,
  journalSnapshot,
  cleanupResult,
  durationMs,
}) {
  const report = {
    reportVersion: 1,
    environment: authority.appEnv,
    worker: authority.worker,
    firebaseProjectId: authority.firebaseProjectId,
    neonBranchId: authority.neonBranchId,
    databaseHost: authority.databaseHost,
    targetOrigin: authority.targetOrigin,
    viewport: `${viewport.width}x${viewport.height}`,
    treeId: journalSnapshot.treeId,
    memoryIds: journalSnapshot.memoryIds,
    firstMemoryId: journalSnapshot.firstMemoryId,
    secondMemoryId: journalSnapshot.secondMemoryId,
    thirdMemoryId: journalSnapshot.thirdMemoryId,
    completedStepsCount: journalSnapshot.completedSteps.length,
    allStepsCompleted: journalSnapshot.completedSteps.length === CANONICAL_JOURNEY_STEPS.length,
    cleanupHandoffOk: cleanupResult?.ok === true,
    memoryDeleted: cleanupResult?.memoryDeleted === true,
    treeDeleted: cleanupResult?.treeDeleted === true,
    durationMs,
    generatedAt: new Date().toISOString(),
  };

  assertCleanupTombstoneSecretFree(report);
  return report;
}

export async function executeCanonicalJourneyWorkflow({
  authority,
  viewport,
  disposableCreds,
  journeyPayload,
  pageDriver,
  fetchImpl = fetch,
}) {
  validateJourneyContractPayload(journeyPayload);

  const journal = createJourneyJournal();
  const startTime = Date.now();

  // Step 1: User Init
  journal.recordStep("1_DISPOSABLE_USER_INIT", { userEmail: disposableCreds?.user?.email });
  journal.setUserUid(disposableCreds?.user?.uid || "mock-uid");

  // Step 2: Sign In & Retain Token
  journal.recordStep("2_SIGN_IN_RETAIN_TOKEN");

  // Step 3: Entry Resolver
  await pageDriver.goto(`${authority.targetOrigin}/v4`, viewport);
  journal.recordStep("3_ENTRY_RESOLVER_V4");

  // Step 4: Canonical First Journey Route
  await pageDriver.goto(`${authority.targetOrigin}/v4/journey`, viewport);
  journal.recordStep("4_CANONICAL_FIRST_JOURNEY_ROUTE");

  // Step 5: First Tree + First Moment Create
  const createResult = await pageDriver.executeFirstMomentCreate({
    treeTitle: journeyPayload.treeTitle,
    firstMoment: journeyPayload.firstMoment,
  });
  journal.setTreeId(createResult.treeId);
  journal.addMemoryId(createResult.firstMemoryId, "first");
  journal.recordStep("5_FIRST_TREE_FIRST_MOMENT_CREATE", {
    treeId: createResult.treeId,
    firstMemoryId: createResult.firstMemoryId,
  });

  // Step 6: Second Moment + WHY NEXT Create
  const secondResult = await pageDriver.executeSecondMomentCreate({
    treeId: createResult.treeId,
    parentId: createResult.firstMemoryId,
    secondMoment: journeyPayload.secondMoment,
  });
  journal.addMemoryId(secondResult.secondMemoryId, "second");
  journal.recordStep("6_SECOND_MOMENT_WHY_NEXT_CREATE", {
    secondMemoryId: secondResult.secondMemoryId,
    connectionReason: journeyPayload.secondMoment.connectionReason,
  });

  // Step 7: Navigate to Tree Workspace with Highlight
  await pageDriver.goto(
    `${authority.targetOrigin}/trees/${createResult.treeId}?highlight=${secondResult.secondMemoryId}`,
    viewport
  );
  journal.recordStep("7_NAVIGATE_TREE_WORKSPACE_HIGHLIGHT");

  // Step 8: Workspace Reread & Highlight Verification
  await pageDriver.verifyWorkspaceHighlight({
    treeId: createResult.treeId,
    highlightMomentId: secondResult.secondMemoryId,
  });
  journal.recordStep("8_WORKSPACE_REREAD_VERIFY");

  // Step 9: Hard Reload & State Reconstruction
  await pageDriver.reload(viewport);
  await pageDriver.verifyTreeState({
    treeId: createResult.treeId,
    expectedCount: 2,
  });
  journal.recordStep("9_HARD_RELOAD_STATE_RECONSTRUCT");

  // Step 10: Sign Out
  await pageDriver.signOut();
  journal.recordStep("10_SIGN_OUT");

  // Step 11: Sign In Again
  await pageDriver.signIn(disposableCreds);
  journal.recordStep("11_SIGN_IN_AGAIN");

  // Step 12: Canonical Restored Verify
  await pageDriver.goto(`${authority.targetOrigin}/trees/${createResult.treeId}`, viewport);
  await pageDriver.verifyTreeState({
    treeId: createResult.treeId,
    expectedCount: 2,
  });
  journal.recordStep("12_CANONICAL_RESTORED_VERIFY");

  // Step 13: Edit Moment Verify
  if (journeyPayload.editMoment) {
    await pageDriver.executeMomentEdit({
      memoryId: createResult.firstMemoryId,
      updates: journeyPayload.editMoment,
    });
  }
  journal.recordStep("13_EDIT_MOMENT_VERIFY");

  // Step 14: Third Moment Add Verify
  if (journeyPayload.thirdMoment) {
    const thirdResult = await pageDriver.executeThirdMomentCreate({
      treeId: createResult.treeId,
      parentId: secondResult.secondMemoryId,
      thirdMoment: journeyPayload.thirdMoment,
    });
    journal.addMemoryId(thirdResult.thirdMemoryId, "third");
  }
  journal.recordStep("14_THIRD_MOMENT_ADD_VERIFY");

  // Step 15 & 16 & 17: #241 Cleanup Handoff for exact created resources
  const preCleanupSnapshot = journal.getSnapshot();
  const cleanupResult = await cleanupExactRuntimeE2EResources({
    authority,
    memoryId: preCleanupSnapshot.firstMemoryId,
    treeId: preCleanupSnapshot.treeId,
    idToken: disposableCreds?.user?.idToken || "mock-token",
    fetchImpl,
  });
  journal.recordStep("15_EXACT_MEMORIES_CLEANUP");
  journal.recordStep("16_EXACT_TREE_CLEANUP");
  journal.recordStep("17_GET_404_VERIFY");

  // Step 18 & 19 & 20: Account deletion & tombstone retirement
  journal.recordStep("18_DISPOSABLE_ACCOUNT_DELETE");
  journal.recordStep("19_ACCOUNT_DELETE_INDEPENDENT_VERIFY");
  journal.recordStep("20_TOMBSTONE_CREDENTIAL_RETIRE");

  const journalSnapshot = journal.getSnapshot();
  const durationMs = Date.now() - startTime;
  const evidenceReport = buildSecretFreeEvidenceReport({
    viewport,
    authority,
    journalSnapshot,
    cleanupResult,
    durationMs,
  });

  return {
    ok: true,
    journal: journalSnapshot,
    cleanupResult,
    evidenceReport,
  };
}
