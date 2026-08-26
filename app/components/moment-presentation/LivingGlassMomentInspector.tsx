"use client";

import Image from "next/image";
import type { TreeMomentView } from "@/lib/moment-model";
import {
  source57MomentDate,
  type LivingGlassPresentation,
} from "@/lib/source-track-57-living-glass";

export function LivingGlassMomentInspector({
  moment,
  presentation,
  onClose,
}: {
  moment: TreeMomentView;
  presentation: LivingGlassPresentation;
  onClose: () => void;
}) {
  return (
    <aside
      className="living-glass-inspector"
      aria-label="Selected Moment detail"
      data-testid="source57-inspector"
    >
      <div className="living-glass-inspector-handle" aria-hidden="true" />
      <header className="living-glass-inspector-header">
        <div>
          <p>SELECTED MOMENT</p>
          <strong>Living Glass Detail</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Moment 상세 닫기">
          ×
        </button>
      </header>

      <div className="living-glass-inspector-media">
        <Image
          src={moment.thumbnail}
          alt=""
          fill
          sizes="(max-width: 720px) 100vw, 420px"
          className="living-glass-media-image"
        />
        <span>{presentation.mediaLabel}</span>
      </div>

      <div className="living-glass-inspector-body">
        <p className="living-glass-inspector-kicker">
          {source57MomentDate(moment)} · {moment.emotionTags.join(" · ") || "기억"}
        </p>
        <h2>{moment.title}</h2>
        <p className="living-glass-inspector-note">{moment.memo}</p>

        <dl className="living-glass-inspector-facts">
          <div>
            <dt>MEDIA</dt>
            <dd>{moment.sourceType || "moment"}</dd>
          </div>
          <div>
            <dt>EMOTION</dt>
            <dd>{moment.emotionTags[0] ?? "기억"}</dd>
          </div>
          <div>
            <dt>CONNECTION</dt>
            <dd>{moment.connectionReason || presentation.connectionLabel}</dd>
          </div>
        </dl>

        <section className="living-glass-why-next" aria-labelledby="source57-why-next">
          <p id="source57-why-next">WHY NEXT</p>
          <strong>{presentation.whyNext}</strong>
          <span>Moment 관계를 설명하는 Source57 presentation copy이며 저장되지 않습니다.</span>
        </section>
      </div>
    </aside>
  );
}
