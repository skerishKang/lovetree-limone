import Link from "next/link";
import Lineage54PetalRunner from "./Lineage54PetalRunner";
import { LINEAGE_54_PETAL_RUNNER_SOURCE } from "@/lib/lineage-54-petal-runner-source";
import "@/app/styles/lineage-53-source-runner.css";
import "@/app/styles/lineage-54-petal-runner-v4.css";

export default function Lineage54PetalRunnerV4Page() {
  return (
    <main className="lt-flow-runner">
      <header className="lt-flow-runner__header">
        <div>
          <Link href="/design-lab" className="lt-flow-runner__back">← Design Lab</Link>
          <p className="lt-flow-runner__eyebrow">LINEAGE 54 · REVISION V4 · LOVE JOURNEY</p>
          <h1>Petal Runner · Love Journey V4</h1>
          <p className="lt-flow-runner__lede">
            동생의 LoveTree V4 원본을 자동차 쇼룸이 아니라 저장한 Moment와 Connection을 따라 LoveTree로 이동하는
            기억 탐색 여정으로 재현하는 내부 source-fidelity review 화면입니다.
          </p>
        </div>
        <span className="lt-flow-runner__mode">{LINEAGE_54_PETAL_RUNNER_SOURCE.reviewLabel}</span>
      </header>

      <section className="lt-flow-runner__meta" aria-label="Lineage 54 V4 원본 식별 정보">
        <div><span>Source</span><strong>{LINEAGE_54_PETAL_RUNNER_SOURCE.sourceFile}</strong></div>
        <div><span>Bytes</span><strong>{LINEAGE_54_PETAL_RUNNER_SOURCE.sourceBytes.toLocaleString("en-US")}</strong></div>
        <div><span>Revision</span><strong>{LINEAGE_54_PETAL_RUNNER_SOURCE.revisionId}</strong></div>
        <div className="lt-flow-runner__hash"><span>SHA256</span><code>{LINEAGE_54_PETAL_RUNNER_SOURCE.sourceSha256}</code></div>
      </section>

      <Lineage54PetalRunner />

      <section className="lt-flow-runner__contract">
        <article>
          <span>V4 SOURCE DELTA</span>
          <h2>차량은 작아지고, 이동은 더 명확해졌습니다.</h2>
          <p>safe floor line, viewport 밖 진입, 가속·곡선 이동·감속, camera pan, brightness 변화와 speed streak를 1.8초 travel sequence로 보존합니다.</p>
        </article>
        <article>
          <span>INTERACTION CONTRACT</span>
          <h2>네 장면과 네 방향 vehicle view를 모두 유지합니다.</h2>
          <p>story/timeline controls, drive/restart, pointer capture 기반 좌우 drag, memory-path growth와 final arrival bloom을 source contract로 검수합니다.</p>
        </article>
        <article>
          <span>APPROVAL BOUNDARY</span>
          <h2>정확한 PNG 5개는 Git에서 fingerprint까지 검증됐습니다.</h2>
          <p>binary asset transfer와 fingerprint gate는 닫혔습니다. Source-fidelity review와 canonical product adoption은 별도이며, Premium Journey 수치 역시 source story 예시로만 유지합니다.</p>
        </article>
      </section>
    </main>
  );
}
