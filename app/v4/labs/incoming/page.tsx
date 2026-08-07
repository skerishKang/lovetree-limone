import Link from "next/link";
import "@/app/styles/v4/incoming/labs-index.css";

const ENTRIES = [
  {
    href: "/v4/labs/incoming/template-composer",
    code: "A",
    title: "Template Composer v2.4",
    source: "lovetree-auto-unfold-template-composer-v2.4-youtube-fixed.html",
    classification: "NEW_SCREEN",
    blurb:
      "Basic·Person·Emotion·Season 템플릿을 캔버스에 끌어놓고 노드·연결·미디어·YouTube 링크를 편집하는 구조 전개 편집기.",
  },
  {
    href: "/v4/labs/incoming/live-flow-map",
    code: "B",
    title: "Live Flow Map v1.1",
    source: "lovetree-live-flow-map-v1-1.html",
    classification: "NEW_SCREEN",
    blurb:
      "저장된 순간·감정·계절·이유가 살아 움직이는 라이브 플로우 네트워크. 모양·보기·필터·속도·재생을 실제로 조작.",
  },
  {
    href: "/v4/labs/incoming/memory-terrain",
    code: "C",
    title: "Living Memory Terrain v1.2",
    source: "lovetree-living-memory-terrain-v1-2-standalone.html",
    classification: "NEW_SCREEN",
    blurb:
      "순간·연결·재방문·계절 형성이 겹겹이 쌓인 지형. 레이어 토글과 경로 재생, 상태 전환을 포함한 WebGL 지형.",
  },
  {
    href: "/v4/labs/incoming/film-studio",
    code: "D",
    title: "Memory Film Studio v1",
    source: "lovetree-memory-film-studio-v1.html",
    classification: "NEW_SCREEN",
    blurb:
      "실제 트리·시즌·코스로 기억 필름을 연출하는 스튜디오. 스토리보드 재배열, 비율·카메라·소리·타임라인 편집, JSON/포스터 내보내기.",
  },
  {
    href: "/v4/labs/incoming/popup-season-book",
    code: "E",
    title: "Popup Season Book v1",
    source: "lovetree-popup-season-memory-book-v1.html",
    classification: "NEW_SCREEN",
    blurb:
      "닫힌 책에서 피어나는 페이퍼컷 시즌 세계. 씨앗→나무→개화 상태와 9개 독립 순간 가지, 영상 모달, 로컬 상태 보존.",
  },
];

export default function LabsIncomingIndex() {
  return (
    <main className="labs-incoming-page">
      <header className="labs-head">
        <div>
          <span className="labs-eyebrow">ISOLATED PREVIEW · /v4/labs/incoming</span>
          <h1>신규 동생 디자인 소스 미리보기</h1>
          <p>
            main의 공식 29개 source와는 격리된 Preview 전용 화면입니다. 원본 HTML은
            <code>reference/v4-sibling-new-sources/</code>에 보존되며, 여기서는 React/CSS로
            source-faithful하게 구현했습니다.
          </p>
        </div>
        <div className="labs-badge">5 NEW_SCREEN</div>
      </header>

      <section className="labs-grid" aria-label="신규 디자인 후보 목록">
        {ENTRIES.map((entry) => (
          <Link className="labs-card" href={entry.href} key={entry.href}>
            <div className="labs-card-top">
              <span className="labs-code">{entry.code}</span>
              <span className="labs-classification">{entry.classification}</span>
            </div>
            <h2>{entry.title}</h2>
            <p>{entry.blurb}</p>
            <code className="labs-source">{entry.source}</code>
            <span className="labs-open" aria-hidden="true">
              열기 →
            </span>
          </Link>
        ))}
      </section>

      <footer className="labs-note">
        <strong>판정 요약</strong>
        <span>
          구현: Template Composer · Live Flow Map · Memory Terrain · Film Studio · Popup Season Book
          (NEW_SCREEN 5건) — 제외: Season Aquarelle(REJECTED_SOURCE, asset 부재·검토판정서 미확보),
          EXACT_DUP 4건, PR#37 lab 4건, tearoff branch 2건, VISUAL_VARIANT 20건.
        </span>
      </footer>
    </main>
  );
}
