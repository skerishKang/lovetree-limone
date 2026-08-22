import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCleanupTombstoneSecretFree,
  buildCleanupTombstone,
  cleanupExactRuntimeE2EResources,
  createRuntimeE2EAuthority,
  normalizeRuntimeE2EBaseUrl,
  runRuntimeE2ECleanupWorkflow,
  validateCleanupTombstone,
  verifyRuntimeE2EHealth,
} from "../scripts/lib/v4-runtime-e2e-operator.mjs";
import { cleanupTombstonePath, runCleanupCli } from "../scripts/cleanup-v4-runtime-e2e.mjs";

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const WORKER = "lovetree-limone-runtime-e2e-preview";
const BASE_URL = `https://${WORKER}.lovetree-test.workers.dev`;
const FIREBASE_PROJECT = "lovetree-runtime-e2e";
const NEON_BRANCH = "br-purple-violet-azsxemfv";
const DATABASE_HOST = "ep-red-paper-azsjzfte.c-3.ap-southeast-1.aws.neon.tech";

function authority(overrides = {}) {
  return createRuntimeE2EAuthority({
    baseUrl: BASE_URL,
    expectedOrigin: BASE_URL,
    expectedWorker: WORKER,
    expectedFirebaseProjectId: FIREBASE_PROJECT,
    expectedNeonBranchId: NEON_BRANCH,
    expectedDatabaseHost: DATABASE_HOST,
    ...overrides,
  });
}

function healthBody() {
  return {
    status: "ok",
    env: "e2e",
    e2e: {
      firebaseProjectId: FIREBASE_PROJECT,
      mutationsEnabled: true,
      databaseBinding: "approved",
    },
  };
}

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

function workflowDefaults(overrides = {}) {
  const events = overrides.events ?? [];
  const creds = {
    apiKey: "fixture-api-key-secret",
    users: [
      {
        email: "runtime-e2e@example.test",
        password: "fixture-password-secret",
        uid: "fixture-uid",
      },
    ],
  };
  return {
    baseUrl: BASE_URL,
    expectedOrigin: BASE_URL,
    expectedWorker: WORKER,
    expectedFirebaseProjectId: FIREBASE_PROJECT,
    expectedNeonBranchId: NEON_BRANCH,
    expectedDatabaseHost: DATABASE_HOST,
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    loadTombstone: async () => null,
    loadCredentials: async () => {
      events.push("credentials:load");
      return creds;
    },
    signIn: async () => {
      events.push("firebase:sign-in");
      return {
        idToken: "fixture-id-token-secret",
        refreshToken: "fixture-refresh-token-secret",
        localId: "fixture-uid",
      };
    },
    verifyHealthImpl: async () => {
      events.push("health:verified");
      return { ok: true };
    },
    cleanupResourcesImpl: async ({ memoryId, treeId }) => {
      events.push("resources:verified-gone");
      return { memoryId, treeId, verifiedGone: true };
    },
    deleteAndVerifyAccount: async () => {
      events.push("firebase:account-deleted-verified");
      return { verified: true, firebaseUid: "fixture-uid" };
    },
    writeTombstone: async () => {
      events.push("tombstone:write");
    },
    retireCredentials: async () => {
      events.push("credentials:retire");
    },
    retireTombstone: async () => {
      events.push("tombstone:retire");
    },
    now: () => "2026-08-17T09:45:00.000Z",
    ...overrides,
  };
}

