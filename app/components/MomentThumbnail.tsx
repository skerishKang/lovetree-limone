"use client";

import { useState } from "react";
import { sourceTypeLabel } from "@/lib/tree-types";

interface MomentThumbnailProps {
  src?: string;
  alt?: string;
  sourceType?: string;
  className?: string;
  placeholderClassName?: string;
}

export function MomentThumbnail({
  src,
  alt,
  sourceType,
  className,
  placeholderClassName,
}: MomentThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const hasSrc = Boolean(src);

  if (!hasSrc || failed) {
    return (
      <div className={placeholderClassName} aria-hidden="true">
        <span>
          {sourceType === "song" ? "♫" : sourceType === "book" ? "▤" : sourceType === "video" ? "▶" : "✦"}
        </span>
        <small>{sourceTypeLabel(sourceType)}</small>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
