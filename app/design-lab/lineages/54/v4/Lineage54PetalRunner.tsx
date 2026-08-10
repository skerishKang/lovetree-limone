"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LINEAGE_54_ASSET_PATHS } from "@/lib/lineage-54-petal-runner-source";

type VehicleFile =
  | "petal-runner-front-v3.png"
  | "petal-runner-side-v3.png"
  | "petal-runner-rear-v3.png"
  | "petal-runner-open-v3.png";

type Chapter = {
  key: string;
  short: string;
  kicker: string;
  hero: string;
  title: string;
  lead: string;
  tag: string;
  card: string;
  text: string;
  view: string;
  image: VehicleFile;
  action: string;
  toast: string;
};

const CHAPTERS: readonly Chapter[] = [
  {
    key: "FIRST MOMENT",
    short: "FIRST",
    kicker: "CHAPTER 01 · FIRST MOMENT",
    hero: "A feeling waits.",
    title: "First Moment",
    lead: "차는 아직 움직이지 않습니다. 저장하고 싶은 첫 감정이 생긴 장면입니다.",
    tag: "MOMENT 001 · DISCOVERED",
    card: "The moment that stopped me.",
    text: "첫 장면을 저장하면 Petal Runner의 시동이 켜지고 러브트리까지 이어질 첫 번째 빛의 좌표가 생깁니다.",
    view: "FRONT · PARKED",
    image: "petal-runner-front-v3.png",
    action: "START THE FEELING",
    toast: "THE FIRST MOMENT IS SAVED",
  },
  {
    key: "FEELING GROWS",
    short: "FEELING",
    kicker: "CHAPTER 02 · FEELING GROWS",
    hero: "The heart begins to move.",
    title: "Feeling Grows",
    lead: "좋아하는 이유가 하나씩 쌓이며 차량이 천천히 출발합니다.",
    tag: "MOMENTS 037 · HEARTBEAT",
    card: "One moment becomes many.",
    text: "무대, 미소, 인터뷰가 같은 감정으로 묶이며 Petal Energy가 차오르고 첫 번째 주행 경로가 보입니다.",
    view: "SIDE · DEPARTING",
    image: "petal-runner-side-v3.png",
    action: "FOLLOW THE CONNECTION",
    toast: "PETAL ENERGY IS GROWING",
  },
  {
    key: "CONNECTION",
    short: "CONNECT",
    kicker: "CHAPTER 03 · CONNECTION",
    hero: "Every memory leaves a path.",
    title: "Connection",
    lead: "저장한 순간들이 빛의 길로 연결되어 러브트리를 향합니다.",
    tag: "ROUTE 012 · CONNECTED",
    card: "The path remembers why.",
    text: "시간순이 아니라 설렘, 위로, 성장 같은 감정의 이유를 따라 다음 기억으로 이동합니다.",
    view: "REAR · TRAVELLING",
    image: "petal-runner-rear-v3.png",
    action: "ARRIVE AT MY LOVETREE",
    toast: "THE CONNECTION OPENS",
  },
  {
    key: "LOVE BLOOMS",
    short: "BLOOM",
    kicker: "CHAPTER 04 · LOVE BLOOMS",
    hero: "The journey finds its tree.",
    title: "Love Blooms",
    lead: "러브트리 앞에 도착한 뒤에만 문이 열리고 모든 순간이 꽃이 됩니다.",
    tag: "TREE 001 · FULL BLOOM",
    card: "Welcome to the love you saved.",
    text: "184개의 순간은 잎이 되고 12개의 연결은 가지가 됩니다. 열린 문은 기록을 다시 감상하는 나만의 입구입니다.",
    view: "DOORS OPEN · ARRIVED",
    image: "petal-runner-open-v3.png",
    action: "REPLAY THE JOURNEY",
    toast: "WELCOME HOME · LOVE BLOOMS",
  },
] as const;

const VEHICLE_FILES: readonly VehicleFile[] = [
  "petal-runner-front-v3.png",
  "petal-runner-side-v3.png",
  "petal-runner-rear-v3.png",
  "petal-runner-open-v3.png",
] as const;

const FREE_VIEW_LABELS = [
  "FRONT · FREE ORBIT",
  "SIDE · FREE ORBIT",
  "REAR · FREE ORBIT",
  "OPEN · FREE ORBIT",
] as const;

