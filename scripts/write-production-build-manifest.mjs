#!/usr/bin/env node
// Writes dist/server/lovetree-build-manifest.json after a successful
// production build. The manifest proves which exact HEAD produced the dist
// tree and pins content hashes of the emitted artifacts so the deploy guard
// can reject stale output (F3). No secrets are written.
//
// Usage (normally via `npm run production:build:safe`):
//   node scripts/write-production-build-manifest.mjs
//
// The manifest is derived from the current dist tree; it must be run AFTER
// `CLOUDFLARE_ENV=production npm run build`.

import { spawnSync } from "node:child_process";
import path from "node:path";

import { buildManifest, BUILD_MANIFEST_REL } from "./lib/build-provenance.mjs";
import { writeFile, mkdir } from "node:fs/promises";

const repoRoot = path.resolve(import.meta.dirname, "..");

function gitHead() {
  const result = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout?.trim()) {
    throw new Error("could not resolve git HEAD (not a git worktree?)");
  }
  return result.stdout.trim();
}

async function main() {
  const sourceSha = gitHead();
  const manifest = await buildManifest({ repoRoot, sourceSha });
  const manifestPath = path.join(repoRoot, BUILD_MANIFEST_REL);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[production-build-manifest] wrote ${BUILD_MANIFEST_REL} (source=${sourceSha.slice(0, 12)})`);
}

main().catch((error) => {
  console.error(`[production-build-manifest] ${error.message}`);
  process.exitCode = 2;
});
