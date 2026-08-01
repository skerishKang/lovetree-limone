"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { V3_RELATION_PRESETS } from "./fixtures/v3-fixtures";
import { useV3ConnectDraft } from "./v3-onboarding-state";

function parseYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/,
  );
  return match ? match[1] : null;
}

export default function V3ConnectStep() {
  const router = useRouter();
  const { draft, update } = useV3ConnectDraft();
  const [customRelation, setCustomRelation] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const youtubeId = parseYouTubeId(draft.nextUrl);

  function selectRelation(relationId: string) {
    if (relationId === "custom") {
      update({ relationType: "custom", relationLabel: customRelation || "직접 입력" });
      return;
    }
    const preset = V3_RELATION_PRESETS.find((r) => r.id === relationId);
    if (preset) {
      update({ relationType: preset.id, relationLabel: preset.label });
    }
  }

  function finish() {
    if (!draft.nextUrl.trim() || !draft.nextTitle.trim()) {
      setConnectError(
        "연결할 다음 순간의 URL과 제목을 입력해 주세요. (건너뛰려면 아래 링크를 사용해요)",
      );
      return;
    }
    setConnectError(null);
    setConnected(true);
  }

  return (
    <div className="v3-page">
      <div className="v3-progress" aria-label="온보딩 진행 단계">
        <span className="v3-progress-step v3-progress-done">
          <b>1</b> 첫 순간
        </span>
        <span className="v3-progress-line" aria-hidden="true" />
        <span className="v3-progress-step v3-progress-done">
          <b>2</b> 발견
        </span>
        <span className="v3-progress-line" aria-hidden="true" />
        <span className="v3-progress-step v3-progress-done">
          <b>3</b> 마음
        </span>
        <span className="v3-progress-line" aria-hidden="true" />
        <span className="v3-progress-step v3-progress-active">
          <b>4</b> 연결
        </span>
      </div>
      <section className="v3-onboarding" aria-labelledby="v3-connect-title">
        <div>
          <p className="v3-eyebrow">03 · 다음 순간 연결</p>
          <h1 id="v3-connect-title">
            왜 다음 순간으로
            <em> 이어졌는지 남겨볼까요?</em>
          </h1>
          <p className="v3-onboarding-intro">
            마음이 이어진 이유를 고르고, 다음으로 찾아간 영상을 카드에 연결해 보세요.
            그 이유가 당신의 사랑 연혁에 기록됩니다.
          </p>
          <div className="v3-onboarding-form">
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-connect-url">
                다음 순간 URL
              </label>
              <input
                className="v3-input"
                id="v3-connect-url"
                type="url"
                value={draft.nextUrl}
                onChange={(event) => update({ nextUrl: event.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-connect-title-input">
                다음 순간 제목
              </label>
              <input
                className="v3-input"
                id="v3-connect-title-input"
                value={draft.nextTitle}
                onChange={(event) => update({ nextTitle: event.target.value })}
                placeholder="예: 댓글을 따라 찾은 무대"
              />
            </div>
            <div className="v3-field">
              <span className="v3-label">관계 프리셋</span>
              <div className="v3-chip-group" role="group" aria-label="연결 이유 선택">
                {V3_RELATION_PRESETS.map((relation) => (
                  <button
                    className="v3-chip"
                    type="button"
                    key={relation.id}
                    aria-pressed={draft.relationType === relation.id}
                    onClick={() => selectRelation(relation.id)}
                  >
                    {relation.label}
                  </button>
                ))}
              </div>
            </div>
            {draft.relationType === "custom" && (
              <div className="v3-time-row">
                <input
                  className="v3-input"
                  value={customRelation}
                  onChange={(event) => {
                    setCustomRelation(event.target.value);
                    update({ relationLabel: event.target.value || "직접 입력" });
                  }}
                  placeholder="이어진 이유를 직접 적어 보세요"
                  aria-label="연결 이유 직접 입력"
                />
                <button
                  className="v3-btn v3-btn-quiet"
                  type="button"
                  onClick={() => selectRelation("custom")}
                >
                  적용
                </button>
              </div>
            )}
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-connect-memo">
                다음 순간 메모
              </label>
              <textarea
                className="v3-textarea"
                id="v3-connect-memo"
                value={draft.nextMemo}
                onChange={(event) => update({ nextMemo: event.target.value })}
                placeholder="두 장면 사이에 있었던 마음을 적어 보세요."
                maxLength={140}
              />
              <span className="v3-counter">{draft.nextMemo.length} / 140</span>
            </div>
          </div>
          {connected && (
            <div className="v3-success-box" role="status">
              두 순간이 <b>{draft.relationLabel}</b>로 연결됐어요. 이제 트리를 펼쳐
              확인할 수 있어요.
            </div>
          )}
          {connectError && (
            <p className="v3-muted" role="alert">
              {connectError}
            </p>
          )}
          <div className="v3-onboarding-actions">
            {connected ? (
              <button
                className="v3-btn v3-btn-primary"
                type="button"
                onClick={() => router.push("/v3/trees/demo")}
              >
                일단 첫 나무 펼쳐보기
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                className="v3-btn v3-btn-primary"
                type="button"
                onClick={finish}
              >
                다음 순간 이어보기
                <span aria-hidden="true">→</span>
              </button>
            )}
            <button
              className="v3-btn v3-btn-ghost"
              type="button"
              onClick={() => router.push("/v3/trees/demo/onboarding/heart")}
            >
              ← 마음 남기기로
            </button>
            <Link className="v3-btn v3-btn-quiet" href="/v3/trees/demo">
              트리 미리보기 건너뛰기
            </Link>
          </div>
        </div>
        <aside className="v3-onboarding-preview" aria-label="연결 미리보기">
          <div className="v3-connect-figure">
            <div className="v3-connect-card v3-connect-first">
              <div className="v3-connect-card-media" aria-hidden="true">
                <div className="v3-preview-media v3-media-root" style={{ height: "100%" }}>
                  <span>▶</span>
                </div>
              </div>
              <div className="v3-connect-card-body">
                <strong>첫 순간</strong>
                <p>마음이 처음 멈춘 장면</p>
              </div>
            </div>
            <div className="v3-connect-line" aria-hidden="true" />
            <div className="v3-connect-card v3-connect-next">
              {youtubeId ? (
                <div className="v3-connect-card-media">
                  <img
                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                    alt=""
                  />
                </div>
              ) : (
                <div className="v3-connect-card-media" aria-hidden="true">
                  <div className="v3-preview-media v3-media-b" style={{ height: "100%" }}>
                    <span>✦</span>
                  </div>
                </div>
              )}
              <div className="v3-connect-card-body">
                <strong>{draft.nextTitle || "아직 비어 있는 다음 가지"}</strong>
                <p>{draft.nextMemo || "다음 순간을 연결하면 카드가 여기에 표시돼요."}</p>
              </div>
            </div>
          </div>
          <div className="v3-relation-summary">
            <b>{draft.relationLabel}</b>로 이어진 두 순간 — 01 → 02
            <div className="v3-branch-figure" aria-hidden="true">
              <svg viewBox="0 0 200 44" preserveAspectRatio="none">
                <path
                  d="M4 38 C 60 38, 70 8, 196 8"
                  fill="none"
                  stroke="#c86e79"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              </svg>
            </div>
          </div>
          <p className="v3-seed-note">V3 예시 데이터 · 실제 저장은 되지 않아요.</p>
        </aside>
      </section>
    </div>
  );
}
