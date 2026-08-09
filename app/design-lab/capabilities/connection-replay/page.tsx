"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer } from "react";
import {
  activeDirectedReplayStep,
  createDirectedConnectionReplayState,
  deriveDirectedConnectionReplayPlan,
  reduceDirectedConnectionReplay,
  type DirectedConnectionReplayAction,
  type DirectedReplayConnection,
  type DirectedReplayMoment,
} from "@/lib/directed-connection-replay";
import "@/app/styles/directed-connection-replay.css";

const MOMENTS = [
  { id: "m1", title: "처음 멈춘 장면", meta: "첫 발견", x: 14, y: 34 },
  { id: "m2", title: "다시 찾아본 순간", meta: "표정이 기억나서", x: 34, y: 52 },
  { id: "m3", title: "다른 모습을 발견", meta: "호기심이 커져서", x: 55, y: 30 },
  { id: "m4", title: "마음이 움직인 순간", meta: "작은 웃음 때문에", x: 76, y: 48 },
  { id: "m5", title: "스스로 찾아간 밤", meta: "추천을 따라", x: 60, y: 72 },
  { id: "m6", title: "좋아한다고 인정", meta: "나만의 다음 순간", x: 82, y: 78 },
] as const satisfies readonly (DirectedReplayMoment & { x: number; y: number })[];

const CONNECTIONS = [
  { id: "c1", fromMomentId: "m1", toMomentId: "m2", label: "그 표정이 계속 생각나서", order: 1 },
  { id: "c2", fromMomentId: "m2", toMomentId: "m3", label: "다른 모습도 보고 싶어서", order: 2 },
  { id: "c3", fromMomentId: "m3", toMomentId: "m4", label: "작은 웃음이 마음을 바꿔서", order: 3 },
  { id: "c4", fromMomentId: "m4", toMomentId: "m5", label: "다음 추천을 따라가서", order: 4 },
  { id: "c5", fromMomentId: "m5", toMomentId: "m6", label: "이제 내가 직접 찾고 있어서", order: 5 },
] as const satisfies readonly DirectedReplayConnection[];

const pointById = new Map<string, (typeof MOMENTS)[number]>(
  MOMENTS.map((moment) => [moment.id, moment] as const),
);
const initialPlan = deriveDirectedConnectionReplayPlan(MOMENTS, CONNECTIONS, MOMENTS[0].id);

