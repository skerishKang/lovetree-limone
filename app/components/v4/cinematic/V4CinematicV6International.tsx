"use client";

import { useEffect } from "react";
import V4Cinematic from "./V4Cinematic";
import { assetUrl } from "./cinematic-data";
import {
  CINEMATIC_V6_SOURCE,
  CINEMATIC_V6_SOURCE_SHA256,
  V6_CONSTELLATION_BODY,
  V6_CONSTELLATION_TITLE,
  V6_FINAL,
  V6_MENU_DESCRIPTION,
  V6_POINTER_DEPTH,
  V6_QUESTIONS,
  V6_QUESTION_KICKER,
  V6_QUESTION_TITLE,
  V6_SKY_COPY,
} from "./cinematic-v6-data";
import "../../../styles/v4/cinematic/cinematic-v6.css";

const SVG_NS = "http://www.w3.org/2000/svg";

function setTextWithBreaks(element: Element | null, value: string) {
  if (!element) return;
  const expected = value.replace(/\r\n/g, "\n").trim();
  const current = Array.from(element.childNodes)
    .map((node) => (node.nodeName === "BR" ? "\n" : node.textContent || ""))
    .join("")
    .replace(/\r\n/g, "\n")
    .trim();
  const needsExplicitBreak = expected.includes("\n") && !element.querySelector("br");
  if (current === expected && !needsExplicitBreak) return;
  element.replaceChildren();
  value.split("\n").forEach((part, index) => {
    if (index) element.appendChild(document.createElement("br"));
    element.appendChild(document.createTextNode(part));
  });
}

function setQuestionCopy(item: Element | null, text: string, note: string) {
  if (!item) return;
  let small = item.querySelector("small");
  if (!small) {
    small = document.createElement("small");
  }
  if (small.textContent !== note) small.textContent = note;
  const currentText = Array.from(item.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join("")
    .trim();
  if (currentText !== text || small.parentElement !== item) {
    item.replaceChildren(document.createTextNode(text), small);
  }
}

function ensureV6QuestionLayer(root: HTMLElement) {
  const scene = root.querySelector<HTMLElement>('.cin-scene[data-effect="questions"]');
  const layer = scene?.querySelector<HTMLElement>(".cin-question-layer");
  if (!scene || !layer) return;

  const title = layer.querySelector<HTMLElement>(".cin-question-title");
  if (title) {
    let kicker = title.querySelector<HTMLElement>("small");
    if (!kicker) {
      kicker = document.createElement("small");
      title.insertBefore(kicker, title.firstChild);
    }
    if (kicker.textContent !== V6_QUESTION_KICKER) kicker.textContent = V6_QUESTION_KICKER;
    const textNodes = Array.from(title.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    const visibleTitle = textNodes.map((node) => node.textContent || "").join("").trim();
    if (visibleTitle !== V6_QUESTION_TITLE) {
      textNodes.forEach((node) => node.remove());
      title.appendChild(document.createTextNode(V6_QUESTION_TITLE));
    }
  }

  V6_QUESTIONS.slice(0, 3).forEach((question, index) => {
    setQuestionCopy(layer.querySelector(`.cin-question-item.q${index + 1}`), question.text, question.note);
  });

  let q4 = layer.querySelector<HTMLElement>(".cin-question-item.q4");
  if (!q4) {
    q4 = document.createElement("div");
    q4.className = "cin-question-item q4 cin-v6-generated";
    const small = document.createElement("small");
    q4.appendChild(document.createTextNode(V6_QUESTIONS[3].text));
    q4.appendChild(small);
    layer.appendChild(q4);
  }
  setQuestionCopy(q4, V6_QUESTIONS[3].text, V6_QUESTIONS[3].note);

  if (!layer.querySelector(".cin-v6-question-core")) {
    const core = document.createElement("div");
    core.className = "cin-v6-question-core cin-v6-generated";
    core.setAttribute("aria-hidden", "true");
    layer.appendChild(core);
  }

  const svg = layer.querySelector<SVGSVGElement>(".cin-question-lines");
  if (svg && !svg.querySelector('[data-cin-v6-line="4"]')) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M608 332C670 255 736 205 820 205");
    path.setAttribute("data-cin-v6-line", "4");
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "820");
    circle.setAttribute("cy", "205");
    circle.setAttribute("r", "4.5");
    circle.setAttribute("data-cin-v6-line", "4");
    svg.appendChild(path);
    svg.appendChild(circle);
  }
}

