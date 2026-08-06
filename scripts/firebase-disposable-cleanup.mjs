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

import { runDisposableCleanup, safeErrorCode } from "./lib/firebase-disposable-auth.mjs";

async function main() {
  const [credsPath] = process.argv.slice(2);
  if (!credsPath) {
    console.error(
      "usage: node scripts/firebase-disposable-cleanup.mjs <creds.json>"
    );
    process.exitCode = 2;
    return;
  }
  let creds;
  try {
    creds = JSON.parse(await readFile(credsPath, "utf8"));
  } catch (error) {
    console.error(`[firebase-disposable-cleanup] ${safeErrorCode(error, "CREDS_READ_FAILED")}`);
    process.exitCode = 2;
    return;
  }
  const result = await runDisposableCleanup({
    users: creds.users ?? [],
    apiKey: creds.apiKey,
    credsFile: credsPath,
    log: (line) => console.log(line),
  });
  // No email/uid/password/token/API key values are ever printed: only the
  // user index (userRef), a SHA-256 of the email, and a structured reason
  // code. Raw API error payloads are reduced to safe codes.
  console.log(
    JSON.stringify({
      ok: result.ok,
      users: result.results.map((entry) => ({
        userRef: entry.userRef,
        emailSha256: entry.emailSha256,
        deleted: entry.deleted,
        reasonCode: entry.reasonCode,
      })),
      dbCleaned: result.dbCleaned,
      fileRemoved: result.fileRemoved,
      errors: result.errors.map((entry) => ({ userRef: entry.userRef, code: entry.code })),
    })
  );
  process.exitCode = result.ok ? 0 : 1;
}

main().catch((error) => {
  console.error(`[firebase-disposable-cleanup] ${safeErrorCode(error, "CLEANUP_ERROR")}`);
  process.exitCode = 2;
});
