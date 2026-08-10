import Link from "next/link";
import Lineage53V2Motion from "./Lineage53V2Motion";
import { LINEAGE_53_V2_REVIEW_LABEL, LINEAGE_53_V2_SOURCE } from "@/lib/lineage-53-v2-source";
import "@/app/styles/lineage-53-source-runner.css";
import "@/app/styles/lineage-53-v2-viewport.css";

export default function Lineage53V2ReviewPage() {
  return (
    <main className="lt-flow-runner">
      <header className="lt-flow-runner__header">
        <div>
          <Link href="/design-lab" className="lt-flow-runner__back">← Design Lab</Link>
          <p className="lt-flow-runner__eyebrow">LINEAGE 53 · REVISION V2 · REPLAY MOTION</p>
          <h1>Moment Node Light Flow V2</h1>
          <p className="lt-flow-runner__lede">
            동생이 만든 LoveTree V2 원본을 네이티브 React/SVG로 재현해 V1 motion engine, visible Connection skeleton,
            saturated energy와 Living Tree climax를 원본 기준으로 직접 비교·검수하는 내부 화면입니다.
          </p>
        </div>
        <span className="lt-flow-runner__mode">{LINEAGE_53_V2_REVIEW_LABEL}</span>
      </header>

      <section className="lt-flow-runner__meta" aria-label="Lineage 53 V2 원본 식별 정보">
        <div><span>Source</span><strong>{LINEAGE_53_V2_SOURCE.sourceFile}</strong></div>
        <div><span>Bytes</span><strong>{LINEAGE_53_V2_SOURCE.sourceBytes.toLocaleString("en-US")}</strong></div>
        <div><span>Revision</span><strong>{LINEAGE_53_V2_SOURCE.revisionId}</strong></div>
        <div className="lt-flow-runner__hash"><span>SHA256</span><code>{LINEAGE_53_V2_SOURCE.sourceSha256}</code></div>
      </section>

      <Lineage53V2Motion />

      <section className="lt-flow-runner__contract">
        <article>
          <span>V1 ENGINE PRESERVED</span>
          <h2>기존 replay engine은 교체하지 않습니다.</h2>
          <p>Moment perimeter activation, Connection path travel, arrival impact, pause/replay/speed, ResizeObserver와 path-length 기반 motion을 유지합니다.</p>
        </article>
        <article>
          <span>V2 DELTA</span>
          <h2>선은 항상 보이고, 빛은 더 강해졌습니다.</h2>
          <p>visible Connection skeleton, active outer/inner glow, saturated cyan/violet/rose energy와 completed Living Tree climax가 V2 핵심 변경입니다.</p>
        </article>
        <article>
          <span>PRODUCT BOUNDARY</span>
          <h2>원본 UI와 재사용 mechanic을 분리해 판단합니다.</h2>
          <p>이 Revision의 LoveTree 시각 언어는 직접 검수하고, CAP-14의 재사용 replay mechanic은 별도 capability로 관리합니다.</p>
        </article>
      </section>
    </main>
  );
}
