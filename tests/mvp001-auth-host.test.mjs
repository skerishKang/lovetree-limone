import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  createMvpAuthCore,
  installShellTokenGetterOnce,
  MVP_AUTH_GATE_COPY,
  MVP_AUTH_TOKEN_GLOBAL,
} from "../lib/mvp-auth-host.ts";
import { getBoundAccessToken } from "../lib/auth-token-provider.ts";
import { verifyMvpAuthHostArtifact } from "../scripts/lib/firebase-build-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fakeUser(uid, opts = {}) {
  const calls = [];
  return {
    calls,
    user: {
      uid,
      async getIdToken(forceRefresh) {
        calls.push(forceRefresh === true);
        if (opts.fail) throw new Error("token refresh failed");
        if (typeof opts.onToken === "function") opts.onToken();
        return opts.token ?? `id-token-for-${uid}`;
      },
    },
  };
}

function fakeBackend(opts = {}) {
  const state = {
    user: opts.user ?? null,
    cbs: [],
    signInCalls: 0,
    signInError: opts.signInError ?? null,
  };
  const backend = {
    configReady: opts.configReady ?? true,
    get currentUser() {
      return state.user;
    },
    onAuthStateChanged(cb) {
      state.cbs.push(cb);
      return () => undefined;
    },
    async signIn() {
      state.signInCalls += 1;
      if (state.signInError) throw state.signInError;
      return { ok: true };
    },
  };
  return {
    state,
    backend,
    fire(user) {
      state.user = user;
      for (const cb of state.cbs) cb(user);
    },
  };
}

