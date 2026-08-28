# LoveTree V4 Telegram 46 Source Classification — 2026-08-08

`B_TRACK_READY_FOR_V4_ADOPTION_GATE`

- Intake: `old/reference/v4-incoming-telegram-20260808` — 46 HTML confirmed.
- Baseline: `main` @ `97aa06294d328ed0e816ee8518699d735ac41231`.
- Analysis branch: `audit/v4-telegram-46-sources-20260808`.
- Detailed fingerprint/dependency inventory: [`TELEGRAM_46_SOURCE_INVENTORY_20260808.md`](./TELEGRAM_46_SOURCE_INVENTORY_20260808.md).
- No backend/Auth/DB change, no PR #37/#44 merge, no production deploy, no source move/delete.

## Counts

| Metric | Count |
|---|---:|
| Total incoming HTML | 46 |
| LoveTree | 29 |
| 사실로 reference | 7 |
| 단지온 reference | 4 |
| 이어온 reference | 2 |
| 파디엠 reference | 1 |
| Other cross-product reference | 3 |
| LOVETREE_NEW | 8 |
| LOVETREE_EVOLUTION | 9 |
| LOVETREE_VARIANT | 10 |
| LOVETREE_EXACT_DUPLICATE (product-lineage equivalent in current main) | 1 |
| LOVETREE_ASSET_DEPENDENCY | 0 |
| LOVETREE_BLOCKED_SOURCE | 1 |
| UNCLASSIFIED_PRESERVE | 0 |
| ADOPT_NEW_V4_SCREEN | 7 |
| UPGRADE_EXISTING_V4_SCREEN | 2 |
| MERGE_BEHAVIOR_INTO_EXISTING_V4 | 7 |
| Implementation candidates (adopt + upgrade + merge) | 16 |
| Intake-internal byte-identical duplicates | 0 |

`LOVETREE_EXACT_DUPLICATE=1` means current-main source-lineage equivalence for cinematic v5.1, not same-SHA duplication inside the 46 intake.

## Re-audit findings

- **Topology Lab overturned:** not a visual-only variant. It has people/season/feeling filters, 6 topology modes, LIVE/DENSE, rotate/zoom, hover links, inspector, telemetry/vectors/matrix → `LOVETREE_NEW`.
- **PR #37:** Pulse/Recipes/Polish/Window incoming files are exact preserved-source matches; no newer incoming revisions.
- **PR #44 Film Studio:** source fingerprint matches, but source implements real Poster PNG/WebM export while current port only toasts those actions. Repair export fidelity before adoption.
- **Tearoff / Whole Picture:** exact source overlaps exist on `feat/v4-telegram-p1-dashboard-tearoff`; branch is diverged, so re-port/rebase selectively after Gate.
- **Cinematic:** v5.1 is already source-faithfully realized on current `/v4/cinematic`; v6 is an evolution to merge into that route.
- **48 Neon Pilot:** blocked by five missing local assets.

## Final decision matrix

