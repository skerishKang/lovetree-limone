# 컴2 — 최종 Inventory Matrix (2026-08-08)

Branch: `feat/new-sibling-design-sources-20260808` · Base: `main` `97aa062`
PR: **#44 (DRAFT)** · Docs: `docs/v4/NEW_SIBLING_SOURCES_INVENTORY_20260808.md`

## 신규 소스 전체 매트릭스

발굴 경로: Google Drive 동기 폴더 `텔레그램다운로드폴더/` (33건 신규 HTML 발견).
fingerprint(크기·SHA-256·title·version)는 위 문서에 기록.

| source | family | version | SHA(앞8) | main 대응 화면 | 판정 | 핵심 차이 | 구현 | 새 route | Preview URL | backend 필요 |
|---|---|---|---|---|---|---|---|---|---|---|
| auto-unfold-template-composer | Template Composer | v2.4 | `c30d6e1c` | 없음 (NEW) | NEW_SCREEN | 템플릿 기하/미디어/YouTube 파싱/노드·엣지 편집/라이브러리 | ✅ | `/v4/labs/incoming/template-composer` | PR#44 preview | 템플릿 CRUD, 미디어 업로드, YouTube 메타 |
| auto-unfold-mindmap-form | Template Composer | v1 | `cf3f2f77` | 없음 | VISUAL_VARIANT | 템플릿 폼 계열의 구조 전개 변형 (v2.4에 수렴) | — | — | — | — |
| live-flow-map | Live Flow Map | v1.1 | `240e940d` | 없음 (NEW) | NEW_SCREEN | 살아있는 플로우 네트워크, 미디어 노드, 필터/모양/보기, 영상 모달 | ✅ | `/v4/labs/incoming/live-flow-map` | PR#44 preview | Memory·Connection 실데이터, 영상 URL |
| living-memory-terrain | Living Memory Terrain | v1.2 standalone | `2110fabd` | 없음 (NEW) | NEW_SCREEN | 지형 시각화, 레이어 토글, 상태 5단계, 경로 재생, Landscape Safe | ✅ | `/v4/labs/incoming/memory-terrain` | PR#44 preview | Moment·Season 실데이터, 재방문 통계 |
| living-video-memory-graph | Living Memory Terrain | v1 | `c6e1dccc` | 없음 | VISUAL_VARIANT | 지형 계열 그래프 변형 (v1.2에 수렴) | — | — | — | — |
| season-aquarelle-bloom | Season Aquarelle | v3 preview | `90cd3dd6` | 없음 | **REJECTED_SOURCE** | 검토판정서 GATE FAIL, 재제작판·asset 팩 미확보 | ❌(보존만) | — | — | — |
| popup-season-memory-book | Season/Archive | v1 | `8537502c` | 없음 (NEW) | NEW_SCREEN | 페이퍼컷 팝업북, 씨앗→나무→개화, 3챕터×9순간, 영상 모달 | ✅ | `/v4/labs/incoming/popup-season-book` | PR#44 preview | Season·Moment 실데이터, YouTube 임베드 |
| memory-film-studio | Memory Studio | v1 | `52bf3308` | 없음 (NEW) | NEW_SCREEN | 필름 스튜디오, 스토리보드 재배열, 비율/카메라/타임라인, JSON/포스터 내보내기 | ✅ | `/v4/labs/incoming/film-studio` | PR#44 preview | 트리/시즌 실데이터, 프로젝트 저장 API |
| memory-pulse-dashboard | Memory | v1 | `b302f128` | — | PR#37 lab (DRAFT 존중) | `/v4/labs/memory/pulse` 별도 구현 | ❌(DRAFT) | — | — | — |
| memory-scene-recipe-library | Memory | v1 | `e36c7b13` | — | PR#37 lab | `/v4/labs/memory/recipes` | ❌(DRAFT) | — | — | — |
| memory-window-composer | Memory | v2 | `8fd6a4f1` | — | PR#37 lab | `/v4/labs/memory/window-composer` | ❌(DRAFT) | — | — | — |
| moment-polish-lab | Memory | v1 | `6f066360` | — | PR#37 lab | `/v4/labs/memory/polish-lab` | ❌(DRAFT) | — | — | — |
| video-tearoff-memory-pad | Archive | v1 | `63ab4938` | — | tearoff branch (미병합) | 이미 `feat/v4-telegram-p1-dashboard-tearoff`에 존재 | ❌(중복 방지) | — | — | — |
| whole-picture-memory-dashboard | Archive | v1 | `ed7c42c5` | — | tearoff branch (미병합) | 동일 | ❌(중복 방지) | — | — | — |
| cinematic-reference-motion-v5-1 | Cinematic | v5.1 | `cbc9b365` | `/v4/cinematic` | IMPLEMENTED_EQUIVALENT | main에 병합 완료 | ❌ | — | — | — |
| first-journey-unified-v1 | Onboarding | v1 | `3b61fe4b` | `/v4/journey` | EXACT_DUP | SHA 동일 | ❌ | — | — | — |
| people-book-shelf v2-1/v2-3d/v2a-2 | People | — | `cb64d803`외 | `/v4/subjects/bookshelf/*` | EXACT_DUP (3건) | SHA 동일 | ❌ | — | — | — |
| 48-neon-pilot / cinematic-memory-portal / cinematic-original-assets / cinematic-reference-faithful / cinematic-v6-international / global-discovery-home / golden-heart-scroll-story / cosmic-video-memory-atlas / memory-core-reactor / memory-graph-observatory / memory-topology-lab / memory-universe-atlas v1·v4 / video-constellation / video-memory-lore-map / video-memory-workflow / vinyl-coverflow / vinyl-video-memory-player | 각 계열 | v1~v3 | 본문 참조 | 관련 기존 화면 | **VISUAL_VARIANT (20건)** | 시각 변형만 있고 기능이 기존 화면과 동일 | ❌ | — | — | — |

