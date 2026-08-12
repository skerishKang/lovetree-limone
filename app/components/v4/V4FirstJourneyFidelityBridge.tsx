"use client";

import { useEffect } from "react";

const STORAGE_KEY = "lovetree-first-journey-unified";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const SOURCE_STORY = [
  {
    selector: ".v4-j-card.root",
    id: "nqofkzQD19E",
    time: "01:30",
    tag: "처음 발견한 순간",
    title: "처음 마음이 멈춘 장면",
    note: "짧은 영상 하나가 이상하게 오래 마음에 남았어요.",
    provenance: "YouTube · 나의 기록",
  },
  {
    selector: ".v4-j-card.card-a",
    id: "bcUfIpQ6aeA",
    time: "03:12",
    tag: "팬의 추천",
    title: "다정한 말투가 남은 인터뷰",
    note: "다른 팬이 꼭 보라고 이어 준 영상이에요.",
    provenance: "",
  },
  {
    selector: ".v4-j-card.card-b",
    id: "mRppy-KnyNI",
    time: "07:48",
    tag: "내가 고른 다음 순간",
    title: "댓글을 따라 찾아본 장면",
    note: "이 순간부터 마음이 더 빠르게 자랐어요.",
    provenance: "",
  },
] as const;

function youtubeId(value: string): string | null {
  const match = String(value || "").match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{6,})/,
  );
  return match?.[1] || null;
}

function thumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function text(el: HTMLElement | SVGElement | null, value: string) {
  if (el && el.textContent !== value) el.textContent = value;
}

function upsertTextNode(parent: HTMLElement, className: string, value: string, tag = "p") {
  let node = parent.querySelector<HTMLElement>(`.${className}`);
  if (!node) {
    node = document.createElement(tag);
    node.className = className;
    parent.appendChild(node);
  }
  text(node, value);
  return node;
}

function parseStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function dispatchStorageRefresh() {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: localStorage.getItem(STORAGE_KEY),
      url: window.location.href,
    }),
  );
}

