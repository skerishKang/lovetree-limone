"use client";

import { useEffect, useState } from "react";

type SourceState = "checking" | "ready" | "missing";

interface SourceRunnerFrameProps {
  sourceAssetPath: string;
  sourceBytes: number;
  sourceSha256: string;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function SourceRunnerFrame({
  sourceAssetPath,
  sourceBytes,
  sourceSha256,
}: SourceRunnerFrameProps) {
  const [sourceState, setSourceState] = useState<SourceState>("checking");
  const [verifiedSourceUrl, setVerifiedSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function verifySource() {
      try {
        const response = await fetch(sourceAssetPath, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`source asset request failed: ${response.status}`);

        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== sourceBytes) throw new Error("source asset byte size mismatch");

        const digest = await crypto.subtle.digest("SHA-256", bytes);
        if (bytesToHex(digest) !== sourceSha256.toLowerCase()) {
          throw new Error("source asset SHA256 mismatch");
        }

        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "text/html" }));
        setVerifiedSourceUrl(objectUrl);
        setSourceState("ready");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setVerifiedSourceUrl(null);
        setSourceState("missing");
      }
    }

    void verifySource();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceAssetPath, sourceBytes, sourceSha256]);

  if (sourceState === "ready" && verifiedSourceUrl) {
    return (
      <div className="lt-orbit-runner__viewport" data-source-state="ready">
        <iframe
          className="lt-orbit-runner__iframe"
          src={verifiedSourceUrl}
          title="LoveTree 52 V3 Reference Earth Orbit source runner"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      </div>
    );
  }

  return (
    <div
      className="lt-orbit-runner__viewport lt-orbit-runner__viewport--pending"
      data-source-state={sourceState}
      role="status"
    >
      <div className="lt-orbit-runner__pending-card">
        <p className="lt-orbit-runner__pending-kicker">
          {sourceState === "checking" ? "VERIFYING SOURCE ASSET" : "EXACT SOURCE ASSET REQUIRED"}
        </p>
        <h2>
          {sourceState === "checking"
            ? "저장소의 원본 바이트와 SHA-256을 검증하고 있습니다."
            : "검증된 원본이 아니면 유사 구현을 대신 실행하지 않습니다."}
        </h2>
        <p>
          Expected asset: <code>{sourceAssetPath}</code>
        </p>
        <dl>
          <div>
            <dt>Expected bytes</dt>
            <dd>{sourceBytes.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>SHA256</dt>
            <dd><code>{sourceSha256}</code></dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
