# LoveBud → V4 Product Spine Integration Matrix

**Date:** 2026-08-08  
**Track:** A — Product Spine Integration  
**Baseline:** `lovetree-limone` main `97aa06294d328ed0e816ee8518699d735ac41231`  
**Implementation branch:** `feat/v4-product-spine-integration-20260808`

## 1. Decision rule

V4 is the final UI baseline. LoveBud is the product intent / behavior / API-contract source of truth, not a runtime to copy wholesale.

Integration decisions use the following labels:

- `REUSE_CURRENT_LOVETREE_BACKEND` — current `lovetree-limone` Auth/API/DB capability already satisfies the runtime need.
- `PORT_LOVEBUD_BEHAVIOR` — preserve LoveBud product behavior/policy in the V4 integration.
- `PORT_LOVEBUD_API_CONTRACT` — bring a LoveBud response/request/privacy contract into the current runtime without replacing the runtime.
- `ADAPT_EXISTING_API` — current API is close but requires a compatibility/policy adjustment.
- `MISSING_BACKEND_CAPABILITY` — current runtime lacks a required persisted capability.
- `FRONTEND_ONLY_WIRING` — backend exists; the V4 surface is still fixture/local state/localStorage and needs wiring.
- `DEFER_POST_MVP` — not required for the first shippable product spine.

## 2. Sources inspected

### LoveBud product / design / engineering contracts

- `README.md`
- `AGENTS.md`
- `docs/doc_index.md`
- `docs/product/PRODUCT_IDENTITY.md`
- `docs/product/BRAND_EXPERIENCE.md`
- `docs/design/UI_DESIGN_SYSTEM.md`
- `docs/engineering/API_CONTRACT.md`
- `js/postgres-client.js`
- `js/my-trees.js`
- `js/editor.js`

### Current `lovetree-limone` runtime

- `lib/auth.tsx`
- `lib/firebase.ts`
- `lib/api.ts`
- `lib/tree-types.ts`
- `lib/moment-model.ts`
- `db/schema.ts`
- `server/api/access.ts`
- `server/api/trees.ts`
- `server/api/memories.ts`
- `app/page.tsx`
- `app/my-trees/page.tsx`
- `app/trees/[id]/page.tsx`

### Current V4 surfaces

- `app/v4/page.tsx`
- `app/v4/journey/page.tsx`
- `app/v4/trees/new/page.tsx`
- `app/v4/community/page.tsx`
- `app/components/v4/V4Landing.tsx`
- `app/components/v4/V4FirstJourney.tsx`
- `app/components/v4/V4EmotionStep.tsx`
- `app/components/v4/V4ConnectStep.tsx`
- `app/components/v4/V4TreeWorkspace.tsx`
- `app/components/v4/V4CommunityDiscovery.tsx`
- V4 timeline / album / graph / archive experience components and routes

## 3. Integration matrix

