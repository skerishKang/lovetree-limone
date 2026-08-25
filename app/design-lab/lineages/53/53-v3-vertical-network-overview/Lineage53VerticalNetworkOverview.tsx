"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  SOURCE56_CONNECTIONS,
  SOURCE56_MOMENTS,
  deriveSource56PathFamilies,
  incomingSource56Connection,
  type Source56Moment,
  type Source56PathFamily,
} from "@/lib/lineage-53-source56";
import {
  canAutoAdvance,
  createTransportAuthorityState,
  reduceTransportAuthority,
} from "@/lib/design-runtime/transport";
import {
  normalizeSelectionIndex,
  selectedItem,
  stepSelectionIndex,
} from "@/lib/design-runtime/selection";

const FIRST_INDEX = SOURCE56_MOMENTS.findIndex((moment) => moment.first);
type Point = { x: number; y: number };
type Node = Point & { moment: Source56Moment; familyIndex: number | null; hierarchy: "origin" | "primary" | "secondary" };
type Edge = { id: string; from: Point; to: Point; familyIndex: number | null; origin: boolean; primary: boolean };

function momentIndex(id: string) {
  return SOURCE56_MOMENTS.findIndex((moment) => moment.id === id);
}

function makeLayout(families: readonly Source56PathFamily[]) {
  const map = new Map<string, Node>();
  const first = SOURCE56_MOMENTS[FIRST_INDEX];
  map.set(first.id, { moment: first, x: 50, y: 6.8, familyIndex: null, hierarchy: "origin" });
  families.forEach((family, familyIndex) => {
    const y0 = 18 + familyIndex * 13.2;
    const left = familyIndex % 2 === 0;
    family.primaryMomentIds.forEach((id, i) => {
      const moment = SOURCE56_MOMENTS[momentIndex(id)];
      if (!moment) return;
      map.set(id, {
        moment,
        familyIndex,
        hierarchy: "primary",
        x: (left ? 39 : 61) + (left ? -1 : 1) * Math.min(i, 2) * 5,
        y: y0 + i * 2.45,
      });
    });
    family.secondaryMomentIds.forEach((id, i) => {
      const moment = SOURCE56_MOMENTS[momentIndex(id)];
      if (!moment) return;
      map.set(id, {
        moment,
        familyIndex,
        hierarchy: "secondary",
        x: left ? 70 + i * 3 : 30 - i * 3,
        y: y0 + 5.1 + i * 2.2,
      });
    });
  });
  const familyByMoment = new Map<string, number>();
  families.forEach((family, index) => family.momentIds.forEach((id) => familyByMoment.set(id, index)));
  const edges: Edge[] = SOURCE56_CONNECTIONS.flatMap((connection) => {
    const from = map.get(connection.fromMomentId);
    const to = map.get(connection.toMomentId);
    if (!from || !to) return [];
    const familyIndex = familyByMoment.get(connection.toMomentId) ?? familyByMoment.get(connection.fromMomentId) ?? null;
    return [{
      id: connection.id,
      from,
      to,
      familyIndex,
      origin: connection.fromMomentId === first.id,
      primary: to.hierarchy === "primary",
    }];
  });
  return { nodes: [...map.values()], edges };
}

function pathFor(edge: Edge) {
  const dy = Math.max(4, edge.to.y - edge.from.y);
  return `M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${edge.from.y + dy * 0.44}, ${edge.to.x} ${edge.to.y - dy * 0.38}, ${edge.to.x} ${edge.to.y}`;
}

