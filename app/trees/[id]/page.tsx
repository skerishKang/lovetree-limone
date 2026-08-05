"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTreeMoments } from "@/lib/use-tree-moments";
import EmailAuthForm from "../../components/EmailAuthForm";
import { TreeViewShell } from "../../components/TreeViewShell";
import { MomentDetailModal } from "../../components/MomentDetailModal";
import "../../styles/email-auth.css";
import {
  formatTreeDate,
  localDateValue,
  sourceTypeLabel,
  SOURCE_TYPES,
  type MemoryRecord,
  youtubeThumbnail,
} from "@/lib/tree-types";

interface MemoryFormState {
  sourceType: string;
  title: string;
  memo: string;
  source: string;
  sourceUrl: string;
  timestamp: string;
  emotionTags: string;
  parentId: string;
}

const EMPTY_FORM: MemoryFormState = {
  sourceType: "youtube",
  title: "",
  memo: "",
  source: "",
  sourceUrl: "",
  timestamp: localDateValue(),
  emotionTags: "",
  parentId: "",
};

export default function TreeDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const { user, loading: authLoading, login, loginPending } = useAuth();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const {
    tree,
    moments,
    treeMoments,
    loading,
    error,
    isOwner,
    selectedMomentId,
    selectedMoment,
    selectMoment,
    refresh,
    createMoment,
    updateMoment,
    deleteMoment,
    highlightMomentId,
  } = useTreeMoments(treeId, highlightParam ?? undefined);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [form, setForm] = useState<MemoryFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());

  const parentOptions = moments;

  function beginEdit(memory: MemoryRecord) {
    setEditingId(memory.id);
    setForm({
      sourceType: memory.sourceType || "youtube",
      title: memory.title || "",
      memo: memory.memo || "",
      source: memory.source || "",
      sourceUrl: memory.sourceUrl || "",
      timestamp: memory.timestamp || localDateValue(),
      emotionTags: memory.emotionTags?.join(", ") || "",
      parentId: memory.parentId || "",
    });
    setFormError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, timestamp: localDateValue() });
    setFormError(null);
    setClientKey(crypto.randomUUID());
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tree || !isOwner || saving) return;
    if (!form.memo.trim() && !form.title.trim()) {
      setFormError("제목이나 메모를 하나는 남겨 주세요.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const sourceUrl = form.sourceUrl.trim();
    if (editingId) {
      const result = await updateMoment(editingId, {
        title: form.title,
        memo: form.memo,
        sourceType: form.sourceType,
        source: form.source,
        sourceUrl,
        thumbnail: sourceUrl ? youtubeThumbnail(sourceUrl) : undefined,
        timestamp: form.timestamp,
        emotionTags: form.emotionTags.split(",").map((t) => t.trim()).filter(Boolean),
        parentId: form.parentId || undefined,
      });
      if (!result) {
        setFormError("순간을 저장하지 못했어요. 다시 시도해 주세요.");
      } else {
        resetForm();
      }
    } else {
      const result = await createMoment({
        title: form.title,
        memo: form.memo,
        sourceType: form.sourceType,
        source: form.source,
        sourceUrl,
        thumbnail: sourceUrl ? youtubeThumbnail(sourceUrl) : undefined,
        timestamp: form.timestamp,
        emotionTags: form.emotionTags.split(",").map((t) => t.trim()).filter(Boolean),
        parentId: form.parentId || undefined,
        clientKey,
      });
      if (!result) {
        setFormError("순간을 저장하지 못했어요. 다시 시도해 주세요.");
      } else {
        resetForm();
      }
    }
    setSaving(false);
  }

  async function removeMemory(memoryId: string) {
    if (!isOwner || removingId) return;
    if (!window.confirm("이 순간을 러브트리에서 지울까요?")) return;
    setRemovingId(memoryId);
    setFormError(null);
    const ok = await deleteMoment(memoryId);
    if (!ok) {
      setFormError("순간을 지우지 못했어요.");
    }
    if (editingId === memoryId) resetForm();
    setRemovingId(null);
  }

  if (authLoading || loading) {
    return <TreeViewShell treeId={treeId} activeView="tree"><div className="tree-page-state" aria-busy="true">러브트리를 불러오고 있어요…</div></TreeViewShell>;
  }

  if (error || !tree) {
    return (
      <TreeViewShell treeId={treeId} activeView="tree">
        <div className="tree-page-state">
          <span className="tree-page-symbol" aria-hidden="true">!</span>
          <h1>{error || "러브트리를 찾을 수 없어요."}</h1>
          <p>공개 상태가 바뀌었거나 주소를 확인해 주세요.</p>
          <div className="tree-page-actions">
            <button className="button button-quiet" type="button" onClick={() => void refresh()}>다시 시도</button>
            {!user ? <button className="button button-primary" type="button" onClick={() => void login()} disabled={loginPending}>{loginPending ? "로그인 중…" : "로그인"}</button> : null}
            {!user ? <button className="button button-quiet" type="button" onClick={() => setIsAuthOpen(true)} aria-haspopup="dialog">이메일로 로그인</button> : null}
          </div>
          <EmailAuthForm open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
      </TreeViewShell>
    );
  }

  return (
    <TreeViewShell treeId={treeId} activeView="tree" userLabel={user?.displayName || user?.email || undefined}>
      <section className="tree-detail-content" aria-labelledby="tree-detail-title">
        <div className="tree-detail-heading">
          <div>
            <p className="eyebrow">{tree.visibility === "private" ? "private love garden" : "a living love garden"}</p>
            <h1 id="tree-detail-title">{tree.title}</h1>
            <p>{tree.memo || "마음이 멈춘 순간들이 이어지는 러브트리"}</p>
          </div>
          <div className="tree-detail-meta">
            <span>{tree.visibility === "private" ? "▣ 비공개" : "◉ 공개 러브트리"}</span>
            <strong>{moments.length}개의 순간</strong>
            <small>시작 {formatTreeDate(tree.createdAt)}</small>
          </div>
        </div>

        <div className="tree-detail-layout">
          <section className="memory-board" aria-labelledby="memory-list-title">
            <div className="memory-board-heading">
              <div><p className="eyebrow">connected moments</p><h2 id="memory-list-title">이어진 순간들</h2></div>
              <span>{moments.length} moments</span>
            </div>
            {moments.length === 0 ? (
              <div className="memory-empty"><span aria-hidden="true">✦</span><p>아직 기록된 순간이 없어요.</p>{isOwner ? <span>오른쪽에서 첫 순간을 남겨 보세요.</span> : null}</div>
            ) : (
              <div className="memory-list">
                {treeMoments.map((moment, index) => {
                  const memory: MemoryRecord = moments.find((m) => m.id === moment.id) ?? moment as unknown as MemoryRecord;
                  const isHighlighted = moment.id === highlightMomentId;
                  return (
                    <article
                      className={`memory-record${index === 0 ? " memory-root" : ""}${isHighlighted ? " highlighted" : ""}`}
                      key={moment.id}
                      onClick={() => selectMoment(moment.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="memory-record-index">{String(treeMoments.length - index).padStart(2, "0")}</div>
                      <div className={`memory-record-media memory-media-${index % 4}`}>
                        {memory.thumbnail ? <img src={memory.thumbnail} alt="" /> : <span aria-hidden="true">{memory.sourceType === "song" ? "♫" : memory.sourceType === "book" ? "▤" : "✦"}</span>}
                      </div>
                      <div className="memory-record-body">
                        <div className="memory-record-meta"><span>{sourceTypeLabel(memory.sourceType)}</span><time>{formatTreeDate(memory.timestamp || memory.createdAt)}</time></div>
                        <h3>{moment.title || `순간 ${treeMoments.length - index}`}</h3>
                        <p>{moment.memo || "이 순간에 남긴 마음"}</p>
                        {memory.emotionTags && memory.emotionTags.length > 0 ? <div className="memory-tags">{memory.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
                        {memory.sourceUrl ? <a className="memory-source" href={memory.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>출처 열기 ↗</a> : null}
                        {isOwner ? <div className="memory-tools" onClick={(e) => e.stopPropagation()}><button type="button" onClick={() => beginEdit(memory)}>수정</button><button type="button" onClick={() => void removeMemory(memory.id)} disabled={removingId === memory.id}>{removingId === memory.id ? "지우는 중…" : "삭제"}</button></div> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {isOwner ? (
            <aside className="memory-composer" aria-labelledby="memory-composer-title">
              <p className="eyebrow">{editingId ? "reshape a moment" : "grow the next branch"}</p>
              <h2 id="memory-composer-title">{editingId ? "이 순간을 다시 다듬어요" : "다음 순간 이어가기"}</h2>
              <p className="memory-composer-intro">작은 기록 하나가 다음 가지가 되어 러브트리의 흐름을 이어가요.</p>
              <form onSubmit={saveMemory}>
                <label htmlFor="memory-source-type">어디에서 발견했나요?</label>
                <select id="memory-source-type" value={form.sourceType} onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))}>
                  {SOURCE_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <label htmlFor="memory-title">순간의 이름</label>
                <input id="memory-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="예: 오래 남은 한 장면" />
                <label htmlFor="memory-source">출처 이름 <span>(선택)</span></label>
                <input id="memory-source" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} placeholder="예: YouTube, 친구의 추천" />
                <label htmlFor="memory-source-url">출처 링크 <span>(선택)</span></label>
                <input id="memory-source-url" type="url" value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://…" />
                <label htmlFor="memory-timestamp">기록 날짜</label>
                <input id="memory-timestamp" type="date" value={form.timestamp} onChange={(event) => setForm((current) => ({ ...current, timestamp: event.target.value }))} required />
                <label htmlFor="memory-memo">그때의 마음</label>
                <textarea id="memory-memo" value={form.memo} onChange={(event) => setForm((current) => ({ ...current, memo: event.target.value }))} placeholder="이 순간이 왜 마음에 남았는지 적어 보세요." rows={5} />
                <label htmlFor="memory-emotions">감정 태그 <span>(쉼표로 구분)</span></label>
                <input id="memory-emotions" value={form.emotionTags} onChange={(event) => setForm((current) => ({ ...current, emotionTags: event.target.value }))} placeholder="설렘, 여운" />
                <label htmlFor="memory-parent">어떤 순간에서 이어졌나요?</label>
                <select id="memory-parent" value={form.parentId} onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}>
                  <option value="">처음 가지로 남기기</option>
                  {parentOptions.filter((m) => m.id !== editingId).map((memory) => <option value={memory.id} key={memory.id}>{memory.title || "이전 순간"}</option>)}
                </select>
                {formError ? <p className="tree-form-error" role="alert">{formError}</p> : null}
                <div className="memory-composer-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? "저장 중…" : editingId ? "수정한 순간 저장" : "이 순간 이어 붙이기"}</button>{editingId ? <button className="button button-quiet" type="button" onClick={resetForm}>취소</button> : null}</div>
              </form>
            </aside>
          ) : null}
        </div>
      </section>

      <MomentDetailModal
        key={selectedMomentId ?? "none"}
        moment={selectedMoment}
        isOwner={isOwner}
        onClose={() => selectMoment(null)}
        onUpdate={updateMoment}
        onDelete={deleteMoment}
        parentOptions={parentOptions}
      />
    </TreeViewShell>
  );
}
