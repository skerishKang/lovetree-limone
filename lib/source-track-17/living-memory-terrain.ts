import type { MemoryRecord } from "@/lib/tree-types";

export const TRACK17_LIVING_MEMORY_TERRAIN_SOURCE = {
  family: "Drive Track17 Living Memory Terrain",
  folderName: "17_리빙메모리지형",
  driveFolderId: "1FLKFJZrTFl6vk5P1NxqaqDerctFshrtM",
  filename: "01_리빙메모리지형_현재채택_가로화면안전_v1-2.html",
  driveFileId: "12KgvI1OsJKjrv-zPOqsQOvH9cS4QovjM",
  bytes: 1_953_464,
  sha256: "2110fabd6e7ad4362e65af8474f66e5b468fb342dc9c96a0ca78930b225e694e",
  repositorySnapshot: "old/reference/source-tracks-snapshot/17_리빙메모리지형/01_리빙메모리지형_현재채택_가로화면안전_v1-2.html",
  namespaceGuard: "DRIVE_TRACK17_LIVING_MEMORY_TERRAIN_NE_HISTORICAL_GITHUB_TRACK17_GLOBAL_SHELL",
  disposition: "USE_AS_VISUAL_FUNCTION_DONOR",
} as const;

export interface LivingTerrainNode {
  id: string;
  x: number;
  y: number;
  depth: number;
  index: number;
  memory: MemoryRecord;
}

export interface LivingTerrainEdge {
  fromId: string;
  toId: string;
  reason: string | null;
}

export interface LivingTerrainProjection {
  nodes: LivingTerrainNode[];
  edges: LivingTerrainEdge[];
  orphanConnectionCount: number;
  maxDepth: number;
}

function stableJitter(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 13) - 6;
}

function ancestryDepth(memory: MemoryRecord, byId: Map<string, MemoryRecord>): number {
  let depth = 0;
  let current = memory;
  const seen = new Set<string>([memory.id]);

  while (current.parentId && depth < 32) {
    const parent = byId.get(current.parentId);
    if (!parent || seen.has(parent.id)) break;
    depth += 1;
    seen.add(parent.id);
    current = parent;
  }

  return depth;
}

/**
 * Builds presentation geometry only from canonical Moment rows.
 *
 * The original sibling source hardcodes sample M01..M05 rows, return counts and
 * a Season state. None of those are product data. This projection intentionally
 * derives only deterministic screen coordinates and parent-child edges; it does
 * not infer emotion scores, revisit counts, seasons, importance or new domain truth.
 */
export function projectCanonicalLivingTerrain(
  moments: readonly MemoryRecord[],
): LivingTerrainProjection {
  const rows = [...moments];
  const byId = new Map(rows.map((memory) => [memory.id, memory]));
  const depths = rows.map((memory) => ancestryDepth(memory, byId));
  const maxDepth = depths.reduce((max, depth) => Math.max(max, depth), 0);

  const nodes = rows.map<LivingTerrainNode>((memory, index) => {
    const progress = rows.length <= 1 ? 0.5 : index / (rows.length - 1);
    const depth = depths[index] ?? 0;
    const branchBand = depth % 5;
    const y = Math.max(18, Math.min(82, 48 + (branchBand - 2) * 9 + stableJitter(memory.id) * 0.8));
    return {
      id: memory.id,
      index,
      depth,
      x: 10 + progress * 80,
      y,
      memory,
    };
  });

  const edges: LivingTerrainEdge[] = [];
  let orphanConnectionCount = 0;
  for (const memory of rows) {
    if (!memory.parentId) continue;
    if (!byId.has(memory.parentId)) {
      orphanConnectionCount += 1;
      continue;
    }
    edges.push({
      fromId: memory.parentId,
      toId: memory.id,
      reason: memory.connectionReason?.trim() || null,
    });
  }

  return { nodes, edges, orphanConnectionCount, maxDepth };
}
