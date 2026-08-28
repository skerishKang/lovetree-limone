import type { ApiContext } from "./handler";

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthEnv {
  DATABASE_URL: string;
  FIREBASE_PROJECT_ID?: string;
  [key: string]: unknown;
}

const GOOGLE_KEYS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export type KeyFetcher = (projectId: string) => Promise<Record<string, CryptoKey> | null>;

interface JwkKey {
  kty?: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
}

interface KeyCacheEntry {
  projectId: string;
  keys: Record<string, CryptoKey>;
  expiresAt: number;
}

let keyCache: KeyCacheEntry | null = null;

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function parseCacheControlMaxAge(value: string | null): number | null {
  if (!value) return null;
  const match = /max-age=(\d+)/.exec(value);
  return match ? Number(match[1]) : null;
}

async function importJwkKeys(keys: JwkKey[]): Promise<Record<string, CryptoKey>> {
  const result: Record<string, CryptoKey> = {};
  for (const jwk of keys) {
    if (jwk.kty !== "RSA" || !jwk.n || !jwk.e || !jwk.kid || jwk.alg !== "RS256") {
      continue;
    }
    const imported = await crypto.subtle.importKey(
      "jwk",
      { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    result[jwk.kid] = imported;
  }
  return result;
}

/**
 * Fetches Google Secure Token signing keys and caches them.
 * The cache respects the upstream Cache-Control max-age (with a minimum of
 * 5 minutes) so key rotation is picked up while staying resilient.
 */
export const fetchGoogleSigningKeys: KeyFetcher = async (projectId) => {
  const cached = keyCache;
  if (cached && cached.projectId === projectId && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  let response: Response;
  try {
    response = await fetch(GOOGLE_KEYS_URL);
  } catch {
    return cached && cached.projectId === projectId ? cached.keys : null;
  }
  if (!response.ok) {
    return cached && cached.projectId === projectId ? cached.keys : null;
  }

  let data: { keys?: JwkKey[] };
  try {
    data = (await response.json()) as { keys?: JwkKey[] };
  } catch {
    return cached && cached.projectId === projectId ? cached.keys : null;
  }

  const keys = await importJwkKeys(data.keys ?? []);
  if (Object.keys(keys).length === 0) {
    return cached && cached.projectId === projectId ? cached.keys : null;
  }

  const maxAge = parseCacheControlMaxAge(response.headers.get("cache-control")) ?? 3600;
  const ttlSeconds = Math.max(maxAge, 300);
  keyCache = { projectId, keys, expiresAt: Date.now() + ttlSeconds * 1000 };
  return keys;
};

/**
 * Verifies a Firebase ID token signed by Google's Secure Token service.
 *
 * Requirements:
 * - Authorization header must use the `Bearer <token>` format (checked by callers).
 * - JWT header `alg` must be RS256.
 * - `kid` must map to a Google Secure Token public key.
 * - The JWT signature must verify against that key.
 * - `aud` must equal FIREBASE_PROJECT_ID.
 * - `iss` must equal https://securetoken.google.com/<FIREBASE_PROJECT_ID>.
 * - `exp`, `iat`, `auth_time` and a non-empty `sub` must be valid.
 *
 * The verification fails closed: any missing/extra/malformed input returns
 * null and callers must treat the request as unauthenticated.
 */
export async function verifyFirebaseToken(
  token: string,
  projectId: string,
  fetchKeys: KeyFetcher = fetchGoogleSigningKeys,
  now: number = Date.now()
): Promise<AuthUser | null> {
  if (!token || typeof token !== "string") return null;
  if (!projectId) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header: { alg?: unknown; kid?: unknown };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(decodeUtf8(base64UrlDecode(parts[0]))) as { alg?: unknown; kid?: unknown };
    payload = JSON.parse(decodeUtf8(base64UrlDecode(parts[1]))) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (header.alg !== "RS256") return null;
  if (typeof header.kid !== "string" || !header.kid) return null;

  const keys = await fetchKeys(projectId);
  if (!keys) return null;
  const publicKey = keys[header.kid];
  if (!publicKey) return null;

  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;

  const clockSkewSeconds = 60;
  const nowSeconds = Math.floor(now / 1000);

  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
  if (payload.exp <= nowSeconds - clockSkewSeconds) return null;

  if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat)) return null;
  if (payload.iat > nowSeconds + clockSkewSeconds) return null;

  if (
    payload.auth_time !== undefined &&
    (typeof payload.auth_time !== "number" || !Number.isFinite(payload.auth_time))
  ) {
    return null;
  }
  if (typeof payload.auth_time === "number" && payload.auth_time > nowSeconds + clockSkewSeconds) {
    return null;
  }

  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = base64UrlDecode(parts[2]);
  } catch {
    return null;
  }

  const encoded = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const data = new Uint8Array(encoded);
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      publicKey,
      signature,
      data
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

/**
 * Extracts a token from the Authorization header. Only `Bearer <token>` is
 * accepted; any other format (including a bare token) is rejected.
 */
export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(auth);
  return match ? match[1] : null;
}

export async function requireAuthUser(ctx: ApiContext): Promise<AuthUser | null> {
  const token = extractBearerToken(ctx.request);
  if (!token) return null;

  const projectId = ctx.env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  try {
    return await verifyFirebaseToken(token, projectId);
  } catch {
    return null;
  }
}
