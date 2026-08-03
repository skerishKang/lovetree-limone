# V4 추가 원본 11개 분류 문서

- 작성 시점: 2026-08-03
- 브랜치: `feat/v4-integrate-additional-sources`
- Baseline test SHA: `ee3ffbbe9f309309ede1e42e58fa033774661de4`
- Source commit: `37c817f81f412d0712c8de2af1373c3f37a4b3aa`
- Cherry-pick SHA: `6bbdaa993d45f96bdc49636447089180924da3d1`
- 원본: `[샘플]/*.html` 11개 (`docs/v4/V4_ADDITIONAL_11_SOURCE_INGESTION.md` 참조)
- 이 문서는 **분류·구현 계획만** 기록한다. React/CSS/route/test는 수정하지 않는다.

---

## 0. 요약 판정

| # | source | classification | design match | interaction match | new implementation |
|---|---|---|---|---|---|
| 1 | lovetree-100-moments-season-temperature-v4 | NEW_SCREEN_REQUIRED | MISSING | MISSING | REQUIRED |
| 2 | lovetree-accordion-album-archive-v3-fixed | EXACT_DUPLICATE | PARTIAL_MATCH | PARTIAL_MATCH | refinement |
| 3 | lovetree-first-journey-unified-v1 | NEW_SCREEN_REQUIRED | PARTIAL_MATCH | PARTIAL_MATCH | REQUIRED |
| 4 | lovetree-folding-person-archive | EXACT_DUPLICATE | PARTIAL_MATCH | PARTIAL_MATCH | refinement |
| 5 | lovetree-liquid-orbit-video-gallery | EXACT_DUPLICATE | PARTIAL_MATCH | PARTIAL_MATCH | refinement |
| 6 | lovetree-motion-archive-v5-video-click-autoplay | EXACT_DUPLICATE | PARTIAL_MATCH | PARTIAL_MATCH | refinement |
| 7 | lovetree-people-book-shelf-v1 | NEW_SCREEN_REQUIRED | MISSING | MISSING | REQUIRED |
| 8 | lovetree-people-book-shelf-v2-1-true-page-motion | NEW_SCREEN_REQUIRED | MISSING | MISSING | REQUIRED |
| 9 | lovetree-people-book-shelf-v2-3d | NEW_SCREEN_REQUIRED | MISSING | MISSING | REQUIRED |
| 10 | lovetree-people-book-shelf-v2a-2-interaction-stable | NEW_SCREEN_REQUIRED | MISSING | MISSING | REQUIRED |
| 11 | lovetree-tree-pause-issue-state-v1 | EXISTING_SCREEN_SOURCE | PARTIAL_MATCH | PARTIAL_MATCH | refinement |

- MATCH: 0 / PARTIAL_MATCH: 6 / MISSING: 5 / NOT_TESTED: 0
- 원본 실행 검증: 11개 파일 모두 1536×960 / 390×844 뷰포트에서 렌더 성공. pageerror 0건.
  발생한 console error는 Google Fonts·favicon 등 외부 리소스 404(오프라인 환경)뿐이며 렌더링과 무관.
  대표 화면 스크린샷 22장을 `/tmp/kilo/source-shots/`에 캡처(리포지토리에 미포함).
- 원본 전수 독회: 11개 모두 처음부터 끝까지 1회 이상 독회 후 아래 분석을 도출했다.

---

## 1. 전체 분류표

