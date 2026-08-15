/**
 * Track61 V1.9 — progressive disclosure math (pure, framework-agnostic).
 *
 * These helpers implement the V1.9 material contract verified against the actual
 * Drive source (root `현재후보.html`, SHA-256 834fb634…):
 *
 *  - Small flow (<= 12 Moments): show all.
 *  - Large desktop flow (>= 30): lead 2 + Memory Cluster (collapsed middle) + tail 4.
 *  - Large mobile flow (>= 30): lead 1 + Memory Cluster + current/recent tail 4.
 *  - Branch > 5 children: early core + past omitted summary + recent branches.
 *  - Disclosure actions: 전체 펼치기 (expand all Moments), 모든 갈래 보기 (show all branches).
 *
 * The current Moment is always kept visible (authoritative). No UI chrome here —
 * rendering lives in the React component. Kept pure so it is unit-testable without a
 * browser (fail-closed: deterministic, no randomness, no timers).
 */

export interface DisclosureMoment {
  id: string;
  title: string;
  theme?: string;
  subject?: string;
  mediaType?: string;
  isCurrent?: boolean;
}

export interface MomentDisclosure {
  /** Always-visible leading Moments (before the Memory Cluster). */
  lead: DisclosureMoment[];
  /** Always-visible trailing Moments (after the Memory Cluster). */
  tail: DisclosureMoment[];
  /** Hidden middle Moments behind the Memory Cluster (expandable). */
  collapsedMiddle: DisclosureMoment[];
  collapsed: boolean;
  hiddenCount: number;
}

export interface BranchDisclosure {
  /** Always-visible early core + recent branches. */
  visible: DisclosureMoment[];
  /** Hidden past branches behind the "+N개 과거 갈래 숨김" summary. */
  collapsedMiddle: DisclosureMoment[];
  collapsed: boolean;
  hiddenCount: number;
}

const SMALL_LIMIT = 12;
const DESKTOP_LEAD = 2;
const MOBILE_LEAD = 1;
const TAIL = 4;

const BRANCH_LIMIT = 5;
const BRANCH_LEAD = 2;
const BRANCH_TAIL = 3;

function uniquePush(target: DisclosureMoment[], seen: Set<string>, moment: DisclosureMoment): void {
  if (seen.has(moment.id)) return;
  seen.add(moment.id);
  target.push(moment);
}

export function discloseMoments(
  moments: DisclosureMoment[],
  opts: { isMobile?: boolean; expandedAll?: boolean } = {},
): MomentDisclosure {
  const count = moments.length;
  if (opts.expandedAll || count <= SMALL_LIMIT) {
    return { lead: moments, tail: [], collapsedMiddle: [], collapsed: false, hiddenCount: 0 };
  }

  const leadCount = opts.isMobile ? MOBILE_LEAD : DESKTOP_LEAD;
  const seen = new Set<string>();
  const lead: DisclosureMoment[] = [];
  const tail: DisclosureMoment[] = [];
  moments.slice(0, leadCount).forEach((m) => uniquePush(lead, seen, m));
  moments.slice(count - TAIL).forEach((m) => uniquePush(tail, seen, m));

  // The current Moment must always stay authoritative/visible; keep it in the
  // recent (tail) region when it falls inside the collapsed middle.
  const current = moments.find((m) => m.isCurrent);
  if (current && !seen.has(current.id)) uniquePush(tail, seen, current);

  const collapsedMiddle = moments.filter((m) => !seen.has(m.id));
  return { lead, tail, collapsedMiddle, collapsed: true, hiddenCount: collapsedMiddle.length };
}

export function discloseBranches(
  children: DisclosureMoment[],
  opts: { showAllBranches?: boolean } = {},
): BranchDisclosure {
  const count = children.length;
  if (opts.showAllBranches || count <= BRANCH_LIMIT) {
    return { visible: children, collapsedMiddle: [], collapsed: false, hiddenCount: 0 };
  }

  const lead = children.slice(0, BRANCH_LEAD);
  const tail = children.slice(count - BRANCH_TAIL);
  const seen = new Set<string>();
  const visible: DisclosureMoment[] = [];
  lead.forEach((m) => uniquePush(visible, seen, m));
  tail.forEach((m) => uniquePush(visible, seen, m));

  const collapsedMiddle = children.filter((m) => !seen.has(m.id));
  return { visible, collapsedMiddle, collapsed: true, hiddenCount: collapsedMiddle.length };
}

/**
 * Build a deterministic synthetic stress flow of `count` connected Moments.
 * Used to demonstrate / verify V1.9 progressive disclosure at scale (e.g. 100).
 * Explicitly synthetic demo data — never backend truth.
 */
export function buildStressMoments(count: number): DisclosureMoment[] {
  const out: DisclosureMoment[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      id: `stress-${i}`,
      title: `연결된 순간 ${i + 1}`,
      theme: i % 2 === 0 ? "daily" : "travel",
      subject: i % 3 === 0 ? "하린" : "민서",
      mediaType: i % 4 === 0 ? "photo" : "video",
      isCurrent: i === count - 1,
    });
  }
  return out;
}
