// Build provenance manifest helpers (F3).
//
// The production deploy guard must not trust "whatever is in dist/": a stale
// dist tree from an older commit can carry the correct worker name and vars
// while bundling old code. This module gives the build a *provable* identity:
//
//   - `production:build:safe` (scripts/build-production-safe.mjs) runs the
//     production build and then writes `dist/server/lovetree-build-manifest.json`
//     containing the exact HEAD, the resolved worker name, and content hashes
//     of the emitted artifacts;
//   - the deploy guard re-verifies those hashes against the current dist tree,
//     so a stale or hand-modified dist is BLOCKED (never mtime-based).
//
// No secrets are ever written to the manifest.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const BUILD_MANIFEST_REL = path.join("dist", "server", "lovetree-build-manifest.json");

export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export async function sha256File(filePath) {
  return sha256(await readFile(filePath));
}

// Deterministic digest over the whole client build tree (relative path +
// per-file sha256, sorted). Platform-independent (forward slashes).
export async function computeClientAssetsDigest(clientDir) {
  const files = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  await walk(clientDir);
  files.sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const rel = path.relative(clientDir, file).split(path.sep).join("/");
    hash.update(rel);
    hash.update("\0");
    hash.update(sha256(await readFile(file)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

// Builds the manifest object for the current dist tree. Throws when the
// expected build outputs are missing.
//
// firebaseConfigFingerprint (optional): a sha256 digest of the Firebase client
// config (apiKey, authDomain, projectId) passed in via the
// LOVETREE_FIREBASE_CONFIG_FINGERPRINT env var by production:build:safe. Only
// the digest is stored — never the raw API key — so the deploy guard can
// detect a stale or mismatched config without leaking secrets.
export async function buildManifest({
  repoRoot,
  sourceSha,
  builtAt = new Date().toISOString(),
  firebaseConfigFingerprint = process.env.LOVETREE_FIREBASE_CONFIG_FINGERPRINT ?? null,
  firebaseProjectId = process.env.LOVETREE_FIREBASE_PROJECT_ID ?? null,
}) {
  const serverDir = path.join(repoRoot, "dist", "server");
  const clientDir = path.join(repoRoot, "dist", "client");
  const wranglerConfigPath = path.join(serverDir, "wrangler.json");
  const serverEntryPath = path.join(serverDir, "index.js");

  if (!existsSync(wranglerConfigPath)) {
    throw new Error("dist/server/wrangler.json missing — run the production build first");
  }
  if (!existsSync(serverEntryPath)) {
    throw new Error("dist/server/index.js missing — run the production build first");
  }

  const wranglerConfig = await readFile(wranglerConfigPath, "utf8");
  const parsed = JSON.parse(wranglerConfig);
  return {
    sourceSha,
    environment: "production",
    worker: typeof parsed.name === "string" ? parsed.name : null,
    builtAt,
    serverEntrySha256: await sha256File(serverEntryPath),
    wranglerConfigSha256: sha256(wranglerConfig),
    clientAssetsDigest: await computeClientAssetsDigest(clientDir),
    firebaseConfigFingerprint:
      typeof firebaseConfigFingerprint === "string" && firebaseConfigFingerprint.length > 0
        ? firebaseConfigFingerprint
        : null,
    firebaseProjectId:
      typeof firebaseProjectId === "string" && firebaseProjectId.length > 0
        ? firebaseProjectId
        : null,
  };
}

export function readManifest(repoRoot) {
  const manifestPath = path.join(repoRoot, BUILD_MANIFEST_REL);
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

// Fail-closed provenance checks: manifest must exist and every hash must match
// the *current* dist tree. Returns an array of [name, ok, detail] checks.
//
// firebaseConfigFingerprint (optional): when provided, the manifest's
// firebaseConfigFingerprint must match this digest, proving the build was done
// with the same Firebase client config that the deploy environment expects.
export async function verifyBuildProvenance({
  repoRoot,
  sourceSha,
  expectedWorker,
  expectedFirebaseConfigFingerprint = null,
}) {
  const checks = [];
  const manifest = readManifest(repoRoot);
  if (!manifest) {
    checks.push(["build-manifest-present", false, "dist/server/lovetree-build-manifest.json missing (run production:build:safe)"]);
    return { checks };
  }
  checks.push([
    "build-manifest-source-sha",
    manifest.sourceSha === sourceSha,
    `sourceSha=${manifest.sourceSha} expected=${sourceSha}`,
  ]);
  checks.push([
    "build-manifest-env",
    manifest.environment === "production",
    `environment=${manifest.environment} expected=production`,
  ]);
  checks.push([
    "build-manifest-worker",
    manifest.worker === expectedWorker,
    `worker=${manifest.worker} expected=${expectedWorker}`,
  ]);

  // Firebase client config fingerprint: the manifest must carry a non-null
  // fingerprint (proving the build ran with a valid Firebase config), and
  // when an expected fingerprint is supplied it must match (detecting a stale
  // build done with different config). Only the digest is compared — never the
  // raw config values.
  const hasFingerprint =
    typeof manifest.firebaseConfigFingerprint === "string" &&
    manifest.firebaseConfigFingerprint.length > 0;
  checks.push([
    "build-manifest-firebase-config-fingerprint",
    hasFingerprint,
    hasFingerprint
      ? "manifest carries a Firebase config fingerprint"
      : "manifest is missing firebaseConfigFingerprint (build ran without Firebase config guard)",
  ]);
  if (expectedFirebaseConfigFingerprint) {
    const matches = hasFingerprint && manifest.firebaseConfigFingerprint === expectedFirebaseConfigFingerprint;
    checks.push([
      "build-manifest-firebase-config-match",
      matches,
      matches
        ? "manifest Firebase config fingerprint matches expected"
        : "manifest Firebase config fingerprint does not match expected (stale build or config drift)",
    ]);
  }
  // The projectId in the manifest must be the expected Firebase project.
  checks.push([
    "build-manifest-firebase-project-id",
    manifest.firebaseProjectId === "relovetree",
    `firebaseProjectId=${manifest.firebaseProjectId ?? "(missing)"} expected=relovetree`,
  ]);

  const serverEntry = path.join(repoRoot, "dist", "server", "index.js");
  const wranglerConfig = path.join(repoRoot, "dist", "server", "wrangler.json");
  const serverOk =
    existsSync(serverEntry) &&
    typeof manifest.serverEntrySha256 === "string" &&
    (await sha256File(serverEntry)) === manifest.serverEntrySha256;
  checks.push([
    "build-manifest-server-entry",
    serverOk,
    serverOk ? "server entry hash matches manifest" : "server entry hash mismatch (stale dist?)",
  ]);
  const configOk =
    existsSync(wranglerConfig) &&
    typeof manifest.wranglerConfigSha256 === "string" &&
    sha256(await readFile(wranglerConfig, "utf8")) === manifest.wranglerConfigSha256;
  checks.push([
    "build-manifest-config",
    configOk,
    configOk ? "wrangler config hash matches manifest" : "wrangler config hash mismatch (stale dist?)",
  ]);
  const digest = await computeClientAssetsDigest(path.join(repoRoot, "dist", "client"));
  const assetsOk = digest === manifest.clientAssetsDigest;
  checks.push([
    "build-manifest-assets",
    assetsOk,
    assetsOk ? "client assets digest matches manifest" : "client assets digest mismatch (stale dist?)",
  ]);
  return { checks };
}
