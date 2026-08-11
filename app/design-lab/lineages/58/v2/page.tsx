import Link from "next/link";
import Lineage58VideoFigure from "./Lineage58VideoFigure";
import { LINEAGE_58_VIDEOFIGURE_SOURCE, LINEAGE_58_TEMPLATE_EVIDENCE } from "@/lib/lineage-58-videofigure-source";
import { validateLineage58VideoFigureAssetRegistry } from "@/lib/lineage-58-videofigure-assets";
import "@/app/styles/lineage-58-videofigure.css";

export default function Lineage58VideoFigurePage() {
  const gate = validateLineage58VideoFigureAssetRegistry();
  return (
    <main style={{ minHeight: "100vh", background: "#06070b", padding: 14 }}>
      <header style={{ maxWidth: 1480, margin: "0 auto 12px", color: "#f7f2ec", display: "flex", gap: 16, justifyContent: "space-between", alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <Link href="/design-lab" style={{ color: "#b9b1aa", fontSize: 13 }}>← Design Lab</Link>
          <p style={{ margin: "12px 0 5px", color: "#ff91b8", fontSize: 11, letterSpacing: ".16em" }}>LINEAGE 58 · V2 CURRENT REVISION · PEOPLE / ARCHIVE</p>
          <h1 style={{ margin: 0, font: "400 clamp(28px,4vw,52px) Georgia,serif" }}>VideoFigure Atelier V2</h1>
        </div>
        <div style={{ maxWidth: 620, color: "#aaa19b", fontSize: 12, lineHeight: 1.65 }}>
          Internal source-fidelity candidate only. No canonical /v4 adoption, no real video player, no media-analysis backend, and no Production rights assertion.
        </div>
      </header>

      <section style={{ maxWidth: 1480, margin: "0 auto 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8, color: "#ece5df" }}>
        <Meta label="V2 SOURCE" value={`${LINEAGE_58_VIDEOFIGURE_SOURCE.v2RuntimeBytes.toLocaleString("en-US")} B · ${LINEAGE_58_VIDEOFIGURE_SOURCE.v2RuntimeSha256.slice(0, 12)}…`} />
        <Meta label="V1 BASELINE" value={`${LINEAGE_58_VIDEOFIGURE_SOURCE.v1RuntimeBytes.toLocaleString("en-US")} B · ${LINEAGE_58_VIDEOFIGURE_SOURCE.v1RuntimeSha256.slice(0, 12)}…`} />
        <Meta label="EXACT ASSET GATE" value={`${gate.registered}/80 registered · ${gate.metadataComplete}/80 full fingerprints`} />
        <Meta label="STATUS" value={gate.exactGatePass ? "80/80 EXACT PASS" : gate.holdMarker} />
      </section>

      <div style={{ maxWidth: 1480, margin: "0 auto" }}><Lineage58VideoFigure /></div>

      <section style={{ maxWidth: 1480, margin: "12px auto 0", color: "#ddd4cc", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 8 }}>
        <Contract title="DOMAIN BOUNDARY" body="Person → Moment → DerivedFigure / Look → ordered angle assets → source provenance. Figure is never persisted or presented as a Person record in this candidate." />
        <Contract title="RUNTIME PRIMITIVES" body="Issue #141 consumers: P1 gesture authority, P2 ordered turntable, P3 autoplay/manual takeover, P4 canonical selection, P5 responsive archive/detail, P7 motion/accessibility, P8 exact asset gate, P9 fidelity harness." />
        <Contract title="SOURCE DEMO BOUNDARY" body="SCENE CUT, FACE LOCK, OUTFIT LOCK, 8-VIEW BUILD and 100 MOMENTS FOUND remain explicitly simulated. No fake analysis or duplicate media player is introduced." />
        <Contract title="TEMPLATE EVIDENCE" body={`${LINEAGE_58_TEMPLATE_EVIDENCE.candidateTemplateFamily}: ${LINEAGE_58_TEMPLATE_EVIDENCE.templateLocked.join(" · ")}`} />
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div style={{ border: "1px solid rgba(255,255,255,.11)", borderRadius: 12, background: "#0e1016", padding: "10px 12px" }}><small style={{ display: "block", color: "#857e79", fontSize: 9, letterSpacing: ".12em" }}>{label}</small><strong style={{ display: "block", marginTop: 5, fontSize: 11, overflowWrap: "anywhere" }}>{value}</strong></div>;
}
function Contract({ title, body }: { title: string; body: string }) {
  return <article style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, background: "#0d0f14", padding: 16 }}><small style={{ color: "#ff91b8", fontSize: 9, letterSpacing: ".12em" }}>{title}</small><p style={{ margin: "8px 0 0", color: "#aaa19b", fontSize: 11, lineHeight: 1.65 }}>{body}</p></article>;
}