| source | classification | current route | target route | current component | design match | interaction match | missing elements | implementation action |
|---|---|---|---|---|---|---|---|---|
| lovetree-100-moments-season-temperature-v4 | NEW_SCREEN_REQUIRED | — | `/v4/trees/demo/graph/100-moments` | — | MISSING | MISSING | 5개 layout(radial/tree/circle/grid/timeline)·100개 노드·밀도 전환·시즌 오버레이·온도 인스펙터 3탭·입덕 코스 다이얼로그 | 신규 컴포넌트 `V4Moments100` + 신규 route |
| lovetree-accordion-album-archive-v3-fixed | EXACT_DUPLICATE | `/v4/subjects/demo/accordion` | 동일 route 유지 | `V4AccordionArchive` | PARTIAL_MATCH | PARTIAL_MATCH | 9명→4명 축소, 책 205×390 비율, rotateY ±73°, 표지 비행, 6슬라이스 페이지 넘김, 메모 사이드, 하단 플레이어 | 기존 컴포넌트를 원본 구조로 정합 |
| lovetree-first-journey-unified-v1 | NEW_SCREEN_REQUIRED | `/v4`(랜딩), `/v4/trees/demo/onboarding/*` | `/v4/journey`(통합 온보딩) | `V4Landing`, `V4EmotionStep`, `V4ConnectStep` | PARTIAL_MATCH | PARTIAL_MATCH | unified-bar 4단계 nav, 순차 잠금(게이트), step2 카드+성공 뷰, step3 연결+성공 뷰, growth 화면, storage 3키 | 신규 컴포넌트 `V4FirstJourney`(기존 단계 기능을 통합) |
| lovetree-folding-person-archive | EXACT_DUPLICATE | `/v4/subjects/demo/folding` | 동일 route 유지 | `V4FoldingPersonArchive` | PARTIAL_MATCH | PARTIAL_MATCH | 7장 버스트 fan-out 3D, 표지·트랙 듀얼 3D 오픈, 4슬라이스 폴드 넘김, 테이프 메모 카드, 234×370 비율, 12 트랙 | 기존 컴포넌트를 원본 구조로 정합 |
| lovetree-liquid-orbit-video-gallery | EXACT_DUPLICATE | `/v4/subjects/demo/orbit` | 동일 route 유지 | `V4LiquidOrbitGallery` | PARTIAL_MATCH | PARTIAL_MATCH | 비닐 케이스 reveal, liquid wash 블롭, memory level 바, 카드 반사, 하단 view dock, 224×328 비율 | 기존 컴포넌트를 원본 구조로 정합 |
| lovetree-motion-archive-v5-video-click-autoplay | EXACT_DUPLICATE | `/v4/subjects/demo/motion` | 동일 route 유지 | `V4MotionArchive` | PARTIAL_MATCH | PARTIAL_MATCH | 4번째 모드 cascade(사선) 명칭, 하단 플레이어, 6패널 wipe 폴드, 뷰어 메모 패널, mirrored 카드, 휠·드래그 | 기존 컴포넌트를 원본 구조로 정합 |
| lovetree-people-book-shelf-v1 | NEW_SCREEN_REQUIRED | — | `/v4/subjects/bookshelf/v1` | — | MISSING | MISSING | 정적 그리드 책장(190px auto-fill), 챕터 트리, 영상 모달, 필터/검색, 새 책 만들기, `lovetree-people-book-shelf-v1` | 신규 컴포넌트 `V4BookShelfV1` |
| lovetree-people-book-shelf-v2-1-true-page-motion | NEW_SCREEN_REQUIRED | — | `/v4/subjects/bookshelf/v2-1` | — | MISSING | MISSING | 3D 캐러셀, 책 비행 전환, 드래그 점진 펼침, 10-strip 컬 페이지 넘김, underPage | 신규 컴포넌트 `V4BookShelfV2P1` |
| lovetree-people-book-shelf-v2-3d | NEW_SCREEN_REQUIRED | — | `/v4/subjects/bookshelf/v2-3d` | — | MISSING | MISSING | 가로 스크롤 플렉스 책장, 표지 −164° CSS 오픈, CSS keyframe 플립, 페이지 내 영상 | 신규 컴포넌트 `V4BookShelfV2D3` |
| lovetree-people-book-shelf-v2a-2-interaction-stable | NEW_SCREEN_REQUIRED | — | `/v4/subjects/bookshelf/v2a-2` | — | MISSING | MISSING | 풀뷰포트 3D 씬, 상태 머신, 세그먼트 곡면 플립, 코너 드래그, 테마 전환 배경 | 신규 컴포넌트 `V4BookShelfV2A2` |
| lovetree-tree-pause-issue-state-v1 | EXISTING_SCREEN_SOURCE | `/v4/trees/demo/state` | 동일 route 유지 | `V4TreeState` | PARTIAL_MATCH | PARTIAL_MATCH | 사이드바+SVG 트리+메모리 카드 5개, 상태 라디오 4개, 공개 2단계, 6개 모달, `lovetree-tree-pause-issue-state-v1` | 기존 컴포넌트를 원본 구조로 정합 |

---

## 2. 각 원본별 판정 근거

각 원본마다 아래 마커를 포함한다.

### 2.1 lovetree-100-moments-season-temperature-v4

- SOURCE_PRESENT: 예 (`[샘플]/lovetree-100-moments-season-temperature-v4.html`, 1079줄)
- CURRENT_ROUTE_EXISTS: 아니오
- CURRENT_DESIGN_MATCH: MISSING (관련 화면 `V4Finale300`, `V4SeasonArchive`는 300개 마일스톤/시즌 아카이브로, 본 원본의 "100개 노드 그래프 + 시즌/온도"와 구조가 다름)
- CURRENT_INTERACTION_MATCH: MISSING (팬·줌·노드 드래그·연결선 드래그·5레이아웃·밀도 전환·온도 탭 모두 미구현)
- NEW_IMPLEMENTATION_REQUIRED: 예
- DESKTOP_RESULT: 렌더 정상, 5개 layout 전환·팬/줌·시즌 완성 오버레이·온도 막대 확인(스크린샷 `/tmp/kilo/source-shots/lovetree-100-moments-season-temperature-v4-desktop.png`)
- MOBILE_RESULT: 렌더 정상, 인스펙터 하단·탭 1열 전환 확인(스크린샷 `...-mobile.png`)

