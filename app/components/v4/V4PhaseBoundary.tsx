import Link from "next/link";

interface V4PhaseBoundaryProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function V4PhaseBoundary({ eyebrow, title, description }: V4PhaseBoundaryProps) {
  return (
    <main className="v4-page">
      <div className="v4-shell">
        <header className="v4-top">
          <Link className="v4-back" href="/v4">← V4 첫 화면</Link>
          <div className="v4-brand"><span className="v4-brand-mark" aria-hidden="true"><i /><b /></span>LoveTree</div>
          <span className="v4-step-label">SOURCE PORT IN PROGRESS</span>
        </header>
        <section className="v4-success-card" style={{ marginTop: "12vh" }}>
          <div className="v4-success-symbol" aria-hidden="true">✦</div>
          <p className="v4-eyebrow">{eyebrow}</p>
          <h1 style={{ margin: 0, font: "400 clamp(2.3rem,6vw,4.4rem)/1.12 var(--v4-display)", letterSpacing: "-.08em" }}>{title}</h1>
          <p>{description}</p>
          <div className="v4-hero-actions" style={{ justifyContent: "center" }}>
            <Link className="v4-secondary" href="/v4/trees/demo/onboarding/emotion">마음 남기기 보기</Link>
            <Link className="v4-primary" href="/v4/trees/demo/onboarding/connect">연결 화면 보기 →</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
