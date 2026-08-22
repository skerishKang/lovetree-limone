import assert from "node:assert/strict";
import test from "node:test";

import {
  RESOURCES_DELETED_VERIFIED,
  cleanupResourceTombstonePath,
  cleanupTombstonePath,
  runCleanupCli,
} from "../scripts/cleanup-v4-runtime-e2e.mjs";

const WORKER = "lovetree-limone-runtime-e2e-preview";
const BASE_URL = `https://${WORKER}.lovetree-test.workers.dev`;
const FIREBASE_PROJECT = "lovetree-runtime-e2e";
const NEON_BRANCH = "br-purple-violet-azsxemfv";
const DATABASE_HOST = "ep-red-paper-azsjzfte.c-3.ap-southeast-1.aws.neon.tech";
const CREDS_PATH = "/tmp/runtime-e2e-retry-safety-creds.json";
const TREE_ID = "tree-exact-id";
const MEMORY_ID = "memory-exact-id";

function wrapperEnv() {
  return {
    E2E_EXPECTED_ORIGIN: BASE_URL,
    E2E_EXPECTED_WORKER: WORKER,
    E2E_FIREBASE_PROJECT_ID: FIREBASE_PROJECT,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: FIREBASE_PROJECT,
    FIREBASE_PROJECT_ID: FIREBASE_PROJECT,
    E2E_NEON_PROJECT_ID: "autumn-cherry-54971674",
    E2E_NEON_BRANCH_ID: NEON_BRANCH,
    DATABASE_URL: `postgres://tester@${DATABASE_HOST}/lovetree`,
    APP_ENV: "e2e",
    API_MUTATIONS_ENABLED: "true",
  };
}

function cleanupArgv(credsPath = CREDS_PATH) {
  return [
    "--base-url",
    BASE_URL,
    "--creds",
    credsPath,
    "--tree-id",
    TREE_ID,
    "--memory-id",
    MEMORY_ID,
  ];
}

function credentials() {
  return {
    apiKey: "fixture-api-key-secret",
    users: [
      {
        email: "runtime-e2e@example.test",
        password: "fixture-password-secret",
        uid: "fixture-uid",
        idToken: "fixture-retained-id-token-secret",
      },
    ],
  };
}

function missing(path) {
  return Object.assign(new Error(`missing ${path}`), { code: "ENOENT" });
}

function memoryFs(initial = {}) {
  const files = new Map(Object.entries(initial));
  const events = [];
  let accountStateWriteFailuresRemaining = 0;

  return {
    files,
    events,
    failNextAccountStateWrite() {
      accountStateWriteFailuresRemaining += 1;
    },
    async readFileImpl(path) {
      if (!files.has(path)) throw missing(path);
      return files.get(path);
    },
    async writeFileImpl(path, source, options = {}) {
      events.push(`write:${path}`);
      if (
        path.endsWith(".cleanup-state.json") &&
        accountStateWriteFailuresRemaining > 0
      ) {
        accountStateWriteFailuresRemaining -= 1;
        throw new Error("simulated account tombstone write failure");
      }
      assert.equal(options.mode, 0o600);
      files.set(path, String(source));
    },
    async rmImpl(path, options = {}) {
      events.push(`rm:${path}`);
      if (!files.has(path) && options.force !== true) throw missing(path);
      files.delete(path);
    },
  };
}

function assertNoFixtureSecrets(logs) {
  const joined = logs.join("\n");
  for (const secret of [
    "fixture-api-key-secret",
    "fixture-password-secret",
    "fixture-retained-id-token-secret",
    "fixture-fresh-id-token-secret",
  ]) {
    assert.equal(joined.includes(secret), false);
  }
}

function commonIo(fs) {
  return {
    readFileImpl: fs.readFileImpl,
    writeFileImpl: fs.writeFileImpl,
    rmImpl: fs.rmImpl,
    resourceReadFileImpl: fs.readFileImpl,
    resourceWriteFileImpl: fs.writeFileImpl,
    resourceRmImpl: fs.rmImpl,
  };
}

