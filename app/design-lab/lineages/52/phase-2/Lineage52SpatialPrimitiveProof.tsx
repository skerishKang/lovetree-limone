"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  canAutoAdvance,
  createTransportAuthorityState,
  pauseTransport,
  playTransport,
  releaseManualTakeover,
  restartTransport,
  startManualTakeover,
  type TransportAuthorityState,
} from "@/lib/design-runtime/transport";
import {
  advanceAutoOrbit,
  applyOrbitCameraInput,
  createOrbitCamera,
  cycleMomentId,
  projectConnection,
  projectMoment,
  resolveNativeMotionPolicy,
  sampleConnectionMotion,
  samplePrimitiveTransport,
  type OrbitCameraState,
  type SpatialConnectionProjection,
  type SpatialMomentProjection,
} from "@/lib/lineage-52/spatial-orbit";
import {
  createSpatialPrimitiveRenderer,
  type SpatialPrimitiveRenderer,
} from "@/lib/lineage-52/spatial-webgl";
import styles from "./lineage-52-phase2.module.css";

const DURATION_SECONDS = 12;
const AUTO_RESUME_IDLE_MS = 1200;

const MOMENT_INPUTS = [
  { id: "m-01", label: "Arrival", latitude: 33, longitude: -122 },
  { id: "m-02", label: "Recognition", latitude: 52, longitude: -6 },
  { id: "m-03", label: "Distance", latitude: 18, longitude: 46 },
  { id: "m-04", label: "Return", latitude: -12, longitude: 115 },
  { id: "m-05", label: "Reframe", latitude: -34, longitude: -58 },
  { id: "m-06", label: "Remember", latitude: 7, longitude: -78 },
] as const;

const CONNECTION_INPUTS = [
  { id: "c-01", sourceMomentId: "m-01", targetMomentId: "m-02", height: 0.52 },
  { id: "c-02", sourceMomentId: "m-02", targetMomentId: "m-03", height: 0.66 },
  { id: "c-03", sourceMomentId: "m-03", targetMomentId: "m-04", height: 0.44 },
  { id: "c-04", sourceMomentId: "m-04", targetMomentId: "m-05", height: 0.72 },
  { id: "c-05", sourceMomentId: "m-05", targetMomentId: "m-06", height: 0.58 },
] as const;

const TRANSPORT_EVENTS = CONNECTION_INPUTS.map((connection, index) => ({
  id: connection.id,
  start: index * 0.16,
  end: Math.min(1, index * 0.16 + 0.32),
}));

interface RuntimeStateSnapshot {
  readonly webgl: boolean;
  readonly fallbackReason: string | null;
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
  readonly progress: number;
  readonly selectedMomentId: string | null;
  readonly reducedMotion: boolean;
  readonly autoOrbit: boolean;
  readonly centerPixel: readonly [number, number, number, number] | null;
  readonly resources: ReturnType<SpatialPrimitiveRenderer["snapshot"]> | null;
}

declare global {
  interface Window {
    __LINEAGE52_PHASE2__?: {
      getState(): RuntimeStateSnapshot;
      setYaw(yaw: number): void;
      setProgress(progress: number): void;
      readCenterPixel(): readonly [number, number, number, number] | null;
    };
  }
}