function ensureV6SceneLayers(root: HTMLElement) {
  const skyScene = root.querySelector<HTMLElement>('.cin-scene[data-effect="sky"]');
  if (skyScene?.classList.contains("is-rendering")) {
    V6_SKY_COPY.forEach((copy, index) => {
      const article = skyScene.querySelectorAll<HTMLElement>(".cin-sky-copy article")[index];
      setTextWithBreaks(article?.querySelector("h3") || null, copy.title);
      const body = article?.querySelector("p");
      if (body && body.textContent !== copy.body) body.textContent = copy.body;
    });
    const sky = skyScene.querySelector<HTMLElement>(".cin-blue-sky");
    if (sky && !sky.querySelector(".cin-v6-sky-canopy")) {
      const canopy = document.createElement("div");
      canopy.className = "cin-v6-sky-canopy cin-v6-generated";
      canopy.setAttribute("aria-hidden", "true");
      const left = document.createElement("img");
      left.className = "left";
      left.alt = "";
      left.src = assetUrl("a12") || "";
      const right = document.createElement("img");
      right.className = "right";
      right.alt = "";
      right.src = assetUrl("a20") || "";
      const orb1 = document.createElement("i");
      orb1.className = "cin-v6-sky-orb o1";
      const orb2 = document.createElement("i");
      orb2.className = "cin-v6-sky-orb o2";
      canopy.appendChild(left);
      canopy.appendChild(right);
      canopy.appendChild(orb1);
      canopy.appendChild(orb2);
      sky.appendChild(canopy);
    }
  }

  const growth = root.querySelector<HTMLElement>('.cin-scene[data-effect="growth"]');
  if (growth?.classList.contains("is-rendering") && !growth.querySelector(".cin-v6-alt-growth")) {
    const img = document.createElement("img");
    img.className = "cin-v6-alt-shot cin-v6-alt-growth cin-v6-generated";
    img.alt = "";
    img.src = assetUrl("a21") || "";
    img.setAttribute("aria-hidden", "true");
    growth.querySelector(".cin-media")?.appendChild(img);
  }

  const prune = root.querySelector<HTMLElement>('.cin-scene[data-effect="prune"]');
  if (prune?.classList.contains("is-rendering")) {
    if (!prune.querySelector(".cin-v6-alt-prune")) {
      const img = document.createElement("img");
      img.className = "cin-v6-alt-shot cin-v6-alt-prune cin-v6-generated";
      img.alt = "";
      img.src = assetUrl("a12") || "";
      img.setAttribute("aria-hidden", "true");
      prune.querySelector(".cin-media")?.appendChild(img);
    }
    if (!prune.querySelector(".cin-v6-prune-glitter")) {
      const glitter = document.createElement("div");
      glitter.className = "cin-v6-prune-glitter cin-v6-generated";
      glitter.setAttribute("aria-hidden", "true");
      prune.appendChild(glitter);
    }
  }

  const constellation = root.querySelector<HTMLElement>('.cin-scene[data-effect="constellation"]');
  if (constellation?.classList.contains("is-rendering")) {
    const caption = constellation.querySelector<HTMLElement>(".cin-constellation-caption");
    setTextWithBreaks(caption?.querySelector("h2") || null, V6_CONSTELLATION_TITLE);
    const body = caption?.querySelector("p");
    if (body && body.textContent !== V6_CONSTELLATION_BODY) body.textContent = V6_CONSTELLATION_BODY;
    if (!constellation.querySelector(".cin-v6-flash-bloom")) {
      const bloom = document.createElement("div");
      bloom.className = "cin-v6-flash-bloom cin-v6-generated";
      bloom.setAttribute("aria-hidden", "true");
      constellation.appendChild(bloom);
    }
  }

  const finalScene = root.querySelector<HTMLElement>('.cin-scene[data-effect="final"]');
  if (finalScene?.classList.contains("is-rendering")) {
    const logo = finalScene.querySelector<HTMLElement>(".cin-final-logo");
    if (logo) {
      const strap = logo.querySelector<HTMLElement>("p");
      if (strap) {
        if (!strap.classList.contains("cin-final-strap")) strap.classList.add("cin-final-strap");
        if (strap.textContent !== V6_FINAL.strap) strap.textContent = V6_FINAL.strap;
      }
      const title = logo.querySelector("h1");
      if (title && title.textContent !== V6_FINAL.title) title.textContent = V6_FINAL.title;
      let subtitle = logo.querySelector<HTMLElement>(".cin-final-sub");
      if (!subtitle) {
        subtitle = document.createElement("p");
        subtitle.className = "cin-final-sub cin-v6-generated";
        logo.appendChild(subtitle);
      }
      if (subtitle.textContent !== V6_FINAL.subtitle) subtitle.textContent = V6_FINAL.subtitle;
      let note = logo.querySelector<HTMLElement>(".cin-final-note");
      if (!note) {
        note = document.createElement("p");
        note.className = "cin-final-note cin-v6-generated";
        logo.appendChild(note);
      }
      if (note.textContent !== V6_FINAL.note) note.textContent = V6_FINAL.note;
    }
    const cta = finalScene.querySelector<HTMLElement>(".cin-final-cta");
    if (cta && cta.textContent !== V6_FINAL.cta) cta.textContent = V6_FINAL.cta;
  }
}

