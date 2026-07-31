import assert from "node:assert/strict";
import test from "node:test";
import { createSign, generateKeyPairSync, createPublicKey } from "node:crypto";
import {
  verifyFirebaseToken,
  extractBearerToken,
} from "../server/api/auth.ts";

const PROJECT_ID = "relovetree";

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

function signJwt(
  { header, payload, signature }: JwtParts,
  privatePem: string
): string {
  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  if (signature) return `${data}.${signature}`;
  const sig = createSign("RSA-SHA256").update(data).sign(privatePem);
  return `${data}.${base64Url(sig)}`;
}

function makeKeys() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent: 0x10001,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return { privateKey, publicKey };
}

async function makeFetcher(publicPem: string, kid = "test-key-1") {
  const jwk = createPublicKey(publicPem).export({ format: "jwk" }) as {
    kty: string;
    n: string;
    e: string;
  };
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return async () => ({ [kid]: key });
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: "firebase-user-123",
    iat: now - 60,
    auth_time: now - 600,
    exp: now + 3600,
    ...overrides,
  };
}

test("valid Firebase ID token accepted", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload(), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.ok(user);
  assert.equal(user?.uid, "firebase-user-123");
});

test("forged JWT (HS256 alg) rejected", async () => {
  const { publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const headerB64 = base64Url(JSON.stringify({ alg: "HS256", kid: "test-key-1" }));
  const payloadB64 = base64Url(JSON.stringify(validPayload()));
  const sig = base64Url("forged-secret-signed-bytes");
  const token = `${headerB64}.${payloadB64}.${sig}`;
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("invalid signature rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload(), signature: "" },
    privateKey
  );
  const parts = token.split(".");
  const tampered = `${parts[0]}.${parts[1]}.${base64Url(Buffer.from("tampered"))}`;
  const user = await verifyFirebaseToken(tampered, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("signature from a different key rejected", async () => {
  const { privateKey } = makeKeys();
  const other = makeKeys();
  const fetcher = await makeFetcher(other.publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload(), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("expired token rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload({ exp: now - 120 }), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("wrong aud rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload({ aud: "other-project" }), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("wrong iss rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload({ iss: "https://securetoken.google.com/evil" }), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("missing sub rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const payload = validPayload();
  delete payload.sub;
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload, signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("empty sub rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload({ sub: "" }), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("unknown kid rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "unknown-kid" }, payload: validPayload(), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("future iat rejected", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload({ iat: now + 7200 }), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, PROJECT_ID, fetcher);
  assert.equal(user, null);
});

test("malformed token rejected", async () => {
  const { publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  assert.equal(await verifyFirebaseToken("only-two.parts", PROJECT_ID, fetcher), null);
  assert.equal(await verifyFirebaseToken("", PROJECT_ID, fetcher), null);
  assert.equal(await verifyFirebaseToken("a.b.c.d", PROJECT_ID, fetcher), null);
});

test("empty project id fails closed", async () => {
  const { privateKey, publicKey } = makeKeys();
  const fetcher = await makeFetcher(publicKey);
  const token = signJwt(
    { header: { alg: "RS256", kid: "test-key-1" }, payload: validPayload(), signature: "" },
    privateKey
  );
  const user = await verifyFirebaseToken(token, "", fetcher);
  assert.equal(user, null);
});

test("extractBearerToken accepts only Bearer format", () => {
  const req = (header: string | null) =>
    new Request("https://example.com/api/trees", {
      headers: header ? { authorization: header } : undefined,
    });

  assert.equal(extractBearerToken(req("Bearer abc.def.ghi")), "abc.def.ghi");
  assert.equal(extractBearerToken(req("bearer abc")), "abc");
  assert.equal(extractBearerToken(req("abc.def.ghi")), null);
  assert.equal(extractBearerToken(req("Basic abc")), null);
  assert.equal(extractBearerToken(req("Bearer")), null);
  assert.equal(extractBearerToken(req(null)), null);
});
