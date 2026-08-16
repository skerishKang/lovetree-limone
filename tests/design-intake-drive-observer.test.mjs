// Issue #173 — Live Drive Source-Freshness Observer acceptance matrix.
//
// Full-pipeline cases (fixture transport → observe → normalize → #171 pure
// resolver reused unchanged), transport unit contracts, secret redaction and
// the static security contracts (NO_DRIVE_WRITE_SCOPE, UNTRUSTED_PR boundary,
// NO_LONG_LIVED_KEY, NO_SECRET_IN_REPOSITORY, NO_ARBITRARY_DRIVE_HTML_EXECUTION).
//
// No test touches the network: the fixture transport is fully offline.

import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import { resolveSourceFreshness } from "../lib/design-intake/source-freshness.ts";
import {
  clearRegisteredSecrets,
  createEnvAccessTokenProvider,
  createHttpDriveTransport,
  filenameRevisionLabel,
  liveObservationAvailability,
  observationToDriveSourceState,
  observeDriveTrack,
  parseDriveObserverConfig,
  redactDeep,
  redactString,
  registerSecret,
} from "../lib/design-intake/drive-observer/index.ts";

const repoRoot = process.cwd();
const FIXTURES = path.join(repoRoot, "tests", "fixtures", "source-freshness");
const OBSERVER_FIXTURES = path.join(FIXTURES, "observer");
const MANIFEST_FIXTURES = path.join(FIXTURES, "manifests");
const OBSERVER_LIB_DIR = path.join(repoRoot, "lib", "design-intake", "drive-observer");

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const hasher = {
  create: () => {
    const digest = createHash("sha256");
    return {
      update: (chunk) => digest.update(chunk),
      digestHex: () => digest.digest("hex"),
    };
  },
};

const observerConfig = parseDriveObserverConfig(
  readJson(path.join(OBSERVER_FIXTURES, "observer-config.json")),
);

function trackConfig(stableId, overrides = {}) {
  const track = observerConfig.tracks.find((entry) => entry.stableId === stableId);
  if (!track) throw new Error(`no fixture config track for ${stableId}`);
  return { ...track, ...overrides };
}

/** Run the full pipeline for one acceptance case. */
async function runCase(manifestName, providerFixtureName, stableId, configOverrides = {}) {
  clearRegisteredSecrets();
  const provider = readJson(path.join(OBSERVER_FIXTURES, `${providerFixtureName}.json`));
  const { createFixtureDriveTransport } = await import(
    "../lib/design-intake/drive-observer/transport.ts"
  );
  const observation = await observeDriveTrack(trackConfig(stableId, configOverrides), {
    transport: createFixtureDriveTransport(provider),
    hasher,
    now: () => new Date("2026-08-17T09:00:00.000Z"),
  });
  const manifest = parseIntakeManifest(readJson(path.join(MANIFEST_FIXTURES, `${manifestName}.json`)));
  const verdict = resolveSourceFreshness(manifest, observationToDriveSourceState(observation));
  return { observation, manifest, verdict };
}

/* ------------------------------------------------------------------ */
/* Acceptance matrix — Cases 1..11 (network observation layer)        */
/* ------------------------------------------------------------------ */

test("case 1: stale V1.7 manifest vs live functional V1.9 → FAIL/SOURCE_STALE + mergeBlock", async () => {
  const { observation, verdict } = await runCase(
    "observer-track61-v1-7-current",
    "provider-track61-v1-9-live",
    "track-observer-61-stale",
  );
  assert.equal(observation.providerState, "SUCCESS");
  assert.equal(observation.observationComplete, true);
  assert.equal(observation.paginationComplete, true);
  assert.equal(observation.rootCurrentAlias.aliasSource, "CONFIG_DECLARED");
  assert.equal(observation.rootCurrentAlias.revisionLabel, "V1.9");
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "SOURCE_STALE");
  assert.ok(verdict.mergeBlock, "stale live source must block merge");
  assert.equal(verdict.manifestRevision, "V1.7");
  assert.equal(verdict.driveCurrentRevision, "V1.9");
  assert.equal(verdict.resolvedTargetRevision, "V1.9");
});

test("case 2: exact current source → PASS/CURRENT", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
  );
  assert.equal(observation.providerState, "SUCCESS");
  assert.equal(observation.observationComplete, true);
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "CURRENT");
  assert.equal(verdict.mergeBlock, undefined);
  assert.equal(verdict.packagingOnly, undefined);
});

