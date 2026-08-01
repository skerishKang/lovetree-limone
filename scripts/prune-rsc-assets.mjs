#!/usr/bin/env node
// Post-build integrity step for the vinext RSC assets manifest.
//
// Root cause of stale /assets/* 404s on V2 routes:
// @vitejs/plugin-rsc generates `clientReferenceDeps` from the client bundle
// during its `generateBundle` hook. That bundle still contains empty
// "pure CSS" placeholder chunks (e.g. home-*.js / tree-*.js) which Vite's
// `vite:css-post` deletes right after. The manifest therefore references
// asset URLs that are never emitted, and the SSR-generated HTML prefetch
// lists 404 on them.
//
// This script prunes every local /assets/* reference from the emitted
// manifests so that HTML/RSC prefetch only ever references assets that
// actually exist in the deployed output. It never creates files, never
// rewrites responses, and only removes references to missing assets.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const clientAssetsDir = path.join(root, "dist", "client", "assets");
const manifests = [
  path.join(root, "dist", "server", "__vite_rsc_assets_manifest.js"),
  path.join(root, "dist", "server", "ssr", "__vite_rsc_assets_manifest.js"),
];

function keepOnlyExisting(entries, available) {
  const out = [];
  let changed = false;
  for (const url of entries) {
    const keep = !url.startsWith("/assets/") || available.has(path.basename(url));
    if (!keep) changed = true;
    else out.push(url);
  }
  return { out, changed };
}

async function pruneManifest(file, available, removed) {
  if (!existsSync(file)) return;
  const code = await readFile(file, "utf8");
  let data;
  try {
    data = JSON.parse(code.replace(/^export default\s+/, ""));
  } catch {
    return;
  }

  let changed = false;
  for (const section of ["clientReferenceDeps", "serverResources"]) {
    const map = data?.[section];
    if (!map || typeof map !== "object") continue;
    for (const deps of Object.values(map)) {
      if (!deps || typeof deps !== "object") continue;
      for (const kind of ["js", "css"]) {
        const list = deps[kind];
        if (!Array.isArray(list)) continue;
        const { out, changed: c } = keepOnlyExisting(list, available);
        if (c) {
          deps[kind] = out;
          changed = true;
          for (const url of list) if (!out.includes(url)) removed.push(`${path.basename(file)} -> ${url}`);
        }
      }
    }
  }

  if (changed) {
    await writeFile(file, `export default ${JSON.stringify(data, null, 2)}`);
  }
}

async function main() {
  const removed = [];
  if (!existsSync(clientAssetsDir)) {
    console.log("[prune-rsc-assets] dist/client/assets not found; nothing to prune.");
    return;
  }
  const available = new Set(await readdir(clientAssetsDir));
  for (const file of manifests) await pruneManifest(file, available, removed);
  if (removed.length === 0) {
    console.log("[prune-rsc-assets] no stale asset references.");
  } else {
    console.log(`[prune-rsc-assets] removed ${removed.length} stale reference(s):`);
    for (const line of removed) console.log(`  ${line}`);
  }
}

await main();
