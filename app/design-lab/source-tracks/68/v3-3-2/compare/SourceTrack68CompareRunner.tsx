"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./compare-runner.module.css";
import {
  SOURCE_TRACK_68_A_B_SEMANTICS,
  SOURCE_TRACK_68_DRIVE_FOLDER_ID,
  SOURCE_TRACK_68_EXTERNAL_MEDIA,
  SOURCE_TRACK_68_HERO_LEFT,
  SOURCE_TRACK_68_HERO_RIGHT,
  SOURCE_TRACK_68_LIFECYCLE,
  SOURCE_TRACK_68_PORTAL_COUNTS,
  SOURCE_TRACK_68_PORTAL_LEDGER,
  SOURCE_TRACK_68_REVISION,
  SOURCE_TRACK_68_SOURCE_DEFECTS,
  SOURCE_TRACK_68_TITLE,
  SOURCE_TRACK_68_VARIANT_A,
  SOURCE_TRACK_68_VARIANT_B,
} from "@/lib/source-track-68/provenance";
import {
  type BridgeMessage,
  type CompareMode,
  buildLauncherSrcdoc,
  buildVariantSrcdoc,
  SOURCE_TRACK_68_VERIFICATION_TARGETS,
} from "@/lib/source-track-68/host-bridge";

type RunnerState = "verifying" | "ready" | "failed";

interface Verification {
  state: RunnerState;
  bytes: number | null;
  sha256: string | null;
  reason: string | null;
}

const INITIAL: Verification = { state: "verifying", bytes: null, sha256: null, reason: null };

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{children}</span>
    </div>
  );
}

