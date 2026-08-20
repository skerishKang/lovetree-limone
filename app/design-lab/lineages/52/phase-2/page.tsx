import Link from "next/link";
import Lineage52SpatialPrimitiveProof from "./Lineage52SpatialPrimitiveProof";

export default async function Lineage52Phase2Page({
  searchParams,
}: {
  searchParams: Promise<{ qa?: string }>;
}) {
  const params = await searchParams;
  const qaDepth = params.qa === "depth";

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "clip",
        background: "#05070b",
        padding: 14,
      }}
    >
      <header
        style={{
          width: "min(100%,1480px)",
          margin: "0 auto 12px",
          display: "grid",
          gap: 10,
          color: "#eef3f8",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Link href="/design-lab" style={{ color: "#a8b5bf", fontSize: 13 }}>
            ← Design Lab
          </Link>
          <Link href="/design-lab/lineages/52/v3" style={{ color: "#a8b5bf", fontSize: 13 }}>
            V3 exact source runner
          </Link>
        </div>
        <div>
          <p
            style={{
              margin: "0 0 6px",
              color: "#a7bac8",
              fontSize: 10,
              letterSpacing: ".15em",
              overflowWrap: "anywhere",
            }}
          >
            LINEAGE 52 · PHASE 2 · COMMON_PRIMITIVE_SPLIT · INTERNAL DESIGN LAB PROOF
          </p>
          <h1 style={{ margin: 0, font: "400 clamp(28px,4.6vw,58px) Georgia,serif" }}>
            Native Spatial Primitive Proof
          </h1>
        </div>
        <p style={{ margin: 0, maxWidth: 980, color: "#aab6bf", fontSize: 12, lineHeight: 1.7 }}>
          A bounded native proof of the mechanics common to Lineage52 source evolution: raw WebGL lifecycle,
          orbit camera, spatial Moment/Connection projection, arc reveal/pulse, shared depth authority,
          deterministic transport hooks, reduced-motion remediation, keyboard equivalence and semantic fallback.
          This is not the V3 source runner and does not claim V6.1 native fidelity or Product adoption.
        </p>
      </header>

      <section
        style={{
          width: "min(100%,1480px)",
          margin: "0 auto 12px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,210px),1fr))",
          gap: 8,
        }}
      >
        <Meta label="PHASE-2 BASELINE" value="COMMON_PRIMITIVE_SPLIT" />
        <Meta label="V3 AUTHORITY" value="formal Reference Earth direction · exact runner preserved" />
        <Meta label="V6.1 AUTHORITY" value="latest functional candidate · SELECTED/FINAL not proven" />
        <Meta label="RENDERER" value="raw WebGL · neutral proving geometry" />
        <Meta label="PRODUCT ADOPTION" value="NO · internal Design Lab only" />
      </section>

      <Lineage52SpatialPrimitiveProof qaDepth={qaDepth} />

      <section
        style={{
          width: "min(100%,1480px)",
          margin: "12px auto 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
          gap: 8,
        }}
      >
        <Contract
          title="SOURCE DELTA — NATIVE QUALITY"
          body="Drive sources do not provide complete keyboard, semantic fallback or reduced-motion authority. Those behaviors are implemented here as explicit LoveTree native quality remediation, not described as source-exact fidelity."
        />
        <Contract
          title="RENDERING BOUNDARY"
          body="The primitive renderer uses a neutral occluder only to prove shared depth-buffer behavior. Earth textures, atmosphere, satellites and other source-specific visuals remain outside this core."
        />
        <Contract
          title="TRANSPORT BOUNDARY"
          body="The proof reuses the existing P3 transport authority for play/pause/manual ownership and adds only deterministic local event sampling. Guided Orbit and selected-Moment Path Replay remain V6.1 product-layer behavior and are not imported."
        />
        <Contract
          title="DOMAIN BOUNDARY"
          body="Synthetic Design Lab Moments and Connections project into spatial coordinates without DB/schema changes. IDs remain stable through projection; this route creates no canonical Product data or persistence authority."
        />
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <article
      style={{
        minWidth: 0,
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 12,
        background: "#0b1016",
        padding: "10px 12px",
        color: "#e8eef3",
      }}
    >
      <small style={{ display: "block", color: "#8496a4", fontSize: 9, letterSpacing: ".12em" }}>{label}</small>
      <strong style={{ display: "block", marginTop: 5, fontSize: 11, overflowWrap: "anywhere" }}>{value}</strong>
    </article>
  );
}

function Contract({ title, body }: { title: string; body: string }) {
  return (
    <article
      style={{
        minWidth: 0,
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 14,
        background: "#0b1016",
        padding: 14,
        color: "#dbe4ea",
      }}
    >
      <small style={{ color: "#91a6b5", fontSize: 9, letterSpacing: ".12em" }}>{title}</small>
      <p style={{ margin: "7px 0 0", color: "#a5b2bb", fontSize: 11, lineHeight: 1.65 }}>{body}</p>
    </article>
  );
}
