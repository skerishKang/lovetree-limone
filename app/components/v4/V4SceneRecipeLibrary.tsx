// Source: lovetree-memory-scene-recipe-library-v1.html
"use client";

import { useEffect, useRef, useState } from "react";

const RECIPES = [
  { id: "r01", title: "첫 발견의 떨림", category: "discovery", energy: "high", desc: "처음 마음이 멈춘 순간을 기억으로 고정하는 레시피", tags: ["video", "timestamp", "emotion"], code: "DSC-01" },
  { id: "r02", title: "이어진 가지", category: "connection", energy: "medium", desc: "두 번째 순간을 첫 기억에 자연스럽게 연결", tags: ["video", "relation", "branch"], code: "CON-02" },
  { id: "r03", title: "감정의 결", category: "emotion", energy: "high", desc: "감정선을 따라 기억의 질감을 입히기", tags: ["emotion", "memo", "music"], code: "EMO-03" },
  { id: "r04", title: "되돌아보는 길", category: "revisit", energy: "low", desc: "지난 기억을 새 시선으로 재방문", tags: ["revisit", "note", "growth"], code: "REV-04" },
  { id: "r05", title: "성장의 궤적", category: "growth", energy: "medium", desc: "여러 순간이 모여 나무가 되는 과정", tags: ["growth", "timeline", "branch"], code: "GRW-05" },
  { id: "r06", title: "계절의 문턱", category: "season", energy: "medium", desc: "한 시즌을 마무리하고 다음을 준비", tags: ["season", "archive", "transition"], code: "SEA-06" },
  { id: "r07", title: "함께 본 순간", category: "shared", energy: "high", desc: "누군가와 함께한 기억을 나무에 심기", tags: ["shared", "video", "tag"], code: "SHR-07" },
  { id: "r08", title: "조용한 새벽", category: "rest", energy: "low", desc: "쉬어가는 시간에 남기는 작은 기록", tags: ["rest", "note", "calm"], code: "RST-08" },
  { id: "r09", title: "폭발적 순간", category: "peak", energy: "high", desc: "가장 강렬했던 순간을 트리의 정점으로", tags: ["peak", "video", "highlight"], code: "PEK-09" },
  { id: "r10", title: "이어지는 멜로디", category: "music", energy: "medium", desc: "음악이 기억을 이어주는 레시피", tags: ["music", "connection", "mood"], code: "MUS-10" },
  { id: "r11", title: "기억의 파편", category: "fragment", energy: "low", desc: "조각난 기억을 모아 하나의 가지로", tags: ["fragment", "collect", "merge"], code: "FRG-11" },
  { id: "r12", title: "완성된 나무", category: "complete", energy: "high", desc: "모든 순간이 모인 최종 성장 기록", tags: ["complete", "growth", "celebration"], code: "CMP-12" },
];

const CATEGORIES = ["all", "discovery", "connection", "emotion", "revisit", "growth", "season", "shared", "rest", "peak", "music", "fragment", "complete"];
const ENERGIES = ["all", "high", "medium", "low"];

export default function V4SceneRecipeLibrary() {
  const [category, setCategory] = useState("all");
  const [energy, setEnergy] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = RECIPES.filter((r) =>
    (category === "all" || r.category === category) &&
    (energy === "all" || r.energy === energy) &&
    (!query.trim() || `${r.title} ${r.id} ${r.desc}`.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const selectedRecipe = RECIPES.find((r) => r.id === selected) ?? null;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const applyRecipe = () => {
    if (!selectedRecipe) return;
    try { localStorage.setItem("lovetree-memory-scene-recipe-library-v1", JSON.stringify({ applied: selectedRecipe.id, at: Date.now() })); } catch {}
    showToast(`레시피 적용: ${selectedRecipe.title}`);
    setSheetOpen(false);
  };

  return (
    <main className="srl-app">
      <div className="srl-lab-banner">제품 미확정 실험안 · Lab Preview · 공식 V4 여정에 연결되지 않음</div>
      <div className="srl-brand">
        <span className="srl-mark" aria-hidden="true">✦</span>
        <b>LoveTree</b>
        <small>MEMORYCRAFT</small>
      </div>
      <div className="srl-top-meta">
        <span className="srl-kicker">살아 있는 기억을 위한 장면 레시피 한 벌</span>
      </div>

      <section className="srl-board" aria-label="Memory Scene Recipes">
        <div className="srl-board-head">
          <h2>Memory Scene Recipes</h2>
          <input className="srl-search" type="search" placeholder="레시피 검색..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="srl-filters">
          {CATEGORIES.map((c) => (
            <button key={c} className={`srl-chip${category === c ? " is-active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
          <span className="srl-filter-sep" />
          {ENERGIES.map((e) => (
            <button key={e} className={`srl-chip srl-energy${energy === e ? " is-active" : ""}`} onClick={() => setEnergy(e)}>{e}</button>
          ))}
        </div>
        <div className="srl-grid">
          {filtered.map((r) => (
            <article key={r.id} className={`srl-tile${selected === r.id ? " is-selected" : ""}`} onClick={() => { setSelected(r.id); }}>
              <div className={`srl-tile-preview srl-energy-${r.energy}`} />
              <div className="srl-tile-body">
                <small className="srl-tile-code">{r.code}</small>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
                <div className="srl-tile-tags">{r.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </div>
            </article>
          ))}
        </div>
        <div className="srl-board-status">
          <span>{filtered.length} / {RECIPES.length} recipes</span>
          {selectedRecipe && <button className="srl-detail-btn" onClick={() => setSheetOpen(true)}>상세 보기 →</button>}
        </div>
      </section>

      {selectedRecipe && (
        <aside className="srl-detail-panel">
          <small className="srl-kicker">{selectedRecipe.code} · {selectedRecipe.category.toUpperCase()}</small>
          <h3>{selectedRecipe.title}</h3>
          <p>{selectedRecipe.desc}</p>
          <div className="srl-detail-tags">{selectedRecipe.tags.map((t) => <span key={t}>{t}</span>)}</div>
          <div className="srl-detail-actions">
            <button onClick={() => setSheetOpen(true)}>미리보기</button>
            <button className="srl-apply" onClick={applyRecipe}>적용</button>
          </div>
        </aside>
      )}

      {sheetOpen && selectedRecipe && (
        <div className="srl-overlay" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) setSheetOpen(false); }}>
          <div className="srl-sheet" role="dialog" aria-modal="true" aria-label="레시피 상세">
            <button className="srl-sheet-close" onClick={() => setSheetOpen(false)} aria-label="닫기">×</button>
            <small className="srl-kicker">{selectedRecipe.code}</small>
            <h2>{selectedRecipe.title}</h2>
            <p>{selectedRecipe.desc}</p>
            <div className="srl-sheet-specs">
              <div><span>category</span><b>{selectedRecipe.category}</b></div>
              <div><span>energy</span><b>{selectedRecipe.energy}</b></div>
              <div><span>tags</span><b>{selectedRecipe.tags.join(", ")}</b></div>
            </div>
            <div className="srl-sheet-actions">
              <button onClick={() => { navigator.clipboard?.writeText(selectedRecipe.title); showToast("이름 복사됨"); }}>이름 복사</button>
              <button onClick={() => setSheetOpen(false)}>미리보기</button>
              <button className="srl-apply" onClick={applyRecipe}>적용</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="srl-toast">{toast}</div>}
    </main>
  );
}
