import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import url from "node:url";

const repoRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

/**
 * Issue #401 regression proof.
 *
 * vinext@0.0.50 builds production static-file cache keys from raw
 * path.relative() output. On Windows those keys contain backslashes
 * (`/assets\app.js`) while HTTP request paths use forward slashes, so every
 * hashed asset 404s on a Windows-native production server even when Linux
 * CI is green.
 *
 * The repository applies a minimal install-time normalization to the cache
 * key construction only (scripts/apply-vinext-static-cache-posix-keys.mjs,
 * wired via npm postinstall). These tests pin both layers:
 *
 *   1. StaticFileCache resolves forward-slash request paths for backslash-
 *      produced directory structures (the exact defect), keeps failing on
 *      missing assets, and keeps "/" unresolvable.
 *   2. The guard script is fail-closed: it patches the known-vulnerable
 *      shape exactly once, accepts an already-patched tree idempotently,
 *      and refuses loudly (non-zero exit) on version drift or content drift.
 *
 * On POSIX every assertion behaves identically before and after the fix —
 * these proofs intentionally do not change Linux behavior.
 */

const GUARD_SCRIPT = path.join(repoRoot, "scripts", "apply-vinext-static-cache-posix-keys.mjs");
const VULNERABLE_SHAPE = "relativePath: path.relative(base, batch[j]),";
const PATCHED_SHAPE =
  'relativePath: path.relative(base, batch[j]).replaceAll(path.sep, "/"),';

function makeSandboxVinext({ version, walkerLine }) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "vinext-guard-"));
  const packageDir = path.join(sandbox, "node_modules", "vinext");
  const distServerDir = path.join(packageDir, "dist", "server");
  fs.mkdirSync(distServerDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, "package.json"),
    JSON.stringify({ name: "vinext", version }),
  );
  fs.writeFileSync(
    path.join(distServerDir, "static-file-cache.js"),
    `// synthetic fixture\n${walkerLine}\n`,
  );
  return sandbox;
}

function runGuard(cwd) {
  try {
    const stdout = execFileSync(process.execPath, [GUARD_SCRIPT], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout };
  } catch (error) {
    return {
      code: error.status ?? 1,
      stdout: String(error.stdout ?? ""),
      stderr: String(error.stderr ?? ""),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Layer 1 — StaticFileCache request/cache identity                    */
/* ------------------------------------------------------------------ */

test("static cache resolves forward-slash requests over backslash-produced trees", async () => {
  const { StaticFileCache } = await import(
    url.pathToFileURL(
      path.join(repoRoot, "node_modules", "vinext", "dist", "server", "static-file-cache.js"),
    ).href
  );

  const clientDir = fs.mkdtempSync(path.join(os.tmpdir(), "vinext-assets-"));
  const assetsDir = path.join(clientDir, "assets");
  const deepDir = path.join(assetsDir, "deep");
  fs.mkdirSync(deepDir, { recursive: true });
  // Hashed-name shapes mirror real vite build output.
  fs.writeFileSync(path.join(assetsDir, "app-AbC1234.js"), "export default 1;");
  fs.writeFileSync(path.join(assetsDir, "style-DfG5678.css"), "body{}");
  fs.writeFileSync(path.join(deepDir, "chunk-IjK9012.js"), "export default 2;");

  const cache = await StaticFileCache.create(clientDir);

  // Forward-slash HTTP request paths MUST hit the cache regardless of the
  // OS separator produced while walking the tree.
  const jsEntry = cache.lookup("/assets/app-AbC1234.js");
  const cssEntry = cache.lookup("/assets/style-DfG5678.css");
  const deepEntry = cache.lookup("/assets/deep/chunk-IjK9012.js");
  if (path.sep === "/") {
    // POSIX: keys were always forward-slash; fix must be an identity there.
    assert.ok(jsEntry, "posix js entry must resolve");
    assert.ok(cssEntry, "posix css entry must resolve");
  } else {
    // Windows: this assertion fails on vinext@0.0.50 without the #401 fix —
    // stored keys were `/assets\app-AbC1234.js`.
    assert.ok(jsEntry, "windows js entry must resolve via forward-slash request path");
    assert.ok(cssEntry, "windows css entry must resolve via forward-slash request path");
  }
  assert.ok(deepEntry, "nested asset must resolve via forward-slash request path");

  const sampleKey = [...cache.entries.keys()].find((key) => key.endsWith("app-AbC1234.js"));
  assert.ok(sampleKey);
  assert.equal(
    sampleKey.includes("\\"), false,
    `cache key must not contain backslashes, got: ${sampleKey}`,
  );
});

test("static cache keeps failing closed on missing assets and root", async () => {
  const { StaticFileCache } = await import(
    url.pathToFileURL(
      path.join(repoRoot, "node_modules", "vinext", "dist", "server", "static-file-cache.js"),
    ).href
  );
  const clientDir = fs.mkdtempSync(path.join(os.tmpdir(), "vinext-assets-"));
  const assetsDir = path.join(clientDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, "present-AaA1111.js"), "export default 1;");

  const cache = await StaticFileCache.create(clientDir);
  assert.equal(cache.lookup("/assets/definitely-missing-xyz.js"), undefined);
  assert.equal(cache.lookup("/"), undefined);
});

/* ------------------------------------------------------------------ */
/* Layer 2 — guard script fail-closed contract                         */
/* ------------------------------------------------------------------ */

test("guard patches the known-vulnerable vinext shape exactly once", () => {
  const sandbox = makeSandboxVinext({
    version: "0.0.50",
    walkerLine: VULNERABLE_SHAPE,
  });
  const result = runGuard(sandbox);
  assert.equal(result.code, 0, `guard failed: ${result.stderr}`);
  const target = path.join(
    sandbox, "node_modules", "vinext", "dist", "server", "static-file-cache.js",
  );
  const content = fs.readFileSync(target, "utf8");
  assert.ok(content.includes(PATCHED_SHAPE));
  assert.equal(content.includes(VULNERABLE_SHAPE), false);
});

test("guard is idempotent on already-patched installs", () => {
  const sandbox = makeSandboxVinext({
    version: "0.0.50",
    walkerLine: PATCHED_SHAPE,
  });
  const first = runGuard(sandbox);
  assert.equal(first.code, 0, `first guard run failed: ${first.stderr}`);
  const second = runGuard(sandbox);
  assert.equal(second.code, 0, `second guard run failed: ${second.stderr}`);
});

test("guard refuses loudly on vinext version drift", () => {
  const sandbox = makeSandboxVinext({
    version: "9.9.9",
    walkerLine: VULNERABLE_SHAPE,
  });
  const result = runGuard(sandbox);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /does not match the pinned/);
});

test("guard refuses loudly on unexpected vinext content", () => {
  const sandbox = makeSandboxVinext({
    version: "0.0.50",
    walkerLine: "// upstream rewrote this file entirely",
  });
  const result = runGuard(sandbox);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /content drifted|exactly 1 occurrence/);
});
