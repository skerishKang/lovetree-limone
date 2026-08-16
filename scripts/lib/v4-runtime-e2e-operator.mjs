function requiredString(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    const error = new Error(`${label} is required`);
    error.code = "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID";
    throw error;
  }
  return normalized;
}

export function normalizeRuntimeE2EBaseUrl(value) {
  const raw = requiredString(value, "V4_E2E_BASE_URL");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    const error = new Error("V4_E2E_BASE_URL must be a valid http(s) URL");
    error.code = "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID";
    throw error;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    const error = new Error("V4_E2E_BASE_URL must use http or https");
    error.code = "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID";
    throw error;
  }
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/$/, "");
}

function operatorError(code, message, details = null) {
  const error = new Error(message);
  error.code = code;
  if (details !== null) error.details = details;
  return error;
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
  expectedFirebaseProjectId,
  fetchImpl = fetch,
}) {
  const normalizedBase = normalizeRuntimeE2EBaseUrl(baseUrl);
  const firebaseProjectId = requiredString(
    expectedFirebaseProjectId,
    "E2E_FIREBASE_PROJECT_ID"
  );
  const response = await fetchImpl(`${normalizedBase}/api/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
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
  if (body?.env !== "e2e") issues.push("env must be e2e");
  if (!actual || typeof actual !== "object") {
    issues.push("e2e runtime identity is missing");
  } else {
    if (actual.firebaseProjectId !== firebaseProjectId) {
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
    baseUrl: normalizedBase,
    firebaseProjectId,
    appEnv: "e2e",
    mutationsEnabled: true,
    databaseBinding: "approved",
  };
}

async function authenticatedRequest({
  baseUrl,
  path,
  method,
  idToken,
  fetchImpl,
}) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });
  return response;
}

async function requireSuccessfulDelete(response, label) {
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
  baseUrl,
  memoryId,
  treeId,
  idToken,
  fetchImpl = fetch,
}) {
  const normalizedBase = normalizeRuntimeE2EBaseUrl(baseUrl);
  const exactMemoryId = requiredString(memoryId, "memoryId");
  const exactTreeId = requiredString(treeId, "treeId");
  const token = requiredString(idToken, "idToken");

  const encodedMemoryId = encodeURIComponent(exactMemoryId);
  const encodedTreeId = encodeURIComponent(exactTreeId);

  const deleteMemory = await authenticatedRequest({
    baseUrl: normalizedBase,
    path: `/api/memories/${encodedMemoryId}`,
    method: "DELETE",
    idToken: token,
    fetchImpl,
  });
  await requireSuccessfulDelete(deleteMemory, "Memory");

  const deleteTree = await authenticatedRequest({
    baseUrl: normalizedBase,
    path: `/api/trees/${encodedTreeId}`,
    method: "DELETE",
    idToken: token,
    fetchImpl,
  });
  await requireSuccessfulDelete(deleteTree, "Tree");

  const verifyMemory = await authenticatedRequest({
    baseUrl: normalizedBase,
    path: `/api/memories/${encodedMemoryId}`,
    method: "GET",
    idToken: token,
    fetchImpl,
  });
  await requireGone(verifyMemory, "Memory");

  const verifyTree = await authenticatedRequest({
    baseUrl: normalizedBase,
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
    verifiedGone: true,
  };
}
