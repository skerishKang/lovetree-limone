export const V4_IMPLEMENTED_SOURCE_IDS = new Set<string>([
  "complete-manga-refinement",
  "step2-emotion-refined",
  "step3-connect-next-video",
  "growing-tree-v5-draggable-notes",
  "growing-tree-v6-fullscreen-add",
  "rest-return-flow-v2-simple",
  "tree-pause-issue-state-v1",
  "node-graph-prototype",
  "obsidian-graph1",
  "love-nebula",
  "juyeon-timeline",
  "person-albums",
  "motion-archive",
  "liquid-orbit-video-gallery",
  "accordion-album-archive",
  "folding-person-archive",
]);

export function v4SourceStatus(id: string): "planned" | "implemented" {
  return V4_IMPLEMENTED_SOURCE_IDS.has(id) ? "implemented" : "planned";
}