test("Firebase delete response ambiguity is independently verified before account-deleted state", async () => {
  const statePath = cleanupTombstonePath(CREDS_PATH);
  const resourceStatePath = cleanupResourceTombstonePath(CREDS_PATH);
  const fs = memoryFs({ [CREDS_PATH]: JSON.stringify(credentials()) });
  const logs = [];
  const events = [];
  let deletionVerifierCalls = 0;

  const result = await runCleanupCli({
    argv: cleanupArgv(),
    env: wrapperEnv(),
    ...commonIo(fs),
    verifyHealthImpl: async () => {
      events.push("health");
      return { ok: true };
    },
    signInImpl: async () => {
      events.push("sign-in");
      return {
        idToken: "fixture-fresh-id-token-secret",
        localId: "fixture-uid",
      };
    },
    cleanupResourcesImpl: async ({ memoryId, treeId }) => {
      events.push("resources-verified-gone");
      return { memoryId, treeId, verifiedGone: true };
    },
    disposableCleanupImpl: async () => {
      events.push("firebase-delete-response-lost");
      throw new TypeError("socket reset after accounts:delete response");
    },
    verifyDeletedUserImpl: async ({ idToken }) => {
      events.push("firebase-independent-delete-proof");
      deletionVerifierCalls += 1;
      assert.equal(idToken, "fixture-fresh-id-token-secret");
      return {
        deleted: true,
        reasonCode: "VERIFIED",
        detail: "lookup returns no users",
      };
    },
    now: () => "2026-08-17T13:50:00.000Z",
    log: (line) => logs.push(line),
  });

  assert.equal(result.ok, true);
  assert.equal(result.accountDeletionVerified, true);
  assert.equal(result.resumedFrom, null);
  assert.equal(deletionVerifierCalls, 1);
  assert.equal(fs.files.has(CREDS_PATH), false);
  assert.equal(fs.files.has(statePath), false);
  assert.equal(fs.files.has(resourceStatePath), false);

  const resourceWrite = fs.events.indexOf(`write:${resourceStatePath}`);
  const deleteAttempt = events.indexOf("firebase-delete-response-lost");
  assert.notEqual(resourceWrite, -1);
  assert.notEqual(deleteAttempt, -1);
  assert.equal(events.indexOf("resources-verified-gone") < deleteAttempt, true);
  assert.equal(events.indexOf("firebase-independent-delete-proof") > deleteAttempt, true);
  assertNoFixtureSecrets(logs);
});

