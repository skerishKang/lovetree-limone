"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./source-runner.module.css";
import {
  SOURCE_TRACK_68_DRIVE_FOLDER_ID,
  SOURCE_TRACK_68_HTML,
  SOURCE_TRACK_68_LIFECYCLE,
  SOURCE_TRACK_68_MEDIA,
  SOURCE_TRACK_68_PHASE,
  SOURCE_TRACK_68_REVISION,
  SOURCE_TRACK_68_START_ALIAS,
  SOURCE_TRACK_68_TITLE,
} from "@/lib/source-track-68/provenance";

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

export default function SourceTrack68Runner({
  runner,
}: {
  runner: {
    runnerRoute: string;
    sourceAssetPath: string;
    label: string;
  };
}) {
  const [verification, setVerification] = useState<Verification>(INITIAL);
  // Retry nonce: bumped by the Re-verify control so the verification effect
  // (which depends on it) actually re-fetches and re-hashes the exact source.
  // Fail-closed: the iframe is only created once verification reaches "ready".
  const [nonce, setNonce] = useState(0);

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
        if (bytes !== SOURCE_TRACK_68_HTML.bytes || sha256 !== SOURCE_TRACK_68_HTML.sha256) {
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
  }, [runner.sourceAssetPath, nonce]);

  const reload = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  return (
    <main className={styles.runnerRoot} data-runner-state={verification.state}>
      <header className={styles.panel}>
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>SOURCE TRACK 68 · {SOURCE_TRACK_68_REVISION} · SOURCE RUNNER</p>
            <h1 className={styles.title}>{SOURCE_TRACK_68_TITLE}</h1>
            <p className={styles.warning}>NOT CANONICAL PRODUCT — exact pinned source for internal review</p>
            <p className={styles.phase}>
              PHASE 1 SOURCE RUNNER · NATIVE CANDIDATE = {SOURCE_TRACK_68_PHASE.nativeCandidate} · LINEAGE ={" "}
              {SOURCE_TRACK_68_PHASE.repositoryLineage}
            </p>
          </div>
          <div className={styles.links}>
            <a href="/design-lab">Design Lab</a>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Source identity (fail-closed)</h2>
            <Row label="lifecycle">{SOURCE_TRACK_68_LIFECYCLE}</Row>
            <Row label="Drive root folder">{SOURCE_TRACK_68_DRIVE_FOLDER_ID}</Row>
            <Row label="HTML A · 버전3-84개.html">
              {SOURCE_TRACK_68_HTML.variants[0].driveId} — current executable authority
            </Row>
            <Row label="HTML B · 18_버전3_개발본.html">
              {SOURCE_TRACK_68_HTML.variants[1].driveId} — byte-identical (Web CTO fresh re-hash)
            </Row>
            <Row label={`START.html · ${SOURCE_TRACK_68_START_ALIAS.classification}`}>
              <span className={styles.hold}>
                {SOURCE_TRACK_68_START_ALIAS.driveId} — {SOURCE_TRACK_68_START_ALIAS.currentAvailability} ·{" "}
                {SOURCE_TRACK_68_START_ALIAS.status} (not a current variant)
              </span>
            </Row>
            <Row label="filename truth">`버전3-84개` is stale naming — runtime count is 89</Row>
            <Row label="bytes">{SOURCE_TRACK_68_HTML.bytes.toLocaleString("en-US")}</Row>
            <Row label="SHA-256 (pinned)">{SOURCE_TRACK_68_HTML.sha256}</Row>
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
            <h2>Exact media state — LOCAL_EXACT_OUT_OF_GIT</h2>
            <Row label={`videos · v3-001…v3-089`}>
              <span className={styles.hold}>
                {SOURCE_TRACK_68_MEDIA.videoCount} files — {SOURCE_TRACK_68_MEDIA.transport}
              </span>
            </Row>
            <Row label={`posters · poster-001…poster-089`}>
              <span className={styles.hold}>
                {SOURCE_TRACK_68_MEDIA.posterCount} files — {SOURCE_TRACK_68_MEDIA.transport}
              </span>
            </Row>
            <Row label="video bytes (total)">
              {SOURCE_TRACK_68_MEDIA.videoTotalBytes.toLocaleString("en-US")} (64 ≤ 25 MiB · 25 &gt; 25 MiB)
            </Row>
            <Row label="poster bytes (total)">
              {SOURCE_TRACK_68_MEDIA.posterTotalBytes.toLocaleString("en-US")}
            </Row>
            <Row label="local evidence">
              SHA-256 {SOURCE_TRACK_68_MEDIA.localEvidence.sha256Verified} · decode{" "}
              {SOURCE_TRACK_68_MEDIA.localEvidence.decodePass}
            </Row>
            <Row label="external origin">
              <span className={styles.hold}>NOT_AUTHORIZED — no substitute media may be claimed exact</span>
            </Row>
            <p className={styles.note}>
              The 178 runtime assets are intentionally NOT in this repository. Full per-file evidence
              (driveFileId / bytes / SHA-256 / provenance) is committed in{" "}
              <code>design-intake/manifests/track-68-living-media-sphere-v3.json</code>. For local
              exact-media review, stage the assets out of Git at{" "}
              <code>{SOURCE_TRACK_68_MEDIA.stagingPath}/</code> (gitignored — copy{" "}
              <code>assets/videos-v3/</code> + <code>assets/posters-v3/</code> from the Drive source
              folder). Without staging, the frame below still runs the exact source — posters/videos
              404 and poster-first degrades to the plain card sphere; that is the truthful
              missing-asset behavior, not a media-fidelity PASS.
            </p>
          </section>
        </div>
      </header>

      {verification.state === "ready" ? (
        <div className={styles.frameWrap}>
          <iframe
            className={styles.frame}
            src={runner.sourceAssetPath}
            title="Track 68 V3 exact source (sandboxed)"
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
