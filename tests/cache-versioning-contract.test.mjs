import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { json, errorResponse } from "../core/runtime/server/api/http.ts";
import { handleApiRequest } from "../core/runtime/server/api/handler.ts";
import {
  applyDefaultDynamicCachePolicy,
  DEFAULT_DYNAMIC_CACHE_CONTROL,
} from "../core/runtime/worker/cache-policy.ts";
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";

const root = new URL("../", import.meta.url);
const sourceHeaders = new URL("public/_headers", root);
const builtHeaders = new URL("dist/client/_headers", root);
const clientAssets = new URL("dist/client/assets/", root);
const policyDocument = new URL("docs/operations/CACHE_AND_ASSET_VERSIONING_POLICY.md", root);
const workerSource = new URL("core/runtime/worker/index.ts", root);
const cachePolicySource = new URL("core/runtime/worker/cache-policy.ts", root);

const IMMUTABLE_ASSET_POLICY = "Cache-Control: public, max-age=31536000, immutable";
const NO_STORE_POLICY = "private, no-store";

// Vite emits every build asset under /assets/ as [name]-[contentHash][extname].
// A filename without a `-hash` segment is a fixed-name file and must never be
// given the one-year immutable policy.
const FINGERPRINTED_ASSET = /-[A-Za-z0-9_-]{6,}\.[A-Za-z0-9]+$/u;

const DYNAMIC_REVALIDATION_POLICY = DEFAULT_DYNAMIC_CACHE_CONTROL;

function assertImmutableHeadersContract(content, location) {
  assert.match(content, /\/assets\/\*/u, `${location} must target /assets/*`);
  assert.ok(
    content.includes(IMMUTABLE_ASSET_POLICY),
    `${location} must assign immutable one-year browser caching to fingerprinted assets`,
  );
  assert.doesNotMatch(
    content,
    /^\/\*\s*$[\s\S]*?Cache-Control:/mu,
    `${location} must not add a competing global Cache-Control rule`,
  );
  assert.doesNotMatch(
    content,
    /_vinext/u,
    `${location} must not target the /_vinext/image transform route`,
  );
}

test("cache and asset versioning policy is canonical and bans manual query versioning", async () => {
  assert.ok(existsSync(policyDocument), "cache policy document must exist");
  const policy = await readFile(policyDocument, "utf8");
  assert.match(policy, /status: CANONICAL_OPERATIONAL_POLICY/u);
  assert.match(policy, /수동 버전 쿼리 금지/u);
  assert.match(policy, /강력 새로고침을 요구하지 않는다/u);
  assert.match(policy, /private, no-store/u);
  assert.match(policy, /public, max-age=31536000, immutable/u);
});

test("source static headers cache only fingerprinted build assets immutably", async () => {
  assert.ok(existsSync(sourceHeaders), "public/_headers must exist");
  assertImmutableHeadersContract(await readFile(sourceHeaders, "utf8"), "public/_headers");
});

test("build copies the static headers contract into dist/client", async () => {
  assert.ok(existsSync(builtHeaders), "dist/client/_headers must exist after build");
  assertImmutableHeadersContract(await readFile(builtHeaders, "utf8"), "dist/client/_headers");
});

test("every emitted /assets/* file carries a content hash (JS, CSS, images, fonts, other)", async () => {
  assert.ok(existsSync(clientAssets), "dist/client/assets must exist after build");
  const files = (await readdir(clientAssets)).filter((name) => name !== ".DS_Store");
  assert.ok(files.length > 0, "build must emit assets");

  const unhashed = files.filter((name) => !FINGERPRINTED_ASSET.test(name));
  assert.deepEqual(
    unhashed,
    [],
    "immutable /assets/* policy requires every emitted asset filename to carry a content hash; fixed-name files must not be placed under /assets/*",
  );

  const extensions = [...new Set(files.map((name) => name.split(".").pop()))].sort();
  console.log(`[cache] audited ${files.length} /assets/* files: ${extensions.join(", ")}`);
});

test("fixed-name public files are emitted and keep default revalidation instead of immutable", async () => {
  const headers = await readFile(sourceHeaders, "utf8");
  assert.doesNotMatch(headers, /^\/\*/mu, "no global Cache-Control rule may exist");

  for (const fixed of ["favicon.svg", "file.svg", "globe.svg", "window.svg"]) {
    assert.ok(existsSync(new URL(`public/${fixed}`, root)), `public/${fixed} must exist`);
    assert.ok(
      existsSync(new URL(`dist/client/${fixed}`, root)),
      `dist/client/${fixed} must be emitted outside /assets/*`,
    );
  }

  const assets = await readdir(clientAssets);
  assert.deepEqual(
    assets.filter((name) => ["favicon.svg", "file.svg", "globe.svg", "window.svg"].includes(name)),
    [],
    "fixed-name files must not be emitted under /assets/*",
  );
});

