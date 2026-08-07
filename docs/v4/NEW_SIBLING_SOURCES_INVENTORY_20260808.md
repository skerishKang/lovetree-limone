# 컴2 — LoveTree 신규 디자인 소스 전수발굴 + 차이분석 + 격리 구현 기록

- 작성일: 2026-08-08
- Branch: `feat/new-sibling-design-sources-20260808`
- Base: `origin/main` (`97aa06294d328ed0e816ee8518699d735ac41231`)
- Source folder: `텔레그램다운로드폴더/` (Google Drive/Telegram download)
- Reference copy: `reference/v4-sibling-new-sources/`

---

## 1. 발견된 신규 HTML (fingerprint)

동일 SHA는 duplicate로 묶었다. `main`의 v4 source manifest(29건)와 대조했을 때
이미 등록된 source와 SHA가 동일한 파일은 EXACT_DUP으로 분류했다.

### A. Template Composer family

| 파일 | size | SHA-256 | title | VERSION/BASE/STATUS | 소스 위치 |
|---|---|---|---|---|---|
| lovetree-auto-unfold-template-composer-v2.4-youtube-fixed.html | 87,256 | `c30d6e1c…3cc3d4c` | LoveTree Template Composer v2.4 · YouTube Fixed | VERSION v2.4 · BASE v2.3 · STATUS design-review | 텔레그램다운로드폴더/ |
| lovetree-auto-unfold-mindmap-form-v1.html | 38,962 | `cf3f2f77…0f0f56` | LoveTree Structure Unfold | v1 (BASE/STATUS 미표기) | 텔레그램다운로드폴더/ |

- 독립형(self-contained): v2.4는 외부 asset 의존 없음(0 ref). mindmap-form도 외부 의존 없음.
- v2.4 고유 기능: template tabs(Basic/Person/Emotion/Season), SVG 캔버스 pan/zoom/fit, 노드·엣지 드래그,
  노드/엣지 편집 drawer, YouTube URL 파싱+미리보기 적용, media(이미지/영상/음성) 로컬 미리보기,
  library 템플릿 drag-to-canvas, unfold 재생 애니메이션, progress rail.

### B. Live Flow Map family

| 파일 | size | SHA-256 | title | VERSION/BASE/STATUS | 소스 위치 |
|---|---|---|---|---|---|
| lovetree-live-flow-map-v1-1.html | 56,457 | `240e940d…49224fb` | LoveTree Live Flow Map v1.1 · Media Nodes | v1.1 (BASE/STATUS 미표기) | 텔레그램다운로드폴더/ |

- 독립형이나 media node가 `lovetree-live-flow-map-v1-1-assets/moment-0*.mp4` 참조(없으면 video empty state).
- v1.1 고유 기능: 15개 노드/16개 엣지 SVG 라이브 네트워크, shape(square/circle/heart), view(auto/focus/sparse/dense),
  필터(person/season/emotion), speed slider, replay/pause, 연결 이유 라벨, 에너지 패킷, 라이브 지표,
  video modal(로컬 파일 교체/업로드), 모바일 하단 시트 디테일.

### C. Living Memory Terrain family

| 파일 | size | SHA-256 | title | VERSION/BASE/STATUS | 소스 위치 |
|---|---|---|---|---|---|
| lovetree-living-memory-terrain-v1-2-standalone.html | 1,953,464 | `2110fabd…5e694e` | LoveTree · Living Memory Terrain v1.2 · Landscape Safe | v1.2 standalone · Landscape Safe | 텔레그램다운로드폴더/ |
| lovetree-living-video-memory-graph-v1.html | 36,008 | `c6e1dccc…28da061` | LoveTree · Living Video Memory Graph | v1 | 텔레그램다운로드폴더/ |

- terrain v1.2: 완전 self-contained(외부 ref 0). 자체 three.js subset + WebGL terrain 렌더러.
- 기능: layered terrain(DISCOVERY/RETURN/STAY), moment field, connection trace, return pulse,
  season formation boundary, path replay, layer visibility toggle, 5 state dots, pointer 회전/줌, 모바일 탭.

### D. Season Aquarelle family

