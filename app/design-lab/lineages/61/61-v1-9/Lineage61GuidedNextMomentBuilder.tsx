"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./lineage-61.module.css";
import {
  discloseMoments,
  discloseBranches,
  type DisclosureMoment,
} from "./tree-disclosure";

/* ------------------------------------------------------------------ */
/* Demo fixtures — explicitly synthetic, never presented as backend.    */
/* Per Issue #158 policy boundary: counts / percentages / popularity /  */
/* fan quotes / fictional identities are PRODUCT_POLICY-free demo data.  */
/* Private Moment / memo / message are NEVER used as recommendation    */
/* basis (see DemoBoundary note below).                                 */
/* ------------------------------------------------------------------ */

type GrowAs = "main" | "branch";

type MediaType = "photo" | "video" | "shorts" | "interview";
type RepresentativeKind = "same-subject" | "different-subject" | "format-shift";

interface Moment {
  id: string;
  title: string;
  description: string;
  theme: string;
  subject: string;
  mediaType: MediaType;
  previewLabel: string;
}

interface Candidate {
  moment: Moment;
  recommendationReason: string;
  fanReaction: { quote: string; handle: string }[];
  /** SYNTHETIC demo popularity — not real metrics. */
  popularity: { cheers: number; views: number };
  detail: string;
}

const MOMENTS: Moment[] = [
  { id: "m-first", title: "처음 마주한 그날의 벤치", description: "햇살 아래 앉아 서로의 이름을 처음 묻던 순간.", theme: "first-meet", subject: "하린", mediaType: "photo", previewLabel: "공원 벤치 스틸" },
  { id: "m-daily", title: "매일의 출근 인사", description: "비가 오나 눈이 오나 현관에서 건넨 작은 목례.", theme: "daily", subject: "하린", mediaType: "photo", previewLabel: "현관 인사 포토" },
  { id: "m-confess", title: "고백했던 빗속 산책", description: "우산 하나로 둘이서 걸으며 털어놓은 마음.", theme: "confession", subject: "민서", mediaType: "photo", previewLabel: "빗속 산책 스틸" },
  { id: "m-travel", title: "바다가 보이는 여행", description: "이른 아침 해변에서 함께 찍은 사진 한 장.", theme: "travel", subject: "하린", mediaType: "video", previewLabel: "해변 여행 비디오 프리뷰" },
  { id: "m-gift", title: "손편지와 작은 선물", description: "생각지도 못한 날, 문 앞에 놓인 편지.", theme: "gift", subject: "지우", mediaType: "photo", previewLabel: "손편지 포토" },
  { id: "m-apology", title: "화해의 카페 대화", description: "서로의 서운함을 꺼내고 웃음으로 끝낸 저녁.", theme: "apology", subject: "민서", mediaType: "interview", previewLabel: "카페 대화 인터뷰 프리뷰" },
  { id: "m-anniv", title: "첫 기념일 저녁", description: "예약한 자리보다 서로의 눈빛이 더 기억에 남음.", theme: "anniversary", subject: "서윤", mediaType: "video", previewLabel: "기념일 비디오 프리뷰" },
  { id: "m-distance", title: "멀어진 거리의 전화", description: "시차를 넘어 건넨 '잘 자'라는 인사.", theme: "distance", subject: "지우", mediaType: "shorts", previewLabel: "통화 쇼츠 프리뷰" },
  { id: "m-reunion", title: "다시 만난 골목길", description: "우연처럼 마주친 골목에서 멈춘 두 발.", theme: "reunion", subject: "서윤", mediaType: "photo", previewLabel: "재회 골목 포토" },
];