핵심 구조:
- workspace = 그래프(1fr) + 인스펙터(352px). 인스펙터 탭 3종: **순간 심기 / 선택한 순간 / 온도**.
- 노드: 대표 경로 6카드(root+1·24·50·78·100) / 전체 100개 토글 시 22px 미니 도트+94개 순번 간선.
- 레이아웃 5종: radial(기본)·tree(5열×20행)·circle(타원)·grid(10열×10행)·timeline(사인파).
- 시즌 표현: `body[data-season]`(undecided/season2/continuous) + 완성 오버레이(SEASON 01 · 100 MOMENTS COMPLETE) + 회고 재생 + 결정 다이얼로그(시즌2/무구분/입덕 코스).
- 온도 표현: 3단 막대(나의 트리 결 % / 팬 반응 ° / 주연 전체 팬 온도) + 태그↔색 팔레트(root/scene/emotion/comfort/blue).
- storage: 없음(모두 메모리 상태).
- 고유 요소: 노이즈 종이 질감, 점 그리드 캔버스, minimap, 드래그 노드/연결선, `edgeFlow` 점선 간선.

### 2.2 lovetree-accordion-album-archive-v3-fixed

- SOURCE_PRESENT: 예 (기존 `reference/v3/sibling-prototypes/`와 **md5 동일** `19dbd82c…`)
- CURRENT_ROUTE_EXISTS: 예 `/v4/subjects/demo/accordion`
- CURRENT_DESIGN_MATCH: PARTIAL_MATCH
- CURRENT_INTERACTION_MATCH: PARTIAL_MATCH
- NEW_IMPLEMENTATION_REQUIRED: 아니오(기존 화면의 원본 정합 작업만 필요)
- DESKTOP_RESULT: 서가·아코디언 펼침·뷰어 정상 렌더(스크린샷 확인)
- MOBILE_RESULT: 3D 해제·2열 아코디언 구조 렌더 확인

비교(A 그룹):
- 전체 레이아웃: 원본은 9권(9명×9=81 순간) 3D 서가 + 5열 아코디언(1.1:1:1:1:.82) + 72:28 뷰어. V4는 4권(4×8=32) 서가 + 접힘 패널 + 단순 뷰어 다이얼로그 → **차이 큼**.
- 3D 운동: 원본 rotateY ±73°·Z 112px·perspective 2200px, 표지 `flight` 비행. V4는 `--book-ry ±12°`·Z 100px → **각도·깊이 축소**.
- 카드·책 비율: 원본 책 205×390(1:1.90). V4 책은 썸네일 기반 카드로 비율 상이 → **불일치**.
- 영상 선택 흐름: 원본은 아코디언 패널 → 뷰어(메모+태그+플레이어). V4는 패널→전체 화면 다이얼로그 → **메모/플레이어 미구현**.
- 이전·다음: 원본 뷰어 ‹› + 플레이어 ‹▶› + ←→키. V4는 이전/다음 버튼만 → **부분**.
- 드래그·휠·키보드: 원본 ←→/Enter/Escape. V4 ←→키 + 클릭 → **부분**.
- 애니메이션: 원본 fold 지연(`--p*.11s`), flight 720ms, 6슬라이스 터너. V4는 펼침 transition만 → **누락**.
- 모바일: 원본 ≤680px 3D 해제. V4도 반응형 존재 → **부분**.

### 2.3 lovetree-first-journey-unified-v1

- SOURCE_PRESENT: 예 (3031줄)
- CURRENT_ROUTE_EXISTS: 부분 예(`/v4`, `/v4/trees/demo/onboarding/emotion`, `/v4/trees/demo/onboarding/connect`)
- CURRENT_DESIGN_MATCH: PARTIAL_MATCH(랜딩 히어로·발견 폼·이름 모달은 근접, 통합 nav·잠금·성장 화면 없음)
- CURRENT_INTERACTION_MATCH: PARTIAL_MATCH(순차 잠금·4단계 진행·성장 루프 미구현)
- NEW_IMPLEMENTATION_REQUIRED: 예
- DESKTOP_RESULT: 랜딩+step1+step2+step3+growth 전부 렌더 정상
- MOBILE_RESULT: ≤860px nav 가로 스크롤·≤560px 성장 1열 렌더 확인

판단(C 그룹):
- 기존 랜딩 교체: **가능**(V4Landing의 히어로/발견 폼/이름 모달과 개념이 겹침)하나 단계별 route 유지 목적상 **권장하지 않음**.
- 통합 온보딩 별도 route: **채택**(`/v4/journey` 신규 컴포넌트 `V4FirstJourney`) — 원본은 단일 페이지 4스테이지(landing→step1→step2→step3→growth)를 순차 잠금으로 진행하므로 독립 화면이 정확.
- 기존 여러 단계에 기능 병합: 부분(emotion/connect 단계는 원본 step2/step3 폼을 보완하는 형태로 재사용 가능).
- 독립 reference route: 별도 추가보다 위 통합 route로 충분.

