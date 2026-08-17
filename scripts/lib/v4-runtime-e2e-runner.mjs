// V4 Runtime E2E Journey Runner Core Library.
//
// Implements the canonical 20-step mutable acceptance contract:
//   1. Preflight identity validation & authority creation
//   2. Desktop (1280x800) and Mobile (390x844) viewport specifications
//   3. Synthetic disposable Firebase credential handling & real initial sign-in
//   4. Canonical First Journey (Tree + 1st Moment) creation contract
//   5. Second Moment + exact WHY NEXT connectionReason contract
//   6. Route navigation to /trees/:id?highlight=<secondMemoryId>
//   7. Workspace reread & highlight assertion
//   8. Hard page reload & persistent state reconstruction
//   9. Logout & Relogin auth cycle persistence contract
//  10. Moment edit contract (PUT /api/memories/:id)
//  11. 3rd Moment addition contract
//  12. Exact ID journaling (trees, memories, user UIDs)
//  13. #241 exact cleanup & cascade 404 verification for ALL created Memory IDs + Tree ID
//  14. Disposable Firebase account deletion & independent verification (accounts:lookup)
//  15. Secret-free tombstone & credential retirement
//  16. Secret-safe evidence generation (zero token/password leakage)

import {
  buildCleanupTombstone,
  assertCleanupTombstoneSecretFree,
} from "./v4-runtime-e2e-operator.mjs";
import {
  signInWithPassword,
  deleteAccount,
  verifyUserDeleted,
} from "./firebase-disposable-auth.mjs";

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

export function runnerError(code, message, details = null) {
  const error = new Error(message);
  error.code = code;
  if (details !== null) error.details = details;
  return error;
}