const SYNTHETIC_FAN_QUOTES: Record<string, { quote: string; handle: string }[]> = {
  "m-first": [
    { quote: "벤치 앞에서 망설이는 연출이 너무 리얼해요.", handle: "@demo_fan_07" },
    { quote: "첫 이름을 묻는 타이밍에 콕 꽂혔습니다.", handle: "@demo_fan_21" },
  ],
  "m-daily": [
    { quote: "소소한 인사가 가장 오래 남아요.", handle: "@demo_fan_12" },
    { quote: "매일 반복되는 게 오히려 설레요.", handle: "@demo_fan_33" },
  ],
  "m-confess": [
    { quote: "비 소리가 배경음악처럼 느껴졌어요.", handle: "@demo_fan_04" },
    { quote: "우산 씬 보고 펑펑 울었답니다(데모).", handle: "@demo_fan_18" },
  ],
  "m-travel": [{ quote: "해변 사진 구도가 SNS용이에요.", handle: "@demo_fan_09" }],
  "m-gift": [{ quote: "편지 읽는 속도가 적절했어요.", handle: "@demo_fan_25" }],
  "m-apology": [{ quote: "서운함을 털어놓는 대사가 따뜻해요.", handle: "@demo_fan_02" }],
  "m-anniv": [{ quote: "눈빛 묘사만으로 분위기 전달됨.", handle: "@demo_fan_15" }],
  "m-distance": [{ quote: "잘 자 인사에 목소리가 들려요.", handle: "@demo_fan_31" }],
  "m-reunion": [{ quote: "우연한 마주침 설정이 미치죠.", handle: "@demo_fan_40" }],
};

const SYNTHETIC_POPULARITY: Record<string, { cheers: number; views: number }> = {
  "m-first": { cheers: 1820, views: 24100 },
  "m-daily": { cheers: 940, views: 12300 },
  "m-confess": { cheers: 2310, views: 30200 },
  "m-travel": { cheers: 1480, views: 19800 },
  "m-gift": { cheers: 760, views: 9900 },
  "m-apology": { cheers: 1120, views: 15600 },
  "m-anniv": { cheers: 2050, views: 27700 },
  "m-distance": { cheers: 1310, views: 17400 },
  "m-reunion": { cheers: 1690, views: 22100 },
};

const REASONS: Record<string, string> = {
  "m-first": "현재 Moment와 정서 곡선이 가장 가깝게 이어지는 시작점입니다.",
  "m-daily": "일상의 연속성을 강조하는 다음 단계로 자연스럽습니다.",
  "m-confess": "감정이 무루익은 시점의 고백으로 흐름이 선명해집니다.",
  "m-travel": "공간을 확장해 관계의 무대를 넓히는 추천 경로입니다.",
  "m-gift": "작은 서프라이즈로 정서 온도를 높이는 단계입니다.",
  "m-apology": "갈등 이후 회복을 보여주는 균형 잡힌 다음 순간입니다.",
  "m-anniv": "특별한 날의 무게를 더하는 기념 지점입니다.",
  "m-distance": "물리적 거리를 정서로 극복하는 전개입니다.",
  "m-reunion": "이야기를 한 번 더 모으는 귀환 지점입니다.",
};

const DETAILS: Record<string, string> = {
  "m-first": "장소: 공원 벤치 · 정서 톤: 설렘 · 예상 연결: 3개 지점",
  "m-daily": "장소: 현관 · 정서 톤: 안정 · 예상 연결: 2개 지점",
  "m-confess": "장소: 골목 · 정서 톤: 전율 · 예상 연결: 4개 지점",
  "m-travel": "장소: 해변 · 정서 톤: 확장 · 예상 연결: 3개 지점",
  "m-gift": "장소: 문 앞 · 정서 톤: 온기 · 예상 연결: 2개 지점",
  "m-apology": "장소: 카페 · 정서 톤: 회복 · 예상 연결: 3개 지점",
  "m-anniv": "장소: 레스토랑 · 정서 톤: 특별 · 예상 연결: 3개 지점",
  "m-distance": "장소: 전화 · 정서 톤: 그리움 · 예상 연결: 2개 지점",
  "m-reunion": "장소: 골목 · 정서 톤: 귀환 · 예상 연결: 3개 지점",
};

