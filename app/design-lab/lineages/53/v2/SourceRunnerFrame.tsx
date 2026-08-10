"use client";

import { useEffect, useState } from "react";

type SourceState = "checking" | "ready" | "invalid";

interface SourceRunnerFrameProps {
  sourceChunkPaths: readonly string[];
  sourceBytes: number;
  sourceSha256: string;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function SourceRunnerFrame({ sourceChunkPaths, sourceBytes, sourceSha256 }: SourceRunnerFrameProps) {
  const [sourceState, setSourceState] = useState<SourceState>("checking");
  const [verifiedSourceUrl, setVerifiedSourceUrl] = useState<string | null>(null);
  const [interactionEnabled, setInteractionEnabled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function verifySource() {
      try {
        const responses = await Promise.all(
          sourceChunkPaths.map((path) => fetch(path, { cache: "no-store", signal: controller.signal })),
        );
        if (responses.some((response) => !response.ok)) throw new Error("source payload request failed");
        const chunks = await Promise.all(responses.map((response) => response.arrayBuffer()));
        const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const bytes = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }
        if (bytes.byteLength !== sourceBytes) throw new Error("source asset byte size mismatch");

        const digest = await crypto.subtle.digest("SHA-256", bytes);
        if (bytesToHex(digest) !== sourceSha256.toLowerCase()) throw new Error("source asset SHA256 mismatch");

        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "text/html" }));
        setVerifiedSourceUrl(objectUrl);
        setSourceState("ready");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setVerifiedSourceUrl(null);
        setSourceState("invalid");
      }
    }

    void verifySource();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceChunkPaths, sourceBytes, sourceSha256]);

  if (sourceState !== "ready" || !verifiedSourceUrl) {
    return (
      <div className="lt-flow-runner__viewport lt-flow-runner__viewport--pending" data-source-state={sourceState} role="status">
        <div className="lt-flow-runner__pending-card">
          <p>{sourceState === "checking" ? "VERIFYING EXACT SOURCE" : "SOURCE VERIFICATION FAILED"}</p>
          <h2>{sourceState === "checking" ? "원본 바이트를 확인하고 있습니다." : "검증된 v2 원본만 실행할 수 있습니다."}</h2>
          <code>{sourceChunkPaths[0]} … {sourceChunkPaths[sourceChunkPaths.length - 1]}</code>
        </div>
      </div>
    );
  }

  return (
    <div
      className="lt-flow-runner__viewport"
      data-source-state="ready"
      data-interaction-state={interactionEnabled ? "interactive" : "scroll"}
    >
      <iframe
        className={`lt-flow-runner__iframe ${interactionEnabled ? "lt-flow-runner__iframe--interactive" : "lt-flow-runner__iframe--passive"}`}
        src={verifiedSourceUrl}
        title="LoveTree Lineage 53 V2 Moment Node Light Flow exact source runner"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        tabIndex={interactionEnabled ? 0 : -1}
      />
      <div className="lt-flow-runner__controls">
        <button type="button" aria-pressed={interactionEnabled} onClick={() => setInteractionEnabled((enabled) => !enabled)}>
          {interactionEnabled ? "페이지 스크롤 모드" : "리플레이 인터랙션 켜기"}
        </button>
        <span>
          {interactionEnabled
            ? "원본의 Moment 선택·Replay·Pause·Speed 컨트롤을 직접 조작합니다."
            : "기본 상태에서는 wheel/swipe가 바깥 검수 페이지에 남습니다."}
        </span>
      </div>
    </div>
  );
}