| 파일 | size | SHA-256 | title | VERSION/BASE/STATUS | 소스 위치 |
|---|---|---|---|---|---|
| lovetree-season-aquarelle-bloom-v3-cinematic-preview.html | 57,934 | `90cd3dd6…c843e8` | LoveTree · Season Aquarelle Bloom · Cinematic HTML Preview | v3 (preview) | 텔레그램다운로드폴더/ |

- **REJECTED_SOURCE 판정**: 검토판정서(재제작지시서/구현계약 포함)를 로컬 전체에서 찾지 못했고,
  파일이 참조하는 `lovetree-season-aquarelle-bloom-v3-preview-assets/`(40개 png)가 소스 폴더에 없음.
  즉 GATE FAIL 해소판 존재 여부를 확인할 수 없어 제품 구현 대상에서 제외하고 원본만 보존한다.

### E. 기타 신규 LoveTree HTML (main 미등록)

| 파일 | size | SHA-256 | title | 판정 |
|---|---|---|---|---|
| lovetree-48-neon-pilot-cinematic-hero-v1.html | 46,352 | `c409b18c…20dfe` | LoveTree 48 · Neon Pilot · Cinematic Hero v1 | VISUAL_VARIANT (cinematic 계열) |
| lovetree-cinematic-memory-portal-home-v3-bright-local-entry.html | 22,561 | `b8be6b49…83927f` | LoveTree · Bright Deep Entry | VISUAL_VARIANT (랜딩/포털 계열) |
| lovetree-cinematic-original-assets-v3.html | 1,689,407 | `15e50869…cf414` | LoveTree · Cinematic Memory Film | VISUAL_VARIANT (cinematic) |
| lovetree-cinematic-reference-faithful-v2.html | 3,030,255 | `a74511a2…2ce6` | LoveTree · Cinematic Reference Faithful v2 | VISUAL_VARIANT (cinematic) |
| lovetree-cinematic-reference-motion-v5-1-refined.html | 7,443,862 | `cbc9b365…6e6430` | LoveTree — 사랑의 기억이 자라는 시네마틱 여정 | IMPLEMENTED_EQUIVALENT (`/v4/cinematic`) |
| lovetree-cinematic-v6-international.html | 7,451,922 | `9a97ce9e…d17b` | LoveTree — International cinematic edition | VISUAL_VARIANT (cinematic) |
| lovetree-cosmic-video-memory-atlas-v1.html | 35,935 | `9d5b4b36…526` | LoveTree · Cosmic Video Memory Atlas | VISUAL_VARIANT (atlas/그래프) |
| lovetree-global-discovery-home-v1.html | 4,898,093 | `8c8a4c78…dd02` | LoveTree Discovery Home | VISUAL_VARIANT (랜딩/탐색) |
| lovetree-golden-heart-scroll-story-v1.html | 43,910 | `2adc32fd…898d` | LoveTree · Golden Heart Story | VISUAL_VARIANT (스크롤 스토리) |
| lovetree-memory-core-reactor-v2-lava-neon.html | 53,947 | `e86e0489…6f74d` | LoveTree Memory Core Reactor · Lava Neon | VISUAL_VARIANT (메모리 시각화) |
| lovetree-memory-film-studio-v1.html | 48,201 | `52bf3308…93d6` | LoveTree Memory Film Studio | **NEW_SCREEN** |
| lovetree-memory-graph-observatory-v1.html | 37,551 | `c5ea3a90…e753` | LoveTree Memory Graph Observatory | VISUAL_VARIANT (그래프) |
| lovetree-memory-pulse-dashboard-v1.html | 33,049 | `b302f128…84b8` | LoveTree Memory Pulse | PR#37 lab 구현됨 (DRAFT, 미병합) |
| lovetree-memory-scene-recipe-library-v1.html | 51,828 | `e36c7b13…f7ca2f` | LoveTree MemoryCraft — Memory Scene Recipes | PR#37 lab 구현됨 (DRAFT, 미병합) |
| lovetree-memory-topology-lab-v1.html | 37,920 | `88594f43…6c3b6` | LoveTree Memory Topology Lab | VISUAL_VARIANT (그래프) |
| lovetree-memory-universe-atlas-v1.html | 49,874 | `75b86ab3…8ec790` | LoveTree Memory Atlas | VISUAL_VARIANT (atlas) |
| lovetree-memory-universe-atlas-v4-pearl-atlas-360.html | 52,824 | `7c18a9e2…601e` | LoveTree Memory Atlas · Pearl Atlas 360 | VISUAL_VARIANT (atlas) |
| lovetree-memory-window-composer-v2.html | 427,043 | `8fd6a4f1…5a705` | LoveTree Memory Window Composer v2 | PR#37 lab 구현됨 (DRAFT, 미병합) |
| lovetree-moment-polish-lab-v1.html | 33,940 | `6f066360…89b9` | LoveTree Moment Polish Lab | PR#37 lab 구현됨 (DRAFT, 미병합) |
| lovetree-popup-season-memory-book-v1.html | 55,960 | `8537502c…5cbb7` | LoveTree Popup Season Book | **NEW_SCREEN** |
| lovetree-video-constellation-v3-dense-bookmarks-person-fix.html | 55,105 | `3833ac09…73476` | LoveTree · Neon Heart Constellation | VISUAL_VARIANT (그래프) |
| lovetree-video-memory-lore-map-v1.html | 47,351 | `2952440d…747f` | LoveTree · Video Memory Lore Map | VISUAL_VARIANT (지도) |
| lovetree-video-memory-workflow-v1.html | 36,370 | `438cbcbe…29ba` | LoveTree · Video Memory Workflow | VISUAL_VARIANT (워크플로) |
| lovetree-video-tearoff-memory-pad-v1.html | 36,195 | `63ab4938…750e` | LoveTree · 영상 기억 뜯어보기 | tearoff branch 구현됨 (미병합) |
| lovetree-vinyl-coverflow-video-gallery-v2.html | 23,965 | `ae9389a8…97fe25` | LoveTree · Vinyl Coverflow Video Gallery v2 | VISUAL_VARIANT (앨범) |
| lovetree-vinyl-video-memory-player-v1.html | 43,297 | `87cd2740…b52b` | LoveTree · Vinyl Video Memory Player | VISUAL_VARIANT (앨범) |
| lovetree-whole-picture-memory-dashboard-v1.html | 25,265 | `ed7c42c5…e41` | LoveTree · 좋아한 마음을 한눈에 | tearoff branch 구현됨 (미병합) |
| lovetree-first-journey-unified-v1.html | 111,950 | `3b61fe4b…17468` | LoveTree · 첫 여정 통합 | EXACT_DUP (main 29 source에 이미 SHA 동일) |
| lovetree-people-book-shelf-v2-1-true-page-motion.html | 74,978 | `cb64d803…33ca67` | LoveTree · 3D 사람별 책장 | EXACT_DUP |
| lovetree-people-book-shelf-v2-3d.html | 56,941 | `c5439af2…780df` | LoveTree · 3D 사람별 책장 | EXACT_DUP |
| lovetree-people-book-shelf-v2a-2-interaction-stable.html | 58,905 | `460a0c60…9bb49e` | LoveTree · 3D 사람별 책장 Motion Proof v2A-2 | EXACT_DUP |

