"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_QUESTION_LENS,
  QUESTION_LENSES,
  QUESTION_LENS_MOMENTS,
  deriveQuestionLensView,
  parseQuestionLensState,
  serializeQuestionLensState,
  type QuestionLensId,
  type QuestionLensState,
} from "@/lib/question-lens-prototype";
import "@/app/styles/question-lens-prototype.css";

const INITIAL_STATE: QuestionLensState = { lens: DEFAULT_QUESTION_LENS };

export default function QuestionLensPrototypePage() {
  const [state, setState] = useState<QuestionLensState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const view = useMemo(() => deriveQuestionLensView(state), [state]);

  useEffect(() => {
    setState(parseQuestionLensState(window.location.search));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const query = serializeQuestionLensState(state);
    window.history.replaceState({}, "", `${window.location.pathname}?${query}`);
  }, [hydrated, state]);

  const activateLens = (lens: QuestionLensId) => {
    setState({ lens });
    requestAnimationFrame(() => summaryRef.current?.focus({ preventScroll: true }));
  };

  const selectMoment = (momentId: string) => {
    setState((current) => ({ ...current, selectedMomentId: momentId }));
  };

  const projectedIds = new Set(view.moments.map((moment) => moment.id));
  const selectedMoment = QUESTION_LENS_MOMENTS.find((moment) => moment.id === view.selectedMomentId) ?? view.moments[0];

  return (
    <main className="lt-question-lens">
      <header className="lt-question-lens__header">
        <div>
          <Link href="/design-lab" className="lt-question-lens__back">← Design Lab</Link>
          <p className="lt-question-lens__eyebrow">CAP-11 · INTERNAL MECHANIC PROTOTYPE · ISSUE #104</p>
          <h1>데이터를 복제하지 않고,<br />질문이 보는 각도만 바꿉니다.</h1>
          <p className="lt-question-lens__lede">
            하나의 synthetic Moment 공간을 네 가지 질문 렌즈로 다시 투영합니다. 각 렌즈는 같은 canonical records를
            사용하고, 상태는 URL query로 복원할 수 있습니다. 이어온의 회사·대표자 의미론은 가져오지 않습니다.
          </p>
        </div>
        <span className="lt-question-lens__status">PROTOTYPE · NOT PRODUCT-READY</span>
      </header>

      <div className="lt-question-lens__shell">
        <aside className="lt-question-lens__rail" aria-label="질문 렌즈 선택">
          <p>QUESTION LENSES</p>
          {QUESTION_LENSES.map((lens) => (
            <button
              type="button"
              key={lens.id}
              aria-pressed={state.lens === lens.id}
              onClick={() => activateLens(lens.id)}
            >
              <span>{lens.label}</span>
              <strong>{lens.question}</strong>
            </button>
          ))}
          <div className="lt-question-lens__url-state">
            <span>URL STATE</span>
            <code>?{serializeQuestionLensState(state)}</code>
          </div>
        </aside>

        <section className="lt-question-lens__workspace">
          <div className="lt-question-lens__summary">
            <div>
              <span>{view.lens.label.toUpperCase()} LENS</span>
              <h2 ref={summaryRef} tabIndex={-1}>{view.lens.resultLabel}</h2>
              <p>{view.summary}</p>
            </div>
            <div className="lt-question-lens__metric">
              <strong>{view.primaryMetric}</strong>
              <span>same canonical dataset</span>
            </div>
          </div>

          <nav className="lt-question-lens__mobile-nav" aria-label="모바일 질문 렌즈">
            {QUESTION_LENSES.map((lens) => (
              <button
                type="button"
                key={lens.id}
                aria-pressed={state.lens === lens.id}
                onClick={() => activateLens(lens.id)}
              >
                {lens.label}
              </button>
            ))}
          </nav>

          <div className="lt-question-lens__results" aria-live="polite" aria-atomic="true">
            {view.moments.map((moment) => (
              <button
                type="button"
                key={moment.id}
                aria-pressed={view.selectedMomentId === moment.id}
                onClick={() => selectMoment(moment.id)}
              >
                <span>{moment.mediaType} · {moment.person}</span>
                <strong>{moment.title}</strong>
                <small>{moment.capturedAt.slice(0, 10)} · {moment.connectionIds.length} connections</small>
              </button>
            ))}
          </div>

          {selectedMoment ? (
            <section className="lt-question-lens__focus" aria-labelledby="question-lens-focus-title">
              <div>
                <span>SELECTED FROM CURRENT LENS</span>
                <h3 id="question-lens-focus-title">{selectedMoment.title}</h3>
                <p>{selectedMoment.person} · {selectedMoment.mediaType} · saved={String(selectedMoment.saved)}</p>
              </div>
              <dl>
                <div><dt>Captured</dt><dd>{selectedMoment.capturedAt.slice(0, 10)}</dd></div>
                <div><dt>Last viewed</dt><dd>{selectedMoment.lastViewedAt.slice(0, 10)}</dd></div>
                <div><dt>Connections</dt><dd>{selectedMoment.connectionIds.length}</dd></div>
              </dl>
            </section>
          ) : null}

          <section className="lt-question-lens__timeline" aria-labelledby="question-lens-timeline-title">
            <div className="lt-question-lens__timeline-head">
              <div>
                <span>CANONICAL TIMELINE</span>
                <h3 id="question-lens-timeline-title">같은 6개 Moment, 다른 강조</h3>
              </div>
              <p>렌즈가 바뀌어도 timeline record 자체는 복제되지 않습니다.</p>
            </div>
            <ol>
              {view.timelineMomentIds.map((id) => {
                const moment = QUESTION_LENS_MOMENTS.find((item) => item.id === id)!;
                return (
                  <li key={id} className={projectedIds.has(id) ? "is-projected" : ""}>
                    <button type="button" onClick={() => selectMoment(id)} aria-label={`${moment.title} 선택`}>
                      <i />
                      <span>{moment.capturedAt.slice(0, 10)}</span>
                      <strong>{moment.title}</strong>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </section>
      </div>

      <footer className="lt-question-lens__footer">
        <span>Source research #78 · audit #96 · registry #97 · CAP-09 #99 · CAP-10 #102 · CAP-11 #104</span>
        <span>Drive fingerprint: 67,735 bytes · SHA256 8192dbde…f4ab5b</span>
      </footer>
    </main>
  );
}
