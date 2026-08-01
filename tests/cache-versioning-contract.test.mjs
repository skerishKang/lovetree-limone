import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { json } from "../server/api/http.ts";

const root = new URL("../", import.meta.url);
const sourceHeaders = new URL("public/_headers", root);
const builtHeaders = new URL("dist/client/_headers", root);
const clientAssets = new URL("dist/client/assets/", root);
const policyDocument = new URL("docs/operations/CACHE_AND_ASSET_VERSIONING_POLICY.md", root);
const workerSource = new URL("worker/index.ts", root);

const IMMUTABLE_ASSET_POLICY = "Cache-Control: public, max-age=31536000, immutable";
const DYNAMIC_REVALIDATION_POLICY = "private, max-age=0, must-revalidate";

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

test("all deployable JS and CSS assets use fingerprinted filenames", async () => {
  assert.ok(existsSync(clientAssets), "dist/client/assets must exist after build");
  const files = (await readdir(clientAssets)).filter((name) => /\.(?:js|css)$/u.test(name));
  assert.ok(files.length > 0, "build must emit JS or CSS assets");

  const unhashed = files.filter(
    (name) => !/-[A-Za-z0-9_-]{6,}\.(?:js|css)$/u.test(name),
  );
  assert.deepEqual(
    unhashed,
    [],
    "immutable /assets/* policy requires every deployable JS/CSS filename to contain a content hash",
  );
});

test("API JSON responses are private and never stored", async () => {
  const response = json({ ok: true });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
});

test("worker preserves explicit framework cache headers and defaults dynamic responses to revalidation", async () => {
  const source = await readFile(workerSource, "utf8");
  assert.match(source, /response\.headers\.has\("cache-control"\)/u);
  assert.ok(
    source.includes(`const DEFAULT_DYNAMIC_CACHE_CONTROL = "${DYNAMIC_REVALIDATION_POLICY}"`),
    "worker must define the dynamic revalidation policy",
  );
  assert.match(source, /withDefaultDynamicCachePolicy\(appResponse\)/u);
});