test("case 3: same SHA / new Drive file id → PASS/PACKAGING_ONLY", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-repackaged",
    "provider-track62-v1-1-repackaged",
    "track-observer-62-repackaged",
  );
  assert.equal(observation.providerState, "SUCCESS");
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "PACKAGING_ONLY");
  assert.equal(verdict.packagingOnly, true);
  assert.equal(verdict.mergeBlock, undefined, "repackaging is not a staleness failure");
  assert.notEqual(observation.rootCurrentAlias.fileId, "1f73observerTrack62V11OldFileAaa");
});

test("case 4: display V1.3 vs functional V1.2.1 → functional authority resolves to V1.2.1", async () => {
  const { observation, verdict } = await runCase(
    "observer-track64-v1-2-1-functional",
    "provider-track64-display-v13-functional-v121",
    "track-observer-64-functional",
  );
  assert.equal(observation.providerState, "SUCCESS");
  // Display-only files are metadata-only evidence: never downloaded/hashed.
  const display = observation.candidateFiles.find(
    (file) => file.fileId === "1f73observerTrack64V13DispFileAa",
  );
  assert.equal(display.declaredDisplay, true);
  assert.equal(display.declaredFunctional, false);
  assert.equal(display.hashEvidence.attempted, false, "display-only file must not be hashed");
  assert.equal(display.sha256, undefined);
  assert.deepEqual(observation.displayRevisionCandidates, ["1f73observerTrack64V13DispFileAa"]);
  // Functional authority is the config-declared V1.2.1 root, never the higher display label.
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "CURRENT");
  assert.equal(verdict.driveCurrentRevision, "V1.2.1");
  assert.equal(verdict.resolvedTargetRevision, "V1.2.1");
  assert.equal(verdict.mergeBlock, undefined);
});

test("case 5: competing functional candidates, no root authority → FAIL/AMBIGUOUS_CURRENT", async () => {
  const { observation, verdict } = await runCase(
    "observer-track64-v1-2-1-ambiguous",
    "provider-track64-two-competitors",
    "track-observer-64-ambiguous",
  );
  assert.equal(observation.providerState, "SUCCESS");
  assert.equal(observation.rootCurrentAlias, undefined, "no root authority declared");
  assert.equal(observation.functionalRevisionCandidates.length, 2);
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "AMBIGUOUS_CURRENT");
  assert.ok(verdict.mergeBlock, "ambiguous current must block merge");
  assert.notEqual(verdict.status, "PASS", "the resolver must never auto-pick a winner");
});

test("case 6: root without sourceSnapshot vs complete observation → FAIL/UNMAPPED", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-nosnapshot",
    "provider-track62-v1-1-exact",
    "track-observer-62-nosnapshot",
  );
  assert.equal(observation.providerState, "SUCCESS");
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "UNMAPPED");
  assert.ok(verdict.mergeBlock, "unmapped manifest root must block merge");
});

test("case 6b: declared root alias absent from listing → INCOMPLETE observation, never grounded", async () => {
  clearRegisteredSecrets();
  const { createFixtureDriveTransport } = await import("../lib/design-intake/drive-observer/transport.ts");
  const provider = readJson(path.join(OBSERVER_FIXTURES, "provider-track62-v1-1-exact.json"));
  const config = trackConfig("track-observer-62-exact", {
    rootCurrentFileId: "1f73observerUnlistedRootFileAaaaaa",
    functionalFileIds: ["1f73observerUnlistedRootFileAaaaaa"],
  });
  const observation = await observeDriveTrack(config, {
    transport: createFixtureDriveTransport(provider),
    hasher,
    now: () => new Date("2026-08-17T09:00:00.000Z"),
  });
  assert.equal(observation.providerState, "INCOMPLETE");
  assert.equal(observation.observationComplete, false);
  assert.ok(
    observation.providerErrors.some((error) => error.code === "ROOT_ALIAS_NOT_OBSERVED"),
    "unobserved declared evidence must be recorded as a provider error",
  );
  const verdict = resolveSourceFreshness(
    parseIntakeManifest(readJson(path.join(MANIFEST_FIXTURES, "observer-track62-v1-1-current.json"))),
    observationToDriveSourceState(observation),
  );
  assert.equal(verdict.status, "UNKNOWN", "unverifiable alias fails closed to UNKNOWN");
  assert.ok(verdict.mergeBlock);
});

