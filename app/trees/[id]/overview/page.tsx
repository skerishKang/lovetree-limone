"use client";

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import V4FinalTreeSurface from "@/app/components/v4/product/V4FinalTreeSurface";
import { useTreeMoments } from "@/lib/use-tree-moments";
import "@/app/styles/v4/product-surfaces.css";

export default function TreeOverviewPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const { moments } = useTreeMoments(treeId);
  const recent = useMemo(() => [...moments].slice(-4).reverse(), [moments]);

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".v4-overview-moments article");
    cards.forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", `${card.querySelector("strong")?.textContent || "최근 순간"} 상세 보기`);
    });
  }, [recent]);

  const openRecent = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    const card = target.closest<HTMLElement>(".v4-overview-moments article");
    if (!card || !card.parentElement) return false;
    const index = Array.from(card.parentElement.children).indexOf(card);
    const memory = recent[index];
    if (!memory) return false;
    router.push(`/trees/${encodeURIComponent(treeId)}?moment=${encodeURIComponent(memory.id)}`);
    return true;
  };

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    openRecent(event.target);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (openRecent(event.target)) event.preventDefault();
  };

  return (
    <div onClickCapture={handleClick} onKeyDownCapture={handleKeyDown}>
      <V4FinalTreeSurface treeId={treeId} mode="overview" />
    </div>
  );
}