| Source | Project | Purpose / interactions | Existing V4 / overlap | Classification | Product value | Integration decision | Priority |
|---|---|---|---|---|---|---|---|
| `01_단지온_8월현장시연_통합시제품_v1_이미지리프레시.html` | 단지온 | 주거 생활 서비스·커뮤니티·현장 시연 통합 홈<br>search/filter · category/service cards · modal · save/edit/delete · localStorage · responsive state | Cross-product reference; no direct V4 route<br>— | `REFERENCE_DANJION` | High ref: service navigation, cards, search/filter, forms and stateful community patterns | `REFERENCE_ONLY` | **REF-H** |
| `01_사실로_사건관계추적_워크스페이스_v1.html` | 사실로 | 사건 사실·주장·증거 관계를 추적하는 작업공간<br>timeline · relation navigation · fact/claim filters · keyboard · local persistence | Cross-product reference; no direct V4 route<br>— | `REFERENCE_SASILRO` | High ref: progressive evidence/state workflow, relation view and provenance-heavy IA | `REFERENCE_ONLY` | **REF-H** |
| `02_광주북구_AI내비게이터_시네마틱홈_v1 (1).html` | 기타 | 질문→경로→결과→다음 행동으로 이어지는 행정 AI 내비게이터<br>question flow · search · route/result cards · modal · animated state transitions | Cross-product reference; no direct V4 route<br>— | `REFERENCE_OTHER` | High ref: question→path→result→action progressive navigation | `REFERENCE_ONLY` | **REF-H** |
| `06_motion-study.html` | 사실로 | 사실로 사건 워크스페이스의 모션·전환 연구<br>scene/state transitions · timeline/filter · keyboard · replay | Cross-product reference; no direct V4 route<br>— | `REFERENCE_SASILRO` | Med ref: scene/state transition and motion timing | `REFERENCE_ONLY` | **REF-M** |
| `another-universe-complete-shelf-fidelity-v1-self-contained.html` | 기타 | 3D 서가에서 작품·책을 탐색하고 펼치는 몰입형 라이브러리<br>3D camera · drag/wheel · shelf/book open · keyboard · modal · self-contained Three.js | Cross-product reference; no direct V4 route<br>— | `REFERENCE_OTHER` | Med ref: immersive 3D shelf/book interaction | `REFERENCE_ONLY` | **REF-M** |
| `another_universe_complete_shelf_fidelity_v1_art_direction_r1.html` | 기타 | Complete Shelf의 아트디렉션 강화판<br>3D shelf/book · camera/drag/wheel · refined cover/page motion · keyboard | Cross-product reference; no direct V4 route<br>— | `REFERENCE_OTHER` | High ref: refined 3D shelf art direction and cover interaction | `REFERENCE_ONLY` | **REF-H** |
| `danjion-community-platform-v1.html` | 단지온 | 아파트 공지·소식·혜택·게시를 묶는 커뮤니티 플랫폼<br>community nav · search/filter · modal · posting/media flow · responsive cards | Cross-product reference; no direct V4 route<br>— | `REFERENCE_DANJION` | Med ref: local community IA and card/navigation density | `REFERENCE_ONLY` | **REF-M** |
| `danjion-neighbor-life-v6-keyart-ultrablue-desktop.html` | 단지온 | 단지온 v6 키아트 검토용 wrapper<br>wrapper only; referenced local HTML missing from intake | Cross-product reference; no direct V4 route<br>— | `REFERENCE_DANJION` | Low ref: wrapper depends on missing sibling HTML | `REFERENCE_ONLY` | **REF-L** |
| `danjion-neighbor-life-v7-silly-color-system.html` | 단지온 | 단지 생활 서비스 탐색·비교·등록을 위한 컬러 키아트/서비스 홈<br>service discovery/filter · compare · finder/register modals/forms · animated keyart | Cross-product reference; no direct V4 route<br>— | `REFERENCE_DANJION` | High ref: service discovery, comparison, benefit cards and registration forms | `REFERENCE_ONLY` | **REF-H** |
| `gate3-core-product-flow.html` | 이어온 | 회사 기억·업무 흔적을 질의하고 관계로 추적하는 이어온 core flow<br>query · relation map · pan/zoom · drawer · evidence/detail state | Cross-product reference; no direct V4 route<br>— | `REFERENCE_IEON` | High ref: relation map + query + evidence drawer workflow | `REFERENCE_ONLY` | **REF-H** |
| `ieoon-executive-company-navigator-v2-cinematic-focus.html` | 이어온 | 경영 리스크·이슈·근거를 시간/관계로 탐색하는 Executive Navigator<br>risk navigator · timeline/relations · evidence drawer · action panel · keyboard | Cross-product reference; no direct V4 route<br>— | `REFERENCE_IEON` | High ref: executive hierarchy, timeline/relations/evidence/action panels | `REFERENCE_ONLY` | **REF-H** |
| `lovetree-48-neon-pilot-cinematic-hero-v1.html` | LoveTree | 네온 파일럿 스타일의 시네마틱 랜딩/히어로<br>scene timeline · autoplay/pause/mute/restart · hover/click; 5 external local images required | `/v4` V4Landing + `/v4/cinematic` V4Cinematic<br>— | `LOVETREE_BLOCKED_SOURCE` | High visual potential, but unusable faithfully until 5 local assets arrive | `BLOCKED_PENDING_ASSETS` | **P1-BLOCKED** |
| `lovetree-cinematic-memory-portal-home-v3-bright-local-entry.html` | LoveTree | 밝고 깊은 포털형 진입 홈<br>enter/exit · pointer parallax · keyboard · animated portal states | `/v4` V4Landing / `/v4/cinematic`<br>— | `LOVETREE_VARIANT` | Medium; strong entry mood but duplicates landing/cinematic job | `KEEP_AS_OPTIONAL_VARIANT` | **P2** |
| `lovetree-cinematic-original-assets-v3.html` | LoveTree | 초기 시네마틱 메모리 필름 실험<br>scene prev/next/restart/play · wheel/pointer navigation · cinematic transitions | `/v4/cinematic` V4Cinematic<br>— | `LOVETREE_VARIANT` | Low product delta; useful lineage reference | `REFERENCE_ONLY` | **P3** |
| `lovetree-cinematic-reference-faithful-v2.html` | LoveTree | 레퍼런스 충실형 시네마틱 필름 실험<br>autoplay/replay · scene navigation · keyboard · cinematic transitions | `/v4/cinematic` V4Cinematic<br>— | `LOVETREE_VARIANT` | Low product delta; useful lineage reference | `REFERENCE_ONLY` | **P3** |
| `lovetree-cinematic-reference-motion-v5-1-refined.html` | LoveTree | 16장면 시네마틱 브랜드 필름 원전<br>16-scene scroll · rail/menu · autoplay · motion masks · keyboard/reduced-motion | `/v4/cinematic` V4Cinematic<br>PR #35 lineage → current main `/v4/cinematic` | `LOVETREE_EXACT_DUPLICATE` | Already realized in current V4 | `NO_ACTION_EXACT_DUPLICATE` | **NO-ACTION** |
| `lovetree-cinematic-v6-international.html` | LoveTree | v5.1의 국제판/영문 모션 발전형<br>v5.1 scene engine + pointer-follow frame motion · English/global copy | `/v4/cinematic` V4Cinematic<br>current cinematic family evolution | `LOVETREE_EVOLUTION` | High; current cinematic gains international copy + pointer-frame refinement | `UPGRADE_EXISTING_V4_SCREEN` | **P1** |
| `lovetree-cosmic-video-memory-atlas-v1.html` | LoveTree | 영상 기억을 우주 지도처럼 배치·필터·탐색하는 atlas<br>drag/pan/zoom · layout auto/orbit/timeline · filter · node detail/video modal · YouTube | `/v4/trees/demo/map` V4ObsidianMap + `/graph` V4FreeGraph<br>— | `LOVETREE_EVOLUTION` | High advanced-graph behavior; avoid another redundant route | `MERGE_BEHAVIOR_INTO_EXISTING_V4` | **P2** |
| `lovetree-global-discovery-home-v1.html` | LoveTree | 공개 LoveTree·Course·저널을 큐레이션하고 첫 순간까지 유도하는 Discovery Home<br>search/filter · curated sections · journey/public-tree open · first-moment modal · URL input · localStorage | `/v4/community` V4CommunityDiscovery + public tree<br>— | `LOVETREE_EVOLUTION` | Very high; materially improves Browse/Public discovery and first-moment acquisition | `UPGRADE_EXISTING_V4_SCREEN` | **P0** |
| `lovetree-golden-heart-scroll-story-v1.html` | LoveTree | 공개 트리를 스크롤 서사로 다시 감상하는 Golden Heart Story<br>scroll story · season/person/moment navigation · replay · video modal/YouTube | `/v4/community/trees/demo` V4PublicTree<br>— | `LOVETREE_EVOLUTION` | Very high; gives public tree a compelling replay/story mode | `MERGE_BEHAVIOR_INTO_EXISTING_V4` | **P1** |
| `lovetree-living-memory-engine-v1-1-global-visual-fidelity.html` | LoveTree | 첫 순간부터 연결·성장까지 제품 개념을 시네마틱하게 설명하는 글로벌 fidelity 버전<br>14-stage scroll/autoplay · click fragments · hover paths · drag seed drop · URL form · Three.js | `/v4/journey` + `/v4/cinematic`<br>— | `LOVETREE_EVOLUTION` | Medium; excellent explanatory/motion reference, less core-product utility | `KEEP_AS_OPTIONAL_VARIANT` | **P2** |
| `lovetree-living-memory-engine-v1.html` | LoveTree | Living Memory Engine 초기 제품 설명/인터랙션 실험<br>14-stage scroll/autoplay · interactive seed/source/connection flow · local persistence | `/v4/journey` + `/v4/cinematic`<br>— | `LOVETREE_VARIANT` | Low/medium; superseded concept reference | `REFERENCE_ONLY` | **P3** |
| `lovetree-memory-core-reactor-v1-electric-aurora.html` | LoveTree | 관계 그래프와 WebGL particle reactor를 동기화한 advanced console<br>relationship map pan/zoom/hover · 5-stage reactor · WebGL particles · telemetry states | `/v4/trees/demo/graph` / `map` / `graph/100-moments`<br>— | `LOVETREE_VARIANT` | Medium reference for advanced graph telemetry | `REFERENCE_ONLY` | **P3** |
| `lovetree-memory-core-reactor-v2-lava-neon.html` | LoveTree | Core Reactor v1의 Lava Neon 시각 발전형<br>v1 reactor interactions + lava/neon visual state intensification | `/v4/trees/demo/graph` / `map` / `graph/100-moments`<br>— | `LOVETREE_EVOLUTION` | Medium; visually stronger v1 with same reactor model | `KEEP_AS_OPTIONAL_VARIANT` | **P2** |
| `lovetree-memory-film-studio-v1.html` | LoveTree | 실제 순간·시즌을 장면화해 필름을 편집·내보내는 Film Studio<br>play/seek · storyboard reorder/edit · ratio/camera/duration/sound · local save · JSON/PNG/WebM export | main 없음; PR #44 V4IncomingFilmStudio<br>PR #44 exact fingerprint / implementation | `LOVETREE_NEW` | High P2 authoring capability; real storyboard/save/export value | `ADOPT_NEW_V4_SCREEN` | **P2** |
| `lovetree-memory-graph-observatory-v1.html` | LoveTree | 관계·회상·시즌 응축·source recovery를 관측하는 Graph Observatory<br>graph traversal · branch focus · background recall · source recovery · season condensation · reset | `/v4/trees/demo/graph` + `/map` + `100-moments`<br>— | `LOVETREE_EVOLUTION` | High advanced behavior; source recovery/season condensation fit graph tooling | `MERGE_BEHAVIOR_INTO_EXISTING_V4` | **P2** |
| `lovetree-memory-pulse-dashboard-v1.html` | LoveTree | 기억 활동·감정·공개 도달을 분석하는 Pulse analytics dashboard<br>period/filter controls · charts/map · live/pause loop · keyboard Space/R · private/empty states | 정확한 main 대응 없음; Tree overview/analytics 인접<br>PR #37 exact source | `LOVETREE_NEW` | High insight value; better merged into overview than standalone lab | `MERGE_BEHAVIOR_INTO_EXISTING_V4` | **P2** |
| `lovetree-memory-scene-recipe-library-v1.html` | LoveTree | 기억/시즌 장면 표현 레시피를 검색·미리보기·적용하는 라이브러리<br>search/filter/select · preview/replay · apply recipe/season · copy · localStorage | 정확한 main 대응 없음<br>PR #37 exact source | `LOVETREE_NEW` | High creator/customization capability after core journey stabilizes | `ADOPT_NEW_V4_SCREEN` | **P2** |
| `lovetree-memory-topology-lab-v1.html` | LoveTree | 사람·감정·시즌·공유·개화 축을 겹쳐 관계 topology를 검사하는 lab<br>person/season/feeling filters · topology layers · live/dense modes · rotate/zoom · hover links · node inspector | `/v4/trees/demo/map` + `/graph` + `100-moments`<br>— | `LOVETREE_NEW` | High advanced capability; genuinely distinct multidimensional topology inspection | `ADOPT_NEW_V4_SCREEN` | **P2** |
| `lovetree-memory-universe-atlas-v1.html` | LoveTree | 전체 트리를 semantic zoom으로 탐색하는 Memory Atlas v1<br>semantic zoom · pan/drag · search fly-to · filters · navigator/guided orbit · JSON/PNG import/export · localStorage | `/v4/subjects` + `/v4/trees/demo/map\|nebula`<br>— | `LOVETREE_VARIANT` | Medium; important base lineage but superseded by 360 version | `REFERENCE_ONLY` | **P3** |
| `lovetree-memory-universe-atlas-v4-pearl-atlas-360.html` | LoveTree | Memory Atlas의 360 공간 회전·선택 강화판<br>v1 atlas + 360 spatial rotation · depth/fill selection · import/export | `/v4/subjects` + `/v4/trees/demo/map\|nebula`<br>— | `LOVETREE_NEW` | High; all-tree semantic navigator absent from current V4 | `ADOPT_NEW_V4_SCREEN` | **P2** |
| `lovetree-memory-window-composer-v2.html` | LoveTree | 기억 카드/배경을 원근 편집해 커버·시즌·Course 장면으로 저장하는 composer<br>drag 4-corner perspective · modes/presets · background upload · YouTube/media · save/share · localStorage | 정확한 main 대응 없음<br>PR #37 exact source | `LOVETREE_NEW` | High creator tool; cover/season/course composition is genuinely new | `ADOPT_NEW_V4_SCREEN` | **P2** |
| `lovetree-moment-polish-lab-v1.html` | LoveTree | Moment 카드의 시각·모션 원칙을 조정하는 polish lab<br>12 principle cards · tuning toggles/settings · live demos/replay · localStorage | 정확한 main 대응 없음; Journey/Workspace styling 인접<br>PR #37 exact source | `LOVETREE_VARIANT` | Low end-user value; strong internal design reference | `REFERENCE_ONLY` | **P3** |
| `lovetree-video-constellation-v3-dense-bookmarks-person-fix.html` | LoveTree | 사람별 영상 기억 별자리에서 탐색하고 새 영상을 바로 담는 graph<br>person filters · graph pan/zoom/drag · video modal · detail · “add video” URL+feeling form | `/v4/trees/demo/graph` + `/v4/trees/demo`<br>— | `LOVETREE_EVOLUTION` | Very high behavior value; in-graph “add next video” strengthens growth loop | `MERGE_BEHAVIOR_INTO_EXISTING_V4` | **P1** |
| `lovetree-video-memory-lore-map-v1.html` | LoveTree | 사람·감정 중심 영상 기억 lore map<br>person/emotion modes · hierarchy nav · pan/zoom · related-memory highlight · video modal/original link | `/v4/trees/demo/map` V4ObsidianMap<br>— | `LOVETREE_EVOLUTION` | High behavior value; related-memory highlighting/person-emotion hierarchy | `MERGE_BEHAVIOR_INTO_EXISTING_V4` | **P2** |
| `lovetree-video-memory-workflow-v1.html` | LoveTree | Collect→Refine→Connect 과정을 설명하는 workflow visualization<br>Collect→Refine→Connect animated checkpoints · person/emotion/scene/relation states · demo video | `/v4/journey` + `/v4/trees/demo`<br>— | `LOVETREE_VARIANT` | Low product delta; useful explanation reference | `REFERENCE_ONLY` | **P3** |
| `lovetree-video-tearoff-memory-pad-v1.html` | LoveTree | 종이 조각을 뜯듯 영상 기억을 넘기고 다시 보는 tactile archive<br>pointer drag tear-off · person/memory select · archive · video modal · touch-oriented transition | Workspace/archive 인접; 별도 old branch lab 존재<br>`feat/v4-telegram-p1-dashboard-tearoff` exact source/port | `LOVETREE_VARIANT` | High microinteraction value for mobile capture/revisit, not worth standalone route | `MERGE_BEHAVIOR_INTO_EXISTING_V4` | **P1** |
| `lovetree-vinyl-coverflow-video-gallery-v2.html` | LoveTree | 비닐 커버플로우형 영상 아카이브<br>drag/wheel/arrows coverflow · card focus · YouTube video modal | `/v4/subjects/demo/motion\|orbit`<br>— | `LOVETREE_VARIANT` | Medium; attractive archive variant with limited new product behavior | `KEEP_AS_OPTIONAL_VARIANT` | **P3** |
| `lovetree-vinyl-video-memory-player-v1.html` | LoveTree | 검색·큐·최근 기록·다음 기억을 묶은 영상 replay hub<br>person/library search · queue/recent/next memory · playback controls · YouTube player | archive routes 인접; queue형 replay hub 없음<br>— | `LOVETREE_NEW` | Very high replay value; queue/search/recent/next memory directly serves “다시 감상” | `ADOPT_NEW_V4_SCREEN` | **P1** |
| `lovetree-whole-picture-memory-dashboard-v1.html` | LoveTree | 현재 위치·변화·미래·다음 행동을 한 화면에서 답하는 Tree Overview<br>4 question states · animated transitions · stats · video rows/modal · next-action cues | `/v4/trees/demo` + seasons/subjects 인접; old branch lab 존재<br>`feat/v4-telegram-p1-dashboard-tearoff` exact source/port | `LOVETREE_NEW` | Very high; answers “where am I / what changed / what next” for My Tree | `ADOPT_NEW_V4_SCREEN` | **P1** |
| `padiem-cinematic-scroll-v3-font-selector.html` | 파디엠 | 기업 AI 홈페이지용 시네마틱 스크롤·타이포그래피 실험<br>cinematic scroll · video · font selector · modal · localStorage | Cross-product reference; no direct V4 route<br>— | `REFERENCE_PADIEM` | High ref: landing motion, type selector and cinematic scroll pacing | `REFERENCE_ONLY` | **REF-H** |
| `sasilro-evidence-assembly-editorial-v1.html` | 사실로 | 의도→진술→타임라인→연결→문서로 근거를 조립하는 편집 흐름<br>drag/reorder · progressive stages · timeline/connections · edit · localStorage | Cross-product reference; no direct V4 route<br>— | `REFERENCE_SASILRO` | High ref: ordered assembly, progressive disclosure and editable timeline | `REFERENCE_ONLY` | **REF-H** |
| `sasilro-evidence-inspection-lab-v1.html` | 사실로 | 영상·음성·CCTV·메타데이터를 세밀하게 검토하는 evidence inspector<br>media/audio/CCTV inspection · zoom · metadata · keyboard · localStorage | Cross-product reference; no direct V4 route<br>— | `REFERENCE_SASILRO` | High ref: media inspector, metadata hierarchy and evidence zoom controls | `REFERENCE_ONLY` | **REF-H** |
| `sasilro-procedure-platform-v1-1-modern-evidence.html` | 사실로 | 증거 수집·절차 진행·문서화를 결합한 사실로 V1.1<br>multi-step procedure · search/filter · file upload · edit/delete · localStorage | Cross-product reference; no direct V4 route<br>— | `REFERENCE_SASILRO` | High ref: multi-step form/IA, uploads, persistence and procedural state | `REFERENCE_ONLY` | **REF-H** |
| `sasilro-procedure-platform-v1-modern-evidence.html` | 사실로 | 증거 수집·절차 진행·문서화를 결합한 사실로 V1<br>multi-step procedure · search/filter · file upload · edit/delete · localStorage | Cross-product reference; no direct V4 route<br>— | `REFERENCE_SASILRO` | Med ref: prior generation of the same procedure platform | `REFERENCE_ONLY` | **REF-M** |
| `sasilro-simple-v2.html` | 사실로 | 간소화된 근거 기반 절차지원 wizard<br>guided wizard · timeline/evidence · file input · local persistence | Cross-product reference; no direct V4 route<br>— | `REFERENCE_SASILRO` | Med ref: simplified wizard and timeline/evidence flow | `REFERENCE_ONLY` | **REF-M** |

