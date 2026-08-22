// V4 Runtime E2E Journey Runner Core Library.
//
// This module is deliberately fail-closed. A step is complete only when the
// driver returns proof of the real authenticated action and the server state
// expected by the canonical Runtime E2E contract.

import {
  buildCleanupTombstone,
  assertCleanupTombstoneSecretFree,
} from "./v4-runtime-e2e-operator.mjs";
import {
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

const KNOWN_PLACEHOLDER_IDS = new Set([
  "tree-persisted-id",
  "mem-first-id",
  "mem-second-id",
  "mem-third-id",
]);

const REQUIRED_PROOF_KEYS = Object.freeze([
  "initialAuthenticatedLogin",
  "firstCreateServerIds",
  "secondCreateServerId",
  "whyNextPersisted",
  "workspaceHighlight",
  "preReloadReread",
  "hardReloadReread",
  "signedOut",
  "reloginAuthenticated",
  "restoredCanonicalData",
  "editSavePutReread",
  "thirdCreateMutationReread",
  "allCreatedMemories404",
  "tree404",
  "accountDeleted",
  "accountDeletionVerified",
  "tombstoneWritten",
  "credentialsRetired",
]);

export function runnerError(code, message, details = null) {
  const error = new Error(message);
  error.code = code;
  if (details !== null) error.details = details;
  return error;
}

function requiredString(value, label, code = "V4_RUNTIME_E2E_EXECUTION_PROOF_MISSING") {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw runnerError(code, `${label} is required`);
  }
  return normalized;
}

export function assertPersistedServerId(value, label = "persisted id") {
  const id = requiredString(value, label, "V4_RUNTIME_E2E_SERVER_ID_MISSING");
  const lowered = id.toLowerCase();
  if (
    KNOWN_PLACEHOLDER_IDS.has(lowered) ||
    lowered.startsWith("mock") ||
    lowered.startsWith("fake") ||
    lowered.includes("placeholder") ||
    lowered.includes("persisted-id")
  ) {
    throw runnerError(
      "V4_RUNTIME_E2E_FAKE_ID_REJECTED",
      `${label} is a manufactured placeholder and cannot satisfy Runtime E2E`
    );
  }
  return id;
}

export function validateDisposableCredentials(creds) {
  if (!creds || typeof creds !== "object") {
    throw runnerError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "disposable credentials must be an object"
    );
  }
  const apiKey = requiredString(
    creds.apiKey,
    "disposable credentials apiKey",
    "V4_RUNTIME_E2E_CREDENTIALS_INVALID"
  );
  const users = Array.isArray(creds.users) ? creds.users : [];
  if (users.length !== 1) {
    throw runnerError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "each viewport requires exactly one isolated disposable Firebase user"
    );
  }
  const user = users[0];
  const email = requiredString(
    user?.email,
    "primary disposable user email",
    "V4_RUNTIME_E2E_CREDENTIALS_INVALID"
  );
  const password = requiredString(
    user?.password,
    "primary disposable user password",
    "V4_RUNTIME_E2E_CREDENTIALS_INVALID"
  );
  return { apiKey, user: { ...user, email, password } };
}

