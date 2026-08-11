"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CRYSTAL_ANGLE_ORDER,
  CRYSTAL_ANGLE_STEP_PX,
  CRYSTAL_ASSET_ROOT,
  CRYSTAL_DRAG_START_PX,
  CRYSTAL_EXPRESSION_AUTOPLAY,
  CRYSTAL_EXPRESSION_INTERVAL_MS,
  CRYSTAL_EXPRESSION_ORDER,
  type CrystalAngleId,
  type CrystalExpressionId,
  type CrystalMaterialId,
} from "@/lib/lineage-56-crystal-memory-source";

const ANGLE_LABELS: Record<CrystalAngleId, string> = {
  front: "FRONT",
  threequarter: "THREE QUARTER",
  profile: "PROFILE",
  rear: "REAR",
};
const ANGLE_FILES: Record<CrystalAngleId, string> = {
  front: "crystal-front.png",
  threequarter: "crystal-threequarter.png",
  profile: "crystal-profile.png",
  rear: "crystal-rear.png",
};
const EXPRESSION_LABELS: Record<CrystalExpressionId, string> = {
  sleeping: "SLEEPING",
  "eyes-open": "EYES OPEN",
  watching: "WATCHING YOU",
  smiling: "SMILING",
};
const EXPRESSION_BUTTONS: Record<CrystalExpressionId, string> = {
  sleeping: "CLOSE EYES",
  "eyes-open": "OPEN EYES",
  watching: "LOOK AT ME",
  smiling: "SMILE",
};
const EXPRESSION_FILES: Record<CrystalExpressionId, string> = {
  sleeping: "crystal-awake-01.png",
  "eyes-open": "crystal-awake-02.png",
  watching: "crystal-awake-03.png",
  smiling: "crystal-awake-04.png",
};
const MATERIALS: readonly CrystalMaterialId[] = ["rose", "ice", "obsidian", "aurora"];

