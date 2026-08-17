import {
  ISOLATED_PREVIEW_WORKER_PATTERN,
  PROTECTED_WORKER_NAMES,
} from "./isolated-preview-deploy-guard.mjs";

const CLEANUP_TOMBSTONE_VERSION = 1;
const ACCOUNT_DELETED_VERIFIED = "ACCOUNT_DELETED_VERIFIED";
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const FORBIDDEN_TOMBSTONE_KEY = /(password|idtoken|refreshtoken|apikey|oauth|secret|token)/i;

function requiredString(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    const error = new Error(`${label} is required`);
    error.code = "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID";
    throw error;
  }
  return normalized;
}

function operatorError(code, message, details = null) {
  const error = new Error(message);
  error.code = code;
  if (details !== null) error.details = details;
  return error;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateExpectedWorker(value) {
  const worker = requiredString(value, "E2E_EXPECTED_WORKER");
  if (PROTECTED_WORKER_NAMES.includes(worker)) {
    throw operatorError(
      "V4_RUNTIME_E2E_PROTECTED_WORKER_BLOCKED",
      `protected Worker '${worker}' is forbidden for Runtime E2E`
    );
  }
  if (!ISOLATED_PREVIEW_WORKER_PATTERN.test(worker)) {
    throw operatorError(
      "V4_RUNTIME_E2E_WORKER_IDENTITY_INVALID",
      "E2E_EXPECTED_WORKER must match the isolated preview Worker naming contract"
    );
  }
  return worker;
}

function isLoopbackHostname(hostname) {
  return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

export function normalizeRuntimeE2EBaseUrl(
  value,
  { expectedWorker, allowLocalhostHttp = false } = {}
) {
  const raw = requiredString(value, "V4_E2E_BASE_URL");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw operatorError(
      "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID",
      "V4_E2E_BASE_URL must be a valid http(s) URL"
    );
  }

  if (parsed.username || parsed.password) {
    throw operatorError(
      "V4_RUNTIME_E2E_TARGET_ORIGIN_UNTRUSTED",
      "V4_E2E_BASE_URL must not contain URL credentials"
    );
  }
  if (parsed.search || parsed.hash) {
    throw operatorError(
      "V4_RUNTIME_E2E_TARGET_ORIGIN_UNTRUSTED",
      "V4_E2E_BASE_URL must be an origin without query or fragment"
    );
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw operatorError(
      "V4_RUNTIME_E2E_TARGET_ORIGIN_UNTRUSTED",
      "V4_E2E_BASE_URL must identify the Worker origin root"
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const loopback = isLoopbackHostname(hostname);
  if (loopback) {
    if (!allowLocalhostHttp) {
      throw operatorError(
        "V4_RUNTIME_E2E_LOCALHOST_NOT_ALLOWED",
        "localhost Runtime E2E targets require an explicit test-only exception"
      );
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw operatorError(
        "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID",
        "localhost Runtime E2E targets must use http or https"
      );
    }
    return parsed.origin;
  }

  if (parsed.protocol !== "https:") {
    throw operatorError(
      "V4_RUNTIME_E2E_REMOTE_HTTPS_REQUIRED",
      "remote Runtime E2E targets must use HTTPS"
    );
  }
  if (parsed.port) {
    throw operatorError(
      "V4_RUNTIME_E2E_TARGET_ORIGIN_UNTRUSTED",
      "remote Runtime E2E targets must use the canonical HTTPS port"
    );
  }

  const worker = validateExpectedWorker(expectedWorker);
  const workerLabel = hostname.split(".")[0] ?? "";
  if (PROTECTED_WORKER_NAMES.includes(workerLabel)) {
    throw operatorError(
      "V4_RUNTIME_E2E_PROTECTED_WORKER_HOST_BLOCKED",
      `protected Worker host '${hostname}' is forbidden for Runtime E2E`
    );
  }

  const approvedHostPattern = new RegExp(
    `^${escapeRegExp(worker)}\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.workers\\.dev$`
  );
  if (!approvedHostPattern.test(hostname)) {
    throw operatorError(
      "V4_RUNTIME_E2E_TARGET_ORIGIN_MISMATCH",
      "V4_E2E_BASE_URL origin is not bound to the preflight-approved Worker identity"
    );
  }

  return parsed.origin;
}

export function createRuntimeE2EAuthority({
  baseUrl,
  expectedWorker,
  expectedFirebaseProjectId,
  expectedNeonBranchId,
  expectedDatabaseHost,
  expectedAppEnv = "e2e",
  allowLocalhostHttp = false,
}) {
  const worker = validateExpectedWorker(expectedWorker);
  const firebaseProjectId = requiredString(
    expectedFirebaseProjectId,
    "E2E_FIREBASE_PROJECT_ID"
  );
  const neonBranchId = requiredString(expectedNeonBranchId, "E2E_NEON_BRANCH_ID");
  const databaseHost = requiredString(expectedDatabaseHost, "DATABASE_URL hostname");
  const appEnv = requiredString(expectedAppEnv, "APP_ENV");
  if (appEnv !== "e2e") {
    throw operatorError(
      "V4_RUNTIME_E2E_AUTHORITY_INVALID",
      "Runtime E2E authority requires APP_ENV=e2e"
    );
  }
  const targetOrigin = normalizeRuntimeE2EBaseUrl(baseUrl, {
    expectedWorker: worker,
    allowLocalhostHttp,
  });
  return Object.freeze({
    targetOrigin,
    worker,
    firebaseProjectId,
    neonBranchId,
    databaseHost,
    appEnv,
    localhostException: isLoopbackHostname(new URL(targetOrigin).hostname),
  });
}

function normalizeAuthority(authority) {
  if (!authority || typeof authority !== "object") {
    throw operatorError(
      "V4_RUNTIME_E2E_AUTHORITY_INVALID",
      "preflight-approved Runtime E2E authority is required"
    );
  }
  return createRuntimeE2EAuthority({
    baseUrl: authority.targetOrigin,
    expectedWorker: authority.worker,
    expectedFirebaseProjectId: authority.firebaseProjectId,
    expectedNeonBranchId: authority.neonBranchId,
    expectedDatabaseHost: authority.databaseHost,
    expectedAppEnv: authority.appEnv,
    allowLocalhostHttp: authority.localhostException === true,
  });
}

async function parseJsonResponse(response, label) {
  try {
    return await response.json();
  } catch {
    throw operatorError(
      "V4_RUNTIME_E2E_RESPONSE_INVALID",
      `${label} returned non-JSON response`
    );
  }
}

export async function verifyRuntimeE2EHealth({
  baseUrl,
  expectedWorker,
  expectedFirebaseProjectId,
  expectedNeonBranchId,
  expectedDatabaseHost,
  expectedAppEnv = "e2e",
  allowLocalhostHttp = false,
  fetchImpl = fetch,
}) {
  const authority = createRuntimeE2EAuthority({
    baseUrl,
    expectedWorker,
    expectedFirebaseProjectId,
    expectedNeonBranchId,
    expectedDatabaseHost,
    expectedAppEnv,
    allowLocalhostHttp,
  });
  const response = await fetchImpl(`${authority.targetOrigin}/api/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "error",
  });
  if (!response.ok) {
    throw operatorError(
      "V4_RUNTIME_E2E_HEALTH_HTTP_FAILED",
      `isolated Runtime E2E /api/health returned HTTP ${response.status}`
    );
  }
  const body = await parseJsonResponse(response, "/api/health");
  const actual = body?.e2e;
  const issues = [];
  if (body?.status !== "ok") issues.push("status must be ok");
  if (body?.env !== authority.appEnv) issues.push("env must be e2e");
  if (!actual || typeof actual !== "object") {
    issues.push("e2e runtime identity is missing");
  } else {
    if (actual.firebaseProjectId !== authority.firebaseProjectId) {
      issues.push("Firebase project identity mismatch");
    }
    if (actual.mutationsEnabled !== true) {
      issues.push("mutationsEnabled must be true");
    }
    if (actual.databaseBinding !== "approved") {
      issues.push("databaseBinding must be approved");
    }
  }
  if (issues.length > 0) {
    throw operatorError(
      "V4_RUNTIME_E2E_HEALTH_IDENTITY_FAILED",
      "isolated Runtime E2E health identity failed closed",
      issues
    );
  }
  return {
    ok: true,
    authority,
    baseUrl: authority.targetOrigin,
    worker: authority.worker,
    firebaseProjectId: authority.firebaseProjectId,
    appEnv: authority.appEnv,
    mutationsEnabled: true,
    healthDatabaseBinding: "approved",
    preflightNeonBranchId: authority.neonBranchId,
    preflightDatabaseHost: authority.databaseHost,
    workerIdentitySource: "preflight-approved-origin-binding",
  };
}

async function authenticatedRequest({ authority, path, method, idToken, fetchImpl }) {
  return fetchImpl(`${authority.targetOrigin}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    redirect: "error",
  });
}

async function requireDeletedOrAlreadyGone(response, label) {
  if (response.status === 404) return "already-gone";
  if (!response.ok) {
    throw operatorError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
      `${label} delete returned HTTP ${response.status}`
    );
  }
  const body = await parseJsonResponse(response, `${label} delete`);
  if (body?.success !== true) {
    throw operatorError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
      `${label} delete did not return success=true`
    );
  }
  return "deleted";
}

