"use client";

import { useEffect, useState } from "react";
import {
  formatTreeDate,
  sourceTypeLabel,
  SOURCE_TYPES,
  localDateValue,
  type MemoryRecord,
} from "@/lib/tree-types";

interface MomentDetailModalProps {
  moment: MemoryRecord | null;
  isOwner: boolean;
  onClose: () => void;
  onUpdate: (id: string, input: {
    title?: string;
    memo?: string;
    sourceType?: string;
    source?: string;
    sourceUrl?: string;
    timestamp?: string;
    emotionTags?: string[];
    parentId?: string;
  }) => Promise<MemoryRecord | null>;
  onDelete: (id: string) => Promise<boolean>;
  parentOptions: MemoryRecord[];
}

interface EditFormState {
  sourceType: string;
  title: string;
  memo: string;
  source: string;
  sourceUrl: string;
  timestamp: string;
  emotionTags: string;
  parentId: string;
}

const EMPTY_FORM: EditFormState = {
  sourceType: "youtube",
  title: "",
  memo: "",
  source: "",
  sourceUrl: "",
  timestamp: localDateValue(),
  emotionTags: "",
  parentId: "",
};

function buildFormFromMoment(moment: MemoryRecord): EditFormState {
  return {
    sourceType: moment.sourceType || "youtube",
    title: moment.title || "",
    memo: moment.memo || "",
    source: moment.source || "",
    sourceUrl: moment.sourceUrl || "",
    timestamp: moment.timestamp || localDateValue(),
    emotionTags: moment.emotionTags?.join(", ") || "",
    parentId: moment.parentId || "",
  };
}

export function MomentDetailModal({
  moment,
  isOwner,
  onClose,
  onUpdate,
  onDelete,
  parentOptions,
}: MomentDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<EditFormState>(() =>
    moment ? buildFormFromMoment(moment) : EMPTY_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!moment) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moment, onClose]);

  if (!moment) return null;

  async function handleSave() {
    if (!moment || saving) return;
    if (!form.memo.trim() && !form.title.trim()) {
      setFormError("제목이나 메모를 하나는 남겨 주세요.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const result = await onUpdate(moment.id, {
      title: form.title,
      memo: form.memo,
      sourceType: form.sourceType,
      source: form.source,
      sourceUrl: form.sourceUrl,
      timestamp: form.timestamp,
      emotionTags: form.emotionTags.split(",").map((t) => t.trim()).filter(Boolean),
      parentId: form.parentId || undefined,
    });
    setSaving(false);
    if (!result) {
      setFormError("저장하지 못했어요. 다시 시도해 주세요.");
    } else {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!moment || deleting) return;
    if (!window.confirm("이 순간을 러브트리에서 지울까요?")) return;
    setDeleting(true);
    setFormError(null);
    const ok = await onDelete(moment.id);
    setDeleting(false);
    if (ok) {
      onClose();
    } else {
      setFormError("삭제하지 못했어요. 다시 시도해 주세요.");
    }
  }

  const parentMoment = parentOptions.find((m) => m.id === moment.parentId);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="moment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="moment-detail-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>

        {!editing ? (
          <>
            <div className="moment-detail-header">
              <span className="moment-detail-source">{sourceTypeLabel(moment.sourceType)}</span>
              <time className="moment-detail-date">{formatTreeDate(moment.timestamp || moment.createdAt)}</time>
            </div>
            <h2 id="moment-detail-title" className="moment-detail-title">{moment.title || "이름 없는 순간"}</h2>
            <p className="moment-detail-memo">{moment.memo || "이 순간에 남긴 마음"}</p>
            {moment.thumbnail ? (
              <div className="moment-detail-thumb">
                <img src={moment.thumbnail} alt="" />
              </div>
            ) : null}
            {moment.emotionTags && moment.emotionTags.length > 0 ? (
              <div className="memory-tags">
                {moment.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
            ) : null}
            {moment.sourceUrl ? (
              <a className="moment-detail-link" href={moment.sourceUrl} target="_blank" rel="noreferrer">출처 열기 ↗</a>
            ) : null}
            {parentMoment ? (
              <div className="moment-detail-parent">
                <span className="moment-detail-parent-label">이전 순간에서 이어짐</span>
                <span className="moment-detail-parent-title">{parentMoment.title || "이전 순간"}</span>
              </div>
            ) : null}
            {isOwner ? (
              <div className="moment-detail-actions">
                <button className="button button-quiet" type="button" onClick={() => setEditing(true)}>수정</button>
                <button className="button button-quiet" type="button" onClick={handleDelete} disabled={deleting}>{deleting ? "지우는 중…" : "삭제"}</button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="moment-detail-edit">
            <p className="eyebrow">edit moment</p>
            <h2 className="moment-detail-title">순간 다듬기</h2>
            <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
              <label htmlFor="md-source-type">어디에서 발견했나요?</label>
              <select id="md-source-type" value={form.sourceType} onChange={(e) => setForm((c) => ({ ...c, sourceType: e.target.value }))}>
                {SOURCE_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <label htmlFor="md-title">순간의 이름</label>
              <input id="md-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="예: 오래 남은 한 장면" />
              <label htmlFor="md-source">출처 이름 <span>(선택)</span></label>
              <input id="md-source" value={form.source} onChange={(e) => setForm((c) => ({ ...c, source: e.target.value }))} placeholder="예: YouTube, 친구의 추천" />
              <label htmlFor="md-source-url">출처 링크 <span>(선택)</span></label>
              <input id="md-source-url" type="url" value={form.sourceUrl} onChange={(e) => setForm((c) => ({ ...c, sourceUrl: e.target.value }))} placeholder="https://…" />
              <label htmlFor="md-timestamp">기록 날짜</label>
              <input id="md-timestamp" type="date" value={form.timestamp} onChange={(e) => setForm((c) => ({ ...c, timestamp: e.target.value }))} required />
              <label htmlFor="md-memo">그때의 마음</label>
              <textarea id="md-memo" value={form.memo} onChange={(e) => setForm((c) => ({ ...c, memo: e.target.value }))} placeholder="이 순간이 왜 마음에 남았는지 적어 보세요." rows={4} />
              <label htmlFor="md-emotions">감정 태그 <span>(쉼표로 구분)</span></label>
              <input id="md-emotions" value={form.emotionTags} onChange={(e) => setForm((c) => ({ ...c, emotionTags: e.target.value }))} placeholder="설렘, 여운" />
              <label htmlFor="md-parent">어떤 순간에서 이어졌나요?</label>
              <select id="md-parent" value={form.parentId} onChange={(e) => setForm((c) => ({ ...c, parentId: e.target.value }))}>
                <option value="">처음 가지로 남기기</option>
                {parentOptions.filter((m) => m.id !== moment.id).map((m) => <option value={m.id} key={m.id}>{m.title || "이전 순간"}</option>)}
              </select>
              {formError ? <p className="tree-form-error" role="alert">{formError}</p> : null}
              <div className="moment-detail-edit-actions">
                <button className="button button-primary" type="submit" disabled={saving}>{saving ? "저장 중…" : "수정 저장"}</button>
                <button className="button button-quiet" type="button" onClick={() => setEditing(false)}>취소</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
