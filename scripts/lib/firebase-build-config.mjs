// Firebase client build-time configuration guard (fail-closed).
//
// Root cause: lib/firebase.ts reads NEXT_PUBLIC_FIREBASE_API_KEY,
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID from
// process.env at build time. The production build (production:build:safe) never
// verified these were present, so a build with missing env vars produced a
// client bundle where firebaseConfigReady=false and all UI auth silently
// failed. This module makes that class of mistake impossible:
//
//   - validateFirebaseClientConfig() checks the three env vars are present,
//     non-empty, and that projectId === "relovetree" (the existing Firebase
//     project). It never returns or prints the raw values.
//   - firebaseConfigFingerprint() produces a sha256 over the config so the
//     build manifest can prove which config was baked in WITHOUT storing the
//     raw API key.
//   - verifyClientBundleHasFirebaseConfig() scans the emitted client assets to
//     confirm the apiKey, authDomain, and projectId were actually inlined (not
//     left as empty string placeholders), proving the build artifact is not
//     carrying a blank Firebase config. The apiKey is compared in-memory only;
//     it never appears in problem messages, logs, or the manifest.
//
// No raw Firebase config value (apiKey, authDomain) is ever written to the
// manifest, logs, or returned in a way that could leak. Only the projectId
// ("relovetree") — which is already public in wrangler.jsonc — and sha256
// fingerprints are emitted.

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const FIREBASE_PROJECT_ID = "relovetree";

export const FIREBASE_CLIENT_ENV_KEYS = Object.freeze([
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
]);

// Collects the three client config values from an env object. Returns
// { apiKey, authDomain, projectId } where missing values are "".
export function readFirebaseClientConfig(env = process.env) {
  return {
    apiKey: typeof env.NEXT_PUBLIC_FIREBASE_API_KEY === "string" ? env.NEXT_PUBLIC_FIREBASE_API_KEY.trim() : "",
    authDomain: typeof env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN === "string" ? env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.trim() : "",
    projectId: typeof env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "string" ? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim() : "",
  };
}

// Validates the Firebase client config for a production build. Returns
// { ok, problems, config } where config has the raw values (caller must not
// log them) and problems is an array of human-readable strings that never
// include the raw values.
export function validateFirebaseClientConfig(env = process.env) {
  const config = readFirebaseClientConfig(env);
  const problems = [];

  if (!config.apiKey) {
    problems.push("NEXT_PUBLIC_FIREBASE_API_KEY is missing or empty");
  }
  if (!config.authDomain) {
    problems.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing or empty");
  }
  if (!config.projectId) {
    problems.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or empty");
  } else if (config.projectId !== FIREBASE_PROJECT_ID) {
    // Report the mismatch without echoing the actual (possibly wrong) value.
    problems.push(
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID does not match expected project '${FIREBASE_PROJECT_ID}'`
    );
  }

  return { ok: problems.length === 0, problems, config };
}

// sha256 fingerprint over the config. The manifest stores ONLY this digest
// (never the raw apiKey/authDomain) so that a stale or mismatched config can
// be detected without leaking secrets.
export function firebaseConfigFingerprint(config) {
  const canonical = JSON.stringify({
    apiKey: config.apiKey ?? "",
    authDomain: config.authDomain ?? "",
    projectId: config.projectId ?? "",
  });
  return createHash("sha256").update(canonical).digest("hex");
}

// Walks the client assets directory and reads every file. Returns the
// concatenated content (used for bundle scanning).
async function readClientBundleText(clientDir) {
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
  const parts = [];
  for (const file of files) {
    try {
      parts.push(await readFile(file, "utf8"));
    } catch {
      // skip binary/unreadable
    }
  }
  return parts.join("\n");
}

// Scans the emitted client bundle to confirm the Firebase config was actually
// inlined (not left as empty string placeholders). All three values — the
// apiKey, authDomain, and projectId — must appear as string literals in the
// bundle:
//
//   - projectId/authDomain are public values (already present in
//     wrangler.jsonc), so their problem messages may echo them;
//   - the apiKey is compared only in memory. If it is missing, a *safe*
//     problem message is emitted that never contains the raw apiKey.
//
// Guard contract: this function verifies that the build-time input config and
// the emitted artifact match — i.e. that the config was actually inlined. It
// does NOT verify that the apiKey is a valid Firebase key: a build whose env,
// manifest fingerprint, and bundle are all consistently built with the same
// (possibly invalid) key will pass here by design. Real Firebase API key
// validity is established only by a runtime auth smoke test.
//
// Returns { ok, problems }.
export async function verifyClientBundleHasFirebaseConfig({ clientDir, config }) {
  const problems = [];
  let bundleText = "";
  try {
    bundleText = await readClientBundleText(clientDir);
  } catch {
    problems.push("client bundle directory could not be read");
    return { ok: false, problems };
  }

  if (bundleText.length === 0) {
    problems.push("client bundle is empty — build produced no client assets");
    return { ok: false, problems };
  }

  // The projectId must appear as a string literal in the bundle. If the env
  // var was missing at build time, lib/firebase.ts falls back to "" and the
  // projectId string would be absent.
  if (!bundleText.includes(config.projectId)) {
    problems.push(
      `client bundle does not contain the Firebase projectId '${config.projectId}' — config was not inlined at build time`
    );
  }

  // The authDomain must also appear (it is a public value).
  if (config.authDomain && !bundleText.includes(config.authDomain)) {
    problems.push("client bundle does not contain the Firebase authDomain — config was not inlined at build time");
  }

  // The apiKey must ALSO appear in the bundle. This closes the gap where a
  // build with a valid projectId/authDomain but a missing apiKey would pass
  // even though UI auth would still be broken. The comparison is internal
  // only: the safe message below never contains the raw apiKey, and the value
  // is never written to stdout/stderr, problem text, or the manifest. An
  // empty config apiKey is treated as missing (fail-closed) — the pre-build
  // validation would already have blocked that case.
  if (!config.apiKey || !bundleText.includes(config.apiKey)) {
    problems.push(
      "client bundle does not contain the Firebase apiKey — config was not fully inlined at build time"
    );
  }

  return { ok: problems.length === 0, problems };
}

// Full build-time guard: validates env, returns a result suitable for the
// build script. Never prints raw values.
export function checkFirebaseBuildConfig(env = process.env) {
  const validation = validateFirebaseClientConfig(env);
  const fingerprint = validation.ok
    ? firebaseConfigFingerprint(validation.config)
    : null;
  return {
    ok: validation.ok,
    problems: validation.problems,
    config: validation.config,
    fingerprint,
    projectId: validation.config.projectId || null,
  };
}