const THEMES = ["all", "first-meet", "daily", "confession", "travel", "gift", "apology", "anniversary", "distance", "reunion"];

function buildCandidate(moment: Moment): Candidate {
  return {
    moment,
    recommendationReason: REASONS[moment.id] ?? "현재 흐름과 연결되는 자연스러운 다음 지점입니다.",
    fanReaction: SYNTHETIC_FAN_QUOTES[moment.id] ?? [],
    popularity: SYNTHETIC_POPULARITY[moment.id] ?? { cheers: 0, views: 0 },
    detail: DETAILS[moment.id] ?? "추가 메타데이터 없음.",
  };
}

const CANDIDATES: Candidate[] = MOMENTS.map(buildCandidate);
const CANDIDATE_BY_MOMENT = new Map(CANDIDATES.map((c) => [c.moment.id, c]));

interface RepresentativeChoice {
  candidate: Candidate;
  kind: RepresentativeKind;
  label: string;
}

function buildRepresentativeChoices(current: Moment, candidates: Candidate[]): RepresentativeChoice[] {
  const used = new Set<string>();
  const choices: RepresentativeChoice[] = [];
  const take = (kind: RepresentativeKind, label: string, predicate: (candidate: Candidate) => boolean) => {
    const candidate = candidates.find((item) => !used.has(item.moment.id) && predicate(item));
    if (!candidate) return;
    used.add(candidate.moment.id);
    choices.push({ candidate, kind, label });
  };

  take("same-subject", "같은 인물 심화", (item) => item.moment.subject === current.subject);
  take("different-subject", "다른 인물 분기", (item) => item.moment.subject !== current.subject);
  take("format-shift", "다른 콘텐츠 형식", (item) => item.moment.mediaType !== current.mediaType);

  if (choices.length !== 3) {
    throw new Error(`Representative grammar requires 3 semantic choices for ${current.id}`);
  }
  return choices;
}

interface PathNode {
  id: string;
  momentId: string;
  growAs: GrowAs;
  whyNext: string;
  parentId: string | null;
  children: string[];
}

let nodeCounter = 0;
function makeNode(momentId: string, parentId: string | null): PathNode {
  nodeCounter += 1;
  return { id: `n${nodeCounter}`, momentId, growAs: "main", whyNext: "", parentId, children: [] };
}

/** Pre-order flatten of the connected tree into an ordered Moment list (for V1.9 disclosure). */
function flattenConnected(nodes: Record<string, PathNode>, rootId: string): DisclosureMoment[] {
  const out: DisclosureMoment[] = [];
  const visit = (id: string) => {
    const node = nodes[id];
    if (!node) return;
    const moment = CANDIDATE_BY_MOMENT.get(node.momentId)?.moment;
    out.push({
      id: node.id,
      title: moment?.title ?? node.momentId,
      theme: moment?.theme,
      subject: moment?.subject,
      mediaType: moment?.mediaType,
      isCurrent: false,
    });
    node.children.forEach(visit);
  };
  visit(rootId);
  return out;
}

/**
 * Deterministic stress tree: root + `count` direct children cycling the real
 * fixtures (for V1.9 scale demo). Flat shape exercises both the flat connected-flow
 * Memory Cluster disclosure and the Story Path branch disclosure without a
 * 100-deep nested DOM.
 */
function buildStressNodes(count: number): Record<string, PathNode> {
  const map: Record<string, PathNode> = {};
  map.root = { ...makeNode(MOMENTS[0].id, null), id: "root" };
  for (let i = 0; i < count; i += 1) {
    const momentId = MOMENTS[i % MOMENTS.length].id;
    const child = makeNode(momentId, "root");
    map[child.id] = child;
    map.root.children.push(child.id);
  }
  return map;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 600px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return mobile;
}

