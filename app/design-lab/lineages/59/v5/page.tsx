import Link from "next/link";
import LivingMemoryBookV5 from "./LivingMemoryBookV5";
import { LINEAGE_59_SOURCE, LINEAGE_59_V5_REVIEW_LABEL } from "@/lib/lineage-59/lineage-59-source";

export default function Lineage59V5Page() {
  return (
    <main className="lt59-runner">
      <header className="lt59-runner__header">
        <div>
          <Link href="/design-lab" className="lt59-runner__back">← Design Lab</Link>
          <p className="lt59-runner__eyebrow">LINEAGE 59 · REVISION V5 · LIVING MEMORY BOOK</p>
          <h1>Memory Sketchbook Journey V5</h1>
          <p className="lt59-runner__lede">
            기존 Moment/Connection 경로를 물리적 추억책으로 경험하고, Moment → WHY NEXT → 다음 Moment로 이어지는 Story를 재생하며,
            Branch에서 선택하고, 문맥 안에서 검수·편집하는 네이티브 Design Lab 후보입니다.
          </p>
        </div>
        <span className="lt59-runner__mode">{LINEAGE_59_V5_REVIEW_LABEL}</span>
      </header>

      <section className="lt59-runner__meta" aria-label="Lineage 59 V5 source identification">
        <div><span>Source</span><strong>{LINEAGE_59_SOURCE.sourceFile}</strong></div>
        <div><span>Bytes</span><strong>{LINEAGE_59_SOURCE.sourceBytes.toLocaleString("en-US")}</strong></div>
        <div><span>Revision</span><strong>{LINEAGE_59_SOURCE.revisionId}</strong></div>
        <div className="lt59-runner__hash"><span>SHA256</span><code>{LINEAGE_59_SOURCE.sourceSha256}</code></div>
        <div><span>Assets</span><strong>{LINEAGE_59_SOURCE.assetProvenance}</strong></div>
        <div><span>Accessibility</span><strong>{LINEAGE_59_SOURCE.accessibilityDisposition}</strong></div>
      </section>

      <LivingMemoryBookV5 />

      <section className="lt59-runner__contract">
        <article>
          <span>SOURCE PRESERVED</span>
          <h2>V5 curl physics, Story ON, Branch, inline edit</h2>
          <p>Continuous pointer-driven page curl, hold/WHY NEXT/landing Story grammar, automatic Branch pause with explicit choice, bounded inline edit with same-spread projection sync, and fast flip.</p>
        </article>
        <article>
          <span>NATIVE REMEDIATION</span>
          <h2>Accessibility, keyboard, reduced-motion semantic parity</h2>
          <p>Role/dialog semantics, focus containment, Escape, keyboard prev/next/Space, aria-live Story phase/page/Branch status, prefers-reduced-motion decorative reduction with semantic page advance preserved.</p>
        </article>
        <article>
          <span>PRODUCT BOUNDARY</span>
          <h2>Design Lab session candidate only — no canonical V4 replacement</h2>
          <p>Moment = page, Connection = WHY NEXT, selected Path = replay sequence, Branch = alternate continuation. Book/spread/curl/Story = presentation/runtime state. No backend/DB/API/Auth.</p>
        </article>
      </section>
    </main>
  );
}