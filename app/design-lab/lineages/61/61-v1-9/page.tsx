import Link from "next/link";
import Lineage61GuidedNextMomentBuilder from "./Lineage61GuidedNextMomentBuilder";

export const metadata = {
  title: "Guided Next Moment LoveTree Builder V1.9",
};

export default function Lineage61V17Page() {
  return (
    <>
      <Lineage61GuidedNextMomentBuilder />
      <aside
        aria-label="출처 및 충실도 상태"
        style={{
          position: "fixed",
          zIndex: 200,
          left: 8,
          bottom: 8,
          maxWidth: 360,
          padding: 8,
          borderRadius: 12,
          background: "#07070be8",
          border: "1px solid #ffffff24",
          color: "#bfb3c0",
          font: "11px/1.5 Arial",
        }}
      >
        <Link href="/design-lab" style={{ color: "white" }}>
          ← Design Lab
        </Link>
        <br />
        LINEAGE 61 · V1.9 (source reconciled + scale/visual implemented) · NATIVE IMPLEMENT
        <br />
        출처: Track61 Issue #158 · V1.9 (SHA-256 834fb634…, 509063 B) · source fidelity 미주장
        <br />
        P8 exact-asset: HOLD · actualTargetOpen / receiverConsume / sameMomentFocus: HOLD
      </aside>
    </>
  );
}