function enhanceMenu(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>(".cin-menu-panel");
  if (!panel) return;
  if (panel.dataset.cinV6Menu !== "true") panel.dataset.cinV6Menu = "true";
  const kicker = panel.querySelector<HTMLElement>(".cin-menu-head small");
  if (kicker && kicker.textContent !== "INTERNATIONAL CINEMATIC") {
    kicker.textContent = "INTERNATIONAL CINEMATIC";
  }
  const description = panel.querySelector<HTMLElement>(".cin-menu-head p");
  if (description && description.textContent !== V6_MENU_DESCRIPTION) {
    description.textContent = V6_MENU_DESCRIPTION;
  }
  const cta = panel.querySelector<HTMLElement>(".cin-menu-cta");
  if (cta && !cta.textContent?.includes("Begin My LoveTree")) {
    cta.replaceChildren(document.createTextNode("Begin My LoveTree "));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    cta.appendChild(arrow);
  }
}

function resetPointerTransforms(root: HTMLElement) {
  const stack = root.querySelector<HTMLElement>(".cin-scene-stack");
  if (stack) stack.style.translate = "0px 0px";
  root.querySelectorAll<HTMLElement>(
    ".cin-media, .cin-scene-copy, .cin-motion-mask, .cin-sky-copy, .cin-question-title, .cin-question-item, .cin-v6-question-core, .cin-constellation-caption, .cin-final-logo",
  ).forEach((element) => {
    element.style.translate = "";
  });
}

