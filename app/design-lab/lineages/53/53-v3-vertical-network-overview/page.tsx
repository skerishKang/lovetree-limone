import Link from "next/link";
import Lineage53VerticalNetworkOverview from "./Lineage53VerticalNetworkOverview";
import { SOURCE56_AUTHORITY } from "@/lib/lineage-53-source56";

export default function Lineage53Source56VerticalNetworkPage() {
  return (
    <main style={{ minHeight: "100vh", overflowX: "clip", padding: 20, color: "#292630", background: "radial-gradient(900px 700px at 12% 8%,rgba(228,93,141,.08),transparent 68%),radial-gradient(900px 900px at 88% 42%,rgba(139,105,232,.07),transparent 70%),linear-gradient(180deg,#fbfaf8 0%,#f7f4f2 52%,#f1eff5 100%)" }}>
      <header style={{ maxWidth: 1480, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, flexWrap: "wrap" }}>
        <div>
          <Link href="/design-lab" style={{ fontSize: 12, color: "#716d79" }}>← Design Lab</Link>
          <p style={{ margin: "14px 0 6px", fontSize: 10, letterSpacing: ".2em", color: "#9a6381" }}>LINEAGE 53 · SOURCE 56 EXTENSION · CAP-14 ALIGNED</p>
          <h1 style={{ margin: 0, font: "500 clamp(32px,4.4vw,64px)/.98 Georgia,serif", letterSpacing: "-.055em" }}>Vertical Moment Network Overview</h1>
          <p style={{ maxWidth: 760, margin: "12px 0 0", fontSize: 13, lineHeight: 1.7, color: "#706a76" }}>First Moment에서 시작된 Connection 경로를 한 화면의 세로형 관계망으로 조망하고, 선택한 Moment의 WHY NEXT와 전체 경로 맥락을 다시 읽는 bounded native extension입니다.</p>
        </div>
        <div aria-label="Source 56 authority" style={{ maxWidth: 420, padding: "12px 14px", border: "1px solid #e2dce3", borderRadius: 16, background: "#ffffffbf", display: "grid", gap: 4, fontSize: 10, color: "#746d79" }}>
          <span>{SOURCE56_AUTHORITY.executable}</span>
          <strong style={{ color: "#322f37" }}>{SOURCE56_AUTHORITY.bytes.toLocaleString("en-US")} B</strong>
          <code style={{ fontSize: 9, overflowWrap: "anywhere" }}>{SOURCE56_AUTHORITY.sha256}</code>
        </div>
      </header>

      <Lineage53VerticalNetworkOverview />

      <section aria-label="Source56 bounded extension contract" style={{ maxWidth: 1480, margin: "12px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 8 }}>
        <Contract title="CANONICAL DATA" strong="Moment + Connection only">PathFamily / Hub / Cluster / overview grouping은 VIEW_DERIVED presentation state이며 저장되지 않습니다.</Contract>
        <Contract title="REUSE" strong="Lineage53 + CAP-14 aligned">P3 transport authority와 P4 selection synchronizer를 재사용합니다. 별도 graph/replay engine, DB, API, Path persistence는 만들지 않습니다.</Contract>
        <Contract title="ADOPTION BOUNDARY" strong="Design Lab only">기존 Lineage53 V2는 유지하고 Lineage56 Crystal Memory Atelier와 /v4 canonical surface는 수정하지 않습니다.</Contract>
      </section>
    </main>
  );
}

function Contract({ title, strong, children }: { title: string; strong: string; children: React.ReactNode }) {
  return <article style={{ padding: 16, border: "1px solid #e3dde5", borderRadius: 18, background: "#ffffffc2" }}><span style={{ display: "block", fontSize: 8, letterSpacing: ".14em", color: "#9a6381" }}>{title}</span><strong style={{ display: "block", marginTop: 7, fontSize: 13 }}>{strong}</strong><p style={{ margin: "7px 0 0", fontSize: 10, lineHeight: 1.6, color: "#716b75" }}>{children}</p></article>;
}
