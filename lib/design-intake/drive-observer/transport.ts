/**
 * Read-Only Drive Observer Transport (Issue #173).
 *
 * Two transports implement the same read-only contract:
 * - `createFixtureDriveTransport` — deterministic, offline, fixture-backed
 *   (tests + CLI `--mode fixture`); zero network.
 * - `createHttpDriveTransport` — the real Drive API v3 client. It issues GET
 *   requests only (metadata listing + `alt=media` content download). There is
 *   no code path that writes, moves, renames, shares or trashes anything:
 *   the NO_DRIVE_WRITE boundary is structural.
 *
 * Auth architecture (preferred topology, NOT provisioned in this phase):
 *   GitHub Actions OIDC → Google Workload Identity Federation → dedicated
 *   read-only identity → Drive read-only scope.
 * The only accepted runtime credential is a SHORT-LIVED access token in
 * `DESIGN_INTAKE_DRIVE_ACCESS_TOKEN` (injected by a future trusted workflow
 * job). Long-lived key material (service-account JSON, OAuth refresh tokens)
 * is detected and REFUSED — see `redact.assertNoLongLivedCredentialEnv`.
 *
 * Every error message is secret-redacted before it is thrown; the exact
 * bearer token is registered for exact-match redaction as soon as it is held.
 */

import {
  type DriveAccessTokenProvider,
  type DriveListOutcome,
  type DriveRawFileRecord,
  type DriveTransport,
  DriveTransportError,
  type DriveTransportErrorKind,
} from "./types";
import { redactString, registerSecret, assertNoLongLivedCredentialEnv } from "./redact";

/* ------------------------------------------------------------------ */
/* Fixture transport (offline, deterministic)                         */
/* ------------------------------------------------------------------ */

export interface DriveFixturePage {
  files?: DriveRawFileRecord[];
  nextPageToken?: string;
}

export interface DriveFixtureData {
  /** folderId → pages, in order. Presence of nextPageToken = more pages. */
  folderPages?: Record<string, DriveFixturePage[]>;
  /** fileId → streamed content chunks (base64). */
  content?: Record<string, { chunksBase64?: string[] }>;
  /** folderId → deterministic listing failure. */
  listErrors?: Record<string, { kind: DriveTransportErrorKind; message: string }>;
  /** fileId → deterministic content-stream failure. */
  contentErrors?: Record<string, { kind: DriveTransportErrorKind; message: string }>;
}

