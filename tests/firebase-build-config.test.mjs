import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  validateFirebaseClientConfig,
  firebaseConfigFingerprint,
  verifyClientBundleHasFirebaseConfig,
  checkFirebaseBuildConfig,
  readFirebaseClientConfig,
  FIREBASE_CLIENT_ENV_KEYS,
} from "../scripts/lib/firebase-build-config.mjs";
import { buildManifest, verifyBuildProvenance } from "../scripts/lib/build-provenance.mjs";

// Test config with a FAKE apiKey (never a real key). The projectId and
// authDomain are public values already present in wrangler.jsonc.
const VALID_CONFIG = {
  apiKey: "test-fake-api-key-not-real-1234567890",
  authDomain: "relovetree.firebaseapp.com",
  projectId: "relovetree",
};

function envWith(overrides = {}) {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: VALID_CONFIG.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: VALID_CONFIG.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: VALID_CONFIG.projectId,
    ...overrides,
  };
}

// ── validateFirebaseClientConfig ───────────────────────────────────────────

test("all three vars present and projectId=relovetree → PASS", () => {
  const result = validateFirebaseClientConfig(envWith());
  assert.equal(result.ok, true);
  assert.equal(result.problems.length, 0);
  assert.equal(result.config.projectId, "relovetree");
});

test("apiKey missing → BLOCK", () => {
  const result = validateFirebaseClientConfig(envWith({ NEXT_PUBLIC_FIREBASE_API_KEY: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("API_KEY")));
});

test("apiKey undefined → BLOCK", () => {
  const env = envWith();
  delete env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const result = validateFirebaseClientConfig(env);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("API_KEY")));
});

test("authDomain missing → BLOCK", () => {
  const result = validateFirebaseClientConfig(envWith({ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("AUTH_DOMAIN")));
});

test("projectId missing → BLOCK", () => {
  const result = validateFirebaseClientConfig(envWith({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("PROJECT_ID")));
});

test("projectId != relovetree → BLOCK", () => {
  const result = validateFirebaseClientConfig(envWith({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: "wrong-project" }));
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("relovetree")));
  // The raw wrong value must NOT appear in the problem string (no leak).
  assert.ok(!result.problems.some((p) => p.includes("wrong-project")));
});

test("whitespace-only values are treated as empty → BLOCK", () => {
  const result = validateFirebaseClientConfig({
    NEXT_PUBLIC_FIREBASE_API_KEY: "   ",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "  ",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "  ",
  });
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 3);
});

test("validation problems never contain the raw apiKey", () => {
  const result = validateFirebaseClientConfig(envWith({ NEXT_PUBLIC_FIREBASE_API_KEY: "" }));
  const joined = result.problems.join(" ");
  assert.ok(!joined.includes(VALID_CONFIG.apiKey));
});

// ── firebaseConfigFingerprint ──────────────────────────────────────────────

test("fingerprint is a 64-char hex sha256", () => {
  const fp = firebaseConfigFingerprint(VALID_CONFIG);
  assert.match(fp, /^[0-9a-f]{64}$/);
});

test("fingerprint is deterministic for the same config", () => {
  const a = firebaseConfigFingerprint(VALID_CONFIG);
  const b = firebaseConfigFingerprint({ ...VALID_CONFIG });
  assert.equal(a, b);
});

test("fingerprint changes when apiKey changes", () => {
  const a = firebaseConfigFingerprint(VALID_CONFIG);
  const b = firebaseConfigFingerprint({ ...VALID_CONFIG, apiKey: "different-key" });
  assert.notEqual(a, b);
});

test("fingerprint changes when projectId changes", () => {
  const a = firebaseConfigFingerprint(VALID_CONFIG);
  const b = firebaseConfigFingerprint({ ...VALID_CONFIG, projectId: "other" });
  assert.notEqual(a, b);
});

test("fingerprint does not contain the raw apiKey", () => {
  const fp = firebaseConfigFingerprint(VALID_CONFIG);
  assert.ok(!fp.includes(VALID_CONFIG.apiKey));
});

// ── checkFirebaseBuildConfig ───────────────────────────────────────────────

test("checkFirebaseBuildConfig returns ok + fingerprint for valid env", () => {
  const result = checkFirebaseBuildConfig(envWith());
  assert.equal(result.ok, true);
  assert.equal(result.projectId, "relovetree");
  assert.match(result.fingerprint, /^[0-9a-f]{64}$/);
});

test("checkFirebaseBuildConfig returns null fingerprint for invalid env", () => {
  const result = checkFirebaseBuildConfig({});
  assert.equal(result.ok, false);
  assert.equal(result.fingerprint, null);
});

// ── verifyClientBundleHasFirebaseConfig ────────────────────────────────────

