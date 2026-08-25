"use client";

import { useState } from "react";
import type { TreeMomentView } from "@/lib/moment-model";
import type { LivingGlassPresentation } from "@/lib/source-track-57-living-glass";
import { LivingGlassMomentCard } from "./LivingGlassMomentCard";
import { LivingGlassMomentInspector } from "./LivingGlassMomentInspector";

export function LivingGlassMomentGallery({
  moments,
  presentationById,
}: {
  moments: TreeMomentView[];
  presentationById: Record<string, LivingGlassPresentation>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMoment = moments.find((moment) => moment.id === selectedId) ?? null;
  const selectedPresentation = selectedMoment ? presentationById[selectedMoment.id] : undefined;

  return (
    <section
      className={`living-glass-gallery-shell${selectedMoment ? " has-selection" : ""}`}
      aria-label="Living Glass Moments"
    >
      <div className="living-glass-gallery" data-testid="source57-gallery">
        {moments.map((moment) => {
          const presentation = presentationById[moment.id];
          if (!presentation) return null;
          return (
            <LivingGlassMomentCard
              key={moment.id}
              moment={moment}
              presentation={presentation}
              selected={selectedId === moment.id}
              onSelect={(next) => setSelectedId(next.id)}
            />
          );
        })}
      </div>

      {selectedMoment && selectedPresentation ? (
        <LivingGlassMomentInspector
          moment={selectedMoment}
          presentation={selectedPresentation}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </section>
  );
}