export default function ConnectionReplayPrototypePage() {
  const reducer = useMemo(
    () => (state: ReturnType<typeof createDirectedConnectionReplayState>, action: DirectedConnectionReplayAction) =>
      reduceDirectedConnectionReplay(state, action),
    [],
  );
  const [state, dispatch] = useReducer(reducer, createDirectedConnectionReplayState(initialPlan));
  const activeStep = activeDirectedReplayStep(state);
  const traversed = useMemo(() => new Set(state.traversedStepKeys), [state.traversedStepKeys]);

  useEffect(() => {
    if (state.mode !== "playing") return;
    const timer = window.setInterval(() => dispatch({ type: "advance" }), 720);
    return () => window.clearInterval(timer);
  }, [state.mode]);

  const startFrom = (momentId: string) => {
    const plan = deriveDirectedConnectionReplayPlan(MOMENTS, CONNECTIONS, momentId);
    dispatch({ type: "load-plan", plan, autoplay: true });
  };

  const progress = state.plan.steps.length === 0
    ? 0
    : state.mode === "ended"
      ? 1
      : state.traversedStepKeys.length / state.plan.steps.length;

  const statusText = state.mode === "ended"
    ? `경로 재생 완료 · ${state.plan.termination}`
    : activeStep?.kind === "moment"
      ? `${pointById.get(activeStep.momentId)?.title ?? activeStep.momentId} 재생 중`
      : activeStep?.kind === "connection"
        ? `${CONNECTIONS.find((connection) => connection.id === activeStep.connectionId)?.label ?? "Connection"} 경로 재생 중`
        : "재생 대기";

  return (
    <main className="lt-connection-replay">
      <header className="lt-connection-replay__header">
        <div>
          <Link href="/design-lab" className="lt-connection-replay__back">← Design Lab</Link>
          <p className="lt-connection-replay__eyebrow">CAP-14 · INTERNAL MECHANIC PROTOTYPE · ISSUE #120</p>
          <h1>관계를 그리는 데서 끝내지 않고,<br />왜 여기까지 왔는지 다시 재생합니다.</h1>
          <p>
            어떤 Moment를 시작점으로 골라도 실제 directed Connection만 따라갑니다. 현재 단계와 이미 지나온 경로는
            별도 상태이며, 끊어진 링크나 cycle은 무한 재생하지 않고 명시적으로 종료합니다.
          </p>
        </div>
        <span className="lt-connection-replay__badge">OBSERVED → PROTOTYPE CANDIDATE</span>
      </header>

      <section className="lt-connection-replay__workspace" aria-label="Directed Connection Path Replay">
        <div className="lt-connection-replay__canvas">
          <svg viewBox="0 0 100 100" role="img" aria-label="Moment 사이 directed Connection 경로">
            {CONNECTIONS.map((connection) => {
              const from = pointById.get(connection.fromMomentId)!;
              const to = pointById.get(connection.toMomentId)!;
              const key = `connection:${connection.id}`;
              const isActive = activeStep?.kind === "connection" && activeStep.connectionId === connection.id;
              return (
                <g key={connection.id} className={`lt-replay-edge ${traversed.has(key) ? "is-traversed" : ""} ${isActive ? "is-active" : ""}`}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                </g>
              );
            })}
          </svg>

          {MOMENTS.map((moment, index) => {
            const key = `moment:${moment.id}`;
            const isActive = activeStep?.kind === "moment" && activeStep.momentId === moment.id;
            return (
              <button
                key={moment.id}
                type="button"
                className={`lt-replay-node ${traversed.has(key) ? "is-traversed" : ""} ${isActive ? "is-active" : ""}`}
                style={{ left: `${moment.x}%`, top: `${moment.y}%` }}
                onClick={() => startFrom(moment.id)}
                aria-label={`${index + 1}. ${moment.title}에서 경로 재생`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{moment.title}</strong>
                <small>{moment.meta}</small>
              </button>
            );
          })}
        </div>

        <aside className="lt-connection-replay__panel">
          <div className="lt-connection-replay__status" aria-live="polite" aria-atomic="true">
            <span>{state.mode.toUpperCase()}</span>
            <strong>{statusText}</strong>
          </div>

          <div className="lt-connection-replay__controls" aria-label="경로 재생 제어">
            <button type="button" onClick={() => dispatch({ type: state.mode === "playing" ? "pause" : "play" })} disabled={state.mode === "ended"}>
              {state.mode === "playing" ? "일시정지" : "계속 재생"}
            </button>
            <button type="button" onClick={() => dispatch({ type: "advance" })} disabled={state.mode !== "playing"}>한 단계</button>
            <button type="button" onClick={() => dispatch({ type: "restart" })}>처음부터</button>
          </div>

          <div className="lt-connection-replay__progress" aria-label={`경로 재생 ${Math.round(progress * 100)}%`}>
            <i style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="lt-connection-replay__memory">
            <span>TRAVERSED MEMORY</span>
            <strong>{state.traversedStepKeys.length} / {state.plan.steps.length} steps</strong>
            <p>현재 active step과 이미 지나온 기억을 분리해, 재생이 진행되어도 지나온 경로는 사라지지 않습니다.</p>
          </div>

          <div className="lt-connection-replay__path-list" aria-label="현재 replay step 목록">
            {state.plan.steps.map((step, index) => (
              <div
                key={`${step.key}:${index}`}
                className={`${traversed.has(step.key) ? "is-traversed" : ""} ${activeStep?.key === step.key ? "is-active" : ""}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{step.kind === "moment" ? "Moment" : "Connection"}</b>
                <small>{step.kind === "moment"
                  ? pointById.get(step.momentId)?.title
                  : CONNECTIONS.find((connection) => connection.id === step.connectionId)?.label}</small>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="lt-connection-replay__rules" aria-label="CAP-14 안전 규칙">
        <article><span>01</span><h2>Canonical edges only</h2><p>화면이 예뻐 보여도 실제 데이터에 없는 Connection은 재생하지 않습니다.</p></article>
        <article><span>02</span><h2>Safe termination</h2><p>broken target과 cycle은 원인을 남기고 멈춥니다. 무한 animation으로 숨기지 않습니다.</p></article>
        <article><span>03</span><h2>Motion optional</h2><p>reduced-motion에서도 단계·경로·traversed memory 의미는 그대로 유지됩니다.</p></article>
      </section>

      <footer className="lt-connection-replay__footer">
        <span>Synthetic LoveTree graph only · no network / Auth / DB / Worker mutation</span>
        <span>Lineage 53 source: 31,131 bytes · SHA256 ed3701b3…a8021519</span>
      </footer>
    </main>
  );
}
