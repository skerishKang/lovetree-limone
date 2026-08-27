"use client";

import { useRef, useState } from "react";
import type { TreeMomentView } from "@/lib/moment-model";
import type { LivingGlassPresentation } from "@/lib/source-track-57-living-glass";
import { LivingGlassMomentCard } from "./LivingGlassMomentCard";
import { LivingGlassMomentInspector } from "./LivingGlassMomentInspector";

export function LivingGlassMomentGallery({
  moments,
  presentationById,
  selectedId,
  onSelectedIdChange,
}: {
  moments: TreeMomentView[];
  presentationById: Record<string, LivingGlassPresentation>;
  selectedId?: string | null;
  onSelectedIdChange?: (momentId: string | null) => void;
}) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const controlled = selectedId !== undefined;
  const activeSelectedId = controlled ? selectedId : internalSelectedId;
  const selectedMoment = moments.find((moment) => moment.id === activeSelectedId) ?? null;
  const selectedPresentation = selectedMoment ? presentationById[selectedMoment.id] : undefined;
  const selectedIndex = selectedMoment ? moments.findIndex((moment) => moment.id === selectedMoment.id) : -1;

  const setSelection = (nextId: string | null) => {
    if (!controlled) setInternalSelectedId(nextId);
    onSelectedIdChange?.(nextId);
  };

  const scrollMomentIntoView = (index: number) => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 880px)").matches) return;
    requestAnimationFrame(() => {
      const element = galleryRef.current?.children.item(index);
      if (!(element instanceof HTMLElement)) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
    });
  };

  const selectMoment = (moment: TreeMomentView) => {
    const index = moments.findIndex((candidate) => candidate.id === moment.id);
    setSelection(moment.id);
    if (index >= 0) scrollMomentIntoView(index);
  };

  const navigateMoment = (direction: -1 | 1, from: TreeMomentView) => {
    const currentIndex = moments.findIndex((moment) => moment.id === from.id);
    if (currentIndex < 0 || moments.length === 0) return;
    const nextIndex = (currentIndex + direction + moments.length) % moments.length;
    const next = moments[nextIndex];
    if (!next) return;
    setSelection(next.id);
    scrollMomentIntoView(nextIndex);
  };

  return (
    <section
      className={`living-glass-gallery-shell${selectedMoment ? " has-selection" : ""}`}
      aria-label="Living Glass Moments"
      data-selected-id={activeSelectedId ?? ""}
      data-selected-index={selectedIndex}
    >
      <div
        ref={galleryRef}
        className="living-glass-gallery"
        data-testid="source57-gallery"
        data-mobile-horizontal-authority="v1.3"
      >
        {moments.map((moment) => {
          const presentation = presentationById[moment.id];
          if (!presentation) return null;
          return (
            <LivingGlassMomentCard
              key={moment.id}
              moment={moment}
              presentation={presentation}
              selected={activeSelectedId === moment.id}
              onSelect={selectMoment}
              onNavigate={navigateMoment}
            />
          );
        })}
      </div>

      <div className="living-glass-mobile-travel-cue" aria-hidden="true" data-testid="source57-mobile-travel-cue">
        <span>SWIPE · MOMENTS</span>
        <div>
          {moments.map((moment, index) => (
            <i key={moment.id} data-active={index === (selectedIndex >= 0 ? selectedIndex : 0) ? "true" : "false"} />
          ))}
        </div>
      </div>

      {selectedMoment && selectedPresentation ? (
        <LivingGlassMomentInspector
          moment={selectedMoment}
          presentation={selectedPresentation}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </section>
  );
}