const STORY_SUBTITLES = [
  "첫 감정이 멈춘 곳",
  "좋아할수록 출발",
  "기억이 길이 되는 순간",
  "문이 열리고 나무가 피어남",
] as const;

const TRAVEL_MS = 1800;
const SOURCE_RELEASE_PAD_MS = 80;
const VEHICLE_SWAP_TRIGGER_MS = 520;
const VEHICLE_FADE_MS = 170;
const PETAL_LIFETIME_MS = 2400;
const BACKGROUND_FILE = "lovetree-arrival-garden-v3.png" as const;
const EXPECTED_ASSETS = [BACKGROUND_FILE, ...VEHICLE_FILES] as const;

export default function Lineage54PetalRunner() {
  const [current, setCurrent] = useState(0);
  const [vehicleFile, setVehicleFile] = useState<VehicleFile>(VEHICLE_FILES[0]);
  const [freeViewLabel, setFreeViewLabel] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [driving, setDriving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [vehicleFading, setVehicleFading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragTilt, setDragTilt] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [burstToken, setBurstToken] = useState(0);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [loadedAssets, setLoadedAssets] = useState<Set<string>>(() => new Set());
  const [failedAssets, setFailedAssets] = useState<Set<string>>(() => new Set());
  const timersRef = useRef<number[]>([]);
  const bloomTokenRef = useRef(0);
  const freeIndexRef = useRef(0);
  const dragRef = useRef({ active: false, pointerId: -1, startX: 0, lastX: 0 });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => () => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
  }, []);

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  };

  const markAssetLoaded = (file: string) => {
    setLoadedAssets((currentSet) => {
      const next = new Set(currentSet);
      next.add(file);
      return next;
    });
    setFailedAssets((currentSet) => {
      if (!currentSet.has(file)) return currentSet;
      const next = new Set(currentSet);
      next.delete(file);
      return next;
    });
  };

  const markAssetFailed = (file: string) => {
    setFailedAssets((currentSet) => {
      const next = new Set(currentSet);
      next.add(file);
      return next;
    });
  };

  const triggerBloom = () => {
    const token = ++bloomTokenRef.current;
    setBurstToken(token);
    schedule(() => {
      setBurstToken((currentToken) => currentToken === token ? 0 : currentToken);
    }, PETAL_LIFETIME_MS);
  };

  const announce = (message: string) => {
    setToast(message);
    schedule(() => setToast(null), 1900);
  };

  const swapVehicle = (file: VehicleFile) => {
    setVehicleFading(true);
    schedule(() => {
      if (vehicleFile === file) {
        setVehicleFading(false);
        return;
      }
      setVehicleFile(file);
    }, VEHICLE_FADE_MS);
  };

  const showChapter = (requested: number, animate = true) => {
    if (transitioning) return;
    const next = (requested + CHAPTERS.length) % CHAPTERS.length;
    const chapter = CHAPTERS[next];
    setCurrent(next);
    setFreeViewLabel(null);
    announce(chapter.toast);

    if (animate && reducedMotion === false) {
      setTransitioning(true);
      setDriving(true);
      schedule(() => swapVehicle(chapter.image), VEHICLE_SWAP_TRIGGER_MS);
      schedule(() => {
        setDriving(false);
        setTransitioning(false);
        triggerBloom();
      }, TRAVEL_MS + SOURCE_RELEASE_PAD_MS);
      return;
    }

    setVehicleFading(false);
    setVehicleFile(chapter.image);
    setDriving(false);
    setTransitioning(false);
    if (next === CHAPTERS.length - 1) triggerBloom();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (transitioning) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const delta = event.clientX - drag.lastX;
    const total = event.clientX - drag.startX;
    setDragTilt(Math.max(-13, Math.min(13, total * 0.08)));

    if (Math.abs(delta) < 48) return;
    const next = (freeIndexRef.current + (delta < 0 ? 1 : -1) + VEHICLE_FILES.length) % VEHICLE_FILES.length;
    freeIndexRef.current = next;
    swapVehicle(VEHICLE_FILES[next]);
    setFreeViewLabel(FREE_VIEW_LABELS[next]);
    dragRef.current.lastX = event.clientX;
  };

  const endPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.active && event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    dragRef.current.active = false;
    setDragging(false);
    setDragTilt(0);
  };

  const chapter = CHAPTERS[current];
  const assetReady = failedAssets.size === 0 && loadedAssets.size === EXPECTED_ASSETS.length;
  const petalCount = current === CHAPTERS.length - 1 ? 46 : 18;
  const petals = useMemo(
    () => burstToken === 0 ? [] : Array.from({ length: petalCount }, (_, index) => ({
      key: `${burstToken}-${index}`,
      left: 60 + ((index * 17) % 32),
      top: 24 + ((index * 23) % 32),
      x: ((index * 89) % 600) - 350,
      y: ((index * 61) % 430) - 210,
      glyph: index % 4 ? "✦" : "♥",
    })),
    [burstToken, petalCount],
  );

  return (
    <div className="lt54-shell" data-reduced-motion={reducedMotion ? "true" : "false"}>
      <div className="lt54-preload" aria-hidden="true">
        <img src={LINEAGE_54_ASSET_PATHS[BACKGROUND_FILE]} alt="" onLoad={() => markAssetLoaded(BACKGROUND_FILE)} onError={() => markAssetFailed(BACKGROUND_FILE)} />
        {VEHICLE_FILES.map((file) => (
          <img key={file} src={LINEAGE_54_ASSET_PATHS[file]} alt="" onLoad={() => markAssetLoaded(file)} onError={() => markAssetFailed(file)} />
        ))}
      </div>

      <header className="lt54-header">
        <div className="lt54-brand">LOVETREE<small>PETAL RUNNER · LOVE JOURNEY V4</small></div>
        <div className="lt54-header__guide">
          <span className="lt54-chip lt54-chip--live">FIRST MOMENT → DEPART → TRAVEL → ARRIVE</span>
          <button className="lt54-chip" type="button" onClick={() => setServiceOpen((open) => !open)}>STORY &amp; SERVICE</button>
        </div>
      </header>

      {!assetReady ? (
        <div className="lt54-asset-hold" role="status" data-testid="lineage-54-asset-hold">
          <strong>ASSET TRANSFER HOLD</strong>
          <span>Exact Drive fingerprints are verified; fidelity approval stays blocked until all 5 PNG assets exist at the registered Git paths.</span>
          {failedAssets.size > 0 ? <code>{failedAssets.size} asset path(s) currently missing</code> : <code>verifying asset paths…</code>}
        </div>
      ) : null}

      <div className="lt54-layout">
        <aside className="lt54-panel lt54-side lt54-side--left">
          <span className="lt54-eyebrow">THE VEHICLE OF SAVED FEELINGS</span>
          <h2>A first moment<br /><em>finds its way home.</em></h2>
          <p className="lt54-desc">차를 보여주는 쇼룸이 아닙니다. 첫 설렘이 감정으로 자라고, 저장한 연결을 따라 출발해 나의 러브트리에 도착하는 네 장면의 이야기입니다.</p>
          <div className="lt54-meaning"><b>왜 Petal Runner인가?</b><p>184개의 기억을 한 장씩 찾지 않고, 감정 경로를 따라 이동하며 다시 만나는 러브트리 전용 기억 탐색기입니다.</p></div>
          <div className="lt54-story-list" aria-label="Petal Runner story chapters">
            {CHAPTERS.map((item, index) => (
              <button key={item.key} type="button" className={index === current ? "is-active" : ""} onClick={() => showChapter(index, true)}>
                <span>0{index + 1}</span><span><b>{item.key}</b><small>{STORY_SUBTITLES[index]}</small></span>
              </button>
            ))}
          </div>
          <div className="lt54-fuel"><div><span>PETAL ENERGY</span><b>184 / 200</b></div><div className="lt54-fuel__bar"><i /></div><small>16개의 순간을 더 저장하면 DOUBLE ROUTE가 열립니다.</small></div>
        </aside>

        <section className={`lt54-panel lt54-stage chapter-${current}${driving ? " is-driving" : ""}`} aria-label="Petal Runner journey stage">
          <img className="lt54-stage__background" src={LINEAGE_54_ASSET_PATHS[BACKGROUND_FILE]} alt="LoveTree arrival garden" />
          <div className="lt54-stage__shade" aria-hidden="true" />
          <div className="lt54-chapter-label"><span>{chapter.kicker}</span><strong>{chapter.hero}</strong></div>
          <div className="lt54-chapter-count"><b>0{current + 1}</b><span>{freeViewLabel ?? chapter.view}</span></div>
          <div className="lt54-moment-note lt54-moment-note--1"><b>FIRST GLIMPSE</b>처음 눈이 마주친 순간</div>
          <div className="lt54-moment-note lt54-moment-note--2"><b>HEARTBEAT</b>자꾸 다시 보고 싶은 이유</div>
          <div className="lt54-moment-note lt54-moment-note--3"><b>CONNECTION</b>다음 기억으로 이어진 빛</div>

          <div className="lt54-memory-path">
            <i /><i /><i /><i />
          </div>
          <div className="lt54-speed-field" aria-hidden="true"><i /><i /><i /><i /></div>

          <div className="lt54-car-zone">
            <div
              className={`lt54-car-wrap${dragging ? " is-dragging" : ""}`}
              title="Drag left or right to rotate the vehicle"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointerDrag}
              onPointerCancel={endPointerDrag}
              style={{
                "--lt54-drag-tilt": `${dragTilt}deg`,
                transform: dragTilt === 0 ? "none" : `rotateY(${dragTilt}deg) translateY(-3px)`,
              } as CSSProperties}
            >
              <img
                className="lt54-car"
                src={LINEAGE_54_ASSET_PATHS[vehicleFile]}
                alt={`Petal Runner ${freeViewLabel ?? chapter.view}`}
                draggable={false}
                onLoad={() => setVehicleFading(false)}
                style={{
                  opacity: vehicleFading ? 0.15 : 1,
                  transform: vehicleFading ? "scale(0.94)" : "scale(1)",
                  transition: "opacity 180ms, transform 350ms",
                }}
              />
              <img className="lt54-car-reflection" src={LINEAGE_54_ASSET_PATHS[vehicleFile]} alt="" draggable={false} aria-hidden="true" />
            </div>
          </div>

          <div className="lt54-car-guide">DRAG · ROTATE &nbsp; / &nbsp; DRIVE · WATCH THE JOURNEY</div>
          <div className="lt54-timeline" aria-label="Petal Runner four-stage timeline">
            {CHAPTERS.map((item, index) => (
              <button key={item.short} type="button" className={index === current ? "is-active" : ""} onClick={() => showChapter(index, true)}>{item.short}</button>
            ))}
          </div>
          <div className="lt54-petals" aria-hidden="true">
            {petals.map((petal) => (
              <i
                key={petal.key}
                style={{ left: `${petal.left}%`, top: `${petal.top}%`, "--lt54-x": `${petal.x}px`, "--lt54-y": `${petal.y}px` } as CSSProperties}
              >{petal.glyph}</i>
            ))}
          </div>
        </section>

        <aside className={`lt54-panel lt54-side lt54-side--right${serviceOpen ? " is-open" : ""}`}>
          <span className="lt54-eyebrow">CURRENT STORY CHAPTER</span>
          <h2>{chapter.title}</h2>
          <p className="lt54-desc">{chapter.lead}</p>
          <div className="lt54-right-card">
            <small>{chapter.tag}</small><h3>{chapter.card}</h3><p>{chapter.text}</p>
            <div className="lt54-progress-num"><span>LOVE JOURNEY</span><b>0{current + 1} / 04</b></div>
          </div>
          <button className="lt54-action" type="button" onClick={() => showChapter(current === 3 ? 0 : current + 1, true)}>{chapter.action}</button>
          <button className="lt54-action lt54-action--alt" type="button" onClick={() => showChapter(0, true)}>RETURN TO FIRST MOMENT</button>
          <div className="lt54-service-note"><b>Premium Journey</b><p>100개 저장 시 차량과 첫 경로, 200개 시 복수 감정 경로, 365개 시 1년의 영상을 자동 연결한 Annual Journey를 제공합니다.</p></div>
        </aside>
      </div>

      <div className={`lt54-toast${toast ? " is-visible" : ""}`} role="status">{toast}</div>
      {reducedMotion ? (
        <div className="lt54-motion-policy" aria-live="polite">
          Reduced motion: chapter changes are immediate; travel/camera animation is disabled.
        </div>
      ) : null}
    </div>
  );
}
