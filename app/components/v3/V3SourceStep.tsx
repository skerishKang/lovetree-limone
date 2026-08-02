"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useV3SourceDraft } from "./v3-onboarding-state";
import { validateSourceInterval } from "./v3-validation";

const SOURCE_TYPES = ["youtube", "song", "book", "person", "travel", "other"] as const;

const SOURCE_TYPE_LABEL: Record<string, string> = {
  youtube: "영상",
  song: "노래",
  book: "책",
  person: "사람",
  travel: "여행",
  other: "기타",
};

function parseYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/,
  );
  return match ? match[1] : null;
}

export default function V3SourceStep() {
  const router = useRouter();
  const { draft, update } = useV3SourceDraft();
  const [timeError, setTimeError] = useState<string | null>(null);

  const youtubeId = parseYouTubeId(draft.sourceUrl);

  function goNext() {
    const result = validateSourceInterval(draft.startSeconds, draft.endSeconds);
    if (!result.valid) {
      setTimeError(result.error);
      return;
    }

    setTimeError(null);
    router.push("/v3/trees/demo/onboarding/heart");
  }

  return (
    <div className="v3-page">
      <div className="v3-progress" aria-label="온보딩 진행 단계">
        <span className="v3-progress-step v3-progress-done">
          <b>1</b> 첫 순간
        </span>
        <span className="v3-progress-line" aria-hidden="true" />
        <span className="v3-progress-step v3-progress-active">
          <b>2</b> 발견
        </span>
        <span className="v3-progress-line" aria-hidden="true" />
        <span className="v3-progress-step">
          <b>3</b> 마음
        </span>
        <span className="v3-progress-line" aria-hidden="true" />
        <span className="v3-progress-step">
          <b>4</b> 연결
        </span>
      </div>
      <section className="v3-onboarding" aria-labelledby="v3-source-title">
        <div>
          <p className="v3-eyebrow">01 · 첫 순간 발견</p>
          <h1 id="v3-source-title">
            마음이 처음 멈춘
            <em> 장면을 찾아볼까요?</em>
          </h1>
          <p className="v3-onboarding-intro">
            어디서 발견했는지, 언제였는지, 어느 시점이 기억에 남는지만 적으면 돼요.
            완벽하게 설명하지 않아도 괜찮아요.
          </p>
          <div className="v3-onboarding-form">
            <div className="v3-field">
              <span className="v3-label">출처 유형</span>
              <div className="v3-chip-group" role="group" aria-label="출처 유형 선택">
                {SOURCE_TYPES.map((type) => (
                  <button
                    className="v3-chip"
                    type="button"
                    key={type}
                    aria-pressed={draft.sourceType === type}
                    onClick={() => update({ sourceType: type })}
                  >
                    {SOURCE_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-source-url">
                출처 URL
              </label>
              <input
                className="v3-input"
                id="v3-source-url"
                type="url"
                value={draft.sourceUrl}
                onChange={(event) => update({ sourceUrl: event.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-source-title-input">
                제목
              </label>
              <input
                className="v3-input"
                id="v3-source-title-input"
                value={draft.title}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="예: 마음이 처음 멈춘 장면"
              />
            </div>
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-source-name">
                출처 이름
              </label>
              <input
                className="v3-input"
                id="v3-source-name"
                value={draft.sourceName}
                onChange={(event) => update({ sourceName: event.target.value })}
              />
            </div>
            <div className="v3-field">
              <label className="v3-label" htmlFor="v3-source-date">
                발견한 날짜
              </label>
              <input
                className="v3-input"
                id="v3-source-date"
                type="date"
                value={draft.recordDate}
                onChange={(event) => update({ recordDate: event.target.value })}
              />
            </div>
            <div className="v3-time-row">
              <div className="v3-field">
                <label className="v3-label" htmlFor="v3-source-start">
                  시작 시점 (mm:ss)
                </label>
                <input
                  className="v3-input"
                  id="v3-source-start"
                  value={draft.startSeconds}
                  onChange={(event) => update({ startSeconds: event.target.value })}
                  placeholder="0:00"
                />
              </div>
              <div className="v3-field">
                <label className="v3-label" htmlFor="v3-source-end">
                  종료 시점 (mm:ss)
                </label>
                <input
                  className="v3-input"
                  id="v3-source-end"
                  value={draft.endSeconds}
                  onChange={(event) => update({ endSeconds: event.target.value })}
                  placeholder="0:00"
                />
              </div>
            </div>
            {timeError && (
              <p className="v3-muted" role="alert">
                {timeError}
              </p>
            )}
          </div>
          <div className="v3-onboarding-actions">
            <button className="v3-btn v3-btn-primary" type="button" onClick={goNext}>
              이 순간으로 마음 남기기
              <span aria-hidden="true">→</span>
            </button>
            <Link className="v3-btn v3-btn-ghost" href="/v3/trees/new">
              ← 트리 시작으로
            </Link>
          </div>
        </div>
        <aside className="v3-onboarding-preview" aria-label="첫 순간 카드 미리보기">
          <div className="v3-source-card">
            {youtubeId ? (
              <>
                <div className="v3-source-card-thumb">
                  <img
                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                    alt=""
                  />
                </div>
                <div className="v3-source-card-body">
                  <span className="v3-source-card-tag">
                    {SOURCE_TYPE_LABEL[draft.sourceType] ?? "기타"} · 발견한 순간
                  </span>
                  <span className="v3-source-card-title">
                    {draft.title || "아직 제목이 없어요"}
                  </span>
                  <p>
                    {draft.sourceUrl
                      ? "출처 URL이 연결됐어요. 카드에 미리보기가 표시됩니다."
                      : "URL을 붙이면 썸네일이 여기에 표시돼요."}
                  </p>
                </div>
              </>
            ) : (
              <div className="v3-source-card-empty">
                <div>
                  <span aria-hidden="true">✦</span>
                  아직 비어 있는 첫 순간 카드예요.
                  <br />
                  왼쪽에서 입력하면 실시간으로 채워져요.
                </div>
              </div>
            )}
          </div>
          <p className="v3-seed-note">V3 예시 데이터 · 실제 저장은 되지 않아요.</p>
        </aside>
      </section>
    </div>
  );
}
