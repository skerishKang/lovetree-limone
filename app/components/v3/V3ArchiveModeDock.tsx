"use client";

import {
  ARCHIVE_LAYOUTS,
  ARCHIVE_LAYOUT_LABELS,
  ARCHIVE_VIEWS,
  ARCHIVE_VIEW_LABELS,
  type ArchiveLayout,
  type ArchiveView,
} from "./v3-archive-state";

interface V3ArchiveModeDockProps {
  view: ArchiveView;
  layout: ArchiveLayout;
  onViewChange: (view: ArchiveView) => void;
  onLayoutChange: (layout: ArchiveLayout) => void;
}

export default function V3ArchiveModeDock({
  view,
  layout,
  onViewChange,
  onLayoutChange,
}: V3ArchiveModeDockProps) {
  return (
    <div className="v3-archive-dock">
      <div className="v3-chip-group" role="group" aria-label="보기 모드">
        {ARCHIVE_VIEWS.map((item) => (
          <button
            className="v3-chip"
            type="button"
            key={item}
            aria-pressed={view === item}
            onClick={() => onViewChange(item)}
          >
            {ARCHIVE_VIEW_LABELS[item]}
          </button>
        ))}
      </div>
      {view === "stage" && (
        <div
          className="v3-chip-group v3-archive-layout-group"
          role="group"
          aria-label="순간 갤러리 배치"
        >
          {ARCHIVE_LAYOUTS.map((item) => (
            <button
              className="v3-chip"
              type="button"
              key={item}
              aria-pressed={layout === item}
              onClick={() => onLayoutChange(item)}
            >
              {ARCHIVE_LAYOUT_LABELS[item]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