| Product capability | LoveBud source | LoveBud behavior | LoveBud API/data | Current lovetree backend | Current V4 screen | Current V4 data mode | Gap | Integration decision | Priority | Acceptance test |
|---|---|---|---|---|---|---|---|---|---|---|
| 비로그인 랜딩 | `PRODUCT_IDENTITY`, `BRAND_EXPERIENCE`, `index.html` | 감정 서비스 정체성 → 첫 순간/공개 감상 CTA | public read requires no token | Public routes can run without auth | `/v4`, `V4Landing` | fixture + local state | UI exists; auth-aware CTA/navigation not wired | `FRONTEND_ONLY_WIRING` | P0 | signed-out user can load `/v4` without API/auth error |
| 회원가입 | LoveBud login/auth runtime | 시작 장벽이 아니라 LoveTree 진입 | Firebase email/password + token | `AuthProvider.signUpWithEmailPassword` exists | no dedicated V4 auth surface | none | V4 has no signup UI | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | create account, user state becomes authenticated, API token accepted |
| 로그인 | LoveBud auth + protected-route behavior | Google/email login, then continue intended action | Firebase ID token | Google + email sign-in exist | V4 has no canonical login view | none | V4 CTA does not use shared auth | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | login from V4 and continue creation without switching product runtime |
| 로그아웃 | LoveBud auth runtime | clear app auth session | Firebase sign-out | `AuthProvider.logout` exists | no V4 account action | none | no visible V4 logout action | `FRONTEND_ONLY_WIRING` | P0 | logout makes private owner APIs return unauthenticated state |
| 재로그인 | LoveBud auth runtime | same account recovers server data | Firebase UID + server DB | already supported | V4 localStorage journey hides server source | localStorage | no server re-hydration | `FRONTEND_ONLY_WIRING` | P0 | logout → login → same tree/memory visible |
| 인증 상태 복원 | protected-route/auth cache behavior | reload must not destroy session | Firebase auth state listener | `onAuthStateChanged` exists globally in `AuthProvider` | all V4 under root provider | provider exists but unused | V4 product state not hydrated after auth restore | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | hard refresh restores signed-in state then loads server product data |
| 내 Tree 목록 | `js/my-trees.js` | owner trees load from API; empty/create/rename/delete/visibility actions | `GET /trees` owner list | `GET /api/trees` owner-only exists | no production V4 My Trees screen | fixture/demo navigation | missing V4 data binding | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | authenticated user sees actual trees from DB |
| Tree 생성 | My Trees actions / editor start | new tree begins public-first | `POST /trees`, title, visibility | `POST /api/trees`; idempotent `clientKey`; default public | `V4Landing`, `V4FirstJourney` | localStorage/local state | save does not hit API | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | submit once creates exactly one owner tree |
| Tree 읽기 | editor initial load / public detail | owner or readable public/unlisted tree | `GET /trees/:id` | `GET /api/trees/:id` with read guard exists | workspace/detail demos | fixtures | V4 does not hydrate by real id | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0/P1 | refresh by real tree id reproduces title + moments |
| Tree 수정 | My Trees/editor actions | owner may edit tree metadata | `PUT /trees/:id` | owner-guarded `PUT /api/trees/:id` exists | workspace controls are local | local state | no API call | `FRONTEND_ONLY_WIRING` | P1 | edit title/metadata persists after refresh |
| Tree 삭제 | My Trees actions | owner-only delete | `DELETE /trees/:id` | owner-guarded delete exists; memory FK cascade | V4 local delete patterns only | local state | no API call | `FRONTEND_ONLY_WIRING` | P1 | delete removes owner tree and dependent moments |
| visibility | `PRODUCT_IDENTITY`, API contract | public-first; private storage policy separated | tree `visibility` | enum supports private/unlisted/public; create defaults public | V4 does not own persisted visibility | local UI/fixtures | V4 not wired; Plus-private entitlement parity not established here | `ADAPT_EXISTING_API` + `FRONTEND_ONLY_WIRING` | P2 | persisted visibility matches policy and access behavior |
| public/private 정책 | product/API contract | public access and Browse eligibility are distinct | tree/memory visibility + entitlement | read guards exist, but policy parity incomplete | community/detail demos | fixtures | no full Plus-private contract in V4 runtime | `PORT_LOVEBUD_BEHAVIOR` | P2 | public direct read works; private is owner-only; Browse remains separate |
| 첫 순간 생성 | `PRODUCT_IDENTITY`, editor | first moment is product root, not a generic item | Tree + root Memory | `POST /api/trees/with-first-memory` already exists | `V4FirstJourney` | localStorage | V4 does not call atomic endpoint | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | first journey creates one tree + root memory atomically/idempotently |
| YouTube URL | editor / API contract | source URL is part of the remembered moment | `sourceUrl`, `sourceType=youtube` | schema/API support | V4 validates/extracts YouTube id | local state | not persisted | `FRONTEND_ONLY_WIRING` | P0 | saved Memory returns same `sourceUrl` |
| 특정 timestamp | API contract / editor | exact video point is core emotional anchor | Memory `timestamp` | schema/API validation support | V4 step2 `MM:SS` | localStorage | not persisted | `FRONTEND_ONLY_WIRING` | P0 | save `01:30`, reload returns `01:30` |
| 제목 | API contract | human-readable moment title | Memory `title` | supported | V4 first moment/title + workspace composer | local state | not persisted in V4 | `FRONTEND_ONLY_WIRING` | P0 | title survives refresh/relogin |
| 감정 | `PRODUCT_IDENTITY` Emotion Over Archive | emotion is core content | `emotionTags[]` | supported JSONB array | V4 emotion selection | localStorage | not persisted | `FRONTEND_ONLY_WIRING` | P0 | selected emotion appears in server Memory `emotionTags` |
| memo | product/editor contract | why this moment mattered is first-class | Memory `memo` | supported | V4 step2 note | localStorage | not persisted | `FRONTEND_ONLY_WIRING` | P0 | memo survives refresh/relogin |
| date | first-moment UX | discovery/record date is distinct from video timestamp | product requires date semantics | no dedicated occurrence/discovery-date column in canonical Memory | V4 has date input | localStorage | current schema conflates/omits distinct date semantics | `MISSING_BACKEND_CAPABILITY` | P1 | persisted discovery date is independent from video `timestamp` |
| first moment visibility | product/API contract | omitted Memory visibility inherits parent Tree | memory visibility optional/inherited | current create paths default Memory to `public` independently | V4 publicMemo/local controls | localStorage | inheritance contract not guaranteed for private parent | `ADAPT_EXISTING_API` + `PORT_LOVEBUD_API_CONTRACT` | P2 | omitted child visibility resolves to parent visibility |
| 저장 후 실제 DB persistence | product baseline | server is truth; local cache is optional acceleration | authenticated write/read | Neon + Drizzle write/read exists | V4 journey | localStorage only | central P0 gap | `FRONTEND_ONLY_WIRING` | P0 | API create → hard refresh → API read returns same root moment |
| 다음 순간 추가 | editor | grow tree by adding another moment | `POST /memories` | nested `POST /api/trees/:treeId/memories` exists | `V4FirstJourney` step3, `V4TreeWorkspace` composer | localStorage/local state | no server write | `FRONTEND_ONLY_WIRING` | P1 | second memory is persisted with stable ordering |
| parent/connection 관계 | Connected Love Path | child moment records which prior moment it follows | `parentId` | self-FK + same-tree parent validation exists | V4 step3/workspace | local parent ids | local id is not server id | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P1 | child `parentId` equals real parent Memory id |
| 관계 이유 | editor/connected-moment UX | connection has a human reason, not only graph edge | product behavior requires reason | no dedicated persisted edge/relation-reason field | V4 relation selector | localStorage | no canonical DB field for relation reason | `MISSING_BACKEND_CAPABILITY` | P1 | connection reason survives refresh independently of memo |
| 감정 연결 | Connected Love Path | later moments continue emotional trajectory | emotion tags + parent relation | emotionTags + parentId available | V4 step3/workspace | local | wiring only for basic tags/parent | `FRONTEND_ONLY_WIRING` | P1 | connected child has parentId + its own emotion data |
| 다음 순간으로 계속 성장 | editor | repeated append/growth loop | memory create/list/update | backend supports repeated create | V4 growth/workspace | local state | no server loop | `FRONTEND_ONLY_WIRING` | P1 | append several moments, refresh restores ordered graph |
| Tree workspace | editor | current tree + current moment + emotional flow | tree detail + memory list/write | APIs exist | `V4TreeWorkspace` | `INITIAL_MOMENTS` + localStorage | entire workspace remains fixture/local source | `FRONTEND_ONLY_WIRING` | P1 | opening real id renders server moments, not fixture set |
| Diary | editor / emotional scrapbook behavior | moments can be re-read as diary | same canonical memories | `lib/moment-model.ts` can project one source | V4 workspace diary | fixture | selector not bound to API | `FRONTEND_ONLY_WIRING` | P1/P3 | Diary and Tree show identical real Memory ids/content |
| Timeline | product experience | time-oriented re-view of same moments | same canonical memories | timeline selector exists | V4 timeline route | fixture/local | not bound | `FRONTEND_ONLY_WIRING` | P3 | Timeline uses same IDs and source records as Tree |
| Album | product experience | visual scrapbook view of same moments | same canonical memories | album selector exists | V4 album routes | fixture/local | not bound | `FRONTEND_ONLY_WIRING` | P3 | Album uses same IDs/source records as Tree |
| Graph | Connected Love Path | visualize emotional relationships, not generic flowchart | `parentId` tree edges | backend stores parentId | V4 graph/100-moments routes | fixture/local | graph not hydrated | `FRONTEND_ONLY_WIRING` | P3 | graph edges derive from real parentId relationships |
| Memory 수정 | editor | owner edits moment content | `PUT /memories/:id` | owner-guarded update exists | workspace local controls | local state | not wired | `FRONTEND_ONLY_WIRING` | P1 | edit persists and appears in all views after reload |
| Memory 삭제 | editor | owner removes moment with safe relationship handling | `DELETE /memories/:id` | owner-guarded delete exists; child `parentId` set null by FK | V4 local delete/reparent behavior | local state | UI behavior differs from DB set-null semantics | `ADAPT_EXISTING_API` + `FRONTEND_ONLY_WIRING` | P1 | deletion has explicitly tested child-edge outcome |
| 재배치/연결 | editor desktop curation | visual placement and relationship curation | relationship persisted; layout contract separate | parentId/sortOrder persist, canvas x/y do not | V4 drag/reposition | localStorage | spatial layout has no persisted model | `MISSING_BACKEND_CAPABILITY` | P3 | after reload, intended layout/relation contract is preserved |
| 공개 Tree | product/API contract | readable by unauthenticated visitor | public tree read | `GET /api/trees/:id` permits public/unlisted | V4 community/detail demo | fixtures | route not bound to real id | `FRONTEND_ONLY_WIRING` | P2 | signed-out visitor opens real public tree |
| 공개 Memory | API contract | only publicly visible memory under publicly readable tree is community material | public memory + public parent tree | single-memory read checks tree readability, but list endpoints need stricter child/tree filters | V4 public preview/detail | fixtures | public list privacy contract incomplete | `ADAPT_EXISTING_API` + `PORT_LOVEBUD_API_CONTRACT` | P2 | private child never leaks; private-tree child never appears in community |
| Browse eligibility | `PRODUCT_IDENTITY`, API contract | public Tree enters Browse only after enough public moments; baseline `publicMomentCount >= 3` | summary quality/display filter | current `/api/community/trees` filters only Tree visibility | V4 Community | fixtures | eligibility missing | `PORT_LOVEBUD_BEHAVIOR` + `ADAPT_EXISTING_API` | P2 | public tree with 0–2 public moments absent; 3+ eligible tree present |
| 공개 Tree 둘러보기 | browse API/client | appreciation hub, not generic feed | `/community/trees` summary | endpoint exists | `V4CommunityDiscovery` | hard-coded `TREES` | backend reusable; frontend fixture | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P2 | V4 cards come from real eligible public trees |
| 공개 Tree detail | detail/editor read-only | representative moment + emotional path | tree + community/public memories | public tree/memory read APIs exist with noted list gap | `/v4/community/trees/demo` | fixture | real-id detail absent | `FRONTEND_ONLY_WIRING` | P2 | `/v4/community/trees/<id>` renders only public content |
| 비로그인 감상 | product public loop | anonymous visitor can browse/read | no auth for public read | access model supports public/unlisted tree reads | V4 community demos | fixture | data wiring only + privacy fix | `FRONTEND_ONLY_WIRING` + `ADAPT_EXISTING_API` | P2 | signed-out browse/detail works without exposing owner-private data |
| 새로고침 | persistence contract | server data survives browser reload | GET after write | Neon persistence exists | V4 journey/workspace | localStorage | current apparent persistence is browser-only | `FRONTEND_ONLY_WIRING` | P0 | hard reload rehydrates from API/DB |
| logout → login | persistence contract | same UID recovers same trees/moments | owner GET by Firebase UID | supported | V4 has no rehydration | localStorage | current product state tied to browser cache | `FRONTEND_ONLY_WIRING` | P0 | logout/login restores exact server ids |
| 다른 브라우저 세션 | persistence contract | same account sees same server data | UID-bound DB records | supported by API/Auth architecture | V4 no server My Trees flow | localStorage cannot transfer | V4 hydration/list route missing | `FRONTEND_ONLY_WIRING` | P0/P1 | clean browser + same account lists same tree and root memory |
| 서버 데이터 복원 | product persistence | local state is not source of truth | Tree/Memory list/detail | supported | V4 first journey/workspace | localStorage | no canonical restore mapper | `FRONTEND_ONLY_WIRING` | P0 | deleting localStorage does not delete/lose server records |