## 숫자 확정

- Telegram 루트에서 발견된 LoveTree HTML: **37건** (이 중 EXACT_DUP 4건 = 이미 main 등록 source와 SHA 동일)
- **main source registry에 신규인 HTML: 33건**
  - **실질적으로 새로운 제품 디자인/기능: 5건 (NEW_SCREEN)** — Template Composer · Live Flow Map · Living Memory Terrain · Film Studio · Popup Season Book
  - REJECTED_SOURCE: 1건 (Season Aquarelle)
  - IMPLEMENTED_EQUIVALENT: 1건 (cinematic-reference-motion-v5-1 → `/v4/cinematic`)
  - PR#37 lab (DRAFT 존중): 4건
  - tearoff branch (미병합, 중복 방지): 2건
  - VISUAL_VARIANT: 20건
  - 검증: 5+1+1+4+2+20 = 33 ✓
- EXACT_DUP (main 29-source와 동일 SHA, 이미 구현): 4건

## Preview 배포 상태

- 격리 Worker 후보: `lovetree-limone-sibling-sources-preview` (guard 패턴 `^lovetree-limone-...-preview$` 통과 검증됨)
- guarded deploy dry-run: **fail-closed 확인** (dirty worktree — evidence 파일이 untracked)
  - `rehearsal/`, `screenshots/`, `pr40-mobile-tree-390.png`, `.tmp.driveupload/` 는 housekeeping 보류 대상이라 커밋·삭제 불가 → 원격 upload는 clean checkout에서 수행해야 함
  - Production Worker `lovetree-limone` 미접촉 · wrangler.jsonc 미변경 · 배포 스크립트 미변경

## 검증 요약

- typecheck 0 error · lint 0 error · build 성공
- npm test **720/720 pass** (기존 713 + 신규 `v4-incoming-lab-source-faithful` 7)
- viewport harness **30/30 pass** (6 화면 × 5 뷰포트, console/page error 0, overflow 0)
- reduced motion 5/5 pass