test("case 7: Drive auth failure → UNKNOWN + mergeBlock, token redacted", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-current",
    "provider-drive-auth-failed",
    "track-observer-62-exact",
  );
  assert.equal(observation.providerState, "AUTH_FAILED");
  assert.equal(observation.observationComplete, false);
  assert.equal(verdict.status, "UNKNOWN");
  assert.equal(verdict.reason, "DRIVE_UNAVAILABLE");
  assert.ok(verdict.mergeBlock, "auth failure must block merge");
  const serialized = JSON.stringify(observation);
  assert.ok(!serialized.includes("ya29.a0FakeObserverTokenDO_NOT_LEAK"), "fake token must never appear in observation JSON");
  assert.ok(!serialized.includes("FakeObserverToken"), "token body must never appear in observation JSON");
});

test("case 8: Drive permission denied → UNKNOWN + mergeBlock", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-current",
    "provider-drive-permission-denied",
    "track-observer-62-exact",
  );
  assert.equal(observation.providerState, "PERMISSION_DENIED");
  assert.equal(verdict.status, "UNKNOWN");
  assert.ok(verdict.mergeBlock, "permission failure must block merge");
});

test("case 9: pagination incomplete → UNKNOWN + mergeBlock (never a partial PASS)", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-current",
    "provider-drive-pagination-incomplete",
    "track-observer-62-exact",
  );
  assert.equal(observation.providerState, "INCOMPLETE");
  assert.equal(observation.paginationComplete, false);
  assert.equal(observation.observationComplete, false);
  assert.equal(verdict.status, "UNKNOWN");
  assert.equal(verdict.reason, "DRIVE_INCOMPLETE");
  assert.ok(verdict.mergeBlock, "incomplete pagination must block merge");
});

test("case 10a: hash failure — declared size ≠ received bytes → UNKNOWN + mergeBlock", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-current",
    "provider-drive-hash-size-mismatch",
    "track-observer-62-exact",
  );
  assert.equal(observation.providerState, "INCOMPLETE");
  assert.ok(observation.providerErrors.some((error) => error.code === "HASH_SIZE_MISMATCH"));
  const root = observation.candidateFiles.find((file) => file.fileId === "1f73observerTrack62V11OldFileAaa");
  assert.equal(root.hashEvidence.sizeMismatch, true);
  assert.equal(verdict.status, "UNKNOWN");
  assert.ok(verdict.mergeBlock, "hash evidence failure must block merge");
});

test("case 10b: hash failure — interrupted content stream → UNKNOWN + mergeBlock, token redacted", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-current",
    "provider-drive-hash-stream-failed",
    "track-observer-62-exact",
  );
  assert.equal(observation.providerState, "INCOMPLETE");
  assert.ok(observation.providerErrors.some((error) => error.code === "HASH_STREAM_FAILED"));
  assert.ok(!JSON.stringify(observation).includes("FakeObserverToken"), "stream error must be redacted");
  assert.equal(verdict.status, "UNKNOWN");
  assert.ok(verdict.mergeBlock);
});

test("case 10c: hash failure — content exceeds hashMaxBytes → HASH_TRUNCATED blocks", async () => {
  const { observation, verdict } = await runCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
    { hashMaxBytes: 16 },
  );
  assert.equal(observation.providerState, "INCOMPLETE");
  assert.ok(observation.providerErrors.some((error) => error.code === "HASH_TRUNCATED"));
  const root = observation.candidateFiles.find((file) => file.fileId === "1f73observerTrack62V11OldFileAaa");
  assert.equal(root.hashEvidence.truncatedAtLimit, true);
  assert.equal(root.hashEvidence.verified, false, "a truncated hash is never verified");
  assert.equal(verdict.status, "UNKNOWN");
  assert.ok(verdict.mergeBlock, "bounded-hash refusal must block merge");
});

test("case 11: historical pinned + newer current + observed artifact → PASS/HISTORICAL_PINNED verified, not stale", async () => {
  const { observation, verdict } = await runCase(
    "observer-track61-v1-5-historical-pinned",
    "provider-track61-historical-verified",
    "track-observer-61-historical",
  );
  assert.equal(observation.providerState, "SUCCESS");
  assert.equal(observation.observationComplete, true);
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "HISTORICAL_PINNED");
  assert.equal(verdict.historicalFingerprintVerified, true, "observed V1.5 artifact hash matches the pin");
  assert.equal(verdict.driveCurrentRevision, "V1.7");
  assert.equal(verdict.mergeBlock, undefined);
  assert.notEqual(verdict.reason, "SOURCE_STALE", "a newer current must never read as stale for a historical pin");
});