export default function SourceTrack68CompareRunner() {
  const [mode, setMode] = useState<CompareMode>("launcher");
  const [verification, setVerification] = useState<Verification>(INITIAL);
  const [nonce, setNonce] = useState(0);
  const [portalEvent, setPortalEvent] = useState<BridgeMessage | null>(null);
  const [htmlText, setHtmlText] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Current verification target depends on mode
  const target = useMemo(() => {
    return SOURCE_TRACK_68_VERIFICATION_TARGETS.find((t) => t.mode === mode)!;
  }, [mode]);

  // Fetch + verify the frozen source HTML bytes (fail-closed gate) and build srcdoc
  useEffect(() => {
    let cancelled = false;
    // Use a local variable to avoid calling setState synchronously in the effect body
    const run = async () => {
      try {
        const response = await fetch(target.assetPath, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`source fetch HTTP ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const bytes = buffer.byteLength;
        const sha256 = await sha256Hex(buffer);
        if (cancelled) return;
        if (bytes !== target.bytes || sha256 !== target.sha256) {
          setVerification({
            state: "failed",
            bytes,
            sha256,
            reason: "BYTE/SHA MISMATCH — exact source not served; fail-closed (no execution)",
          });
          setHtmlText("");
          return;
        }
        setVerification({ state: "ready", bytes, sha256, reason: null });
        // Build srcdoc from the same verified response
        const text = new TextDecoder().decode(buffer);
        if (cancelled) return;
        if (mode === "launcher") {
          setHtmlText(buildLauncherSrcdoc(text));
        } else {
          setHtmlText(buildVariantSrcdoc(text));
        }
      } catch (error) {
        if (!cancelled) {
          setVerification({
            state: "failed",
            bytes: null,
            sha256: null,
            reason: error instanceof Error ? error.message : String(error),
          });
          setHtmlText("");
        }
      }
    };
    // The async run() sets verification state when it completes.
    // The initial render already starts as "verifying"; when target changes,
    // the previous result is replaced by the new async result.
    run();
    return () => {
      cancelled = true;
    };
  }, [target, mode, nonce]);

  // Listen for bridge postMessage (portal open / variant select)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data.type !== "string") return;
      if (!event.data.type.startsWith("track68-")) return;
      const msg = event.data as BridgeMessage;
      if (msg.type === "track68-select-variant") {
        if (msg.variant === "A" || msg.variant === "B") {
          setMode(msg.variant);
          setPortalEvent(null);
        }
      } else if (msg.type === "track68-portal-open") {
        setPortalEvent(msg);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const backToLauncher = useCallback(() => {
    setMode("launcher");
    setPortalEvent(null);
  }, []);

  const variantLabel =
    mode === "launcher" ? "V3.3.2 Compare Launcher" : mode === "A" ? "V3.3.1A · Mystic / Mixed" : "V3.3.1B · East Asian";

  return (
    <main className={styles.runnerRoot} data-runner-state={verification.state} data-mode={mode}>
      <header className={styles.panel}>
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>
              SOURCE TRACK 68 · {SOURCE_TRACK_68_REVISION} · COMPARE RUNNER
            </p>
            <h1 className={styles.title}>{SOURCE_TRACK_68_TITLE}</h1>
            <p className={styles.warning}>
              NOT CANONICAL PRODUCT — exact pinned source for internal review · A/B BOTH PRESERVED
            </p>
          </div>
          <div className={styles.links}>
            {mode !== "launcher" && (
              <button type="button" className={styles.backBtn} onClick={backToLauncher}>
                ← Compare launcher
              </button>
            )}
            <a href="/design-lab">Design Lab</a>
          </div>
        </div>

        <div className={styles.modeBar}>
          <button
            type="button"
            className={mode === "launcher" ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode("launcher")}
            aria-pressed={mode === "launcher"}
          >
            V3.3.2 Launcher
          </button>
          <button
            type="button"
            className={mode === "A" ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode("A")}
            aria-pressed={mode === "A"}
          >
            A · {SOURCE_TRACK_68_VARIANT_A.variantName}
          </button>
          <button
            type="button"
            className={mode === "B" ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode("B")}
            aria-pressed={mode === "B"}
          >
            B · {SOURCE_TRACK_68_VARIANT_B.variantName}
          </button>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Source identity (fail-closed)</h2>
            <Row label="lifecycle">{SOURCE_TRACK_68_LIFECYCLE}</Row>
            <Row label="Drive root folder">{SOURCE_TRACK_68_DRIVE_FOLDER_ID}</Row>
            <Row label="current view">{variantLabel}</Row>
            <Row label="bytes">{target.bytes.toLocaleString("en-US")}</Row>
            <Row label="SHA-256 (pinned)">{target.sha256}</Row>
            <Row label="bytes (served)">{verification.bytes?.toLocaleString("en-US") ?? "—"}</Row>
            <Row label="SHA-256 (served)">{verification.sha256 ?? "—"}</Row>
            <Row label="verification">
              {verification.state === "ready" && (
                <strong className={styles.ok}>PINNED_EXACT — verified in-browser before execution</strong>
              )}
              {verification.state === "verifying" && <span>verifying…</span>}
              {verification.state === "failed" && (
                <strong className={styles.bad}>{verification.reason}</strong>
              )}
            </Row>
          </section>

          <section className={styles.card}>
            <h2>A/B variant authority</h2>
            <Row label="A · semantic">{SOURCE_TRACK_68_A_B_SEMANTICS.semantics}</Row>
            <Row label="A · label">{SOURCE_TRACK_68_VARIANT_A.variantName}</Row>
            <Row label="B · label">{SOURCE_TRACK_68_VARIANT_B.variantName}</Row>
            <Row label="selected variant">
              <span className={styles.hold}>{SOURCE_TRACK_68_A_B_SEMANTICS.selectedVariant}</span>
            </Row>
            <Row label="diff classes">{SOURCE_TRACK_68_A_B_SEMANTICS.diffClasses.join(" · ")}</Row>
            <p className={styles.note}>
              Both V3.3.1A and V3.3.1B remain available. No sole A/B selection authority exists.
              CANONICAL_ADOPTION=NO, REPOSITORY_LINEAGE_68=NOT_ALLOCATED.
            </p>
          </section>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Portal route ledger (fail-closed)</h2>
            <Row label="portal total">{SOURCE_TRACK_68_PORTAL_COUNTS.total}</Row>
            <Row label="design lab target">
              <span className={styles.ok}>{SOURCE_TRACK_68_PORTAL_COUNTS.designLabTarget} resolved</span>
            </Row>
            <Row label="stable repo target">{SOURCE_TRACK_68_PORTAL_COUNTS.stableRepoTarget}</Row>
            <Row label="hold unresolved">
              <span className={styles.hold}>{SOURCE_TRACK_68_PORTAL_COUNTS.holdUnresolved} fail-closed</span>
            </Row>
            <div className={styles.portalList}>
              {SOURCE_TRACK_68_PORTAL_LEDGER.map((p) => (
                <div key={p.sourceTargetId} className={styles.portalRow} data-status={p.routeStatus}>
                  <span className={styles.portalId}>{p.sourceTargetId}</span>
                  <span className={styles.portalLabel}>{p.sourceLabel}</span>
                  <span className={styles.portalStatus}>
                    {p.routeStatus === "DESIGN_LAB_TARGET" ? (
                      <a href={p.resolvedRepositoryRoute!} target="_blank" rel="noopener noreferrer">
                        {p.resolvedRepositoryRoute} ↗
                      </a>
                    ) : (
                      <span className={styles.hold}>HOLD_UNRESOLVED — fail closed</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h2>Media state</h2>
            <Row label={`hero_left · ${SOURCE_TRACK_68_HERO_LEFT.filename}`}>
              <span className={styles.ok}>
                LOCAL_COMPANION — {SOURCE_TRACK_68_HERO_LEFT.bytes.toLocaleString("en-US")} B ·{" "}
                {SOURCE_TRACK_68_HERO_LEFT.sha256.slice(0, 16)}…
              </span>
            </Row>
            <Row label={`hero_right · ${SOURCE_TRACK_68_HERO_RIGHT.filename}`}>
              <span className={styles.ok}>
                LOCAL_COMPANION — {SOURCE_TRACK_68_HERO_RIGHT.bytes.toLocaleString("en-US")} B ·{" "}
                {SOURCE_TRACK_68_HERO_RIGHT.sha256.slice(0, 16)}…
              </span>
            </Row>
            <Row label="CloudFront byte equivalence">
              <span className={styles.hold}>{SOURCE_TRACK_68_EXTERNAL_MEDIA.cloudfrontByteEquivalence}</span>
            </Row>
            <Row label="direct CloudFront hotlink">
              <span className={styles.bad}>{SOURCE_TRACK_68_EXTERNAL_MEDIA.directCloudfrontHotlink}</span>
            </Row>
            <Row label="external JS">{SOURCE_TRACK_68_EXTERNAL_MEDIA.externalJs}</Row>
            <Row label="external video">{SOURCE_TRACK_68_EXTERNAL_MEDIA.iframe} iframe, 2 CloudFront MP4s (replaced by local companions)</Row>
            <p className={styles.note}>
              Frozen source hotlinks CloudFront hero MP4s. Host bridge replaces these with local
              companion assets at runtime. Source HTML bytes are never modified.
            </p>
          </section>
        </div>

        {portalEvent && (
          <div className={styles.portalEvent} role="status" aria-live="polite">
            {portalEvent.status === "DESIGN_LAB_TARGET" && portalEvent.resolvedRoute ? (
              <>
                <span className={styles.ok}>
                  Portal {portalEvent.targetId} → {portalEvent.resolvedRoute}
                </span>
                <a href={portalEvent.resolvedRoute} target="_blank" rel="noopener noreferrer">
                  Open in new tab ↗
                </a>
              </>
            ) : (
              <span className={styles.hold}>
                Portal {portalEvent.targetId ?? "unknown"} → HOLD_UNRESOLVED — fail closed. No navigation.
              </span>
            )}
            <button type="button" className={styles.dismissBtn} onClick={() => setPortalEvent(null)}>
              dismiss
            </button>
          </div>
        )}
      </header>

      {verification.state === "ready" && htmlText ? (
        <div className={styles.frameWrap}>
          <iframe
            ref={iframeRef}
            className={styles.frame}
            srcDoc={htmlText}
            title={`Track 68 ${variantLabel} (sandboxed host bridge)`}
            sandbox="allow-scripts allow-popups"
            data-source-state="ready"
            data-mode={mode}
          />
        </div>
      ) : (
        <div className={styles.frameWrap} data-source-state={verification.state}>
          <div className={styles.gate}>
            {verification.state === "verifying" && <p>Verifying exact source bytes…</p>}
            {verification.state === "failed" && (
              <>
                <p className={styles.bad}>FAIL-CLOSED — exact source is not being served.</p>
                <p className={styles.note}>{verification.reason}</p>
                <button type="button" className={styles.retry} onClick={reload}>
                  Re-verify
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <details className={styles.defects}>
        <summary>Source defects recorded ({SOURCE_TRACK_68_SOURCE_DEFECTS.length}) — host bridge corrections</summary>
        <ul>
          {SOURCE_TRACK_68_SOURCE_DEFECTS.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </details>
    </main>
  );
}
