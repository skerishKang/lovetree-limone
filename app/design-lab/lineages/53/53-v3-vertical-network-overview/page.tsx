import type { ReactNode } from "react";
import Link from "next/link";
import Lineage53VerticalNetworkOverview from "./Lineage53VerticalNetworkOverview";
import { SOURCE56_AUTHORITY } from "@/lib/lineage-53-source56";

export default function Lineage53Source56VerticalNetworkPage() {
  return (
    <main style={{ minHeight: "100vh", overflowX: "clip", color: "#292630", background: "#f7f4f2" }}>
      <style>{`
        @media (max-width: 640px) {
          .s56 .s56-inspector {
            bottom: 112px !important;
          }
          .s56[data-network-mode="FIRST · 01/02/03 REVEAL"] .s56-inspector {
            display: none;
          }
        }
      `}</style>
      <Lineage53VerticalNetworkOverview />

      <section aria-label="Source56 implementation diagnostics" style={{ maxWidth: 1240, margin: "0 auto", padding: "42px 20px 64px" }}>
        <header style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,420px)", gap: 24, alignItems: "end" }}>
          <div>
            <Link href="/design-lab" style={{ fontSize: 12, color: "#716d79" }}>← Design Lab</Link>
            <p style={{ margin: "14px 0 6px", fontSize: 10, letterSpacing: ".2em", color: "#9a6381" }}>LINEAGE 53 · SOURCE 56 EXTENSION · CAP-14 ALIGNED</p>
            <h2 style={{ margin: 0, font: "500 clamp(30px,4vw,54px)/1 Georgia,serif", letterSpacing: "-.05em" }}>Vertical Moment Network Overview</h2>
            <p style={{ maxWidth: 720, margin: "12px 0 0", fontSize: 13, lineHeight: 1.7, color: "#706a76" }}>위 full-viewport 관계망이 Source56 visual experience의 검수면입니다. 아래 정보는 provenance와 bounded implementation contract만 기록하며 첫 화면을 지배하지 않습니다.</p>
          </div>
          <details style={{ padding: "14px 16px", border: "1px solid #e2dce3", borderRadius: 16, background: "#ffffffc9", fontSize: 10, color: "#746d79" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, color: "#3b3640" }}>Source 56 authority / fingerprint</summary>
            <div style={{ display: "grid", gap: 5, marginTop: 10 }}>
              <span>{SOURCE56_AUTHORITY.executable}</span>
              <strong style={{ color: "#322f37" }}>{SOURCE56_AUTHORITY.bytes.toLocaleString("en-US")} B</strong>
              <code style={{ fontSize: 9, overflowWrap: "anywhere" }}>{SOURCE56_AUTHORITY.sha256}</code>
            </div>
          </details>
        </header>

        <section aria-label="Source56 bounded extension contract" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 8 }}>
          <Contract title="CANONICAL DATA" strong="Moment + Connection only">PathFamily / Hub / Cluster / overview grouping은 VIEW_DERIVED presentation state이며 저장되지 않습니다.</Contract>
          <Contract title="REUSE" strong="Lineage53 + CAP-14 aligned">P3 transport authority와 P4 selection synchronizer를 재사용합니다. 별도 graph/replay engine, DB, API, Path persistence는 만들지 않습니다.</Contract>
          <Contract title="ADOPTION BOUNDARY" strong="Design Lab only">기존 Lineage53 V2는 유지하고 Lineage56 Crystal Memory Atelier와 /v4 canonical surface는 수정하지 않습니다.</Contract>
        </section>
      </section>
    </main>
  );
}

function Contract({ title, strong, children }: { title: string; strong: string; children: ReactNode }) {
  return <article style={{ padding: 16, border: "1px solid #e3dde5", borderRadius: 18, background: "#ffffffc2" }}><span style={{ display: "block", fontSize: 8, letterSpacing: ".14em", color: "#9a6381" }}>{title}</span><strong style={{ display: "block", marginTop: 7, fontSize: 13 }}>{strong}</strong><p style={{ margin: "7px 0 0", fontSize: 10, lineHeight: 1.6, color: "#716b75" }}>{children}</p></article>;
}