export default function Lineage53VerticalNetworkOverview() {
  const families = useMemo(() => deriveSource56PathFamilies(), []);
  const layout = useMemo(() => makeLayout(families), [families]);
  const [selectedIndex, setSelectedIndex] = useState(FIRST_INDEX);
  const [activeFamilyIndex, setActiveFamilyIndex] = useState<number | null>(null);
  const [originReveal, setOriginReveal] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [transport, dispatchTransport] = useReducer(
    reduceTransportAuthority,
    undefined,
    () => createTransportAuthorityState({ initialPlaying: false }),
  );
  const routeStep = useRef(0);

  const selected = selectedItem(SOURCE56_MOMENTS, selectedIndex, "clamp") ?? SOURCE56_MOMENTS[FIRST_INDEX];
  const selectedFamilyIndex = families.findIndex((family) => family.momentIds.includes(selected.id));
  const activeFamily = activeFamilyIndex === null ? null : families[activeFamilyIndex];
  const incoming = incomingSource56Connection(selected.id);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!canAutoAdvance(transport) || !activeFamily || reducedMotion) return;
    const ids = activeFamily.primaryMomentIds;
    if (ids.length === 0) return;
    const timer = window.setInterval(() => {
      routeStep.current = (routeStep.current + 1) % ids.length;
      const index = momentIndex(ids[routeStep.current]);
      if (index >= 0) setSelectedIndex(index);
    }, 760);
    return () => window.clearInterval(timer);
  }, [transport, activeFamily, reducedMotion]);

  const selectMoment = (id: string, familyIndex: number | null) => {
    const index = momentIndex(id);
    if (index < 0) return;
    setSelectedIndex(index);
    setActiveFamilyIndex(familyIndex);
    setOriginReveal(id === SOURCE56_MOMENTS[FIRST_INDEX].id);
    routeStep.current = 0;
    dispatchTransport({ type: "pause" });
  };

  const focusFamily = (index: number) => {
    const family = families[index];
    if (!family) return;
    setActiveFamilyIndex(index);
    setOriginReveal(false);
    routeStep.current = 0;
    const seed = momentIndex(family.seedMomentId);
    if (seed >= 0) setSelectedIndex(seed);
    dispatchTransport({ type: "pause" });
  };

  const revealOrigin = () => {
    setSelectedIndex(FIRST_INDEX);
    setActiveFamilyIndex(null);
    setOriginReveal(true);
    dispatchTransport({ type: "pause" });
  };

  const toggleReplay = () => {
    const familyIndex = activeFamilyIndex ?? (selectedFamilyIndex >= 0 ? selectedFamilyIndex : 0);
    const family = families[familyIndex];
    if (!family) return;
    if (activeFamilyIndex === null) focusFamily(familyIndex);
    if (reducedMotion) {
      const current = Math.max(0, family.primaryMomentIds.indexOf(selected.id));
      const nextRouteIndex = stepSelectionIndex(current, 1, family.primaryMomentIds.length, "wrap");
      const next = momentIndex(family.primaryMomentIds[nextRouteIndex]);
      if (next >= 0) setSelectedIndex(next);
      dispatchTransport({ type: "pause" });
      return;
    }
    dispatchTransport({ type: transport.playing ? "pause" : "play" });
  };

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let next = selectedIndex;
    if (event.key === "ArrowDown") next = stepSelectionIndex(selectedIndex, 1, SOURCE56_MOMENTS.length, "wrap");
    if (event.key === "ArrowUp") next = stepSelectionIndex(selectedIndex, -1, SOURCE56_MOMENTS.length, "wrap");
    if (event.key === "Home") next = normalizeSelectionIndex(0, SOURCE56_MOMENTS.length, "clamp");
    if (event.key === "End") next = normalizeSelectionIndex(SOURCE56_MOMENTS.length - 1, SOURCE56_MOMENTS.length, "clamp");
    const moment = SOURCE56_MOMENTS[next];
    const familyIndex = families.findIndex((family) => family.momentIds.includes(moment.id));
    setSelectedIndex(next);
    setActiveFamilyIndex(familyIndex >= 0 ? familyIndex : null);
    setOriginReveal(moment.first === true);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-list-moment-id="${moment.id}"]`)?.focus());
  };

  return (
    <section className="s56" data-reduced-motion={reducedMotion ? "true" : "false"}>
      <style>{STYLE}</style>
      <div className="s56-toolbar" aria-label="Path family controls">
        <button type="button" onClick={revealOrigin} aria-pressed={originReveal} className={originReveal ? "is-active" : ""}>First Moment · 01/02/03 reveal</button>
        {families.map((family, index) => (
          <button key={family.id} type="button" onClick={() => focusFamily(index)} aria-pressed={activeFamilyIndex === index} className={activeFamilyIndex === index ? "is-active" : ""} style={{ "--c": family.color } as CSSProperties}>{family.label}</button>
        ))}
        <button type="button" className="s56-play" onClick={toggleReplay} aria-pressed={transport.playing}>{transport.playing ? "경로 재생 멈춤" : reducedMotion ? "선택 경로 한 단계 이동" : "선택 경로 재생"}</button>
      </div>

      <div className="s56-workspace">
        <div className="s56-network" aria-label="Source56 vertical Moment network overview">
          <div className="s56-hero"><small>VERTICAL MOMENT NETWORK · LINEAGE53 EXTENSION</small><strong>처음의 마음에서,<br />어떤 길들이 자라났는지 봅니다.</strong></div>
          <svg className="s56-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {layout.edges.map((edge) => {
              const family = edge.familyIndex === null ? null : families[edge.familyIndex];
              const muted = activeFamilyIndex !== null && edge.familyIndex !== activeFamilyIndex;
              const origin = originReveal && edge.origin && (edge.familyIndex ?? 99) < 3;
              const active = activeFamilyIndex !== null && edge.familyIndex === activeFamilyIndex;
              return <path key={edge.id} d={pathFor(edge)} vectorEffect="non-scaling-stroke" className={`${edge.primary ? "primary" : "secondary"}${muted ? " muted" : ""}${origin ? " origin-reveal" : ""}${active ? " active" : ""}`} style={{ "--c": family?.color ?? "#8f8796" } as CSSProperties} />;
            })}
          </svg>
          {layout.nodes.map((node) => {
            const family = node.familyIndex === null ? null : families[node.familyIndex];
            const isSelected = selected.id === node.moment.id;
            const muted = activeFamilyIndex !== null && node.familyIndex !== null && node.familyIndex !== activeFamilyIndex;
            return (
              <button
                key={node.moment.id}
                type="button"
                data-network-moment-id={node.moment.id}
                className={`s56-node ${node.hierarchy}${isSelected ? " selected" : ""}${muted ? " muted" : ""}`}
                style={{ left: `${node.x}%`, top: `${node.y}%`, "--c": family?.color ?? "#e45d8d" } as CSSProperties}
                aria-pressed={isSelected}
                aria-label={node.moment.title}
                onClick={() => selectMoment(node.moment.id, node.familyIndex)}
              ><i aria-hidden="true" /><span>{node.moment.first ? "FIRST" : node.hierarchy === "secondary" ? "SECONDARY" : "PRIMARY"}</span></button>
            );
          })}
          <p className="s56-status" aria-live="polite">{originReveal ? "First Moment에서 01·02·03 주요 경로가 함께 펼쳐진 상태입니다." : activeFamily ? `${activeFamily.label} 전체 경로를 집중해서 보고 있습니다.` : "전체 경로를 조망하고 있습니다."}</p>
        </div>

        <aside className="s56-inspector" aria-label="Selected Moment inspector">
          <small>{selected.first ? "FIRST MOMENT" : selectedFamilyIndex >= 0 ? families[selectedFamilyIndex].label : "MOMENT"}</small>
          <h2>{selected.title}</h2>
          <div className="s56-chips"><span>{selected.date}</span><span>{selected.emotion}</span><span>{selected.sourceType.toUpperCase()}</span></div>
          <article><small>내 메모</small><p>{selected.note}</p></article>
          <article><small>WHY NEXT · Connection</small><p>{incoming?.whyNext ?? "First Moment에서 여러 Connection 경로가 시작됩니다."}</p></article>
          <article><small>PATH STATE</small><p>{selected.first ? "ORIGIN · major route-family reveal" : selectedFamilyIndex >= 0 ? `${families[selectedFamilyIndex].label} · ${activeFamilyIndex === selectedFamilyIndex ? "FOCUSED" : "OVERVIEW"}` : "OVERVIEW"}</p></article>
          <button type="button" className="s56-list-toggle" onClick={() => setListOpen((open) => !open)} aria-expanded={listOpen}>{listOpen ? "Moment 목록 닫기" : "키보드용 Moment 목록 열기"}</button>
        </aside>
      </div>

      <div className={`s56-list${listOpen ? " open" : ""}`} role="listbox" aria-label="Moment semantic selection list" aria-activedescendant={`s56-list-${selected.id}`} onKeyDown={onListKeyDown}>
        {SOURCE56_MOMENTS.map((moment, index) => {
          const familyIndex = families.findIndex((family) => family.momentIds.includes(moment.id));
          return <button key={moment.id} id={`s56-list-${moment.id}`} data-list-moment-id={moment.id} type="button" role="option" aria-selected={index === selectedIndex} tabIndex={index === selectedIndex ? 0 : -1} onClick={() => selectMoment(moment.id, familyIndex >= 0 ? familyIndex : null)}><span>{moment.first ? "FIRST" : familyIndex >= 0 ? String(familyIndex + 1).padStart(2, "0") : "–"}</span><strong>{moment.title}</strong><small>{moment.emotion}</small></button>;
        })}
      </div>
    </section>
  );
}

const STYLE = `
.s56{max-width:1480px;margin:auto;color:#292630}.s56 button{font:inherit;color:inherit;cursor:pointer}.s56-toolbar{display:flex;gap:7px;overflow-x:auto;padding:9px;border:1px solid #e4dfe5;border-radius:18px;background:#ffffffc9;box-shadow:0 12px 32px #3d32460f;scrollbar-width:none}.s56-toolbar button{flex:0 0 auto;min-height:40px;padding:0 13px;border:1px solid #e2dde4;border-radius:999px;background:#fff;font-size:10px;color:#665f6a}.s56-toolbar button:hover,.s56-toolbar button:focus-visible{outline:3px solid #8b69e833;outline-offset:2px;border-color:var(--c,#8b69e8)}.s56-toolbar .is-active{border-color:var(--c,#e45d8d);box-shadow:inset 0 0 0 1px var(--c,#e45d8d);font-weight:700}.s56-toolbar .s56-play{margin-left:auto;background:#302c35;color:#fff;border-color:#302c35}.s56-workspace{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:12px;margin-top:12px;align-items:start}.s56-network{position:relative;min-height:1020px;overflow:hidden;border:1px solid #e5e0e6;border-radius:26px;background:linear-gradient(180deg,#fffdfbe8,#f7f4f7df);box-shadow:0 28px 70px #3d314311;isolation:isolate}.s56-network:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.9%,#453d4b12 50%,transparent 50.1%);pointer-events:none}.s56-hero{position:absolute;z-index:4;left:50%;top:24px;width:min(620px,76%);transform:translateX(-50%);text-align:center;pointer-events:none}.s56-hero small{font-size:8px;letter-spacing:.2em;color:#928b96}.s56-hero strong{display:block;margin-top:8px;font:500 clamp(22px,2.5vw,36px)/1.06 Georgia,serif;letter-spacing:-.045em}.s56-lines{position:absolute;inset:0;width:100%;height:100%;z-index:1}.s56-lines path{fill:none;stroke:var(--c);stroke-width:1.15;opacity:.34;transition:opacity .32s,stroke-width .32s}.s56-lines .secondary{stroke-dasharray:2.5 2.8;opacity:.2}.s56-lines .active{opacity:.85;stroke-width:1.9}.s56-lines .muted{opacity:.055}.s56-lines .origin-reveal{opacity:1;stroke-width:2.2;stroke-dasharray:4 2;animation:s56pulse 1.7s ease-in-out infinite alternate}.s56-node{position:absolute;z-index:3;width:34px;height:34px;transform:translate(-50%,-50%);border:0;border-radius:50%;background:transparent;padding:0;transition:opacity .3s,transform .3s}.s56-node:focus-visible{outline:3px solid #302c3566;outline-offset:5px}.s56-node i{position:absolute;inset:7px;border-radius:50%;background:var(--c);box-shadow:0 0 0 5px #ffffffaa,0 7px 20px #5a43502b}.s56-node.secondary i{inset:10px;opacity:.72}.s56-node.origin{width:50px;height:50px}.s56-node.origin i{inset:8px;background:linear-gradient(135deg,#e45d8d,#8b69e8);box-shadow:0 0 0 7px #e45d8d17,0 10px 25px #7b4b8a30}.s56-node span{position:absolute;left:50%;top:calc(100% + 2px);transform:translateX(-50%);font-size:7px;letter-spacing:.1em;color:#8c8590;white-space:nowrap}.s56-node.selected{transform:translate(-50%,-50%) scale(1.42)}.s56-node.selected span{color:#302c35;font-weight:800}.s56-node.muted{opacity:.14}.s56-status{position:absolute;z-index:5;left:50%;bottom:16px;transform:translateX(-50%);max-width:calc(100% - 30px);margin:0;padding:9px 14px;border-radius:999px;background:#302c35e8;color:#fff;font-size:9px;text-align:center}.s56-inspector{position:sticky;top:14px;padding:19px;border:1px solid #e3dde5;border-radius:24px;background:#fffffff0;box-shadow:0 24px 60px #3b2e441a}.s56-inspector>small{font-size:9px;letter-spacing:.15em;color:#9a6381}.s56-inspector h2{margin:8px 0 12px;font:500 27px/1.1 Georgia,serif;letter-spacing:-.035em}.s56-chips{display:flex;gap:6px;flex-wrap:wrap}.s56-chips span{padding:6px 8px;border:1px solid #e6e0e7;border-radius:999px;font-size:9px;color:#6b6570}.s56-inspector article{margin-top:10px;padding:12px;border:1px solid #e8e3e8;border-radius:15px;background:#faf8fa}.s56-inspector article small{font-size:8px;letter-spacing:.12em;color:#928b96}.s56-inspector article p{margin:6px 0 0;font-size:11px;line-height:1.62;color:#5f5964}.s56-list-toggle{width:100%;min-height:44px;margin-top:12px;border:1px solid #e2dce3;border-radius:13px;background:#fff;font-size:10px}.s56-list-toggle:focus-visible{outline:3px solid #8b69e833;outline-offset:2px}.s56-list{max-height:0;overflow:hidden;opacity:0;margin-top:8px;border-radius:18px;background:#ffffffdf;transition:max-height .3s,opacity .3s}.s56-list.open{max-height:520px;overflow:auto;opacity:1;padding:8px;border:1px solid #e4dfe5}.s56-list button{width:100%;display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:44px;padding:7px 9px;border:0;border-bottom:1px solid #eee9ee;background:transparent;text-align:left}.s56-list button[aria-selected="true"]{background:#8b69e813;border-radius:10px}.s56-list button:focus-visible{outline:3px solid #8b69e83b;outline-offset:-2px}.s56-list span,.s56-list small{font-size:8px;color:#8c8590}.s56-list strong{font-size:10px}@keyframes s56pulse{from{stroke-dashoffset:0}to{stroke-dashoffset:-12}}@media(max-width:980px){.s56-workspace{grid-template-columns:1fr}.s56-inspector{position:relative;top:auto}.s56-network{min-height:960px}}@media(max-width:640px){.s56-toolbar{padding:6px;border-radius:14px}.s56-toolbar button{min-height:44px;padding:0 11px;font-size:9px}.s56-toolbar .s56-play{margin-left:0}.s56-network{min-height:1040px;border-radius:20px}.s56-hero{top:18px;width:90%}.s56-hero strong{font-size:22px}.s56-node{width:40px;height:40px}.s56-node i{inset:9px}.s56-node.secondary i{inset:12px}.s56-node.origin{width:52px;height:52px}.s56-status{bottom:10px;border-radius:14px}.s56-inspector{padding:15px;border-radius:20px}.s56-inspector h2{font-size:23px}.s56-list.open{max-height:440px}}@media(prefers-reduced-motion:reduce){.s56 *{scroll-behavior:auto!important}.s56-toolbar button,.s56-lines path,.s56-node,.s56-list{transition:none!important}.s56-lines .origin-reveal{animation:none!important;stroke-dasharray:none}.s56-node.selected{transform:translate(-50%,-50%) scale(1.22)}}`;
