import Link from "next/link";
import DesignLineageOverview from "@/app/components/product/DesignLineageOverview";
import DesignVariantExplorer from "@/app/components/product/DesignVariantExplorer";
import ExperienceCapabilityLibrary from "@/app/components/product/ExperienceCapabilityLibrary";
import { DESIGN_CANDIDATES, DESIGN_SCENARIOS } from "@/lib/design-lab";
import { DESIGN_LINEAGES } from "@/lib/design-lineages";
import "@/app/styles/design-lab.css";
import "@/app/styles/design-lab-history.css";
import "@/app/styles/design-lineages.css";
import "@/app/styles/design-variant-explorer.css";
import "@/app/styles/experience-capabilities.css";

export default function DesignLabPage() {
  const sourceCount = DESIGN_CANDIDATES.filter((candidate) => candidate.origin === "sibling-html").length;
  const implementedCount = DESIGN_CANDIDATES.filter((candidate) => candidate.status === "implemented").length;

  return (
    <main className="lt-lab">
      <header className="lt-lab__header">
        <div>
          <Link className="lt-lab__back" href="/">← Product Gateway</Link>
          <p className="lt-lab__eyebrow">LOVE TREE · DESIGN LAB</p>
          <h1>제품을 복제하지 않고,<br />디자인 후보를 전부 비교합니다.</h1>
          <p className="lt-lab__lede">
            제품은 Legacy와 Next 두 계열만 유지합니다. 번호가 붙은 디자인 작업은 Lineage로, 그 안의 V1/V2/V3는 Revision으로,
            실제 화면 선택지는 Scenario Variant로, 여러 화면에 재사용할 인터랙션은 Experience Capability로 분리합니다.
          </p>
        </div>
        <div className="lt-lab__summary" aria-label="Design Lab 후보 요약">
          <span><b>{DESIGN_LINEAGES.length}</b>디자인 계보</span>
          <span><b>{sourceCount}</b>구현 원본</span>
          <span><b>{implementedCount}</b>구현 후보</span>
        </div>
      </header>

      <nav className="lt-lab__jump" aria-label="Design Lab 바로가기">
        <a href="#scenario-variants">Scenario Variants</a>
        {DESIGN_SCENARIOS.map((scenario) => (
          <a key={scenario.id} href={`#${scenario.id}`}>{scenario.label}</a>
        ))}
        <a href="#design-lineages">Design Lineages</a>
        <a href="#experience-capabilities">Experience Capabilities</a>
      </nav>

      <DesignVariantExplorer />
      <DesignLineageOverview />
      <ExperienceCapabilityLibrary />

      <footer className="lt-lab__footer">
        <p>새 디자인은 새 제품 버전을 만드는 대신 Lineage → Revision → Scenario Variant와 재사용 Capability로 분류합니다.</p>
        <Link href="/v4">현재 Next LoveTree 열기 →</Link>
      </footer>
    </main>
  );
}
