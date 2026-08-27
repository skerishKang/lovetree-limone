"use client";

import { useCallback, useEffect, useRef } from "react";
import Lineage60ClusterExplorer from "@/app/design-lab/lineages/60/v1-2/Lineage60ClusterExplorer";
import type { BridgeView, ClusterView, Track60Moment } from "@/lib/lineage-60/data";

type Props = {
  moments: Track60Moment[];
  clusters: ClusterView[];
  bridges: BridgeView[];
  selectedMomentId: string | null;
  onSelectedMomentChange: (momentId: string | null) => void;
};

function displayedMembers(
  cluster: ClusterView,
  momentsById: Map<string, Track60Moment>,
  query: string,
): Track60Moment[] {
  const members = cluster.memberIds.map((id) => momentsById.get(id)).filter(Boolean) as Track60Moment[];
  const q = query.trim().toLowerCase();
  if (!q) return members;
  const clusterMatch = cluster.label.toLowerCase().includes(q);
  return members.filter((moment) =>
    clusterMatch || moment.title.toLowerCase().includes(q) || moment.memo.toLowerCase().includes(q),
  );
}

export default function ProductLineage60Explorer({
  moments,
  clusters,
  bridges,
  selectedMomentId,
  onSelectedMomentChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const syncFrameRef = useRef<number | null>(null);

  const resolveSelectedIdFromDom = useCallback((): string | null => {
    const root = rootRef.current;
    if (!root) return null;
    const selectedButton = root.querySelector<HTMLButtonElement>('[data-moment-item][aria-selected="true"]');
    if (!selectedButton) return null;
    const group = selectedButton.closest<HTMLElement>('[role="group"][aria-label^="Cluster "]');
    if (!group) return null;
    const groupLabel = group.getAttribute("aria-label")?.replace(/^Cluster\s+/, "") ?? "";
    const cluster = clusters.find((item) => item.label === groupLabel);
    if (!cluster) return null;
    const query = root.querySelector<HTMLInputElement>('input[type="search"]')?.value ?? "";
    const visibleMembers = displayedMembers(cluster, new Map(moments.map((moment) => [moment.id, moment])), query);
    const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-moment-item]'));
    const index = buttons.indexOf(selectedButton);
    return index >= 0 ? visibleMembers[index]?.id ?? null : null;
  }, [clusters, moments]);

  const findButtonForMoment = useCallback((momentId: string): HTMLButtonElement | null => {
    const root = rootRef.current;
    if (!root) return null;
    const cluster = clusters.find((item) => item.memberIds.includes(momentId));
    if (!cluster) return null;
    const groups = Array.from(root.querySelectorAll<HTMLElement>('[role="group"][aria-label^="Cluster "]'));
    const group = groups.find((item) => item.getAttribute("aria-label") === `Cluster ${cluster.label}`);
    if (!group) return null;
    const query = root.querySelector<HTMLInputElement>('input[type="search"]')?.value ?? "";
    const visibleMembers = displayedMembers(cluster, new Map(moments.map((moment) => [moment.id, moment])), query);
    const index = visibleMembers.findIndex((moment) => moment.id === momentId);
    if (index < 0) return null;
    return group.querySelectorAll<HTMLButtonElement>('[data-moment-item]')[index] ?? null;
  }, [clusters, moments]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (selectedMomentId) {
      const target = findButtonForMoment(selectedMomentId);
      if (target && target.getAttribute("aria-selected") !== "true") target.click();
      return;
    }

    const selectedButton = root.querySelector<HTMLButtonElement>('[data-moment-item][aria-selected="true"]');
    if (selectedButton) {
      const macro = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === "MACRO");
      macro?.click();
    }
  }, [findButtonForMoment, selectedMomentId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scheduleSync = () => {
      if (syncFrameRef.current !== null) cancelAnimationFrame(syncFrameRef.current);
      syncFrameRef.current = requestAnimationFrame(() => {
        syncFrameRef.current = null;
        const nextId = resolveSelectedIdFromDom();
        if (nextId !== selectedMomentId) onSelectedMomentChange(nextId);
      });
    };

    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === "attributes" && record.attributeName === "aria-selected")) scheduleSync();
    });
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    return () => {
      observer.disconnect();
      if (syncFrameRef.current !== null) cancelAnimationFrame(syncFrameRef.current);
    };
  }, [onSelectedMomentChange, resolveSelectedIdFromDom, selectedMomentId]);

  return (
    <div
      ref={rootRef}
      data-testid="source60-native-product-explorer"
      data-product-selected-moment-id={selectedMomentId ?? ""}
    >
      <Lineage60ClusterExplorer moments={moments} clusters={clusters} bridges={bridges} />
    </div>
  );
}
