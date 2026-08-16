"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./source-runner.module.css";
import {
  SOURCE_TRACK_47_DRIVE_FOLDER_ID,
  SOURCE_TRACK_47_HTML,
  SOURCE_TRACK_47_LIFECYCLE,
  SOURCE_TRACK_47_POSTER,
  SOURCE_TRACK_47_REVISION,
  SOURCE_TRACK_47_TITLE,
  SOURCE_TRACK_47_VIDEO,
} from "@/lib/source-track-47/provenance";

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

export default function SourceTrack47Runner({
  runner,
}: {
  runner: {
    runnerRoute: string;
    nativeRoute: string;
    sourceAssetPath: string;
    label: string;
  };
}) {
  const [verification, setVerification] = useState<Verification>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(runner.sourceAssetPath, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`source fetch HTTP ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const bytes = buffer.byteLength;
        const sha256 = await sha256Hex(buffer);
        if (cancelled) return;
        if (bytes !== SOURCE_TRACK_47_HTML.bytes || sha256 !== SOURCE_TRACK_47_HTML.sha256) {
          setVerification({
            state: "failed",
            bytes,
            sha256,
            reason: "BYTE/SHA MISMATCH — exact source not served; fail-closed (no execution)",
          });
          return;
        }
        setVerification({ state: "ready", bytes, sha256, reason: null });
      } catch (error) {
        if (!cancelled) {
          setVerification({
            state: "failed",
            bytes: null,
            sha256: null,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runner.sourceAssetPath]);

  const reload = useCallback(() => {
    setVerification(INITIAL);
  }, []);

  return (
    <main className={styles.runnerRoot} data-runner-state={verification.state}>
      <header className={styles.panel}>
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>SOURCE TRACK 47 · {SOURCE_TRACK_47_REVISION} · SOURCE RUNNER</p>
            <h1 className={styles.title}>{SOURCE_TRACK_47_TITLE}</h1>
            <p className={styles.warning}>NOT CANONICAL PRODUCT — exact pinned source for internal review</p>
          </div>
          <div className={styles.links}>
            <a href={runner.nativeRoute}>Native React candidate →</a>
            <a href="/design-lab">Design Lab</a>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Source identity (fail-closed)</h2>
            <Row label="lifecycle">{SOURCE_TRACK_47_LIFECYCLE}</Row>
            <Row label="Drive folder">{SOURCE_TRACK_47_DRIVE_FOLDER_ID}</Row>
            <Row label="HTML A · 현재후보.html">
              {SOURCE_TRACK_47_HTML.variants[0].driveId}
            </Row>
            <Row label="HTML B · 최종선택-…후보.html">
              {SOURCE_TRACK_47_HTML.variants[1].driveId}
            </Row>
            <Row label="byte identity">HTML A ≡ HTML B (one revision, never two)</Row>
            <Row label="bytes">{SOURCE_TRACK_47_HTML.bytes.toLocaleString("en-US")}</Row>
            <Row label="SHA-256 (pinned)">{SOURCE_TRACK_47_HTML.sha256}</Row>
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
            <h2>Asset state</h2>
            <Row label={`poster · ${SOURCE_TRACK_47_POSTER.filename}`}>
              <span className={styles.ok}>
                {SOURCE_TRACK_47_POSTER.assetState} — {SOURCE_TRACK_47_POSTER.bytes.toLocaleString("en-US")} B ·{" "}
                {SOURCE_TRACK_47_POSTER.sha256.slice(0, 16)}… · Drive {SOURCE_TRACK_47_POSTER.driveId}
              </span>
            </Row>
            <Row label={`video · ${SOURCE_TRACK_47_VIDEO.filename}`}>
              <span className={styles.hold}>
                {SOURCE_TRACK_47_VIDEO.assetState} — NOT transported ({SOURCE_TRACK_47_VIDEO.transport})
              </span>
            </Row>
            <p className={styles.note}>
              Video exact bytes {SOURCE_TRACK_47_VIDEO.bytes.toLocaleString("en-US")} · SHA-256{" "}
              {SOURCE_TRACK_47_VIDEO.sha256} · Drive {SOURCE_TRACK_47_VIDEO.driveId}.{" "}
              {SOURCE_TRACK_47_VIDEO.holdReason}. The exact source therefore runs its own{" "}
              <code>video-failed</code> poster-fallback path inside the frame below — that is the
              truthful missing-asset behavior, not a video-fidelity PASS.
            </p>
          </section>
        </div>
      </header>

      {verification.state === "ready" ? (
        <div className={styles.frameWrap}>
          <iframe
            className={styles.frame}
            src={runner.sourceAssetPath}
            title="Track 47 V4.2.5 exact source (sandboxed)"
            sandbox="allow-scripts"
            data-source-state="ready"
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
    </main>
  );
}