async function makeClientDir(withConfig = true) {
  const dir = await mkdtemp(path.join(tmpdir(), "fb-bundle-"));
  await mkdir(path.join(dir, "assets"), { recursive: true });
  const content = withConfig
    ? `var c={apiKey:"${VALID_CONFIG.apiKey}",authDomain:"${VALID_CONFIG.authDomain}",projectId:"${VALID_CONFIG.projectId}"};`
    : `var c={apiKey:"",authDomain:"",projectId:""};`;
  await writeFile(path.join(dir, "assets", "app.js"), content, "utf8");
  return dir;
}

test("client bundle with inlined config → PASS", async () => {
  const dir = await makeClientDir(true);
  const result = await verifyClientBundleHasFirebaseConfig({ clientDir: dir, config: VALID_CONFIG });
  assert.equal(result.ok, true);
  await rm(dir, { recursive: true, force: true });
});

test("client bundle with empty config (projectId missing) → BLOCK", async () => {
  const dir = await makeClientDir(false);
  const result = await verifyClientBundleHasFirebaseConfig({ clientDir: dir, config: VALID_CONFIG });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("projectId")));
  await rm(dir, { recursive: true, force: true });
});

test("client bundle with authDomain missing → BLOCK", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fb-bundle-"));
  await mkdir(path.join(dir, "assets"), { recursive: true });
  // projectId present but authDomain absent
  await writeFile(
    path.join(dir, "assets", "app.js"),
    `var c={projectId:"${VALID_CONFIG.projectId}"};`,
    "utf8"
  );
  const result = await verifyClientBundleHasFirebaseConfig({ clientDir: dir, config: VALID_CONFIG });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("authDomain")));
  await rm(dir, { recursive: true, force: true });
});

test("empty client bundle → BLOCK", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fb-bundle-"));
  await mkdir(path.join(dir, "assets"), { recursive: true });
  const result = await verifyClientBundleHasFirebaseConfig({ clientDir: dir, config: VALID_CONFIG });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("empty")));
  await rm(dir, { recursive: true, force: true });
});

test("non-existent client dir → BLOCK (not crash)", async () => {
  const result = await verifyClientBundleHasFirebaseConfig({
    clientDir: "/nonexistent/path/that/does/not/exist",
    config: VALID_CONFIG,
  });
  assert.equal(result.ok, false);
});

// ── build manifest with Firebase config fingerprint ────────────────────────

async function makeScratchRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), "fb-manifest-"));
  await mkdir(path.join(dir, "dist", "client", "assets"), { recursive: true });
  await mkdir(path.join(dir, "dist", "server"), { recursive: true });
  await writeFile(path.join(dir, "dist", "client", "assets", "app.js"), "console.log('x');\n", "utf8");
  await writeFile(path.join(dir, "dist", "server", "wrangler.json"), JSON.stringify({ name: "lovetree-limone" }), "utf8");
  await writeFile(path.join(dir, "dist", "server", "index.js"), "export default {};\n", "utf8");
  return dir;
}

test("manifest includes firebaseConfigFingerprint and firebaseProjectId", async () => {
  const dir = await makeScratchRepo();
  const fp = firebaseConfigFingerprint(VALID_CONFIG);
  const manifest = await buildManifest({
    repoRoot: dir,
    sourceSha: "abc123",
    firebaseConfigFingerprint: fp,
    firebaseProjectId: "relovetree",
  });
  assert.equal(manifest.firebaseConfigFingerprint, fp);
  assert.equal(manifest.firebaseProjectId, "relovetree");
  // The manifest must NOT contain the raw apiKey.
  const serialized = JSON.stringify(manifest);
  assert.ok(!serialized.includes(VALID_CONFIG.apiKey));
  await rm(dir, { recursive: true, force: true });
});

test("manifest without firebase config has null fingerprint", async () => {
  const dir = await makeScratchRepo();
  const manifest = await buildManifest({ repoRoot: dir, sourceSha: "abc123" });
  assert.equal(manifest.firebaseConfigFingerprint, null);
  assert.equal(manifest.firebaseProjectId, null);
  await rm(dir, { recursive: true, force: true });
});

// ── verifyBuildProvenance with Firebase config ─────────────────────────────

test("provenance: manifest with valid fingerprint PASSES", async () => {
  const dir = await makeScratchRepo();
  const fp = firebaseConfigFingerprint(VALID_CONFIG);
  const manifest = await buildManifest({
    repoRoot: dir,
    sourceSha: "abc123",
    firebaseConfigFingerprint: fp,
    firebaseProjectId: "relovetree",
  });
  await writeFile(path.join(dir, "dist", "server", "lovetree-build-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const { checks } = await verifyBuildProvenance({
    repoRoot: dir,
    sourceSha: "abc123",
    expectedWorker: "lovetree-limone",
    expectedFirebaseConfigFingerprint: fp,
  });
  const fpCheck = checks.find((c) => c[0] === "build-manifest-firebase-config-fingerprint");
  assert.equal(fpCheck[1], true);
  const matchCheck = checks.find((c) => c[0] === "build-manifest-firebase-config-match");
  assert.equal(matchCheck[1], true);
  const projCheck = checks.find((c) => c[0] === "build-manifest-firebase-project-id");
  assert.equal(projCheck[1], true);
  await rm(dir, { recursive: true, force: true });
});

