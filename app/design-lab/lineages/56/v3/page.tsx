import Link from "next/link";
import CrystalMemoryAtelierV3 from "./CrystalMemoryAtelierV3";
import { LINEAGE_56_REVIEW_LABEL, LINEAGE_56_SOURCE } from "@/lib/lineage-56-crystal-memory-source";
import "@/app/styles/lineage-56-crystal-memory-atelier.css";

export default function Lineage56V3ReviewPage() {
  return (
    <main className="lt56-review">
      <header className="lt56-review__header">
        <div>
          <Link href="/design-lab" className="lt56-review__back">← Design Lab</Link>
          <p className="lt56-review__eyebrow">LINEAGE 56 · CRYSTAL MEMORY ATELIER · REVISION V3</p>
          <h1>Crystal Memory Atelier V3</h1>
          <p className="lt56-review__lede">누적 Moments를 하나의 premium living Memory Relic으로 기념·감상하는 source-faithful Design Lab candidate입니다. canonical V4 product adoption이나 backend entitlement를 의미하지 않습니다.</p>
        </div>
        <span className="lt56-review__mode">{LINEAGE_56_REVIEW_LABEL}</span>
      </header>
      <section className="lt56-review__meta" aria-label="Lineage 56 V3 source identity">
        <div><span>Source</span><strong>{LINEAGE_56_SOURCE.sourceFile}</strong></div>
        <div><span>Bytes</span><strong>{LINEAGE_56_SOURCE.sourceBytes.toLocaleString("en-US")}</strong></div>
        <div><span>Revision</span><strong>{LINEAGE_56_SOURCE.revisionId}</strong></div>
        <div className="lt56-review__hash"><span>SHA256</span><code>{LINEAGE_56_SOURCE.sourceSha256}</code></div>
      </section>
      <CrystalMemoryAtelierV3 />
      <section className="lt56-review__contract">
        <article><span>SOURCE LIMITATION</span><h2>8 frames, not a 16-state 3D mesh.</h2><p>4 neutral angles + 4 frontal expression frames만 존재합니다. expression 상태를 profile/rear까지 가상 유지하지 않습니다.</p></article>
        <article><span>PRODUCT BOUNDARY</span><h2>148 / 200과 100·200·365는 source demo value입니다.</h2><p>실사용자 데이터나 backend unlock policy로 연결하지 않습니다. 이 화면은 Design Lab 검토 candidate입니다.</p></article>
        <article><span>NATIVE QUALITY</span><h2>원본 clipping은 복제하지 않습니다.</h2><p>1280×800 Material &amp; Service 하단 clipping을 scroll-safe panel로 교정하고 reduced-motion 및 mobile drawer 접근성을 추가합니다.</p></article>
      </section>
    </main>
  );
}
