import Link from "next/link";
import { DESIGN_CANDIDATES, PRODUCT_FAMILIES } from "@/lib/design-lab";
import { DESIGN_LINEAGES } from "@/lib/design-lineages";
import { EXPERIENCE_CAPABILITIES } from "@/lib/experience-capabilities";

export default function ProductGateway() {
  const next = PRODUCT_FAMILIES.find((family) => family.id === "next");
  const legacy = PRODUCT_FAMILIES.find((family) => family.id === "legacy");
  const implementedCount = DESIGN_CANDIDATES.filter((candidate) => candidate.status === "implemented").length;

  return (
    <main className="lt-gateway">
      <div className="lt-gateway__ambient lt-gateway__ambient--one" aria-hidden="true" />
      <div className="lt-gateway__ambient lt-gateway__ambient--two" aria-hidden="true" />

      <section className="lt-gateway__hero" aria-labelledby="product-gateway-title">
        <p className="lt-gateway__eyebrow">LOVE TREE · PRODUCT GATEWAY</p>
        <h1 id="product-gateway-title">두 개의 LoveTree.<br />하나의 다음 제품을 고르는 중입니다.</h1>
        <p className="lt-gateway__lede">
          기존 제품은 그대로 보존하고, Next LoveTree에서는 새 디자인을 계보와 시나리오별 후보로 계속 검증합니다.
          다른 프로젝트에서 검증된 좋은 인터랙션은 Experience Capability로 추출해 실제 기능과 데이터 위에서 함께 비교합니다.
        </p>

        <div className="lt-gateway__families">
          {legacy ? (
            <Link className="lt-gateway__family" href={legacy.route}>
              <span className="lt-gateway__family-index">01</span>
              <div>
                <small>ORIGINAL BASELINE</small>
                <h2>{legacy.label}</h2>
                <p>{legacy.description}</p>
              </div>
              <b aria-hidden="true">→</b>
            </Link>
          ) : null}

          {next ? (
            <Link className="lt-gateway__family lt-gateway__family--next" href={next.route}>
              <span className="lt-gateway__family-index">02</span>
              <div>
                <small>NEXT PRODUCT</small>
                <h2>{next.label}</h2>
                <p>{next.description}</p>
              </div>
              <b aria-hidden="true">→</b>
            </Link>
          ) : null}
        </div>

        <Link className="lt-gateway__lab" href="/design-lab">
          <span>
            <small>REVIEW SPACE</small>
            <strong>Design Lab</strong>
            <em>{DESIGN_LINEAGES.length}개 디자인 계보 · {implementedCount}개 구현 후보 · {EXPERIENCE_CAPABILITIES.length}개 재사용 Capability</em>
          </span>
          <b>모든 후보와 패턴 비교하기 →</b>
        </Link>
      </section>
    </main>
  );
}