## 4. Current architecture verdict

### Reuse now

The current `lovetree-limone` runtime already has the correct foundation for the P0 spine:

1. Firebase Authentication in the React root (`AuthProvider`).
2. Bearer-token authenticated `apiFetch`.
3. Neon/PostgreSQL + Drizzle persistence.
4. Owner-guarded Tree CRUD.
5. Owner-guarded Memory CRUD.
6. `parentId` relationship validation within a Tree.
7. deterministic/idempotent `POST /api/trees/with-first-memory`.
8. stable `sortOrder` for canonical Moment projections.
9. shared canonical moment selectors for Tree / Timeline / Album.

Therefore a new backend stack is **not** warranted for P0.

### Fix/adapt later, not replace runtime

1. Memory visibility inheritance is not yet equivalent to the LoveBud contract.
2. Community Tree summary currently lacks the LoveBud `>= 3 public moments` Browse eligibility gate.
3. Community/public Memory list paths need explicit parent-tree visibility enforcement and private-child filtering.
4. Distinct discovery/record date is not represented independently from video `timestamp` in canonical Memory storage.
5. Connection reason and canvas x/y layout do not have dedicated persisted fields.

The first three are product/privacy contract work. The latter two are data-model capability gaps and must not be hidden by abusing unrelated columns.