### 2.4 lovetree-folding-person-archive

- SOURCE_PRESENT: 예 (기존 reference와 **md5 동일** `5f7bb0f5…`)
- CURRENT_ROUTE_EXISTS: 예 `/v4/subjects/demo/folding`
- CURRENT_DESIGN_MATCH: PARTIAL_MATCH
- CURRENT_INTERACTION_MATCH: PARTIAL_MATCH
- NEW_IMPLEMENTATION_REQUIRED: 아니오(정합만)
- DESKTOP_RESULT: 서가·버스트·스프레드·뷰어 렌더 정상
- MOBILE_RESULT: 스프레드 1열·책 축소 렌더 확인

비교(A 그룹):
- 전체 레이아웃: 원본 spread 42:58(커버 3:4 + 트랙 페이퍼 548px) + 뷰어 1.42:.58. V4는 트랙 목록 + 양면 페이지(영상/메모) → **구조 상이**.
- 3D 운동: 원본 burst 7장 fan-out(58%·100% 회전), 커버 rotateY(50°→0), 페이퍼 rotateY(−64°) scaleX(.42). V4는 `is-opening→open` 페이즈 + 버스트 스택 + 단순 회전 → **부분**.
- 카드·책 비율: 원본 책 234×370(1:1.58). V4 책 카드 비율 상이 → **불일치**.
- 영상 선택 흐름: 원본 트랙 클릭→뷰어(영상+메모+플레이어). V4는 스프레드 안 선택 → **부분**.
- 이전·다음: 원본 뷰어 ‹›·플레이어·←→·Space. V4는 이전/다음 페이지 버튼 → **부분**.
- 드래그·휠·키보드: 원본 ←→/Esc/Space. V4는 화살표 없음(버튼만) → **부분**.
- 애니메이션: 원본 burst 1.15s 지연(`--n*.055s`), 트랙 stagger(`--order*.045s`), 4슬라이스 폴드. V4는 페이즈 전환만 → **누락**.
- 모바일: 원본 ≤650px 162×276 책·3열 트랙. V4 반응형 존재 → **부분**.

### 2.5 lovetree-liquid-orbit-video-gallery

- SOURCE_PRESENT: 예 (기존 reference와 **md5 동일** `c67b0986…`)
- CURRENT_ROUTE_EXISTS: 예 `/v4/subjects/demo/orbit`
- CURRENT_DESIGN_MATCH: PARTIAL_MATCH
- CURRENT_INTERACTION_MATCH: PARTIAL_MATCH
- NEW_IMPLEMENTATION_REQUIRED: 아니오(정합만)
- DESKTOP_RESULT: 카드 어셈블·4모드 전환·상세 오버레이 렌더 정상
- MOBILE_RESULT: 카드 174×270·dock 가로 스크롤 렌더 확인

비교(A 그룹):
- 전체 레이아웃: 원본 hero+gallery(4모드)+고정 view dock+상세(케이스:메모 1.38:.62). V4는 stage+하단 dock+다이얼로그 → **dock 스타일·상세 구조 상이**.
- 3D 운동: 원본 카드 224×328, wave x168/z48, orbit 반지름(0.34w/0.28h), free rAF 반발, diagonal; pointer tilt rotateX/Y. V4는 유사 transform 존재, 기본 모드가 **orbit**(원본 wave) → **부분**.
- 카드·책 비율: 원본 카드 224×328(1:1.464)·미디어 63/37. V4 카드 비율 근사 → **부분**.
- 영상 선택 흐름: 원본 카드→liquid wash→비닐 케이스 reveal→영상. V4는 카드→단순 다이얼로그 → **케이스/워시 누락**.
- 이전·다음: 원본 상세 ‹›·stage ←→·휠·드래그 82px. V4는 키보드/드래그/휠 존재 → **부분**.
- 드래그·휠·키보드: 원본 전부 존재. V4도 전부 존재 → **부분**(동작 유사).
- 애니메이션: 원본 introAssemble stagger·pullMoment·liquidBloom·ripple·reflection·level bar. V4는 자체 transition만 → **고유 연출 누락**.
- 모바일: 원본 ≤650px 카드 174×270·dock 100%-18px. V4 반응형 존재 → **부분**.

### 2.6 lovetree-motion-archive-v5-video-click-autoplay

