"use client";

import { useEffect, useRef, useState } from "react";
import {
  SOURCE_TYPES,
  localDateValue,
  youtubeThumbnail,
  type MemoryRecord,
} from "@/lib/tree-types";
import type { CreateMomentInput } from "@/lib/use-tree-moments";

interface MomentComposerModalProps {
  onClose: () => void;
  parentMoment: MemoryRecord | null;
  parentOptions: MemoryRecord[];
  onCreate: (input: CreateMomentInput) => Promise<MemoryRecord | null>;
}

interface ComposerForm {
  sourceType: string;
  title: string;
  memo: string;
  source: string;
  sourceUrl: string;
  timestamp: string;
  emotionTags: string;
  parentId: string;
  asChildOfSelected: boolean;
}

function emptyForm(parentMoment: MemoryRecord | null): ComposerForm {
  return {
    sourceType: "youtube",
    title: "",
    memo: "",
    source: "",
    sourceUrl: "",
    timestamp: localDateValue(),
    emotionTags: "",
    parentId: parentMoment?.id ?? "",
    asChildOfSelected: Boolean(parentMoment),
  };
}

export function MomentComposerModal({
  onClose,
  parentMoment,
  parentOptions,
  onCreate,
}: MomentComposerModalProps) {
  const [form, setForm] = useState<ComposerForm>(() => emptyForm(parentMoment));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      (firstFieldRef.current ?? closeButtonRef.current)?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!form.memo.trim() && !form.title.trim()) {
      setError("제목이나 메모를 하나는 남겨 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const sourceUrl = form.sourceUrl.trim();
    const input: CreateMomentInput = {
      title: form.title,
      memo: form.memo,
      sourceType: form.sourceType,
      source: form.source,
      sourceUrl,
      thumbnail: sourceUrl ? youtubeThumbnail(sourceUrl) : undefined,
      timestamp: form.timestamp,
      emotionTags: form.emotionTags.split(",").map((t) => t.trim()).filter(Boolean),
      parentId: form.asChildOfSelected ? form.parentId || undefined : undefined,
      clientKey,
    };
    const created = await onCreate(input);
    setSaving(false);
    if (!created) {
      setError("순간을 저장하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    setClientKey(crypto.randomUUID());
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="moment-composer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moment-composer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <p className="eyebrow">grow the next branch</p>
        <h2 id="moment-composer-title">새 순간 이어가기</h2>
        {parentMoment ? (
          <p className="moment-composer-child-hint" role="status">
            “{parentMoment.title || "이전 순간"}”의 다음 가지로 이어져요.
          </p>
        ) : (
          <p className="moment-composer-intro">작은 기록 하나가 다음 가지가 되어 러브트리의 흐름을 이어가요.</p>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="mc-source-type">어디에서 발견했나요?</label>
          <select
            id="mc-source-type"
            ref={firstFieldRef}
            value={form.sourceType}
            onChange={(e) => setForm((c) => ({ ...c, sourceType: e.target.value }))}
          >
            {SOURCE_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>

          <label htmlFor="mc-title">순간의 이름</label>
          <input id="mc-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="예: 오래 남은 한 장면" />

          <label htmlFor="mc-source">출처 이름 <span>(선택)</span></label>
          <input id="mc-source" value={form.source} onChange={(e) => setForm((c) => ({ ...c, source: e.target.value }))} placeholder="예: YouTube, 친구의 추천" />

          <label htmlFor="mc-source-url">출처 링크 <span>(선택)</span></label>
          <input id="mc-source-url" type="url" value={form.sourceUrl} onChange={(e) => setForm((c) => ({ ...c, sourceUrl: e.target.value }))} placeholder="https://…" />

          <label htmlFor="mc-timestamp">기록 날짜</label>
          <input id="mc-timestamp" type="date" value={form.timestamp} onChange={(e) => setForm((c) => ({ ...c, timestamp: e.target.value }))} required />

          <label htmlFor="mc-memo">그때의 마음</label>
          <textarea id="mc-memo" value={form.memo} onChange={(e) => setForm((c) => ({ ...c, memo: e.target.value }))} placeholder="이 순간이 왜 마음에 남았는지 적어 보세요." rows={4} />

          <label htmlFor="mc-emotions">감정 태그 <span>(쉼표로 구분)</span></label>
          <input id="mc-emotions" value={form.emotionTags} onChange={(e) => setForm((c) => ({ ...c, emotionTags: e.target.value }))} placeholder="설렘, 여운" />

          <div className="moment-composer-parent-options">
            <label className="moment-composer-check">
              <input
                type="checkbox"
                checked={form.asChildOfSelected}
                onChange={(e) => setForm((c) => ({ ...c, asChildOfSelected: e.target.checked }))}
              />
              {parentMoment ? "선택한 순간의 자식으로 추가" : "다른 순간의 자식으로 추가"}
            </label>
            {form.asChildOfSelected ? (
              <select
                id="mc-parent"
                value={form.parentId}
                onChange={(e) => setForm((c) => ({ ...c, parentId: e.target.value }))}
                aria-label="부모 순간 선택"
              >
                <option value="">처음 가지로 남기기</option>
                {parentOptions.map((m) => <option value={m.id} key={m.id}>{m.title || "이전 순간"}</option>)}
              </select>
            ) : null}
          </div>

          {error ? <p className="tree-form-error" role="alert">{error}</p> : null}

          <div className="moment-composer-actions">
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "저장 중…" : "이 순간 이어 붙이기"}
            </button>
            <button className="button button-quiet" type="button" onClick={onClose} disabled={saving}>취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}
