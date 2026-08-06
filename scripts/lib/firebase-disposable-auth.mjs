#!/usr/bin/env node
// Reusable disposable-Firebase-user cleanup harness for production smoke
// tests.
//
// Incident context (2026-08-06): during the production auth smoke, two
// synthetic users were orphaned because `accounts:delete` was called with the
// idToken in the Authorization header (rejected by the API), and the
// credentials file was removed before deletion was verified, making re-sign-in
// impossible. This module prevents that class of failure:
//
//   - idToken values are retained in memory from creation until cleanup
//     completes (never re-derived from destroyed credentials);
//   - `accounts:delete` sends the idToken in the JSON body (never the
//     Authorization header);
//   - deletion is verified with `accounts:lookup` before the credentials file
//     is removed;
//   - the credentials file is written with mode 0600 and removed only after
//     every user is verified deleted;
//   - passwords, tokens, API keys and emails are redacted from all logs;
//   - DB test-row cleanup is prioritized (runs first, and again in finally);
//   - any incomplete cleanup returns `ok: false` — a success marker is never
//     emitted for a failed cleanup.

import { chmod, readFile, rm, writeFile } from "node:fs/promises";

export const IDENTITYKIT_BASE = "https://identitytoolkit.googleapis.com/v1";

export function redactSecrets(text, secrets = []) {
  let output = String(text ?? "");
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length >= 6) {
      output = output.split(secret).join("[REDACTED]");
    }
  }
  return output;
}

// Collects every secret-ish value attached to the users and the API key.
export function collectSecretValues(users, apiKey) {
  const secrets = [apiKey];
  for (const user of users ?? []) {
    for (const key of ["email", "password", "idToken", "uid"]) {
      if (typeof user?.[key] === "string" && user[key].length > 0) {
        secrets.push(user[key]);
      }
    }
  }
  return secrets;
}

export function redactLog(line, users, apiKey) {
  return redactSecrets(line, collectSecretValues(users, apiKey));
}

export async function signInWithPassword({ apiKey, email, password, fetchImpl = fetch }) {
  const response = await fetchImpl(
    `${IDENTITYKIT_BASE}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.idToken !== "string") {
    const error = new Error(
      `sign-in failed: ${payload?.error?.message ?? `HTTP ${response.status}`}`
    );
    error.code = "SIGN_IN_FAILED";
    throw error;
  }
  return payload;
}

// Deletes the account. The idToken MUST be in the JSON body; the
// Authorization header is NOT used (the API rejects it).
export async function deleteAccount({ apiKey, idToken, fetchImpl = fetch }) {
  const response = await fetchImpl(
    `${IDENTITYKIT_BASE}/accounts:delete?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const error = new Error(
      `accounts:delete failed: ${payload?.error?.message ?? `HTTP ${response.status}`}`
    );
    error.code = "ACCOUNT_DELETE_FAILED";
    throw error;
  }
  return payload;
}

export async function lookupUsers({ apiKey, idToken, fetchImpl = fetch }) {
  const response = await fetchImpl(
    `${IDENTITYKIT_BASE}/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      `accounts:lookup failed: ${payload?.error?.message ?? `HTTP ${response.status}`}`
    );
    error.code = "ACCOUNT_LOOKUP_FAILED";
    throw error;
  }
  return Array.isArray(payload?.users) ? payload.users : [];
}

export async function verifyUserDeleted({ apiKey, idToken, fetchImpl = fetch }) {
  const users = await lookupUsers({ apiKey, idToken, fetchImpl });
  return users.length === 0;
}

export async function writeCredentialsFile({
  users,
  apiKey,
  filePath,
  writeFileImpl = writeFile,
  chmodImpl = chmod,
}) {
  const payload = {
    apiKey,
    users: users.map((user) => ({
      email: user.email ?? null,
      password: user.password ?? null,
      uid: user.uid ?? null,
      idToken: user.idToken ?? null,
    })),
  };
  await writeFileImpl(filePath, JSON.stringify(payload, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmodImpl(filePath, 0o600);
  return filePath;
}

export async function readCredentialsFile(filePath, readFileImpl = readFile) {
  return JSON.parse(await readFileImpl(filePath, "utf8"));
}

export async function removeCredentialsFile(filePath, rmImpl = rm) {
  if (filePath) await rmImpl(filePath, { force: true });
}

// Orchestrated cleanup. Order matters:
//   1. DB test-row cleanup runs first (and again in finally as a fallback).
//   2. Every disposable user is deleted and deletion is verified.
//   3. Only then is the credentials file removed.
// Returns ok:false on any incomplete step; never a success marker.
export async function runDisposableCleanup({
  users,
  apiKey,
  credsFile = null,
  fetchImpl = fetch,
  cleanupDbRows = null,
  log = () => {},
}) {
  const speak = (line) => log(redactLog(line, users, apiKey));
  const results = [];
  const errors = [];
  let dbCleaned = false;
  let fileRemoved = false;
  let allDeleted = false;

  try {
    // 1. DB test rows first (the brief requires this ordering).
    if (typeof cleanupDbRows === "function") {
      try {
        await cleanupDbRows();
        dbCleaned = true;
        speak("[cleanup] DB test rows cleaned");
      } catch (error) {
        errors.push(`db: ${error.message}`);
        speak(`[cleanup] DB cleanup failed: ${error.message}`);
      }
    }

    // 2. Delete + verify every user while idToken is still in memory.
    for (const user of users) {
      const email = user.email ?? "<unknown>";
      const idToken = user.idToken;
      if (typeof idToken !== "string" || idToken.length === 0) {
        errors.push(`${email}: no retained idToken`);
        results.push({ email, deleted: false, reason: "no retained idToken" });
        continue;
      }
      try {
        await deleteAccount({ apiKey, idToken, fetchImpl });
        const gone = await verifyUserDeleted({ apiKey, idToken, fetchImpl });
        results.push({ email, deleted: gone, reason: gone ? "verified" : "lookup still returns the user" });
        speak(
          gone
            ? `[cleanup] verified deleted: ${email}`
            : `[cleanup] DELETE UNVERIFIED: ${email}`
        );
      } catch (error) {
        errors.push(`${email}: ${error.message}`);
        results.push({ email, deleted: false, reason: error.message });
      }
    }
    allDeleted =
      results.length === users.length && results.every((result) => result.deleted);

    // 3. Credentials are removed only after every user is verified deleted.
    if (allDeleted && credsFile) {
      try {
        await removeCredentialsFile(credsFile);
        fileRemoved = true;
        speak("[cleanup] credentials file removed");
      } catch (error) {
        errors.push(`credentials file: ${error.message}`);
      }
    } else if (!allDeleted) {
      speak("[cleanup] credentials file kept until every user is verified deleted");
    }
  } finally {
    // 4. DB test-row cleanup is prioritized; it runs even on failures.
    if (!dbCleaned && typeof cleanupDbRows === "function") {
      try {
        await cleanupDbRows();
        dbCleaned = true;
      } catch (error) {
        errors.push(`db(finally): ${error.message}`);
      }
    }
  }

  const ok =
    allDeleted &&
    (typeof cleanupDbRows !== "function" || dbCleaned) &&
    (credsFile ? fileRemoved : true) &&
    errors.length === 0;
  speak(
    ok
      ? "[cleanup] COMPLETE"
      : "[cleanup] INCOMPLETE — do not report success"
  );
  return { ok, allDeleted, dbCleaned, fileRemoved, results, errors };
}
