import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  configureAuthTokenProvider,
  getAuthTokenProvider,
  getBoundAccessToken,
} from "../lib/auth-token-provider.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

test.afterEach(() => {
  configureAuthTokenProvider(null);
});

test("matching principal and token identity returns the bearer token", async () => {
  const provider = {
    getCurrentPrincipal: () => ({ id: "firebase-user-123", provider: "firebase" }),
    getAccessToken: async () => ({ token: "token-123", principalId: "firebase-user-123" }),
  };

  assert.equal(await getBoundAccessToken(provider), "token-123");
});

test("missing token principal identity fails closed", async () => {
  const provider = {
    getCurrentPrincipal: () => ({ id: "firebase-user-123", provider: "firebase" }),
    getAccessToken: async () => ({ token: "token-123", principalId: "" }),
  };

  await assert.rejects(() => getBoundAccessToken(provider), /Authentication principal mismatch/);
});

test("mismatched token principal identity fails closed", async () => {
  const provider = {
    getCurrentPrincipal: () => ({ id: "firebase-user-123", provider: "firebase" }),
    getAccessToken: async () => ({ token: "token-456", principalId: "firebase-user-456" }),
  };

  await assert.rejects(() => getBoundAccessToken(provider), /Authentication principal mismatch/);
});

test("no current principal omits auth without asking the provider for a token", async () => {
  let tokenCalls = 0;
  const provider = {
    getCurrentPrincipal: () => null,
    getAccessToken: async () => {
      tokenCalls += 1;
      return { token: "unexpected", principalId: "unexpected" };
    },
  };

  assert.equal(await getBoundAccessToken(provider), null);
  assert.equal(tokenCalls, 0);
});

test("configured provider overrides fallback and can be reset", () => {
  const fallback = {
    getCurrentPrincipal: () => null,
    getAccessToken: async () => null,
  };
  const configured = {
    getCurrentPrincipal: () => ({ id: "configured-user", provider: "future" }),
    getAccessToken: async () => ({ token: "configured-token", principalId: "configured-user" }),
  };

  configureAuthTokenProvider(configured);
  assert.equal(getAuthTokenProvider(fallback), configured);

  configureAuthTokenProvider(null);
  assert.equal(getAuthTokenProvider(fallback), fallback);
});

test("API transport consumes the provider-neutral seam while Firebase remains the fallback adapter", () => {
  const source = fs.readFileSync(path.join(ROOT, "lib", "api.ts"), "utf8");

  assert.match(source, /firebaseAuthTokenProvider/);
  assert.match(source, /getAuthTokenProvider\(firebaseAuthTokenProvider\)/);
  assert.match(source, /getBoundAccessToken/);
  assert.match(source, /provider:\s*"firebase"/);
  assert.doesNotMatch(source, /auth\?\.currentUser\?\.getIdToken\(\)/);
});
