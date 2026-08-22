"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./source-runner.module.css";
import {
  SOURCE_TRACK_18_ASSETS,
  SOURCE_TRACK_18_CANONICAL_ADOPTION,
  SOURCE_TRACK_18_DRIVE_FILE_ID,
  SOURCE_TRACK_18_HTML,
  SOURCE_TRACK_18_LEGACY_MEMORY_ASSETS,
  SOURCE_TRACK_18_REPOSITORY_LINEAGE,
  SOURCE_TRACK_18_REVISION,
  SOURCE_TRACK_18_RUNNER,
  SOURCE_TRACK_18_SOURCE_LOCAL_TRACK17_HREF,
  SOURCE_TRACK_18_TITLE,
} from "@/lib/source-track-18/provenance";
import {
  buildTrack18CanonicalDestination,
  normalizeTrack18Authority,
} from "@/lib/source-track-18/navigation";

type GateState = "verifying" | "ready" | "failed";

type Gate = {
  state: GateState;
  sourceBytes: number | null;
  sourceSha256: string | null;
  assetsVerified: number;
  reason: string | null;
};

const INITIAL_GATE: Gate = {
  state: "verifying",
  sourceBytes: null,
  sourceSha256: null,
  assetsVerified: 0,
  reason: null,
};

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchAndVerify(path: string, bytes: number, sha256: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const observedSha = await sha256Hex(buffer);
  if (buffer.byteLength !== bytes || observedSha !== sha256) {
    throw new Error(`${path}: BYTE/SHA MISMATCH`);
  }
  return { bytes: buffer.byteLength, sha256: observedSha };
}