- SOURCE_PRESENT: 예 (기존 reference와 **md5 동일** `ef3525c5…`)
- CURRENT_ROUTE_EXISTS: 예 `/v4/subjects/demo/motion`
- CURRENT_DESIGN_MATCH: PARTIAL_MATCH
- CURRENT_INTERACTION_MATCH: PARTIAL_MATCH
- NEW_IMPLEMENTATION_REQUIRED: 아니오(정합만)
- DESKTOP_RESULT: 4모드·카드 배열·뷰어 오버레이 렌더 정상
- MOBILE_RESULT: 카드 축소·뷰어 1열 렌더 확인

비교(A 그룹):
- 전체 레이아웃: 원본 intro+mode-dock+archive(stage+bottom player+viewer 1.42:.58). V4는 intro+dock+shell(footer+다이얼로그) → **bottom player·메모 패널 누락**.
- 3D 운동: 원본 wave(±28°·edge pill radius)·orbit(330/225)·vinyl(±35°·추출)·cascade(±19°). V4는 4모드 구현, 4번째 명칭 **diagonal**(원본 cascade), mirrored 카드 없음 → **부분**.
- 카드·책 비율: 원본 178×260(모드별 128×184/235×310/210×285). V4 카드 근사 → **부분**.
- 영상 선택 흐름: 원본 카드 클릭→**autoplay 뷰어**(영상+메모+태그). V4는 카드 클릭→다이얼로그(재생 버튼 텍스트만, iframe 아님) → **자동 재생/메모 미구현**.
- 이전·다음: 원본 stage ‹›·플레이어 ‹▶›·뷰어 존. V4는 ‹›·선택 열기 버튼 → **부분**.
- 드래그·휠·키보드: 원본 휠(passive:false)+드래그 45px+orbit tilt. V4는 키보드+클릭만 → **드래그·휠 누락**.
- 애니메이션: 원본 6패널 wipe fold(310ms/820ms), vinyl ripple·pullOut, entrance scatter. V4는 transition만 → **누락**.
- 모바일: 원본 ≤1080px 1열 뷰어·≤700px 카드 축소. V4 반응형 존재 → **부분**.

### 2.7 lovetree-people-book-shelf-v1

- SOURCE_PRESENT: 예 (660줄)
- CURRENT_ROUTE_EXISTS: 아니오
- CURRENT_DESIGN_MATCH: MISSING
- CURRENT_INTERACTION_MATCH: MISSING
- NEW_IMPLEMENTATION_REQUIRED: 예
- DESKTOP_RESULT: 그리드 책장·챕터 트리·영상 모달 렌더 정상
- MOBILE_RESULT: 2열 책장·detail 1열 렌더 확인

고유 요소(B 그룹 v1): 정적 CSS 그리드 책장(auto-fill 190px), 책 132×194(rotateY −8°), 챕터 트리(첫 마음 ♥ 루트), **영상 모달(videoModal)**, 검색·필터 4종(전체/K-pop/배우/작품·캐릭터), 새 책 만들기, storage `lovetree-people-book-shelf-v1` `{selectedId, chapterIndex, customBooks}`. **페이지 넘김 없음**(화면 전환만).

### 2.8 lovetree-people-book-shelf-v2-1-true-page-motion

- SOURCE_PRESENT: 예 (920줄)
- CURRENT_ROUTE_EXISTS: 아니오
- CURRENT_DESIGN_MATCH: MISSING
- CURRENT_INTERACTION_MATCH: MISSING
- NEW_IMPLEMENTATION_REQUIRED: 예
- DESKTOP_RESULT: 3D 캐러셀·reader·페이지 컬 렌더 정상
- MOBILE_RESULT: 캐러셀 축소·book scale(.58) 렌더 확인

고유 요소(B 그룹 v2-1): 절대위치 3D 캐러셀(190×352, x158/z78, scale [1.12,.82,.66,.54]), **책 비행 전환(transfer-book .72s)**, 드래그 점진 펼침(`--open-progress` 45% 임계), 10-strip 컬 페이지 넘김(`curl-next .82s`, `--n*14ms`), underPage(다음 챕터 미리보기), 책 표지 −165°, storage `lovetree-people-book-shelf-v2-1-true-page-motion` `{selectedId, shelfIndex, chapterIndex, customBooks}`.

### 2.9 lovetree-people-book-shelf-v2-3d

- SOURCE_PRESENT: 예 (690줄)
- CURRENT_ROUTE_EXISTS: 아니오
- CURRENT_DESIGN_MATCH: MISSING
- CURRENT_INTERACTION_MATCH: MISSING
- NEW_IMPLEMENTATION_REQUIRED: 예
- DESKTOP_RESULT: 가로 스크롤 책장·reader 렌더 정상
- MOBILE_RESULT: 캐러셀 축소 렌더 확인

