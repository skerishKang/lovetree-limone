"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { V3_EMOTION_PRESETS } from "./fixtures/v3-fixtures";
import { useV3HeartDraft } from "./v3-onboarding-state";

const TAG_PRESETS = ["두근거림", "벅참", "여운", "편안함", "감동"];

const VISIBILITY_OPTIONS: { id: "private" | "tree" | "public"; label: string }[] = [
  { id: "private", label: "나만 보기" },
  { id: "tree", label: "트리 안에서만" },
  { id: "public", label: "공개" },
];

export default function V3HeartStep() {
  const router = useRouter();
  const { draft, update } = useV3HeartDraft();
  const [customTag, setCustomTag] = useState("");

  function toggleTag(tag: string) {
    const next = draft.emotionTags.includes(tag)
      ? draft.emotionTags.filter((t) => t !== tag)
      : [...draft.emotionTags, tag];
    update({ emotionTags: next });
  }

  function addCustomTag() {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    if (!draft.emotionTags.includes(trimmed)) {
      update({ emotionTags: [...draft.emotionTags, trimmed] });
    }
    setCustomTag("");
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
        <span className="v3-progress-step v3-progress-active">
          <b>3</b> 마음
        </span>
        <span className="v3-progress-line" aria-hidden="true" />
        <span className="v3-progress-step">
          <b>4</b> 연결
        </span>
      </div>
      <section className="v3-onboarding" aria-labelledby="v3-heart-title">
        <div>
          <p className="v3-eyebrow">02 · 마음 남기기</p>
          <h1 id="v3-heart-title">
            그때의 마음을
            <em> 감정으로 남겨볼까요?</em>
          </h1>
          <p className="v3-onboarding-intro">
            어떤 감정이 가장 가까웠는지 고르고, 더 붙이고 싶은 태그와 메모를 적어
            보세요. 공개 범위도 직접 정할 수 있어요.
          </p>
          <div className="v3-onboarding-form">
            <div className="v3-field">
              <span className="v3-label">대표 감정</span>
              <div className="v3-chip-group" role="group" aria-label="대표 감정 선택">
                {V3_EMOTION_PRESETS.map((emotion) => (
                  <button
                    className="v3-chip"
                    type="button"
                    key={emotion.id}
                    aria-pressed={draft.primaryEmotion === emotion.label}
                    onClick={() =>
                      update({ primaryEmotion: emotion.label })
                    }
                  >
                    <span className="v3-emotion-swatch">
                      <i style={{ background: emotion.color }} aria-hidden="true" />
                      {emotion.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="v3-field">
              <span className="v3-label">추가 감정 태그</span>
              <div className="v3-chip-group" role="group" aria-label="추가 감정 태그 선택">
                {TAG_PRESETS.map((tag) => (
                  <button
                    className="v3-chip"
                    type="button"
                    key={tag}
                    aria-pressed={draft.emotionTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="v3-time-row">
                <input
                  className="v3-input"
                  value={customTag}
                  onChange={(event) => setCustomTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="직접 태그 입력 후 Enter"
                  aria-label="직접 감정 태그 입력"
                />
                <button
                  className="v3-btn v3-btn-quiet"
                  type="button"
                  onClick={addCustomTag}
                >
                  추가
                </button>
              </div>
              {draft.emotionTags.length > 0 && (
                <div className="v3-emotion-tags">
                  {draft.emotionTags.map((tag) => (
                    <span className="v3-emotion-tag" key={tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-heart-memo">
                메모
              </label>
              <textarea
                className="v3-textarea"
                id="v3-heart-memo"
                value={draft.memo}
                onChange={(event) => update({ memo: event.target.value })}
                placeholder="이 장면이 특별했던 이유를 적어 보세요."
                maxLength={140}
              />
              <span className="v3-counter">{draft.memo.length} / 140</span>
            </div>
            <div className="v3-field">
              <span className="v3-label">메모 공개 범위</span>
              <div className="v3-chip-group" role="group" aria-label="메모 공개 범위 선택">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    className="v3-chip"
                    type="button"
                    key={option.id}
                    aria-pressed={draft.memoVisibility === option.id}
                    onClick={() => update({ memoVisibility: option.id })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="v3-onboarding-actions">
            <button
              className="v3-btn v3-btn-primary"
              type="button"
              onClick={() => router.push("/v3/trees/demo/onboarding/connect")}
            >
              다음 순간 이어보기
              <span aria-hidden="true">→</span>
            </button>
            <button
              className="v3-btn v3-btn-ghost"
              type="button"
              onClick={() => router.push("/v3/trees/demo/onboarding/source")}
            >
              ← 첫 순간으로
            </button>
          </div>
        </div>
        <aside className="v3-onboarding-preview" aria-label="마음 카드 미리보기">
          <div className="v3-source-card">
            <div className="v3-source-card-thumb">
              <div className="v3-preview-media v3-media-root v3-heart-media" aria-hidden="true">
                <span>♥</span>
              </div>
            </div>
            <div className="v3-source-card-body">
              <span className="v3-source-card-tag">마음 카드 · 발견한 순간</span>
              <span className="v3-source-card-title">
                {draft.primaryEmotion || "감정을 골라 주세요"}
              </span>
              <div className="v3-mood-dots" aria-hidden="true">
                {draft.emotionTags.map((tag, index) => (
                  <i
                    className="v3-mood-dot"
                    style={{
                      background:
                        V3_EMOTION_PRESETS[index % V3_EMOTION_PRESETS.length].color,
                    }}
                    key={tag}
                  />
                ))}
              </div>
              <p>
                {draft.memo ||
                  "적은 메모가 이 카드에 담겨요. 공개 범위는 트리에 표시됩니다."}
              </p>
              <span className="v3-source-card-tag">
                공개 범위 ·{" "}
                {VISIBILITY_OPTIONS.find((o) => o.id === draft.memoVisibility)?.label}
              </span>
            </div>
          </div>
          <p className="v3-seed-note">V3 예시 데이터 · 실제 저장은 되지 않아요.</p>
        </aside>
      </section>
    </div>
  );
}