test("API JSON helper responses are private and never stored for 2xx, 4xx, and 5xx", async () => {
  const responses = [
    json({ ok: true }),
    errorResponse("Bad Request", 400),
    errorResponse("Internal server error", 500),
  ];
  for (const response of responses) {
    assert.equal(response.headers.get("cache-control"), NO_STORE_POLICY);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  }
});

test("real API handler responses are private and never stored across 2xx, 4xx, and 5xx", async () => {
  const ok = await handleApiRequest(
    new Request("https://example.com/api/health"),
    { APP_ENV: "staging", DATABASE_URL: "postgresql://user@example.com/database" },
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), NO_STORE_POLICY);

  const notFound = await handleApiRequest(
    new Request("https://example.com/api/does-not-exist"),
    { DATABASE_URL: "postgresql://user@example.com/database" },
  );
  assert.equal(notFound.status, 404);
  assert.equal(notFound.headers.get("cache-control"), NO_STORE_POLICY);

  const serviceUnavailable = await handleApiRequest(
    new Request("https://example.com/api/trees", { method: "POST" }),
    { APP_ENV: "staging", API_MUTATIONS_ENABLED: "false", DATABASE_URL: "postgresql://user@example.com/database" },
  );
  assert.equal(serviceUnavailable.status, 503);
  assert.equal(serviceUnavailable.headers.get("cache-control"), NO_STORE_POLICY);

  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  try {
    const internalError = await handleApiRequest(
      new Request("https://example.com/api/community/trees"),
      { DATABASE_URL: "postgresql://user@example.com/database" },
      async () => {
        throw new Error("simulated failure");
      },
    );
    assert.equal(internalError.status, 500);
    assert.equal(internalError.headers.get("cache-control"), NO_STORE_POLICY);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(logged.length, 1, "internal server error must be logged once");
});

