#!/usr/bin/env node

import { readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  removeCredentialsFile,
  runDisposableCleanup,
  safeErrorCode,
  signInWithPassword,
  verifyUserDeleted,
} from "./lib/firebase-disposable-auth.mjs";
import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import {
  assertCleanupTombstoneSecretFree,
  buildCleanupTombstone,
  cleanupExactRuntimeE2EResources,
  createRuntimeE2EAuthority,
  runRuntimeE2ECleanupWorkflow,
} from "./lib/v4-runtime-e2e-operator.mjs";

const RESOURCE_CLEANUP_TOMBSTONE_VERSION = 1;
export const RESOURCES_DELETED_VERIFIED = "RESOURCES_DELETED_VERIFIED";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function requiredArg(args, key) {
  const value = typeof args[key] === "string" ? args[key].trim() : "";
  if (!value) throw new Error(`missing required argument --${key}`);
  return value;
}

function requiredString(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    const error = new Error(`${label} is required`);
    error.code = "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID";
    throw error;
  }
  return normalized;
}

function cleanupErrorCode(error) {
  if (
    typeof error?.code === "string" &&
    error.code.startsWith("V4_RUNTIME_E2E_")
  ) {
    return error.code;
  }
  return safeErrorCode(error, "CLEANUP_FAILED");
}

function cleanupError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function cleanupTombstonePath(credsPath) {
  return `${credsPath}.cleanup-state.json`;
}

export function cleanupResourceTombstonePath(credsPath) {
  return `${credsPath}.cleanup-resources.json`;
}

export function buildResourceCleanupTombstone({
  authority,
  memoryId,
  treeId,
  verifiedAt,
}) {
  const tombstone = {
    version: RESOURCE_CLEANUP_TOMBSTONE_VERSION,
    phase: RESOURCES_DELETED_VERIFIED,
    resourcesDeletionVerified: true,
    verifiedAt: requiredString(verifiedAt, "verifiedAt"),
    targetOrigin: requiredString(authority?.targetOrigin, "targetOrigin"),
    worker: requiredString(authority?.worker, "worker"),
    firebaseProjectId: requiredString(authority?.firebaseProjectId, "firebaseProjectId"),
    neonBranchId: requiredString(authority?.neonBranchId, "neonBranchId"),
    databaseHost: requiredString(authority?.databaseHost, "databaseHost"),
    memoryId: requiredString(memoryId, "memoryId"),
    treeId: requiredString(treeId, "treeId"),
  };
  assertCleanupTombstoneSecretFree(tombstone);
  return tombstone;
}

export function validateResourceCleanupTombstone({
  tombstone,
  authority,
  memoryId,
  treeId,
}) {
  assertCleanupTombstoneSecretFree(tombstone);
  const expectedMemoryId = requiredString(memoryId, "memoryId");
  const expectedTreeId = requiredString(treeId, "treeId");
  const problems = [];
  if (tombstone.version !== RESOURCE_CLEANUP_TOMBSTONE_VERSION) {
    problems.push("version mismatch");
  }
  if (tombstone.phase !== RESOURCES_DELETED_VERIFIED) {
    problems.push("phase mismatch");
  }
  if (tombstone.resourcesDeletionVerified !== true) {
    problems.push("resource deletion is not verified");
  }
  if (typeof tombstone.verifiedAt !== "string" || !tombstone.verifiedAt) {
    problems.push("verifiedAt missing");
  }
  if (tombstone.targetOrigin !== authority.targetOrigin) problems.push("target origin mismatch");
  if (tombstone.worker !== authority.worker) problems.push("worker mismatch");
  if (tombstone.firebaseProjectId !== authority.firebaseProjectId) {
    problems.push("Firebase project mismatch");
  }
  if (tombstone.neonBranchId !== authority.neonBranchId) problems.push("Neon branch mismatch");
  if (tombstone.databaseHost !== authority.databaseHost) problems.push("database host mismatch");
  if (tombstone.memoryId !== expectedMemoryId) problems.push("Memory ID mismatch");
  if (tombstone.treeId !== expectedTreeId) problems.push("Tree ID mismatch");
  if (problems.length > 0) {
    const error = cleanupError(
      "V4_RUNTIME_E2E_TOMBSTONE_MISMATCH",
      "resource cleanup tombstone does not match the requested exact cleanup authority"
    );
    error.details = problems;
    throw error;
  }
  return tombstone;
}