test("approved Runtime E2E worker origin is exact and remote HTTPS only", () => {
  assert.equal(
    normalizeRuntimeE2EBaseUrl(`${BASE_URL}/`, {
      expectedWorker: WORKER,
      expectedOrigin: BASE_URL,
    }),
    BASE_URL
  );
  assert.throws(
    () =>
      normalizeRuntimeE2EBaseUrl("http://remote.example.test", {
        expectedWorker: WORKER,
        expectedOrigin: BASE_URL,
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_REMOTE_HTTPS_REQUIRED"
  );
  assert.throws(
    () =>
      normalizeRuntimeE2EBaseUrl("https://unrelated.example.test", {
        expectedWorker: WORKER,
        expectedOrigin: BASE_URL,
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_TARGET_ORIGIN_MISMATCH"
  );
});

test("protected Production Worker hosts fail closed", () => {
  assert.throws(
    () =>
      normalizeRuntimeE2EBaseUrl(
        "https://lovetree-limone.lovetree-test.workers.dev",
        { expectedWorker: WORKER, expectedOrigin: BASE_URL }
      ),
    (error) => error?.code === "V4_RUNTIME_E2E_PROTECTED_WORKER_HOST_BLOCKED"
  );
});

test("localhost HTTP exception is explicit, loopback-only, and test-bounded", () => {
  assert.throws(
    () =>
      normalizeRuntimeE2EBaseUrl("http://127.0.0.1:3000", {
        expectedWorker: WORKER,
        expectedOrigin: "http://127.0.0.1:3000",
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_LOCALHOST_NOT_ALLOWED"
  );
  assert.equal(
    normalizeRuntimeE2EBaseUrl("http://127.0.0.1:3000", {
      expectedWorker: WORKER,
      expectedOrigin: "http://127.0.0.1:3000",
      allowLocalhostHttp: true,
    }),
    "http://127.0.0.1:3000"
  );
  assert.equal(
    normalizeRuntimeE2EBaseUrl("http://localhost:8787", {
      expectedWorker: WORKER,
      expectedOrigin: "http://localhost:8787",
      allowLocalhostHttp: true,
    }),
    "http://localhost:8787"
  );
  assert.equal(
    normalizeRuntimeE2EBaseUrl("http://[::1]:8787", {
      expectedWorker: WORKER,
      expectedOrigin: "http://[::1]:8787",
      allowLocalhostHttp: true,
    }),
    "http://[::1]:8787"
  );
  assert.throws(
    () =>
      normalizeRuntimeE2EBaseUrl("http://192.0.2.10:8787", {
        expectedWorker: WORKER,
        expectedOrigin: "http://192.0.2.10:8787",
        allowLocalhostHttp: true,
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_REMOTE_HTTPS_REQUIRED"
  );
});

test("spoofed health on wrong origin receives zero requests and zero Authorization headers", async () => {
  let requestCount = 0;
  let authorizationCount = 0;
  await assert.rejects(
    () =>
      verifyRuntimeE2EHealth({
        baseUrl: "https://attacker.example.test",
        expectedOrigin: BASE_URL,
        expectedWorker: WORKER,
        expectedFirebaseProjectId: FIREBASE_PROJECT,
        expectedNeonBranchId: NEON_BRANCH,
        expectedDatabaseHost: DATABASE_HOST,
        fetchImpl: async (_url, options) => {
          requestCount += 1;
          if (options?.headers?.Authorization) authorizationCount += 1;
          return jsonResponse(healthBody());
        },
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_TARGET_ORIGIN_MISMATCH"
  );
  assert.equal(requestCount, 0);
  assert.equal(authorizationCount, 0);
});

test("same Worker name on a different workers.dev account is rejected before Authorization", async () => {
  let requestCount = 0;
  let authorizationCount = 0;
  const wrongAccountOrigin = `https://${WORKER}.attacker-account.workers.dev`;
  await assert.rejects(
    () =>
      verifyRuntimeE2EHealth({
        baseUrl: wrongAccountOrigin,
        expectedOrigin: BASE_URL,
        expectedWorker: WORKER,
        expectedFirebaseProjectId: FIREBASE_PROJECT,
        expectedNeonBranchId: NEON_BRANCH,
        expectedDatabaseHost: DATABASE_HOST,
        fetchImpl: async (_url, options) => {
          requestCount += 1;
          if (options?.headers?.Authorization) authorizationCount += 1;
          return jsonResponse(healthBody());
        },
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_TARGET_ORIGIN_MISMATCH"
  );
  assert.equal(requestCount, 0);
  assert.equal(authorizationCount, 0);
});

test("post-deploy Runtime E2E health uses preflight origin authority and truthful health fields", async () => {
  const result = await verifyRuntimeE2EHealth({
    baseUrl: BASE_URL,
    expectedOrigin: BASE_URL,
    expectedWorker: WORKER,
    expectedFirebaseProjectId: FIREBASE_PROJECT,
    expectedNeonBranchId: NEON_BRANCH,
    expectedDatabaseHost: DATABASE_HOST,
    fetchImpl: async (url, options) => {
      assert.equal(url, `${BASE_URL}/api/health`);
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.Authorization, undefined);
      return jsonResponse(healthBody());
    },
  });
  assert.equal(result.baseUrl, BASE_URL);
  assert.equal(result.worker, WORKER);
  assert.equal(result.workerIdentitySource, "preflight-approved-origin-binding");
  assert.equal(result.firebaseProjectId, FIREBASE_PROJECT);
  assert.equal(result.preflightNeonBranchId, NEON_BRANCH);
  assert.equal(result.preflightDatabaseHost, DATABASE_HOST);
  assert.equal(result.healthDatabaseBinding, "approved");
});

test("post-deploy Runtime E2E health fails closed on any truthful identity mismatch", async () => {
  for (const body of [
    { status: "ok", env: "staging" },
    {
      status: "ok",
      env: "e2e",
      e2e: {
        firebaseProjectId: "relovetree",
        mutationsEnabled: true,
        databaseBinding: "approved",
      },
    },
    {
      status: "ok",
      env: "e2e",
      e2e: {
        firebaseProjectId: FIREBASE_PROJECT,
        mutationsEnabled: false,
        databaseBinding: "approved",
      },
    },
    {
      status: "ok",
      env: "e2e",
      e2e: {
        firebaseProjectId: FIREBASE_PROJECT,
        mutationsEnabled: true,
        databaseBinding: "unapproved",
      },
    },
  ]) {
    await assert.rejects(
      () =>
        verifyRuntimeE2EHealth({
          baseUrl: BASE_URL,
          expectedOrigin: BASE_URL,
          expectedWorker: WORKER,
          expectedFirebaseProjectId: FIREBASE_PROJECT,
          expectedNeonBranchId: NEON_BRANCH,
          expectedDatabaseHost: DATABASE_HOST,
          fetchImpl: async () => jsonResponse(body),
        }),
      (error) => error?.code === "V4_RUNTIME_E2E_HEALTH_IDENTITY_FAILED"
    );
  }
});

test("exact Runtime E2E cleanup deletes Memory then Tree and verifies both IDs gone", async () => {
  const requests = [];
  const responses = [
    jsonResponse({ success: true }),
    jsonResponse({ success: true }),
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
  ];
  const result = await cleanupExactRuntimeE2EResources({
    authority: authority(),
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    idToken: "fixture-id-token",
    fetchImpl: async (url, options) => {
      requests.push({
        url,
        method: options.method,
        authorization: options.headers.Authorization,
        redirect: options.redirect,
      });
      return responses.shift();
    },
  });

  assert.deepEqual(
    requests.map(({ url, method }) => [method, url]),
    [
      ["DELETE", `${BASE_URL}/api/memories/memory-exact-id`],
      ["DELETE", `${BASE_URL}/api/trees/tree-exact-id`],
      ["GET", `${BASE_URL}/api/memories/memory-exact-id`],
      ["GET", `${BASE_URL}/api/trees/tree-exact-id`],
    ]
  );
  assert.equal(
    requests.every((entry) => entry.authorization === "Bearer fixture-id-token"),
    true
  );
  assert.equal(requests.every((entry) => entry.redirect === "error"), true);
  assert.equal(result.verifiedGone, true);
});

test("credential-bearing redirect is fail-closed and cannot forward bearer", async () => {
  let approvedOriginAuthorizationCount = 0;
  let wrongOriginAuthorizationCount = 0;
  await assert.rejects(
    () =>
      cleanupExactRuntimeE2EResources({
        authority: authority(),
        memoryId: "memory-exact-id",
        treeId: "tree-exact-id",
        idToken: "fixture-id-token",
        fetchImpl: async (url, options) => {
          if (new URL(url).origin === BASE_URL && options.headers.Authorization) {
            approvedOriginAuthorizationCount += 1;
          }
          if (options.redirect !== "error") {
            wrongOriginAuthorizationCount += 1;
            return jsonResponse({ success: true });
          }
          throw new TypeError("redirect blocked by fetch redirect=error");
        },
      }),
    TypeError
  );
  assert.equal(approvedOriginAuthorizationCount, 1);
  assert.equal(wrongOriginAuthorizationCount, 0);
});

test("exact Runtime E2E resource deletion retry accepts DELETE 404 only with final GET 404 proof", async () => {
  const responses = [
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
    jsonResponse({ error: "Not found" }, 404),
  ];
  const result = await cleanupExactRuntimeE2EResources({
    authority: authority(),
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    idToken: "fixture-id-token",
    fetchImpl: async () => responses.shift(),
  });
  assert.equal(result.memoryDeleteDisposition, "already-gone");
  assert.equal(result.treeDeleteDisposition, "already-gone");
  assert.equal(result.verifiedGone, true);
});

test("resource cleanup fails before account deletion when Memory deletion fails", async () => {
  const events = [];
  const options = workflowDefaults({
    events,
    cleanupResourcesImpl: async () => {
      events.push("resources:delete-failed");
      throw Object.assign(new Error("memory delete failed"), {
        code: "V4_RUNTIME_E2E_EXACT_CLEANUP_FAILED",
      });
    },
  });
  await assert.rejects(() => runRuntimeE2ECleanupWorkflow(options));
  assert.equal(events.includes("firebase:account-deleted-verified"), false);
  assert.equal(events.includes("tombstone:write"), false);
  assert.equal(events.includes("credentials:retire"), false);
});

test("normal complete cleanup locks resource/account/tombstone/credential order", async () => {
  const events = [];
  const result = await runRuntimeE2ECleanupWorkflow(workflowDefaults({ events }));
  assert.deepEqual(events, [
    "health:verified",
    "credentials:load",
    "firebase:sign-in",
    "resources:verified-gone",
    "firebase:account-deleted-verified",
    "tombstone:write",
    "credentials:retire",
    "tombstone:retire",
  ]);
  assert.equal(result.accountDeletionVerified, true);
  assert.equal(result.cleanupPhase, "COMPLETE");
});

test("credential retirement failure after verified account deletion leaves verified non-secret tombstone", async () => {
  const events = [];
  let durableTombstone = null;
  const options = workflowDefaults({
    events,
    writeTombstone: async (value) => {
      events.push("tombstone:write");
      durableTombstone = value;
    },
    retireCredentials: async () => {
      events.push("credentials:retire-failed");
      throw new Error("simulated credentials unlink failure");
    },
    retireTombstone: async () => {
      events.push("tombstone:retire");
      durableTombstone = null;
    },
  });
  await assert.rejects(() => runRuntimeE2ECleanupWorkflow(options), /unlink failure/);
  assert.equal(durableTombstone?.phase, "ACCOUNT_DELETED_VERIFIED");
  assert.equal(durableTombstone?.accountDeletionVerified, true);
  assert.equal(events.includes("tombstone:retire"), false);
  assert.equal(assertCleanupTombstoneSecretFree(durableTombstone), true);
});

test("retry from ACCOUNT_DELETED_VERIFIED tombstone skips sign-in and retires only local residue", async () => {
  const events = [];
  const verifiedState = buildCleanupTombstone({
    authority: authority(),
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    firebaseUid: "fixture-uid",
    verifiedAt: "2026-08-17T09:45:00.000Z",
  });
  const result = await runRuntimeE2ECleanupWorkflow(
    workflowDefaults({
      events,
      loadTombstone: async () => verifiedState,
      loadCredentials: async () => {
        throw new Error("must not load credentials on verified retry");
      },
      signIn: async () => {
        throw new Error("must not sign in on verified retry");
      },
      verifyHealthImpl: async () => {
        throw new Error("must not network-verify health on local residue retry");
      },
      retireCredentials: async () => {
        events.push("credentials:retire");
      },
      retireTombstone: async () => {
        events.push("tombstone:retire");
      },
    })
  );
  assert.deepEqual(events, ["credentials:retire", "tombstone:retire"]);
  assert.equal(result.resumedFrom, "ACCOUNT_DELETED_VERIFIED");
});

test("tombstone carries zero secret fields or values", () => {
  const state = buildCleanupTombstone({
    authority: authority(),
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    firebaseUid: "fixture-uid",
    verifiedAt: "2026-08-17T09:45:00.000Z",
  });
  const serialized = JSON.stringify(state);
  for (const forbidden of [
    "password",
    "idToken",
    "refreshToken",
    "apiKey",
    "oauth",
    "secret",
  ]) {
    assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false);
  }
  assert.equal(
    assertCleanupTombstoneSecretFree(state, [
      "fixture-api-key-secret",
      "fixture-password-secret",
      "fixture-id-token-secret",
      "fixture-refresh-token-secret",
    ]),
    true
  );
});

test("generic invalid login is AUTH failure, never account-deleted verification", async () => {
  const events = [];
  let tombstoneWrites = 0;
  const invalidLogin = Object.assign(new Error("INVALID_LOGIN_CREDENTIALS"), {
    code: "SIGN_IN_FAILED",
  });
  await assert.rejects(
    () =>
      runRuntimeE2ECleanupWorkflow(
        workflowDefaults({
          events,
          signIn: async () => {
            events.push("firebase:sign-in-invalid");
            throw invalidLogin;
          },
          writeTombstone: async () => {
            tombstoneWrites += 1;
          },
        })
      ),
    invalidLogin
  );
  assert.equal(tombstoneWrites, 0);
  assert.equal(events.includes("firebase:account-deleted-verified"), false);
  assert.equal(events.includes("credentials:retire"), false);
});

test("malformed tombstone fails closed before credentials or auth are touched", async () => {
  const events = [];
  await assert.rejects(
    () =>
      runRuntimeE2ECleanupWorkflow(
        workflowDefaults({
          events,
          loadTombstone: async () => ({ version: 999, phase: "UNKNOWN" }),
        })
      ),
    (error) =>
      error?.code === "V4_RUNTIME_E2E_TOMBSTONE_MISMATCH" ||
      error?.code === "V4_RUNTIME_E2E_TOMBSTONE_INVALID"
  );
  assert.deepEqual(events, []);
});

test("verified tombstone with wrong exact IDs fails closed", async () => {
  const state = buildCleanupTombstone({
    authority: authority(),
    memoryId: "memory-exact-id",
    treeId: "tree-exact-id",
    verifiedAt: "2026-08-17T09:45:00.000Z",
  });
  assert.throws(
    () =>
      validateCleanupTombstone({
        tombstone: state,
        authority: authority(),
        memoryId: "different-memory-id",
        treeId: "tree-exact-id",
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_TOMBSTONE_MISMATCH"
  );

  let retired = false;
  await assert.rejects(
    () =>
      runRuntimeE2ECleanupWorkflow(
        workflowDefaults({
          memoryId: "different-memory-id",
          loadTombstone: async () => state,
          retireCredentials: async () => {
            retired = true;
          },
        })
      ),
    (error) => error?.code === "V4_RUNTIME_E2E_TOMBSTONE_MISMATCH"
  );
  assert.equal(retired, false);
});

test("cleanup CLI persists verified tombstone before credential unlink and resumes without re-auth", async () => {
  const credsPath = "/tmp/runtime-e2e-creds.json";
  const statePath = cleanupTombstonePath(credsPath);
  const credentials = {
    apiKey: "fixture-api-key-secret",
    users: [
      {
        email: "runtime-e2e@example.test",
        password: "fixture-password-secret",
        uid: "fixture-uid",
      },
    ],
  };
  let durableState = null;
  let credentialExists = true;
  let credentialRetireAttempts = 0;
  let signInCalls = 0;
  let accountCleanupCalls = 0;
  let healthCalls = 0;
  let resourceCleanupCalls = 0;

  const readFileImpl = async (path) => {
    if (path === statePath) {
      if (durableState === null) {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }
      return JSON.stringify(durableState);
    }
    if (path === credsPath && credentialExists) return JSON.stringify(credentials);
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  };
  const writeFileImpl = async (path, source, options) => {
    assert.equal(path, statePath);
    assert.equal(options.mode, 0o600);
    durableState = JSON.parse(source);
  };
  const rmImpl = async (path) => {
    if (path === credsPath) {
      credentialRetireAttempts += 1;
      if (credentialRetireAttempts === 1) {
        throw new Error("simulated credential unlink failure");
      }
      credentialExists = false;
      return;
    }
    if (path === statePath) {
      durableState = null;
    }
  };
  const common = {
    argv: [
      "--base-url",
      BASE_URL,
      "--creds",
      credsPath,
      "--tree-id",
      "tree-exact-id",
      "--memory-id",
      "memory-exact-id",
    ],
    env: wrapperEnv(),
    readFileImpl,
    writeFileImpl,
    rmImpl,
    signInImpl: async () => {
      signInCalls += 1;
      return { idToken: "fixture-id-token-secret", localId: "fixture-uid" };
    },
    disposableCleanupImpl: async ({ credsFile }) => {
      accountCleanupCalls += 1;
      assert.equal(credsFile, null);
      return { ok: true, allDeleted: true, results: [{ deleted: true }] };
    },
    verifyHealthImpl: async () => {
      healthCalls += 1;
      return { ok: true };
    },
    cleanupResourcesImpl: async ({ memoryId, treeId }) => {
      resourceCleanupCalls += 1;
      return { memoryId, treeId, verifiedGone: true };
    },
    now: () => "2026-08-17T10:00:00.000Z",
    log: () => {},
  };

  await assert.rejects(() => runCleanupCli(common), /unlink failure/);
  assert.equal(durableState?.phase, "ACCOUNT_DELETED_VERIFIED");
  assert.equal(durableState?.accountDeletionVerified, true);
  assert.equal(assertCleanupTombstoneSecretFree(durableState), true);
  assert.equal(signInCalls, 1);
  assert.equal(accountCleanupCalls, 1);
  assert.equal(healthCalls, 1);
  assert.equal(resourceCleanupCalls, 1);

  await runCleanupCli({
    ...common,
    signInImpl: async () => {
      throw new Error("retry must not sign in");
    },
    disposableCleanupImpl: async () => {
      throw new Error("retry must not delete account again");
    },
    verifyHealthImpl: async () => {
      throw new Error("retry must not network-verify health");
    },
    cleanupResourcesImpl: async () => {
      throw new Error("retry must not touch resources");
    },
  });

  assert.equal(credentialExists, false);
  assert.equal(durableState, null);
  assert.equal(credentialRetireAttempts, 2);
  assert.equal(signInCalls, 1);
  assert.equal(accountCleanupCalls, 1);
  assert.equal(healthCalls, 1);
  assert.equal(resourceCleanupCalls, 1);
});

test("cleanup CLI malformed tombstone fails closed before credentials or auth", async () => {
  const credsPath = "/tmp/runtime-e2e-malformed-creds.json";
  const statePath = cleanupTombstonePath(credsPath);
  let credentialsRead = 0;
  let signInCalls = 0;
  await assert.rejects(
    () =>
      runCleanupCli({
        argv: [
          "--base-url",
          BASE_URL,
          "--creds",
          credsPath,
          "--tree-id",
          "tree-exact-id",
          "--memory-id",
          "memory-exact-id",
        ],
        env: wrapperEnv(),
        readFileImpl: async (path) => {
          if (path === statePath) return "{malformed-json";
          credentialsRead += 1;
          return "{}";
        },
        signInImpl: async () => {
          signInCalls += 1;
          throw new Error("must not sign in");
        },
        disposableCleanupImpl: async () => {
          throw new Error("must not delete account");
        },
        writeFileImpl: async () => {},
        rmImpl: async () => {},
        verifyHealthImpl: async () => {
          throw new Error("must not health-check after malformed tombstone");
        },
        cleanupResourcesImpl: async () => {
          throw new Error("must not cleanup resources");
        },
        log: () => {},
      }),
    (error) => error?.code === "V4_RUNTIME_E2E_TOMBSTONE_INVALID"
  );
  assert.equal(credentialsRead, 0);
  assert.equal(signInCalls, 0);
});
