#!/usr/bin/env node
// Cross-platform production build wrapper (F3).
//
// Runs `CLOUDFLARE_ENV=production npm run build` and, only on success, writes
// the build provenance manifest (dist/server/lovetree-build-manifest.json).
// Using a Node wrapper (instead of shell `FOO=bar npm ...`) keeps the command
// portable across Windows / WSL / POSIX shells.
//
// Usage:
//   npm run production:build:safe

import { spawnSync } from "node:child_process";
import path from "node:path";

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

const build = run("npm", ["run", "build"]);
if (build.status !== 0) {
  console.error("[production:build:safe] build failed; no manifest written");
  process.exit(build.status ?? 1);
}
const manifest = run("node", ["scripts/write-production-build-manifest.mjs"]);
process.exit(manifest.status ?? 1);
