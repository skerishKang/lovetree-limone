import Link from "next/link";
import Lineage57LivingCharacterWorldV2 from "./Lineage57LivingCharacterWorldV2";
import {
  LINEAGE_57,
  LINEAGE_57_SOURCE_BOUNDARIES,
  LINEAGE_57_SOURCES,
} from "@/lib/lineage-57-living-character-source";
import "@/app/styles/lineage-57-living-character-world.css";
import "@/app/styles/lineage-57-living-character-world-fixes.css";

export default function Lineage57V2Page() {
  const assetGatePassed = LINEAGE_57.assetTransferComplete;
  return (
    <>
      <Lineage57LivingCharacterWorldV2 assetGatePassed={assetGatePassed} />
      <aside className="lcw57-provenance-note" style={{ position: "fixed", zIndex: 200, left: 8, bottom: 8, maxWidth: 350, padding: 8, borderRadius: 12, background: "#07070be8", border: "1px solid #ffffff24", color: "#bfb3c0", font: "7px/1.5 Arial" }}>
        <Link href="/design-lab" style={{ color: "white" }}>← Design Lab</Link><br />
        LINEAGE 57 · V1 BASELINE → V2 INTERACTION REVISION · PARTIAL IMPLEMENT<br />
        Product job: {LINEAGE_57_SOURCE_BOUNDARIES.productJob}<br />
        Assets: {assetGatePassed ? "54/54 exact · PASS" : LINEAGE_57.assetHold}<br />
        V1 SHA256 {LINEAGE_57_SOURCES.v1Index.sha256.slice(0, 12)}… · V2 SHA256 {LINEAGE_57_SOURCES.v2Index.sha256.slice(0, 12)}…
      </aside>
    </>
  );
}
