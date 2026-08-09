import Link from "next/link";
import SourceRunnerFrame from "./SourceRunnerFrame";
import {
  LINEAGE_52_V3_RUNNER_LABEL,
  LINEAGE_52_V3_SOURCE,
} from "@/lib/lineage-52-v3-source";
import "@/app/styles/lineage-52-source-runner.css";

export default function Lineage52V3SourceRunnerPage() {
  return (
    <main className="lt-orbit-runner">
      <header className="lt-orbit-runner__header">
        <div>
          <Link className="lt-orbit-runner__back" href="/design-lab">← Design Lab</Link>
          <p className="lt-orbit-runner__eyebrow">LINEAGE 52 · REVISION V3</p>
          <h1>Reference Earth Orbit</h1>
          <p className="lt-orbit-runner__lede">
            Drive에서 검증한 원본 HTML을 변경 없이 실행하여 네이티브 추출 전 시각·인터랙션 기준을 고정하는 내부 검수 화면입니다.
          </p>
        </div>
        <div className="lt-orbit-runner__mode" aria-label="실행 모드">
          {LINEAGE_52_V3_RUNNER_LABEL}
        </div>
      </header>

      <section className="lt-orbit-runner__meta" aria-label="원본 식별 정보">
        <div><span>Candidate</span><strong>{LINEAGE_52_V3_SOURCE.candidateId}</strong></div>
        <div><span>Source bytes</span><strong>{LINEAGE_52_V3_SOURCE.sourceBytes.toLocaleString("en-US")}</strong></div>
        <div><span>Runtime</span><strong>{LINEAGE_52_V3_SOURCE.runtimeSeconds.toFixed(1)}s</strong></div>
        <div className="lt-orbit-runner__hash"><span>SHA256</span><code>{LINEAGE_52_V3_SOURCE.sourceSha256}</code></div>
      </section>

      <SourceRunnerFrame
        sourceAssetPath={LINEAGE_52_V3_SOURCE.sourceAssetPath}
        sourceBytes={LINEAGE_52_V3_SOURCE.sourceBytes}
        sourceSha256={LINEAGE_52_V3_SOURCE.sourceSha256}
      />

      <section className="lt-orbit-runner__contract">
        <div>
          <p className="lt-orbit-runner__contract-label">FIDELITY CONTRACT</p>
          <h2>원본이 없으면 비슷한 Earth를 새로 그리지 않습니다.</h2>
          <p>
            이 route의 목적은 52 V3 원본의 Earth, 10 Moment nodes, 12 Connection events, depth occlusion,
            drag/swipe, pause/restart와 20초 timeline을 그대로 비교하는 것입니다. 원본 검수가 끝난 다음에만
            재사용 가능한 WebGL primitive를 native Next 코드로 추출합니다.
          </p>
        </div>
        <div>
          <p className="lt-orbit-runner__contract-label">EXPECTED RUNTIME API</p>
          <ul>
            {LINEAGE_52_V3_SOURCE.expectedRuntimeApi.map((entry) => <li key={entry}><code>{entry}</code></li>)}
          </ul>
        </div>
      </section>
    </main>
  );
}
