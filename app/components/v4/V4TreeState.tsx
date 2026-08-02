"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TREE_STATES = [
  { id: "active", label: "자라는 중", detail: "새 순간과 가지를 계속 추가합니다." },
  { id: "resting", label: "잠시 쉬는 중", detail: "기록은 보존하고 활동만 멈춥니다." },
  { id: "archived", label: "계절 보관", detail: "한 시즌을 닫고 같은 나무에서 다음 시즌을 준비합니다." },
] as const;

const VISIBILITY = [
  { id: "private", label: "나만 보기", detail: "나와 초대한 사람만 봅니다." },
  { id: "link", label: "링크 공개", detail: "링크를 아는 사람만 읽을 수 있습니다." },
  { id: "public", label: "커뮤니티 공개", detail: "공개 탐색에서 나무가 보입니다." },
] as const;

const ISSUES = [
  { date: "2026.06.12", title: "기록이 멈춘 날", detail: "마음이 복잡해 새 순간을 추가하지 못했어요." },
  { date: "2026.06.15", title: "이 장면은 남겨 두기", detail: "지우지 않고 이슈 순간으로 표시했어요." },
  { date: "2026.06.20", title: "공개 범위 다시 정리", detail: "개인 메모와 공개 카드를 분리했어요." },
];

export default function V4TreeState() {
  const [treeState, setTreeState] = useState<(typeof TREE_STATES)[number]["id"]>("resting");
  const [visibility, setVisibility] = useState<(typeof VISIBILITY)[number]["id"]>("link");
  const [privateNote, setPrivateNote] = useState("지금의 감정은 공개하지 않고 나만 보는 기록으로 남긴다. 나무를 지우지 말고, 충분히 쉬었다가 돌아오기.");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lovetree-v4-tree-state") || "null") as { treeState?: typeof treeState; visibility?: typeof visibility; privateNote?: string } | null;
      if (saved?.treeState) setTreeState(saved.treeState);
      if (saved?.visibility) setVisibility(saved.visibility);
      if (saved?.privateNote) setPrivateNote(saved.privateNote);
    } catch {
      // Keep deterministic state fixture.
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function save() {
    localStorage.setItem("lovetree-v4-tree-state", JSON.stringify({ treeState, visibility, privateNote }));
    setToast("트리 상태, 공개 범위와 개인 메모를 서로 독립적으로 저장했어요.");
  }

  const stateLabel = TREE_STATES.find((item) => item.id === treeState)?.label;
  const visibilityLabel = VISIBILITY.find((item) => item.id === visibility)?.label;

  return (
    <main className="v4-lifecycle-page">
      <div className="v4-life-shell">
        <header className="v4-life-header">
          <Link className="v4-life-back" href="/v4/trees/demo">← 성장 트리</Link>
          <Link className="v4-life-brand" href="/v4">LoveTree</Link>
          <span className="v4-life-status-tag">STATE · SCOPE · PRIVATE NOTE</span>
        </header>

        <section className="v4-state-hero" aria-labelledby="v4-state-title">
          <p>TREE PAUSE & ISSUE STATE</p>
          <h1 id="v4-state-title">나무의 상태와 <em>공개 범위는</em><br />서로 다른 선택이에요.</h1>
          <span>
            쉬고 있는 나무도 링크로 공개할 수 있고, 활발히 자라는 나무도 비공개로 둘 수 있습니다.
            이슈 순간과 개인 메모 역시 삭제하지 않고 별도로 보존합니다.
          </span>
        </section>

        <section className="v4-state-grid">
          <article className="v4-state-card">
            <div className="v4-state-card-head">
              <h2>트리 상태</h2><span className="v4-state-number">01</span>
            </div>
            <div className="v4-state-options" role="group" aria-label="트리 상태 선택">
              {TREE_STATES.map((item) => (
                <button
                  className={`v4-state-option${treeState === item.id ? " is-selected" : ""}`}
                  type="button"
                  key={item.id}
                  onClick={() => setTreeState(item.id)}
                >
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                </button>
              ))}
            </div>
          </article>

          <article className="v4-state-card">
            <div className="v4-state-card-head">
              <h2>공개 범위</h2><span className="v4-state-number">02</span>
            </div>
            <div className="v4-state-options" role="group" aria-label="공개 범위 선택">
              {VISIBILITY.map((item) => (
                <button
                  className={`v4-state-option${visibility === item.id ? " is-selected" : ""}`}
                  type="button"
                  key={item.id}
                  onClick={() => setVisibility(item.id)}
                >
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                </button>
              ))}
            </div>
          </article>

          <article className="v4-state-card is-issue">
            <div className="v4-state-card-head">
              <h2>이슈 순간</h2><span className="v4-state-number">03</span>
            </div>
            <div className="v4-issue-timeline">
              {ISSUES.map((issue) => (
                <div className="v4-issue-row" key={issue.date}>
                  <time>{issue.date}</time>
                  <strong>{issue.title}</strong>
                  <small>{issue.detail}</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="v4-state-grid" style={{ gridTemplateColumns: "1.2fr 1.8fr", marginTop: 14 }}>
          <article className="v4-state-card is-private">
            <div className="v4-state-card-head">
              <h2>나만 보는 메모</h2><span className="v4-state-number">04</span>
            </div>
            <div className="v4-private-note">
              <textarea aria-label="나만 보는 상태 메모" value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} />
            </div>
          </article>

          <article className="v4-state-card">
            <div className="v4-state-card-head">
              <h2>현재 적용 결과</h2><span className="v4-state-number">✓</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div className="v4-preserved-strip"><strong>트리 상태</strong><br />{stateLabel} · 순간과 가지는 삭제되지 않음</div>
              <div className="v4-preserved-strip"><strong>공개 범위</strong><br />{visibilityLabel} · 공개 카드에는 개인 메모가 포함되지 않음</div>
              <div className="v4-preserved-strip"><strong>이슈 순간</strong><br />타임라인에 남지만 대표 카드와 커뮤니티 요약에서는 제외 가능</div>
            </div>
          </article>
        </section>

        <div className="v4-state-summary">
          <div>
            <strong>{stateLabel} · {visibilityLabel}</strong>
            <p>상태와 공개 범위를 각각 저장하며, 개인 메모는 언제나 공개 데이터와 분리됩니다.</p>
          </div>
          <div className="v4-life-actions" style={{ marginTop: 0 }}>
            <Link className="v4-life-secondary" href="/v4/trees/demo/rest">휴식 흐름 보기</Link>
            <button className="v4-life-primary" type="button" onClick={save}>이 설정 저장</button>
          </div>
        </div>
      </div>
      {toast ? <div className="v4-life-toast" role="status" aria-live="polite">{toast}</div> : null}
    </main>
  );
}
