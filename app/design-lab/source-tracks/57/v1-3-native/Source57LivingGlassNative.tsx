import Link from "next/link";
import { LivingGlassMomentGallery } from "@/app/components/moment-presentation/LivingGlassMomentGallery";
import {
  SOURCE57_AUTHORITY,
  SOURCE57_NATIVE_MOMENTS,
  SOURCE57_PRESENTATION_BY_ID,
} from "@/lib/source-track-57-living-glass";

export function Source57LivingGlassNative() {
  return (
    <main className="source57-app" data-testid="source57-native-root">
      <div className="source57-memory-haze" aria-hidden="true" />
      <div className="source57-petal-trace" aria-hidden="true" />
      <div className="source57-vignette" aria-hidden="true" />

      <header className="source57-topbar">
        <Link href="/design-lab" className="source57-brand" aria-label="Design Lab으로 돌아가기">
          <span className="source57-brand-mark" aria-hidden="true" />
          LOVETREE · LIVING GLASS
        </Link>
        <div className="source57-stage-badges" aria-label="Staging provenance">
          <span>DESIGN-LAB STAGING</span>
          <span>V1.3 NATIVE</span>
        </div>
      </header>

      <section className="source57-hero" aria-labelledby="source57-title">
        <p className="source57-eyebrow">CANONICAL MOMENT VISUAL LANGUAGE · SOURCE 57</p>
        <h1 id="source57-title">기억은 유리가 아니라, 빛을 머금은 순간이 됩니다.</h1>
        <p>
          저장된 Moment의 미디어와 감정, 시간과 연결 이유를 하나의 Living Glass surface로 겹쳐 봅니다.
          이 화면은 Source57의 시각 문법을 검증하는 비영속 Design Lab candidate입니다.
        </p>
      </section>

      <LivingGlassMomentGallery
        moments={SOURCE57_NATIVE_MOMENTS}
        presentationById={SOURCE57_PRESENTATION_BY_ID}
      />

      <footer className="source57-provenance">
        <span>{SOURCE57_AUTHORITY.stableId}</span>
        <span>SHA256 {SOURCE57_AUTHORITY.sha256.slice(0, 12)}…</span>
        <span>Canonical Moment projection · no persistence</span>
      </footer>
    </main>
  );
}
