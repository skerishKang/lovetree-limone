"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  RELATIONSHIP_EDGES,
  RELATIONSHIP_NODES,
  historyForMoment,
} from "@/lib/capability-prototypes-core";
import "@/app/styles/capability-prototypes-core.css";

export default function RelationshipHistoryPrototypePage() {
  const [selectedId, setSelectedId] = useState("moment-return");
  const selected = RELATIONSHIP_NODES.find((node) => node.id === selectedId) ?? RELATIONSHIP_NODES[0];
  const history = useMemo(() => historyForMoment(selectedId), [selectedId]);
  const connectedEdges = RELATIONSHIP_EDGES.filter((edge) => edge.from === selectedId || edge.to === selectedId);

  return (
    <main className="lt-cap-proto lt-cap-proto--relationship">
      <header className="lt-cap-proto__header">
        <div>
          <Link href="/design-lab">← Design Lab</Link>
          <p className="lt-cap-proto__eyebrow">ISSUE #82 · RELATIONSHIP MAP + VERSION HISTORY</p>
          <h1>관계는 공간으로 읽고,<br />기록은 덮어쓰지 않고 쌓습니다.</h1>
          <p>사실로의 사건/법률 의미론은 제거하고 Person · Moment · Place 관계와 원본→보완→회고의 누적 기록 패턴만 검증합니다.</p>
        </div>
        <span className="lt-cap-proto__badge">INTERNAL PROTOTYPE</span>
      </header>

      <section className="lt-cap-proto__relationship-shell">
        <div className="lt-cap-proto__relationship-map" aria-label="Synthetic relationship map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {RELATIONSHIP_EDGES.map((edge) => {
              const from = RELATIONSHIP_NODES.find((node) => node.id === edge.from)!;
              const to = RELATIONSHIP_NODES.find((node) => node.id === edge.to)!;
              const active = edge.from === selectedId || edge.to === selectedId;
              return (
                <line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={active ? "is-active" : ""}
                />
              );
            })}
          </svg>

          {RELATIONSHIP_NODES.map((node) => (
            <button
              type="button"
              key={node.id}
              className={`lt-cap-proto__relationship-node lt-cap-proto__relationship-node--${node.kind}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              aria-pressed={selectedId === node.id}
              onClick={() => setSelectedId(node.id)}
            >
              <small>{node.kind}</small>
              <strong>{node.label}</strong>
            </button>
          ))}
        </div>

        <aside className="lt-cap-proto__panel" aria-live="polite">
          <p className="lt-cap-proto__section-label">SELECTED NODE</p>
          <h2>{selected.label}</h2>
          <p>{selected.kind === "moment" ? "Moment 기록과 연결 관계를 함께 확인합니다." : "이 노드는 관계를 설명하기 위한 context node입니다."}</p>
          <div className="lt-cap-proto__edge-list">
            {connectedEdges.length ? connectedEdges.map((edge) => <span key={edge.id}>{edge.label}</span>) : <span>직접 연결 없음</span>}
          </div>
        </aside>
      </section>

      <section className="lt-cap-proto__history" aria-labelledby="history-title">
        <div>
          <p className="lt-cap-proto__section-label">NON-DESTRUCTIVE HISTORY</p>
          <h2 id="history-title">{selected.kind === "moment" ? `${selected.label} 기록 변화` : "Moment를 선택하면 기록 변화를 볼 수 있습니다."}</h2>
        </div>
        {history.length ? (
          <ol>
            {history.map((entry) => (
              <li key={entry.id}>
                <span>v{entry.version}</span>
                <div>
                  <strong>{entry.kind}</strong>
                  <time>{entry.recordedAt}</time>
                  <p>{entry.text}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="lt-cap-proto__empty">Person/Place context는 원본 기록 version을 만들지 않습니다.</div>
        )}
      </section>

      <footer className="lt-cap-proto__footer">
        Source evidence: 사실로 `01_사실로_시민사건원장_고소인중심_v1_GATE3.html` · Drive 1naQ9JnAclVUFbuTNzV3-W2ajK7Rr8Z8z · 19,780 bytes · SHA256 68e197be2a42aa4c10bebcee0b91f55398114a4675cbcebdcd795d246571cc8e
      </footer>
    </main>
  );
}