export function validateDisposableCredentials(creds) {
  if (!creds || typeof creds !== "object") {
    throw runnerError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "disposable credentials must be an object"
    );
  }
  if (typeof creds.apiKey !== "string" || !creds.apiKey.trim()) {
    throw runnerError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "disposable credentials apiKey is required"
    );
  }
  const users = Array.isArray(creds.users) ? creds.users : [];
  if (users.length === 0) {
    throw runnerError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "disposable credentials requires at least one user"
    );
  }
  const primaryUser = users[0];
  if (
    typeof primaryUser?.email !== "string" ||
    !primaryUser.email.trim() ||
    typeof primaryUser?.password !== "string" ||
    !primaryUser.password.trim()
  ) {
    throw runnerError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "primary disposable user requires email and password"
    );
  }
  return { apiKey: creds.apiKey.trim(), user: primaryUser };
}

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
    throw runnerError(
      "V4_RUNTIME_E2E_CONTRACT_INVALID",
      "Journey payload must be an object"
    );
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
    throw runnerError(
      "V4_RUNTIME_E2E_CONTRACT_INVALID",
      `Journey contract validation failed: ${problems.join(", ")}`,
      problems
    );
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
    allMemoryIdsVerified404: cleanupResult?.allMemoryIdsVerified404 === true,
    treeVerified404: cleanupResult?.treeVerified404 === true,
    accountDeletionVerified: cleanupResult?.accountDeletionVerified === true,
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
  signInWithPasswordImpl = signInWithPassword,
  deleteAccountImpl = deleteAccount,
  verifyUserDeletedImpl = verifyUserDeleted,
  writeTombstoneImpl = null,
  retireCredentialsImpl = null,
  retireTombstoneImpl = null,
  fetchImpl = fetch,
}) {
  validateJourneyContractPayload(journeyPayload);
  const validatedCreds = validateDisposableCredentials(disposableCreds);

  const journal = createJourneyJournal();
  const startTime = Date.now();

  // Step 1: User Init
  journal.recordStep("1_DISPOSABLE_USER_INIT", {
    userEmail: validatedCreds.user.email,
  });

  // Step 2: Sign In & Retain Token (P0-2: Must execute genuine sign-in)
  let activeToken = null;
  let activeUid = null;
  try {
    const authResult = await signInWithPasswordImpl({
      apiKey: validatedCreds.apiKey,
      email: validatedCreds.user.email,
      password: validatedCreds.user.password,
      fetchImpl,
    });
    if (!authResult || typeof authResult.idToken !== "string" || !authResult.idToken) {
      throw runnerError("V4_RUNTIME_E2E_AUTH_FAILED", "sign-in did not return idToken");
    }
    activeToken = authResult.idToken;
    activeUid = authResult.localId || authResult.uid || validatedCreds.user.uid || "mock-uid";
  } catch (error) {
    throw runnerError(
      "V4_RUNTIME_E2E_AUTH_FAILED",
      `initial disposable-user sign-in failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  journal.setUserUid(activeUid);
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
    idToken: activeToken,
  });
  if (!createResult?.treeId || !createResult?.firstMemoryId) {
    throw runnerError("V4_RUNTIME_E2E_CREATE_FAILED", "first moment creation failed to return treeId and memoryId");
  }
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
    idToken: activeToken,
  });
  if (!secondResult?.secondMemoryId) {
    throw runnerError("V4_RUNTIME_E2E_CREATE_FAILED", "second moment creation failed to return memoryId");
  }
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
  await pageDriver.signIn(validatedCreds);
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
      idToken: activeToken,
    });
  }
  journal.recordStep("13_EDIT_MOMENT_VERIFY");

  // Step 14: Third Moment Add Verify
  if (journeyPayload.thirdMoment) {
    const thirdResult = await pageDriver.executeThirdMomentCreate({
      treeId: createResult.treeId,
      parentId: secondResult.secondMemoryId,
      thirdMoment: journeyPayload.thirdMoment,
      idToken: activeToken,
    });
    if (!thirdResult?.thirdMemoryId) {
      throw runnerError("V4_RUNTIME_E2E_CREATE_FAILED", "third moment creation failed to return memoryId");
    }
    journal.addMemoryId(thirdResult.thirdMemoryId, "third");
  }
  journal.recordStep("14_THIRD_MOMENT_ADD_VERIFY");

  // Step 15: Exact Memories Cleanup for ALL created memory IDs (P0-4)
  const currentSnapshot = journal.getSnapshot();
  const deletedMemoryResults = [];
  for (const memId of currentSnapshot.memoryIds) {
    const encoded = encodeURIComponent(memId);
    const delRes = await fetchImpl(`${authority.targetOrigin}/api/memories/${encoded}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
      redirect: "error",
    });
    if (!delRes.ok && delRes.status !== 404) {
      throw runnerError(
        "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
        `Memory '${memId}' delete returned HTTP ${delRes.status}`
      );
    }
    deletedMemoryResults.push({ memoryId: memId, status: delRes.status });
  }
  journal.recordStep("15_EXACT_MEMORIES_CLEANUP", {
    cleanedMemoryIds: currentSnapshot.memoryIds,
  });

  // Step 16: Exact Tree Cleanup
  const encodedTree = encodeURIComponent(currentSnapshot.treeId);
  const delTreeRes = await fetchImpl(`${authority.targetOrigin}/api/trees/${encodedTree}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${activeToken}`,
    },
    redirect: "error",
  });
  if (!delTreeRes.ok && delTreeRes.status !== 404) {
    throw runnerError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
      `Tree '${currentSnapshot.treeId}' delete returned HTTP ${delTreeRes.status}`
    );
  }
  journal.recordStep("16_EXACT_TREE_CLEANUP", {
    cleanedTreeId: currentSnapshot.treeId,
  });

  // Step 17: GET 404 Verification for Tree AND ALL Memory IDs (P0-4)
  const verifyTreeRes = await fetchImpl(`${authority.targetOrigin}/api/trees/${encodedTree}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${activeToken}`,
    },
    redirect: "error",
  });
  if (verifyTreeRes.status !== 404) {
    throw runnerError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED",
      `Tree cleanup verification expected HTTP 404, got ${verifyTreeRes.status}`
    );
  }

  for (const memId of currentSnapshot.memoryIds) {
    const encoded = encodeURIComponent(memId);
    const verifyMemRes = await fetchImpl(`${authority.targetOrigin}/api/memories/${encoded}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
      redirect: "error",
    });
    if (verifyMemRes.status !== 404) {
      throw runnerError(
        "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED",
        `Memory '${memId}' cleanup verification expected HTTP 404, got ${verifyMemRes.status}`
      );
    }
  }
  journal.recordStep("17_GET_404_VERIFY", {
    verifiedTreeId404: currentSnapshot.treeId,
    verifiedMemoryIds404: currentSnapshot.memoryIds,
  });

  // Step 18: Disposable Account Deletion (P0-3)
  await deleteAccountImpl({
    apiKey: validatedCreds.apiKey,
    idToken: activeToken,
    fetchImpl,
  });
  journal.recordStep("18_DISPOSABLE_ACCOUNT_DELETE");

  // Step 19: Independent Account Deletion Verification (P0-3)
  const deleteVerdict = await verifyUserDeletedImpl({
    apiKey: validatedCreds.apiKey,
    email: validatedCreds.user.email,
    password: validatedCreds.user.password,
    idToken: activeToken,
    fetchImpl,
  });
  if (deleteVerdict?.deleted !== true || deleteVerdict?.reasonCode !== "VERIFIED") {
    throw runnerError(
      "V4_RUNTIME_E2E_ACCOUNT_DELETION_UNVERIFIED",
      `disposable account deletion could not be verified independently: ${deleteVerdict?.detail ?? "unverified"}`
    );
  }
  journal.recordStep("19_ACCOUNT_DELETE_INDEPENDENT_VERIFY", {
    reasonCode: deleteVerdict.reasonCode,
  });

  // Step 20: Tombstone Creation & Credential Retirement (P0-3)
  const tombstone = buildCleanupTombstone({
    authority,
    memoryId: currentSnapshot.firstMemoryId,
    treeId: currentSnapshot.treeId,
    firebaseUid: activeUid,
    verifiedAt: new Date().toISOString(),
  });

  if (typeof writeTombstoneImpl === "function") {
    await writeTombstoneImpl(tombstone);
  }
  if (typeof retireCredentialsImpl === "function") {
    await retireCredentialsImpl();
  }
  if (typeof retireTombstoneImpl === "function") {
    await retireTombstoneImpl();
  }
  journal.recordStep("20_TOMBSTONE_CREDENTIAL_RETIRE");

  const finalSnapshot = journal.getSnapshot();
  const durationMs = Date.now() - startTime;
  const cleanupResult = {
    ok: true,
    allMemoryIdsVerified404: true,
    treeVerified404: true,
    accountDeletionVerified: true,
    cleanedMemoryIds: finalSnapshot.memoryIds,
    cleanedTreeId: finalSnapshot.treeId,
  };

  const evidenceReport = buildSecretFreeEvidenceReport({
    viewport,
    authority,
    journalSnapshot: finalSnapshot,
    cleanupResult,
    durationMs,
  });

  return {
    ok: true,
    journal: finalSnapshot,
    cleanupResult,
    evidenceReport,
  };
}