---

## 2. 구현 대상 판정 (컴2)

### 자동 구현 (NEW_SCREEN / FUNCTIONAL_EXTENSION)

1. **Template Composer v2.4** — `NEW_SCREEN`. main 어디에도 없는 "템플릿 전개 편집기". → 구현
2. **Live Flow Map v1.1** — `NEW_SCREEN`. main의 static graph와 다른 "살아있는 라이브 플로우 맵". → 구현
3. **Living Memory Terrain v1.2** — `NEW_SCREEN`. main에 없는 "지형 기반 메모리 테라인". → 구현
4. **Memory Film Studio v1** — `NEW_SCREEN`. 메모리를 필름으로 연출하는 스튜디오 편집기. → 구현
5. **Popup Season Book v1** — `NEW_SCREEN`. 시즌을 페이퍼컷 팝업북으로 여는 경험. → 구현

### REJECTED_SOURCE (구현 제외, 원본 보존만)

6. **Season Aquarelle v3** — GATE FAIL 해소판 확인 불가 + asset 폴더 부재. → 보존

### 제외 사유 요약

- EXACT_DUP: `first-journey-unified-v1`, bookshelf 3종 — main 29 source와 SHA 동일(이미 구현).
- IMPLEMENTED_EQUIVALENT: `cinematic-reference-motion-v5-1` — `/v4/cinematic`으로 병합 완료.
- PR#37 lab(DRAFT): memory-pulse / scene-recipe-library / window-composer / moment-polish-lab — 별도 Draft PR #37에서 `/v4/labs/memory/` 구현됨(본 PR과 무관하게 존중).
- tearoff branch: video-tearoff-memory-pad / whole-picture-memory-dashboard — 미병합 브랜치에 이미 존재 → 중복 구현하지 않음.
- VISUAL_VARIANT: 그 외 cinematic/memory graph/atlas/vinyl 계열 — 기능이 main 화면과 동일하며 시각적 변형만 존재 → 이번 PR에서 구현하지 않음.

