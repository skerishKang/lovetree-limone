#!/usr/bin/env node
// Cross-platform production build wrapper (F3 + Firebase client config guard).
//
// Runs `CLOUDFLARE_ENV=production npm run build` and, only on success, writes
// the build provenance manifest (dist/server/lovetree-build-manifest.json).
// Using a Node wrapper (instead of shell `FOO=bar npm ...`) keeps the command
// portable across Windows / WSL / POSIX shells.
//
// Firebase client config guard (fail-closed):
//   Before the build, the three NEXT_PUBLIC_FIREBASE_* env vars are validated
//   (present, non-empty, projectId === "relovetree"). If any are missing the
//   build is BLOCKED — a production build with a blank Firebase config would
//   ship a client bundle where firebaseConfigReady=false and all UI auth
//   silently fails.
//   After the build, the emitted client bundle is scanned to confirm the
//   Firebase config was actually inlined (not left as empty placeholders).
//   The manifest stores only a sha256 fingerprint of the config — never the
//   raw API key.
//
// Usage:
//   npm run production:build:safe

import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  checkFirebaseBuildConfig,
  verifyClientBundleHasFirebaseConfig,
} from "./lib/firebase-build-config.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const env = { ...process.env, CLOUDFLARE_ENV: "production" };

function run(script, args) {
  return spawnSync(script, args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

// ── Pre-build: Firebase client config guard (fail-closed) ──────────────────
// The build inlines NEXT_PUBLIC_FIREBASE_* into the client bundle. If these
// are missing the bundle ships with firebaseConfigReady=false. Block before
// wasting a build cycle. No raw config values are printed.
const fbCheck = checkFirebaseBuildConfig(env);
if (!fbCheck.ok) {
  console.error("[production:build:safe] BLOCKED — Firebase client config is incomplete:");
  for (const problem of fbCheck.problems) {
    console.error(`  ✗ ${problem}`);
  }
  console.error("");
  console.error("  The production build requires all three NEXT_PUBLIC_FIREBASE_* env vars");
  console.error("  to be set so they are inlined into the client bundle at build time.");
  console.error("  Set them in the build environment (e.g. .env.production.local, never committed):");
  console.error("    NEXT_PUBLIC_FIREBASE_API_KEY");
  console.error("    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  console.error("    NEXT_PUBLIC_FIREBASE_PROJECT_ID  (must be 'relovetree')");
  process.exit(1);
}
console.log(`[production:build:safe] Firebase client config OK (projectId=${fbCheck.projectId})`);

// ── Build ──────────────────────────────────────────────────────────────────
const build = run("npm", ["run", "build"]);
if (build.status !== 0) {
  console.error("[production:build:safe] build failed; no manifest written");
  process.exit(build.status ?? 1);
}

// ── Post-build: verify the client bundle inlined the Firebase config ───────
// Scans dist/client for the projectId and authDomain substrings to confirm
// the config was baked in (not left as ""). No raw API key is searched for.
const clientDir = path.join(repoRoot, "dist", "client");
const bundleCheck = await verifyClientBundleHasFirebaseConfig({
  clientDir,
  config: fbCheck.config,
});
if (!bundleCheck.ok) {
  console.error("[production:build:safe] BLOCKED — client bundle does not contain the Firebase config:");
  for (const problem of bundleCheck.problems) {
    console.error(`  ✗ ${problem}`);
  }
  console.error("");
  console.error("  The build completed but the Firebase config was not inlined into the client");
  console.error("  bundle. This produces a production build where UI auth silently fails.");
  process.exit(1);
}
console.log("[production:build:safe] client bundle Firebase config verified (inlined)");

// ── Manifest ───────────────────────────────────────────────────────────────
// Pass the fingerprint to the manifest writer via an env var so the manifest
// stores only the sha256 digest — never the raw config values.
const manifestEnv = {
  ...env,
  LOVETREE_FIREBASE_CONFIG_FINGERPRINT: fbCheck.fingerprint,
  LOVETREE_FIREBASE_PROJECT_ID: fbCheck.projectId,
};
const manifest = spawnSync("node", ["scripts/write-production-build-manifest.mjs"], {
  cwd: repoRoot,
  env: manifestEnv,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(manifest.status ?? 1);
