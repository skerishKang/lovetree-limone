"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  INTENT_PATHS,
  momentsForIntent,
  resolveIntentPath,
  type ResolvedIntentPath,
} from "@/lib/intent-path-prototype";
import "@/app/styles/intent-path-prototype.css";

const DEFAULT_QUERY = INTENT_PATHS[0].suggestion;

export default function IntentToPathPrototypePage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [resolved, setResolved] = useState<ResolvedIntentPath>(() => resolveIntentPath(DEFAULT_QUERY));
  const results = useMemo(() => momentsForIntent(resolved.path.id), [resolved.path.id]);

  const runQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    setResolved(resolveIntentPath(nextQuery));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runQuery(query);
  };

  const stages = [
    { label: "01 · INTERPRET", title: "질문 해석", body: resolved.path.interpretation },
    {
      label: "02 · MATCH",
      title: "경로 선택 근거",
      body: resolved.usedFallback
        ? "등록된 키워드가 없어 안전한 기본 경로인 ‘최근’으로 이동했습니다."
        : `일치어: ${resolved.matchedTerms.join(", ")}`,
    },
    { label: "03 · FOCUS", title: "Moment 좁히기", body: resolved.path.focus },
    { label: "04 · ACT", title: "다음 행동", body: resolved.path.nextAction },
  ];

  return (
    <main className="lt-intent-path">
      <header className="lt-intent-path__header">
        <div>
          <Link href="/design-lab" className="lt-intent-path__back">← Design Lab</Link>
          <p className="lt-intent-path__eyebrow">CAP-09 · INTERNAL MECHANIC PROTOTYPE · ISSUE #98</p>
          <h1>질문을 결과가 아니라<br />읽을 수 있는 경로로 바꿉니다.</h1>
          <p className="lt-intent-path__lede">
            synthetic Moment만 사용하는 내부 프로토타입입니다. AI 분류기, Auth, API, DB와 연결하지 않고
            동일한 resolver가 자유 입력과 추천 질문을 모두 처리하는지 검증합니다.
          </p>
        </div>
        <div className="lt-intent-path__status" aria-label="프로토타입 상태">
          PROTOTYPE · NOT PRODUCT-READY
        </div>
      </header>

      <section className="lt-intent-path__query" aria-labelledby="intent-query-title">
        <div>
          <p className="lt-intent-path__section-label">ASK</p>
          <h2 id="intent-query-title">어떤 기억을 다시 보고 싶나요?</h2>
        </div>
        <form onSubmit={submit} className="lt-intent-path__form">
          <label htmlFor="intent-query">기억 질문</label>
          <div>
            <input
              id="intent-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 사진이나 영상으로 남긴 순간 보여줘"
            />
            <button type="submit">경로 찾기</button>
          </div>
        </form>
        <div className="lt-intent-path__suggestions" aria-label="추천 질문">
          {INTENT_PATHS.map((path) => (
            <button
              type="button"
              key={path.id}
              onClick={() => runQuery(path.suggestion)}
              aria-pressed={resolved.path.id === path.id && query === path.suggestion}
            >
              <span>{path.label}</span>{path.suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="lt-intent-path__resolved" aria-live="polite">
        <div className="lt-intent-path__resolved-copy">
          <p className="lt-intent-path__section-label">RESOLVED PATH</p>
          <h2>{resolved.path.label} 경로</h2>
          <p>
            입력: <strong>“{resolved.normalizedQuery || "빈 질문"}”</strong>
          </p>
          <p className="lt-intent-path__reason">
            {resolved.usedFallback
              ? "명시적 일치어 없음 · fallback=recent"
              : `score=${resolved.score} · ${resolved.matchedTerms.join(" · ")}`}
          </p>
        </div>

        <ol className="lt-intent-path__route" aria-label="질문에서 다음 행동까지의 경로">
          {stages.map((stage, index) => (
            <li key={stage.label} style={{ "--route-index": index } as CSSProperties}>
              <span>{stage.label}</span>
              <strong>{stage.title}</strong>
              <p>{stage.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lt-intent-path__results" aria-labelledby="intent-results-title">
        <div className="lt-intent-path__results-head">
          <div>
            <p className="lt-intent-path__section-label">RESULT SAMPLE</p>
            <h2 id="intent-results-title">{resolved.path.resultLabel}</h2>
          </div>
          <span>{results.length} synthetic Moments</span>
        </div>

        <div className="lt-intent-path__moment-grid">
          {results.map((moment) => (
            <article key={moment.id}>
              <span>{moment.mediaType}</span>
              <h3>{moment.title}</h3>
              <dl>
                <div><dt>Person</dt><dd>{moment.person}</dd></div>
                <div><dt>Captured</dt><dd>{moment.capturedAt}</dd></div>
              </dl>
            </article>
          ))}
        </div>

        <button type="button" className="lt-intent-path__next">
          {resolved.path.nextAction} →
        </button>
        <p className="lt-intent-path__prototype-note">
          이 버튼은 mechanic review용 시각적 종점입니다. 실제 Tree/Moment route로 이동하지 않습니다.
        </p>
      </section>

      <footer className="lt-intent-path__footer">
        Source research: #78 · audit: #96 · registry: #97 · prototype: #98
      </footer>
    </main>
  );
}
