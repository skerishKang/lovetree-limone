"use client";

import { useCallback, useEffect, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Lineage55MoonlitBlossom from "@/app/design-lab/lineages/55/Lineage55MoonlitBlossom";
import "@/app/styles/lineage-55-moonlit-blossom.css";

export const MVP_ENTRY_EDITOR_ROUTE = "/v4/trees/demo/graph";

/**
 * MVP demo entry flow routing layer (issue #318).
 *
 * Reuses the merged Lineage 55 Moonlit Blossom first screen verbatim and adds
 * ONLY a capture-phase click bridge: the primary header pill (ENTER MY TREE)
 * navigates to the /v4/trees/demo/graph editor. The design-lab implementation
 * and the graph editor internals stay untouched — this file is the entire
 * integration surface.
 */
export default function MvpEntryFlow() {
  const router = useRouter();

  // Dark overscan cover (issue #343b): while the first screen is mounted, the
  // document canvas behind .lt55 uses the same night tone so viewport
  // over-scan (rubber-banding, capture over-render) never flashes the light
  // site paper background at the bottom band. Presentation-only.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    html.style.background = "#050615";
    body.style.background = "#050615";
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
    };
  }, []);

  const onClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(".lt55-pill.primary")) return;
      event.preventDefault();
      event.stopPropagation();
      router.push(MVP_ENTRY_EDITOR_ROUTE);
    },
    [router],
  );

  return (
    <div onClickCapture={onClickCapture} data-mvp-entry-flow>
      <Lineage55MoonlitBlossom />
    </div>
  );
}
