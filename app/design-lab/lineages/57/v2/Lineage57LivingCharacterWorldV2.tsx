"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CHARACTER_LINES,
  LINEAGE_57_AUTO_LIFE_POOL,
  LINEAGE_57_SING_SEQUENCE,
  clampLubtPosition,
  primaryReaction,
  reactionFor,
  sayReaction,
  specialReaction,
  type CharacterReactionState,
  type LubtPose,
} from "@/lib/lineage-57-character-controller";
import {
  LINEAGE_57_CHARACTERS,
  LINEAGE_57_EXPRESSIONS,
  LINEAGE_57_SOURCE_BOUNDARIES,
  LINEAGE_57_TIMING,
  lineage57CharacterAssetPath,
  lineage57LubtAssetPath,
  type Lineage57Expression,
} from "@/lib/lineage-57-living-character-source";

const REST: CharacterReactionState = {
  expression: "neutral",
  speech: "",
  special: false,
  lubtPose: "idle",
  lubtMessage: "나는 럽트. 순간과 감정 사이를 함께 다녀.",
};
const DEFAULT_LUBT = { left: 300, top: 95 };
const FX_SYMBOLS: Record<Lineage57Expression, string> = {
  neutral: "·", smile: "♥", laugh: "✦", wink: "✧", shy: "♥", surprise: "◉",
  angry: "◆", sing: "♪", talk: "•", cry: "◇", touched: "♥", sleepy: "Z",
};