---

## 3. 격리 Preview 구조

- Namespace: `/v4/labs/incoming/`
- 구현 방식: 원본 iframe 금지, React/CSS source-faithful 구현
- 원본 HTML: `reference/v4-sibling-new-sources/`에 보존

| route | component | source |
|---|---|---|
| `/v4/labs/incoming` | index | — |
| `/v4/labs/incoming/template-composer` | `V4IncomingTemplateComposer` | lovetree-auto-unfold-template-composer-v2.4-youtube-fixed.html |
| `/v4/labs/incoming/live-flow-map` | `V4IncomingLiveFlowMap` | lovetree-live-flow-map-v1-1.html |
| `/v4/labs/incoming/memory-terrain` | `V4IncomingMemoryTerrain` | lovetree-living-memory-terrain-v1-2-standalone.html |
| `/v4/labs/incoming/film-studio` | `V4IncomingFilmStudio` | lovetree-memory-film-studio-v1.html |
| `/v4/labs/incoming/popup-season-book` | `V4IncomingPopupSeasonBook` | lovetree-popup-season-memory-book-v1.html |

- fixture/local state만 사용. production DB write · auth · API 변경 없음.
- 각 화면에 원본에 존재하는 click/drag/pan/zoom/animation/media preview/template switching/modal/keyboard를 실제로 동작하게 구현.

---

## 4. 검증 뷰포트

desktop 1536×960 · 1280×800 / tablet 768×1024 / mobile 390×844 · 320×720
(console error · page error · hydration error · horizontal overflow · broken asset · keyboard · reduced motion · touch)

---

## 5. 데이터 경계 — BACKEND_INTEGRATION_REQUIRED

이번 Preview는 디자인/interaction 검토가 목적이므로 **모든 화면이 fixture/local state만 사용**한다.

| 화면 | mock/fixture | 실제 backend 연결 시 필요 사항 (BACKEND_INTEGRATION_REQUIRED) |
|---|---|---|
| Template Composer | 템플릿 노드/엣지 데이터를 컴포넌트 상수로 내장, 로컬 미디어 objectURL, YouTube ID 파싱 | 템플릿 저장·불러오기, 노드/연결 CRUD API, 미디어 업로드·영속화, YouTube 메타데이터 수집 |
| Live Flow Map | 노드/엣지/필터 상태를 상수+useState로 유지, 로컬 영상 objectURL | 실제 Memory·Connection 데이터 바인딩, 영상 URL 영속화, 실시간 이벤트 소스 |
| Memory Terrain | 샘플 Moment 9개를 컴포넌트 상수로, 레이어/상태는 로컬 state | 실제 Moment·Connection·Season 데이터로 지형 생성, 재방문 수 통계 |
| Film Studio | 필름 프로젝트를 컴포넌트 state + localStorage(`lovetree-memory-film-studio-v1`) | 트리/시즌/코스 실데이터 선택, 프로젝트 저장 API, 실제 영상 소스, WebM/포스터 업로드 |
| Popup Season Book | 시즌·챕터·9개 순간을 상수로, 상태는 localStorage(`lovetree-popup-season-memory-book-v1`) | 실제 Season·Moment·YouTube 임베드 데이터, 북마크/공유 저장 |

- Production DB write 없음. auth/API/backend 변경 없음. 원본 HTML은 `reference/v4-sibling-new-sources/`에 보존.
- 각 화면의 localStorage 사용은 **Preview 전용 초안 복원** 목적이며 서버 데이터와 무관함.