async function requireGone(response, label) {
  if (response.status !== 404) {
    throw operatorError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED",
      `${label} cleanup verification expected HTTP 404, got ${response.status}`
    );
  }
}

export async function cleanupExactRuntimeE2EResources({
  authority,
  memoryId,
  treeId,
  idToken,
  fetchImpl = fetch,
}) {
  // Normalize and re-validate the origin authority before the bearer is read or
  // any credential-bearing request can be constructed.
  const trustedAuthority = normalizeAuthority(authority);
  const exactMemoryId = requiredString(memoryId, "memoryId");
  const exactTreeId = requiredString(treeId, "treeId");
  const token = requiredString(idToken, "idToken");

  const encodedMemoryId = encodeURIComponent(exactMemoryId);
  const encodedTreeId = encodeURIComponent(exactTreeId);

  const deleteMemory = await authenticatedRequest({
    authority: trustedAuthority,
    path: `/api/memories/${encodedMemoryId}`,
    method: "DELETE",
    idToken: token,
    fetchImpl,
  });
  const memoryDeleteDisposition = await requireDeletedOrAlreadyGone(
    deleteMemory,
    "Memory"
  );

  const deleteTree = await authenticatedRequest({
    authority: trustedAuthority,
    path: `/api/trees/${encodedTreeId}`,
    method: "DELETE",
    idToken: token,
    fetchImpl,
  });
  const treeDeleteDisposition = await requireDeletedOrAlreadyGone(deleteTree, "Tree");

  const verifyMemory = await authenticatedRequest({
    authority: trustedAuthority,
    path: `/api/memories/${encodedMemoryId}`,
    method: "GET",
    idToken: token,
    fetchImpl,
  });
  await requireGone(verifyMemory, "Memory");

  const verifyTree = await authenticatedRequest({
    authority: trustedAuthority,
    path: `/api/trees/${encodedTreeId}`,
    method: "GET",
    idToken: token,
    fetchImpl,
  });
  await requireGone(verifyTree, "Tree");

  return {
    ok: true,
    memoryId: exactMemoryId,
    treeId: exactTreeId,
    memoryDeleted: true,
    treeDeleted: true,
    memoryDeleteDisposition,
    treeDeleteDisposition,
    verifiedGone: true,
  };
}