test("observation SHA-256 values are real content hashes (recomputed independently)", async () => {
  const provider = readJson(path.join(OBSERVER_FIXTURES, "provider-track62-v1-1-exact.json"));
  const contentText = Buffer.from(provider.content["1f73observerTrack62V11OldFileAaa"].chunksBase64[0], "base64").toString("utf8");
  const expected = createHash("sha256").update(contentText).digest("hex");
  const { observation } = await runCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
  );
  const root = observation.candidateFiles.find((file) => file.fileId === "1f73observerTrack62V11OldFileAaa");
  assert.equal(root.sha256, expected, "observation hash must equal the independently computed content hash");
  assert.equal(root.sha256Source, "COMPUTED_FROM_CONTENT");
  assert.equal(root.receivedBytes, Buffer.byteLength(contentText, "utf8"));
  assert.equal(root.executableState, "CONTENT_PRESENT");
});

/* ------------------------------------------------------------------ */
/* filename label extraction (context only, never authority)          */
/* ------------------------------------------------------------------ */

test("filenameRevisionLabel extracts labels as descriptive context", () => {
  assert.equal(filenameRevisionLabel("Track61 V1.9.html"), "V1.9");
  assert.equal(filenameRevisionLabel("Track64 V1.2.1.html"), "V1.2.1");
  assert.equal(filenameRevisionLabel("Track64 V1.3 (display).html"), "V1.3");
  assert.equal(filenameRevisionLabel("notes.txt"), undefined);
  // "Track61" itself must never yield a revision label.
  assert.equal(filenameRevisionLabel("Track61.html"), undefined);
});

/* ------------------------------------------------------------------ */
/* HTTP transport contracts (read-only GET, pagination, fail-closed)  */
/* ------------------------------------------------------------------ */

const FAKE_TOKEN = "ya29.a0FakeTransportUnitTestToken_1234567890abcdef";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

function recordingFetch(handler) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", headers: init?.headers ?? {} });
    return handler(String(url), init, calls);
  };
  return { fetch, calls };
}

function httpTransport(fetch, options = {}) {
  clearRegisteredSecrets();
  return createHttpDriveTransport({
    tokenProvider: { getAccessToken: async () => FAKE_TOKEN },
    fetch,
    ...options,
  });
}

test("http transport: paginates listing to the terminal page and stays read-only GET", async () => {
  const { fetch, calls } = recordingFetch((url) => {
    if (!url.includes("pageToken=")) {
      return jsonResponse({ files: [{ id: "fileA", name: "A V1.0.html", mimeType: "text/html", size: "10" }], nextPageToken: "token-2" });
    }
    return jsonResponse({ files: [{ id: "fileB", name: "B V2.0.html", mimeType: "text/html", size: "20" }] });
  });
  const transport = httpTransport(fetch);
  const outcome = await transport.listFolder("folderX");
  assert.equal(outcome.paginationComplete, true);
  assert.equal(outcome.pagesFetched, 2);
  assert.deepEqual(outcome.records.map((record) => record.id), ["fileA", "fileB"]);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.method, "GET", "Drive observer transport must only issue GET requests");
    const decoded = decodeURIComponent(call.url.replace(/\+/g, " "));
    assert.ok(decoded.includes("'folderX' in parents"), "listing must scope to the observed folder");
    assert.ok(!decoded.includes("uploadType"), "no upload endpoint may appear in a read-only transport");
  }
});

test("http transport: maxPages cap → paginationComplete=false, never silently truncated", async () => {
  const { fetch } = recordingFetch(() =>
    jsonResponse({ files: [{ id: "fileA" }], nextPageToken: "always-more" }),
  );
  const transport = httpTransport(fetch, { maxPages: 2 });
  const outcome = await transport.listFolder("folderX");
  assert.equal(outcome.paginationComplete, false);
  assert.equal(outcome.truncatedByLimit, true);
  assert.equal(outcome.pagesFetched, 2);
});

test("http transport: status → fail-closed error kinds", async () => {
  const cases = [
    [401, "AUTH_FAILED"],
    [403, "PERMISSION_DENIED"],
    [404, "PERMISSION_DENIED"],
    [429, "UNAVAILABLE"],
    [500, "UNAVAILABLE"],
    [412, "API_ERROR"],
  ];
  for (const [status, expectedKind] of cases) {
    const { fetch } = recordingFetch(() => new Response("err", { status }));
    const transport = httpTransport(fetch);
    await assert.rejects(
      () => transport.listFolder("folderX"),
      (error) => error.name === "DriveTransportError" && error.kind === expectedKind,
      `status ${status} must map to ${expectedKind}`,
    );
  }
});