## TOP V4 ADOPTION LIST

1. `lovetree-global-discovery-home-v1.html` — **P0** — Upgrade Browse/Public discovery + first-moment acquisition
2. `lovetree-whole-picture-memory-dashboard-v1.html` — **P1** — Adopt My Tree / Tree Overview with current/change/future/next-action model
3. `lovetree-golden-heart-scroll-story-v1.html` — **P1** — Merge story/replay mode into Public Tree
4. `lovetree-video-constellation-v3-dense-bookmarks-person-fix.html` — **P1** — Merge in-graph add-next-video and person branch navigation
5. `lovetree-video-tearoff-memory-pad-v1.html` — **P1** — Merge tactile mobile capture/revisit interaction
6. `lovetree-vinyl-video-memory-player-v1.html` — **P1** — Adopt Replay Hub with queue/recent/search/next-memory
7. `lovetree-cinematic-v6-international.html` — **P1** — Upgrade existing cinematic; no new route
8. `lovetree-memory-film-studio-v1.html` — **P2** — Adopt Film Studio after PNG/WebM fidelity remediation
9. `lovetree-memory-universe-atlas-v4-pearl-atlas-360.html` — **P2** — Adopt all-tree semantic 360 navigator
10. `lovetree-memory-topology-lab-v1.html` — **P2** — Adopt advanced multidimensional topology inspector
11. `lovetree-memory-graph-observatory-v1.html` — **P2** — Merge background recall/source recovery/season condensation
12. `lovetree-cosmic-video-memory-atlas-v1.html` — **P2** — Merge layout/filter/video-inspection behaviors into advanced graph
13. `lovetree-video-memory-lore-map-v1.html` — **P2** — Merge person/emotion hierarchy and related-memory highlighting
14. `lovetree-memory-pulse-dashboard-v1.html` — **P2** — Merge analytics into Tree Overview rather than standalone lab
15. `lovetree-memory-scene-recipe-library-v1.html` — **P2** — Adopt creator recipe library after core product gate
16. `lovetree-memory-window-composer-v2.html` — **P2** — Adopt memory/cover composer after core product gate

## Gate order

**Immediate P0/P1 Gate:** Global Discovery upgrade → Whole Picture Tree Overview → Golden Heart Public Tree replay → Video Constellation add-next-video behavior → Video Tearoff mobile microinteraction → Vinyl Replay Hub → Cinematic v6 selective upgrade.

**P2 Gate:** Film Studio after export-fidelity fix; Atlas 360; Topology Lab; Graph Observatory/Cosmic/Lore consolidation; Pulse analytics; Scene Recipes; Window Composer.

Cross-product sources remain reference assets. Originals remain preserved in the intake. Folder moves are deferred until after Gate.

`B_TRACK_READY_FOR_V4_ADOPTION_GATE`