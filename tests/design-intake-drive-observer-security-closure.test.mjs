// Issue #173 — bounded credential-boundary closure regressions for PR #243.
//
// This file is intentionally focused on the two Web CTO security blockers:
// 1. privileged/live workflow dispatch must execute trusted default-branch code only;
// 2. a caller-controlled target origin must never receive the Drive bearer token.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createHttpDriveTransport } from "../lib/design-intake/drive-observer/index.ts";

const repoRoot = process.cwd();
const workflowPath = path.join(repoRoot, ".github", "workflows", "design-source-freshness-observer.yml");
const transportPath = path.join(repoRoot, "lib", "design-intake", "drive-observer", "transport.ts");
const FAKE_TOKEN = "ya29.a0SecurityClosureFakeToken_1234567890abcdef";
const TRUSTED_DRIVE_ORIGIN = "https://www.googleapis.com";

function read(relativeOrAbsolutePath) {
  return readFileSync(relativeOrAbsolutePath, "utf8");
}

function recordingFetch(handler) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls);
  };
  return { fetch, calls };
}

test("DEFAULT_BRANCH_LIVE_GUARD_PRESENT + TRUSTED_DEFAULT_BRANCH_CHECKOUT_PINNED", () => {
  const workflow = read(workflowPath);
  const liveStart = workflow.indexOf("\n  live-observation:\n");
  assert.ok(liveStart >= 0, "live-observation job must exist");
  const liveJob = workflow.slice(liveStart);

  assert.match(
    liveJob,
    /if:\s*github\.event_name == 'workflow_dispatch' && inputs\.mode == 'live' && github\.ref_name == github\.event\.repository\.default_branch/,
    "live job must require workflow_dispatch live mode on the repository default branch",
  );
  assert.match(
    liveJob,
    /uses:\s*actions\/checkout@v4[\s\S]*?with:\s*\n\s*ref:\s*\$\{\{\s*github\.event\.repository\.default_branch\s*\}\}/,
    "live checkout must explicitly pin the repository default branch",
  );
  assert.doesNotMatch(liveJob, /ref:\s*\$\{\{\s*inputs\./, "live checkout ref must never come from workflow input");
  assert.doesNotMatch(liveJob, /pull_request\.head|refs\/pull\//, "live job must never resolve PR-controlled code");
});

test("NON_DEFAULT_REF_PRIVILEGED_LIVE_EXECUTION is structurally impossible", () => {
  const workflow = read(workflowPath);
  assert.match(workflow, /workflow_dispatch:/, "manual dispatch remains the only live trigger surface");
  assert.match(
    workflow,
    /github\.ref_name == github\.event\.repository\.default_branch/,
    "a branch/tag dispatch must match the server-provided default branch name before live job execution",
  );
  assert.doesNotMatch(workflow, /^[^#\n]*pull_request_target:/m, "pull_request_target remains forbidden");
});

test("PUBLIC_ARBITRARY_BASE_URL is removed from the production transport surface", () => {
  const transportSource = read(transportPath);
  assert.doesNotMatch(transportSource, /\bbaseUrl\??\s*:/, "HttpDriveTransportOptions must not expose baseUrl");
  assert.doesNotMatch(transportSource, /options\.baseUrl/, "runtime transport must not read a caller-provided baseUrl property");
  assert.match(
    transportSource,
    /https:\/\/www\.googleapis\.com\/drive\/v3/,
    "Drive API target must be code-owned and pinned to the trusted Google endpoint",
  );
  assert.match(transportSource, /redirect:\s*"error"/, "credential-bearing fetches must fail closed on redirects");
});

test("UNTRUSTED_BASE_URL_CANNOT_RECEIVE_AUTHORIZATION", async () => {
  const { fetch, calls } = recordingFetch(() =>
    new Response(JSON.stringify({ files: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );

  // Deliberately pass an extra runtime property even though TypeScript no longer
  // declares it. The implementation must ignore it rather than forwarding a
  // Google bearer token to caller-selected infrastructure.
  const transport = createHttpDriveTransport({
    tokenProvider: { getAccessToken: async () => FAKE_TOKEN },
    fetch,
    baseUrl: "https://attacker.example/drive/v3",
  });

  await transport.listFolder("folder with spaces'and-symbols");
  assert.equal(calls.length, 1);

  const call = calls[0];
  const url = new URL(call.url);
  assert.equal(url.origin, TRUSTED_DRIVE_ORIGIN, "Authorization may only target the exact trusted Google origin");
  assert.equal(url.pathname, "/drive/v3/files");
  assert.notEqual(url.hostname, "attacker.example");
  assert.equal(call.init.method, "GET");
  assert.equal(call.init.redirect, "error", "credential-bearing request must not follow redirects");
  assert.equal(call.init.headers.Authorization, `Bearer ${FAKE_TOKEN}`);
  assert.ok(!call.url.includes(FAKE_TOKEN), "bearer token must never appear in the request URL/query");
  assert.equal(
    calls.filter((entry) => new URL(entry.url).origin === "https://attacker.example").length,
    0,
    "attacker origin must receive zero requests",
  );
});

test("content GET keeps encoded file id, exact trusted origin, and fail-closed redirect", async () => {
  const { fetch, calls } = recordingFetch(() => new Response("content-bytes", { status: 200 }));
  const transport = createHttpDriveTransport({
    tokenProvider: { getAccessToken: async () => FAKE_TOKEN },
    fetch,
  });

  const chunks = [];
  for await (const chunk of transport.streamFileContent("file/with ?#reserved")) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString("utf8"), "content-bytes");
  assert.equal(calls.length, 1);

  const call = calls[0];
  const url = new URL(call.url);
  assert.equal(url.origin, TRUSTED_DRIVE_ORIGIN);
  assert.equal(url.pathname, "/drive/v3/files/file%2Fwith%20%3F%23reserved");
  assert.equal(url.searchParams.get("alt"), "media");
  assert.equal(call.init.method, "GET");
  assert.equal(call.init.redirect, "error");
  assert.equal(call.init.headers.Authorization, `Bearer ${FAKE_TOKEN}`);
  assert.ok(!call.url.includes(FAKE_TOKEN));
});