export function validateJourneyContractPayload(payload) {
  const problems = [];
  if (!payload || typeof payload !== "object") {
    throw runnerError(
      "V4_RUNTIME_E2E_CONTRACT_INVALID",
      "Journey payload must be an object"
    );
  }
  if (typeof payload.treeTitle !== "string" || !payload.treeTitle.trim()) {
    problems.push("treeTitle is required");
  }
  for (const [label, moment] of [
    ["firstMoment", payload.firstMoment],
    ["secondMoment", payload.secondMoment],
    ["thirdMoment", payload.thirdMoment],
  ]) {
    if (!moment || typeof moment !== "object") {
      problems.push(`${label} object is required`);
      continue;
    }
    if (typeof moment.title !== "string" || !moment.title.trim()) {
      problems.push(`${label}.title is required`);
    }
    if (typeof moment.sourceUrl !== "string" || !moment.sourceUrl.trim()) {
      problems.push(`${label}.sourceUrl is required`);
    }
  }
  if (
    typeof payload.secondMoment?.connectionReason !== "string" ||
    !payload.secondMoment.connectionReason.trim()
  ) {
    problems.push("secondMoment.connectionReason (WHY NEXT) is required");
  }
  if (
    typeof payload.thirdMoment?.connectionReason !== "string" ||
    !payload.thirdMoment.connectionReason.trim()
  ) {
    problems.push("thirdMoment.connectionReason is required");
  }
  if (
    !payload.editMoment ||
    typeof payload.editMoment !== "object" ||
    typeof payload.editMoment.title !== "string" ||
    !payload.editMoment.title.trim()
  ) {
    problems.push("editMoment.title is required");
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

  return {
    recordStep(step, details = {}) {
      state.completedSteps.push(step);
      state.records.push({ step, timestamp: new Date().toISOString(), ...details });
    },
    setTreeId(id) {
      state.treeId = assertPersistedServerId(id, "treeId");
    },
    addMemoryId(id, role = null) {
      const cleanId = assertPersistedServerId(id, `${role || "created"} memoryId`);
      if (!state.memoryIds.includes(cleanId)) state.memoryIds.push(cleanId);
      if (role === "first") state.firstMemoryId = cleanId;
      if (role === "second") state.secondMemoryId = cleanId;
      if (role === "third") state.thirdMemoryId = cleanId;
    },
    setUserUid(uid) {
      state.userUid = requiredString(uid, "Firebase localId", "V4_RUNTIME_E2E_AUTH_FAILED");
    },
    getSnapshot() {
      return {
        treeId: state.treeId,
        firstMemoryId: state.firstMemoryId,
        secondMemoryId: state.secondMemoryId,
        thirdMemoryId: state.thirdMemoryId,
        userUid: state.userUid,
        memoryIds: [...state.memoryIds],
        completedSteps: [...state.completedSteps],
      };
    },
  };
}

function requireBooleanProof(result, key, code, message) {
  if (result?.[key] !== true) throw runnerError(code, message);
}

function requireAuthResult(result, phase) {
  const idToken = requiredString(
    result?.idToken,
    `${phase} idToken`,
    "V4_RUNTIME_E2E_AUTH_FAILED"
  );
  const localId = requiredString(
    result?.localId || result?.uid,
    `${phase} localId`,
    "V4_RUNTIME_E2E_AUTH_FAILED"
  );
  requireBooleanProof(
    result,
    "authenticated",
    "V4_RUNTIME_E2E_AUTH_FAILED",
    `${phase} did not prove an authenticated Firebase login`
  );
  return { idToken, localId };
}

async function deleteCreatedMemories({ authority, ids, idToken, fetchImpl }) {
  for (const id of ids) {
    const response = await fetchImpl(
      `${authority.targetOrigin}/api/memories/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        redirect: "error",
      }
    );
    if (!response.ok && response.status !== 404) {
      throw runnerError(
        "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
        `Memory '${id}' delete returned HTTP ${response.status}`
      );
    }
  }
}

async function verifyCreatedMemories404({ authority, ids, idToken, fetchImpl }) {
  for (const id of ids) {
    const response = await fetchImpl(
      `${authority.targetOrigin}/api/memories/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        redirect: "error",
      }
    );
    if (response.status !== 404) {
      throw runnerError(
        "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED",
        `Memory '${id}' cleanup verification expected HTTP 404, got ${response.status}`
      );
    }
  }
}

function completeStepSet(completedSteps) {
  return (
    completedSteps.length === CANONICAL_JOURNEY_STEPS.length &&
    CANONICAL_JOURNEY_STEPS.every((step, index) => completedSteps[index] === step)
  );
}

