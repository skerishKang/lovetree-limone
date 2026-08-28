import Link from "next/link";
import Lineage60ClusterExplorer from "./Lineage60ClusterExplorer";
import styles from "./lineage-60.module.css";
import {
  LINEAGE_60_SOURCE,
  TRACK60_MOMENTS,
  TRACK60_CLUSTER_SPECS,
  deriveBridges,
} from "@/lib/lineage-60/data";

export default async function Lineage60ClusterExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ qa?: string }>;
}) {
  const params = await searchParams;
  const bridges = deriveBridges(TRACK60_MOMENTS);
  const source = LINEAGE_60_SOURCE;
  // QA depth-overlap fixture is decided on the server so the client component
  // never diverges from the SSR HTML (no hydration mismatch).
  const qaDepth = params.qa === "depth-overlap";

  return (
    <main
      style={{ minHeight: "100vh", width: "100%", overflowX: "clip", background: "#06070b", padding: 14 }}
    >
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
            LINEAGE 60 · V1.2 CURRENT REVISION · RELATIONSHIP-RETROSPECTIVE
          </p>
          <h1 style={{ margin: 0, font: "400 clamp(28px,4vw,52px) Georgia,serif" }}>
            3D Moment Cluster Deep Explorer
          </h1>
        </div>
        <div style={{ maxWidth: 620, color: "#aaa19b", fontSize: 12, lineHeight: 1.65 }}>
          Internal source-fidelity candidate only. Native LoveTree implementation of Track60 V1.2. Cluster and Bridge
          Moment are VIEW_DERIVED — never persistent entities. Backend / API / Auth / Firebase / Neon / Worker unchanged.
        </div>
      </header>

      <section
        style={{
          maxWidth: 1480,
          margin: "0 auto 12px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 8,
          color: "#ece5df",
        }}
      >
        <Meta
          label="V1.2 SOURCE"
          value={
            source.sourceStatus === "PINNED"
              ? `${source.executableBytes.toLocaleString("en-US")} B · ${source.executableSha256.slice(0, 12)}…`
              : source.sourceStatus === "CTO_VERIFIED"
                ? `${source.executableBytes.toLocaleString("en-US")} B · ${source.executableSha256.slice(0, 12)}… · CTO_VERIFIED`
                : `PINNED ${source.executableSha256.slice(0, 12)}… · DRIVE_UNAVAILABLE`
          }
        />
        <Meta label="RENDERING" value="software-projected canvas 3D" />
        <Meta label="MOMENTS" value={`${TRACK60_MOMENTS.length}`} />
        <Meta label="CLUSTERS (view-derived)" value={`${TRACK60_CLUSTER_SPECS.length}`} />
        <Meta label="BRIDGE MOMENTS" value={`${bridges.length}`} />
        <Meta label="STATUS" value="DESIGN-LAB CANDIDATE · CANONICAL /v4 HOLD" />
      </section>

      <Lineage60ClusterExplorer
        moments={TRACK60_MOMENTS}
        clusters={TRACK60_CLUSTER_SPECS}
        bridges={bridges}
        qaDepth={qaDepth}
      />

      <section
        style={{
          maxWidth: 1480,
          margin: "12px auto 0",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <CrossItem
          track="Track55"
          label="canonical graph owner surface"
          href="/v4/trees/demo/graph"
          hold={false}
        />
        <CrossItem
          track="Track56"
          label="vertical Moment network overview / emotional path replay family"
          href="/design-lab/lineages/53/53-v3-vertical-network-overview"
          hold={false}
        />
        <CrossItem
          track="Track59"
          label="living memory book / path replay family"
          href="/design-lab/lineages/59/v5"
          hold={false}
        />
      </section>

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
          body="Discover which large memory clusters emerged inside one Tree and which actual Moments bridge those clusters — Cluster / Depth / Bridge Moment discovery, not path playback, graph editing, topology metrics or a global orbit."
        />
        <Contract
          title="RENDERING"
          body="software-projected canvas 3D: canvas-2d context, x/y/z world coordinates, yaw/pitch rotation, perspective projection, depth/occlusion sort. No WebGL, no CSS3D, no THREE."
        />
        <Contract
          title="DATA BOUNDARY"
          body="Moment = synthetic Moment projection. Connection = synthetic WHY NEXT relation. Cluster and Bridge Moment are VIEW_DERIVED, computed in the client. No Cluster/ BridgeMoment DB entity, no cluster API, no schema change."
        />
        <Contract
          title="LOCAL SELECTION AUTHORITY"
          body="One selectedMomentId drives canvas highlight, Inspector, search/direct jump and the accessible list. No parallel per-surface selection state."
        />
        <Contract
          title="ACCESSIBILITY"
          body="Keyboard canvas controls (rotate/zoom/level), an accessible Moment list grouped by cluster with visible focus, a live-region selection status, and reduced-motion-safe navigation. Canvas alone never ends the product meaning."
        />
        <Contract
          title="CROSS-TRACK HANDOFF"
          body="Track55 → /v4/trees/demo/graph (resolved). Track56 → /design-lab/lineages/53/53-v3-vertical-network-overview (resolved). Track59 → /design-lab/lineages/59/v5 (resolved). No file://, source-relative HTML or window.open to local source files — no fake navigation PASS."
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

function CrossItem({
  track,
  label,
  href,
  hold,
}: {
  track: string;
  label: string;
  href: string | null;
  hold: boolean;
}) {
  return (
    <div className={hold ? styles.crossHold : undefined} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, background: "#0d0f14", padding: "9px 12px", fontSize: 11.5, color: "#cfc7c0", maxWidth: 360 }}>
      <small style={{ color: "#ff91b8", fontSize: 9, letterSpacing: ".12em" }}>{track} HANDOFF</small>
      <div style={{ margin: "4px 0" }}>{label}</div>
      {hold ? (
        <span style={{ color: "#8d857f" }}>HOLD · coming after adoption</span>
      ) : (
        <Link href={href as string} className={styles.crossLink}>
          open {href} ↗
        </Link>
      )}
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