test("worker fallback preserves explicit framework cache headers", async () => {
  const response = new Response("<html/>", {
    headers: {
      "cache-control": "public, max-age=0, must-revalidate",
      etag: '"a1b2c3"',
      "content-type": "text/html; charset=utf-8",
    },
  });
  const out = applyDefaultDynamicCachePolicy(response);
  assert.equal(out.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  assert.equal(out.headers.get("etag"), '"a1b2c3"');
});

test("worker fallback never overrides API private no-store responses", async () => {
  const api = json({ ok: true });
  const out = applyDefaultDynamicCachePolicy(api);
  assert.equal(out.headers.get("cache-control"), NO_STORE_POLICY);
});

test("dynamic HTML/RSC without an explicit policy gets the revalidation default", async () => {
  const response = new Response("<!doctype html>", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  const out = applyDefaultDynamicCachePolicy(response);
  assert.equal(out.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);
});

test("static and fingerprinted asset responses never receive the dynamic fallback", async () => {
  const fingerprinted = new Response("bundle", {
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
  assert.equal(
    applyDefaultDynamicCachePolicy(fingerprinted).headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );

  const fixedName = new Response("favicon", {
    headers: { "cache-control": "public, max-age=0, must-revalidate", etag: '"abc"' },
  });
  assert.equal(
    applyDefaultDynamicCachePolicy(fixedName).headers.get("cache-control"),
    "public, max-age=0, must-revalidate",
  );
});

test("error responses are never publicly cached by the worker fallback", async () => {
  for (const status of [400, 404, 500]) {
    const error = new Response("error", { status });
    const out = applyDefaultDynamicCachePolicy(error);
    assert.equal(out.status, status);
    assert.equal(out.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);
    assert.doesNotMatch(out.headers.get("cache-control"), /public/u);
  }
});

test("worker fallback preserves a streaming RSC body end to end", async () => {
  const chunks = ["RSC-chunk-1", "RSC-chunk-2", "RSC-chunk-3"];
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
  const response = new Response(stream, {
    status: 200,
    headers: { "content-type": "text/x-component" },
  });

  const out = applyDefaultDynamicCachePolicy(response);
  assert.equal(out.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);
  assert.equal(out.headers.get("content-type"), "text/x-component");

  const reader = out.body.getReader();
  let received = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += new TextDecoder().decode(value);
  }
  assert.equal(received, chunks.join(""));
  assert.equal(out.status, 200);
});

test("worker fallback keeps bodyless 204 responses valid", async () => {
  const response = new Response(null, { status: 204, headers: { "x-custom": "v1" } });
  const out = applyDefaultDynamicCachePolicy(response);
  assert.equal(out.status, 204);
  assert.equal(out.body, null);
  assert.equal(out.headers.get("x-custom"), "v1");
  assert.equal(out.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);
});

test("worker fallback keeps bodyless 304 responses valid", async () => {
  const response = new Response(null, {
    status: 304,
    headers: { etag: '"abc123"', "x-custom": "v2" },
  });
  const out = applyDefaultDynamicCachePolicy(response);
  assert.equal(out.status, 304);
  assert.equal(out.body, null);
  assert.equal(out.headers.get("etag"), '"abc123"');
  assert.equal(out.headers.get("x-custom"), "v2");
  assert.equal(out.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);
});

test("worker fallback preserves status, statusText, and ordinary headers", async () => {
  const response = new Response("body", {
    status: 418,
    statusText: "I'm a teapot",
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-request-id": "req-123",
      "x-cache": "MISS",
    },
  });
  const out = applyDefaultDynamicCachePolicy(response);
  assert.equal(out.status, 418);
  assert.equal(out.statusText, "I'm a teapot");
  assert.equal(out.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(out.headers.get("x-request-id"), "req-123");
  assert.equal(out.headers.get("x-cache"), "MISS");
  assert.equal(await out.text(), "body");
});

test("worker fallback preserves multiple Set-Cookie values", async () => {
  const response = new Response("body", {
    status: 200,
    headers: { "set-cookie": "session=abc; Path=/; HttpOnly" },
  });
  response.headers.append("set-cookie", "theme=dark; Path=/; Max-Age=31536000");

  const out = applyDefaultDynamicCachePolicy(response);
  assert.ok(out.headers.getSetCookie, "current Headers API must expose getSetCookie()");
  assert.deepEqual(out.headers.getSetCookie(), [
    "session=abc; Path=/; HttpOnly",
    "theme=dark; Path=/; Max-Age=31536000",
  ]);
  assert.equal(out.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);
});

test("worker fallback adds the default policy only when Cache-Control is absent", async () => {
  const withHeader = new Response("x", {
    status: 200,
    headers: { "cache-control": "no-cache" },
  });
  assert.equal(
    applyDefaultDynamicCachePolicy(withHeader).headers.get("cache-control"),
    "no-cache",
  );

  const withoutHeader = new Response("x", { status: 200 });
  assert.equal(
    applyDefaultDynamicCachePolicy(withoutHeader).headers.get("cache-control"),
    DYNAMIC_REVALIDATION_POLICY,
  );
});

test("_vinext/image route is not covered by the /assets/* immutable rule", async () => {
  const headers = await readFile(sourceHeaders, "utf8");
  assert.doesNotMatch(headers, /_vinext/u, "_headers must not target the image transform route");
  assert.doesNotMatch(headers, /^\/\*/mu, "no competing global Cache-Control rule");
});

test("_vinext/image keeps framework cache headers and image errors get the revalidation default", async () => {
  const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];

  const transformed = await handleImageOptimization(
    new Request("https://example.com/_vinext/image?url=/assets/photo-a1b2c3d4.png&w=640&q=75", {
      headers: { accept: "image/webp" },
    }),
    {
      fetchAsset: async () =>
        new Response("png-bytes", { status: 200, headers: { "content-type": "image/png" } }),
      transformImage: async () =>
        new Response("webp-bytes", { status: 200, headers: { "content-type": "image/webp" } }),
    },
    allowedWidths,
  );
  assert.equal(transformed.status, 200);
  assert.equal(transformed.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(transformed.headers.get("vary"), "Accept");
  assert.ok(transformed.headers.get("content-security-policy"), "image responses must be CSP-hardened");
  assert.equal(transformed.headers.get("x-content-type-options"), "nosniff");

  const kept = applyDefaultDynamicCachePolicy(transformed);
  assert.equal(kept.headers.get("cache-control"), "public, max-age=31536000, immutable");

  const badRequest = await handleImageOptimization(
    new Request("https://example.com/_vinext/image", { headers: { accept: "image/webp" } }),
    { fetchAsset: async () => new Response("", { status: 404 }) },
    allowedWidths,
  );
  assert.equal(badRequest.status, 400);
  const keptBadRequest = applyDefaultDynamicCachePolicy(badRequest);
  assert.equal(keptBadRequest.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);

  const missing = await handleImageOptimization(
    new Request("https://example.com/_vinext/image?url=/assets/nope-a1b2c3d4.png&w=640&q=75", {
      headers: { accept: "image/webp" },
    }),
    { fetchAsset: async () => new Response("missing", { status: 404 }) },
    allowedWidths,
  );
  assert.equal(missing.status, 404);
  const keptMissing = applyDefaultDynamicCachePolicy(missing);
  assert.equal(keptMissing.headers.get("cache-control"), DYNAMIC_REVALIDATION_POLICY);
});

test("worker delegates cache policy decisions to the shared pure module", async () => {
  const worker = await readFile(workerSource, "utf8");
  const policy = await readFile(cachePolicySource, "utf8");
  assert.match(worker, /from "\.\/cache-policy"/u);
  assert.match(policy, /export function applyDefaultDynamicCachePolicy/u);
  assert.match(policy, /export const DEFAULT_DYNAMIC_CACHE_CONTROL/u);
  assert.equal(
    (worker.match(/applyDefaultDynamicCachePolicy\(/gu) ?? []).length,
    2,
    "worker must apply the cache policy to both the app response and the image route",
  );
  assert.doesNotMatch(worker, /headers\.set\("cache-control",/u, "worker must not reimplement the policy inline");
  assert.equal(
    DEFAULT_DYNAMIC_CACHE_CONTROL,
    "private, max-age=0, must-revalidate",
    "the worker default must match the documented revalidation policy",
  );
});
