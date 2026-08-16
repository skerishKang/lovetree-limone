#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import {
  runDisposableCleanup,
  safeErrorCode,
  signInWithPassword,
} from "./lib/firebase-disposable-auth.mjs";
import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import {
  cleanupExactRuntimeE2EResources,
  verifyRuntimeE2EHealth,
} from "./lib/v4-runtime-e2e-operator.mjs";

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

const args = parseArgs(process.argv.slice(2));

try {
  const baseUrl = requiredArg(args, "base-url");
  const credsPath = requiredArg(args, "creds");
  const treeId = requiredArg(args, "tree-id");
  const memoryId = requiredArg(args, "memory-id");

  const identity = preflightFromEnv(process.env);
  await verifyRuntimeE2EHealth({
    baseUrl,
    expectedFirebaseProjectId: identity.firebaseProjectId,
  });

  let creds;
  try {
    creds = JSON.parse(await readFile(credsPath, "utf8"));
  } catch {
    throw new Error("unable to read disposable Firebase credentials file");
  }
  const users = Array.isArray(creds?.users) ? creds.users : [];
  if (users.length !== 1) {
    throw new Error("Runtime E2E cleanup requires exactly one disposable Firebase user");
  }
  const user = users[0];
  if (
    typeof creds.apiKey !== "string" ||
    !creds.apiKey ||
    typeof user?.email !== "string" ||
    !user.email ||
    typeof user?.password !== "string" ||
    !user.password
  ) {
    throw new Error("disposable Firebase credentials are incomplete");
  }

  // Refresh the token immediately before API cleanup. This avoids relying on
  // a possibly expired creation token after the logout/login acceptance steps.
  const refreshed = await signInWithPassword({
    apiKey: creds.apiKey,
    email: user.email,
    password: user.password,
  });
  const freshToken = refreshed.idToken;

  const resourceCleanup = await cleanupExactRuntimeE2EResources({
    baseUrl,
    memoryId,
    treeId,
    idToken: freshToken,
  });

  // DB resources are verified gone before the Firebase account is deleted, so
  // a failed DB cleanup retains a usable disposable identity for a safe retry.
  const firebaseCleanup = await runDisposableCleanup({
    users: [{ ...user, idToken: freshToken }],
    apiKey: creds.apiKey,
    credsFile: credsPath,
    log: (line) => console.log(line),
  });
  if (!firebaseCleanup.ok) {
    throw new Error("disposable Firebase account cleanup did not verify complete");
  }

  console.log(
    JSON.stringify({
      ok: true,
      treeId: resourceCleanup.treeId,
      memoryId: resourceCleanup.memoryId,
      treeDeleted: resourceCleanup.treeDeleted,
      memoryDeleted: resourceCleanup.memoryDeleted,
      exactIdsVerifiedGone: resourceCleanup.verifiedGone,
      firebaseUsersVerifiedDeleted: firebaseCleanup.results.every((entry) => entry.deleted),
      credentialsFileRemoved: firebaseCleanup.fileRemoved,
    })
  );
} catch (error) {
  console.error(`[v4-runtime-e2e-cleanup] ${safeErrorCode(error, "CLEANUP_FAILED")}`);
  process.exitCode = 1;
}
