import Link from "next/link";
import SourceRunnerFrame from "@/app/design-lab/lineages/52/v3/SourceRunnerFrame";
import {
  LINEAGE_67_V23_RUNNER_LABEL,
  LINEAGE_67_V23_SOURCE,
} from "@/lib/lineage-67-v23-source";
import "@/app/styles/lineage-52-source-runner.css";
import "@/app/styles/lineage-52-source-runner-controls.css";

export default function Lineage67V23SourceRunnerPage() {
  const source = LINEAGE_67_V23_SOURCE;
  return (
    <main className="lt-orbit-runner">
      <header className="lt-orbit-runner__header">
        <div>
          <Link className="lt-orbit-runner__back" href="/design-lab">← Design Lab</Link>
          <p className="lt-orbit-runner__eyebrow">LINEAGE 67 · REVISION V2.3</p>
          <h1>Memory Tape Interactive Roll</h1>
          <p className="lt-orbit-runner__lede">
            Drive에서 검증한 원본 V2.3 HTML을 변경 없이 실행하여 네이티브 추출 전 시각·인터랙션 기준을 고정하는
            내부 검수 화면입니다. 이 화면은 canonical LoveTree 구현이 아닙니다.
          </p>
        </div>
        <div className="lt-orbit-runner__mode" aria-label="실행 모드">
          {LINEAGE_67_V23_RUNNER_LABEL}
        </div>
      </header>

      <section className="lt-orbit-runner__meta" aria-label="원본 식별 정보">
        <div><span>Candidate</span><strong>{source.candidateId}</strong></div>
        <div><span>Source Drive ID</span><strong>{source.driveExecutableId}</strong></div>
        <div><span>Instruction Drive ID</span><strong>{source.driveInstructionId}</strong></div>
        <div>
          <span>Source status</span>
          <strong data-source-status={source.sourceStatus}>{source.sourceStatus}</strong>
        </div>
        <div className="lt-orbit-runner__hash"><span>Expected asset</span><code>{source.sourceAssetPath}</code></div>
      </section>

      {source.sourcePinned ? (
        <SourceRunnerFrame
          sourceAssetPath={source.sourceAssetPath}
          sourceBytes={source.sourceBytes ?? 0}
          sourceSha256={source.sourceSha256 ?? ""}
        />
      ) : (
        <div
          className="lt-orbit-runner__viewport lt-orbit-runner__viewport--pending"
          data-source-state="pending"
          data-motion-state="reduced"
          role="status"
        >
          <div className="lt-orbit-runner__pending-card">
            <p className="lt-orbit-runner__pending-kicker">EXACT SOURCE ASSET PENDING — FAIL CLOSED</p>
            <h2>검증된 원본 바이트를 아직 확보하지 못했습니다.</h2>
            <p>
              원본 <code>{source.sourceFile}</code> (Drive <code>{source.driveExecutableId}</code>)의 정확한
              바이트/SHA-256를 이 환경에서 가져오지 못했습니다. 유사 구현을 대신 실행하여 PASS처럼 보이지 않으며,
              정확한 바이트가 확보되고 fingerprint될 때까지 runner는 실행되지 않습니다.
            </p>
            <dl>
              <div>
                <dt>Expected asset path</dt>
                <dd><code>{source.sourceAssetPath}</code></dd>
              </div>
              <div>
                <dt>Exact gate</dt>
                <dd>EXACT_GATE_PENDING (FINGERPRINT_NONE / BINARY_TRANSFER_NONE)</dd>
              </div>
              <div>
                <dt>Rendering tier</dt>
                <dd>unresolved — determined from actual source code only after bytes are obtained</dd>
              </div>
            </dl>
            <p>
              Reduced-motion gate와 page-scroll/interaction 소유권은 원본이 pinning되어 runner가 활성화될 때
              적용됩니다. 이 화면은 항상 <strong>SOURCE RUNNER — NOT CANONICAL PRODUCT</strong> 상태입니다.
            </p>
          </div>
        </div>
      )}

      <section className="lt-orbit-runner__contract">
        <div>
          <p className="lt-orbit-runner__contract-label">FIDELITY CONTRACT</p>
          <h2>원본이 없으면 비슷한 Tape을 새로 그리지 않습니다.</h2>
          <p>
            이 route의 목적은 67 V2.3 원본의 continuous indexed ribbon, accumulated tape travel, ribbon-surface
            ray/triangle hit, q-based Moment resolution, desktop hover/focus, click/tap Inspect, Inspect 중
            roll/emission freeze, same-Moment high-res viewer, Previous/Next, ESC/Close/Return, close 시 exact
            tape state 보존, draw resume, self-cross front-surface selection, mobile tap inspection, focus trap/dialog
            semantics, reduced-motion inspection을 그대로 비교하는 것입니다. 원본 검수가 끝난 다음에만 재사용 가능한
            네이티브 primitive를 V2.3 계약 안에서 추출하며, V2.4 world / FINAL SKIN은 금지됩니다.
          </p>
        </div>
        <div>
          <p className="lt-orbit-runner__contract-label">EXPECTED RUNTIME API</p>
          <ul>
            <li><code>pending — declare after source-code inspection</code></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