export default function V4CinematicV6International() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-cinematic-root]");
    if (!root) return;

    root.dataset.cinV6Edition = "international";
    root.dataset.cinV6Source = CINEMATIC_V6_SOURCE;
    root.dataset.cinV6SourceSha256 = CINEMATIC_V6_SOURCE_SHA256;

    const applySourceDeltas = () => {
      ensureV6QuestionLayer(root);
      ensureV6SceneLayers(root);
      enhanceMenu(root);
    };
    applySourceDeltas();

    const observer = new MutationObserver(applySourceDeltas);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let raf = 0;
    let pointerRunning = false;

    const windowRecord = window as unknown as Record<string, unknown>;
    windowRecord.__cinV6PointerTicks = 0;
    windowRecord.__cinV6PointerActive = false;

    const isPointerEnabled = () => finePointer.matches && !reducedMotion.matches;

    const intensity = () => (window.innerWidth <= 760 ? 0.28 : 1);

    const applyPointer = () => {
      const scale = intensity();
      const x = currentX * scale;
      const y = currentY * scale;
      const stack = root.querySelector<HTMLElement>(".cin-scene-stack");
      if (stack) stack.style.translate = `${(x * 18).toFixed(2)}px ${(y * 14).toFixed(2)}px`;

      root.querySelectorAll<HTMLElement>(".cin-scene.is-rendering").forEach((scene) => {
        const effect = scene.dataset.effect as keyof typeof V6_POINTER_DEPTH;
        const depth = V6_POINTER_DEPTH[effect] ?? 0.45;
        const media = scene.querySelector<HTMLElement>(".cin-media");
        if (media) media.style.translate = `${(x * depth * 16).toFixed(2)}px ${(y * depth * 12).toFixed(2)}px`;
        const copy = scene.querySelector<HTMLElement>(".cin-scene-copy");
        if (copy) copy.style.translate = `${(x * 24).toFixed(2)}px ${(y * 16).toFixed(2)}px`;
        const mask = scene.querySelector<HTMLElement>(".cin-motion-mask");
        if (mask) mask.style.translate = `${(x * 0.6).toFixed(3)}% ${(y * 0.6).toFixed(3)}%`;
        const sky = scene.querySelector<HTMLElement>(".cin-blue-sky");
        if (sky) sky.style.translate = `${(x * 8).toFixed(2)}px ${(y * 5).toFixed(2)}px`;
        const questionTitle = scene.querySelector<HTMLElement>(".cin-question-title");
        if (questionTitle) questionTitle.style.translate = `${(x * 12).toFixed(2)}px ${(y * 8).toFixed(2)}px`;
        scene.querySelectorAll<HTMLElement>(".cin-question-item").forEach((item, index) => {
          const direction = index % 2 === 0 ? 1 : -1;
          item.style.translate = `${(x * (9 + index * 2) * direction).toFixed(2)}px ${(y * (6 + index)).toFixed(2)}px`;
        });
        const core = scene.querySelector<HTMLElement>(".cin-v6-question-core");
        if (core) core.style.translate = `${(x * 14).toFixed(2)}px ${(y * 10).toFixed(2)}px`;
        const constellation = scene.querySelector<HTMLElement>(".cin-constellation-caption");
        if (constellation) constellation.style.translate = `${(x * 12).toFixed(2)}px ${(y * 9).toFixed(2)}px`;
        const finalLogo = scene.querySelector<HTMLElement>(".cin-final-logo");
        if (finalLogo) finalLogo.style.translate = `${(x * 12).toFixed(2)}px ${(y * 8).toFixed(2)}px`;
      });
    };

    const stopPointerLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pointerRunning = false;
      windowRecord.__cinV6PointerActive = false;
    };

    const tickPointer = () => {
      if (!pointerRunning || document.hidden || !isPointerEnabled()) {
        stopPointerLoop();
        return;
      }
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      windowRecord.__cinV6PointerTicks = Number(windowRecord.__cinV6PointerTicks || 0) + 1;
      applyPointer();
      if (Math.abs(targetX - currentX) < 0.0005 && Math.abs(targetY - currentY) < 0.0005) {
        currentX = targetX;
        currentY = targetY;
        applyPointer();
        stopPointerLoop();
        return;
      }
      raf = requestAnimationFrame(tickPointer);
    };

    const startPointerLoop = () => {
      if (pointerRunning || document.hidden || !isPointerEnabled()) return;
      pointerRunning = true;
      windowRecord.__cinV6PointerActive = true;
      raf = requestAnimationFrame(tickPointer);
    };

    const syncPointerCapability = () => {
      const enabled = isPointerEnabled();
      root.dataset.cinV6Pointer = enabled ? "enabled" : "disabled";
      if (!enabled) {
        targetX = 0;
        targetY = 0;
        currentX = 0;
        currentY = 0;
        stopPointerLoop();
        resetPointerTransforms(root);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isPointerEnabled()) return;
      targetX = event.clientX / Math.max(1, window.innerWidth) - 0.5;
      targetY = event.clientY / Math.max(1, window.innerHeight) - 0.5;
      startPointerLoop();
    };
    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      startPointerLoop();
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopPointerLoop();
      } else if (isPointerEnabled() && (Math.abs(targetX - currentX) > 0.0005 || Math.abs(targetY - currentY) > 0.0005)) {
        startPointerLoop();
      }
    };
    const onResize = () => applyPointer();

    syncPointerCapability();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    finePointer.addEventListener?.("change", syncPointerCapability);
    reducedMotion.addEventListener?.("change", syncPointerCapability);

    return () => {
      observer.disconnect();
      stopPointerLoop();
      resetPointerTransforms(root);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      finePointer.removeEventListener?.("change", syncPointerCapability);
      reducedMotion.removeEventListener?.("change", syncPointerCapability);
      delete root.dataset.cinV6Edition;
      delete root.dataset.cinV6Pointer;
    };
  }, []);

  return (
    <div className="cin-v6-shell" data-cinematic-v6-shell>
      <V4Cinematic />
    </div>
  );
}