export default function Lineage52SpatialPrimitiveProof({ qaDepth = false }: { qaDepth?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SpatialPrimitiveRenderer | null>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastManualAtRef = useRef(0);
  const previousFrameRef = useRef<number | null>(null);
  const cameraRef = useRef<OrbitCameraState>(createOrbitCamera());
  const progressRef = useRef(0);
  const selectedRef = useRef<string | null>(null);
  const reducedRef = useRef(false);

  const moments = useMemo<readonly SpatialMomentProjection[]>(
    () => MOMENT_INPUTS.map((moment) => projectMoment(moment)),
    [],
  );
  const connections = useMemo<readonly SpatialConnectionProjection[]>(
    () => CONNECTION_INPUTS.map((connection) => projectConnection(connection, moments, 56)),
    [moments],
  );

  const [camera, setCamera] = useState<OrbitCameraState>(() => createOrbitCamera());
  const [progress, setProgress] = useState(0);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(moments[0]?.id ?? null);
  const [authority, setAuthority] = useState<TransportAuthorityState>(() =>
    createTransportAuthorityState({ initialPlaying: true }),
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  const motionPolicy = resolveNativeMotionPolicy(reducedMotion);
  const transport = samplePrimitiveTransport(progress, TRANSPORT_EVENTS);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    selectedRef.current = selectedMomentId;
  }, [selectedMomentId]);
  useEffect(() => {
    reducedRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createSpatialPrimitiveRenderer(canvas);
    rendererRef.current = renderer;
    setWebglAvailable(renderer.available);
    setFallbackReason(renderer.reason);
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer?.available) return;
    const activeConnectionIndex = transport.activeEventId
      ? connections.findIndex((connection) => connection.id === transport.activeEventId)
      : -1;
    const activeIds = new Set<string>();
    if (activeConnectionIndex >= 0) {
      const connection = connections[activeConnectionIndex];
      if (connection) {
        activeIds.add(connection.sourceMomentId);
        activeIds.add(connection.targetMomentId);
      }
    }
    const renderMoments = moments.map((moment) => ({ ...moment, active: activeIds.has(moment.id) }));
    renderer.render({
      camera,
      moments: renderMoments,
      connections,
      progress,
      selectedMomentId,
      reducedMotion,
      depthProbe: qaDepth,
    });
  }, [camera, connections, moments, progress, qaDepth, reducedMotion, selectedMomentId, transport.activeEventId]);

  useEffect(() => {
    let animationFrame = 0;
    const frame = (now: number) => {
      const previous = previousFrameRef.current ?? now;
      const deltaSeconds = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previousFrameRef.current = now;

      if (canAutoAdvance(authority) && !qaDepth) {
        setProgress((current) => {
          const next = current + deltaSeconds / DURATION_SECONDS;
          return next >= 1 ? 0 : next;
        });
      }

      const idle = now - lastManualAtRef.current >= AUTO_RESUME_IDLE_MS;
      if (motionPolicy.continuousOrbit && idle && !qaDepth) {
        setCamera((current) => advanceAutoOrbit(current, deltaSeconds, true));
      }
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animationFrame);
      previousFrameRef.current = null;
    };
  }, [authority, motionPolicy.continuousOrbit, qaDepth]);

  const setCameraWithManualAuthority = useCallback((updater: (state: OrbitCameraState) => OrbitCameraState) => {
    lastManualAtRef.current = performance.now();
    setCamera(updater);
  }, []);

  const beginManual = useCallback(() => {
    lastManualAtRef.current = performance.now();
    setAuthority((current) => startManualTakeover(current));
  }, []);

  const endManual = useCallback(() => {
    lastManualAtRef.current = performance.now();
    setAuthority((current) => releaseManualTakeover(current, "resume-after-idle"));
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    beginManual();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = pointerRef.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setCameraWithManualAuthority((state) =>
      applyOrbitCameraInput(state, { yawDelta: dx * 0.009, pitchDelta: dy * 0.007 }),
    );
  };

  const finishPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = pointerRef.current;
    if (!current || current.id !== event.pointerId) return;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endManual();
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    beginManual();
    setCameraWithManualAuthority((state) =>
      applyOrbitCameraInput(state, { distanceDelta: event.deltaY * 0.0022 }),
    );
    endManual();
  };

  const selectRelativeMoment = useCallback(
    (direction: 1 | -1) => {
      setSelectedMomentId((current) => cycleMomentId(moments, current, direction));
    },
    [moments],
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    let handled = true;
    switch (event.key) {
      case "ArrowLeft":
        setCameraWithManualAuthority((state) => applyOrbitCameraInput(state, { yawDelta: -0.12 }));
        break;
      case "ArrowRight":
        setCameraWithManualAuthority((state) => applyOrbitCameraInput(state, { yawDelta: 0.12 }));
        break;
      case "ArrowUp":
        setCameraWithManualAuthority((state) => applyOrbitCameraInput(state, { pitchDelta: -0.1 }));
        break;
      case "ArrowDown":
        setCameraWithManualAuthority((state) => applyOrbitCameraInput(state, { pitchDelta: 0.1 }));
        break;
      case "+":
      case "=":
        setCameraWithManualAuthority((state) => applyOrbitCameraInput(state, { distanceDelta: -0.28 }));
        break;
      case "-":
      case "_":
        setCameraWithManualAuthority((state) => applyOrbitCameraInput(state, { distanceDelta: 0.28 }));
        break;
      case "n":
      case "N":
        selectRelativeMoment(1);
        break;
      case "p":
      case "P":
        selectRelativeMoment(-1);
        break;
      case "Home":
        setCamera(createOrbitCamera());
        lastManualAtRef.current = performance.now();
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  };

  useEffect(() => {
    window.__LINEAGE52_PHASE2__ = {
      getState() {
        const renderer = rendererRef.current;
        return {
          webgl: renderer?.available ?? false,
          fallbackReason: renderer?.reason ?? fallbackReason,
          yaw: cameraRef.current.yaw,
          pitch: cameraRef.current.pitch,
          distance: cameraRef.current.distance,
          progress: progressRef.current,
          selectedMomentId: selectedRef.current,
          reducedMotion: reducedRef.current,
          autoOrbit: resolveNativeMotionPolicy(reducedRef.current).continuousOrbit,
          centerPixel: renderer?.readCenterPixel() ?? null,
          resources: renderer?.snapshot() ?? null,
        };
      },
      setYaw(yaw: number) {
        if (!Number.isFinite(yaw)) return;
        lastManualAtRef.current = performance.now();
        setCamera((current) => ({ ...current, yaw }));
      },
      setProgress(next: number) {
        if (!Number.isFinite(next)) return;
        setProgress(Math.min(1, Math.max(0, next)));
      },
      readCenterPixel() {
        return rendererRef.current?.readCenterPixel() ?? null;
      },
    };
    return () => {
      delete window.__LINEAGE52_PHASE2__;
    };
  }, [fallbackReason]);

  const selectedMoment = moments.find((moment) => moment.id === selectedMomentId) ?? null;

  return (
    <section
      className={styles.proof}
      data-testid="lineage52-phase2-proof"
      data-webgl-ready={webglAvailable === true ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-auto-orbit={motionPolicy.continuousOrbit ? "true" : "false"}
      data-camera-yaw={camera.yaw.toFixed(4)}
      data-camera-pitch={camera.pitch.toFixed(4)}
      data-camera-distance={camera.distance.toFixed(4)}
      data-transport-progress={progress.toFixed(4)}
      data-selected-moment={selectedMomentId ?? ""}
    >
      <div className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          aria-label="Lineage 52 spatial primitive camera. Arrow keys rotate, plus and minus zoom, N and P change Moment focus, Home resets the camera."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onLostPointerCapture={finishPointer}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          data-testid="lineage52-phase2-canvas"
        />
        {webglAvailable === false ? (
          <div className={styles.fallback} role="status" data-testid="webgl-fallback">
            <strong>WebGL unavailable.</strong>
            <span>The semantic Moment / Connection representation remains available below.</span>
            {fallbackReason ? <code>{fallbackReason}</code> : null}
          </div>
        ) : null}
        <div className={styles.status} aria-live="polite">
          <span>RAW WEBGL · DEPTH TEST</span>
          <span>{motionPolicy.continuousOrbit ? "AUTO ORBIT" : "REDUCED MOTION"}</span>
          <span>{transport.activeEventId ?? "IDLE"}</span>
        </div>
      </div>

      <div className={styles.controls} aria-label="Primitive transport and camera controls">
        <button
          type="button"
          onClick={() => setAuthority((current) => playTransport(current))}
          aria-pressed={canAutoAdvance(authority)}
        >
          Play
        </button>
        <button type="button" onClick={() => setAuthority((current) => pauseTransport(current))}>
          Pause
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthority((current) => restartTransport(current));
            setProgress(0);
          }}
        >
          Restart
        </button>
        <label className={styles.seekLabel}>
          <span>Seek</span>
          <input
            aria-label="Primitive transport seek"
            type="range"
            min="0"
            max="100"
            value={Math.round(progress * 100)}
            onChange={(event) => setProgress(Number(event.currentTarget.value) / 100)}
          />
        </label>
        <button type="button" onClick={() => setCamera(createOrbitCamera())}>
          Reset camera
        </button>
      </div>

      <div className={styles.semanticGrid}>
        <article className={styles.semanticPanel}>
          <div className={styles.panelHeading}>
            <div>
              <small>SEMANTIC FALLBACK · NOT CANVAS-ONLY</small>
              <h2>Moment projection</h2>
            </div>
            <span>{selectedMoment ? `Focused: ${selectedMoment.label}` : "No focus"}</span>
          </div>
          <ul className={styles.momentList} aria-label="Spatial Moments">
            {moments.map((moment) => (
              <li key={moment.id}>
                <button
                  type="button"
                  className={styles.momentButton}
                  aria-pressed={moment.id === selectedMomentId}
                  onClick={() => setSelectedMomentId(moment.id)}
                  data-moment-id={moment.id}
                >
                  <span>{moment.label}</span>
                  <code>{moment.id}</code>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.semanticPanel}>
          <div className={styles.panelHeading}>
            <div>
              <small>CONNECTION PROJECTION</small>
              <h2>Growth / pulse state</h2>
            </div>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <ol className={styles.connectionList} aria-label="Spatial Connections">
            {connections.map((connection, index) => {
              const motion = sampleConnectionMotion(progress, Math.min(0.7, index * 0.1));
              return (
                <li key={connection.id} data-connection-id={connection.id}>
                  <code>{connection.id}</code>
                  <span>
                    {connection.source.label} → {connection.target.label}
                  </span>
                  <span>reveal {Math.round(motion.reveal * 100)}%</span>
                </li>
              );
            })}
          </ol>
        </article>
      </div>

      <div className={styles.boundaryNote}>
        <strong>COMMON_PRIMITIVE_SPLIT proof.</strong> Neutral occluder only; no Earth product visual, Moment Navigator,
        WALK FROM HERE, Guided Orbit, emotion filter, Path Replay orchestration, DB/API/Auth, or canonical `/v4`
        adoption is implemented here.
      </div>
    </section>
  );
}