function validateRecoveryCredentials(creds) {
  const users = Array.isArray(creds?.users) ? creds.users : [];
  if (users.length !== 1) {
    throw cleanupError(
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
    throw cleanupError(
      "V4_RUNTIME_E2E_CREDENTIALS_INVALID",
      "disposable Firebase credentials are incomplete"
    );
  }
  return { apiKey: creds.apiKey, user };
}

function firebaseCleanupVerified(firebaseCleanup) {
  return (
    firebaseCleanup?.ok === true &&
    firebaseCleanup?.allDeleted === true &&
    Array.isArray(firebaseCleanup?.results) &&
    firebaseCleanup.results.length === 1 &&
    firebaseCleanup.results.every((entry) => entry?.deleted === true)
  );
}

function deletionVerdictVerified(verdict) {
  return verdict?.deleted === true && verdict?.reasonCode === "VERIFIED";
}

async function readJsonState(path, readImpl, label) {
  let source;
  try {
    source = await readImpl(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { state: null, error: null };
    throw error;
  }
  try {
    return { state: JSON.parse(source), error: null };
  } catch {
    return {
      state: null,
      error: cleanupError(
        "V4_RUNTIME_E2E_TOMBSTONE_INVALID",
        `${label} is malformed JSON`
      ),
    };
  }
}

export async function runCleanupCli({
  argv = process.argv.slice(2),
  env = process.env,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
  rmImpl = rm,
  // The resource-deleted durability journal has a separate I/O seam so older
  // wrapper tests that mock only the ACCOUNT_DELETED_VERIFIED file remain
  // isolated. Production defaults still use the same local filesystem.
  resourceReadFileImpl = readFile,
  resourceWriteFileImpl = writeFile,
  resourceRmImpl = rm,
  signInImpl = signInWithPassword,
  disposableCleanupImpl = runDisposableCleanup,
  verifyDeletedUserImpl = verifyUserDeleted,
  verifyHealthImpl,
  cleanupResourcesImpl,
  now,
  log = (line) => console.log(line),
}) {
  const args = parseArgs(argv);
  const baseUrl = requiredArg(args, "base-url");
  const expectedOrigin =
    typeof env.E2E_EXPECTED_ORIGIN === "string" ? env.E2E_EXPECTED_ORIGIN.trim() : "";
  if (!expectedOrigin) {
    const error = new Error("E2E_EXPECTED_ORIGIN is required");
    error.code = "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID";
    throw error;
  }
  const credsPath = requiredArg(args, "creds");
  const treeId = requiredArg(args, "tree-id");
  const memoryId = requiredArg(args, "memory-id");
  const statePath = cleanupTombstonePath(credsPath);
  const resourceStatePath = cleanupResourceTombstonePath(credsPath);
  const identity = preflightFromEnv(env);
  const nowImpl = now ?? (() => new Date().toISOString());
  const authority = createRuntimeE2EAuthority({
    baseUrl,
    expectedOrigin,
    expectedWorker: identity.worker,
    expectedFirebaseProjectId: identity.firebaseProjectId,
    expectedNeonBranchId: identity.neonBranchId,
    expectedDatabaseHost: identity.databaseHost,
    expectedAppEnv: identity.appEnv,
  });

  const accountStateRead = await readJsonState(
    statePath,
    readFileImpl,
    "Runtime E2E cleanup tombstone"
  );
  const resourceStateRead = await readJsonState(
    resourceStatePath,
    resourceReadFileImpl,
    "Runtime E2E resource cleanup tombstone"
  );

  // A valid account-deleted marker remains the strongest state and is handled
  // by the existing operator workflow. A malformed account marker may be
  // ignored only when a separately validated resource marker exists; that path
  // still requires independent Firebase deletion proof before credential
  // retirement and therefore does not manufacture deletion state.
  if (accountStateRead.error && !resourceStateRead.state) throw accountStateRead.error;
  if (resourceStateRead.error && !accountStateRead.state) throw resourceStateRead.error;

  const loadCredentials = async () => {
    try {
      return JSON.parse(await readFileImpl(credsPath, "utf8"));
    } catch (error) {
      if (error?.code?.startsWith?.("V4_RUNTIME_E2E_")) throw error;
      const wrapped = new Error("unable to read disposable Firebase credentials file");
      wrapped.code = "V4_RUNTIME_E2E_CREDENTIALS_INVALID";
      throw wrapped;
    }
  };

  const independentlyVerifyAccountGone = async ({ apiKey, user, idToken }) => {
    try {
      const verdict = await verifyDeletedUserImpl({
        apiKey,
        email: user.email,
        password: user.password,
        idToken,
      });
      return deletionVerdictVerified(verdict);
    } catch {
      return false;
    }
  };

  const deleteAndVerifyAccount = async ({ apiKey, user, idToken }) => {
    let firebaseCleanup = null;
    try {
      firebaseCleanup = await disposableCleanupImpl({
        users: [{ ...user, idToken }],
        apiKey,
        // Credential retirement is deliberately owned by the wrapper after a
        // durable ACCOUNT_DELETED_VERIFIED tombstone is written.
        credsFile: null,
        log,
      });
    } catch {
      // A transport reset/timeout after accounts:delete is ambiguous. Never
      // infer success from the thrown error; run the independent deletion
      // verifier below using the retained exact credential identity.
    }

    if (firebaseCleanupVerified(firebaseCleanup)) {
      return { verified: true, firebaseUid: user?.uid ?? null };
    }

    const independentlyVerified = await independentlyVerifyAccountGone({
      apiKey,
      user,
      idToken,
    });
    return {
      verified: independentlyVerified,
      firebaseUid: user?.uid ?? null,
    };
  };

  const writeAccountTombstone = async (tombstone) => {
    assertCleanupTombstoneSecretFree(tombstone);
    try {
      await writeFileImpl(statePath, JSON.stringify(tombstone, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (error) {
      // The separately persisted RESOURCES_DELETED_VERIFIED marker must remain
      // authoritative if this stronger phase write fails. Remove any partial
      // account marker so a retry can deterministically recover from resource
      // state instead of being stranded behind malformed JSON.
      try {
        await rmImpl(statePath, { force: true });
      } catch {
        // Preserve the original persistence failure as the CLI result.
      }
      throw error;
    }
  };

  const writeResourceTombstone = async (tombstone) => {
    assertCleanupTombstoneSecretFree(tombstone);
    try {
      await resourceWriteFileImpl(resourceStatePath, JSON.stringify(tombstone, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (error) {
      // This write happens before Firebase deletion. If it cannot be made
      // durable, remove partial state and stop before touching the account.
      try {
        await resourceRmImpl(resourceStatePath, { force: true });
      } catch {
        // Preserve the original persistence failure as the CLI result.
      }
      throw error;
    }
  };

  const retireAllTombstones = async () => {
    await resourceRmImpl(resourceStatePath, { force: true });
    await rmImpl(statePath, { force: true });
  };

  const logSuccess = (result) => {
    log(
      JSON.stringify({
        ok: true,
        treeId: result.treeId,
        memoryId: result.memoryId,
        exactIdsVerifiedGone: true,
        firebaseUsersVerifiedDeleted: result.accountDeletionVerified,
        credentialsFileRemoved: result.credentialsRetired,
        cleanupPhase: result.cleanupPhase,
        resumedFrom: result.resumedFrom,
        tombstoneRetired: result.tombstoneRetired,
      })
    );
  };

  if (!accountStateRead.state && resourceStateRead.state) {
    validateResourceCleanupTombstone({
      tombstone: resourceStateRead.state,
      authority,
      memoryId,
      treeId,
    });

    const creds = await loadCredentials();
    const { apiKey, user } = validateRecoveryCredentials(creds);
    let accountDeletionVerified = false;
    let firebaseUid = user?.uid ?? null;
    let refreshed = null;
    let signInError = null;

    try {
      refreshed = await signInImpl({
        apiKey,
        email: user.email,
        password: user.password,
      });
    } catch (error) {
      signInError = error;
    }

    if (refreshed) {
      const freshToken = requiredString(refreshed?.idToken, "refreshed Firebase idToken");
      const accountCleanup = await deleteAndVerifyAccount({
        apiKey,
        user,
        idToken: freshToken,
      });
      if (accountCleanup?.verified !== true) {
        throw cleanupError(
          "V4_RUNTIME_E2E_ACCOUNT_DELETE_UNVERIFIED",
          "disposable Firebase account deletion was not independently verified"
        );
      }
      accountDeletionVerified = true;
      firebaseUid = accountCleanup.firebaseUid ?? refreshed?.localId ?? user?.uid ?? null;
    } else {
      const alreadyGone = await independentlyVerifyAccountGone({
        apiKey,
        user,
        idToken: user?.idToken ?? null,
      });
      if (!alreadyGone) {
        // The sign-in/auth error remains authoritative unless an independent
        // deletion verifier proves the exact disposable account is gone.
        throw signInError;
      }
      accountDeletionVerified = true;
    }

    if (!accountDeletionVerified) {
      throw cleanupError(
        "V4_RUNTIME_E2E_ACCOUNT_DELETE_UNVERIFIED",
        "disposable Firebase account deletion was not independently verified"
      );
    }

    const accountTombstone = buildCleanupTombstone({
      authority,
      memoryId,
      treeId,
      firebaseUid,
      verifiedAt: nowImpl(),
    });
    assertCleanupTombstoneSecretFree(accountTombstone, [
      apiKey,
      user.email,
      user.password,
      user?.idToken,
      refreshed?.idToken,
      refreshed?.refreshToken,
    ]);
    await writeAccountTombstone(accountTombstone);
    await removeCredentialsFile(credsPath, rmImpl);
    await retireAllTombstones();

    const result = {
      ok: true,
      authority,
      cleanupPhase: "COMPLETE",
      resumedFrom: RESOURCES_DELETED_VERIFIED,
      memoryId,
      treeId,
      accountDeletionVerified: true,
      credentialsRetired: true,
      tombstoneRetired: true,
    };
    logSuccess(result);
    return result;
  }

  const baseCleanupResourcesImpl = cleanupResourcesImpl ?? cleanupExactRuntimeE2EResources;
  const cleanupResourcesAndPersistPhase = async (options) => {
    const resourceCleanup = await baseCleanupResourcesImpl(options);
    if (resourceCleanup?.verifiedGone !== true) return resourceCleanup;
    const resourceTombstone = buildResourceCleanupTombstone({
      authority,
      memoryId,
      treeId,
      verifiedAt: nowImpl(),
    });
    await writeResourceTombstone(resourceTombstone);
    return resourceCleanup;
  };

  const result = await runRuntimeE2ECleanupWorkflow({
    baseUrl,
    expectedOrigin,
    expectedWorker: identity.worker,
    expectedFirebaseProjectId: identity.firebaseProjectId,
    expectedNeonBranchId: identity.neonBranchId,
    expectedDatabaseHost: identity.databaseHost,
    expectedAppEnv: identity.appEnv,
    memoryId,
    treeId,
    loadTombstone: async () => accountStateRead.state,
    loadCredentials,
    signIn: signInImpl,
    deleteAndVerifyAccount,
    writeTombstone: writeAccountTombstone,
    retireCredentials: async () => {
      await removeCredentialsFile(credsPath, rmImpl);
    },
    retireTombstone: retireAllTombstones,
    verifyHealthImpl: verifyHealthImpl ?? undefined,
    cleanupResourcesImpl: cleanupResourcesAndPersistPhase,
    now: nowImpl,
  });

  logSuccess(result);
  return result;
}

export async function main() {
  try {
    await runCleanupCli({});
  } catch (error) {
    console.error(`[v4-runtime-e2e-cleanup] ${cleanupErrorCode(error)}`);
    process.exitCode = 1;
  }
}

const invokedAsScript =
  typeof process.argv[1] === "string" &&
  pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedAsScript) {
  await main();
}
