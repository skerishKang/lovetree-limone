"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { localDateValue, SOURCE_TYPES, type MemoryRecord } from "@/lib/tree-types";

interface V2MomentEditorProps {
  editingMemory?: MemoryRecord | null;
  parentOptions?: MemoryRecord[];
  saving: boolean;
  error: string | null;
  onSave: (form: MomentFormState) => void;
  onCancel: () => void;
}

export interface MomentFormState {
  sourceType: string;
  title: string;
  memo: string;
  source: string;
  sourceUrl: string;
  timestamp: string;
  emotionTags: string;
  parentId: string;
}

const EMPTY_FORM: MomentFormState = {
  sourceType: "youtube",
  title: "",
  memo: "",
  source: "",
  sourceUrl: "",
  timestamp: localDateValue(),
  emotionTags: "",
  parentId: "",
};

function formFromMemory(memory: MemoryRecord): MomentFormState {
  return {
    sourceType: memory.sourceType || "youtube",
    title: memory.title || "",
    memo: memory.memo || "",
    source: memory.source || "",
    sourceUrl: memory.sourceUrl || "",
    timestamp: memory.timestamp || localDateValue(),
    emotionTags: memory.emotionTags?.join(", ") || "",
    parentId: memory.parentId === memory.id ? "" : memory.parentId || "",
  };
}

export default function V2MomentEditor({ editingMemory, parentOptions = [], saving, error, onSave, onCancel }: V2MomentEditorProps) {
  const [form, setForm] = useState<MomentFormState>(() => (editingMemory ? formFromMemory(editingMemory) : EMPTY_FORM));
  const editingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextId = editingMemory?.id ?? null;
    if (editingIdRef.current === nextId) return;
    editingIdRef.current = nextId;
    setForm(editingMemory ? formFromMemory(editingMemory) : EMPTY_FORM);
  }, [editingMemory]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <aside className="v2-composer" aria-labelledby="memory-composer-title" id="v2-moment-composer">
      <h2 id="memory-composer-title">
        {editingMemory ? "이 순간을 다시 다듬어요" : "다음 순간 이어가기"}
      </h2>
      <p className="v2-composer-intro">
        작은 기록 하나가 다음 가지가 되어 러브트리의 흐름을 이어가요.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="v2-memory-source-type">어디에서 발견했나요?</label>
        <select
          id="v2-memory-source-type"
          value={form.sourceType}
          onChange={(e) => setForm((c) => ({ ...c, sourceType: e.target.value }))}
        >
          {SOURCE_TYPES.map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>

        <label htmlFor="v2-memory-title">순간의 이름</label>
        <input
          id="v2-memory-title"
          value={form.title}
          onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
          placeholder="예: 오래 남은 한 장면"
        />

        <label htmlFor="v2-memory-source">출처 이름 <span>(선택)</span></label>
        <input
          id="v2-memory-source"
          value={form.source}
          onChange={(e) => setForm((c) => ({ ...c, source: e.target.value }))}
          placeholder="예: YouTube, 친구의 추천"
        />

        <label htmlFor="v2-memory-source-url">출처 링크 <span>(선택)</span></label>
        <input
          id="v2-memory-source-url"
          type="url"
          value={form.sourceUrl}
          onChange={(e) => setForm((c) => ({ ...c, sourceUrl: e.target.value }))}
          placeholder="https://…"
        />

        <label htmlFor="v2-memory-timestamp">기록 날짜</label>
        <input
          id="v2-memory-timestamp"
          type="date"
          value={form.timestamp}
          onChange={(e) => setForm((c) => ({ ...c, timestamp: e.target.value }))}
          required
        />

        <label htmlFor="v2-memory-memo">그때의 마음</label>
        <textarea
          id="v2-memory-memo"
          value={form.memo}
          onChange={(e) => setForm((c) => ({ ...c, memo: e.target.value }))}
          placeholder="이 순간이 왜 마음에 남았는지 적어 보세요."
          rows={5}
        />

        <label htmlFor="v2-memory-emotions">감정 태그 <span>(쉼표로 구분)</span></label>
        <input
          id="v2-memory-emotions"
          value={form.emotionTags}
          onChange={(e) => setForm((c) => ({ ...c, emotionTags: e.target.value }))}
          placeholder="설렘, 여운"
        />

        <label htmlFor="v2-memory-parent">어떤 순간에서 이어졌나요?</label>
        <select
          id="v2-memory-parent"
          value={form.parentId}
          onChange={(e) => setForm((c) => ({ ...c, parentId: e.target.value }))}
        >
          <option value="">처음 가지로 남기기</option>
          {parentOptions.map((memory) => (
            <option value={memory.id} key={memory.id}>
              {memory.title || "이전 순간"}
            </option>
          ))}
        </select>

        {error ? <p className="v2-flow-error" role="alert">{error}</p> : null}

        <div className="v2-composer-actions">
          <button
            className="v2-button v2-button-primary"
            type="submit"
            disabled={saving}
          >
            {saving ? "저장 중…" : editingMemory ? "수정한 순간 저장" : "이 순간 이어 붙이기"}
          </button>
          {editingMemory ? (
            <button
              className="v2-button v2-button-quiet"
              type="button"
              onClick={onCancel}
            >
              취소
            </button>
          ) : null}
        </div>
      </form>
    </aside>
  );
}