test("http transport: malformed responses fail closed", async () => {
  for (const payload of ["not json{", "[]", '{"files": "not-an-array"}', '{"files": [{}]}']) {
    const { fetch } = recordingFetch(() => new Response(payload, { status: 200 }));
    const transport = httpTransport(fetch);
    await assert.rejects(
      () => transport.listFolder("folderX"),
      (error) => error.name === "DriveTransportError" && error.kind === "MALFORMED_RESPONSE",
      `payload ${payload} must fail closed`,
    );
  }
});

test("http transport: error bodies are redacted — the bearer token can never leak (NO_TOKEN_IN_ERROR_OUTPUT)", async () => {
  const { fetch } = recordingFetch((_url, init) =>
    new Response(`upstream echoed authorization: ${init.headers.Authorization}`, { status: 500 }),
  );
  const transport = httpTransport(fetch);
  await assert.rejects(
    () => transport.listFolder("folderX"),
    (error) => {
      assert.equal(error.name, "DriveTransportError");
      assert.equal(error.kind, "UNAVAILABLE");
      assert.ok(!error.message.includes(FAKE_TOKEN), "exact token must be scrubbed from error output");
      assert.ok(!/ya29\./.test(error.message), "token pattern must be scrubbed from error output");
      return true;
    },
  );
  clearRegisteredSecrets();
  const patternOnly = redactString(`token was ${FAKE_TOKEN}`);
  assert.ok(!patternOnly.includes(FAKE_TOKEN), "pattern scrub works even without registration");
  assert.ok(patternOnly.includes("[REDACTED]"));
});

test("http transport: streams content via alt=media GET for hashing", async () => {
  const payload = "observer fixture bytes";
  const { fetch, calls } = recordingFetch(
    (url) => (url.includes("alt=media") ? new Response(payload) : jsonResponse({ files: [] })),
  );
  const transport = httpTransport(fetch);
  const chunks = [];
  for await (const chunk of transport.streamFileContent("fileZ")) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  assert.equal(text, payload);
  assert.equal(calls[0].method, "GET");
  assert.ok(calls[0].url.includes("/files/fileZ?alt=media"));
});

/* ------------------------------------------------------------------ */
/* Auth architecture: short-lived only, long-lived refused            */
/* ------------------------------------------------------------------ */

test("liveObservationAvailability: absent token → LIVE_DISABLED fail closed", () => {
  const availability = liveObservationAvailability({});
  assert.equal(availability.enabled, false);
  assert.match(availability.reason, /LIVE_DISABLED/);
});

test("liveObservationAvailability + token provider: long-lived credential material is refused", async () => {
  const refused = liveObservationAvailability({
    DESIGN_INTAKE_DRIVE_ACCESS_TOKEN: FAKE_TOKEN,
    GOOGLE_APPLICATION_CREDENTIALS: "/secrets/sa.json",
  });
  assert.equal(refused.enabled, false);
  assert.match(refused.reason, /refused|LIVE_DISABLED/);

  await assert.rejects(
    () => createEnvAccessTokenProvider({ SERVICE_ACCOUNT_KEY: '{"client_email": "x"}' }).getAccessToken(),
    /refused/i,
    "the env token provider must refuse service-account key material",
  );

  const enabled = liveObservationAvailability({ DESIGN_INTAKE_DRIVE_ACCESS_TOKEN: "short-lived-token-value" });
  assert.equal(enabled.enabled, true);
});

test("token provider: absent token → AUTH_FAILED fail-closed (never a PASS)", async () => {
  await assert.rejects(
    () => createEnvAccessTokenProvider({}).getAccessToken(),
    (error) => error.name === "DriveTransportError" && error.kind === "AUTH_FAILED",
  );
});

/* ------------------------------------------------------------------ */
/* Secret redaction contracts                                         */
/* ------------------------------------------------------------------ */