export default function CrystalMemoryAtelierV3() {
  const [angle, setAngle] = useState<CrystalAngleId>("front");
  const [expression, setExpression] = useState<CrystalExpressionId>("sleeping");
  const [visualMode, setVisualMode] = useState<"angle" | "expression">("expression");
  const [material, setMaterial] = useState<CrystalMaterialId>("rose");
  const [light, setLight] = useState(100);
  const [engravingInput, setEngravingInput] = useState("Every moment becomes eternal.");
  const [engraving, setEngraving] = useState("EVERY MOMENT BECOMES ETERNAL");
  const [etching, setEtching] = useState(false);
  const [bloomToken, setBloomToken] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tilt, setTilt] = useState(0);
  const pointerRef = useRef<{ id: number; startX: number; lastStepX: number; dragged: boolean } | null>(null);
  const autoplayIndex = useRef(0);
  const drawerButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const autoplayRunning = autoplay && !reducedMotion;

  useEffect(() => {
    if (!autoplayRunning) return;
    autoplayIndex.current = 0;
    const apply = () => {
      const next = CRYSTAL_EXPRESSION_AUTOPLAY[autoplayIndex.current % CRYSTAL_EXPRESSION_AUTOPLAY.length];
      setExpression(CRYSTAL_EXPRESSION_ORDER[next]);
      setVisualMode("expression");
      autoplayIndex.current += 1;
    };
    apply();
    const timer = window.setInterval(apply, CRYSTAL_EXPRESSION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoplayRunning]);

  useLayoutEffect(() => {
    if (!drawerOpen) return;
    drawerRef.current?.querySelector<HTMLButtonElement>(".lt56__drawer-close")?.focus();
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        requestAnimationFrame(() => drawerButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),a[href],[tabindex]:not([tabindex='-1'])") ?? [])
        .filter((element) => element.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const imageFile = visualMode === "expression" ? EXPRESSION_FILES[expression] : ANGLE_FILES[angle];
  const stateLabel = visualMode === "expression" ? EXPRESSION_LABELS[expression] : `${ANGLE_LABELS[angle]} VIEW`;
  const style = useMemo(() => ({ "--lt56-light": light / 100, "--lt56-tilt": `${tilt}deg` } as CSSProperties), [light, tilt]);

  function manualExpression(id: CrystalExpressionId) {
    setAutoplay(false);
    setExpression(id);
    setVisualMode("expression");
  }

  function cycleExpression() {
    setAutoplay(false);
    const current = CRYSTAL_EXPRESSION_ORDER.indexOf(expression);
    setExpression(CRYSTAL_EXPRESSION_ORDER[(current + 1) % CRYSTAL_EXPRESSION_ORDER.length]);
    setVisualMode("expression");
  }

  function rotateAngle(direction: 1 | -1) {
    setAutoplay(false);
    setVisualMode("angle");
    setAngle((current) => {
      const index = CRYSTAL_ANGLE_ORDER.indexOf(current);
      return CRYSTAL_ANGLE_ORDER[(index + direction + CRYSTAL_ANGLE_ORDER.length) % CRYSTAL_ANGLE_ORDER.length];
    });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointerRef.current = { id: event.pointerId, startX: event.clientX, lastStepX: event.clientX, dragged: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const total = event.clientX - pointer.startX;
    if (Math.abs(total) >= CRYSTAL_DRAG_START_PX) pointer.dragged = true;
    if (pointer.dragged) {
      const stepDelta = event.clientX - pointer.lastStepX;
      if (Math.abs(stepDelta) >= CRYSTAL_ANGLE_STEP_PX) {
        rotateAngle(stepDelta < 0 ? 1 : -1);
        pointer.lastStepX = event.clientX;
      }
      if (!reducedMotion) setTilt(Math.max(-12, Math.min(12, total / 7)));
    }
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const wasDrag = pointer.dragged;
    pointerRef.current = null;
    setTilt(0);
    if (!cancelled && !wasDrag) cycleExpression();
  }

  function engrave() {
    setAutoplay(false);
    setEngraving((engravingInput.trim() || "Every moment becomes eternal.").toUpperCase());
    setEtching(true);
    window.setTimeout(() => setEtching(false), reducedMotion ? 80 : 1800);
  }

  function bloom() {
    setAutoplay(false);
    setBloomToken((value) => value + 1);
  }

  function openDrawer() {
    setDrawerOpen(true);
  }

  return (
    <section className={`lt56 ${material === "rose" ? "" : `lt56--${material}`} ${reducedMotion ? "lt56--reduced" : ""}`} style={style} data-visual-mode={visualMode}>
      <div className="lt56__world" aria-hidden="true" />
      <div className="lt56__grid">
        <aside className="lt56__panel lt56__left">
          <span className="lt56__eyebrow">PRESERVE A MOMENT AS LIGHT</span>
          <h2>Your memory,<br /><em>comes alive.</em></h2>
          <p className="lt56__desc">100개의 순간을 모은 팬에게 열리는 프리미엄 기억 조각입니다. 눈을 뜨고 반응하는 조각에 나만의 문장을 실제 빛 각인으로 남깁니다.</p>
          <span className="lt56__label">VIEW THE RELIC</span>
          <div className="lt56__angles" aria-label="Crystal view angles">
            {CRYSTAL_ANGLE_ORDER.map((id, index) => (
              <button key={id} className={visualMode === "angle" && angle === id ? "is-on" : ""} onClick={() => { setAutoplay(false); setAngle(id); setVisualMode("angle"); }}>
                <span>0{index + 1}</span><b>{ANGLE_LABELS[id]}</b>
              </button>
            ))}
          </div>
          <div className="lt56__milestone">
            <div className="lt56__progress-head"><span>MY MOMENTS</span><b>148 / 200</b></div>
            <div className="lt56__progress"><i /></div>
            <div className="lt56__unlock">
              <div><b>100</b><span>ATELIER<br />OPEN</span></div>
              <div><b>200</b><span>EMOTION<br />AWAKE</span></div>
              <div><b>365</b><span>ANNUAL<br />RELIC</span></div>
            </div>
            <p className="lt56__demo-note">SOURCE DEMO VALUES · NON-CANONICAL PRODUCT POLICY</p>
          </div>
        </aside>

        <div className="lt56__panel lt56__stage" aria-label="Interactive Crystal Memory Relic">
          <div className="lt56__rings" aria-hidden="true" />
          <div className="lt56__status">RELIC STATE · <b>{stateLabel}</b></div>
          <div className="lt56__stage-actions">
            <button className="is-primary" onClick={() => setAutoplay((value) => !value)} aria-pressed={autoplayRunning} disabled={reducedMotion}>
              {autoplayRunning ? "PAUSE EXPRESSIONS" : "PLAY EXPRESSIONS"}
            </button>
            <button onClick={() => manualExpression("sleeping")}>CLOSE EYES</button>
          </div>
          <div
            className="lt56__sculpture-wrap"
            data-drag-threshold={CRYSTAL_DRAG_START_PX}
            data-angle-step={CRYSTAL_ANGLE_STEP_PX}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(event) => finishPointer(event)}
            onPointerCancel={(event) => finishPointer(event, true)}
          >
            {/* Source limitation: expression frames are frontal; angle drag switches to one of four neutral angle frames. */}
            <img className="lt56__sculpture" src={`${CRYSTAL_ASSET_ROOT}/${imageFile}`} alt={`Crystal Memory Relic · ${stateLabel}`} draggable={false} />
          </div>
          <div className="lt56__heart" aria-hidden="true" data-awake={expression !== "sleeping" && visualMode === "expression" ? "true" : "false"} />
          <div className={`lt56__etched ${etching ? "is-etching" : ""}`}>{engraving}</div>
          <div className={`lt56__etch-scan ${etching ? "is-active" : ""}`} aria-hidden="true" />
          <div className="lt56__expressions" aria-label="Crystal expressions">
            {CRYSTAL_EXPRESSION_ORDER.map((id) => (
              <button key={id} className={visualMode === "expression" && expression === id ? "is-on" : ""} onClick={() => manualExpression(id)}>{EXPRESSION_BUTTONS[id]}</button>
            ))}
          </div>
          <div className="lt56__pedestal"><strong>FIRST LIGHT</strong><span>UNLOCKED AT 100 SAVED MOMENTS · SOURCE DEMO</span></div>
          <div className="lt56__drag-tip">CLICK THE RELIC · CHANGE EXPRESSION &nbsp; / &nbsp; DRAG LEFT–RIGHT · ROTATE</div>
          <div className="lt56__particles" key={bloomToken} aria-hidden="true">
            {bloomToken > 0 ? Array.from({ length: reducedMotion ? 6 : 36 }, (_, index) => <i key={`${bloomToken}-${index}`} style={{ "--i": index } as CSSProperties}>✦</i>) : null}
          </div>
        </div>

        <aside ref={drawerRef} className={`lt56__panel lt56__right ${drawerOpen ? "is-open" : ""}`} aria-label="Material and Service" aria-hidden={!drawerOpen ? undefined : false}>
          <button className="lt56__drawer-close" onClick={() => { setDrawerOpen(false); requestAnimationFrame(() => drawerButtonRef.current?.focus()); }}>CLOSE</button>
          <span className="lt56__eyebrow">MATERIAL LAB</span>
          <h3>Change the way<br />memory catches light.</h3>
          <p className="lt56__desc">같은 조각도 재질과 굴절에 따라 완전히 다른 기억으로 보입니다.</p>
          <div className="lt56__materials">
            {MATERIALS.map((id) => <button key={id} className={material === id ? "is-on" : ""} onClick={() => { setAutoplay(false); setMaterial(id); }}>{id.toUpperCase()}</button>)}
          </div>
          <div className="lt56__control"><label><span>REFRACTION LIGHT</span><b>{light}</b></label><input aria-label="Refraction light" type="range" min="65" max="140" value={light} onChange={(event) => { setAutoplay(false); setLight(Number(event.target.value)); }} /></div>
          <div className="lt56__inscribe"><label htmlFor="lt56-inscription">MEMORY INSCRIPTION</label><input id="lt56-inscription" value={engravingInput} onChange={(event) => setEngravingInput(event.target.value)} /><button className="lt56__action" onClick={engrave}>ENGRAVE ON CRYSTAL</button><button className="lt56__action lt56__action--ghost" onClick={bloom}>CRYSTAL BLOOM</button></div>
          <div className="lt56__service"><b>Premium Memory Relic</b><p>저장한 순간이 쌓일수록 열리는 소장형 기념 경험입니다.</p><ul><li>100 Moments · digital Atelier access</li><li>200 Moments · source-demo emotion awakening</li><li>365 Moments · source-demo annual relic</li></ul><small>DESIGN SOURCE HYPOTHESIS · NOT BACKEND ENTITLEMENT</small></div>
        </aside>
      </div>
      <button ref={drawerButtonRef} className="lt56__drawer-open" onClick={openDrawer} aria-expanded={drawerOpen}>MATERIAL &amp; SERVICE</button>
      {drawerOpen ? <button className="lt56__drawer-backdrop" aria-label="Close Material and Service" onClick={() => { setDrawerOpen(false); requestAnimationFrame(() => drawerButtonRef.current?.focus()); }} /> : null}
    </section>
  );
}
