import type { ReactNode } from "react";
import V3Header from "./V3Header";

export default function V3Shell({ children }: { children: ReactNode }) {
  return (
    <div className="v3-shell">
      <a className="v3-skip-link" href="#v3-main">
        본문으로 건너뛰기
      </a>
      <V3Header />
      <main className="v3-main" id="v3-main">
        {children}
      </main>
      <footer className="v3-footer">
        <span>LoveTree V3</span>
        <span>마음이 이어진 이유를 기록하는 사랑 연혁 프리뷰</span>
      </footer>
    </div>
  );
}