function walkTombstoneKeys(value, visit) {
  if (Array.isArray(value)) {
    for (const entry of value) walkTombstoneKeys(entry, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    visit(key, entry);
    walkTombstoneKeys(entry, visit);
  }
}

export function assertCleanupTombstoneSecretFree(tombstone, secrets = []) {
  if (!tombstone || typeof tombstone !== "object" || Array.isArray(tombstone)) {
    throw operatorError(
      "V4_RUNTIME_E2E_TOMBSTONE_INVALID",
      "cleanup tombstone must be a plain object"
    );
  }
  walkTombstoneKeys(tombstone, (key) => {
    if (FORBIDDEN_TOMBSTONE_KEY.test(key)) {
      throw operatorError(
        "V4_RUNTIME_E2E_TOMBSTONE_SECRET_FORBIDDEN",
        `cleanup tombstone contains forbidden secret-bearing key '${key}'`
      );
    }
  });
  const serialized = JSON.stringify(tombstone);
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length > 0 && serialized.includes(secret)) {
      throw operatorError(
        "V4_RUNTIME_E2E_TOMBSTONE_SECRET_FORBIDDEN",
        "cleanup tombstone contains secret material"
      );
    }
  }
  return true;
}

export function buildCleanupTombstone({
  authority,
  memoryId,
  treeId,
  firebaseUid = null,
  verifiedAt,
}) {
  const trustedAuthority = normalizeAuthority(authority);
  const tombstone = {
    version: CLEANUP_TOMBSTONE_VERSION,
    phase: ACCOUNT_DELETED_VERIFIED,
    accountDeletionVerified: true,
    verifiedAt: requiredString(verifiedAt, "verifiedAt"),
    targetOrigin: trustedAuthority.targetOrigin,
    worker: trustedAuthority.worker,
    firebaseProjectId: trustedAuthority.firebaseProjectId,
    neonBranchId: trustedAuthority.neonBranchId,
    databaseHost: trustedAuthority.databaseHost,
    memoryId: requiredString(memoryId, "memoryId"),
    treeId: requiredString(treeId, "treeId"),
  };
  if (typeof firebaseUid === "string" && firebaseUid.trim()) {
    tombstone.firebaseUid = firebaseUid.trim();
  }
  assertCleanupTombstoneSecretFree(tombstone);
  return tombstone;
}

