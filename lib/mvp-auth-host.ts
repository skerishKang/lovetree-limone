/**
 * lib/mvp-auth-host.ts
 *
 * Trusted top-level Product auth host for the static MVP001 shell
 * (public/mvp/01/index.html). Bundled by scripts/build-mvp-auth-host.mjs
 * into dist/client/mvp/01/auth-host.js and served same-origin as
 * /mvp/01/auth-host.js — no CDN, no Worker routing change.
 *
 * Responsibility boundary:
 *   normal LoveTree Firebase session (shared same-origin SDK persistence)
 *     -> this host (top-level /mvp/01 document ONLY)
 *     -> window.__MVP01_GET_ACCESS_TOKEN__ (+ .refresh)
 *     -> existing shell read/write clients -> Bearer /api/*
 *   Source iframes receive NO token material whatsoever.
 *
 * Security properties (do not weaken):
 * - Token value is never stored on window/document, never placed in
 *   URL/query/hash/iframe-src, never postMessaged, never manually persisted
 *   to localStorage/sessionStorage, and never logged.
 * - The installed global is a function (plus a .refresh function),
 *   installed exactly once, non-writable, non-configurable. A pre-existing
 *   provider (e.g. QA stubs installed before page scripts) is never
 *   overwritten.
 * - Principal binding reuses getBoundAccessToken: a token is returned only
 *   when the live Firebase uid still equals the principal read before the
 *   async getIdToken() call. Account change mid-flight fails closed (null).
 *
 * The module self-bootstraps on import in a browser document. All side
 * effects are confined to the top-level MVP document; nothing here runs
 * inside Source surfaces.
 */