## 5. MVP scenario → code map

### A. Signed-out loop

`/v4` (`V4Landing` / V4 journey landing)
→ `/v4/community` (`V4CommunityDiscovery`, P2 real API wiring)
→ public V4 Tree detail by real id (P2)
→ start CTA
→ shared Firebase Auth through `AuthProvider`

P0 only needs to ensure the V4 entry remains usable signed-out and can transition into the authenticated creation path. Public Browse becomes the P2 completion of this loop.

### B. Signed-in creation loop

`AuthProvider`
→ V4 first journey
→ `POST /api/trees/with-first-memory`
→ `trees` + root `memories` rows in Neon
→ `GET /api/trees`
→ `GET /api/trees/:treeId`
→ `GET /api/trees/:treeId/memories`
→ V4 re-hydration
→ later P1 `POST /api/trees/:treeId/memories` with real `parentId`
→ later P1 edit/delete

Canonical field map for the first persisted root moment:

| V4 concept | Canonical API/DB field |
|---|---|
| Tree name | `trees.title` |
| public-first Tree | `trees.visibility = public` |
| YouTube URL | `memories.sourceUrl` |
| YouTube type | `memories.sourceType = youtube` |
| YouTube thumbnail | `memories.thumbnail` |
| Moment title | `memories.title` |
| Emotion | `memories.emotionTags[]` |
| Why it mattered | `memories.memo` |
| Video point | `memories.timestamp` |
| Root relation | `memories.parentId = null` |
| canonical first position | `memories.sortOrder = 0` |

