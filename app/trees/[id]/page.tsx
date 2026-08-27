"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTreeMoments } from "@/lib/use-tree-moments";
import { useMomentUrlState } from "@/lib/use-moment-url";
import type { LivingGlassPresentation } from "@/lib/source-track-57-living-glass";
import { LivingGlassMomentGallery } from "@/app/components/moment-presentation/LivingGlassMomentGallery";
import EmailAuthForm from "../../components/EmailAuthForm";
import { TreeViewShell } from "../../components/TreeViewShell";
import { MomentComposerModal } from "../../components/MomentComposerModal";
import "../../styles/email-auth.css";
import "../../styles/source-track-57-living-glass.css";
import "../../styles/source-track-57-living-glass-focus.css";
import "../../styles/source-track-57-living-glass-repair.css";
import "../../styles/source-track-57-living-glass-repair-motion.css";

const SOURCE57_TONES = [
  ["#8f70d6", "rgba(143,112,214,.52)"],
  ["#d77ca7", "rgba(215,124,167,.48)"],
  ["#d79a69", "rgba(215,154,105,.46)"],
  ["#739bc7", "rgba(115,155,199,.44)"],
  ["#7da58f", "rgba(125,165,143,.44)"],
] as const;

function mediaLabel(sourceType: string) {
  const normalized = sourceType.toLowerCase();
  if (normalized.includes("video") || normalized.includes("youtube")) return "VIDEO MOMENT";
  if (normalized.includes("song")) return "SONG MOMENT";
  if (normalized.includes("book")) return "BOOK MOMENT";
  if (normalized.includes("travel")) return "TRAVEL MOMENT";
  return "IMAGE MOMENT";
}

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
  } = useTreeMoments(treeId, highlightParam ?? undefined, momentParam ?? undefined);

  const { handleSelectMoment } = useMomentUrlState({
    treeId,
    moments,
    loading,
    onSelect: selectMoment,
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const presentationById = useMemo<Record<string, LivingGlassPresentation>>(() => {
    return Object.fromEntries(treeMoments.map((moment, index) => {
      const [tone, aura] = SOURCE57_TONES[index % SOURCE57_TONES.length];
      const connectionLabel = moment.parentId
        ? (moment.connectionReason?.trim() || "이전 기억에서 이어진 순간")
        : "이 LoveTree가 시작된 순간";
      return [moment.id, {
        tone,
        aura,
        mediaLabel: mediaLabel(moment.sourceType),
        whyNext: moment.connectionReason?.trim() || "이 순간 뒤에 이어진 기억의 결을 따라가 보세요.",
        connectionLabel,
      }];
    }));
  }, [treeMoments]);

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
      <div className="source57-app" data-mvp-source="57" data-tree-id={treeId}>
        <div className="source57-memory-haze" aria-hidden="true" />
        <div className="source57-petal-trace" aria-hidden="true" />
        <div className="source57-vignette" aria-hidden="true" />

        <section className="source57-hero" aria-labelledby="tree-detail-title">
          <p className="source57-eyebrow">LIVING GLASS · {tree.title}</p>
          <h1 id="tree-detail-title">기억은 유리가 아니라, 빛을 머금은 순간이 됩니다.</h1>
          <p>{tree.memo || "저장된 순간의 미디어와 감정, 시간과 연결 이유를 Living Glass surface 위에서 천천히 다시 만나보세요."}</p>
        </section>

        {treeMoments.length > 0 ? (
          <LivingGlassMomentGallery
            moments={treeMoments}
            presentationById={presentationById}
            selectedId={selectedMomentId}
            onSelectedIdChange={handleSelectMoment}
          />
        ) : (
          <div className="tree-page-state">
            <p>아직 기록된 순간이 없어요.</p>
            {isOwner ? <button className="button button-quiet" type="button" onClick={() => setIsComposerOpen(true)}>첫 순간 남기기</button> : null}
          </div>
        )}
      </div>

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