test("account deletion verified plus account-tombstone write failure resumes from durable resource phase", async () => {
  const statePath = cleanupTombstonePath(CREDS_PATH);
  const resourceStatePath = cleanupResourceTombstonePath(CREDS_PATH);
  const fs = memoryFs({ [CREDS_PATH]: JSON.stringify(credentials()) });
  fs.failNextAccountStateWrite();

  const logs = [];
  let signInCalls = 0;
  let resourceCleanupCalls = 0;
  let accountCleanupCalls = 0;
  let deletionVerifierCalls = 0;

  const common = {
    argv: cleanupArgv(),
    env: wrapperEnv(),
    ...commonIo(fs),
    verifyHealthImpl: async () => ({ ok: true }),
    cleanupResourcesImpl: async ({ memoryId, treeId }) => {
      resourceCleanupCalls += 1;
      return { memoryId, treeId, verifiedGone: true };
    },
    disposableCleanupImpl: async () => {
      accountCleanupCalls += 1;
      return {
        ok: true,
        allDeleted: true,
        results: [{ deleted: true, reasonCode: "VERIFIED" }],
      };
    },
    verifyDeletedUserImpl: async () => {
      deletionVerifierCalls += 1;
      return {
        deleted: true,
        reasonCode: "VERIFIED",
        detail: "deleted-user proof",
      };
    },
    now: () => "2026-08-17T13:55:00.000Z",
    log: (line) => logs.push(line),
  };

  await assert.rejects(
    () =>
      runCleanupCli({
        ...common,
        signInImpl: async () => {
          signInCalls += 1;
          return {
            idToken: "fixture-fresh-id-token-secret",
            localId: "fixture-uid",
          };
        },
      }),
    /simulated account tombstone write failure/
  );

  assert.equal(fs.files.has(CREDS_PATH), true);
  assert.equal(fs.files.has(statePath), false);
  assert.equal(fs.files.has(resourceStatePath), true);
  const resourceState = JSON.parse(fs.files.get(resourceStatePath));
  assert.equal(resourceState.phase, RESOURCES_DELETED_VERIFIED);
  assert.equal(resourceState.resourcesDeletionVerified, true);
  assert.equal(resourceState.memoryId, MEMORY_ID);
  assert.equal(resourceState.treeId, TREE_ID);
  assert.equal(JSON.stringify(resourceState).includes("fixture-"), false);
  assert.equal(resourceCleanupCalls, 1);
  assert.equal(accountCleanupCalls, 1);
  assert.equal(deletionVerifierCalls, 0);

  const result = await runCleanupCli({
    ...common,
    signInImpl: async () => {
      signInCalls += 1;
      throw Object.assign(new Error("EMAIL_NOT_FOUND"), { code: "SIGN_IN_FAILED" });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.resumedFrom, RESOURCES_DELETED_VERIFIED);
  assert.equal(result.accountDeletionVerified, true);
  assert.equal(resourceCleanupCalls, 1, "resource cleanup must not repeat after durable proof");
  assert.equal(accountCleanupCalls, 1, "account delete must not repeat after explicit gone proof");
  assert.equal(deletionVerifierCalls, 1);
  assert.equal(signInCalls, 2);
  assert.equal(fs.files.has(CREDS_PATH), false);
  assert.equal(fs.files.has(statePath), false);
  assert.equal(fs.files.has(resourceStatePath), false);
  assertNoFixtureSecrets(logs);
});

test("resource-phase retry keeps credentials when generic auth failure has no independent deletion proof", async () => {
  const statePath = cleanupTombstonePath(CREDS_PATH);
  const resourceStatePath = cleanupResourceTombstonePath(CREDS_PATH);
  const fs = memoryFs({ [CREDS_PATH]: JSON.stringify(credentials()) });
  fs.failNextAccountStateWrite();

  let signInCalls = 0;
  let resourceCleanupCalls = 0;
  let accountCleanupCalls = 0;
  let deletionVerifierCalls = 0;

  const common = {
    argv: cleanupArgv(),
    env: wrapperEnv(),
    ...commonIo(fs),
    verifyHealthImpl: async () => ({ ok: true }),
    cleanupResourcesImpl: async ({ memoryId, treeId }) => {
      resourceCleanupCalls += 1;
      return { memoryId, treeId, verifiedGone: true };
    },
    disposableCleanupImpl: async () => {
      accountCleanupCalls += 1;
      return { ok: true, allDeleted: true, results: [{ deleted: true }] };
    },
    verifyDeletedUserImpl: async () => {
      deletionVerifierCalls += 1;
      return {
        deleted: false,
        reasonCode: "LOOKUP_FAILED",
        detail: "generic auth failure is not deletion proof",
      };
    },
    now: () => "2026-08-17T14:00:00.000Z",
    log: () => {},
  };

  await assert.rejects(
    () =>
      runCleanupCli({
        ...common,
        signInImpl: async () => {
          signInCalls += 1;
          return { idToken: "fixture-fresh-id-token-secret", localId: "fixture-uid" };
        },
      }),
    /simulated account tombstone write failure/
  );

  const genericSignInFailure = Object.assign(new Error("INVALID_LOGIN_CREDENTIALS"), {
    code: "SIGN_IN_FAILED",
  });
  await assert.rejects(
    () =>
      runCleanupCli({
        ...common,
        signInImpl: async () => {
          signInCalls += 1;
          throw genericSignInFailure;
        },
      }),
    genericSignInFailure
  );

  assert.equal(resourceCleanupCalls, 1);
  assert.equal(accountCleanupCalls, 1);
  assert.equal(deletionVerifierCalls, 1);
  assert.equal(signInCalls, 2);
  assert.equal(fs.files.has(CREDS_PATH), true);
  assert.equal(fs.files.has(resourceStatePath), true);
  assert.equal(fs.files.has(statePath), false);
});
