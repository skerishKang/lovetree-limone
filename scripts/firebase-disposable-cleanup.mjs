#!/usr/bin/env node
// Deletes previously created disposable Firebase users, verifying each
// deletion before removing the credentials file. Fails (non-zero exit) when
// any step is incomplete.
//
// Usage:
//   node scripts/firebase-disposable-cleanup.mjs <creds.json>
//
// creds.json shape (see writeCredentialsFile in lib/firebase-disposable-auth.mjs):
//   { "apiKey": "...", "users": [{ "email": "...", "password": "...",
//      "uid": "...", "idToken": "..." }] }
//
// No password/token/API key value is ever printed.

import { readFile } from "node:fs/promises";

import { runDisposableCleanup } from "./lib/firebase-disposable-auth.mjs";

async function main() {
  const [credsPath] = process.argv.slice(2);
  if (!credsPath) {
    console.error(
      "usage: node scripts/firebase-disposable-cleanup.mjs <creds.json>"
    );
    process.exitCode = 2;
    return;
  }
  const creds = JSON.parse(await readFile(credsPath, "utf8"));
  const result = await runDisposableCleanup({
    users: creds.users ?? [],
    apiKey: creds.apiKey,
    credsFile: credsPath,
    log: (line) => console.log(line),
  });
  console.log(
    JSON.stringify({
      ok: result.ok,
      users: result.results.map((entry) => ({
        email: entry.email,
        deleted: entry.deleted,
        reason: entry.reason,
      })),
      dbCleaned: result.dbCleaned,
      fileRemoved: result.fileRemoved,
      errors: result.errors,
    })
  );
  process.exitCode = result.ok ? 0 : 1;
}

main().catch((error) => {
  console.error(`[firebase-disposable-cleanup] ${error.message}`);
  process.exitCode = 2;
});