test("redactDeep scrubs tokens at every depth of an observation-shaped object", () => {
  registerSecret("sekret-live-bearer-token-value-000000");
  const input = {
    note: "failed with sekret-live-bearer-token-value-000000 inside",
    providerErrors: [{ message: "ya29.aBExplicitPatternTokenLeak1234567890 in error" }],
    files: [{ name: "AIzaSyFakeGoogleApiKey0000000000000000000" }],
  };
  const redacted = redactDeep(input);
  const serialized = JSON.stringify(redacted);
  assert.ok(!serialized.includes("sekret-live-bearer-token-value"));
  assert.ok(!serialized.includes("ya29."));
  assert.ok(!serialized.includes("AIza"));
  clearRegisteredSecrets();
});

/* ------------------------------------------------------------------ */
/* Static security contracts                                          */
/* ------------------------------------------------------------------ */

function readSource(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function observerSources() {
  return readdirSync(OBSERVER_LIB_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => readSource(path.join("lib", "design-intake", "drive-observer", name)))
    .concat([
      readSource(path.join("scripts", "design-intake-drive-observe.mjs")),
      readSource(path.join("scripts", "design-intake-source-freshness-live.mjs")),
    ]);
}

test("NO_LONG_LIVED_KEY_REQUIRED: no service-account / refresh-token code path exists", () => {
  for (const source of observerSources()) {
    assert.doesNotMatch(source, /client_email/, "service-account identity must not appear in observer code");
    assert.doesNotMatch(source, /private_key/, "service-account key material must not appear in observer code");
    assert.doesNotMatch(source, /refresh[-_]token\s*[:=]/i, "refresh-token handling must not appear in observer code");
  }
  // PEM markers are only allowed inside redact.ts's defensive scrub patterns.
  for (const name of readdirSync(OBSERVER_LIB_DIR).filter((entry) => entry.endsWith(".ts") && entry !== "redact.ts")) {
    assert.doesNotMatch(
      readSource(path.join("lib", "design-intake", "drive-observer", name)),
      /-----BEGIN/,
      `no PEM blocks in ${name}`,
    );
  }
  for (const script of ["design-intake-drive-observe.mjs", "design-intake-source-freshness-live.mjs"]) {
    assert.doesNotMatch(readSource(path.join("scripts", script)), /-----BEGIN/, `no PEM blocks in ${script}`);
  }
});

test("NO_DRIVE_WRITE_SCOPE: no write/upload/delete operation exists in the observer", () => {
  for (const source of observerSources()) {
    assert.doesNotMatch(source, /method:\s*["'](POST|PUT|PATCH|DELETE)["']/, "transport must never issue writes");
    assert.doesNotMatch(source, /\/upload\//, "no Drive upload endpoint");
    assert.doesNotMatch(source, /uploadType/, "no Drive uploadType parameter");
    assert.doesNotMatch(source, /permissions\.create|revisions\.delete|files\.update|files\.trash/i, "no Drive mutation API surface");
  }
});

test("NO_ARBITRARY_DRIVE_HTML_EXECUTION: observed content is never parsed or executed", () => {
  for (const source of observerSources()) {
    assert.doesNotMatch(source, /\beval\s*\(/, "no eval in observer code");
    assert.doesNotMatch(source, /new\s+Function\s*\(/, "no dynamic Function construction");
    assert.doesNotMatch(source, /innerHTML|dangerouslySetInnerHTML|document\.(write|createElement\(["']script)/, "no DOM injection");
    assert.doesNotMatch(source, /import\s*\(\s*[^)]*content/i, "observed content is never dynamically imported");
  }
});

test("NO_SECRET_IN_REPOSITORY: observer fixtures contain only documented fake redaction vectors", () => {
  const allowedFakes = new Set([
    "ya29.a0FakeObserverTokenDO_NOT_LEAK_000000000",
    "ya29.a0FakeTransportUnitTestToken_1234567890abcdef",
  ]);
  const secretPattern = /ya29\.[A-Za-z0-9._-]+|AIza[A-Za-z0-9_-]{35}|gh[pousr]_[A-Za-z0-9]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|1\/\/[A-Za-z0-9._-]+/g;
  const files = readdirSync(OBSERVER_FIXTURES).map((name) => ({
    name,
    content: readFileSync(path.join(OBSERVER_FIXTURES, name), "utf8"),
  }));
  for (const file of files) {
    for (const match of file.content.matchAll(secretPattern)) {
      assert.ok(
        allowedFakes.has(match[0]),
        `unexpected secret-shaped string '${match[0]}' in ${file.name} (only documented fake redaction vectors are allowed)`,
      );
    }
  }
});

test("UNTRUSTED_PR_CANNOT_EXECUTE_WITH_PRIVILEGED_TOKEN: workflow static boundary contract", () => {
  const workflowPath = path.join(".github", "workflows", "design-source-freshness-observer.yml");
  const workflow = readSource(workflowPath);

  // pull_request (unprivileged), never pull_request_target as an active trigger.
  assert.match(workflow, /pull_request:/, "PR trigger must be plain pull_request");
  assert.doesNotMatch(workflow, /^[^#\n]*pull_request_target:/m, "pull_request_target is forbidden as a trigger");

  // No active id-token permission and no repo secrets anywhere yet (an
  // active permission would be an uncommented YAML key; HOLD comments and
  // echo documentation strings must not trigger the check).
  assert.doesNotMatch(workflow, /^\s*id-token:\s*write/m, "no active id-token: write until WIF is provisioned");
  assert.doesNotMatch(workflow, /^[^#\n]*\bsecrets\./m, "no secret references until the trusted live job exists");

  // The privileged live job must never check out PR-controlled code.
  assert.doesNotMatch(workflow, /pull_request\.head/, "live job must not check out the PR head");
  assert.doesNotMatch(workflow, /refs\/pull\//, "live job must not resolve PR refs");

  // Split jobs (indentation-aware, fail closed on unparseable structure).
  const lines = workflow.split(/\r?\n/);
  const jobsIndex = lines.findIndex((line) => line === "jobs:");
  assert.ok(jobsIndex >= 0, "workflow must declare a jobs: section");
  const jobBlocks = {};
  let current = null;
  for (const line of lines.slice(jobsIndex + 1)) {
    const jobMatch = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (jobMatch) {
      current = jobMatch[1];
      jobBlocks[current] = [];
      continue;
    }
    if (current !== null) jobBlocks[current].push(line);
  }
  assert.ok(jobBlocks["observer-contract"], "unprivileged contract job must exist");
  assert.ok(jobBlocks["live-observation"], "trusted live-observation job must exist");

  // Unprivileged PR job: contents: read only — no id-token, no secrets.
  const contractJob = jobBlocks["observer-contract"].join("\n");
  assert.match(
    contractJob,
    /permissions:\s*\n(?:\s*#[^\n]*\n)*\s*contents:\s*read/,
    "PR job must be limited to contents: read",
  );
  assert.doesNotMatch(contractJob, /^\s*id-token:/m, "PR job must never hold id-token permission");

  // Trusted job carries the explicit HOLD marker.
  assert.match(
    jobBlocks["live-observation"].join("\n"),
    /LIVE_WIF_CONFIGURATION_HOLD/,
    "live job must carry the explicit configuration hold marker",
  );
});

test("PURE_RESOLVER_REUSE: the #171 resolver source is byte-identical to merged main", async () => {
  // The observation layer must reuse #171 unchanged; any accidental edit to
  // the pure resolver is a boundary violation. Compare against origin/main.
  const { execFileSync: exec } = await import("node:child_process");
  let mainVersion;
  try {
    mainVersion = exec("git", ["show", "origin/main:lib/design-intake/source-freshness.ts"], {
      encoding: "utf8",
      cwd: repoRoot,
    });
  } catch {
    assert.ok(false, "origin/main must be available to verify resolver purity");
  }
  const workingVersion = readSource(path.join("lib", "design-intake", "source-freshness.ts"));
  const normalize = (text) => text.replace(/\r\n/g, "\n");
  assert.equal(
    normalize(workingVersion),
    normalize(mainVersion),
    "source-freshness.ts must remain identical to origin/main",
  );
});

/* ------------------------------------------------------------------ */
/* CLI contracts                                                      */
/* ------------------------------------------------------------------ */

function runCli(script, args, env = {}) {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--import", "tsx", script, ...args],
      { encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } },
    );
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    return { code: error.status ?? -1, stdout: String(error.stdout ?? ""), stderr: String(error.stderr ?? "") };
  }
}

const CONFIG_ARG = path.join("tests", "fixtures", "source-freshness", "observer", "observer-config.json");
const FIXTURE_ARG = (name) =>
  path.join("tests", "fixtures", "source-freshness", "observer", `${name}.json`);
const MANIFESTS_ARG = path.join("tests", "fixtures", "source-freshness", "manifests");

test("CLI observe: fixture success → exit 0, deterministic JSON, provider SUCCESS", () => {
  const result = runCli("scripts/design-intake-drive-observe.mjs", [
    "--config", CONFIG_ARG,
    "--mode", "fixture",
    "--fixture", FIXTURE_ARG("provider-track62-v1-1-exact"),
    "--track", "track-observer-62-exact",
    "--json",
  ]);
  assert.equal(result.code, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  // --json keeps stdout machine-parseable (human summary goes to stderr).
  const payload = JSON.parse(result.stdout.trim());
  assert.equal(payload.observations.length, 1);
  assert.equal(payload.observations[0].providerState, "SUCCESS");
  assert.equal(payload.observations[0].observationComplete, true);
  assert.equal(payload.observations[0].trackRootIdentity, "track-observer-62-exact");
});

test("CLI observe: degraded provider → exit 1, never printed as PASS, token redacted", () => {
  const result = runCli("scripts/design-intake-drive-observe.mjs", [
    "--config", CONFIG_ARG,
    "--mode", "fixture",
    "--fixture", FIXTURE_ARG("provider-drive-auth-failed"),
    "--track", "track-observer-62-exact",
    "--json",
  ]);
  assert.equal(result.code, 1);
  assert.ok(result.stdout.includes("AUTH_FAILED"));
  assert.ok(!result.stdout.includes("PASS"), "a provider failure must never read as PASS");
  assert.ok(!result.stdout.includes("FakeObserverToken"), "token must be redacted from CLI output");
  assert.ok(!result.stderr.includes("FakeObserverToken"), "token must be redacted from CLI stderr");
});

test("CLI observe: live mode without credentials → exit 3 LIVE_DISABLED (fail closed)", () => {
  const result = runCli("scripts/design-intake-drive-observe.mjs", [
    "--config", CONFIG_ARG,
    "--mode", "live",
    "--track", "track-observer-62-exact",
  ], { DESIGN_INTAKE_DRIVE_ACCESS_TOKEN: "" });
  assert.equal(result.code, 3);
  assert.match(result.stderr, /LIVE_DISABLED/);
  assert.ok(!result.stdout.includes("PASS"), "LIVE_DISABLED must never print PASS");
});

test("CLI freshness:live: exact current → exit 0 with PASS/CURRENT verdict line", () => {
  const result = runCli("scripts/design-intake-source-freshness-live.mjs", [
    "--config", CONFIG_ARG,
    "--mode", "fixture",
    "--fixture", FIXTURE_ARG("provider-track62-v1-1-exact"),
    "--manifests", MANIFESTS_ARG,
    "--track", "track-observer-62-exact",
  ]);
  assert.equal(result.code, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  assert.match(result.stdout, /PASS\s+observer-track62-v1-1-current\.json — CURRENT/);
});

test("CLI freshness:live: stale source → exit 1 with FAIL/SOURCE_STALE mergeBlock", () => {
  const result = runCli("scripts/design-intake-source-freshness-live.mjs", [
    "--config", CONFIG_ARG,
    "--mode", "fixture",
    "--fixture", FIXTURE_ARG("provider-track61-v1-9-live"),
    "--manifests", MANIFESTS_ARG,
    "--track", "track-observer-61-stale",
  ]);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /FAIL\s+observer-track61-v1-7-current\.json — SOURCE_STALE \[mergeBlock\]/);
});

test("CLI freshness:live: provider auth failure → exit 1 UNKNOWN, token redacted (PROVIDER_FAILURE_BLOCKS)", () => {
  const result = runCli("scripts/design-intake-source-freshness-live.mjs", [
    "--config", CONFIG_ARG,
    "--mode", "fixture",
    "--fixture", FIXTURE_ARG("provider-drive-auth-failed"),
    "--manifests", MANIFESTS_ARG,
    "--track", "track-observer-62-exact",
  ]);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /UNKNOWN\s+observer-track62-v1-1-current\.json — DRIVE_UNAVAILABLE \[mergeBlock\]/);
  assert.ok(!result.stdout.includes("FakeObserverToken"));
  assert.ok(!result.stderr.includes("FakeObserverToken"));
});

test("CLI freshness:live: LIVE_DISABLED exit 3 without credential contract", () => {
  const result = runCli("scripts/design-intake-source-freshness-live.mjs", [
    "--config", CONFIG_ARG,
    "--mode", "live",
    "--manifests", MANIFESTS_ARG,
    "--track", "track-observer-62-exact",
  ], { DESIGN_INTAKE_DRIVE_ACCESS_TOKEN: "" });
  assert.equal(result.code, 3);
  assert.match(result.stderr, /LIVE_DISABLED/);
});
