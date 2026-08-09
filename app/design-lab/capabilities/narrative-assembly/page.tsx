"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  deriveNarrativeMomentAssembly,
  editNarrativeMomentAssembly,
  setNarrativeMomentConfirmation,
  type NarrativeMomentFields,
} from "@/lib/narrative-moment-assembly";
import "@/app/styles/narrative-assembly-prototype.css";

const SAMPLE_NARRATIVE = "2026년 8월 2일 올림픽공원에서 민아와 지수랑 함께 공연 영상을 찍고 사진도 남겼다.";

const MEDIA_LABELS = {
  photo: "사진",
  video: "영상",
  audio: "음성",
  note: "메모",
} as const;

export default function NarrativeAssemblyPrototypePage() {
  const [narrative, setNarrative] = useState(SAMPLE_NARRATIVE);
  const [assembly, setAssembly] = useState(() => deriveNarrativeMomentAssembly(SAMPLE_NARRATIVE));
  const [announcement, setAnnouncement] = useState("초기 synthetic narrative에서 Moment 초안을 만들었습니다.");
  const draftHeadingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const derive = () => {
    setAssembly(deriveNarrativeMomentAssembly(narrative));
    setAnnouncement("원문은 그대로 보존하고 새로운 Moment 후보 필드를 만들었습니다.");
    requestAnimationFrame(() => draftHeadingRef.current?.focus({ preventScroll: true }));
  };

  const edit = (patch: Partial<NarrativeMomentFields>) => {
    setAssembly((current) => editNarrativeMomentAssembly(current, patch));
    setAnnouncement("파생 초안을 수정했습니다. 원문은 변경되지 않았습니다.");
  };

  const toggleConfirmation = () => {
    const next = !assembly.confirmed;
    setAssembly((current) => setNarrativeMomentConfirmation(current, next));
    setAnnouncement(next ? "Moment 초안을 확인했습니다." : "확인을 취소하고 초안 상태로 되돌렸습니다.");
    requestAnimationFrame(() => statusRef.current?.focus({ preventScroll: true }));
  };

  return (
    <main className="lt-narrative-assembly">
      <header className="lt-narrative-assembly__header">
        <div>
          <Link href="/design-lab" className="lt-narrative-assembly__back">← Design Lab</Link>
          <p className="lt-narrative-assembly__eyebrow">CAP-12 · INTERNAL MECHANIC PROTOTYPE · ISSUE #107</p>
          <h1>기억은 원문으로 남기고,<br />Moment는 확인 가능한 초안으로 만듭니다.</h1>
          <p className="lt-narrative-assembly__lede">
            자유롭게 적은 기억을 날짜·장소·사람·요약·미디어 힌트로 투영합니다. 파생값은 제안일 뿐이며,
            사용자가 교정하고 확인하기 전에는 확정된 정보로 취급하지 않습니다.
          </p>
        </div>
        <span className="lt-narrative-assembly__badge">OBSERVED → PROTOTYPE CANDIDATE</span>
      </header>

      <div className="lt-narrative-assembly__shell">
        <section className="lt-narrative-assembly__source" aria-labelledby="narrative-source-title">
          <div className="lt-narrative-assembly__section-head">
            <div>
              <span>01 · ORIGINAL NARRATIVE</span>
              <h2 id="narrative-source-title">원문 기억</h2>
            </div>
            <strong>source of truth</strong>
          </div>
          <label className="lt-narrative-assembly__textarea-label">
            <span>기억을 자유롭게 적어보세요.</span>
            <textarea value={narrative} onChange={(event) => setNarrative(event.target.value)} />
          </label>
          <button type="button" className="lt-narrative-assembly__derive" onClick={derive}>
            Moment 초안 다시 만들기
          </button>

          <div className="lt-narrative-assembly__preserved">
            <span>PRESERVED ORIGINAL</span>
            <p>{assembly.originalNarrative || "원문 없음"}</p>
          </div>
          <p className="lt-narrative-assembly__rule">
            위 textarea를 바꿔도 보존 원문은 자동으로 덮어쓰지 않습니다. “초안 다시 만들기”를 실행할 때 새 derivation이 생성됩니다.
          </p>
        </section>

        <section className="lt-narrative-assembly__draft" aria-labelledby="narrative-draft-title">
          <div className="lt-narrative-assembly__section-head">
            <div>
              <span>02 · DERIVED MOMENT DRAFT</span>
              <h2 id="narrative-draft-title" ref={draftHeadingRef} tabIndex={-1}>확인 가능한 후보 필드</h2>
            </div>
            <strong>revision {assembly.revision}</strong>
          </div>

          <div className="lt-narrative-assembly__fields">
            <label>
              <span>날짜 / 시간 힌트</span>
              <input
                value={assembly.fields.capturedAtHint}
                placeholder="확인 필요"
                onChange={(event) => edit({ capturedAtHint: event.target.value })}
              />
            </label>
            <label>
              <span>장소 힌트</span>
              <input
                value={assembly.fields.placeHint}
                placeholder="확인 필요"
                onChange={(event) => edit({ placeHint: event.target.value })}
              />
            </label>
            <label>
              <span>사람 힌트 · 쉼표로 구분</span>
              <input
                value={assembly.fields.peopleHints.join(", ")}
                placeholder="확인 필요"
                onChange={(event) => edit({
                  peopleHints: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                })}
              />
            </label>
            <label className="lt-narrative-assembly__summary-field">
              <span>Moment 요약</span>
              <textarea
                value={assembly.fields.summary}
                placeholder="확인 필요"
                onChange={(event) => edit({ summary: event.target.value })}
              />
            </label>
          </div>

          <div className="lt-narrative-assembly__media" aria-label="파생 미디어 힌트">
            <span>MEDIA HINTS</span>
            <div>
              {assembly.fields.mediaHints.length > 0
                ? assembly.fields.mediaHints.map((hint) => <b key={hint}>{MEDIA_LABELS[hint]}</b>)
                : <em>확인 필요</em>}
            </div>
          </div>

          <div
            className={`lt-narrative-assembly__confirm ${assembly.confirmed ? "is-confirmed" : ""}`}
            ref={statusRef}
            tabIndex={-1}
          >
            <div>
              <span>03 · USER CONFIRMATION</span>
              <strong>{assembly.confirmed ? "사용자 확인 완료" : "아직 초안입니다"}</strong>
              <p>{assembly.confirmed
                ? "현재 draft를 사용자가 확인했습니다. 이 프로토타입에서는 언제든 다시 초안 상태로 되돌릴 수 있습니다."
                : "파생값을 검토하고 필요한 곳을 직접 고친 뒤 확인하세요."}</p>
            </div>
            <button type="button" onClick={toggleConfirmation}>
              {assembly.confirmed ? "확인 취소" : "이 Moment 초안 확인"}
            </button>
          </div>
        </section>
      </div>

      <div className="lt-narrative-assembly__live" aria-live="polite" aria-atomic="true">{announcement}</div>

      <footer className="lt-narrative-assembly__footer">
        <span>Prototype mechanics only · synthetic LoveTree data · no network / Auth / DB</span>
        <span>Source fingerprint: 75,174 bytes · SHA256 e0c82fb5…03355e0</span>
      </footer>
    </main>
  );
}
