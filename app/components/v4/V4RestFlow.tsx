"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MEMORY_CARDS = [
  { title: "처음 마음이 멈춘 장면", date: "04.22", left: "15%", top: "53%", rotate: "-4deg" },
  { title: "다시 찾아본 무대", date: "04.23", left: "44%", top: "19%", rotate: "2deg" },
  { title: "오래 남은 인터뷰", date: "04.24", left: "57%", top: "60%", rotate: "-2deg" },
  { title: "팬들이 추천한 노래", date: "04.27", left: "74%", top: "28%", rotate: "4deg" },
];

const LEAVES = [
  ["28%", "27%", "-24deg", ""], ["34%", "43%", "18deg", "is-rose"], ["46%", "14%", "-8deg", "is-gold"],
  ["55%", "35%", "31deg", ""], ["62%", "53%", "-26deg", "is-rose"], ["73%", "19%", "12deg", ""],
  ["79%", "43%", "-18deg", "is-gold"], ["41%", "68%", "22deg", ""], ["68%", "72%", "9deg", "is-rose"],
] as const;

function getSavedRestState() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("lovetree-v4-rest-state") || "null") as { status?: "active" | "resting"; note?: string; returnNote?: string } | null;
  } catch {
    return null;
  }
}

export default function V4RestFlow() {
  const saved = getSavedRestState();
  const [status, setStatus] = useState<"active" | "resting">(() => saved?.status ?? "active");
  const [note, setNote] = useState(() => saved?.note ?? "지금은 새로운 순간을 더하기보다, 이미 쌓인 마음을 천천히 돌아보고 싶어요.");
  const [returnNote, setReturnNote] = useState(() => saved?.returnNote ?? "다시 마음이 움직이는 날, 이 자리에서 이어갈게요.");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function save(nextStatus: "active" | "resting") {
    setStatus(nextStatus);
    localStorage.setItem("lovetree-v4-rest-state", JSON.stringify({ status: nextStatus, note, returnNote }));
    setToast(nextStatus === "resting" ? "기록을 그대로 둔 채 나무가 잠시 쉬기 시작했어요." : "쉬고 있던 나무가 다시 자라기 시작했어요.");
  }

  return (
    <main className={`v4-lifecycle-page${status === "resting" ? " is-resting" : ""}`}>
      <div className="v4-life-shell">
        <header className="v4-life-header">
          <Link className="v4-life-back" href="/v4/trees/demo">← 성장 트리</Link>
          <Link className="v4-life-brand" href="/v4">LoveTree</Link>
          <span className="v4-life-status-tag">TREE STATUS · {status === "resting" ? "RESTING" : "ACTIVE"}</span>
        </header>

        <section className="v4-rest-layout" aria-labelledby="v4-rest-title">
          <div className="v4-rest-scene">
            <div className="v4-rest-heading">
              <p className="v4-rest-eyebrow">REST IS NOT THE END</p>
              <h1 id="v4-rest-title">
                <span>{status === "resting" ? "나무가 잠시" : "계속 자라던 마음도"}</span>
                <span>{status === "resting" ? "조용히 쉬고 있어요." : "때로는 쉬어갈 수 있어요."}</span>
              </h1>
              <p>
                쉬기를 선택해도 지금까지의 순간, 가지, 날짜와 문장은 사라지지 않습니다.
                다시 마음이 움직일 때 같은 나무의 다음 가지를 이어가면 됩니다.
              </p>
            </div>

            <div className="v4-rest-tree" aria-label="기록을 보존한 채 쉬고 있는 나무">
              <svg viewBox="0 0 760 390" aria-hidden="true">
                <path className="v4-rest-trunk" d="M112 348 C230 302 292 231 350 156 C403 89 496 85 650 41" />
                <path className="v4-rest-branch" d="M278 242 C222 193 173 161 113 126" />
                <path className="v4-rest-branch" d="M361 145 C437 189 500 223 590 248" />
                <path className="v4-rest-branch" d="M464 96 C514 58 561 39 625 29" />
                <path className="v4-rest-branch" d="M322 189 C311 265 323 306 353 348" />
              </svg>
              {LEAVES.map(([left, top, rotate, tone], index) => (
                <span
                  className={`v4-rest-leaf ${tone}`}
                  key={`${left}-${top}`}
                  style={{ left, top, "--leaf-rotate": rotate, opacity: status === "resting" ? 0.58 + (index % 3) * 0.08 : 0.86 } as React.CSSProperties}
                />
              ))}
              {MEMORY_CARDS.map((memory) => (
                <article
                  className="v4-rest-memory"
                  key={memory.title}
                  style={{ left: memory.left, top: memory.top, "--memory-rotate": memory.rotate } as React.CSSProperties}
                >
                  <small>{memory.date}</small>
                  <strong>{memory.title}</strong>
                </article>
              ))}
              <span className="v4-rest-ground" aria-hidden="true" />
            </div>

            <div className="v4-rest-caption">
              <span><strong>5개의 순간과 4개의 가지</strong>가 그대로 보존되어 있어요.</span>
              <span>{status === "resting" ? "새 기록 알림을 잠시 멈춤" : "새 순간을 언제든 추가 가능"}</span>
            </div>
          </div>

          <aside className="v4-rest-journal">
            <div className="v4-rest-journal-head">
              <div>
                <h2>나무의 속도를 정해 주세요</h2>
                <p>휴식은 삭제나 종료가 아니라, 같은 이야기를 잠시 덮어 두는 상태입니다.</p>
              </div>
              <span className="v4-rest-icon" aria-hidden="true">☾</span>
            </div>

            <div className="v4-life-field">
              <span className="v4-life-label">현재 상태 <small>언제든 다시 변경 가능</small></span>
              <div className="v4-rest-choice-grid">
                <button className={`v4-rest-choice${status === "active" ? " is-selected" : ""}`} type="button" onClick={() => setStatus("active")}>
                  <strong>계속 자라기</strong>
                  <small>새로운 순간과 가지를 계속 기록합니다.</small>
                </button>
                <button className={`v4-rest-choice${status === "resting" ? " is-selected" : ""}`} type="button" onClick={() => setStatus("resting")}>
                  <strong>잠시 쉬기</strong>
                  <small>기록을 보존하고 새 활동만 조용히 멈춥니다.</small>
                </button>
              </div>
            </div>

            <div className="v4-life-field">
              <label className="v4-life-label" htmlFor="v4-rest-note">지금 쉬고 싶은 이유 <small>{note.length} / 180</small></label>
              <textarea id="v4-rest-note" className="v4-life-textarea" maxLength={180} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>

            <div className="v4-life-field">
              <label className="v4-life-label" htmlFor="v4-return-note">돌아올 나에게 남길 말 <small>비공개 메모</small></label>
              <textarea id="v4-return-note" className="v4-life-textarea" value={returnNote} onChange={(event) => setReturnNote(event.target.value)} />
            </div>

            <div className="v4-preserved-strip">
              보존됨 · 순간 5개 · 가지 4개 · 마음 일기 5개 · 공개 설정 그대로 · 공유 링크 유지
            </div>

            <div className="v4-life-actions">
              <button className="v4-life-primary" type="button" onClick={() => save(status)}>{status === "resting" ? "이 나무를 잠시 쉬게 하기" : "계속 자라게 두기"}</button>
              {status === "resting" ? <button className="v4-life-secondary" type="button" onClick={() => save("active")}>지금 다시 돌아오기</button> : null}
            </div>
          </aside>
        </section>
      </div>
      {toast ? <div className="v4-life-toast" role="status" aria-live="polite">{toast}</div> : null}
    </main>
  );
}
