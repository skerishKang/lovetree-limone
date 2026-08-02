"use client";

import { useState } from "react";
import { V3_EMOTION_PRESETS, V3_RELATION_PRESETS } from "./fixtures/v3-fixtures";

interface V3MomentComposerProps {
  treeId: string;
  onOpenComposer: () => void;
}

export default function V3MomentComposer({ treeId, onOpenComposer }: V3MomentComposerProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [emotion, setEmotion] = useState<string>(V3_EMOTION_PRESETS[0].label);
  const [relation, setRelation] = useState<string>(V3_RELATION_PRESETS[0].label);
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  function submit() {
    if (!url.trim()) return;
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="v3-inspector-section">
        <h2 className="v3-workspace-heading">새 순간 추가</h2>
        <div className="v3-success-box" role="status">
          프리뷰에서 새 순간이 추가됐어요. (실제 저장은 되지 않아요)
        </div>
        <button
          className="v3-btn v3-btn-quiet"
          type="button"
          onClick={() => {
            setSaved(false);
            setUrl("");
            setTitle("");
            setMemo("");
          }}
        >
          다시 추가하기
        </button>
      </div>
    );
  }

  return (
    <div className="v3-inspector-section">
      <h2 className="v3-workspace-heading">새 순간 추가</h2>
      <form
        className="v3-composer-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="v3-field">
          <label className="v3-label" htmlFor="v3-composer-url">
            영상 링크
          </label>
          <input
            className="v3-input"
            id="v3-composer-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div className="v3-field">
          <label className="v3-label" htmlFor="v3-composer-title">
            제목
          </label>
          <input
            className="v3-input"
            id="v3-composer-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="이 순간의 제목"
          />
        </div>
        <div className="v3-field">
          <span className="v3-label">감정</span>
          <div className="v3-chip-group" role="group" aria-label="감정 선택">
            {V3_EMOTION_PRESETS.map((preset) => (
              <button
                className="v3-chip"
                type="button"
                key={preset.id}
                aria-pressed={emotion === preset.label}
                onClick={() => setEmotion(preset.label)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="v3-field">
          <span className="v3-label">관계 이유</span>
          <div className="v3-chip-group" role="group" aria-label="관계 이유 선택">
            {V3_RELATION_PRESETS.slice(0, 5).map((preset) => (
              <button
                className="v3-chip"
                type="button"
                key={preset.id}
                aria-pressed={relation === preset.label}
                onClick={() => setRelation(preset.label)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="v3-field">
          <label className="v3-label" htmlFor="v3-composer-memo">
            메모
          </label>
          <textarea
            className="v3-textarea"
            id="v3-composer-memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="이 순간에 남기고 싶은 마음을 적어 보세요."
            maxLength={140}
          />
        </div>
        <button className="v3-btn v3-btn-primary" type="submit">
          새 가지를 피워내기
          <span aria-hidden="true">→</span>
        </button>
        <button className="v3-btn v3-btn-quiet" type="button" onClick={onOpenComposer}>
          전체 화면에서 추가하기
        </button>
      </form>
      <p className="v3-seed-note">treeId: {treeId} · V3 예시 데이터</p>
    </div>
  );
}
