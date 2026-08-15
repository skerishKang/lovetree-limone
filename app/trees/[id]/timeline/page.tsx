"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTreeMoments } from "@/lib/use-tree-moments";
import { useMomentUrlState } from "@/lib/use-moment-url";
import EmailAuthForm from "../../../components/EmailAuthForm";
import { TreeViewShell } from "../../../components/TreeViewShell";
import { MomentDetailModal } from "../../../components/MomentDetailModal";
import { MomentComposerModal } from "../../../components/MomentComposerModal";
import { MomentThumbnail } from "../../../components/MomentThumbnail";
import "../../../styles/email-auth.css";
import {
  formatTreeDate,
  sourceTypeLabel,
  type MemoryRecord,
} from "@/lib/tree-types";

export default function TimelinePage() {
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const momentParam = searchParams.get("moment");
  const { user, loading: authLoading, login, loginPending } = useAuth();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const {
    tree,
    moments,
    timelineMoments,
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
  } = useTreeMoments(treeId, highlightParam ?? undefined, momentParam ?? undefined);

  const { handleSelectMoment } = useMomentUrlState({
    treeId,
    moments,
    loading,
    onSelect: selectMoment,
  });

  if (authLoading || loading) {
    return <TreeViewShell treeId={treeId} activeView="timeline"><div className="tree-page-state" aria-busy="true">타임라인을 불러오고 있어요…</div></TreeViewShell>;
  }

  if (error || !tree) {
    return (
      <TreeViewShell treeId={treeId} activeView="timeline">
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
      activeView="timeline"
      userLabel={user?.displayName || user?.email || undefined}
      momentId={selectedMomentId}
      isOwner={isOwner}
      onAddMoment={() => setIsComposerOpen(true)}
    >
      <section className="timeline-content" aria-labelledby="timeline-title">
        <div className="timeline-heading">
          <div>
            <p className="eyebrow">timeline view</p>
            <h1 id="timeline-title">{tree.title}</h1>
            <p>{tree.memo || "마음이 멈춘 순간들이 이어지는 러브트리"}</p>
          </div>
          <div className="timeline-meta">
            <strong>{timelineMoments.length}개의 순간</strong>
          </div>
        </div>

        {timelineMoments.length === 0 ? (
          <div className="timeline-empty">
            <span aria-hidden="true">✦</span>
            <p>아직 기록된 순간이 없어요.</p>
            {isOwner ? <button className="button button-quiet" type="button" onClick={() => setIsComposerOpen(true)}>첫 순간 남기기</button> : null}
          </div>
        ) : (
          <ol className="timeline-list" aria-label={`${timelineMoments.length}개의 순간`}>
            {timelineMoments.map((moment, index) => {
              const memory = moments.find((m) => m.id === moment.id) ?? moment as unknown as MemoryRecord;
              const isSelected = moment.id === selectedMomentId;
              return (
                <li className="timeline-item" key={moment.id}>
                  <div className="timeline-rail">
                    <span className="timeline-dot" aria-hidden="true" />
                    {index < timelineMoments.length - 1 ? <span className="timeline-line" aria-hidden="true" /> : null}
                  </div>
                  <article
                    className={`timeline-card${isSelected ? " selected" : ""}`}
                    onClick={() => handleSelectMoment(moment.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectMoment(moment.id); } }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${moment.title || "이름 없는 순간"} 상세 보기`}
                  >
                    <div className="timeline-card-meta">
                      <span className="timeline-source">{sourceTypeLabel(moment.sourceType)}</span>
                      <time>{formatTreeDate(moment.timestamp || moment.createdAt)}</time>
                    </div>
                    <h3>{moment.title || `순간 ${timelineMoments.length - index}`}</h3>
                    <p>{moment.memo || "이 순간에 남긴 마음"}</p>
                    {memory.thumbnail ? (
                      <div className="timeline-thumb">
                        <MomentThumbnail src={memory.thumbnail} alt="" sourceType={memory.sourceType} className="timeline-thumb-img" placeholderClassName="timeline-thumb-placeholder" />
                      </div>
                    ) : null}
                    {moment.emotionTags && moment.emotionTags.length > 0 ? (
                      <div className="memory-tags">
                        {moment.emotionTags.map((tag) => <span key={tag}>#{tag}</span>)}
                      </div>
                    ) : null}
                    {memory.parentId ? (
                      <div className="moment-detail-parent">
                        <span className="moment-detail-parent-label">이전 순간에서 이어짐</span>
                        {memory.connectionReason && memory.connectionReason.trim() ? (
                          <p className="moment-detail-parent-title">{memory.connectionReason}</p>
                        ) : (
                          <p className="moment-detail-parent-title timeline-relation-generic">이전 순간과 이어지는 관계</p>
                        )}
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
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
