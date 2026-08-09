"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatTreeDate,
  memoryDiscoveryDate,
  sourceTypeLabel,
  SOURCE_TYPES,
  localDateValue,
  videoOffsetSecondsFromUrl,
  type MemoryRecord,
} from "@/lib/tree-types";
import { MomentThumbnail } from "./MomentThumbnail";

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
    discoveryDate?: string;
    videoOffsetSeconds?: number;
    emotionTags?: string[];
    parentId?: string | null;
    connectionReason?: string;
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
  discoveryDate: string;
  emotionTags: string;
  parentId: string;
  connectionReason: string;
}

function buildFormFromMoment(moment: MemoryRecord): EditFormState {
  return {
    sourceType: moment.sourceType || "youtube",
    title: moment.title || "",
    memo: moment.memo || "",
    source: moment.source || "",
    sourceUrl: moment.sourceUrl || "",
    discoveryDate: moment.discoveryDate || moment.timestamp || localDateValue(),
    emotionTags: moment.emotionTags?.join(", ") || "",
    parentId: moment.parentId || "",
    connectionReason: moment.connectionReason || "",
  };
}

function formatOffset(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

type PanelMode = "view" | "edit" | "delete-confirm";

export function MomentDetailModal({ moment, isOwner, onClose, onUpdate, onDelete, parentOptions }: MomentDetailModalProps) {
  const [mode, setMode] = useState<PanelMode>("view");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>(() => moment ? buildFormFromMoment(moment) : buildFormFromMoment({} as MemoryRecord));
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moment) return;
    const timer = window.setTimeout(() => {
      (dialogRef.current?.querySelector<HTMLElement>("h2, button") ?? closeButtonRef.current)?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [moment]);

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
      setFeedback("제목이나 메모를 하나는 남겨 주세요.");
      return;
    }
    if (form.parentId && !form.connectionReason.trim()) {
      setFeedback("이전 순간에서 왜 이어졌는지 한 문장으로 남겨 주세요.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    const result = await onUpdate(moment.id, {
      title: form.title,
      memo: form.memo,
      sourceType: form.sourceType,
      source: form.source,
      sourceUrl: form.sourceUrl,
      discoveryDate: form.discoveryDate,
      videoOffsetSeconds: form.sourceUrl ? videoOffsetSecondsFromUrl(form.sourceUrl) : undefined,
      emotionTags: form.emotionTags.split(",").map((t) => t.trim()).filter(Boolean),
      parentId: form.parentId || null,
      connectionReason: form.parentId ? form.connectionReason : "",
    });
    setSaving(false);
    if (!result) {
      setFeedback("저장하지 못했어요. 다시 시도해 주세요.");
    } else {
      setMode("view");
      setFeedback("저장했어요.");
    }
  }

  async function handleDelete() {
    if (!moment || deleting) return;
    setDeleting(true);
    setFeedback(null);
    const ok = await onDelete(moment.id);
    setDeleting(false);
    if (ok) onClose();
    else {
      setMode("view");
      setFeedback("삭제하지 못했어요. 다시 시도해 주세요.");
    }
  }

  const parentMoment = parentOptions.find((m) => m.id === moment.parentId);
  const offset = formatOffset(moment.videoOffsetSeconds ?? videoOffsetSecondsFromUrl(moment.sourceUrl || ""));

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div ref={dialogRef} className="moment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="moment-detail-title" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        {feedback ? <p className="moment-feedback" role="status" aria-live="polite">{feedback}</p> : null}

        {mode === "delete-confirm" ? (
          <div className="moment-delete-confirm">
            <span className="moment-detail-source">delete moment</span>
            <h2 id="moment-detail-title" className="moment-detail-title">이 순간을 지울까요?</h2>
            <p className="moment-detail-memo">“{moment.title || "이름 없는 순간"}”을 러브트리에서 영구히 지워요.</p>
            <div className="moment-delete-actions">
              <button className="button button-primary" type="button" onClick={handleDelete} disabled={deleting}>{deleting ? "지우는 중…" : "영구히 삭제"}</button>
              <button className="button button-quiet" type="button" onClick={() => setMode("view")} disabled={deleting}>취소</button>
            </div>
          </div>
        ) : mode === "edit" ? (
          <div className="moment-detail-edit">
            <p className="eyebrow">edit moment</p>
            <h2 id="moment-detail-title" className="moment-detail-title">순간 다듬기</h2>
            <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
              <label htmlFor="md-source-type">어디에서 발견했나요?</label>
              <select id="md-source-type" value={form.sourceType} onChange={(e) => setForm((c) => ({ ...c, sourceType: e.target.value }))}>{SOURCE_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              <label htmlFor="md-title">순간의 이름</label>
              <input id="md-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="예: 오래 남은 한 장면" />
              <label htmlFor="md-source">출처 이름 <span>(선택)</span></label>
              <input id="md-source" value={form.source} onChange={(e) => setForm((c) => ({ ...c, source: e.target.value }))} placeholder="예: YouTube, 친구의 추천" />
              <label htmlFor="md-source-url">출처 링크 <span>(선택)</span></label>
              <input id="md-source-url" type="url" value={form.sourceUrl} onChange={(e) => setForm((c) => ({ ...c, sourceUrl: e.target.value }))} placeholder="https://…" />
              <label htmlFor="md-discovery-date">발견한 날짜</label>
              <input id="md-discovery-date" type="date" value={form.discoveryDate} onChange={(e) => setForm((c) => ({ ...c, discoveryDate: e.target.value }))} required />
              <label htmlFor="md-memo">그때의 마음</label>
              <textarea id="md-memo" value={form.memo} onChange={(e) => setForm((c) => ({ ...c, memo: e.target.value }))} placeholder="이 순간이 왜 마음에 남았는지 적어 보세요." rows={4} />
              <label htmlFor="md-emotions">감정 태그 <span>(쉼표로 구분)</span></label>
              <input id="md-emotions" value={form.emotionTags} onChange={(e) => setForm((c) => ({ ...c, emotionTags: e.target.value }))} placeholder="설렘, 여운" />
              <label htmlFor="md-parent">어떤 순간에서 이어졌나요?</label>
              <select id="md-parent" value={form.parentId} onChange={(e) => setForm((c) => ({ ...c, parentId: e.target.value }))}>
                <option value="">처음 가지로 남기기</option>
                {parentOptions.filter((m) => m.id !== moment.id).map((m) => <option value={m.id} key={m.id}>{m.title || "이전 순간"}</option>)}
              </select>
              {form.parentId ? <><label htmlFor="md-connection-reason">왜 이 순간에서 이어졌나요?</label><textarea id="md-connection-reason" value={form.connectionReason} onChange={(e) => setForm((c) => ({ ...c, connectionReason: e.target.value }))} maxLength={500} rows={3} required /></> : null}
              {feedback ? <p className="tree-form-error" role="alert">{feedback}</p> : null}
              <div className="moment-detail-edit-actions">
                <button className="button button-primary" type="submit" disabled={saving}>{saving ? "저장 중…" : "수정 저장"}</button>
                <button className="button button-quiet" type="button" onClick={() => { setMode("view"); setFeedback(null); }} disabled={saving}>취소</button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="moment-detail-header">
              <span className="moment-detail-source">{sourceTypeLabel(moment.sourceType)}{offset ? ` · ${offset}` : ""}</span>
              <time className="moment-detail-date">{formatTreeDate(memoryDiscoveryDate(moment))}</time>
            </div>
            <h2 id="moment-detail-title" className="moment-detail-title" tabIndex={-1}>{moment.title || "이름 없는 순간"}</h2>
            <p className="moment-detail-memo">{moment.memo || "이 순간에 남긴 마음"}</p>
            {moment.thumbnail ? <div className="moment-detail-thumb"><MomentThumbnail src={moment.thumbnail} alt="" sourceType={moment.sourceType} placeholderClassName="moment-thumb-placeholder" /></div> : null}
            {moment.emotionTags && moment.emotionTags.length > 0 ? <div className="memory-tags">{moment.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
            {moment.sourceUrl ? <a className="moment-detail-link" href={moment.sourceUrl} target="_blank" rel="noreferrer">출처 열기 ↗</a> : null}
            {parentMoment ? (
              <div className="moment-detail-parent">
                <span className="moment-detail-parent-label">이전 순간에서 이어짐</span>
                <span className="moment-detail-parent-title">{parentMoment.title || "이전 순간"}</span>
                {moment.connectionReason ? <p>{moment.connectionReason}</p> : null}
              </div>
            ) : null}
            {isOwner ? <div className="moment-detail-actions"><button className="button button-quiet" type="button" onClick={() => { setMode("edit"); setFeedback(null); }}>수정</button><button className="button button-quiet" type="button" onClick={() => { setMode("delete-confirm"); setFeedback(null); }}>삭제</button></div> : null}
          </>
        )}
      </div>
    </div>
  );
}
