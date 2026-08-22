import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  runDisposableCleanup,
  redactSecrets,
  redactLog,
  writeCredentialsFile,
  deleteAccount,
} from "../scripts/lib/firebase-disposable-auth.mjs";

const USERS = [
  { email: "smoke-a@example.invalid", password: "pw-secret-a-123456", uid: "uid-a", idToken: "tok-a" },
  { email: "smoke-b@example.invalid", password: "pw-secret-b-123456", uid: "uid-b", idToken: "tok-b" },
];
const API_KEY = "AIza-super-secret-key-123456";

function jsonResponse(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

// Mock fetch that records every call. Deletion succeeds unless deleteFails,
// and accounts:lookup returns no users after a successful delete unless
// lookupNeverClears.
function makeFetchMock(options = {}) {
  const { deleteFails = false, lookupNeverClears = false } = options;
  const calls = [];
  const fetchImpl = async (url, request = {}) => {
    calls.push({ url, method: request.method, headers: request.headers, body: request.body });
    if (url.includes("accounts:delete")) {
      if (deleteFails) return jsonResponse(400, { error: { message: "INVALID_ID_TOKEN" } });
      return jsonResponse(200, {});
    }
    if (url.includes("accounts:lookup")) {
      return jsonResponse(200, lookupNeverClears ? { users: [{ localId: "u1" }] } : { users: [] });
    }
    throw new Error("unexpected url: " + url);
  };
  return { fetchImpl, calls };
}

test("accounts:delete sends the idToken in the JSON body, never the Authorization header", async () => {
  const { fetchImpl, calls } = makeFetchMock();
  const dir = await mkdtemp(path.join(tmpdir(), "fb-cleanup-"));
  const credsFile = path.join(dir, "creds.json");
  await writeCredentialsFile({ users: USERS, apiKey: API_KEY, filePath: credsFile });
  const result = await runDisposableCleanup({ users: USERS, apiKey: API_KEY, credsFile, fetchImpl });
  assert.equal(result.ok, true);
  const deleteCalls = calls.filter((call) => call.url.includes("accounts:delete"));
  assert.equal(deleteCalls.length, 2);
  for (const call of deleteCalls) {
    const body = JSON.parse(call.body);
    assert.ok(typeof body.idToken === "string" && body.idToken.length > 0, "idToken must be in the JSON body");
    assert.equal(call.headers?.Authorization, undefined, "Authorization header must not be used");
    assert.equal(call.headers?.["authorization"], undefined);
  }
  await rm(dir, { recursive: true, force: true });
});

test("credentials file is removed only after every user is verified deleted", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fb-cleanup-"));
  const credsFile = path.join(dir, "creds.json");
  await writeCredentialsFile({ users: USERS, apiKey: API_KEY, filePath: credsFile });

  // Deletion succeeds but lookup keeps returning the user -> unverified.
  const unverified = makeFetchMock({ lookupNeverClears: true });
  const failed = await runDisposableCleanup({ users: USERS, apiKey: API_KEY, credsFile, fetchImpl: unverified.fetchImpl });
  assert.equal(failed.ok, false);
  assert.equal(existsSync(credsFile), true, "credentials must survive until deletion is verified");

  // Now a clean run removes the file.
  const clean = makeFetchMock();
  const ok = await runDisposableCleanup({ users: USERS, apiKey: API_KEY, credsFile, fetchImpl: clean.fetchImpl });
  assert.equal(ok.ok, true);
  assert.equal(ok.fileRemoved, true);
  assert.equal(existsSync(credsFile), false, "credentials file must be removed after verified deletion");
  await rm(dir, { recursive: true, force: true });
});

test("cleanup failure never yields a success marker and keeps the credentials file", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fb-cleanup-"));
  const credsFile = path.join(dir, "creds.json");
  await writeCredentialsFile({ users: USERS, apiKey: API_KEY, filePath: credsFile });
  const { fetchImpl } = makeFetchMock({ deleteFails: true });
  const result = await runDisposableCleanup({ users: USERS, apiKey: API_KEY, credsFile, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.allDeleted, false);
  assert.ok(result.errors.length > 0);
  assert.equal(existsSync(credsFile), true);
  await rm(dir, { recursive: true, force: true });
});

