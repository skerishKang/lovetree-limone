import Link from "next/link";
import SourceRunnerFrame from "./SourceRunnerFrame";
import { LINEAGE_53_V2_RUNNER_LABEL, LINEAGE_53_V2_SOURCE } from "@/lib/lineage-53-v2-source";
import "@/app/styles/lineage-53-source-runner.css";

export default function Lineage53V2SourceRunnerPage() {
  return (
    <main className="lt-flow-runner">
      <header className="lt-flow-runner__header">
        <div>
          <Link href="/design-lab" className="lt-flow-runner__back">← Design Lab</Link>
          <p className="lt-flow-runner__eyebrow">LINEAGE 53 · REVISION V2 · REPLAY MOTION</p>
          <h1>Moment Node Light Flow V2</h1>
          <p className="lt-flow-runner__lede">
            동생이 만든 LoveTree V2 원본을 변경하지 않고 실행해 V1 motion engine, visible Connection skeleton,
            saturated energy와 Living Tree climax를 직접 비교·검수하는 내부 화면입니다.
          </p>
        </div>
        <span className="lt-flow-runner__mode">{LINEAGE_53_V2_RUNNER_LABEL}</span>
      </header>

      <section className="lt-flow-runner__meta" aria-label="Lineage 53 V2 원본 식별 정보">
        <div><span>Source</span><strong>{LINEAGE_53_V2_SOURCE.sourceFile}</strong></div>
        <div><span>Bytes</span><strong>{LINEAGE_53_V2_SOURCE.sourceBytes.toLocaleString("en-US")}</strong></div>
        <div><span>Revision</span><strong>{LINEAGE_53_V2_SOURCE.revisionId}</strong></div>
        <div className="lt-flow-runner__hash"><span>SHA256</span><code>{LINEAGE_53_V2_SOURCE.sourceSha256}</code></div>
      </section>

      <SourceRunnerFrame
        sourceChunkPaths={LINEAGE_53_V2_SOURCE.sourceChunkPaths}
        sourceBytes={LINEAGE_53_V2_SOURCE.sourceBytes}
        sourceSha256={LINEAGE_53_V2_SOURCE.sourceSha256}
      />

      <section className="lt-flow-runner__contract">
        <article>
          <span>V1 ENGINE PRESERVED</span>
          <h2>기존 replay engine은 교체하지 않습니다.</h2>
          <p>Moment perimeter pulse, Connection path travel, arrival impact, pause/replay/speed, ResizeObserver와 path-length 기반 motion을 그대로 검수합니다.</p>
        </article>
        <article>
          <span>V2 DELTA</span>
          <h2>선은 항상 보이고, 빛은 더 강해졌습니다.</h2>
          <p>visible Connection skeleton, active outer/inner glow, saturated cyan/violet/rose energy와 completed Living Tree climax가 V2 핵심 변경입니다.</p>
        </article>
        <article>
          <span>PRODUCT BOUNDARY</span>
          <h2>이 화면은 원본 충실도 검수용입니다.</h2>
          <p>CAP-14의 재사용 replay mechanic과 V2의 시각 Revision은 분리해 판단하며, 검수 전 canonical V4 화면으로 자동 채택하지 않습니다.</p>
        </article>
      </section>
    </main>
  );
}