function focusables(doc: Document): HTMLElement[] {
  return Array.from(
    doc.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden");
}

export default function SourceTrack18Runner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const backgroundRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [gate, setGate] = useState<Gate>(INITIAL_GATE);
  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [liveStatus, setLiveStatus] = useState("Exact source closed.");

  const authority = normalizeTrack18Authority({
    treeId: searchParams.get("treeId"),
    persistedMemoryId: searchParams.get("persistedMemoryId"),
  });
  const canonicalDestination = authority ? buildTrack18CanonicalDestination(authority) : null;

  useEffect(() => {
    let cancelled = false;
    setGate(INITIAL_GATE);
    (async () => {
      try {
        const source = await fetchAndVerify(
          SOURCE_TRACK_18_HTML.assetPath,
          SOURCE_TRACK_18_HTML.bytes,
          SOURCE_TRACK_18_HTML.sha256,
        );
        let assetsVerified = 0;
        const assetFailures: string[] = [];
        for (const asset of SOURCE_TRACK_18_ASSETS) {
          try {
            await fetchAndVerify(asset.assetPath, asset.bytes, asset.sha256);
            assetsVerified += 1;
          } catch (cause) {
            assetFailures.push(cause instanceof Error ? cause.message : String(cause));
          }
          if (!cancelled) {
            setGate({
              state: "verifying",
              sourceBytes: source.bytes,
              sourceSha256: source.sha256,
              assetsVerified,
              reason: null,
            });
          }
        }
        if (!cancelled && assetFailures.length > 0) {
          setGate({
            state: "failed",
            sourceBytes: source.bytes,
            sourceSha256: source.sha256,
            assetsVerified,
            reason: `EXACT_ASSET_TRANSFER_HOLD — ${assetFailures.join(" | ")}`,
          });
          return;
        }
        if (!cancelled) {
          setGate({
            state: "ready",
            sourceBytes: source.bytes,
            sourceSha256: source.sha256,
            assetsVerified,
            reason: null,
          });
        }
      } catch (cause) {
        if (!cancelled) {
          setGate((previous) => ({
            ...previous,
            state: "failed",
            reason: cause instanceof Error ? cause.message : String(cause),
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  useEffect(() => {
    if (backgroundRef.current) backgroundRef.current.inert = open;
  }, [open]);

  const dismiss = useCallback((reason: "x" | "escape") => {
    setOpen(false);
    setBridgeReady(false);
    setLiveStatus(reason === "escape" ? "Fragment Loader dismissed with Escape." : "Fragment Loader dismissed.");
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const enter = useCallback(() => {
    if (!canonicalDestination) {
      setLiveStatus("Enter memory blocked: canonical Tree and persisted Memory authority are required.");
      return;
    }
    setLiveStatus("Opening the exact canonical Tree and persisted Memory destination.");
    router.push(canonicalDestination);
  }, [canonicalDestination, router]);

  const installBridge = useCallback(() => {
    const frame = iframeRef.current;
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win || !doc) {
      setLiveStatus("Source bridge failed closed: same-origin verified frame unavailable.");
      return;
    }

    const close = doc.getElementById("closeBtn") as HTMLAnchorElement | null;
    const enterButton = doc.getElementById("enterBtn") as HTMLAnchorElement | null;
    const start = doc.getElementById("startBtn") as HTMLButtonElement | null;
    const replay = doc.getElementById("replayBtn") as HTMLButtonElement | null;
    const about = doc.getElementById("aboutBtn") as HTMLButtonElement | null;
    const track = doc.querySelector<HTMLElement>(".progress-track");
    const count = doc.getElementById("count");
    const stageNo = doc.getElementById("stageNo");
    if (!close || !enterButton || !start || !replay || !about || !track || !count || !stageNo) {
      setLiveStatus("Source bridge failed closed: required exact-source controls are missing.");
      return;
    }

    close.dataset.sourceHref = close.getAttribute("href") ?? "";
    enterButton.dataset.sourceHref = enterButton.getAttribute("href") ?? "";
    enterButton.setAttribute("aria-disabled", canonicalDestination ? "false" : "true");
    enterButton.dataset.hostAuthority = canonicalDestination ? "resolved" : "missing";
    close.dataset.hostAction = "dismiss";

    const style = doc.createElement("style");
    style.dataset.track18HostA11y = "true";
    style.textContent = `
      a:focus-visible,button:focus-visible{outline:3px solid #e4f861!important;outline-offset:4px!important}
      #closeBtn{min-width:44px!important;min-height:44px!important}
      #enterBtn[aria-disabled="true"]{opacity:.45!important;cursor:not-allowed!important}
    `;
    doc.head.appendChild(style);

    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "Fragment Loader progress");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", count.textContent ?? "0");

    let lastStage = stageNo.textContent ?? "";
    const observer = new MutationObserver(() => {
      track.setAttribute("aria-valuenow", String(Number.parseInt(count.textContent ?? "0", 10) || 0));
      const nextStage = stageNo.textContent ?? "";
      if (nextStage !== lastStage) {
        lastStage = nextStage;
        setLiveStatus(`Fragment Loader stage ${nextStage}.`);
      }
    });
    observer.observe(count, { childList: true, characterData: true, subtree: true });
    observer.observe(stageNo, { childList: true, characterData: true, subtree: true });

    const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fastSettle = (event: Event) => {
      if (!reduced) return;
      const target = event.target as Element | null;
      if (target?.closest("#startBtn,#replayBtn")) {
        queueMicrotask(() => about.click());
      }
    };

    const clickBoundary = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("#closeBtn")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        dismiss("x");
        return;
      }
      if (target?.closest("#enterBtn")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        enter();
      }
    };

    const keyBoundary = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        dismiss("escape");
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables(doc);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    doc.addEventListener("click", clickBoundary, true);
    doc.addEventListener("click", fastSettle, true);
    doc.addEventListener("keydown", keyBoundary, true);

    const cleanup = () => {
      observer.disconnect();
      doc.removeEventListener("click", clickBoundary, true);
      doc.removeEventListener("click", fastSettle, true);
      doc.removeEventListener("keydown", keyBoundary, true);
    };
    win.addEventListener("pagehide", cleanup, { once: true });

    setBridgeReady(true);
    setLiveStatus(
      canonicalDestination
        ? "Exact source open. Host canonical Enter authority is resolved."
        : "Exact source open. Enter memory is blocked until host canonical authority is supplied.",
    );
    window.setTimeout(() => start.focus(), 0);
  }, [canonicalDestination, dismiss, enter]);

  const retry = useCallback(() => setNonce((value) => value + 1), []);

  return (
    <main className={styles.root} data-source-gate={gate.state} data-asset-gate={`${gate.assetsVerified}/8`}>
      <section ref={backgroundRef} className={styles.background} aria-hidden={open || undefined}>
        <p className={styles.eyebrow}>SOURCE TRACK 18 · {SOURCE_TRACK_18_REVISION} · EXACT SOURCE RUNNER</p>
        <h1>{SOURCE_TRACK_18_TITLE}</h1>
        <p className={styles.warning}>NOT CANONICAL PRODUCT · repository Lineage 18 is not allocated</p>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Fail-closed source identity</h2>
            <dl>
              <div><dt>Drive file</dt><dd>{SOURCE_TRACK_18_DRIVE_FILE_ID}</dd></div>
              <div><dt>bytes</dt><dd>{SOURCE_TRACK_18_HTML.bytes.toLocaleString("en-US")} pinned / {gate.sourceBytes?.toLocaleString("en-US") ?? "—"} served</dd></div>
              <div><dt>SHA-256</dt><dd>{gate.sourceSha256 ?? SOURCE_TRACK_18_HTML.sha256}</dd></div>
              <div><dt>runtime assets</dt><dd>{gate.assetsVerified}/8 exact cyber PNGs</dd></div>
              <div><dt>legacy memory-* assets</dt><dd>{SOURCE_TRACK_18_LEGACY_MEMORY_ASSETS}</dd></div>
              <div><dt>canonical adoption</dt><dd>{SOURCE_TRACK_18_CANONICAL_ADOPTION}</dd></div>
              <div><dt>repository lineage</dt><dd>{SOURCE_TRACK_18_REPOSITORY_LINEAGE}</dd></div>
            </dl>
          </section>
          <section className={styles.card}>
            <h2>Host navigation boundary</h2>
            <p><strong>X / Escape</strong> — host dismiss only; no history navigation; trigger focus is restored.</p>
            <p><strong>Enter memory</strong> — host callback only. Missing IDs fail closed.</p>
            <p className={styles.mono}>source-local provenance href: {SOURCE_TRACK_18_SOURCE_LOCAL_TRACK17_HREF}</p>
            <p className={styles.mono}>host destination: {canonicalDestination ?? "BLOCKED — no canonical authority supplied"}</p>
          </section>
        </div>

        {gate.state === "failed" ? (
          <div className={styles.failure} role="alert">
            <strong>FAIL-CLOSED — source is not executable.</strong>
            <span>{gate.reason}</span>
            <button type="button" onClick={retry}>Re-verify exact bytes</button>
          </div>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            className={styles.launch}
            disabled={gate.state !== "ready"}
            onClick={() => setOpen(true)}
          >
            {gate.state === "ready" ? "Open verified Fragment Loader" : `Verifying exact package · ${gate.assetsVerified}/8`}
          </button>
        )}
        <p className={styles.status} role="status" aria-live="polite">{liveStatus}</p>
      </section>

      {open && gate.state === "ready" ? (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Track18 V2 exact Fragment Loader">
          <iframe
            ref={iframeRef}
            className={styles.frame}
            src={SOURCE_TRACK_18_RUNNER.sourceAssetPath}
            title="Track18 V2 exact Identity Fragment Loader"
            sandbox="allow-scripts allow-same-origin"
            onLoad={installBridge}
            data-bridge-ready={bridgeReady ? "true" : "false"}
          />
          <span className={styles.srOnly} role="status" aria-live="polite">{liveStatus}</span>
        </div>
      ) : null}
    </main>
  );
}