export function createFixtureDriveTransport(fixture: DriveFixtureData): DriveTransport {
  return {
    kind: "fixture",
    async listFolder(folderId: string): Promise<DriveListOutcome> {
      const failure = fixture.listErrors?.[folderId];
      if (failure) {
        throw new DriveTransportError(failure.kind, redactString(failure.message), "LIST");
      }
      const pages = fixture.folderPages?.[folderId] ?? [];
      const records: DriveRawFileRecord[] = [];
      let paginationComplete = true;
      let truncatedByLimit = false;
      let sawTokenWithoutPage = false;
      for (const page of pages) {
        records.push(...(page.files ?? []));
        if (page.nextPageToken !== undefined) {
          sawTokenWithoutPage = true;
        } else {
          sawTokenWithoutPage = false;
        }
      }
      // A trailing nextPageToken with no following page = the fixture wants an
      // incomplete pagination observation (fail-closed truncation).
      if (sawTokenWithoutPage) {
        paginationComplete = false;
        truncatedByLimit = true;
      }
      return {
        records,
        paginationComplete,
        pagesFetched: pages.length,
        truncatedByLimit,
      };
    },
    async *streamFileContent(fileId: string): AsyncIterable<Uint8Array> {
      const failure = fixture.contentErrors?.[fileId];
      if (failure) {
        throw new DriveTransportError(failure.kind, redactString(failure.message), "HASH");
      }
      const chunks = fixture.content?.[fileId]?.chunksBase64 ?? [];
      for (const chunk of chunks) {
        yield Uint8Array.from(atob(chunk), (char) => char.charCodeAt(0));
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* WIF-aligned access-token provider (short-lived only)               */
/* ------------------------------------------------------------------ */

export const DRIVE_ACCESS_TOKEN_ENV = "DESIGN_INTAKE_DRIVE_ACCESS_TOKEN" as const;

export interface LiveObservationAvailability {
  enabled: boolean;
  reason: string;
}

/**
 * Whether LIVE observation may run at all under this environment. Fails
 * closed: enabled only when the short-lived token contract is present and no
 * long-lived credential material is detected. Absence is LIVE_DISABLED, never
 * a synthetic PASS.
 */
export function liveObservationAvailability(env: Record<string, string | undefined>): LiveObservationAvailability {
  const token = env[DRIVE_ACCESS_TOKEN_ENV];
  if (typeof token !== "string" || token.trim() === "") {
    return {
      enabled: false,
      reason:
        "LIVE_DISABLED: DESIGN_INTAKE_DRIVE_ACCESS_TOKEN is absent — live Drive observation " +
        "requires the future GitHub Actions OIDC → Google WIF trusted job (LIVE_WIF_CONFIGURATION_HOLD).",
    };
  }
  try {
    assertNoLongLivedCredentialEnv(env);
  } catch (error) {
    return {
      enabled: false,
      reason: `LIVE_DISABLED: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  return { enabled: true, reason: "LIVE_ENABLED: short-lived access token present" };
}

/**
 * Short-lived access-token provider. The ONLY accepted credential contract.
 * Throws AUTH_FAILED (fail-closed) when the token is absent; refuses
 * long-lived key material outright.
 */
export function createEnvAccessTokenProvider(env: Record<string, string | undefined>): DriveAccessTokenProvider {
  return {
    async getAccessToken(): Promise<string> {
      assertNoLongLivedCredentialEnv(env);
      const token = env[DRIVE_ACCESS_TOKEN_ENV];
      if (typeof token !== "string" || token.trim() === "") {
        throw new DriveTransportError(
          "AUTH_FAILED",
          "live credential contract absent (DESIGN_INTAKE_DRIVE_ACCESS_TOKEN) — LIVE mode fail-closed",
          "AUTH",
        );
      }
      return token;
    },
  };
}

/* ------------------------------------------------------------------ */
/* HTTP transport (Drive API v3, read-only GET)                       */
/* ------------------------------------------------------------------ */

export interface HttpDriveTransportOptions {
  tokenProvider: DriveAccessTokenProvider;
  /** Injectable for tests; defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** API base, overridable for a future trusted proxy. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds (default 30000). */
  timeoutMs?: number;
  /** Hard page limit per listing (default 50). */
  maxPages?: number;
  /** Page size (default 100, Drive max). */
  pageSize?: number;
}

interface MinimalFetchResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  body: unknown;
}

const DEFAULT_BASE_URL = "https://www.googleapis.com/drive/v3";
const LIST_FIELDS = "nextPageToken,files(id,name,mimeType,size,modifiedTime,md5Checksum,trashed)";

function transportErrorForStatus(status: number, url: string): DriveTransportError {
  const safeUrl = redactString(url);
  if (status === 401) {
    return new DriveTransportError("AUTH_FAILED", `Drive API 401 at ${safeUrl} — authentication failed`, "LIST");
  }
  if (status === 403) {
    return new DriveTransportError(
      "PERMISSION_DENIED",
      `Drive API 403 at ${safeUrl} — permission denied for the read-only observer identity`,
      "LIST",
    );
  }
  if (status === 404) {
    // Drive deliberately answers 404 for objects the identity cannot see —
    // treat as an access failure, fail closed.
    return new DriveTransportError(
      "PERMISSION_DENIED",
      `Drive API 404 at ${safeUrl} — object absent or not visible to the observer identity`,
      "LIST",
    );
  }
  if (status === 429 || status >= 500) {
    return new DriveTransportError("UNAVAILABLE", `Drive API ${status} at ${safeUrl} — transient unavailability`, "LIST");
  }
  return new DriveTransportError("API_ERROR", `Drive API ${status} at ${safeUrl} — unexpected response`, "LIST");
}

/** Web ReadableStream → AsyncIterable without relying on async-iterator support. */
async function* streamBody(body: unknown): AsyncIterable<Uint8Array> {
  if (body === null || body === undefined) {
    throw new DriveTransportError("MALFORMED_RESPONSE", "content response has no body", "HASH");
  }
  const stream = body as {
    getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; releaseLock(): void };
  };
  if (typeof stream.getReader !== "function") {
    throw new DriveTransportError("MALFORMED_RESPONSE", "content response body is not a readable stream", "HASH");
  }
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) {
        throw new DriveTransportError("MALFORMED_RESPONSE", "content stream returned an undefined chunk", "HASH");
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function createHttpDriveTransport(options: HttpDriveTransportOptions): DriveTransport {
  const doFetch = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxPages = options.maxPages ?? 50;
  const pageSize = options.pageSize ?? 100;

  async function driveGet(path: string, stage: "LIST" | "HASH"): Promise<MinimalFetchResponse> {
    const url = `${baseUrl}${path}`;
    let token: string;
    try {
      token = await options.tokenProvider.getAccessToken();
    } catch (error) {
      if (error instanceof DriveTransportError) throw error;
      throw new DriveTransportError(
        "AUTH_FAILED",
        redactString(`token acquisition failed: ${error instanceof Error ? error.message : String(error)}`),
        "AUTH",
      );
    }
    registerSecret(token);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await doFetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = error !== null && typeof error === "object" && (error as { name?: string }).name === "AbortError";
      throw new DriveTransportError(
        aborted ? "TIMEOUT" : "UNAVAILABLE",
        redactString(`Drive API request failed: ${error instanceof Error ? error.message : String(error)}`),
        stage,
      );
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      // Drain the error body best-effort; it never enters output unredacted.
      let detail = "";
      try {
        const text = await response.text();
        detail = redactString(text.slice(0, 300));
      } catch {
        detail = "(no error body)";
      }
      const base = transportErrorForStatus(response.status, url);
      throw new DriveTransportError(base.kind, `${base.message} ${detail}`.trim(), stage);
    }
    return response as unknown as MinimalFetchResponse;
  }

  return {
    kind: "http",
    async listFolder(folderId: string): Promise<DriveListOutcome> {
      const records: DriveRawFileRecord[] = [];
      let pageToken: string | undefined;
      let pagesFetched = 0;
      let paginationComplete = false;
      let truncatedByLimit = false;

      for (;;) {
        if (pagesFetched >= maxPages) {
          truncatedByLimit = true;
          break;
        }
        const params = new URLSearchParams({
          q: `'${folderId}' in parents and trashed = false`,
          fields: LIST_FIELDS,
          pageSize: String(pageSize),
        });
        if (pageToken !== undefined) params.set("pageToken", pageToken);
        const response = await driveGet(`/files?${params.toString()}`, "LIST");
        pagesFetched += 1;

        let payload: unknown;
        try {
          payload = await response.json();
        } catch (error) {
          throw new DriveTransportError(
            "MALFORMED_RESPONSE",
            `Drive list response is not JSON: ${error instanceof Error ? error.message : String(error)}`,
            "LIST",
          );
        }
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
          throw new DriveTransportError("MALFORMED_RESPONSE", "Drive list response is not an object", "LIST");
        }
        const page = payload as { files?: unknown; nextPageToken?: unknown };
        if (page.files !== undefined && !Array.isArray(page.files)) {
          throw new DriveTransportError("MALFORMED_RESPONSE", "Drive list response 'files' is not an array", "LIST");
        }
        for (const entry of page.files ?? []) {
          if (entry === null || typeof entry !== "object") {
            throw new DriveTransportError("MALFORMED_RESPONSE", "Drive list entry is not an object", "LIST");
          }
          const record = entry as Record<string, unknown>;
          if (typeof record.id !== "string" || record.id.trim() === "") {
            throw new DriveTransportError("MALFORMED_RESPONSE", "Drive list entry has no string 'id'", "LIST");
          }
          records.push({
            id: record.id,
            name: typeof record.name === "string" ? record.name : undefined,
            mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
            size: typeof record.size === "string" ? record.size : undefined,
            modifiedTime: typeof record.modifiedTime === "string" ? record.modifiedTime : undefined,
            md5Checksum: typeof record.md5Checksum === "string" ? record.md5Checksum : undefined,
            trashed: record.trashed === true,
          });
        }
        if (typeof page.nextPageToken === "string" && page.nextPageToken !== "") {
          pageToken = page.nextPageToken;
          continue;
        }
        paginationComplete = true;
        break;
      }

      return {
        records: records.filter((record) => record.trashed !== true),
        paginationComplete,
        pagesFetched,
        truncatedByLimit,
      };
    },
    async *streamFileContent(fileId: string): AsyncIterable<Uint8Array> {
      // alt=media raw content. Evidence to hash and discard — never parsed,
      // never written anywhere, never executed (NO_ARBITRARY_DRIVE_HTML_EXECUTION).
      const response = await driveGet(`/files/${encodeURIComponent(fileId)}?alt=media`, "HASH");
      yield* streamBody(response.body);
    },
  };
}