export function buildSecretFreeEvidenceReport({
  viewport,
  authority,
  journalSnapshot,
  cleanupResult,
  proof,
  durationMs,
}) {
  const allExecutionProofs = REQUIRED_PROOF_KEYS.every((key) => proof?.[key] === true);
  const report = {
    reportVersion: 2,
    environment: authority.appEnv,
    worker: authority.worker,
    firebaseProjectId: authority.firebaseProjectId,
    neonBranchId: authority.neonBranchId,
    databaseHost: authority.databaseHost,
    targetOrigin: authority.targetOrigin,
    viewport: `${viewport.width}x${viewport.height}`,
    treeId: journalSnapshot.treeId,
    memoryIds: [...journalSnapshot.memoryIds],
    firstMemoryId: journalSnapshot.firstMemoryId,
    secondMemoryId: journalSnapshot.secondMemoryId,
    thirdMemoryId: journalSnapshot.thirdMemoryId,
    completedStepsCount: journalSnapshot.completedSteps.length,
    exactCanonicalStepOrder: completeStepSet(journalSnapshot.completedSteps),
    allExecutionProofs,
    allStepsCompleted:
      completeStepSet(journalSnapshot.completedSteps) &&
      allExecutionProofs &&
      cleanupResult?.ok === true,
    cleanupHandoffOk: cleanupResult?.ok === true,
    allMemoryIdsVerified404: cleanupResult?.allMemoryIdsVerified404 === true,
    treeVerified404: cleanupResult?.treeVerified404 === true,
    accountDeletionVerified: cleanupResult?.accountDeletionVerified === true,
    tombstoneWritten: proof?.tombstoneWritten === true,
    credentialsRetired: proof?.credentialsRetired === true,
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
  deleteAccountImpl = deleteAccount,
  verifyUserDeletedImpl = verifyUserDeleted,
  writeTombstoneImpl,
  retireCredentialsImpl,
  fetchImpl = fetch,
}) {
  validateJourneyContractPayload(journeyPayload);
  const validatedCreds = validateDisposableCredentials(disposableCreds);
  if (!pageDriver || typeof pageDriver !== "object") {
    throw runnerError("V4_RUNTIME_E2E_DRIVER_INVALID", "pageDriver is required");
  }
  for (const method of [
    "signIn",
    "goto",
    "executeFirstMomentCreate",
    "executeSecondMomentCreate",
    "verifyWorkspaceHighlight",
    "verifyTreeState",
    "reload",
    "signOut",
    "executeMomentEdit",
    "executeThirdMomentCreate",
  ]) {
    if (typeof pageDriver[method] !== "function") {
      throw runnerError("V4_RUNTIME_E2E_DRIVER_INVALID", `pageDriver.${method} is required`);
    }
  }
  if (typeof writeTombstoneImpl !== "function") {
    throw runnerError(
      "V4_RUNTIME_E2E_EVIDENCE_INCOMPLETE",
      "writeTombstoneImpl is required; evidence cannot PASS without a durable tombstone"
    );
  }
  if (typeof retireCredentialsImpl !== "function") {
    throw runnerError(
      "V4_RUNTIME_E2E_EVIDENCE_INCOMPLETE",
      "retireCredentialsImpl is required; evidence cannot PASS without credential retirement"
    );
  }

  const journal = createJourneyJournal();
  const proof = Object.fromEntries(REQUIRED_PROOF_KEYS.map((key) => [key, false]));
  const startedAt = Date.now();

  journal.recordStep("1_DISPOSABLE_USER_INIT");

  const initialAuth = requireAuthResult(
    await pageDriver.signIn(validatedCreds),
    "initial sign-in"
  );
  let activeToken = initialAuth.idToken;
  const activeUid = initialAuth.localId;
  journal.setUserUid(activeUid);
  proof.initialAuthenticatedLogin = true;
  journal.recordStep("2_SIGN_IN_RETAIN_TOKEN");

  await pageDriver.goto(`${authority.targetOrigin}/v4`, viewport);
  journal.recordStep("3_ENTRY_RESOLVER_V4");

  await pageDriver.goto(`${authority.targetOrigin}/v4/journey`, viewport);
  journal.recordStep("4_CANONICAL_FIRST_JOURNEY_ROUTE");

  const first = await pageDriver.executeFirstMomentCreate({
    treeTitle: journeyPayload.treeTitle,
    firstMoment: journeyPayload.firstMoment,
    idToken: activeToken,
  });
  requireBooleanProof(
    first,
    "requestObserved",
    "V4_RUNTIME_E2E_CREATE_FAILED",
    "first create did not prove the server request occurred"
  );
  requireBooleanProof(
    first,
    "serverCreated",
    "V4_RUNTIME_E2E_CREATE_FAILED",
    "first create did not prove the server mutation succeeded"
  );
  const treeId = assertPersistedServerId(first?.treeId, "first create treeId");
  const firstMemoryId = assertPersistedServerId(
    first?.firstMemoryId,
    "first create memoryId"
  );
  journal.setTreeId(treeId);
  journal.addMemoryId(firstMemoryId, "first");
  proof.firstCreateServerIds = true;
  journal.recordStep("5_FIRST_TREE_FIRST_MOMENT_CREATE", { treeId, firstMemoryId });

  const second = await pageDriver.executeSecondMomentCreate({
    treeId,
    parentId: firstMemoryId,
    secondMoment: journeyPayload.secondMoment,
    idToken: activeToken,
  });
  requireBooleanProof(
    second,
    "requestObserved",
    "V4_RUNTIME_E2E_CREATE_FAILED",
    "second create did not prove the server request occurred"
  );
  requireBooleanProof(
    second,
    "serverCreated",
    "V4_RUNTIME_E2E_CREATE_FAILED",
    "second create did not prove the server mutation succeeded"
  );
  requireBooleanProof(
    second,
    "serverReread",
    "V4_RUNTIME_E2E_PERSISTENCE_UNVERIFIED",
    "second create did not prove a server reread"
  );
  const secondMemoryId = assertPersistedServerId(
    second?.secondMemoryId,
    "second create memoryId"
  );
  if (second?.parentId !== firstMemoryId) {
    throw runnerError(
      "V4_RUNTIME_E2E_PARENT_MISMATCH",
      "second Moment parentId did not persist as the first Memory ID"
    );
  }
  if (second?.connectionReason !== journeyPayload.secondMoment.connectionReason) {
    throw runnerError(
      "V4_RUNTIME_E2E_WHY_NEXT_MISMATCH",
      "second Moment connectionReason did not persist exactly"
    );
  }
  journal.addMemoryId(secondMemoryId, "second");
  proof.secondCreateServerId = true;
  proof.whyNextPersisted = true;
  journal.recordStep("6_SECOND_MOMENT_WHY_NEXT_CREATE", {
    secondMemoryId,
    parentId: firstMemoryId,
    connectionReason: second.connectionReason,
  });

  await pageDriver.goto(
    `${authority.targetOrigin}/trees/${encodeURIComponent(treeId)}?highlight=${encodeURIComponent(secondMemoryId)}`,
    viewport
  );
  journal.recordStep("7_NAVIGATE_TREE_WORKSPACE_HIGHLIGHT");

  const highlighted = await pageDriver.verifyWorkspaceHighlight({
    treeId,
    highlightMomentId: secondMemoryId,
    idToken: activeToken,
  });
  requireBooleanProof(
    highlighted,
    "highlightVerified",
    "V4_RUNTIME_E2E_HIGHLIGHT_UNVERIFIED",
    "Workspace did not prove the exact second Moment highlight"
  );
  requireBooleanProof(
    highlighted,
    "serverReread",
    "V4_RUNTIME_E2E_PERSISTENCE_UNVERIFIED",
    "Workspace highlight did not include a server reread"
  );
  proof.workspaceHighlight = true;
  proof.preReloadReread = true;
  journal.recordStep("8_WORKSPACE_REREAD_VERIFY");

  const reloaded = await pageDriver.reload(viewport);
  requireBooleanProof(
    reloaded,
    "hardReload",
    "V4_RUNTIME_E2E_RELOAD_UNVERIFIED",
    "hard reload was not executed"
  );
  const afterReload = await pageDriver.verifyTreeState({
    treeId,
    expectedMemoryIds: [firstMemoryId, secondMemoryId],
    idToken: activeToken,
  });
  requireBooleanProof(
    afterReload,
    "serverReread",
    "V4_RUNTIME_E2E_PERSISTENCE_UNVERIFIED",
    "post-reload tree state was not reread from the server"
  );
  proof.hardReloadReread = true;
  journal.recordStep("9_HARD_RELOAD_STATE_RECONSTRUCT");

  const signedOut = await pageDriver.signOut();
  requireBooleanProof(
    signedOut,
    "signedOut",
    "V4_RUNTIME_E2E_SIGNOUT_FAILED",
    "logout did not clear the authenticated browser context"
  );
  proof.signedOut = true;
  activeToken = null;
  journal.recordStep("10_SIGN_OUT");

  const relogin = requireAuthResult(
    await pageDriver.signIn(validatedCreds),
    "relogin"
  );
  if (relogin.localId !== activeUid) {
    throw runnerError(
      "V4_RUNTIME_E2E_RELOGIN_IDENTITY_MISMATCH",
      "relogin returned a different Firebase user identity"
    );
  }
  activeToken = relogin.idToken;
  proof.reloginAuthenticated = true;
  journal.recordStep("11_SIGN_IN_AGAIN");

  await pageDriver.goto(
    `${authority.targetOrigin}/trees/${encodeURIComponent(treeId)}`,
    viewport
  );
  const restored = await pageDriver.verifyTreeState({
    treeId,
    expectedMemoryIds: [firstMemoryId, secondMemoryId],
    idToken: activeToken,
  });
  requireBooleanProof(
    restored,
    "serverReread",
    "V4_RUNTIME_E2E_RESTORE_FAILED",
    "canonical data was not reread after relogin"
  );
  proof.restoredCanonicalData = true;
  journal.recordStep("12_CANONICAL_RESTORED_VERIFY");

  const edit = await pageDriver.executeMomentEdit({
    memoryId: firstMemoryId,
    updates: journeyPayload.editMoment,
    idToken: activeToken,
  });
  for (const key of ["saveSubmitted", "serverPutSucceeded", "hardReload", "reloadReread"]) {
    requireBooleanProof(
      edit,
      key,
      "V4_RUNTIME_E2E_EDIT_UNVERIFIED",
      `Moment edit proof '${key}' is missing`
    );
  }
  if (edit.editedTitle !== journeyPayload.editMoment.title) {
    throw runnerError(
      "V4_RUNTIME_E2E_EDIT_UNVERIFIED",
      "edited title was not observed after hard reload and server reread"
    );
  }
  proof.editSavePutReread = true;
  journal.recordStep("13_EDIT_MOMENT_VERIFY");

  const third = await pageDriver.executeThirdMomentCreate({
    treeId,
    parentId: secondMemoryId,
    thirdMoment: journeyPayload.thirdMoment,
    idToken: activeToken,
  });
  for (const key of ["requestObserved", "serverCreated", "serverReread"]) {
    requireBooleanProof(
      third,
      key,
      "V4_RUNTIME_E2E_THIRD_CREATE_UNVERIFIED",
      `third Moment proof '${key}' is missing`
    );
  }
  const thirdMemoryId = assertPersistedServerId(
    third?.thirdMemoryId,
    "third create memoryId"
  );
  if (third?.parentId !== secondMemoryId) {
    throw runnerError(
      "V4_RUNTIME_E2E_PARENT_MISMATCH",
      "third Moment parentId did not persist as the second Memory ID"
    );
  }
  journal.addMemoryId(thirdMemoryId, "third");
  proof.thirdCreateMutationReread = true;
  journal.recordStep("14_THIRD_MOMENT_ADD_VERIFY", { thirdMemoryId });

  const beforeCleanup = journal.getSnapshot();
  if (
    beforeCleanup.memoryIds.length !== 3 ||
    !beforeCleanup.firstMemoryId ||
    !beforeCleanup.secondMemoryId ||
    !beforeCleanup.thirdMemoryId
  ) {
    throw runnerError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
      "cleanup requires the three real server-returned Memory IDs"
    );
  }

  await deleteCreatedMemories({
    authority,
    ids: beforeCleanup.memoryIds,
    idToken: activeToken,
    fetchImpl,
  });
  journal.recordStep("15_EXACT_MEMORIES_CLEANUP", {
    memoryIds: [...beforeCleanup.memoryIds],
  });

  const treeDelete = await fetchImpl(
    `${authority.targetOrigin}/api/trees/${encodeURIComponent(treeId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
      redirect: "error",
    }
  );
  if (!treeDelete.ok && treeDelete.status !== 404) {
    throw runnerError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
      `Tree '${treeId}' delete returned HTTP ${treeDelete.status}`
    );
  }
  journal.recordStep("16_EXACT_TREE_CLEANUP", { treeId });

  await verifyCreatedMemories404({
    authority,
    ids: beforeCleanup.memoryIds,
    idToken: activeToken,
    fetchImpl,
  });
  const treeVerify = await fetchImpl(
    `${authority.targetOrigin}/api/trees/${encodeURIComponent(treeId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
      redirect: "error",
    }
  );
  if (treeVerify.status !== 404) {
    throw runnerError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED",
      `Tree cleanup verification expected HTTP 404, got ${treeVerify.status}`
    );
  }
  proof.allCreatedMemories404 = true;
  proof.tree404 = true;
  journal.recordStep("17_GET_404_VERIFY");

  const deletionToken = activeToken;
  await deleteAccountImpl({
    apiKey: validatedCreds.apiKey,
    idToken: deletionToken,
    fetchImpl,
  });
  proof.accountDeleted = true;
  journal.recordStep("18_DISPOSABLE_ACCOUNT_DELETE");

  const deleted = await verifyUserDeletedImpl({
    apiKey: validatedCreds.apiKey,
    email: validatedCreds.user.email,
    password: validatedCreds.user.password,
    idToken: deletionToken,
    fetchImpl,
  });
  if (deleted !== true && deleted?.deleted !== true && deleted?.verified !== true) {
    throw runnerError(
      "V4_RUNTIME_E2E_ACCOUNT_DELETE_UNVERIFIED",
      "Firebase disposable account deletion was not independently verified"
    );
  }
  proof.accountDeletionVerified = true;
  activeToken = null;
  journal.recordStep("19_ACCOUNT_DELETE_INDEPENDENT_VERIFY");

  const tombstone = buildCleanupTombstone({
    authority,
    memoryId: thirdMemoryId,
    treeId,
    firebaseUid: activeUid,
    verifiedAt: new Date().toISOString(),
  });
  assertCleanupTombstoneSecretFree(tombstone, [
    validatedCreds.apiKey,
    validatedCreds.user.password,
  ]);

  const cleanupResult = {
    ok: true,
    allMemoryIdsVerified404: true,
    treeVerified404: true,
    accountDeletionVerified: true,
  };
  const journalBeforeFinal = journal.getSnapshot();
  const tombstoneWrite = await writeTombstoneImpl({
    tombstone,
    journalSnapshot: journalBeforeFinal,
    cleanupResult,
    viewport,
  });
  if (tombstoneWrite !== true && tombstoneWrite?.written !== true) {
    throw runnerError(
      "V4_RUNTIME_E2E_EVIDENCE_INCOMPLETE",
      "secret-free tombstone was not durably written"
    );
  }
  proof.tombstoneWritten = true;

  const retired = await retireCredentialsImpl({
    email: validatedCreds.user.email,
    uid: activeUid,
  });
  if (retired !== true && retired?.retired !== true) {
    throw runnerError(
      "V4_RUNTIME_E2E_EVIDENCE_INCOMPLETE",
      "disposable credential retirement was not verified"
    );
  }
  proof.credentialsRetired = true;
  journal.recordStep("20_TOMBSTONE_CREDENTIAL_RETIRE");

  const journalSnapshot = journal.getSnapshot();
  const evidenceReport = buildSecretFreeEvidenceReport({
    viewport,
    authority,
    journalSnapshot,
    cleanupResult,
    proof,
    durationMs: Date.now() - startedAt,
  });
  if (!evidenceReport.allStepsCompleted) {
    throw runnerError(
      "V4_RUNTIME_E2E_EVIDENCE_INCOMPLETE",
      "canonical evidence is incomplete; PASS is forbidden"
    );
  }

  return {
    ok: true,
    journal: journalSnapshot,
    proof: { ...proof },
    cleanupResult,
    tombstone,
    evidenceReport,
  };
}