고유 요소(B 그룹 v2-3d): **가로 스크롤 플렉스 책장**(drag-to-scroll, 화살표 scrollBy ±430), 책 128×190, 표지 `rotateY(-164deg)` 고정 CSS 오픈, **CSS keyframe 페이지 플립**(.58s, 48% 시점 bg `#e2d1bc`), `--book-lift:-28px`, 페이지 내 YouTube 자동 autoplay, storage `lovetree-people-book-shelf-v2-3d` `{selectedId, chapterIndex, customBooks}`.

### 2.10 lovetree-people-book-shelf-v2a-2-interaction-stable

- SOURCE_PRESENT: 예 (298줄)
- CURRENT_ROUTE_EXISTS: 아니오
- CURRENT_DESIGN_MATCH: MISSING
- CURRENT_INTERACTION_MATCH: MISSING
- NEW_IMPLEMENTATION_REQUIRED: 예
- DESKTOP_RESULT: 3D 셸프 씬·포커스·인포 패널 렌더 정상
- MOBILE_RESULT: 하단 시트 인포 패널·책 강제 오버라이드 렌더 확인

고유 요소(B 그룹 v2a-2): 풀뷰포트 3D 셸프 씬(228×332, depth 34, perspective 1600), **상태 머신** SHELF→FOCUSING→FOCUSED→OPENING→OPEN⇄FLIPPING→CLOSING→RETURNING, `busy` 잠금+**페이지 넘김 큐**, **세그먼트 곡면 플립 엔진**(14/9개, `phi=±πp+sin(πp)*.52*sin(πu)`), **코너 드래그 인터랙티브 플립**(임계 .34), 책 테마가 화면 배경 전환(juyeon/plave/hudson), `--coverAngle −170°`, storage **없음**, 디버그 API `window.__loveTreeMotionProof`.

### 2.11 lovetree-tree-pause-issue-state-v1

- SOURCE_PRESENT: 예 (778줄)
- CURRENT_ROUTE_EXISTS: 예 `/v4/trees/demo/state`
- CURRENT_DESIGN_MATCH: PARTIAL_MATCH
- CURRENT_INTERACTION_MATCH: PARTIAL_MATCH
- NEW_IMPLEMENTATION_REQUIRED: 아니오(정합만)
- DESKTOP_RESULT: 사이드바+트리 씬+모달 전체 렌더 정상
- MOBILE_RESULT: 사이드바 가로 바 전환·1열 레이아웃 렌더 확인

직접 비교(E 그룹):

| 항목 | 원본 | V4 (`V4TreeState`) | 판정 |
|---|---|---|---|
| 전체 레이아웃 | 230px 사이드바 + main(히어로 + workspace/320px 사이드) | 카드 그리드(상태/공개/이슈/메모/결과) | 상이 |
| 트리 시각화 | SVG 트리(줄기·가지·잎 9개) + **메모리 카드 5개**(m1~m5, 154px) + 중앙 카드 + 이슈 노드 | **없음**(트리 아트 없음) | 누락 |
| 카드 수·배열 | 트리 위 5개 카드(01처음/58설렘/05변화/184최근/167위로) + 조용한 아카이브 3개 | 이슈 타임라인 3행(날짜/제목/상세) | 구조 상이 |
| 상태 선택 구조 | 모달 라디오 4개(이슈 지켜보는 중/마음 복잡/거리 두기/다시 살펴보는 중) | 카드 옵션 3개(자라는 중/잠시 쉬는 중/계절 보관) | 상이 |
| 공개 범위 구조 | 2단계(공개 유지/나만 보기), 모달+바디 속성 | 3단계(나만 보기/링크 공개/커뮤니티 공개) | 상이 |
| 이슈 타임라인 | 이슈 노드 1개(최신)+이슈 모달 | 타임라인 3행 | 상이 |
| 개인 메모 | 모달 textarea + 🔒 태그 + 반환 메모 | 카드 textarea(1개) | 부분 |
| 색상·배경 | moss/leaf/rose/brown 파레트, SVG 잉크 #846d5d 등 | 자체 팔레트 | 부분(분위기만 유사) |
| localStorage | `lovetree-tree-pause-issue-state-v1`(단일 JSON, 15필드) | `lovetree-v4-tree-state`(3필드) | 키·구조 상이 |
| 모바일 | ≤1080px 사이드바 축소 → ≤700px 가로 바 | 자체 반응형 | 부분 |

---

## 3. 기존 화면과 정확히 대응되는 원본

- `lovetree-accordion-album-archive-v3-fixed` → `/v4/subjects/demo/accordion` (`V4AccordionArchive`)
- `lovetree-folding-person-archive` → `/v4/subjects/demo/folding` (`V4FoldingPersonArchive`)
- `lovetree-liquid-orbit-video-gallery` → `/v4/subjects/demo/orbit` (`V4LiquidOrbitGallery`)
- `lovetree-motion-archive-v5-video-click-autoplay` → `/v4/subjects/demo/motion` (`V4MotionArchive`)
- `lovetree-tree-pause-issue-state-v1` → `/v4/trees/demo/state` (`V4TreeState`)
- `lovetree-first-journey-unified-v1` → `/v4` 랜딩 + 온보딩 2단계와 부분 대응(통합 화면은 신규)

