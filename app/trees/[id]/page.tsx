"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTreeMoments } from "@/lib/use-tree-moments";
import { useMomentUrlState } from "@/lib/use-moment-url";
import EmailAuthForm from "../../components/EmailAuthForm";
import { TreeViewShell } from "../../components/TreeViewShell";
import { MomentDetailModal } from "../../components/MomentDetailModal";
import { MomentComposerModal } from "../../components/MomentComposerModal";
import { MomentThumbnail } from "../../components/MomentThumbnail";
import "../../styles/email-auth.css";
import {
  formatTreeDate,
  memoryDiscoveryDate,
  sourceTypeLabel,
  type MemoryRecord,
} from "@/lib/tree-types";

export default function TreeDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const momentParam = searchParams.get("moment");
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
  } = useTreeMoments(treeId, highlightParam ?? undefined, momentParam ?? undefined);

  const { handleSelectMoment } = useMomentUrlState({
    treeId,
    moments,
    loading,
    onSelect: selectMoment,
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

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
    <TreeViewShell
      treeId={treeId}
      activeView="tree"
      userLabel={user?.displayName || user?.email || undefined}
      momentId={selectedMomentId}
      isOwner={isOwner}
      onAddMoment={() => setIsComposerOpen(true)}
    >
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

        <section className="memory-board" aria-labelledby="memory-list-title">
          <div className="memory-board-heading">
            <div><p className="eyebrow">connected moments</p><h2 id="memory-list-title">이어진 순간들</h2></div>
            <span>{moments.length} moments</span>
          </div>
          {moments.length === 0 ? (
            <div className="memory-empty"><span aria-hidden="true">✦</span><p>아직 기록된 순간이 없어요.</p>{isOwner ? <button className="button button-quiet" type="button" onClick={() => setIsComposerOpen(true)}>첫 순간 남기기</button> : null}</div>
          ) : (
            <div className="memory-list">
              {treeMoments.map((moment, index) => {
                const memory: MemoryRecord = moments.find((m) => m.id === moment.id) ?? moment as unknown as MemoryRecord;
                const isHighlighted = moment.id === highlightMomentId;
                const isSelected = moment.id === selectedMomentId;
                return (
                  <article
                    className={`memory-record${index === 0 ? " memory-root" : ""}${isHighlighted ? " highlighted" : ""}${isSelected ? " selected" : ""}`}
                    key={moment.id}
                    onClick={() => handleSelectMoment(moment.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectMoment(moment.id); } }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${moment.title || "이름 없는 순간"} 상세 보기`}
                  >
                    <div className="memory-record-index">{String(treeMoments.length - index).padStart(2, "0")}</div>
                    <div className={`memory-record-media memory-media-${index % 4}`}>
                      {memory.thumbnail ? (
                        <MomentThumbnail src={memory.thumbnail} alt="" sourceType={memory.sourceType} className="memory-record-img" placeholderClassName="memory-record-placeholder" />
                      ) : (
                        <span aria-hidden="true">{memory.sourceType === "song" ? "♫" : memory.sourceType === "book" ? "▤" : "✦"}</span>
                      )}
                    </div>
                    <div className="memory-record-body">
                      <div className="memory-record-meta"><span>{sourceTypeLabel(memory.sourceType)}</span><time>{formatTreeDate(memoryDiscoveryDate(memory))}</time></div>
                      <h3>{moment.title || `순간 ${treeMoments.length - index}`}</h3>
                      <p>{moment.memo || "이 순간에 남긴 마음"}</p>
                      {memory.emotionTags && memory.emotionTags.length > 0 ? <div className="memory-tags">{memory.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
                      {memory.sourceUrl ? <a className="memory-source" href={memory.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>출처 열기 ↗</a> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <MomentDetailModal
        key={selectedMomentId ?? "none"}
        moment={selectedMoment}
        isOwner={isOwner}
        onClose={() => handleSelectMoment(null)}
        onUpdate={updateMoment}
        onDelete={deleteMoment}
        parentOptions={moments}
      />

      {isComposerOpen ? (
        <MomentComposerModal
          onClose={() => setIsComposerOpen(false)}
          parentMoment={selectedMoment}
          parentOptions={moments}
          onCreate={createMoment}
        />
      ) : null}
    </TreeViewShell>
  );
}
