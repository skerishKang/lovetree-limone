#!/usr/bin/env node

import { readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  removeCredentialsFile,
  runDisposableCleanup,
  safeErrorCode,
  signInWithPassword,
} from "./lib/firebase-disposable-auth.mjs";
import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import { runRuntimeE2ECleanupWorkflow } from "./lib/v4-runtime-e2e-operator.mjs";

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

function cleanupErrorCode(error) {
  if (
    typeof error?.code === "string" &&
    error.code.startsWith("V4_RUNTIME_E2E_")
  ) {
    return error.code;
  }
  return safeErrorCode(error, "CLEANUP_FAILED");
}

export function cleanupTombstonePath(credsPath) {
  return `${credsPath}.cleanup-state.json`;
}

export async function runCleanupCli({
  argv = process.argv.slice(2),
  env = process.env,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
  rmImpl = rm,
  signInImpl = signInWithPassword,
  disposableCleanupImpl = runDisposableCleanup,
  verifyHealthImpl,
  cleanupResourcesImpl,
  now,
  log = (line) => console.log(line),
}) {
  const args = parseArgs(argv);
  const baseUrl = requiredArg(args, "base-url");
  const expectedOrigin = typeof env.E2E_EXPECTED_ORIGIN === "string" ? env.E2E_EXPECTED_ORIGIN.trim() : "";
  if (!expectedOrigin) {
    const error = new Error("E2E_EXPECTED_ORIGIN is required");
    error.code = "V4_RUNTIME_E2E_OPERATOR_INPUT_INVALID";
    throw error;
  }
  const credsPath = requiredArg(args, "creds");
  const treeId = requiredArg(args, "tree-id");
  const memoryId = requiredArg(args, "memory-id");
  const statePath = cleanupTombstonePath(credsPath);
  const identity = preflightFromEnv(env);

  const loadTombstone = async () => {
    let source;
    try {
      source = await readFileImpl(statePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    try {
      return JSON.parse(source);
    } catch {
      const error = new Error("Runtime E2E cleanup tombstone is malformed JSON");
      error.code = "V4_RUNTIME_E2E_TOMBSTONE_INVALID";
      throw error;
    }
  };

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
    loadTombstone,
    loadCredentials,
    signIn: signInImpl,
    deleteAndVerifyAccount: async ({ apiKey, user, idToken }) => {
      const firebaseCleanup = await disposableCleanupImpl({
        users: [{ ...user, idToken }],
        apiKey,
        // Credential retirement is deliberately owned by the wrapper after a
        // durable ACCOUNT_DELETED_VERIFIED tombstone is written.
        credsFile: null,
        log,
      });
      const verified =
        firebaseCleanup?.ok === true &&
        firebaseCleanup?.allDeleted === true &&
        Array.isArray(firebaseCleanup?.results) &&
        firebaseCleanup.results.length === 1 &&
        firebaseCleanup.results.every((entry) => entry?.deleted === true);
      return {
        verified,
        firebaseUid: user?.uid ?? null,
      };
    },
    writeTombstone: async (tombstone) => {
      await writeFileImpl(statePath, JSON.stringify(tombstone, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
    },
    retireCredentials: async () => {
      await removeCredentialsFile(credsPath, rmImpl);
    },
    retireTombstone: async () => {
      await rmImpl(statePath, { force: true });
    },
    ...(verifyHealthImpl ? { verifyHealthImpl } : {}),
    ...(cleanupResourcesImpl ? { cleanupResourcesImpl } : {}),
    ...(now ? { now } : {}),
  });

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
