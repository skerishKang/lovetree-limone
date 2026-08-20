"use client";

import { useEffect, useState } from "react";

type SourceState = "checking" | "ready" | "missing";
type MotionPreference = "checking" | "full" | "reduced";

interface Lineage67SourceRunnerProps {
  /** Real package URL — iframe src; relative paths resolve from here. */
  realPackageUrl: string;
  sourceBytes: number;
  sourceSha256: string;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Lineage67-specific source runner — bounded, not shared.
 *
 * Loads the REAL package URL directly in the iframe (no Blob URL).
 * This proves that relative paths (01_Assets/, works/) resolve naturally
 * from the committed package location.
 *
 * The component fetches the source HTML to verify SHA-256 integrity,
 * then sets the iframe src to the real URL instead of a Blob URL.
 */
export default function Lineage67SourceRunner({
  realPackageUrl,
  sourceBytes,
  sourceSha256,
}: Lineage67SourceRunnerProps) {
  const [sourceState, setSourceState] = useState<SourceState>("checking");
  const [verified, setVerified] = useState(false);
  const [motionPreference, setMotionPreference] =
    useState<MotionPreference>("checking");
  const [motionOverride, setMotionOverride] = useState(false);
  const [interactionEnabled, setInteractionEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncMotionPreference = () => {
      const reduced = query.matches;
      setMotionPreference(reduced ? "reduced" : "full");
      if (reduced) {
        setMotionOverride(false);
        setInteractionEnabled(false);
      }
    };

    syncMotionPreference();
    query.addEventListener("change", syncMotionPreference);
    return () => query.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function verifySource() {
      try {
        const response = await fetch(realPackageUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`package asset request failed: ${response.status}`);

        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== sourceBytes)
          throw new Error("package asset byte size mismatch");

        const digest = await crypto.subtle.digest("SHA-256", bytes);
        if (bytesToHex(digest) !== sourceSha256.toLowerCase()) {
          throw new Error("package asset SHA256 mismatch");
        }

        setVerified(true);
        setSourceState("ready");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setVerified(false);
        setSourceState("missing");
      }
    }

    void verifySource();

    return () => {
      controller.abort();
    };
  }, [realPackageUrl, sourceBytes, sourceSha256]);

  const motionAllowed = motionPreference === "full" || motionOverride;

  /* Reduced motion gate */
  if (
    sourceState === "ready" &&
    verified &&
    motionPreference === "reduced" &&
    !motionOverride
  ) {
    return (
      <div
        className="lt-orbit-runner__viewport lt-orbit-runner__viewport--pending"
        data-source-state="ready"
        data-motion-state="reduced"
        role="status"
      >
        <div className="lt-orbit-runner__pending-card lt-orbit-runner__motion-gate">
          <p className="lt-orbit-runner__pending-kicker">REDUCED MOTION ACTIVE</p>
          <h2>원본 모션은 자동 실행하지 않습니다.</h2>
          <p>
            검증된 V2.4.2 원본 바이트는 그대로 유지됩니다. 현재 시스템 설정이 모션
            감소를 요청하고 있어 source iframe을 시작하지 않았습니다.
          </p>
          <button type="button" onClick={() => setMotionOverride(true)}>
            원본 모션 실행
          </button>
        </div>
      </div>
    );
  }

  /* Checking motion */
  if (sourceState === "ready" && verified && motionPreference === "checking") {
    return (
      <div
        className="lt-orbit-runner__viewport lt-orbit-runner__viewport--pending"
        data-source-state="ready"
        data-motion-state="checking"
        role="status"
      >
        <div className="lt-orbit-runner__pending-card">
          <p className="lt-orbit-runner__pending-kicker">
            CHECKING MOTION PREFERENCE
          </p>
          <h2>모션 접근성 설정을 확인하고 있습니다.</h2>
        </div>
      </div>
    );
  }

  /* Verified + motion allowed → real package URL in iframe (no Blob) */
  if (sourceState === "ready" && verified && motionAllowed) {
    return (
      <div
        className="lt-orbit-runner__viewport"
        data-source-state="ready"
        data-motion-state={motionOverride ? "override" : "full"}
        data-interaction-state={interactionEnabled ? "interactive" : "scroll"}
      >
        <iframe
          className={`lt-orbit-runner__iframe ${interactionEnabled ? "lt-orbit-runner__iframe--interactive" : "lt-orbit-runner__iframe--passive"}`}
          src={realPackageUrl}
          title="Track 67 V2.4.2 exact source — real package URL, no Blob"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          allow="fullscreen"
          tabIndex={interactionEnabled ? 0 : -1}
        />
        <div className="lt-orbit-runner__interaction-controls">
          <button
            type="button"
            aria-pressed={interactionEnabled}
            onClick={() => setInteractionEnabled((enabled) => !enabled)}
          >
            {interactionEnabled
              ? "페이지 스크롤 모드"
              : "오비트 인터랙션 켜기"}
          </button>
          {!interactionEnabled && (
            <span>
              기본 상태에서는 wheel/swipe가 바깥 페이지 스크롤에 남습니다.
            </span>
          )}
        </div>
      </div>
    );
  }

  /* Verifying / missing */
  return (
    <div
      className="lt-orbit-runner__viewport lt-orbit-runner__viewport--pending"
      data-source-state={sourceState}
      role="status"
    >
      <div className="lt-orbit-runner__pending-card">
        <p className="lt-orbit-runner__pending-kicker">
          {sourceState === "checking"
            ? "VERIFYING PACKAGE ASSET"
            : "EXACT PACKAGE ASSET REQUIRED"}
        </p>
        <h2>
          {sourceState === "checking"
            ? "패키지 원본 바이트와 SHA-256을 검증하고 있습니다."
            : "검증된 패키지가 아니면 유사 구현을 대신 실행하지 않습니다."}
        </h2>
        <p>
          Real package URL: <code>{realPackageUrl}</code>
        </p>
        <dl>
          <div>
            <dt>Expected bytes</dt>
            <dd>{sourceBytes.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>SHA256</dt>
            <dd>
              <code>{sourceSha256}</code>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
