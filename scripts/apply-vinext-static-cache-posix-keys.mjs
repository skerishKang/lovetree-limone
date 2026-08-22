#!/usr/bin/env node
/**
 * Issue #401 — install-time guard for vinext StaticFileCache POSIX cache keys.
 *
 * vinext@0.0.50 builds its production static-file cache keys from raw
 * `path.relative()` output. On Windows that yields backslash keys such as
 * `/assets\app-abc1234.js`, while every HTTP request path uses forward
 * slashes (`/assets/app-abc1234.js`), so all hashed assets 404 and
 * Windows-native browser QA fails even when the exact head is green on
 * Linux CI.
 *
 * This script applies the minimal semantic delta at the correct boundary
 * (the installed vinext package): normalize ONLY the cache-key separators.
 * On POSIX `path.sep === "/"`, so the transform is an identity — Linux
 * behavior is unchanged. No fs access paths are rewritten and the traversal
 * containment checks in prod-server are untouched.
 *
 * It is wired at two boundaries so environments with `ignore-scripts=true`
 * (where npm lifecycle hooks never run) are still covered:
 *   - npm postinstall — pre-applies after every normal install
 *   - npm start       — re-applies (idempotently) before every prod boot,
 *                       failing closed: if the guard cannot verify the
 *                       vinext contents, the server does not start
 *
 * Fail-closed contract:
 *   - vinext must be installed at the pinned version below
 *   - the known-vulnerable shape must occur exactly once
 *   - already-patched installs are accepted (idempotent)
 *   - any other content drift exits non-zero and blocks the install loudly
 *     instead of silently skipping
 *
 * When the repository intentionally upgrades vinext, update EXPECTED_VINEXT_VERSION
 * and re-verify this guard against the new package contents.
 */

import fs from "node:fs";
import path from "node:path";

const EXPECTED_VINEXT_VERSION = "0.0.50";
const VULNERABLE_SHAPE =
  "relativePath: path.relative(base, batch[j]),";
const PATCHED_SHAPE =
  'relativePath: path.relative(base, batch[j]).replaceAll(path.sep, "/"),';

function fail(message) {
  console.error(`[vinext-posix-key-guard] ${message}`);
  console.error(
    "[vinext-posix-key-guard] refusing to continue with an unverified vinext static cache — update this guard deliberately if vinext changed.",
  );
  process.exit(1);
}

const vinextPackageJsonPath = path.join("node_modules", "vinext", "package.json");
if (!fs.existsSync(vinextPackageJsonPath)) {
  console.log(
    "[vinext-posix-key-guard] vinext is not installed — nothing to guard.",
  );
  process.exit(0);
}

let installedVersion;
try {
  installedVersion = JSON.parse(fs.readFileSync(vinextPackageJsonPath, "utf8")).version;
} catch (error) {
  fail(`cannot read ${vinextPackageJsonPath}: ${error.message}`);
}
if (installedVersion !== EXPECTED_VINEXT_VERSION) {
  fail(
    `installed vinext version ${installedVersion} does not match the pinned ${EXPECTED_VINEXT_VERSION}`,
  );
}

const targetPath = path.join(
  "node_modules",
  "vinext",
  "dist",
  "server",
  "static-file-cache.js",
);
if (!fs.existsSync(targetPath)) {
  fail(`expected vinext static cache file is missing: ${targetPath}`);
}

const content = fs.readFileSync(targetPath, "utf8");

if (content.includes(PATCHED_SHAPE)) {
  const vulnerableRemaining = content.split(VULNERABLE_SHAPE).length - 1;
  if (vulnerableRemaining === 0) {
    console.log(
      "[vinext-posix-key-guard] vinext StaticFileCache cache keys already POSIX-normalized — ok.",
    );
    process.exit(0);
  }
  fail("patched shape present but the vulnerable shape also remains");
}

const occurrences = content.split(VULNERABLE_SHAPE).length - 1;
if (occurrences !== 1) {
  fail(
    `expected exactly 1 occurrence of the vulnerable cache-key shape, found ${occurrences} — vinext content drifted`,
  );
}

fs.writeFileSync(targetPath, content.replace(VULNERABLE_SHAPE, PATCHED_SHAPE));

const verify = fs.readFileSync(targetPath, "utf8");
if (!verify.includes(PATCHED_SHAPE) || verify.includes(VULNERABLE_SHAPE)) {
  fail("post-write verification failed");
}

console.log(
  "[vinext-posix-key-guard] normalized vinext StaticFileCache cache keys to POSIX separators (Windows hashed-asset 404 fix, Issue #401).",
);
