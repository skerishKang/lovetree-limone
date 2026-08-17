"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./source-runner.module.css";
import {
  LIVING_MEDIA_SPHERE_DRIVE_FOLDER_ID,
  LIVING_MEDIA_SPHERE_GOVERNANCE,
  LIVING_MEDIA_SPHERE_HTML,
  LIVING_MEDIA_SPHERE_LIFECYCLE,
  LIVING_MEDIA_SPHERE_MEDIA,
  LIVING_MEDIA_SPHERE_PHASE,
  LIVING_MEDIA_SPHERE_REVISION,
  LIVING_MEDIA_SPHERE_START_ALIAS,
  LIVING_MEDIA_SPHERE_TITLE,
} from "@/lib/living-media-sphere-v3/provenance";

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

export default function LivingMediaSphereSourceRunner({
  runner,
}: {
  runner: {
    runnerRoute: string;
    sourceAssetPath: string;
    label: string;
  };
}) {
  const [verification, setVerification] = useState<Verification>(INITIAL);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(runner.sourceAssetPath, { cache: "no-store" });
        if (!response.ok) throw new Error(`source fetch HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const bytes = buffer.byteLength;
        const sha256 = await sha256Hex(buffer);
        if (cancelled) return;
        if (bytes !== LIVING_MEDIA_SPHERE_HTML.bytes || sha256 !== LIVING_MEDIA_SPHERE_HTML.sha256) {
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

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return (
    <main className={styles.runnerRoot} data-runner-state={verification.state}>
      <header className={styles.panel}>
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>LIVING MEDIA SPHERE · {LIVING_MEDIA_SPHERE_REVISION} · SOURCE FAMILY RUNNER</p>
            <h1 className={styles.title}>{LIVING_MEDIA_SPHERE_TITLE}</h1>
            <p className={styles.warning}>NOT CANONICAL PRODUCT — exact pinned source for internal review</p>
            <p className={styles.phase}>
              PHASE 1 SOURCE RUNNER · NATIVE CANDIDATE = {LIVING_MEDIA_SPHERE_PHASE.nativeCandidate} · LINEAGE ={" "}
              {LIVING_MEDIA_SPHERE_PHASE.repositoryLineage}
            </p>
          </div>
          <div className={styles.links}>
            <a href="/design-lab">Design Lab</a>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Source-family identity (fail-closed)</h2>
            <Row label="family id">{LIVING_MEDIA_SPHERE_GOVERNANCE.sourceFamilyId}</Row>
            <Row label="lifecycle">{LIVING_MEDIA_SPHERE_LIFECYCLE}</Row>
            <Row label="Drive root folder">{LIVING_MEDIA_SPHERE_DRIVE_FOLDER_ID}</Row>
            <Row label="historical adopted-design folder number">
              {LIVING_MEDIA_SPHERE_GOVERNANCE.historicalDriveFolderNumber} — provenance only
            </Row>
            <Row label="repository numeric source-track id">
              <span className={styles.hold}>UNALLOCATED FOR THIS FAMILY — Issue #242 namespace decision applied</span>
            </Row>
            <Row label="HTML A · 버전3-84개.html">
              {LIVING_MEDIA_SPHERE_HTML.variants[0].driveId} — current executable authority
            </Row>
            <Row label="HTML B · 18_버전3_개발본.html">
              {LIVING_MEDIA_SPHERE_HTML.variants[1].driveId} — byte-identical (Web CTO fresh re-hash)
            </Row>
            <Row label={`START.html · ${LIVING_MEDIA_SPHERE_START_ALIAS.classification}`}>
              <span className={styles.hold}>
                {LIVING_MEDIA_SPHERE_START_ALIAS.driveId} — {LIVING_MEDIA_SPHERE_START_ALIAS.currentAvailability} ·{" "}
                {LIVING_MEDIA_SPHERE_START_ALIAS.status} (not a current variant)
              </span>
            </Row>
            <Row label="filename truth">`버전3-84개` is stale naming — runtime count is 89</Row>
            <Row label="bytes">{LIVING_MEDIA_SPHERE_HTML.bytes.toLocaleString("en-US")}</Row>
            <Row label="SHA-256 (pinned)">{LIVING_MEDIA_SPHERE_HTML.sha256}</Row>
            <Row label="bytes (served)">{verification.bytes?.toLocaleString("en-US") ?? "—"}</Row>
            <Row label="SHA-256 (served)">{verification.sha256 ?? "—"}</Row>
            <Row label="verification">
              {verification.state === "ready" && (
                <strong className={styles.ok}>PINNED_EXACT — verified in-browser before execution</strong>
              )}
              {verification.state === "verifying" && <span>verifying…</span>}
              {verification.state === "failed" && <strong className={styles.bad}>{verification.reason}</strong>}
            </Row>
          </section>

          <section className={styles.card}>
            <h2>Exact media state — LOCAL_EXACT_OUT_OF_GIT</h2>
            <Row label="videos · v3-001…v3-089">
              <span className={styles.hold}>
                {LIVING_MEDIA_SPHERE_MEDIA.videoCount} files — {LIVING_MEDIA_SPHERE_MEDIA.transport}
              </span>
            </Row>
            <Row label="posters · poster-001…poster-089">
              <span className={styles.hold}>
                {LIVING_MEDIA_SPHERE_MEDIA.posterCount} files — {LIVING_MEDIA_SPHERE_MEDIA.transport}
              </span>
            </Row>
            <Row label="video bytes (total)">
              {LIVING_MEDIA_SPHERE_MEDIA.videoTotalBytes.toLocaleString("en-US")} (64 ≤ 25 MiB · 25 &gt; 25 MiB)
            </Row>
            <Row label="poster bytes (total)">
              {LIVING_MEDIA_SPHERE_MEDIA.posterTotalBytes.toLocaleString("en-US")}
            </Row>
            <Row label="local evidence">
              SHA-256 {LIVING_MEDIA_SPHERE_MEDIA.localEvidence.sha256Verified} · decode{" "}
              {LIVING_MEDIA_SPHERE_MEDIA.localEvidence.decodePass}
            </Row>
            <Row label="external origin">
              <span className={styles.hold}>NOT_AUTHORIZED — no substitute media may be claimed exact</span>
            </Row>
            <p className={styles.note}>
              The 178 runtime assets are intentionally NOT in this repository. The preserved per-file evidence
              (Drive file ID / bytes / SHA-256 / provenance) remains in the pre-#242 historical evidence snapshot{" "}
              <code>{LIVING_MEDIA_SPHERE_MEDIA.historicalEvidenceSnapshot}</code>. For local exact-media review,
              stage the assets out of Git at <code>{LIVING_MEDIA_SPHERE_MEDIA.stagingPath}/</code> (gitignored).
              Without staging, the frame below still runs the exact source; missing posters/videos are truthful
              transport HOLD evidence, not a media-fidelity PASS.
            </p>
          </section>
        </div>
      </header>

      {verification.state === "ready" ? (
        <div className={styles.frameWrap}>
          <iframe
            className={styles.frame}
            src={runner.sourceAssetPath}
            title="Living Media Sphere V3 exact source (sandboxed)"
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