import { auth, firebaseConfigReady, googleProvider } from "./firebase";
import { getAuthErrorMessage } from "./auth-errors";
import {
  getBoundAccessToken,
  type AuthTokenProvider,
} from "./auth-token-provider";
import {
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";

declare global {
  interface Window {
    __MVP01_GET_ACCESS_TOKEN__?: unknown;
    __MVP01_AUTH_STATE__?: string;
  }
}

export type MvpAuthStatus =
  | "BOOTING"
  | "AUTH_RESTORING"
  | "AUTHENTICATED"
  | "SIGNED_OUT"
  | "AUTH_ERROR"
  | "CONFIG_MISSING";

/** Shell-facing event detail. Carries status ONLY — never token material. */
export interface MvpAuthShellEvent {
  status: Exclude<MvpAuthStatus, "BOOTING">;
}

export const MVP_AUTH_SHELL_EVENT = "mvp01:auth";
export const MVP_AUTH_TOKEN_GLOBAL = "__MVP01_GET_ACCESS_TOKEN__";
export const MVP_AUTH_STATE_GLOBAL = "__MVP01_AUTH_STATE__";

/** Bounded wait for the first SDK auth callback before failing closed. */
export const MVP_AUTH_RESTORE_TIMEOUT_MS = 15000;

/** Minimal structural view of a Firebase user (injectable for tests). */
export interface MvpAuthUser {
  uid: string;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

/** Minimal structural view of Firebase Auth (injectable for tests). */
export interface MvpAuthBackend {
  readonly configReady: boolean;
  readonly currentUser: MvpAuthUser | null;
  onAuthStateChanged(cb: (user: MvpAuthUser | null) => void): () => void;
  signIn(): Promise<unknown>;
}

export interface MvpAuthEmitter {
  emit(status: MvpAuthShellEvent["status"]): void;
  setStateGlobal(status: MvpAuthStatus): void;
}

function firebaseUserToMvpUser(user: User): MvpAuthUser {
  return {
    uid: user.uid,
    getIdToken: (forceRefresh?: boolean) => user.getIdToken(forceRefresh),
  };
}

function createFirebaseBackend(): MvpAuthBackend | null {
  if (!firebaseConfigReady || !auth || !googleProvider) return null;
  const backendAuth = auth;
  const provider = googleProvider;
  return {
    configReady: true,
    get currentUser(): MvpAuthUser | null {
      const user = backendAuth.currentUser;
      return user ? firebaseUserToMvpUser(user) : null;
    },
    onAuthStateChanged(cb: (user: MvpAuthUser | null) => void): () => void {
      return onAuthStateChanged(backendAuth, (user: User | null) =>
        cb(user ? firebaseUserToMvpUser(user) : null)
      );
    },
    signIn(): Promise<unknown> {
      return signInWithPopup(backendAuth, provider);
    },
  };
}

export interface MvpShellTokenGetter {
  (): Promise<string | null>;
  refresh?: () => Promise<string | null>;
}

export interface MvpAuthCore {
  readonly status: MvpAuthStatus;
  readonly provider: AuthTokenProvider;
  readonly shellGetter: MvpShellTokenGetter;
  /** Resolve when the first auth callback (or the bounded timeout) settles. */
  readonly restored: Promise<void>;
  /** Subscribe to the backend. Idempotent; call once after construction. */
  start(): void;
  handleAuthCallback(user: MvpAuthUser | null): void;
  handleRestoreTimeout(): void;
}

/**
 * Dependency-injected auth core. Pure orchestration over an MvpAuthBackend;
 * performs no DOM. Unit-testable in Node with a fake backend.
 */
export function createMvpAuthCore(
  backend: MvpAuthBackend | null,
  emitter: MvpAuthEmitter
): MvpAuthCore {
  let status: MvpAuthStatus = "BOOTING";
  let settled = false;
  let started = false;
  let resolveRestored: (() => void) | null = null;
  const restored = new Promise<void>((resolve) => {
    resolveRestored = resolve;
  });

  function setStatus(next: MvpAuthStatus): void {
    status = next;
    emitter.setStateGlobal(next);
  }

  function settle(): void {
    if (settled) return;
    settled = true;
    try {
      resolveRestored?.();
    } catch {
      // never let observer plumbing break auth state
    }
    resolveRestored = null;
  }

  function currentUid(): string | null {
    try {
      const uid = backend?.currentUser?.uid;
      return typeof uid === "string" && uid.length > 0 ? uid : null;
    } catch {
      return null;
    }
  }

  async function readToken(forceRefresh: boolean): Promise<{
    token: string;
    principalId: string;
  } | null> {
    await restored;
    if (!backend) return null;
    const uid = currentUid();
    if (!uid) return null;
    const user = backend.currentUser;
    if (!user || user.uid !== uid) return null;
    let token: string;
    try {
      token = await user.getIdToken(forceRefresh);
    } catch {
      return null;
    }
    if (typeof token !== "string" || token.length === 0) return null;
    // Principal may have changed during the async refresh: re-read live and
    // fail closed rather than returning another account's token.
    if (currentUid() !== uid) return null;
    return { token, principalId: uid };
  }

  const provider: AuthTokenProvider = {
    getCurrentPrincipal: () => {
      const uid = currentUid();
      return uid ? { id: uid, provider: "firebase" } : null;
    },
    getAccessToken: () => readToken(false),
  };

  async function shellGetAccessToken(): Promise<string | null> {
    // Gate on restoration FIRST: getBoundAccessToken short-circuits on a
    // null principal without awaiting, which would let the shell fire an
    // unauthenticated burst merely because persistence restore is pending.
    await restored;
    try {
      return await getBoundAccessToken(provider);
    } catch {
      // Principal mismatch (account changed mid-flight): fail closed.
      // Never throw token-adjacent errors into shell read/write paths and
      // never log token material.
      return null;
    }
  }

  async function shellRefreshAccessToken(): Promise<string | null> {
    await restored;
    try {
      // Reuse the shared principal-binding guard with a force-refreshing
      // adapter. The generic AuthTokenProvider interface is NOT extended.
      return await getBoundAccessToken({
        getCurrentPrincipal: () => provider.getCurrentPrincipal(),
        getAccessToken: () => readToken(true),
      });
    } catch {
      return null;
    }
  }

  const shellGetter = Object.assign(shellGetAccessToken, {
    refresh: shellRefreshAccessToken,
  }) as MvpShellTokenGetter;

  function emitShellEvent(next: MvpAuthShellEvent["status"]): void {
    try {
      emitter.emit(next);
    } catch {
      // observer plumbing must never break auth state
    }
  }

  function transitionForUser(user: MvpAuthUser | null): void {
    // First settle: no shell emit. The shell boot already awaited
    // restoration through the installed provider, so its initial reads
    // honestly observed this state (token or 401) — there is no prior
    // canonical state to invalidate. Later transitions DO emit so the
    // shell can drop stale authenticated projections.
    const first = !settled;
    if (user && user.uid) {
      setStatus("AUTHENTICATED");
      settle();
      if (!first) emitShellEvent("AUTHENTICATED");
      return;
    }
    setStatus("SIGNED_OUT");
    settle();
    if (!first) emitShellEvent("SIGNED_OUT");
  }

  function handleAuthCallback(user: MvpAuthUser | null): void {
    if (!backend) {
      setStatus("CONFIG_MISSING");
      settle();
      return;
    }
    transitionForUser(user);
  }

  function handleRestoreTimeout(): void {
    if (settled || !backend) return;
    // Bounded fail-closed: treat a stalled SDK as signed-out. No shell
    // emit: this is still the first settle (see transitionForUser). The
    // gate offers sign-in, which drives a fresh auth callback.
    setStatus("SIGNED_OUT");
    settle();
  }

  return {
    get status(): MvpAuthStatus {
      return status;
    },
    provider,
    shellGetter,
    restored,
    start(): void {
      if (!backend || started) return;
      started = true;
      try {
        backend.onAuthStateChanged((user) => {
          handleAuthCallback(user);
        });
      } catch {
        handleAuthCallback(null);
      }
    },
    handleAuthCallback,
    handleRestoreTimeout,
  };
}

/**
 * Installs the shell token getter exactly once. Never overwrites a
 * pre-existing provider (QA stubs win). Returns true when this call
 * installed the getter.
 */
export function installShellTokenGetterOnce(
  scope: Record<string, unknown>,
  getter: MvpShellTokenGetter
): boolean {
  if (typeof scope[MVP_AUTH_TOKEN_GLOBAL] === "function") return false;
  try {
    Object.defineProperty(scope, MVP_AUTH_TOKEN_GLOBAL, {
      value: getter,
      writable: false,
      configurable: false,
      enumerable: false,
    });
    return true;
  } catch {
    return false;
  }
}

export interface MvpAuthGateCopy {
  loading: string;
  heading: string;
  body: string;
  signIn: string;
  configMissing: string;
}

export const MVP_AUTH_GATE_COPY: MvpAuthGateCopy = {
  loading: "로그인 상태 확인 중…",
  heading: "로그인이 필요합니다",
  body: "내 러브트리 데이터를 불러오려면 로그인해 주세요. 로그인하지 않은 상태에서는 데모나 가짜 내용을 표시하지 않습니다.",
  signIn: "Google로 로그인",
  configMissing: "로그인 설정을 불러오지 못했어요.",
};

const GATE_ROOT_ID = "mvp-auth-gate";
const GATE_STYLE_ID = "mvp-auth-gate-style";
const GATE_CSS = [
  "#mvp-auth-gate{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(8,6,12,.72);backdrop-filter:blur(6px);font-family:inherit}",
  "#mvp-auth-gate[hidden]{display:none}",
  ".mvp-auth-gate-card{max-width:min(420px,calc(100vw - 48px));padding:28px;border-radius:16px;background:#17121f;border:1px solid rgba(255,255,255,.12);color:#f2edf5;text-align:center}",
  ".mvp-auth-gate-card h2{margin:0 0 10px;font-size:20px}",
  ".mvp-auth-gate-card p{margin:0 0 18px;font-size:14px;line-height:1.6;opacity:.85}",
  ".mvp-auth-gate-btn{padding:12px 22px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:#fff;color:#111;font-size:15px;font-weight:700;cursor:pointer}",
  ".mvp-auth-gate-btn:disabled{opacity:.55;cursor:wait}",
  ".mvp-auth-gate-err{min-height:20px;margin:12px 0 0;font-size:13px;color:#ff9d9d}",
  ".mvp-auth-gate-loading{padding:10px 18px;border-radius:999px;background:rgba(23,18,31,.9);border:1px solid rgba(255,255,255,.14);color:#f2edf5;font-size:14px}",
].join("\n");

export interface MvpAuthGate {
  showLoading(): void;
  showGate(): void;
  showError(text: string): void;
  hide(): void;
  setBusy(busy: boolean): void;
  setError(text: string): void;
}

function el(
  doc: Document,
  tag: string,
  className: string,
  text: string
): HTMLElement {
  const node = doc.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

/**
 * Product-owned overlay living ONLY in the top-level MVP document. Never
 * rendered inside Source surfaces; carries no token material.
 */
export function createMvpAuthGate(
  doc: Document,
  copy: MvpAuthGateCopy,
  onSignIn: () => void
): MvpAuthGate {
  if (!doc.getElementById(GATE_STYLE_ID)) {
    const style = doc.createElement("style");
    style.id = GATE_STYLE_ID;
    style.textContent = GATE_CSS;
    doc.head.appendChild(style);
  }
  let root = doc.getElementById(GATE_ROOT_ID);
  if (!root) {
    root = doc.createElement("div");
    root.id = GATE_ROOT_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-live", "polite");
    doc.body.appendChild(root);
  }
  const card = doc.createElement("div");
  card.className = "mvp-auth-gate-card";
  const heading = el(doc, "h2", "", copy.heading);
  const body = el(doc, "p", "", copy.body);
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "mvp-auth-gate-btn";
  button.textContent = copy.signIn;
  button.addEventListener("click", () => onSignIn());
  const err = el(doc, "p", "mvp-auth-gate-err", "");
  err.setAttribute("role", "alert");
  card.appendChild(heading);
  card.appendChild(body);
  card.appendChild(button);
  card.appendChild(err);

  const loading = el(doc, "div", "mvp-auth-gate-loading", copy.loading);

  function render(node: Node): void {
    while (root && root.firstChild) root.removeChild(root.firstChild);
    if (root) {
      root.hidden = false;
      root.appendChild(node);
    }
  }

  return {
    showLoading(): void {
      render(loading);
    },
    showGate(): void {
      err.textContent = "";
      button.disabled = false;
      render(card);
    },
    showError(text: string): void {
      err.textContent = "";
      button.disabled = true;
      body.textContent = text;
      render(card);
    },
    hide(): void {
      if (root) {
        root.hidden = true;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    },
    setBusy(busy: boolean): void {
      button.disabled = busy;
    },
    setError(text: string): void {
      err.textContent = text;
    },
  };
}

export interface MvpAuthHostHandle {
  readonly core: MvpAuthCore;
  readonly installedProvider: boolean;
  dispose(): void;
}

/**
 * Boots the auth host in a browser document. Installs the token getter
 * synchronously (before shell.js evaluates when this module is listed
 * first), then drives overlay + shell events from SDK auth state.
 */
export function bootMvpAuthHost(refs?: {
  window?: Window;
  document?: Document;
  backend?: MvpAuthBackend | null;
  restoreTimeoutMs?: number;
}): MvpAuthHostHandle {
  const win = refs?.window ?? (typeof window !== "undefined" ? window : undefined);
  const doc = refs?.document ?? (typeof document !== "undefined" ? document : undefined);
  const backend = refs?.backend !== undefined ? refs.backend : createFirebaseBackend();
  const restoreTimeoutMs = refs?.restoreTimeoutMs ?? MVP_AUTH_RESTORE_TIMEOUT_MS;

  let gate: MvpAuthGate | null = null;
  let restoreTimer: ReturnType<typeof setTimeout> | null = null;
  let signInBusy = false;

  function clearRestoreTimer(): void {
    if (restoreTimer !== null) {
      clearTimeout(restoreTimer);
      restoreTimer = null;
    }
  }

  function syncOverlay(status: MvpAuthStatus): void {
    if (!gate) return;
    if (status === "AUTHENTICATED") {
      gate.hide();
    } else if (status === "SIGNED_OUT") {
      gate.showGate();
    } else if (status === "AUTH_ERROR" || status === "CONFIG_MISSING") {
      gate.showError(MVP_AUTH_GATE_COPY.configMissing);
    } else {
      gate.showLoading();
    }
  }

  const emitter: MvpAuthEmitter = {
    emit(status: MvpAuthShellEvent["status"]): void {
      if (!win || typeof win.dispatchEvent !== "function") return;
      try {
        win.dispatchEvent(
          new CustomEvent<MvpAuthShellEvent>(MVP_AUTH_SHELL_EVENT, {
            detail: { status },
          })
        );
      } catch {
        // observer plumbing must never break auth state
      }
    },
    setStateGlobal(status: MvpAuthStatus): void {
      if (win) {
        try {
          win[MVP_AUTH_STATE_GLOBAL] = status;
        } catch {
          // ignore
        }
      }
      // Every status change flows through here, including the first
      // settle: keep the overlay in lockstep and retire the bounded
      // restore timer once the SDK has spoken.
      if (
        status === "AUTHENTICATED" ||
        status === "SIGNED_OUT" ||
        status === "AUTH_ERROR" ||
        status === "CONFIG_MISSING"
      ) {
        clearRestoreTimer();
      }
      syncOverlay(status);
    },
  };

  const core = createMvpAuthCore(backend, emitter);

  if (!backend) {
    // CONFIG_MISSING: fail closed. No provider is installed, so the shell
    // behaves exactly as the pre-host anonymous build (explicit 401/error
    // states, no fixture fallback).
    core.handleAuthCallback(null);
    return { core, installedProvider: false, dispose: () => undefined };
  }

  const installedProvider = win
    ? installShellTokenGetterOnce(
        win as unknown as Record<string, unknown>,
        core.shellGetter
      )
    : false;

  // Observer mode: a provider was pre-installed (QA stubs installed
  // before page scripts). The host never overwrites it and renders no
  // overlay — the foreign provider owns shell auth. The host still tracks
  // SDK state and emits transitions for observability. Production never
  // takes this path (nothing pre-installs the seam there).
  const observerOnly = !installedProvider;

  async function onSignInClicked(): Promise<void> {
    if (signInBusy || !gate || !backend) return;
    signInBusy = true;
    gate.setBusy(true);
    gate.setError("");
    try {
      await backend.signIn();
      // Success path completes via onAuthStateChanged; nothing to do here.
    } catch (error) {
      gate.setError(getAuthErrorMessage(error) ?? MVP_AUTH_GATE_COPY.configMissing);
      gate.setBusy(false);
    } finally {
      signInBusy = false;
    }
  }

  if (doc && win && !observerOnly) {
    gate = createMvpAuthGate(doc, MVP_AUTH_GATE_COPY, () => {
      void onSignInClicked();
    });
    // Reflect the pre-settle state immediately: shell reads already await
    // restoration through the installed provider, so no unauthenticated
    // canonical burst fires merely because persistence restore is pending.
    syncOverlay("AUTH_RESTORING");
  }

  // Single SDK subscription, owned by the core. First callback settles;
  // later ones are transitions (shell-invalidating emits + overlay sync
  // flow through the emitter hooks above).
  try {
    core.start();
  } catch {
    core.handleAuthCallback(null);
  }

  restoreTimer = setTimeout(() => {
    restoreTimer = null;
    core.handleRestoreTimeout();
  }, restoreTimeoutMs);
  if (typeof restoreTimer === "object" && restoreTimer !== null && "unref" in restoreTimer) {
    try {
      (restoreTimer as { unref(): void }).unref();
    } catch {
      // ignore (browser timers lack unref)
    }
  }

  return {
    core,
    installedProvider,
    dispose: () => {
      clearRestoreTimer();
    },
  };
}

// Self-bootstrap on import inside a real browser document. Unit tests import
// this module in Node (no document) and only exercise the exported factories.
if (typeof document !== "undefined" && typeof window !== "undefined") {
  try {
    bootMvpAuthHost();
  } catch {
    // A host boot failure must never break the static shell: without a
    // provider the shell keeps its pre-host anonymous fail-closed behavior.
  }
}