function fakeEmitter() {
  return {
    emits: [],
    states: [],
    emit(status) {
      this.emits.push(status);
    },
    setStateGlobal(status) {
      this.states.push(status);
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

// ── AUTH_ALREADY_SIGNED_IN ───────────────────────────────────────────────

test("AUTH_ALREADY_SIGNED_IN: first callback with user authenticates, getter returns token", async () => {
  const { backend, fire } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  const { user } = fakeUser("uid-a");
  fire(user);
  assert.equal(core.status, "AUTHENTICATED");
  assert.equal(await core.shellGetter(), "id-token-for-uid-a");
  // First settle emits nothing to the shell (no prior canonical state).
  assert.deepEqual(emitter.emits, []);
});

// ── AUTH_RESTORE_PENDING ─────────────────────────────────────────────────

test("AUTH_RESTORE_PENDING: token getter pends until the first auth callback", async () => {
  const { backend, fire } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  let settled = false;
  const pending = core.shellGetter().then((v) => {
    settled = true;
    return v;
  });
  await tick();
  await tick();
  assert.equal(settled, false);
  const { user } = fakeUser("uid-a");
  fire(user);
  assert.equal(await pending, "id-token-for-uid-a");
  assert.equal(settled, true);
});

test("AUTH_RESTORE_PENDING: bounded timeout fails closed to signed-out", async () => {
  const { backend } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  core.handleRestoreTimeout();
  assert.equal(core.status, "SIGNED_OUT");
  await core.restored;
  assert.equal(await core.shellGetter(), null);
});

// ── AUTH_SIGNED_OUT ──────────────────────────────────────────────────────

test("AUTH_SIGNED_OUT: null user settles signed-out, getter returns null (no header)", async () => {
  const { backend, fire } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  fire(null);
  assert.equal(core.status, "SIGNED_OUT");
  assert.equal(await core.shellGetter(), null);
  assert.equal(await core.shellGetter.refresh(), null);
});

// ── AUTH_CONFIG_MISSING ──────────────────────────────────────────────────

test("AUTH_CONFIG_MISSING: null backend fails closed without installing anything", async () => {
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(null, emitter);
  core.start();
  core.handleAuthCallback(null);
  assert.equal(core.status, "CONFIG_MISSING");
  await core.restored;
  assert.equal(await core.shellGetter(), null);
  assert.equal(await core.shellGetter.refresh(), null);
});

// ── TOKEN_GET_SUCCESS / TOKEN_REFRESH_SUCCESS / TOKEN_REFRESH_FAILURE ────

test("TOKEN_GET_SUCCESS uses cached token; TOKEN_REFRESH_SUCCESS forces refresh", async () => {
  const { backend, fire } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  const fu = fakeUser("uid-a");
  fire(fu.user);
  assert.equal(await core.shellGetter(), "id-token-for-uid-a");
  assert.deepEqual(fu.calls, [false]);
  assert.equal(await core.shellGetter.refresh(), "id-token-for-uid-a");
  assert.deepEqual(fu.calls, [false, true]);
});

test("TOKEN_REFRESH_FAILURE fails closed to null (never throws, never leaks)", async () => {
  const { backend, fire } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  const fu = fakeUser("uid-a", { fail: true });
  fire(fu.user);
  assert.equal(await core.shellGetter(), null);
  assert.equal(await core.shellGetter.refresh(), null);
});

// ── PRINCIPAL_MISMATCH_FAIL_CLOSED ───────────────────────────────────────

test("PRINCIPAL_MISMATCH_FAIL_CLOSED: account change mid-refresh returns null", async () => {
  const holder = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(holder.backend, emitter);
  core.start();
  const userB = fakeUser("uid-b").user;
  const userA = fakeUser("uid-a", {
    token: "token-for-A",
    onToken: () => {
      holder.state.user = userB;
    },
  }).user;
  holder.fire(userA);
  assert.equal(await core.shellGetter(), null);
  // After the flip the live principal IS uid-b, so its own token is fine.
  assert.equal(await core.shellGetter.refresh(), "id-token-for-uid-b");
});

test("shared getBoundAccessToken guard throws on principal mismatch (reused property)", async () => {
  await assert.rejects(
    getBoundAccessToken({
      getCurrentPrincipal: () => ({ id: "uid-a", provider: "firebase" }),
      getAccessToken: async () => ({ token: "t", principalId: "uid-b" }),
    })
  );
});

// ── SIGN_OUT_DURING_SESSION / ACCOUNT_CHANGE ─────────────────────────────

test("SIGN_OUT_DURING_SESSION: transition emits signed-out once", async () => {
  const { backend, fire } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  fire(fakeUser("uid-a").user);
  assert.deepEqual(emitter.emits, []);
  fire(null);
  assert.equal(core.status, "SIGNED_OUT");
  assert.deepEqual(emitter.emits, ["SIGNED_OUT"]);
  assert.equal(await core.shellGetter(), null);
});

test("ACCOUNT_CHANGE: new principal token only, old principal never returned", async () => {
  const { backend, fire } = fakeBackend();
  const emitter = fakeEmitter();
  const core = createMvpAuthCore(backend, emitter);
  core.start();
  fire(fakeUser("uid-a", { token: "token-A" }).user);
  assert.equal(await core.shellGetter(), "token-A");
  fire(fakeUser("uid-b", { token: "token-B" }).user);
  assert.equal(core.status, "AUTHENTICATED");
  assert.deepEqual(emitter.emits, ["AUTHENTICATED"]);
  assert.equal(await core.shellGetter(), "token-B");
});

// ── install-once global ──────────────────────────────────────────────────

test("install-once: installs frozen function, second install refused", () => {
  const scope = {};
  const getter = Object.assign(async () => null, {
    refresh: async () => null,
  });
  assert.equal(installShellTokenGetterOnce(scope, getter), true);
  assert.equal(typeof scope[MVP_AUTH_TOKEN_GLOBAL], "function");
  const desc = Object.getOwnPropertyDescriptor(scope, MVP_AUTH_TOKEN_GLOBAL);
  assert.equal(desc.writable, false);
  assert.equal(desc.configurable, false);
  assert.equal(desc.enumerable, false);
  assert.equal(typeof scope[MVP_AUTH_TOKEN_GLOBAL].refresh, "function");
  assert.equal(installShellTokenGetterOnce(scope, getter), false);
});

test("install-once: pre-existing provider (QA stub) is never overwritten", () => {
  const stub = async () => "stub-token";
  const scope = { [MVP_AUTH_TOKEN_GLOBAL]: stub };
  const getter = Object.assign(async () => null, {
    refresh: async () => null,
  });
  assert.equal(installShellTokenGetterOnce(scope, getter), false);
  assert.equal(scope[MVP_AUTH_TOKEN_GLOBAL], stub);
});

// ── static no-token invariants on the host source ────────────────────────

const HOST_SRC = readFileSync(join(__dirname, "..", "lib", "mvp-auth-host.ts"), "utf8");
const SHELL_SRC = readFileSync(join(__dirname, "..", "public", "mvp", "01", "shell.js"), "utf8");

test("NO_MANUAL_TOKEN_STORAGE: host never touches web storage", () => {
  // Usage-shaped patterns only: the module header documents the ban in
  // prose, so plain substring checks would false-positive on comments.
  assert.ok(!/localStorage\s*[.\[(]/.test(HOST_SRC), "host must not use localStorage");
  assert.ok(!/sessionStorage\s*[.\[(]/.test(HOST_SRC), "host must not use sessionStorage");
});

test("NO_TOKEN_IN_POSTMESSAGE: host never postMessages (shell event is a same-document CustomEvent)", () => {
  assert.ok(!/postMessage\s*\(/.test(HOST_SRC), "host must not postMessage");
  assert.ok(HOST_SRC.includes("CustomEvent"), "shell notification must be a CustomEvent");
});

test("NO_TOKEN_IN_URL: host builds no URLs carrying token material", () => {
  assert.ok(!HOST_SRC.includes("mvpSession="), "host must not build bridge bootstrap URLs");
  assert.ok(!/Bearer\s+[$`'"]/.test(HOST_SRC), "host must not build Authorization headers");
  assert.ok(!HOST_SRC.includes("Authorization:"), "host must not touch Authorization");
});

test("host never logs token material", () => {
  assert.ok(!HOST_SRC.includes("console.log"), "host must not console.log");
});

test("shell auth hook carries status only (no token)", () => {
  assert.ok(SHELL_SRC.includes("mvp01:auth"), "shell must listen for the host auth event");
  assert.ok(!SHELL_SRC.includes("__MVP01_AUTH_STATE__"), "shell must not depend on host internals");
});

test("gate copy is exact Product Korean with no fixture promise", () => {
  assert.equal(MVP_AUTH_GATE_COPY.heading, "로그인이 필요합니다");
  assert.ok(MVP_AUTH_GATE_COPY.body.includes("데모나 가짜 내용을 표시하지 않습니다"));
  assert.equal(MVP_AUTH_GATE_COPY.signIn, "Google로 로그인");
});

// ── build artifact guard ─────────────────────────────────────────────────

const FAKE_KEY = "test-fake-api-key-not-real-abcdef1234567890";
const FAKE_DOMAIN = "relovetree.firebaseapp.com";
const FAKE_PROJECT = "relovetree";
const GOOD_CONFIG = { apiKey: FAKE_KEY, authDomain: FAKE_DOMAIN, projectId: FAKE_PROJECT };

async function fixtureClientDir(files) {
  const dir = await mkdtemp(join(tmpdir(), "mvp-auth-host-"));
  await mkdir(join(dir, "mvp", "01"), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, "mvp", "01", name), content);
  }
  return dir;
}

test("PRODUCTION_BUILD_CONFIG_FAIL_CLOSED: missing artifact blocks", async () => {
  const dir = await fixtureClientDir({});
  try {
    const result = await verifyMvpAuthHostArtifact({ clientDir: dir, config: GOOD_CONFIG });
    assert.equal(result.ok, false);
    assert.ok(result.problems.some((p) => p.includes("auth-host.js was not emitted")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PRODUCTION_BUILD_CONFIG_FAIL_CLOSED: empty artifact blocks", async () => {
  const dir = await fixtureClientDir({ "auth-host.js": "" });
  try {
    const result = await verifyMvpAuthHostArtifact({ clientDir: dir, config: GOOD_CONFIG });
    assert.equal(result.ok, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PRODUCTION_BUILD_CONFIG_FAIL_CLOSED: stale artifact without seam markers blocks", async () => {
  const dir = await fixtureClientDir({
    "auth-host.js": `// stale\nconst x="${FAKE_KEY}";const y="${FAKE_DOMAIN}";const z="${FAKE_PROJECT}";`,
  });
  try {
    const result = await verifyMvpAuthHostArtifact({ clientDir: dir, config: GOOD_CONFIG });
    assert.equal(result.ok, false);
    assert.ok(result.problems.some((p) => p.includes("seam markers")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PRODUCTION_BUILD_CONFIG_FAIL_CLOSED: config-less artifact blocks without leaking the key", async () => {
  const dir = await fixtureClientDir({
    "auth-host.js": `// mvp01:auth host\nwindow["__MVP01_GET_ACCESS_TOKEN__"]=function(){};`,
  });
  try {
    const result = await verifyMvpAuthHostArtifact({ clientDir: dir, config: GOOD_CONFIG });
    assert.equal(result.ok, false);
    const joined = result.problems.join("\n");
    assert.ok(!joined.includes(FAKE_KEY), "problem text must never contain the apiKey");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BUILD_AUTH_HOST_EMITTED: matching artifact passes", async () => {
  const dir = await fixtureClientDir({
    "auth-host.js": `// mvp01:auth host\nwindow["__MVP01_GET_ACCESS_TOKEN__"]=function(){};\n// ${FAKE_KEY} ${FAKE_DOMAIN} ${FAKE_PROJECT}\n`,
  });
  try {
    const result = await verifyMvpAuthHostArtifact({ clientDir: dir, config: GOOD_CONFIG });
    assert.equal(result.ok, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SOURCE_AUTHORITY_UNCHANGED: five Source splits carry no auth-host references", () => {
  for (const id of ["SRC056", "SRC057", "SRC058", "SRC060", "SRC064"]) {
    for (const file of ["index.html", "script.js", "styles.css"]) {
      const src = readFileSync(join(__dirname, "..", "src", "03_sources", id, "split", file), "utf8");
      assert.ok(!src.includes("auth-host"), `${id}/${file} must not reference the auth host`);
      assert.ok(!src.includes("MVP01_GET_ACCESS_TOKEN"), `${id}/${file} must not reference the token seam`);
    }
  }
});

test("WORKER_ROUTING_UNCHANGED: /mvp static adapter still resolves the host path", async () => {
  const { resolveMvpStaticAssetPath } = await import("../core/runtime/worker/mvp-router.ts");
  assert.equal(resolveMvpStaticAssetPath("/mvp/01/auth-host.js"), "/mvp/01/auth-host.js");
  assert.equal(resolveMvpStaticAssetPath("/mvp/01"), "/mvp/01/index.html");
  assert.equal(resolveMvpStaticAssetPath("/api/memories/x"), null);
});
