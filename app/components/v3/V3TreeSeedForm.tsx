"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function V3TreeSeedForm() {
  const router = useRouter();
  const [treeName, setTreeName] = useState("첫 만남이 시작된 밤");
  const [description, setDescription] = useState(
    "우연히 본 한 장면에서 시작한 마음이 여기까지 자랐어요.",
  );

  function start() {
    router.push("/v3/trees/demo/onboarding/source");
  }

  return (
    <div className="v3-page">
      <section className="v3-seed" aria-labelledby="v3-seed-title">
        <p className="v3-eyebrow">plant your first moment</p>
        <h1 id="v3-seed-title">
          어떤 트리를
          <em> 처음 심어볼까요?</em>
        </h1>
        <p className="v3-seed-intro">
          최애, 작품, 여행, 공부. 마음이 자란 주제라면 무엇이든 좋아요. 짓는 이름이
          곧 당신의 사랑 연혁 제목이 됩니다.
        </p>
        <div className="v3-field">
          <label className="v3-label" htmlFor="v3-tree-name">
            트리 이름
          </label>
          <input
            className="v3-input"
            id="v3-tree-name"
            value={treeName}
            onChange={(event) => setTreeName(event.target.value)}
            required
          />
        </div>
        <div className="v3-field">
          <label className="v3-label" htmlFor="v3-tree-desc">
            짧은 설명
          </label>
          <textarea
            className="v3-textarea"
            id="v3-tree-desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="v3-seed-preview">
          <span className="v3-seed-preview-label">입력 결과 미리보기</span>
          <span className="v3-seed-preview-title">{treeName || "아직 이름이 없어요"}</span>
          <p>{description || "짧은 설명을 적으면 여기에 보여드려요."}</p>
        </div>
        <div className="v3-seed-actions">
          <button className="v3-btn v3-btn-primary" type="button" onClick={start}>
            첫 순간 발견하러 가기
            <span aria-hidden="true">→</span>
          </button>
          <button className="v3-btn v3-btn-ghost" type="button" onClick={() => router.push("/v3")}>
            ← 처음으로
          </button>
        </div>
        <p className="v3-seed-note">
          이 화면은 V3 제품 미리보기예요. 지금 적은 내용은 저장되지 않습니다.
        </p>
      </section>
    </div>
  );
}
