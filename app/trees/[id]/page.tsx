"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import EmailAuthForm from "../../components/EmailAuthForm";
import "../../styles/email-auth.css";
import {
  formatTreeDate,
  localDateValue,
  sourceTypeLabel,
  SOURCE_TYPES,
  type MemoryRecord,
  type TreeRecord,
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
  const { user, loading: authLoading, login, loginPending } = useAuth();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [tree, setTree] = useState<TreeRecord | null>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [form, setForm] = useState<MemoryFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());

  const loadTree = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    setError(null);
    try {
      const [treeResponse, memoryResponse] = await Promise.all([
        apiFetch(`/api/trees/${encodeURIComponent(treeId)}`),
        apiFetch(`/api/trees/${encodeURIComponent(treeId)}/memories`),
      ]);
      const treeData = (await treeResponse.json().catch(() => ({}))) as TreeRecord & { error?: string };
      const memoryData = (await memoryResponse.json().catch(() => [])) as MemoryRecord[] | { error?: string };
      if (!treeResponse.ok) {
        setError(treeResponse.status === 404 ? "이 러브트리를 찾을 수 없어요." : "러브트리를 불러오지 못했어요.");
        return;
      }
      if (!memoryResponse.ok) {
        setError("러브트리의 순간을 불러오지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setTree(treeData);
      setMemories(Array.isArray(memoryData) ? memoryData : []);
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void loadTree(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, loadTree]);

  const isOwner = Boolean(tree && user && tree.ownerId === user.uid);
  const parentOptions = useMemo(
    () => memories.filter((memory) => memory.id !== editingId),
    [editingId, memories]
  );

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
    const payload: Record<string, unknown> = {
      sourceType: form.sourceType,
      title: form.title.trim(),
      memo: form.memo.trim(),
      source: form.source.trim(),
      timestamp: form.timestamp,
      sortOrder: String(memories.length),
      emotionTags: form.emotionTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      parentId: form.parentId || undefined,
    };
    if (sourceUrl) {
      payload.sourceUrl = sourceUrl;
      const thumbnail = youtubeThumbnail(sourceUrl);
      if (thumbnail) payload.thumbnail = thumbnail;
    }
    if (!editingId) payload.clientKey = clientKey;

    try {
      const response = await apiFetch(
        editingId ? `/api/memories/${encodeURIComponent(editingId)}` : `/api/trees/${encodeURIComponent(tree.id)}/memories`,
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      const data = (await response.json().catch(() => ({}))) as MemoryRecord & { error?: string };
      if (!response.ok || !data.id) {
        setFormError(data.error || "순간을 저장하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setMemories((current) => editingId
        ? current.map((memory) => memory.id === data.id ? data : memory)
        : [data, ...current]);
      resetForm();
    } catch {
      setFormError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMemory(memoryId: string) {
    if (!isOwner || removingId) return;
    if (!window.confirm("이 순간을 러브트리에서 지울까요?")) return;
    setRemovingId(memoryId);
    setFormError(null);
    try {
      const response = await apiFetch(`/api/memories/${encodeURIComponent(memoryId)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error || "순간을 지우지 못했어요.");
        return;
      }
      setMemories((current) => current.filter((memory) => memory.id !== memoryId));
      if (editingId === memoryId) resetForm();
    } catch {
      setFormError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setRemovingId(null);
    }
  }

  if (authLoading || loading) {
    return <TreeDetailShell><div className="tree-page-state" aria-busy="true">러브트리를 불러오고 있어요…</div></TreeDetailShell>;
  }

  if (error || !tree) {
    return (
      <TreeDetailShell>
        <div className="tree-page-state">
          <span className="tree-page-symbol" aria-hidden="true">!</span>
          <h1>{error || "러브트리를 찾을 수 없어요."}</h1>
          <p>공개 상태가 바뀌었거나 주소를 확인해 주세요.</p>
          <div className="tree-page-actions">
            <button className="button button-quiet" type="button" onClick={() => void loadTree()}>다시 시도</button>
            {!user ? <button className="button button-primary" type="button" onClick={() => void login()} disabled={loginPending}>{loginPending ? "로그인 중…" : "로그인"}</button> : null}
            {!user ? <button className="button button-quiet" type="button" onClick={() => setIsAuthOpen(true)} aria-haspopup="dialog">이메일로 로그인</button> : null}
          </div>
          <EmailAuthForm open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
      </TreeDetailShell>
    );
  }

  return (
    <TreeDetailShell userLabel={user?.displayName || user?.email || undefined}>
      <section className="tree-detail-content" aria-labelledby="tree-detail-title">
        <div className="tree-detail-heading">
          <div>
            <p className="eyebrow">{tree.visibility === "private" ? "private love garden" : "a living love garden"}</p>
            <h1 id="tree-detail-title">{tree.title}</h1>
            <p>{tree.memo || "마음이 멈춘 순간들이 이어지는 러브트리"}</p>
          </div>
          <div className="tree-detail-meta">
            <span>{tree.visibility === "private" ? "▣ 비공개" : "◉ 공개 러브트리"}</span>
            <strong>{memories.length}개의 순간</strong>
            <small>시작 {formatTreeDate(tree.createdAt)}</small>
          </div>
        </div>

        <div className="tree-detail-layout">
          <section className="memory-board" aria-labelledby="memory-list-title">
            <div className="memory-board-heading">
              <div><p className="eyebrow">connected moments</p><h2 id="memory-list-title">이어진 순간들</h2></div>
              <span>{memories.length} moments</span>
            </div>
            {memories.length === 0 ? (
              <div className="memory-empty"><span aria-hidden="true">✦</span><p>아직 기록된 순간이 없어요.</p>{isOwner ? <span>오른쪽에서 첫 순간을 남겨 보세요.</span> : null}</div>
            ) : (
              <div className="memory-list">
                {memories.map((memory, index) => (
                  <article className={`memory-record${index === 0 ? " memory-root" : ""}`} key={memory.id}>
                    <div className="memory-record-index">{String(memories.length - index).padStart(2, "0")}</div>
                    <div className={`memory-record-media memory-media-${index % 4}`}>
                      {memory.thumbnail ? <img src={memory.thumbnail} alt="" /> : <span aria-hidden="true">{memory.sourceType === "song" ? "♫" : memory.sourceType === "book" ? "▤" : "✦"}</span>}
                    </div>
                    <div className="memory-record-body">
                      <div className="memory-record-meta"><span>{sourceTypeLabel(memory.sourceType)}</span><time>{formatTreeDate(memory.timestamp || memory.createdAt)}</time></div>
                      <h3>{memory.title || `순간 ${memories.length - index}`}</h3>
                      <p>{memory.memo || "이 순간에 남긴 마음"}</p>
                      {memory.emotionTags && memory.emotionTags.length > 0 ? <div className="memory-tags">{memory.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
                      {memory.sourceUrl ? <a className="memory-source" href={memory.sourceUrl} target="_blank" rel="noreferrer">출처 열기 ↗</a> : null}
                      {isOwner ? <div className="memory-tools"><button type="button" onClick={() => beginEdit(memory)}>수정</button><button type="button" onClick={() => void removeMemory(memory.id)} disabled={removingId === memory.id}>{removingId === memory.id ? "지우는 중…" : "삭제"}</button></div> : null}
                    </div>
                  </article>
                ))}
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
                  {parentOptions.map((memory) => <option value={memory.id} key={memory.id}>{memory.title || "이전 순간"}</option>)}
                </select>
                {formError ? <p className="tree-form-error" role="alert">{formError}</p> : null}
                <div className="memory-composer-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? "저장 중…" : editingId ? "수정한 순간 저장" : "이 순간 이어 붙이기"}</button>{editingId ? <button className="button button-quiet" type="button" onClick={resetForm}>취소</button> : null}</div>
              </form>
            </aside>
          ) : null}
        </div>
      </section>
    </TreeDetailShell>
  );
}

function TreeDetailShell({ children, userLabel }: { children: React.ReactNode; userLabel?: string }) {
  return (
    <main className="tree-page">
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/?view=browse">둘러보기</Link>
          {userLabel ? <span>{userLabel}</span> : null}
        </nav>
      </header>
      {children}
    </main>
  );
}