export default function Lineage57LivingCharacterWorldV2({ assetGatePassed }: { assetGatePassed: boolean }) {
  const [characterIndex, setCharacterIndex] = useState(0);
  const [reaction, setReaction] = useState<CharacterReactionState>(REST);
  const [autoLife, setAutoLife] = useState(true);
  const [intensity, setIntensity] = useState(7);
  const [liveliness, setLiveliness] = useState(6);
  const [phrase, setPhrase] = useState("");
  const [mobileEngine, setMobileEngine] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("Living Character World V2 ready");
  const [fx, setFx] = useState<{ symbol: string; key: number } | null>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [lubt, setLubt] = useState({ ...DEFAULT_LUBT, pose: "idle" as LubtPose, dragging: false });

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lubtReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTriggered = useRef(false);
  const lubtDrag = useRef({ offsetX: 0, offsetY: 0, moved: false });

  const character = LINEAGE_57_CHARACTERS[characterIndex];
  const expressionAsset = lineage57CharacterAssetPath(character.id, reaction.expression);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReducedMotion(media.matches);
      if (media.matches) setAutoLife(false);
    };
    queueMicrotask(sync);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!autoLife || reducedMotion || reaction.special || lubt.dragging) return;
    const id = window.setInterval(() => {
      const next = LINEAGE_57_AUTO_LIFE_POOL[Math.floor(Math.random() * LINEAGE_57_AUTO_LIFE_POOL.length)] ?? "neutral";
      setReaction((current) => ({ ...reactionFor(next), speech: current.speech }));
    }, LINEAGE_57_TIMING.autoLifeMs);
    return () => window.clearInterval(id);
  }, [autoLife, reducedMotion, reaction.special, lubt.dragging]);

  useEffect(() => () => {
    for (const timer of [hoverTimer, clickTimer, holdTimer, specialTimer, lubtReturnTimer]) {
      if (timer.current) clearTimeout(timer.current);
    }
    if (modeTimer.current) clearInterval(modeTimer.current);
  }, []);

  const publishReaction = (next: CharacterReactionState, label?: string) => {
    setReaction(next);
    setLubt((current) => ({ ...current, pose: next.lubtPose }));
    setFx({ symbol: FX_SYMBOLS[next.expression], key: Date.now() });
    setAnnouncement(label ?? `${character.name}: ${next.expression}; Lubt: ${next.lubtMessage}`);
  };

  const runPrimaryReaction = () => publishReaction(primaryReaction(reaction.expression), "Primary character reaction activated");

  const runSpecial = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (specialTimer.current) clearTimeout(specialTimer.current);
    publishReaction(specialReaction(), "SECRET MOMENT source interaction activated");
    specialTimer.current = setTimeout(() => {
      setReaction((current) => ({ ...current, special: false }));
      setAnnouncement("Special visual state cleaned up");
    }, reducedMotion ? 260 : LINEAGE_57_TIMING.specialCleanupMs);
  };

  const onFaceClick = () => {
    if (holdTriggered.current) {
      holdTriggered.current = false;
      return;
    }
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(runPrimaryReaction, LINEAGE_57_TIMING.singleClickDelayMs);
  };

  const onFaceDoubleClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    runSpecial();
  };

  const onFacePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    holdTriggered.current = false;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      holdTriggered.current = true;
      runSpecial();
    }, LINEAGE_57_TIMING.longPressMs);
  };

  const clearFaceHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const onFaceEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      if (!reaction.special) publishReaction(reactionFor("smile"), "Hover smile after 280ms");
    }, LINEAGE_57_TIMING.hoverSmileMs);
  };

  const onFaceLeave = () => {
    clearFaceHold();
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!reaction.special) setReaction((current) => ({ ...current, expression: "neutral" }));
  };

  const selectExpression = (expression: Lineage57Expression) => publishReaction(reactionFor(expression), `Expression ${expression}`);

  const startTalk = () => {
    if (modeTimer.current) clearInterval(modeTimer.current);
    let flip = false;
    publishReaction(reactionFor("talk"), "TALK loop started");
    modeTimer.current = setInterval(() => {
      flip = !flip;
      setReaction(reactionFor(flip ? "talk" : "smile"));
    }, LINEAGE_57_TIMING.talkLoopMs);
  };

  const startSing = () => {
    if (modeTimer.current) clearInterval(modeTimer.current);
    let index = 0;
    publishReaction(reactionFor("sing"), "SING loop started");
    modeTimer.current = setInterval(() => {
      index = (index + 1) % LINEAGE_57_SING_SEQUENCE.length;
      setReaction(reactionFor(LINEAGE_57_SING_SEQUENCE[index]));
    }, LINEAGE_57_TIMING.singLoopMs);
  };

  const say = () => {
    if (modeTimer.current) clearInterval(modeTimer.current);
    const next = sayReaction(phrase);
    setReaction({ ...next, lubtMessage: "…" });
    setAnnouncement("Character TALK started from SAY input");
    setTimeout(() => {
      setReaction(next);
      setLubt((current) => ({ ...current, pose: "guide" }));
      setAnnouncement(`Lubt reply: ${next.lubtMessage}`);
    }, reducedMotion ? 80 : LINEAGE_57_TIMING.sayGuideReplyMs);
  };

  const saveDemo = () => {
    setLubt((current) => ({ ...current, pose: "bloom" }));
    setFx({ symbol: "♥", key: Date.now() });
    setAnnouncement("SOURCE DEMO / NON-PERSISTENT — no API or DB write occurred");
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setGaze({ x: ((event.clientX - rect.left) / rect.width - 0.5) * 2, y: ((event.clientY - rect.top) / rect.height - 0.5) * 2 });
  };

  const onLubtPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    lubtDrag.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false };
    if (lubtReturnTimer.current) clearTimeout(lubtReturnTimer.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    setLubt((current) => ({ ...current, dragging: true }));
  };

  const onLubtPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!lubt.dragging) return;
    lubtDrag.current.moved = true;
    const next = clampLubtPosition(event.clientX, event.clientY, lubtDrag.current.offsetX, lubtDrag.current.offsetY, window.innerWidth, window.innerHeight);
    setLubt((current) => ({ ...current, ...next }));
  };

  const finishLubtDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!lubt.dragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const moved = lubtDrag.current.moved;
    setLubt((current) => ({ ...current, dragging: false, pose: moved ? "guide" : "magic" }));
    setReaction((current) => ({ ...current, lubtMessage: moved ? "새로운 자리를 찾았어. 잠시 뒤 다시 비행할게." : "어떤 표정을 만나고 싶어?" }));
    if (moved) {
      lubtReturnTimer.current = setTimeout(() => setLubt({ ...DEFAULT_LUBT, pose: "idle", dragging: false }), reducedMotion ? 120 : LINEAGE_57_TIMING.lubtReturnMs);
    }
  };

  const engine = (
    <div className="lcw-engine-content">
      <p className="lcw-eyebrow">EMOTION ENGINE</p>
      <h2>Reactive state</h2>
      <p className="lcw-copy">12 expression assets × source intensity display. <strong>120 states is not a canonical domain taxonomy.</strong></p>
      <label>INTENSITY <output>{String(intensity).padStart(2, "0")}</output><input aria-label="Intensity" type="range" min="1" max="10" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} /></label>
      <label>LIVELINESS <output>{String(liveliness).padStart(2, "0")}</output><input aria-label="Liveliness" type="range" min="1" max="10" value={liveliness} onChange={(e) => setLiveliness(Number(e.target.value))} /></label>
      <div className="lcw-actions">
        <button onClick={startTalk}>TALK</button><button onClick={startSing}>SING</button>
        <button onClick={() => selectExpression("touched")}>HEART</button><button onClick={() => selectExpression("surprise")}>SURPRISE</button>
        <button onClick={() => setLubt((current) => ({ ...current, pose: "scan" }))}>CALL LUBT</button>
      </div>
      <div className="lcw-say"><input aria-label="Character phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") say(); }} placeholder="Say something…" /><button onClick={say}>SAY</button></div>
      <button className="lcw-save" onClick={saveDemo}>♡ SAVE THIS LIVING MOMENT</button>
      <small>{LINEAGE_57_SOURCE_BOUNDARIES.saveBoundary} · no persistence</small>
    </div>
  );

  return (
    <section className={`lcw-world${reducedMotion ? " reduced-motion" : ""}`} style={{ "--accent": character.accent } as CSSProperties}>
      <header className="lcw-topbar"><strong>LOVETREE</strong><span>LIVING CHARACTER WORLD · V2</span><button aria-pressed={autoLife} onClick={() => setAutoLife((value) => !value)}>AUTO LIFE · {autoLife ? "ON" : "OFF"}</button></header>
      <main className="lcw-grid">
        <aside className="lcw-panel lcw-cast-panel">
          <p className="lcw-eyebrow">PERSON / SUBJECT REPRESENTATION</p><h1>Living<br /><em>Character</em></h1>
          <p className="lcw-copy">Original source cast for this Revision. Not user avatars and not canonical LoveTree cast.</p>
          <div className="lcw-cast" aria-label="Character selector">
            {LINEAGE_57_CHARACTERS.map((item, index) => <button key={item.id} className={index === characterIndex ? "active" : ""} onClick={() => { setCharacterIndex(index); setReaction(REST); }}><span className="lcw-thumb">{assetGatePassed ? <img src={lineage57CharacterAssetPath(item.id, "neutral")} alt="" /> : item.id}</span><span>{item.name}</span></button>)}
          </div>
          <div className="lcw-count">4 ORIGINAL SUBJECTS<br />48 EXPRESSION ASSETS</div>
        </aside>

        <section className={`lcw-panel lcw-stage${reaction.special ? " special" : ""}`} aria-label="Reactive Character stage" onPointerMove={onStagePointerMove} onPointerLeave={() => setGaze({ x: 0, y: 0 })}>
          <div className="lcw-aurora" aria-hidden="true" /><div className="lcw-halo" aria-hidden="true" />
          <div className="lcw-portrait" style={{ transform: `translate(${gaze.x * 8}px, ${gaze.y * 6}px)` }}>
            {assetGatePassed ? <img src={expressionAsset} alt={`${character.name} ${reaction.expression} expression`} /> : <div className="lcw-asset-hold"><b>{character.id}</b><span>{reaction.expression.toUpperCase()}</span><small>EXACT ASSET HOLD</small></div>}
          </div>
          <div className="lcw-nameplate"><b>0{characterIndex + 1}</b><strong>{character.name}</strong><small>{character.type}</small></div>
          <div className="lcw-reaction"><strong>{reaction.expression.toUpperCase()}</strong><span>{reaction.speech || CHARACTER_LINES[reaction.expression][0]}</span></div>
          <button className="lcw-face-target" aria-label="React with character face" onPointerEnter={onFaceEnter} onPointerLeave={onFaceLeave} onPointerDown={onFacePointerDown} onPointerUp={clearFaceHold} onPointerCancel={clearFaceHold} onClick={onFaceClick} onDoubleClick={onFaceDoubleClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runPrimaryReaction(); } }} />
          <div className="lcw-gesture-tip">FACE · CLICK RANDOM / HOLD OR DOUBLE CLICK · SECRET MOMENT</div>
          <button className="lcw-special-access" onClick={runSpecial}>SPECIAL INTERACTION</button>
          {fx && <div key={fx.key} className="lcw-fx" aria-hidden="true">{Array.from({ length: reducedMotion ? 3 : 12 }, (_, index) => <i key={index} style={{ "--i": index } as CSSProperties}>{fx.symbol}</i>)}</div>}
          <div className="lcw-emotions" aria-label="Expression selector">{LINEAGE_57_EXPRESSIONS.map((expression) => <button key={expression} className={reaction.expression === expression ? "on" : ""} onClick={() => selectExpression(expression)}>{expression}</button>)}</div>
          <button className={`lcw-lubt${lubt.dragging ? " dragging" : ""}`} style={{ left: lubt.left, top: lubt.top }} aria-label="Lubt Memory Guide. Drag to move." onPointerDown={onLubtPointerDown} onPointerMove={onLubtPointerMove} onPointerUp={finishLubtDrag} onPointerCancel={finishLubtDrag}>
            {assetGatePassed ? <img src={lineage57LubtAssetPath(lubt.pose)} alt="Lubt Memory Guide" /> : <span className="lcw-lubt-placeholder">LUBT<br />{lubt.pose.toUpperCase()}</span>}
            <span className="lcw-lubt-bubble">{reaction.lubtMessage}</span>
          </button>
        </section>

        <aside className="lcw-panel lcw-engine">{engine}</aside>
      </main>
      <button className="lcw-mobile-engine-button" onClick={() => setMobileEngine(true)}>EMOTION ENGINE</button>
      {mobileEngine && <div className="lcw-mobile-backdrop" onClick={() => setMobileEngine(false)}><section role="dialog" aria-modal="true" aria-label="Mobile Emotion Engine" className="lcw-mobile-engine" onClick={(e) => e.stopPropagation()}><button className="lcw-close" onClick={() => setMobileEngine(false)}>CLOSE</button>{engine}</section></div>}
      <div className="lcw-boundaries"><b>SOURCE DELTA — MOBILE FUNCTIONAL PARITY REMEDIATION</b><b>SOURCE DELTA — ACCESSIBILITY HARDENING</b><b>SOURCE DELTA — REDUCED MOTION HARDENING</b></div>
      <p className="lcw-asset-status" data-asset-gate={assetGatePassed ? "PASS" : "HOLD"}>{assetGatePassed ? "LINEAGE_57_EXACT_ASSET_GATE_PASS 54/54" : "EXACT_CHARACTER_ASSET_TRANSFER_HOLD"}</p>
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </section>
  );
}