export function validateCleanupTombstone({ tombstone, authority, memoryId, treeId }) {
  assertCleanupTombstoneSecretFree(tombstone);
  const trustedAuthority = normalizeAuthority(authority);
  const expectedMemoryId = requiredString(memoryId, "memoryId");
  const expectedTreeId = requiredString(treeId, "treeId");
  const problems = [];
  if (tombstone.version !== CLEANUP_TOMBSTONE_VERSION) problems.push("version mismatch");
  if (tombstone.phase !== ACCOUNT_DELETED_VERIFIED) problems.push("phase mismatch");
  if (tombstone.accountDeletionVerified !== true) problems.push("account deletion is not verified");
  if (typeof tombstone.verifiedAt !== "string" || !tombstone.verifiedAt) problems.push("verifiedAt missing");
  if (tombstone.targetOrigin !== trustedAuthority.targetOrigin) problems.push("target origin mismatch");
  if (tombstone.worker !== trustedAuthority.worker) problems.push("worker mismatch");
  if (tombstone.firebaseProjectId !== trustedAuthority.firebaseProjectId) problems.push("Firebase project mismatch");
  if (tombstone.neonBranchId !== trustedAuthority.neonBranchId) problems.push("Neon branch mismatch");
  if (tombstone.databaseHost !== trustedAuthority.databaseHost) problems.push("database host mismatch");
  if (tombstone.memoryId !== expectedMemoryId) problems.push("Memory ID mismatch");
  if (tombstone.treeId !== expectedTreeId) problems.push("Tree ID mismatch");
  if (problems.length > 0) {
    throw operatorError(
      "V4_RUNTIME_E2E_TOMBSTONE_MISMATCH",
      "cleanup tombstone does not match the requested exact cleanup authority",
      problems
    );
  }
  return tombstone;
}

function validateCredentialPayload(creds) {
  const users = Array.isArray(creds?.users) ? creds.users : [];
  if (users.length !== 1) {
    throw operatorError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "Runtime E2E cleanup requires exactly one disposable Firebase user"
    );
  }
  const user = users[0];
  if (
    typeof creds?.apiKey !== "string" ||
    !creds.apiKey ||
    typeof user?.email !== "string" ||
    !user.email ||
    typeof user?.password !== "string" ||
    !user.password
  ) {
    throw operatorError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "disposable Firebase credentials are incomplete"
    );
  }
  return { apiKey: creds.apiKey, user };
}