## 4. 현재 디자인 MATCH

- 없음(0개). 현재 V4 구현 중 원본과 설계 일치를 선언할 수 있는 화면이 없다.

## 5. 현재 디자인 PARTIAL_MATCH

- accordion-album-archive / folding-person-archive / liquid-orbit-video-gallery / motion-archive(4개 아카이브)
- tree-pause-issue-state-v1
- first-journey-unified-v1(랜딩·발견·감정·연결 단계 일부)

## 6. 현재 디자인 MISSING

- 100-moments-season-temperature-v4
- people-book-shelf-v1
- people-book-shelf-v2-1-true-page-motion
- people-book-shelf-v2-3d
- people-book-shelf-v2a-2-interaction-stable

## 7. 별도 route 필요 원본

- 100-moments → `/v4/trees/demo/graph/100-moments`
- first-journey → `/v4/journey`(통합 온보딩)
- people-book-shelf v1 / v2-1 / v2-3d / v2a-2 → `/v4/subjects/bookshelf/{v1,v2-1,v2-3d,v2a-2}`

## 8. 기능 병합 대상

- 아카이브 4종 + tree-pause: **신규 화면이 아니라 기존 컴포넌트를 원본 구조로 정합**(route/명칭 유지).
- first-journey: 기존 `V4Landing`(히어로·발견 폼·이름 모달), `V4EmotionStep`(step2 폼), `V4ConnectStep`(step3 폼)의 폼·저장 로직을 통합 컴포넌트로 병합.
- 100-moments: `V4Finale300`·`V4SeasonArchive`와 개념 일부 공유(마일스톤/시즌)하나 구조가 달라 병합보다 **독립 신규**가 정확.

---

## 9. people-book-shelf 4개 처리안

네 variant는 **하나로 뭉개지 않는다**. 각각 고유 책장·페이지 전환·3D motion이 다르다.

| variant | 책장 | 페이지 전환 | 3D motion | 처리안 |
|---|---|---|---|---|
| v1 | 정적 CSS 그리드 | 없음(화면 전환+챕터 트리) | 책 rotateY −8°(정적) | 별도 route `/v4/subjects/bookshelf/v1`, 컴포넌트 `V4BookShelfV1` |
| v2-1 true-page-motion | 절대위치 3D 캐러셀 | 10-strip 컬 시트 | 책 비행 + 드래그 점진 펼침 + 표지 −165° | 별도 route `/v4/subjects/bookshelf/v2-1`, 컴포넌트 `V4BookShelfV2P1` |
| v2-3d | 가로 스크롤 플렉스 | CSS keyframe 플립(.58s) | 표지 −164° 고정 CSS | 별도 route `/v4/subjects/bookshelf/v2-3d`, 컴포넌트 `V4BookShelfV2D3` |
| v2a-2 interaction-stable | 3D 셸프 씬(translate3d 슬롯) | 세그먼트 곡면 플립 + 큐 | 상태 머신 + 코너 드래그 + 테마 전환 | 별도 route `/v4/subjects/bookshelf/v2a-2`, 컴포넌트 `V4BookShelfV2A2` |

- 별도 route 필요: **4개 모두**(디자인 문법이 서로 달라 동일 route mode로 통합하면 원본 정합성 훼손).
- 동일 route의 독립 mode: 불가(독립적인 스크린/리더 구조).
- 기존 subjects 화면에 기능 통합: 불가(기존 `V4PersonAlbums`·아카이브 4종과 구조가 다름).
- 디자인 문법이 달라 별도 컴포넌트: **예**(4개 모두).

## 10. first-journey 처리안

- 채택: **통합 온보딩 별도 route** `/v4/journey`, 신규 컴포넌트 `V4FirstJourney`.
- 통합 범위: unified-bar 4단계 nav(01 첫 순간/02 마음 남기기/03 다음 영상 잇기/04 러브트리 성장), 순차 잠금 게이트(firstMoment→memory→connections), step1 발견 폼, step2 감정 카드+성공 뷰, step3 연결 폼+성공 뷰, growth 카드 보드.
- storage 3키 유지: `lovetree-first-journey-unified` / `lovetree-step2-record` / `lovetree-step3-connection`.
- 기존 `/v4` 랜딩은 유지(공개 트리/사람 앨범 진입 역할)하고, `/v4/journey`를 첫 여정 전용으로 추가한다.

## 11. 100-moments 처리안

