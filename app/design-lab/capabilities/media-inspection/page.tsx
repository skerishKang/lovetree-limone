"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  MOMENT_INSPECTION_ADAPTERS,
  PROTOTYPE_INSPECTION_MOMENTS,
  adapterForKind,
  adjacentInspectionMomentId,
  inspectionMomentById,
} from "@/lib/media-inspection-prototype";
import "@/app/styles/media-inspection-prototype.css";

const INITIAL_MOMENT_ID = PROTOTYPE_INSPECTION_MOMENTS[0].id;

export default function MediaInspectionPrototypePage() {
  const [selectedId, setSelectedId] = useState(INITIAL_MOMENT_ID);
  const [announcement, setAnnouncement] = useState("사진 Moment가 선택되었습니다.");
  const [detailOpen, setDetailOpen] = useState(false);
  const [lastControl, setLastControl] = useState("아직 실행한 로컬 도구가 없습니다.");
  const stageTitleRef = useRef<HTMLHeadingElement>(null);

  const moment = useMemo(() => inspectionMomentById(selectedId), [selectedId]);
  const adapter = useMemo(() => adapterForKind(moment.kind), [moment.kind]);

  const selectMoment = (id: string) => {
    const nextMoment = inspectionMomentById(id);
    setSelectedId(id);
    setLastControl("새 Moment를 선택해 media adapter가 교체되었습니다.");
    setAnnouncement(`${adapterForKind(nextMoment.kind).label} Moment가 선택되었습니다. ${nextMoment.title}`);
    requestAnimationFrame(() => stageTitleRef.current?.focus({ preventScroll: true }));
  };

  const move = (direction: -1 | 1) => {
    selectMoment(adjacentInspectionMomentId(selectedId, direction));
  };

  return (
    <main className="lt-media-inspection">
      <header className="lt-media-inspection__header">
        <div>
          <Link href="/design-lab" className="lt-media-inspection__back">← Design Lab</Link>
          <p className="lt-media-inspection__eyebrow">CAP-10 · INTERNAL MECHANIC PROTOTYPE · ISSUE #101</p>
          <h1>Moment는 그대로 두고,<br />미디어 도구만 바꿉니다.</h1>
          <p className="lt-media-inspection__lede">
            사실로의 법률·증거 의미론은 사용하지 않습니다. synthetic Moment 다섯 개로 하나의 detail shell이
            photo, video, audio, note, document adapter를 교체하는 구조만 검증합니다.
          </p>
        </div>
        <span className="lt-media-inspection__status">PROTOTYPE · NOT PRODUCT-READY</span>
      </header>

      <div className="lt-media-inspection__shell">
        <nav className="lt-media-inspection__rail" aria-label="Moment 미디어 유형">
          <div className="lt-media-inspection__rail-heading">
            <span>MEDIA MOMENTS</span>
            <b>{PROTOTYPE_INSPECTION_MOMENTS.length}</b>
          </div>
          <div className="lt-media-inspection__types" role="listbox" aria-label="검사할 Moment 선택">
            {PROTOTYPE_INSPECTION_MOMENTS.map((item) => {
              const itemAdapter = adapterForKind(item.kind);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === selectedId}
                  key={item.id}
                  onClick={() => selectMoment(item.id)}
                >
                  <span>{itemAdapter.label}</span>
                  <strong>{item.title}</strong>
                </button>
              );
            })}
          </div>
          <p className="lt-media-inspection__rail-note">
            선택은 route 이동이 아닙니다. 동일 shell 안에서 adapter와 Moment context만 교체됩니다.
          </p>
        </nav>

        <section className="lt-media-inspection__stage" aria-labelledby="media-inspection-stage-title">
          <div className="lt-media-inspection__stage-head">
            <div>
              <span>{adapter.viewerLabel}</span>
              <h2 id="media-inspection-stage-title" ref={stageTitleRef} tabIndex={-1}>{moment.title}</h2>
              <p>{moment.sourceLabel}</p>
            </div>
            <span className="lt-media-inspection__kind">{adapter.label}</span>
          </div>

          <div className="lt-media-inspection__viewer" data-kind={moment.kind} aria-label={`${adapter.label} synthetic viewer`}>
            <div className="lt-media-inspection__viewer-core" aria-hidden="true">
              <span className="lt-media-inspection__viewer-symbol">{moment.kind.slice(0, 2).toUpperCase()}</span>
              <div className="lt-media-inspection__viewer-lines">
                {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--bar-index": index } as React.CSSProperties} />)}
              </div>
            </div>
            <div className="lt-media-inspection__preview-copy">
              {moment.preview.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>

          <div className="lt-media-inspection__controls" aria-label={`${adapter.label} 전용 도구`}>
            <button type="button" onClick={() => move(-1)} aria-label="이전 Moment">← 이전</button>
            {adapter.controls.map((control) => (
              <button
                type="button"
                key={control.id}
                data-control={control.id}
                aria-label={control.ariaLabel}
                onClick={() => {
                  setLastControl(`${adapter.label}: ${control.label}`);
                  setAnnouncement(`${adapter.label} 로컬 도구 ‘${control.label}’를 시연했습니다.`);
                }}
              >
                {control.label}
              </button>
            ))}
            <button type="button" onClick={() => move(1)} aria-label="다음 Moment">다음 →</button>
          </div>
          <p className="lt-media-inspection__control-state">{lastControl}</p>
        </section>

        <aside className="lt-media-inspection__detail" aria-label="선택한 Moment 정보">
          <button
            type="button"
            className="lt-media-inspection__detail-toggle"
            aria-expanded={detailOpen}
            aria-controls="media-inspection-detail-content"
            onClick={() => setDetailOpen((value) => !value)}
          >
            Moment 정보 <span>{detailOpen ? "−" : "+"}</span>
          </button>
          <div
            id="media-inspection-detail-content"
            className={`lt-media-inspection__detail-content${detailOpen ? " is-open" : ""}`}
          >
            <p className="lt-media-inspection__detail-label">COMMON MOMENT CONTEXT</p>
            <h2>{moment.title}</h2>
            <dl>
              <div><dt>Person</dt><dd>{moment.person}</dd></div>
              <div><dt>Captured</dt><dd>{moment.capturedAt}</dd></div>
              <div><dt>Media kind</dt><dd>{moment.kind}</dd></div>
              <div><dt>Source</dt><dd>{moment.sourceLabel}</dd></div>
            </dl>
            <div className="lt-media-inspection__detail-note">
              <strong>Moment note</strong>
              <p>{moment.note}</p>
            </div>
            <div className="lt-media-inspection__preserves">
              <strong>Adapter preserves</strong>
              <ul>{adapter.preserves.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </aside>
      </div>

      <p className="lt-media-inspection__live" aria-live="polite" aria-atomic="true">{announcement}</p>

      <footer className="lt-media-inspection__footer">
        <span>Source research #78 · audit #96 · registry #97 · CAP-09 stack #99 · CAP-10 #101</span>
        <span>Drive fingerprint: 49,133 bytes · SHA256 46db34ee…bdd63</span>
      </footer>
    </main>
  );
}