export async function runRuntimeE2ECleanupWorkflow({
  baseUrl,
  expectedWorker,
  expectedFirebaseProjectId,
  expectedNeonBranchId,
  expectedDatabaseHost,
  expectedAppEnv = "e2e",
  memoryId,
  treeId,
  loadTombstone,
  loadCredentials,
  signIn,
  deleteAndVerifyAccount,
  writeTombstone,
  retireCredentials,
  retireTombstone,
  verifyHealthImpl = verifyRuntimeE2EHealth,
  cleanupResourcesImpl = cleanupExactRuntimeE2EResources,
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
}) {
  for (const [label, fn] of [
    ["loadTombstone", loadTombstone],
    ["loadCredentials", loadCredentials],
    ["signIn", signIn],
    ["deleteAndVerifyAccount", deleteAndVerifyAccount],
    ["writeTombstone", writeTombstone],
    ["retireCredentials", retireCredentials],
    ["retireTombstone", retireTombstone],
  ]) {
    if (typeof fn !== "function") {
      throw operatorError(
        "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID",
        `${label} callback is required`
      );
    }
  }

  const authority = createRuntimeE2EAuthority({
    baseUrl,
    expectedWorker,
    expectedFirebaseProjectId,
    expectedNeonBranchId,
    expectedDatabaseHost,
    expectedAppEnv,
  });
  const exactMemoryId = requiredString(memoryId, "memoryId");
  const exactTreeId = requiredString(treeId, "treeId");

  const existingTombstone = await loadTombstone();
  if (existingTombstone !== null && existingTombstone !== undefined) {
    validateCleanupTombstone({
      tombstone: existingTombstone,
      authority,
      memoryId: exactMemoryId,
      treeId: exactTreeId,
    });
    // Verified account deletion is durable local evidence. No login or bearer
    // request is needed on retry; only residue retirement remains.
    await retireCredentials();
    await retireTombstone();
    return {
      ok: true,
      authority,
      cleanupPhase: "COMPLETE",
      resumedFrom: ACCOUNT_DELETED_VERIFIED,
      memoryId: exactMemoryId,
      treeId: exactTreeId,
      accountDeletionVerified: true,
      credentialsRetired: true,
      tombstoneRetired: true,
    };
  }

  await verifyHealthImpl({
    baseUrl: authority.targetOrigin,
    expectedWorker: authority.worker,
    expectedFirebaseProjectId: authority.firebaseProjectId,
    expectedNeonBranchId: authority.neonBranchId,
    expectedDatabaseHost: authority.databaseHost,
    expectedAppEnv: authority.appEnv,
    fetchImpl,
  });

  const creds = await loadCredentials();
  const { apiKey, user } = validateCredentialPayload(creds);

  // Any generic/invalid sign-in failure propagates as failure. It is never
  // interpreted as proof that an account was deleted.
  const refreshed = await signIn({
    apiKey,
    email: user.email,
    password: user.password,
  });
  const freshToken = requiredString(refreshed?.idToken, "refreshed Firebase idToken");

  const resourceCleanup = await cleanupResourcesImpl({
    authority,
    memoryId: exactMemoryId,
    treeId: exactTreeId,
    idToken: freshToken,
    fetchImpl,
  });
  if (resourceCleanup?.verifiedGone !== true) {
    throw operatorError(
      "V4_RUNTIME_E2E_EXACT_CLEANUP_UNVERIFIED",
      "exact Memory/Tree cleanup did not produce verified 404 evidence"
    );
  }

  const accountCleanup = await deleteAndVerifyAccount({
    apiKey,
    user,
    idToken: freshToken,
  });
  if (accountCleanup?.verified !== true) {
    throw operatorError(
      "V4_RUNTIME_E2E_ACCOUNT_DELETE_UNVERIFIED",
      "disposable Firebase account deletion was not independently verified"
    );
  }

  const tombstone = buildCleanupTombstone({
    authority,
    memoryId: exactMemoryId,
    treeId: exactTreeId,
    firebaseUid: accountCleanup.firebaseUid ?? refreshed?.localId ?? user?.uid ?? null,
    verifiedAt: now(),
  });
  assertCleanupTombstoneSecretFree(tombstone, [
    apiKey,
    user.email,
    user.password,
    freshToken,
    refreshed?.refreshToken,
  ]);

  // This write is intentionally before secret-file retirement. If secret-file
  // removal fails, a retry can trust only this verified non-secret phase marker
  // and must not try to sign in to the already-deleted account.
  await writeTombstone(tombstone);
  await retireCredentials();
  await retireTombstone();

  return {
    ok: true,
    authority,
    cleanupPhase: "COMPLETE",
    resumedFrom: null,
    memoryId: resourceCleanup.memoryId,
    treeId: resourceCleanup.treeId,
    accountDeletionVerified: true,
    credentialsRetired: true,
    tombstoneRetired: true,
  };
}