test("a user without a retained idToken blocks cleanup success", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fb-cleanup-"));
  const credsFile = path.join(dir, "creds.json");
  const users = [{ email: "smoke-a@example.invalid", password: "pw", uid: "uid-a", idToken: null }];
  await writeCredentialsFile({ users, apiKey: API_KEY, filePath: credsFile });
  const { fetchImpl } = makeFetchMock();
  const result = await runDisposableCleanup({ users, apiKey: API_KEY, credsFile, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(existsSync(credsFile), true, "credentials must be kept when deletion is impossible");
  await rm(dir, { recursive: true, force: true });
});

test("DB test-row cleanup runs first and still runs when user deletion fails", async () => {
  const order = [];
  const { fetchImpl } = makeFetchMock({ deleteFails: true });
  const cleanupDbRows = async () => order.push("db");
  const result = await runDisposableCleanup({
    users: USERS,
    apiKey: API_KEY,
    fetchImpl,
    cleanupDbRows,
  });
  assert.equal(order[0], "db", "DB test-row cleanup must be prioritized");
  assert.equal(result.ok, false);
  assert.equal(result.dbCleaned, true, "DB cleanup must complete even when user deletion fails");
});

test("logs redact passwords, idTokens, API keys, and emails", async () => {
  const lines = [];
  const { fetchImpl } = makeFetchMock();
  const result = await runDisposableCleanup({
    users: USERS,
    apiKey: API_KEY,
    fetchImpl,
    log: (line) => lines.push(line),
  });
  assert.equal(result.ok, true);
  const joined = lines.join("\n");
  for (const secret of [API_KEY, "pw-secret-a-123456", "pw-secret-b-123456", "tok-a", "tok-b", "smoke-a@example.invalid", "smoke-b@example.invalid"]) {
    assert.ok(!joined.includes(secret), `log must not contain raw secret: ${secret}`);
  }
});

test("redactSecrets and redactLog remove secret values", () => {
  assert.equal(redactSecrets("token=abc1234567", ["abc1234567"]), "token=[REDACTED]");
  assert.equal(redactLog("email smoke-a@example.invalid key AIza-super-secret-key-123456", USERS, API_KEY), "email [REDACTED] key [REDACTED]");
});

test("deleteAccount rejects when the API reports an error", async () => {
  const { fetchImpl } = makeFetchMock({ deleteFails: true });
  await assert.rejects(
    () => deleteAccount({ apiKey: API_KEY, idToken: "tok-a", fetchImpl }),
    /accounts:delete failed/
  );
});

test("credentials file is written with restrictive permissions (mode 0600)", async (t) => {
  if (process.platform === "win32") {
    t.skip(
      "SKIP-IF(win32) [D7-2 #369/#379]: POSIX mode bits are unenforceable on win32 " +
        "(Node chmod maps to the NTFS read-only flag only), so stat().mode can never read 0o600 there. " +
        "Explicit environment skip, not a silent pass. Re-run environments that assert this for real: " +
        "Linux CI (A-track P0 validation, production auto-deploy) and any Linux/macOS host."
    );
    return;
  }
  const dir = await mkdtemp(path.join(tmpdir(), "fb-cleanup-"));
  const credsFile = path.join(dir, "creds.json");
  await writeCredentialsFile({ users: USERS, apiKey: API_KEY, filePath: credsFile });
  const mode = (await stat(credsFile)).mode & 0o777;
  assert.equal(mode, 0o600, "credentials file must be readable/writable by the owner only");
  await rm(dir, { recursive: true, force: true });
});

test("F5: final JSON output never contains raw email, uid, password, idToken, or API key", async () => {
  const { fetchImpl } = makeFetchMock();
  const result = await runDisposableCleanup({ users: USERS, apiKey: API_KEY, fetchImpl });
  assert.equal(result.ok, true);
  // The results array must only carry userRef + emailSha256 + deleted + reasonCode.
  for (const entry of result.results) {
    assert.ok(typeof entry.userRef === "string" && entry.userRef.startsWith("user-"));
    assert.ok(typeof entry.emailSha256 === "string" && /^[0-9a-f]{64}$/.test(entry.emailSha256));
    assert.ok(!("email" in entry) || entry.email === undefined);
    assert.ok(!("uid" in entry) || entry.uid === undefined);
    assert.ok(!("password" in entry) || entry.password === undefined);
    assert.ok(!("idToken" in entry) || entry.idToken === undefined);
  }
  // The errors array must only carry userRef + code (no raw messages).
  for (const err of result.errors) {
    assert.ok(typeof err.userRef === "string");
    assert.ok(typeof err.code === "string");
    assert.ok(!("message" in err) || err.message === err.code);
  }
  // Stringify the entire result and verify no secret leaks.
  const serialized = JSON.stringify(result);
  for (const secret of [API_KEY, "pw-secret-a-123456", "pw-secret-b-123456", "tok-a", "tok-b", "smoke-a@example.invalid", "smoke-b@example.invalid", "uid-a", "uid-b"]) {
    assert.ok(!serialized.includes(secret), `result JSON must not contain raw secret: ${secret}`);
  }
});

test("F5: API error payload containing a secret does not leak into output", async () => {
  // Simulate an API error whose message embeds a secret value (e.g. the API
  // key or idToken echoed back in the error). safeErrorCode must reduce this
  // to a stable code; the raw message must never appear in results or errors.
  const secretInError = `auth failed for token tok-a with key ${API_KEY}`;
  const fetchImpl = async (url) => {
    if (url.includes("accounts:delete")) {
      return jsonResponse(400, { error: { message: secretInError } });
    }
    if (url.includes("accounts:lookup")) {
      return jsonResponse(200, { users: [{ localId: "u1" }] });
    }
    throw new Error("unexpected url: " + url);
  };
  const result = await runDisposableCleanup({ users: USERS, apiKey: API_KEY, fetchImpl });
  assert.equal(result.ok, false);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes("tok-a"), "result must not leak idToken from API error");
  assert.ok(!serialized.includes(API_KEY), "result must not leak API key from API error");
  assert.ok(!serialized.includes(secretInError), "raw API error message must not appear in output");
  for (const err of result.errors) {
    assert.ok(typeof err.code === "string" && err.code === err.code, "error code must be a safe stable string");
  }
});
