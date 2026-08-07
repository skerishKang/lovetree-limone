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

import { createHash } from "node:crypto";
import { chmod, readFile, rm, writeFile } from "node:fs/promises";

export const IDENTITYKIT_BASE = "https://identitytoolkit.googleapis.com/v1";

// Structured reason codes surfaced in CLI output (never raw API messages).
export const CLEANUP_REASON_CODES = Object.freeze([
  "VERIFIED",
  "NO_RETAINED_TOKEN",
  "DELETE_FAILED",
  "LOOKUP_FAILED",
  "DELETE_UNVERIFIED",
]);

export function sha256(input) {
  return createHash("sha256").update(String(input ?? "")).digest("hex");
}

export function emailSha256(email) {
  return sha256(email);
}

// Maps an arbitrary error (including API payloads) to a safe, stable code.
// Raw error messages are never surfaced to stdout/stderr.
export function safeErrorCode(error, fallback = "UNKNOWN_ERROR") {
  const message = String(error?.message ?? error ?? "");
  const known = [
    "INVALID_ID_TOKEN",
    "TOKEN_EXPIRED",
    "USER_NOT_FOUND",
    "EMAIL_NOT_FOUND",
    "INVALID_LOGIN_CREDENTIALS",
    "USER_DISABLED",
    "OPERATION_NOT_ALLOWED",
    "TOO_MANY_ATTEMPTS_TRY_LATER",
    "EMAIL_EXISTS",
    "ACCOUNT_DELETE_FAILED",
    "ACCOUNT_LOOKUP_FAILED",
    "SIGN_IN_FAILED",
  ];
  for (const code of known) {
    if (message.includes(code)) return code;
  }
  return fallback;
}

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

// Confirms deletion using two independent signals (F4):
//   1. primary — accounts:lookup with the retained idToken returns 200 + users=[];
//   2. corroboration — if the token is expired/invalid (TOKEN_EXPIRED,
//      INVALID_ID_TOKEN), a sign-in attempt with the retained password must
//      fail with EMAIL_NOT_FOUND (the documented error for a deleted user).
// Returns { deleted, reasonCode, detail } where reasonCode is one of
// VERIFIED / DELETE_UNVERIFIED / LOOKUP_FAILED.
export async function verifyUserDeleted({ apiKey, email, password, idToken, fetchImpl = fetch }) {
  // Primary signal: lookup with the retained idToken.
  try {
    const users = await lookupUsers({ apiKey, idToken, fetchImpl });
    if (users.length === 0) {
      return { deleted: true, reasonCode: "VERIFIED", detail: "lookup returns no users" };
    }
    return { deleted: false, reasonCode: "DELETE_UNVERIFIED", detail: "lookup still returns the user" };
  } catch (lookupError) {
    // Corroboration signal: re-sign-in must be rejected for a deleted account.
    if (email && password) {
      try {
        await signInWithPassword({ apiKey, email, password, fetchImpl });
        return { deleted: false, reasonCode: "DELETE_UNVERIFIED", detail: "sign-in still succeeds" };
      } catch (signInError) {
        const code = safeErrorCode(signInError);
        if (code === "EMAIL_NOT_FOUND" || code === "USER_NOT_FOUND") {
          return { deleted: true, reasonCode: "VERIFIED", detail: `lookup+sign-in confirm deletion (${code})` };
        }
        return { deleted: false, reasonCode: "LOOKUP_FAILED", detail: `lookup ${safeErrorCode(lookupError)} / sign-in ${code}` };
      }
    }
    return { deleted: false, reasonCode: "LOOKUP_FAILED", detail: `lookup ${safeErrorCode(lookupError)}` };
  }
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
    for (let index = 0; index < users.length; index += 1) {
      const user = users[index];
      const userRef = `user-${index + 1}`;
      const email = user.email ?? "<unknown>";
      const emailHash = emailSha256(email);
      const idToken = user.idToken;
      if (typeof idToken !== "string" || idToken.length === 0) {
        errors.push({ userRef, code: "NO_RETAINED_TOKEN", message: safeErrorCode(new Error("NO_RETAINED_TOKEN")) });
        results.push({ userRef, emailSha256: emailHash, deleted: false, reasonCode: "NO_RETAINED_TOKEN", detail: "no retained idToken" });
        continue;
      }
      try {
        await deleteAccount({ apiKey, idToken, fetchImpl });
        const verdict = await verifyUserDeleted({ apiKey, email, password: user.password, idToken, fetchImpl });
        results.push({ userRef, emailSha256: emailHash, deleted: verdict.deleted, reasonCode: verdict.reasonCode, detail: verdict.detail });
        speak(
          verdict.deleted
            ? `[cleanup] verified deleted: ${userRef} (${emailHash.slice(0, 12)})`
            : `[cleanup] DELETE UNVERIFIED: ${userRef} (${emailHash.slice(0, 12)})`
        );
      } catch (error) {
        const code = safeErrorCode(error);
        errors.push({ userRef, code, message: code });
        results.push({ userRef, emailSha256: emailHash, deleted: false, reasonCode: "DELETE_FAILED", detail: code });
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
