import Link from "next/link";
import Lineage64FloatingMomentPortal from "./Lineage64FloatingMomentPortal";
import {
  LINEAGE_64_SOURCE,
  TRACK64_MOMENTS,
  TRACK64_V1_2_1_HANDOFF,
  track64DepthSplit,
  track64MediaMix,
} from "@/lib/lineage-64/data";

export default function Lineage64FloatingMomentPortalPage() {
  const mix = track64MediaMix();
  const split = track64DepthSplit();
  return (
    <main className="lineage64-review-page" style={{ overflowX: "clip" }}>
      <div className="lineage64-review-stage">
        <Lineage64FloatingMomentPortal />
      </div>

      <div className="lineage64-review-metadata">
        <header
          style={{
            maxWidth: 1480,
            margin: "0 auto 12px",
            color: "#f7f2ec",
            display: "flex",
            gap: 16,
            justifyContent: "space-between",
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Link href="/design-lab" style={{ color: "#b9b1aa", fontSize: 13 }}>
              ← Design Lab
            </Link>
            <p style={{ margin: "12px 0 5px", color: "#ff91b8", fontSize: 11, letterSpacing: ".16em" }}>
              LINEAGE 64 · V1.2.1 CURRENT REVISION · ENTRY-ONBOARDING
            </p>
            <h1 style={{ margin: 0, font: "400 clamp(28px,4vw,52px) Georgia,serif" }}>
              Floating Moment Welcome Orbit
            </h1>
          </div>
          <div style={{ maxWidth: 620, color: "#aaa19b", fontSize: 12, lineHeight: 1.65 }}>
            Internal source-fidelity candidate only. No canonical /v4 adoption, no real video player, no generic
            media/person/gesture runtime, and no Production rights assertion. V1.2 → V1.2.1 delta is Track59
            cross-track local navigation path correction only.
          </div>
        </header>

        <section
          style={{
            maxWidth: 1480,
            margin: "0 auto 12px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 8,
            color: "#ece5df",
          }}
        >
          <Meta
            label="V1.2.1 SOURCE"
            value={`${LINEAGE_64_SOURCE.executableBytes.toLocaleString("en-US")} B · ${LINEAGE_64_SOURCE.executableSha256.slice(0, 12)}…`}
          />
          <Meta label="RENDERING" value={LINEAGE_64_SOURCE.renderingTier} />
          <Meta label="MOMENTS" value={`${TRACK64_MOMENTS.length} · P${mix.photo}/V${mix.video}/M${mix.memo}/L${mix.link}`} />
          <Meta
            label="DEPTH SPLIT"
            value={`fg${split.foreground}/mid${split.mid}/far${split.far}`}
          />
          <Meta label="STATUS" value="DESIGN-LAB CANDIDATE · CANONICAL /v4 HOLD" />
        </section>
      </div>

      <section
        style={{
          maxWidth: 1480,
          margin: "12px auto 0",
          color: "#ddd4cc",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 8,
        }}
      >
        <Contract
          title="DOMAIN BOUNDARY"
          body="Returning-user Memory Entry Portal: WELCOME BACK → continuous floating Moment universe → select/open a Moment → re-enter memory/path context. Not an archive grid, carousel, generic Orbit gallery, or first-use Tree creation landing."
        />
        <Contract
          title="RENDERING"
          body="css3d-dom: perspective / transform-style: preserve-3d / translate3d / rotateX-Y-Z / requestAnimationFrame. No THREE, no WebGL, no canvas conversion, no crossfade scene replacement."
        />
        <Contract
          title="LOCAL SELECTION AUTHORITY"
          body="One selectedMomentId drives card, focus, Viewer, WHY NEXT, Path Continue and Branch Choice. No parallel selected state, no P4 orbit-index import, no P2 ordered-frame, no P3 transport, no generic P1 gesture engine, no P5 inspector, no P6 media runtime."
        />
        <Contract
          title="MEDIA TRUTH"
          body="Photo/Video/Memo/Link Viewer semantics are local. Video is poster/preview only — no <video> runtime, no real playback claim. Link with no source URL invents no URL. Memo is real DOM text."
        />
        <Contract
          title="PRODUCT POLICY BOUNDARY"
          body="recent / important / resume / lastViewed / signed-in return / MY TREE are PRODUCT_POLICY or derived-demo authority, never canonical product truth. DB/API/Auth/Firebase/Neon/Worker unchanged."
        />
        <Contract
          title="TRACK59 HANDOFF"
          body={`${TRACK64_V1_2_1_HANDOFF.sourceTrackId} mapping/URL-resolution/open-call proven; actualTargetOpen=${TRACK64_V1_2_1_HANDOFF.actualTargetOpen}, receiverConsume=${TRACK64_V1_2_1_HANDOFF.receiverConsume}, sameMomentFocus=${TRACK64_V1_2_1_HANDOFF.sameMomentFocus}. No canonical repository route is invented.`}
        />
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,.11)", borderRadius: 12, background: "#0e1016", padding: "10px 12px" }}>
      <small style={{ display: "block", color: "#857e79", fontSize: 9, letterSpacing: ".12em" }}>{label}</small>
      <strong style={{ display: "block", marginTop: 5, fontSize: 11, overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}

function Contract({ title, body }: { title: string; body: string }) {
  return (
    <article style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, background: "#0d0f14", padding: 16 }}>
      <small style={{ color: "#ff91b8", fontSize: 9, letterSpacing: ".12em" }}>{title}</small>
      <p style={{ margin: "8px 0 0", color: "#aaa19b", fontSize: 11, lineHeight: 1.65 }}>{body}</p>
    </article>
  );
}
