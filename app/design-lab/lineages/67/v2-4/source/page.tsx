import Link from "next/link";
import Lineage67SourceRunner from "./Lineage67SourceRunner";
import {
  LINEAGE_67_V24_RUNNER_LABEL,
  LINEAGE_67_V24_SOURCE,
} from "@/lib/lineage-67-v24/source";
import "@/app/styles/lineage-67-v24-source-runner.css";

export default function Lineage67V24SourceRunnerPage() {
  return (
    <main className="lt67-source-runner lt-orbit-runner">
      <header className="lt-orbit-runner__header">
        <div>
          <Link className="lt-orbit-runner__back" href="/design-lab">
            ← Design Lab
          </Link>
          <p className="lt-orbit-runner__eyebrow">LINEAGE 67 · REVISION V2.4.2</p>
          <h1>Track 67 — Persistent World + Works Navigation (exact source)</h1>
          <p className="lt-orbit-runner__lede">
            Drive에서 검증한 V2.4.2 원본 HTML을 변경 없이 실행하여 네이티브 추출 전 시각·인터랙션
            기준을 고정하는 내부 검수 화면입니다. 원본 바이트와 SHA-256이 일치하지 않으면 대신 실행하지
            않습니다.
          </p>
        </div>
        <div className="lt-orbit-runner__mode" aria-label="실행 모드">
          {LINEAGE_67_V24_RUNNER_LABEL}
        </div>
      </header>

      <section className="lt-orbit-runner__meta" aria-label="원본 식별 정보">
        <div>
          <span>Candidate</span>
          <strong>{LINEAGE_67_V24_SOURCE.candidateId}</strong>
        </div>
        <div>
          <span>Source bytes</span>
          <strong>{LINEAGE_67_V24_SOURCE.sourceBytes.toLocaleString("en-US")}</strong>
        </div>
        <div>
          <span>Runtime</span>
          <strong>{LINEAGE_67_V24_SOURCE.runtimeSeconds.toFixed(1)}s</strong>
        </div>
        <div className="lt-orbit-runner__hash">
          <span>SHA256</span>
          <code>{LINEAGE_67_V24_SOURCE.sourceSha256}</code>
        </div>
      </section>

      <Lineage67SourceRunner
        realPackageUrl={LINEAGE_67_V24_SOURCE.realPackageUrl}
        sourceBytes={LINEAGE_67_V24_SOURCE.sourceBytes}
        sourceSha256={LINEAGE_67_V24_SOURCE.sourceSha256}
      />

      <section className="lt-orbit-runner__contract">
        <div>
          <p className="lt-orbit-runner__contract-label">FIDELITY CONTRACT</p>
          <h2>원본이 없으면 비슷한 Persistent World를 새로 그리지 않습니다.</h2>
          <p>
            이 route는 V2.4.2 원본의 WebGL2 persistent world, 정적 chunk(MEMORY), 경계 있는 memory
            tail, ribbon hit / inspect, Space rewind, Tab orbit과 WORKS_ 아카이브 내비게이션을 그대로
            비교하는 것입니다. V2.4 engine/texture/inspect/rewind 로직은 V2.4.1·V2.4.2에서 보존됩니다.
            원본 검수가 끝난 다음에만 재사용 가능한 WebGL primitive를 native Next 코드로 추출합니다.
          </p>
        </div>
        <div>
          <p className="lt-orbit-runner__contract-label">EXPECTED RUNTIME API</p>
          <ul>
            {LINEAGE_67_V24_SOURCE.expectedRuntimeApi.map((entry) => (
              <li key={entry}>
                <code>{entry}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lt-orbit-runner__contract" aria-label="supersession notice">
        <div>
          <p className="lt-orbit-runner__contract-label">REVISION NOTICE</p>
          <h2>V2.4.2는 V2.4를 supersede한 최신 explicit revision입니다.</h2>
          <p>
            시작 직전 Drive freshness 재확인에서 V2.4.1(14:07Z)·V2.4.2(14:29Z) 정식 revision 패키지가
            발견되어, 배정된 V2.4 authority 대신 V2.4.2로 재핀했습니다. V2.4.2 executable은 설계팀 자체
            SHA256SUMS와 독립 검증 일치(85210be6…). V2.4.2 WORKS 메뉴는 61·60을 제거하고 62 V1.1 /
            Track 13 Atlas / Living Video Graph를 추가합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