test("provenance: manifest without fingerprint BLOCKS", async () => {
  const dir = await makeScratchRepo();
  const manifest = await buildManifest({ repoRoot: dir, sourceSha: "abc123" });
  await writeFile(path.join(dir, "dist", "server", "lovetree-build-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const { checks } = await verifyBuildProvenance({
    repoRoot: dir,
    sourceSha: "abc123",
    expectedWorker: "lovetree-limone",
  });
  const fpCheck = checks.find((c) => c[0] === "build-manifest-firebase-config-fingerprint");
  assert.equal(fpCheck[1], false);
  await rm(dir, { recursive: true, force: true });
});

test("provenance: manifest with wrong fingerprint BLOCKS", async () => {
  const dir = await makeScratchRepo();
  const manifest = await buildManifest({
    repoRoot: dir,
    sourceSha: "abc123",
    firebaseConfigFingerprint: firebaseConfigFingerprint(VALID_CONFIG),
    firebaseProjectId: "relovetree",
  });
  await writeFile(path.join(dir, "dist", "server", "lovetree-build-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const { checks } = await verifyBuildProvenance({
    repoRoot: dir,
    sourceSha: "abc123",
    expectedWorker: "lovetree-limone",
    expectedFirebaseConfigFingerprint: firebaseConfigFingerprint({ ...VALID_CONFIG, apiKey: "different" }),
  });
  const matchCheck = checks.find((c) => c[0] === "build-manifest-firebase-config-match");
  assert.equal(matchCheck[1], false);
  await rm(dir, { recursive: true, force: true });
});

test("provenance: manifest with wrong projectId BLOCKS", async () => {
  const dir = await makeScratchRepo();
  const manifest = await buildManifest({
    repoRoot: dir,
    sourceSha: "abc123",
    firebaseConfigFingerprint: firebaseConfigFingerprint({ ...VALID_CONFIG, projectId: "wrong" }),
    firebaseProjectId: "wrong-project",
  });
  await writeFile(path.join(dir, "dist", "server", "lovetree-build-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const { checks } = await verifyBuildProvenance({
    repoRoot: dir,
    sourceSha: "abc123",
    expectedWorker: "lovetree-limone",
  });
  const projCheck = checks.find((c) => c[0] === "build-manifest-firebase-project-id");
  assert.equal(projCheck[1], false);
  await rm(dir, { recursive: true, force: true });
});

test("provenance: stale manifest (wrong fingerprint) detail does not leak raw apiKey", async () => {
  const dir = await makeScratchRepo();
  const manifest = await buildManifest({
    repoRoot: dir,
    sourceSha: "abc123",
    firebaseConfigFingerprint: firebaseConfigFingerprint(VALID_CONFIG),
    firebaseProjectId: "relovetree",
  });
  await writeFile(path.join(dir, "dist", "server", "lovetree-build-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const { checks } = await verifyBuildProvenance({
    repoRoot: dir,
    sourceSha: "abc123",
    expectedWorker: "lovetree-limone",
    expectedFirebaseConfigFingerprint: "deadbeef".repeat(16),
  });
  const allDetails = checks.map((c) => c[2]).join(" ");
  assert.ok(!allDetails.includes(VALID_CONFIG.apiKey), "raw apiKey must not appear in any check detail");
  await rm(dir, { recursive: true, force: true });
});

// ── no raw API key in any output ───────────────────────────────────────────

test("FIREBASE_CLIENT_ENV_KEYS lists exactly the three required vars", () => {
  assert.deepEqual([...FIREBASE_CLIENT_ENV_KEYS].sort(), [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ]);
});

test("readFirebaseClientConfig trims whitespace", () => {
  const config = readFirebaseClientConfig({
    NEXT_PUBLIC_FIREBASE_API_KEY: "  key  ",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "  domain  ",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "  relovetree  ",
  });
  assert.equal(config.apiKey, "key");
  assert.equal(config.authDomain, "domain");
  assert.equal(config.projectId, "relovetree");
});

test("checkFirebaseBuildConfig output never contains the raw apiKey in problems or fingerprint", () => {
  const result = checkFirebaseBuildConfig(envWith());
  // The config object is returned in-memory for the build script to use
  // (bundle scanning), but the problems array (logged) and fingerprint
  // (manifested) must never contain the raw apiKey.
  assert.ok(!JSON.stringify(result.problems).includes(VALID_CONFIG.apiKey));
  assert.ok(!result.fingerprint.includes(VALID_CONFIG.apiKey));
});