The V4 discovery-date input remains a draft/UI field until a dedicated persisted date contract is approved; it must not overwrite video `timestamp`.

### C. Public product loop

Tree visibility `public`
→ public Memories accumulate
→ eligibility requires public Tree + minimum three public Memories + applicable quality/display filter
→ `/api/community/trees` summary
→ V4 Community discovery
→ V4 public Tree detail
→ emotional path appreciation

The current API only completes the first and part of the last steps. P2 must add LoveBud-equivalent eligibility and privacy filtering before V4 Community is treated as production-complete.

## 6. A-track P0 vertical slice selected

The first implementation slice is deliberately smaller than the entire P0 backlog:

> **V4 First Journey → shared Firebase Auth → atomic real Tree + root Memory write → server re-hydration after refresh/relogin.**

Implementation constraints:

- keep V4 visual structure intact;
- do not import LoveBud UI;
- use current `lovetree-limone` Firebase/Auth/API/Neon runtime;
- use `POST /api/trees/with-first-memory` instead of re-creating Tree/Memory transactional behavior in the UI;
- keep localStorage only for draft/navigation hints or a last-tree pointer, never as the authoritative persisted product record;
- server data wins during authenticated hydration;
- no Production write/deploy or schema migration in this slice.

## 7. P0 acceptance contract for this branch

1. V4 renders for signed-out users.
2. Persist action requires/shared Firebase authentication.
3. One submission creates exactly one Tree and one root Memory through the existing idempotent endpoint.
4. Root Memory persists YouTube URL, thumbnail, title, emotion tag, memo and video timestamp.
5. On hard refresh, an authenticated user re-hydrates the persisted Tree/root Memory from API data.
6. After logout and login with the same account, the same persisted server record can be recovered.
7. No Production deployment or Production DB write is performed as part of validation.
8. No Telegram source, PR #37, PR #44, or intake-design branch is modified.

## 8. Deferred backlog produced by this audit

### P0 continuation

- V4-visible auth entry/logout controls.
- Real V4 My Trees list and real-id Tree read route.
- clean-browser restore through My Trees, independent of local pointer state.

### P1

- connect V4 workspace to canonical real memories;
- add second/next Memory with real `parentId`;
- persist/edit/delete moments and trees;
- define a first-class persisted connection-reason contract;
- define a first-class discovery/record-date contract.

### P2

- enforce public parent + public child privacy on community reads;
- implement Browse eligibility (`>= 3` public moments baseline);
- wire V4 Community and public detail to real APIs;
- complete visibility policy/Plus-private parity.

### P3

- hydrate Timeline / Album / Graph / Archive from the same canonical Moment source;
- decide whether canvas x/y placement is durable product data and, if yes, add a dedicated layout persistence contract.