export default function V4FirstJourneyFidelityBridge() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".v4-journey-page");
    if (!root) return;

    root.dataset.sourceFidelity = "remediated";
    const timers = new Set<number>();
    const pending = new WeakSet<Element>();
    let applying = false;
    let queued = false;

    const reducedMotion = () => window.matchMedia?.(REDUCED_MOTION).matches === true;

    const later = (callback: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        callback();
      }, ms);
      timers.add(id);
      return id;
    };

    const applyLandingStory = () => {
      const board = root.querySelector<HTMLElement>(".v4-j-board");
      if (!board) return;
      board.dataset.sourceStory = "three-moment-youtube";
      text(board.querySelector(".v4-j-board-title"), "러브트리 미리보기");
      text(board.querySelector(".v4-j-board-meta"), "season 01");

      SOURCE_STORY.forEach((item, index) => {
        const card = board.querySelector<HTMLElement>(item.selector);
        if (!card) return;
        card.dataset.sourceStoryCard = String(index + 1);
        const media = card.querySelector<HTMLElement>(".v4-j-media");
        if (media) {
          media.style.backgroundImage = `linear-gradient(180deg,rgba(255,246,233,.08),rgba(47,37,38,.34)),url(${thumbnail(item.id)})`;
          media.style.backgroundSize = "cover";
          media.style.backgroundPosition = "center";
          let play = media.querySelector<HTMLElement>(".v4-j-source-play");
          if (!play) {
            play = document.createElement("span");
            play.className = "v4-j-source-play";
            media.appendChild(play);
          }
          text(play, "▶");
          let time = media.querySelector<HTMLElement>(".v4-j-source-time");
          if (!time) {
            time = document.createElement("small");
            time.className = "v4-j-source-time";
            media.appendChild(time);
          }
          text(time, item.time);
        }
        const copy = card.querySelector<HTMLElement>(".v4-j-card-copy");
        if (!copy) return;
        text(copy.querySelector("small"), item.tag);
        text(copy.querySelector("strong"), item.title);
        upsertTextNode(copy, "v4-j-source-story-note", item.note);
        const oldProvenance = copy.querySelector<HTMLElement>(".v4-j-source-story-provenance");
        if (item.provenance) {
          upsertTextNode(copy, "v4-j-source-story-provenance", item.provenance, "small");
        } else if (oldProvenance?.parentNode) {
          oldProvenance.parentNode.removeChild(oldProvenance);
        }
      });

      text(board.querySelector(".v4-j-pill.left"), "♥ 팬의 추천");
      text(board.querySelector(".v4-j-pill.right"), "✦ 내가 고른 다음 순간");

      const svg = board.querySelector<SVGSVGElement>(".v4-j-branch-svg");
      if (svg) {
        svg.setAttribute("viewBox", "0 0 600 470");
        svg.setAttribute("preserveAspectRatio", "none");
        const paths = svg.querySelectorAll<SVGPathElement>("path");
        const sourcePaths = [
          "M300 170 C285 238 205 270 112 316",
          "M300 170 C330 238 420 280 501 338",
          "M300 170 C310 260 307 350 320 435",
        ];
        paths.forEach((path, index) => {
          if (sourcePaths[index]) path.setAttribute("d", sourcePaths[index]);
        });
      }

      const caption = board.querySelector<HTMLElement>(".v4-j-caption");
      if (
        caption &&
        caption.textContent?.replace(/\s+/g, "") !==
          "한장면에서시작한마음이다음장면과연결되어자라나요."
      ) {
        caption.dataset.sourceCaption = "true";
        while (caption.firstChild) caption.removeChild(caption.firstChild);
        const rule = document.createElement("span");
        rule.className = "v4-j-source-caption-rule";
        const copy = document.createElement("p");
        copy.appendChild(document.createTextNode("한 장면에서 시작한 마음이"));
        copy.appendChild(document.createElement("br"));
        const strong = document.createElement("b");
        strong.textContent = "다음 장면과 연결되어 자라나요.";
        copy.appendChild(strong);
        caption.appendChild(rule);
        caption.appendChild(copy);
      }
    };

    const applyLivePreview = () => {
      const input = root.querySelector<HTMLInputElement>("#content-url");
      const win = root.querySelector<HTMLElement>(".v4-j-preview-window");
      if (!input || !win) return;
      const id = youtubeId(input.value);
      if (id) {
        win.dataset.sourcePreview = id;
        win.style.backgroundImage = `linear-gradient(180deg,rgba(255,244,231,.08),rgba(46,34,34,.27)),url(${thumbnail(id)})`;
        win.style.backgroundSize = "cover";
        win.style.backgroundPosition = "center";
        text(win.querySelector("[data-testid='preview-title']"), "첫 순간으로 연결할 영상");
        text(
          win.querySelector(".v4-j-preview-copy p"),
          "이 장면에서 러브트리의 첫 뿌리가 시작됩니다.",
        );
      } else {
        delete win.dataset.sourcePreview;
        win.style.backgroundImage = "";
        text(win.querySelector("[data-testid='preview-title']"), "링크를 넣으면 콘텐츠가 보여요");
        text(
          win.querySelector(".v4-j-preview-copy p"),
          "YouTube 주소를 붙여 넣어 러브트리의 뿌리를 만들어 보세요.",
        );
      }
    };

    const applyStep3Narrative = () => {
      const stage = root.querySelector<HTMLElement>(".v4-journey-connect");
      if (!stage) return;
      const copy = stage.querySelector<HTMLElement>(".v4-j-copy");
      if (copy) {
        text(copy.querySelector(".v4-j-eyebrow"), "03 · 첫 가지를 이어가는 시간");
        const heading = copy.querySelector<HTMLElement>("h1");
        const expectedHeading = "첫마음이다음장면을찾아갔어요.";
        if (heading && heading.textContent?.replace(/\s+/g, "") !== expectedHeading) {
          heading.dataset.sourceHeading = "true";
          while (heading.firstChild) heading.removeChild(heading.firstChild);
          const line1 = document.createElement("span");
          line1.textContent = "첫 마음이";
          const line2 = document.createElement("span");
          line2.className = "v4-j-source-heading-soft";
          line2.textContent = "다음 장면을";
          const line3 = document.createElement("em");
          line3.textContent = "찾아갔어요.";
          heading.appendChild(line1);
          heading.appendChild(line2);
          heading.appendChild(line3);
        }
        const desc = copy.querySelector<HTMLElement>(".v4-j-hero-desc");
        text(
          desc,
          "첫 영상을 본 뒤 무엇을 더 찾아봤는지 남겨 주세요. 댓글을 따라갔든, 팬의 추천을 받았든, 직접 검색했든 그 경로가 러브트리의 첫 가지가 됩니다.",
        );
      }

      const board = stage.querySelector<HTMLElement>(".v4-j-connection-board");
      if (!board) return;
      if (!board.querySelector(".v4-j-source-branch-label")) {
        const label = document.createElement("div");
        label.className = "v4-j-source-branch-label";
        const left = document.createElement("span");
        left.textContent = "FIRST BRANCH · 첫 연결";
        const right = document.createElement("span");
        right.textContent = "01 → 02";
        label.appendChild(left);
        label.appendChild(right);
        board.insertBefore(label, board.firstChild);
      }
      const canvas = board.querySelector<HTMLElement>(".v4-j-connect-canvas");
      if (!canvas) return;

      const stored = parseStoredState();
      const firstNote =
        stored?.firstMoment?.note || "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.";
      const firstCopy = canvas.querySelector<HTMLElement>(
        ".v4-j-moment.first .v4-j-moment-copy",
      );
      if (firstCopy) upsertTextNode(firstCopy, "v4-j-source-moment-note", firstNote);

      const nextNote = root.querySelector<HTMLTextAreaElement>("#next-note")?.value.trim();
      const nextCopy = canvas.querySelector<HTMLElement>(
        ".v4-j-moment.next .v4-j-moment-copy",
      );
      if (nextCopy) {
        upsertTextNode(
          nextCopy,
          "v4-j-source-moment-note",
          nextNote || "링크를 넣으면 두 순간이 하나의 가지로 이어져요.",
        );
      }

      if (!canvas.querySelector(".v4-j-source-board-caption")) {
        const caption = document.createElement("div");
        caption.className = "v4-j-source-board-caption";
        caption.appendChild(document.createTextNode("한 장면에서 다음 장면으로,"));
        caption.appendChild(document.createElement("br"));
        const strong = document.createElement("b");
        strong.textContent = "좋아하게 된 경로가 보여요.";
        caption.appendChild(strong);
        canvas.appendChild(caption);
      }
    };

    const applyGrowthMicrocopy = () => {
      const growth = root.querySelector<HTMLElement>(".v4-journey-growth");
      if (!growth) return;
      text(growth.querySelector(".v4-j-eyebrow"), "04 · 러브트리 성장");
      text(growth.querySelector(".v4-j-growth-connector i"), "✿");
    };

    const applyAll = () => {
      if (applying) return;
      applying = true;
      try {
        applyLandingStory();
        applyLivePreview();
        applyStep3Narrative();
        applyGrowthMicrocopy();
      } finally {
        applying = false;
      }
    };

    const queueApply = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        applyAll();
      });
    };

    const replayAfter = (target: HTMLElement, delay: number, replay: () => void) => {
      if (pending.has(target)) return true;
      pending.add(target);
      const wasDisabled = target instanceof HTMLButtonElement ? target.disabled : false;
      if (target instanceof HTMLButtonElement) target.disabled = true;
      later(() => {
        pending.delete(target);
        if (target instanceof HTMLButtonElement) target.disabled = wasDisabled;
        target.dataset.fidelityReplay = "true";
        replay();
        queueMicrotask(() => delete target.dataset.fidelityReplay);
      }, delay);
      return true;
    };

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.id === "content-url") applyLivePreview();
      if (target?.id === "next-note") queueApply();
    };

    const onSubmitCapture = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.id !== "discovery-form" || form.dataset.fidelityReplay === "true") return;
      if (reducedMotion()) {
        root.dataset.fidelityDwell = "bypassed";
        return;
      }
      const url = form.querySelector<HTMLInputElement>("#content-url")?.value || "";
      if (!youtubeId(url)) return;
      root.dataset.fidelityDwell = "480";
      const rawNote = form.querySelector<HTMLTextAreaElement>("#discovery-note")?.value || "";
      event.preventDefault();
      event.stopPropagation();
      replayAfter(form, 480, () => {
        form.dataset.fidelityReplay = "true";
        form.requestSubmit();
        queueMicrotask(() => delete form.dataset.fidelityReplay);
        later(() => {
          const state = parseStoredState();
          if (!state?.firstMoment) return;
          state.firstMoment.title = "첫 순간으로 연결할 영상";
          state.firstMoment.note = rawNote;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          dispatchStorageRefresh();
        }, 0);
      });
    };

    const onClickCapture = (event: MouseEvent) => {
      if (reducedMotion()) return;
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("button");
      if (!button || button.dataset.fidelityReplay === "true") return;

      const step2Success = button.closest("[data-testid='step2-success']");
      const step3Success = button.closest("[data-testid='step3-success']");
      const label = button.textContent?.replace(/\s+/g, " ").trim() || "";
      const delay =
        step2Success && /첫 여정 보기/.test(label)
          ? 360
          : step3Success && /내 러브트리 보기/.test(label)
            ? 350
            : 0;
      if (!delay) return;

      event.preventDefault();
      event.stopPropagation();
      replayAfter(button, delay, () => button.click());
    };

    const observer = new MutationObserver(queueApply);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    root.addEventListener("input", onInput, true);
    root.addEventListener("submit", onSubmitCapture, true);
    root.addEventListener("click", onClickCapture, true);
    applyAll();

    return () => {
      observer.disconnect();
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("submit", onSubmitCapture, true);
      root.removeEventListener("click", onClickCapture, true);
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      delete root.dataset.sourceFidelity;
      delete root.dataset.fidelityDwell;
    };
  }, []);

  return null;
}