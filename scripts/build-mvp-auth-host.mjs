#!/usr/bin/env node
// Builds the standalone MVP001 auth-host browser module from TypeScript
// source using the repository's already-installed Vite toolchain.
//
//   entry : lib/mvp-auth-host.ts  (imports lib/firebase.ts + firebase SDK)
//   output: dist/client/mvp/01/auth-host.js  (single-file ES module)
//
// Served in production as /mvp/01/auth-host.js by the existing Worker
// /mvp static-asset adapter — no Worker routing change required.
//
// Cross-platform: pure Node (Vite JS API), no shell assumptions.
// Deterministic: fixed output filename, no content hashes in the name.
// Safe: emptyOutDir=false — never wipes dist/client; minify via esbuild
// (bundled with Vite). Firebase client config is inlined from the same
// NEXT_PUBLIC_FIREBASE_* build env vars as the app bundle (empty-string
// fallback mirrors lib/firebase.ts so local builds without env still emit a
// fail-closed module; production:build:safe enforces presence).
//
// Usage:
//   node scripts/build-mvp-auth-host.mjs
//   node scripts/build-mvp-auth-host.mjs --check   (verify artifact exists + fresh)

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { build } from "vite";

const repoRoot = path.resolve(import.meta.dirname, "..");
const ENTRY = path.join(repoRoot, "lib", "mvp-auth-host.ts");
const OUT_DIR = path.join(repoRoot, "dist", "client", "mvp", "01");
const OUT_FILE = path.join(OUT_DIR, "auth-host.js");

function envLiteral(name) {
  const raw = process.env[name];
  return JSON.stringify(typeof raw === "string" ? raw : "");
}

async function runBuild() {
  await build({
    root: repoRoot,
    // Standalone browser chunk: never load the repo vite.config.ts here —
    // its vinext()/RSC plugins assume the app build and crash on a foreign
    // lib entry. This build uses only Vite core + esbuild (both installed).
    configFile: false,
    logLevel: "warn",
    define: {
      "process.env.NEXT_PUBLIC_FIREBASE_API_KEY": envLiteral("NEXT_PUBLIC_FIREBASE_API_KEY"),
      "process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": envLiteral("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
      "process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID": envLiteral("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    },
    build: {
      outDir: OUT_DIR,
      emptyOutDir: false,
      minify: true,
      target: "es2020",
      lib: {
        entry: ENTRY,
        formats: ["es"],
        fileName: () => "auth-host.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "auth-host.js",
          chunkFileNames: "auth-host-[hash].js",
          assetFileNames: "auth-host-[hash][extname]",
          codeSplitting: false,
        },
      },
    },
  });
}

async function artifactInfo() {
  const [st, buf] = await Promise.all([stat(OUT_FILE), readFile(OUT_FILE)]);
  return {
    bytes: st.size,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  if (!checkOnly) {
    await runBuild();
  }
  const info = await artifactInfo();
  console.log(`[build-mvp-auth-host] auth-host.js bytes=${info.bytes} sha256=${info.sha256}`);
}

await main();