export default function Lineage61GuidedNextMomentBuilder() {
  const baseId = useId();
  const [currentMomentId, setCurrentMomentId] = useState<string>(MOMENTS[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [whyNext, setWhyNext] = useState<string>("");
  const [growAs, setGrowAs] = useState<GrowAs>("main");
  const [theme, setTheme] = useState<string>("all");
  const [expanded, setExpanded] = useState<boolean>(false);
  const [currentNodeId, setCurrentNodeId] = useState<string>(() => "root");
  const [nodes, setNodes] = useState<Record<string, PathNode>>(() => ({
    root: { ...makeNode(MOMENTS[0].id, null), id: "root" },
  }));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState<string>("");

  /* V1.9 disclosure state (deterministic). */
  const [expandedAll, setExpandedAll] = useState<boolean>(false);
  const [clusterExpanded, setClusterExpanded] = useState<boolean>(false);
  const [showAllBranches, setShowAllBranches] = useState<boolean>(false);
  const [handoffNote, setHandoffNote] = useState<string>("");

  const isMobile = useIsMobile();

  const currentMoment = useMemo(
    () => MOMENTS.find((m) => m.id === currentMomentId) ?? MOMENTS[0],
    [currentMomentId],
  );

  const connectedMoments = useMemo<DisclosureMoment[]>(() => {
    const flat = flattenConnected(nodes, "root");
    const current = flat.find((m) => m.id === currentNodeId);
    if (current) current.isCurrent = true;
    return flat;
  }, [nodes, currentNodeId]);

  const momentDisclosure = useMemo(
    () => discloseMoments(connectedMoments, { isMobile, expandedAll: expandedAll || clusterExpanded }),
    [connectedMoments, isMobile, expandedAll, clusterExpanded],
  );

  const pool = useMemo(() => {
    const filtered = CANDIDATES.filter(
      (c) => c.moment.id !== currentMomentId && (theme === "all" || c.moment.theme === theme),
    );
    return filtered;
  }, [currentMomentId, theme]);

  const representative = useMemo(
    () => buildRepresentativeChoices(
      currentMoment,
      CANDIDATES.filter((candidate) => candidate.moment.id !== currentMomentId),
    ),
    [currentMoment, currentMomentId],
  );

  const selectedCandidate = selectedId ? CANDIDATE_BY_MOMENT.get(selectedId) ?? null : null;

  const selectCandidate = useCallback((momentId: string) => {
    const candidate = CANDIDATE_BY_MOMENT.get(momentId);
    setSelectedId(momentId);
    setWhyNext(candidate?.recommendationReason ?? "");
  }, []);

  const confirmSelection = useCallback(() => {
    if (!selectedCandidate) return;
    const parent = nodes[currentNodeId];
    if (!parent) return;
    const child = makeNode(selectedCandidate.moment.id, currentNodeId);
    child.growAs = growAs;
    child.whyNext = whyNext.trim();
    setNodes((prev) => ({
      ...prev,
      [parent.id]: { ...parent, children: [...parent.children, child.id] },
      [child.id]: child,
    }));
    setCurrentNodeId(child.id);
    setCurrentMomentId(selectedCandidate.moment.id);
    setAnnounce(
      `'${selectedCandidate.moment.title}'을(를) ${growAs === "branch" ? "Branch" : "Main"}으로 연결했습니다. 다음 선택지를 새로 받았습니다.`,
    );
    setSelectedId(null);
    setWhyNext("");
    setGrowAs("main");
    setTheme("all");
    setExpanded(false);
  }, [selectedCandidate, growAs, whyNext, currentNodeId, nodes]);

  const continueFromNode = useCallback((nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return;
    setCurrentNodeId(nodeId);
    setCurrentMomentId(node.momentId);
    setSelectedId(null);
    setWhyNext("");
    setGrowAs("main");
    setTheme("all");
    setExpanded(false);
    setAnnounce(`'${CANDIDATE_BY_MOMENT.get(node.momentId)?.moment.title ?? node.momentId}' 지점에서 이어서 진행합니다. Branch를 추가로 만들 수 있습니다.`);
  }, [nodes]);

  const loadStressFlow = useCallback((count: number) => {
    const stress = buildStressNodes(count);
    const lastId = stress.root.children[stress.root.children.length - 1] ?? "root";
    stress[lastId].growAs = "main";
    setNodes(stress);
    setCurrentNodeId(lastId);
    setCurrentMomentId(stress[lastId].momentId);
    setExpandedAll(false);
    setClusterExpanded(false);
    setShowAllBranches(false);
    setAnnounce(`${count}개 연결 흐름 데모를 불러왔습니다 (V1.9 progressive disclosure).`);
  }, []);

  /* ----------------------------- Modal ----------------------------- */
  const detailCandidate = detailId ? CANDIDATE_BY_MOMENT.get(detailId) ?? null : null;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const openDetail = useCallback((momentId: string, trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    setDetailId(momentId);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    const target = previouslyFocused.current ?? triggerRef.current;
    if (target && typeof target.focus === "function") {
      target.focus();
    }
  }, []);

  useEffect(() => {
    if (!detailCandidate) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
    const first = focusables()[0];
    (first ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDetail();
        return;
      }
      if (event.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        const active = document.activeElement as HTMLElement;
        if (event.shiftKey && active === firstEl) {
          event.preventDefault();
          lastEl.focus();
        } else if (!event.shiftKey && active === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [detailCandidate, closeDetail]);

  const onDialogSurface = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDetail();
    }
  };

  const onTrack56Handoff = useCallback(() => {
    // V1.9 Path Card handoff meaning: "전체 경로에서 보기 ↗" → Track56 full overview.
    // Track56 handoff has NO real receiver/route proof yet (HOLD) — disclose honestly, do NOT false-green.
    setHandoffNote(
      "Track56 전체 경로(handoff)는 아직 수신 측 route/receiver proof 없이 HOLD입니다. Track61은 현재 연결 흐름 working view이며 전체 Tree overview는 Track56 소유입니다.",
    );
  }, []);

  const renderMomentItem = (m: DisclosureMoment, key: string) => (
    <li key={key} className={styles.flowItem} data-flow-moment={m.id} data-current={m.isCurrent ? "true" : undefined}>
      <span className={styles.flowDot} aria-hidden="true" />
      <span className={styles.flowTitle}>{m.title}</span>
      {m.isCurrent ? <span className={styles.flowCurrentTag}>현재</span> : null}
    </li>
  );

  return (
    <main className={styles.lab} id={`${baseId}-main`}>
      <a className={styles.skip} href={`#${baseId}-loop`}>본문으로 건너뛰기</a>

      <header className={styles.labHeader}>
        <div>
          <p className={styles.eyebrow}>Track61 · Lineage 61 · V1.9 (source reconciled · scale + Memory Glass implemented)</p>
          <h1 className={styles.labTitle}>Guided Next Moment LoveTree Builder</h1>
          <a className={styles.back} href="/design-lab">← Design Lab</a>
        </div>
        <p style={{ maxWidth: 360, color: "var(--lt61-muted)", margin: 0, fontSize: 13 }}>
          현재 Moment에서 시작해 다음 Moment 후보를 탐색하고, WHY NEXT를 직접 정해 Main/Branch로
          내 나무를 키웁니다. 모든 수치·팬 반응·가상 인물은 데모 픽스처입니다.
        </p>
      </header>

      <div className={styles.demoBanner} role="note">
        <span aria-hidden="true">⚠</span>
        <span>
          <strong>데모 픽스처 경계:</strong> 인기 수치(cheers/views), 팬 인용구, 가상 인물은 백엔드
          사실이 아닌 프로토타입 데모 데이터입니다. 비공개 Moment·메모·메시지는 추천 근거로 사용되지 않습니다.
        </span>
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className={styles.toggleBtn} onClick={() => loadStressFlow(100)}>
          100-Moment 연결 흐름 데모 (V1.9 scale)
        </button>
        {connectedMoments.length > 12 && (
          <button type="button" className={styles.toggleBtn} aria-pressed={expandedAll} onClick={() => { setExpandedAll((v) => !v); setClusterExpanded(false); }}>
            {expandedAll ? "축약 상태로" : "전체 펼치기"}
          </button>
        )}
        {momentDisclosure.collapsed && (
          <button type="button" className={styles.toggleBtn} aria-pressed={clusterExpanded} onClick={() => setClusterExpanded((v) => !v)}>
            {clusterExpanded ? "Memory Cluster 접기" : "+N 기억 묶음 펼치기"}
          </button>
        )}
      </div>

      <div className={styles.grid} id={`${baseId}-loop`}>
        <section className={styles.panel} aria-labelledby={`${baseId}-flow`}>
          <h2 className={styles.panelTitle} id={`${baseId}-flow`}>다음 Moment 선택 흐름</h2>

          <div className={`${styles.panel} ${styles.currentMoment}`} style={{ marginBottom: 16 }}>
            <p className={styles.eyebrow}>현재 Moment (Current)</p>
            <p className={styles.momentTitle}>{currentMoment.title}</p>
            <p className={styles.momentDesc}>{currentMoment.description}</p>
            <button type="button" className={styles.handoffBtn} data-track56-handoff onClick={onTrack56Handoff}>
              전체 경로에서 보기 ↗
            </button>
            {handoffNote && (
              <p className={styles.handoffNote} role="status" aria-live="polite">
                {handoffNote}
              </p>
            )}
          </div>

          <h3 className={styles.panelTitle}>대표 3선 (Representative choices)</h3>
          <div className={styles.repRow}>
            {representative.map(({ candidate: c, kind, label }, idx) => (
              <button
                key={c.moment.id}
                type="button"
                className={styles.repCard}
                data-selected={selectedId === c.moment.id}
                data-representative-kind={kind}
                data-subject={c.moment.subject}
                data-media-type={c.moment.mediaType}
                aria-pressed={selectedId === c.moment.id}
                onClick={() => selectCandidate(c.moment.id)}
                onDoubleClick={(e) => openDetail(c.moment.id, e.currentTarget)}
              >
                <span className={styles.repBadge}>{idx + 1}. {label}</span>
                <div className={styles.poolTitle}>{c.moment.title}</div>
                <div className={styles.poolMeta}>{c.moment.subject} · {c.moment.mediaType} · {c.moment.theme}</div>
                <div className={styles.poolMeta} data-demo-media-preview>
                  미디어 미리보기: {c.moment.previewLabel} (demo)
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className={styles.toggleBtn}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "추천 풀 닫기" : "추천 풀 펼치기 (expanded pool)"}
            </button>
          </div>

          {expanded && (
            <div style={{ marginTop: 12 }}>
              <div className={styles.filters} role="group" aria-label="테마 필터">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={styles.chip}
                    aria-pressed={theme === t}
                    onClick={() => setTheme(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <ul className={styles.pool} style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {pool.map((c) => (
                  <li key={c.moment.id}>
                    <button
                      type="button"
                      className={styles.poolItem}
                      data-pool-candidate={c.moment.id}
                      data-pool-theme={c.moment.theme}
                      data-selected={selectedId === c.moment.id}
                      aria-pressed={selectedId === c.moment.id}
                      onClick={() => selectCandidate(c.moment.id)}
                      onDoubleClick={(e) => openDetail(c.moment.id, e.currentTarget)}
                    >
                      <span className={styles.poolMain}>
                        <span className={styles.poolTitle}>{c.moment.title}</span>
                        <span className={styles.poolMeta}> · {c.moment.subject} · {c.moment.mediaType} · {c.moment.theme}</span>
                      </span>
                      <span className={styles.ghostBtn} aria-hidden="true">상세</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>선택 확정</h3>
          {selectedCandidate ? (
            <div>
              <p style={{ margin: "0 0 8px" }}>
                선택한 후보: <strong>{selectedCandidate.moment.title}</strong>
              </p>
              <p className={styles.poolMeta} data-selected-media>
                {selectedCandidate.moment.subject} · {selectedCandidate.moment.mediaType} · {selectedCandidate.moment.previewLabel}
              </p>
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={(event) => openDetail(selectedCandidate.moment.id, event.currentTarget)}
              >
                선택 후보 상세보기
              </button>
              <div className={styles.growRow} role="radiogroup" aria-label="Main 또는 Branch로 연결">
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name={`${baseId}-grow`}
                    checked={growAs === "main"}
                    onChange={() => setGrowAs("main")}
                  />
                  Main (주 줄기)
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name={`${baseId}-grow`}
                    checked={growAs === "branch"}
                    onChange={() => setGrowAs("branch")}
                  />
                  Branch (분기)
                </label>
              </div>
              <label htmlFor={`${baseId}-why`} style={{ display: "block", color: "var(--lt61-muted)", marginBottom: 6 }}>
                WHY NEXT (직접 편집)
              </label>
              <textarea
                id={`${baseId}-why`}
                className={styles.textarea}
                value={whyNext}
                onChange={(e) => setWhyNext(e.target.value)}
                placeholder="이 다음 Moment를 고른 이유를 적어보세요."
              />
              <div style={{ marginTop: 12 }}>
                <button type="button" className={styles.primaryBtn} onClick={confirmSelection}>
                  이 Moment로 내 나무 키우기
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--lt61-muted)" }}>위에서 후보를 하나 선택하세요.</p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby={`${baseId}-connected`}>
          <h2 className={styles.panelTitle} id={`${baseId}-connected`}>연결된 흐름 (Connected flow · V1.9 disclosure)</h2>
          <p style={{ color: "var(--lt61-muted)", fontSize: 13, marginTop: 0 }}>
            현재 연결된 감정 흐름을 다룹니다. 큰 흐름은 시작 · Memory Cluster · 최근 순으로 압축되며,
            전체 Tree overview는 Track56 소유입니다.
          </p>
          {connectedMoments.length === 0 ? (
            <p style={{ color: "var(--lt61-muted)" }}>아직 연결된 Moment가 없습니다.</p>
          ) : (
            <ul className={styles.flow} style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {momentDisclosure.lead.map((m) => renderMomentItem(m, `lead-${m.id}`))}
              {momentDisclosure.collapsed && !clusterExpanded && (
                <li key="cluster" className={styles.memoryCluster}>
                  <button
                    type="button"
                    className={styles.clusterBtn}
                    aria-expanded={false}
                    onClick={() => setClusterExpanded(true)}
                  >
                    +{momentDisclosure.hiddenCount} Moment · 기억 묶음
                  </button>
                </li>
              )}
              {clusterExpanded && momentDisclosure.collapsedMiddle.map((m) => renderMomentItem(m, `mid-${m.id}`))}
              {momentDisclosure.tail.map((m) => renderMomentItem(m, `tail-${m.id}`))}
            </ul>
          )}
          {connectedMoments.length > 12 && (
            <button type="button" className={styles.toggleBtn} style={{ marginTop: 10 }} aria-pressed={showAllBranches} onClick={() => setShowAllBranches((v) => !v)}>
              {showAllBranches ? "갈래 축약하기" : "모든 갈래 보기"}
            </button>
          )}
        </section>

        <section className={styles.panel} aria-labelledby={`${baseId}-path`}>
          <h2 className={styles.panelTitle} id={`${baseId}-path`}>Story Path (즉시 동기화 · Branch disclosure)</h2>
          <p style={{ color: "var(--lt61-muted)", fontSize: 13, marginTop: 0 }}>
            선택할 때마다 경로가 갱신됩니다. 아무 노드나 눌러 그 지점에서 분기(Branch)를 이어갈 수 있습니다.
            Branch가 5개를 넘으면 과거 갈래는 접힙니다.
          </p>
          <ul className={styles.path} style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {renderPath(nodes, "root", currentNodeId, continueFromNode, styles, showAllBranches)}
          </ul>
        </section>
      </div>

      <p className={styles.live} role="status" aria-live="polite">
        {announce}
      </p>

      {detailCandidate && (
        <div className={styles.overlay}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${baseId}-dlg-title`}
            ref={dialogRef}
            onKeyDown={onDialogSurface}
          >
            <button type="button" className={styles.dialogClose} onClick={closeDetail}>
              닫기 (Esc)
            </button>
            <h2 id={`${baseId}-dlg-title`}>{detailCandidate.moment.title}</h2>

            <div className={styles.section} data-demo-media-detail>
              <h3>미디어 미리보기 (Demo media preview)</h3>
              <p style={{ margin: 0 }}>
                {detailCandidate.moment.previewLabel} · {detailCandidate.moment.subject} · {detailCandidate.moment.mediaType}
              </p>
              <p className={styles.synthetic}>정확한 source media/P8 fidelity를 주장하지 않는 interaction-only demo preview입니다.</p>
            </div>

            <div className={styles.section}>
              <h3>추천 근거 (Recommendation reason)</h3>
              <p style={{ margin: 0 }}>{detailCandidate.recommendationReason}</p>
            </div>

            <div className={styles.section}>
              <h3>팬 반응 (Fan reaction · 데모)</h3>
              {detailCandidate.fanReaction.length > 0 ? (
                detailCandidate.fanReaction.map((fr, i) => (
                  <p key={i} className={styles.fanQuote}>
                    “{fr.quote}” — {fr.handle}
                  </p>
                ))
              ) : (
                <p className={styles.fanQuote}>데모 팬 반응 없음.</p>
              )}
              <p className={styles.synthetic}>
                데모 수치: cheers {detailCandidate.popularity.cheers.toLocaleString()} · views{" "}
                {detailCandidate.popularity.views.toLocaleString()} — 백엔드 사실 아님.
              </p>
            </div>

            <div className={styles.section}>
              <h3>상세 (Detail)</h3>
              <p style={{ margin: 0 }}>{detailCandidate.detail}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function renderPath(
  nodes: Record<string, PathNode>,
  nodeId: string,
  currentNodeId: string,
  onContinue: (nodeId: string) => void,
  s: typeof styles,
  showAllBranches: boolean,
): ReactNode {
  const node = nodes[nodeId];
  if (!node) return null;
  const moment = CANDIDATE_BY_MOMENT.get(node.momentId)?.moment;

  // V1.9 Branch disclosure: > 5 children → early core + past omitted + recent.
  const childMoments = node.children.map((childId) => {
    const child = nodes[childId];
    const cm = child ? CANDIDATE_BY_MOMENT.get(child.momentId)?.moment : undefined;
    return {
      id: childId,
      title: cm?.title ?? child?.momentId ?? childId,
    };
  });
  const branch = discloseBranches(childMoments, { showAllBranches });

  return (
    <li key={nodeId} className={s.pathNode}>
      <button
        type="button"
        className={`${s.nodeBtn} ${node.growAs === "branch" ? s.nodeBranch : ""}`}
        aria-current={nodeId === currentNodeId ? "step" : undefined}
        onClick={() => onContinue(nodeId)}
      >
        {node.id !== "root" && (
          <span className={s.nodeTag}>{node.growAs === "branch" ? "Branch · " : "Main · "}</span>
        )}
        {node.id === "root" ? "시작 Moment" : moment?.title ?? node.momentId}
        {node.whyNext ? <span className={s.nodeWhy}> — WHY: {node.whyNext}</span> : null}
      </button>
      {node.children.length > 0 && (
        <ul className={s.path} style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {branch.visible.map((cm) => renderPath(nodes, cm.id, currentNodeId, onContinue, s, showAllBranches))}
          {branch.collapsed && (
            <li key={`${nodeId}-branch-collapsed`} className={s.branchCollapsed}>
              <span aria-hidden="true">+{branch.hiddenCount}개 과거 갈래 숨김</span>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