- 판정: **NEW_SCREEN_REQUIRED**(`EXISTING_SCREEN_VARIANT`/`FEATURE_MERGE` 해당 없음).
  - 300 milestone(`V4Finale300`)과 seasons(`V4SeasonArchive`)은 각각 "300개 성장 재생/꽃"·"시즌 보관"에 특화된 화면으로, 본 원본의 "100개 노드 그래프 + 5레이아웃 + 온도 인스펙터 + 시즌 오버레이"는 독립 화면이 맞다.
- 대상 route: `/v4/trees/demo/graph/100-moments`, 컴포넌트 `V4Moments100`.

## 12. tree-pause 차이 (요약)

원본과 V4의 차이는 §2.11 표를 따른다. 핵심:
- V4는 카드 그리드, 원본은 사이드바+SVG 트리+메모리 카드 5개+모달 6개.
- 상태 선택 3개(V4) vs 4개(원본), 공개 3단계(V4) vs 2단계(원본).
- localStorage 키·구조 상이: `lovetree-v4-tree-state`(3필드) vs `lovetree-tree-pause-issue-state-v1`(15필드).
- 트리 아트·이슈 노드·공개 미리보기·조용한 아카이브 패널 미구현.

## 13. 아직 없는 원본 3개

이번 11개 등록으로도 다음 3개 원본은 확보되지 않았다. 현재 구현이 있더라도 **source-faithful 최종 PASS로 선언하지 않는다**.

| 원본 ID | 현재 구현 | route |
|---|---|---|
| lovetree-rest-return-flow-v2-simple | `V4RestFlow` | `/v4/trees/demo/rest` |
| lovetree-growing-tree-300-plus-v2-freegraph | `V4Growth300Plus` | `/v4/trees/demo/growth/300-plus` |
| lovetree-growing-tree-season-archive-v3 | `V4SeasonArchive` | `/v4/trees/demo/seasons` |

(리포지토리 내 `reference/`, `[샘플]/`에서 이 3개 HTML 존재를 재확인했고, 없음을 확인.)

---

## 14. 최종 구현 파일·route·component 계획

> 다음 단계 지시에서 실행한다. 이 문서에는 계획만 기록한다.

| 우선순위 | 파일(신규/수정) | route | component | 내용 |
|---|---|---|---|---|
| P1 | `app/components/v4/V4FirstJourney.tsx` + `app/v4/journey/page.tsx` | `/v4/journey` | `V4FirstJourney` | 통합 4단계 온보딩(§10) |
| P1 | `app/components/v4/V4Moments100.tsx` + `app/v4/trees/demo/graph/100-moments/page.tsx` | `/v4/trees/demo/graph/100-moments` | `V4Moments100` | 100개 그래프+시즌+온도(§11) |
| P2 | `app/components/v4/V4BookShelfV1.tsx` + route | `/v4/subjects/bookshelf/v1` | `V4BookShelfV1` | v1 정적 책장(§9) |
| P2 | `app/components/v4/V4BookShelfV2P1.tsx` + route | `/v4/subjects/bookshelf/v2-1` | `V4BookShelfV2P1` | v2-1 컬 페이지(§9) |
| P2 | `app/components/v4/V4BookShelfV2D3.tsx` + route | `/v4/subjects/bookshelf/v2-3d` | `V4BookShelfV2D3` | v2-3d CSS 플립(§9) |
| P2 | `app/components/v4/V4BookShelfV2A2.tsx` + route | `/v4/subjects/bookshelf/v2a-2` | `V4BookShelfV2A2` | v2a-2 상태 머신(§9) |
| P3 | `app/components/v4/V4ArchiveExperiences.tsx`(수정) | 기존 4 route 유지 | `V4AccordionArchive` 외 3 | 원본 구조 정합(§2.2/2.4/2.5/2.6) |
| P3 | `app/components/v4/V4TreeState.tsx`(수정) | `/v4/trees/demo/state` 유지 | `V4TreeState` | 원본 구조 정합(§2.11) |

- 대상 route 명칭은 다음 구현 지시에서 기존 route 네이밍 컨벤션과 충돌 없이 확정한다.
- 모든 신규 화면은 원본과 동일한 storage 키·이벤트·미디어쿼리·애니메이션 규약을 따른다.

---

## 15. 변경 범위 검증

- app/**: 수정 0 (이번 단계)
- app/styles/**: 수정 0 (이번 단계)
- manifest(`v4-source-manifest.ts`) / implemented sources(`v4-implemented-sources.ts`): 수정 0 (이번 단계)
- route 추가: 0 (이번 단계)
- tests: 수정 0
- PR #31: 미변경
- merge: 미수행
- 배포: 미수행
- iframe 원본 삽입: 미사용
- 원본 HTML 수정: 0
- 이번 단계 신규 변경: `docs/v4/V4_ADDITIONAL_11_SOURCE_CLASSIFICATION.md` 1개 + cherry-pick된 원본 12개(11 HTML + ingestion 문서)
