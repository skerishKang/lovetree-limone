# LoveBud → V4 Product Spine Integration Matrix

**Date:** 2026-08-08  
**Track:** A — Product Spine Integration  
**Baseline:** `lovetree-limone` main `97aa06294d328ed0e816ee8518699d735ac41231`  
**Implementation branch:** `feat/v4-product-spine-integration-20260808`

## 1. Integration principle

V4 is the final UI/UX baseline. LoveBud is the source of truth for product intent, behavioral rules and product/API contracts. The final runtime remains the current `lovetree-limone` stack wherever it already provides stable Auth/API/DB/production capability.

This audit therefore does **not** copy the LoveBud UI or replace the current backend wholesale. Every capability is classified using one or more of:

- `REUSE_CURRENT_LOVETREE_BACKEND`
- `PORT_LOVEBUD_BEHAVIOR`
- `PORT_LOVEBUD_API_CONTRACT`
- `ADAPT_EXISTING_API`
- `MISSING_BACKEND_CAPABILITY`
- `FRONTEND_ONLY_WIRING`
- `DEFER_POST_MVP`

## 2. Sources inspected

### LoveBud product / design / engineering sources

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
- `server/api/validate.ts`
- `server/api/trees.ts`
- `server/api/memories.ts`
- existing non-V4 authenticated Tree/Browse surfaces

### Current V4 surfaces

- `/v4` → `V4Landing`
- `/v4/journey` → `V4FirstJourney`
- `/v4/trees/new`
- V4 Tree workspace routes/components
- `/v4/community` → `V4CommunityDiscovery`
- V4 public-tree demo/detail surfaces
- V4 Diary / Timeline / Album / Graph / Archive experiences

## 3. Product contract that must survive integration

LoveTree is a **Digital Scrapbook of Emotions**, not a generic bookmark manager or CRUD dashboard. The core loop is:

> first moment → emotional record → connected next moment → LoveTree growth → re-view → public-tree appreciation

The important LoveBud rules retained by A-track are:

1. the minimum product unit is a **Moment**, not a link;
2. the first Moment is the emotional root of a Tree;
3. later Moments can point to a previous Moment through `parentId`;
4. new Trees are public-first;
5. direct public readability and Browse eligibility are separate concepts;
6. omitted Memory visibility should inherit the parent Tree policy;
7. a private Tree must never become community-discoverable through a public child Memory;
8. the LoveBud Browse baseline requires a public Tree to have at least three public Moments before discovery eligibility.

## 4. Critical current-runtime semantic finding

The current `lovetree-limone` field named `Memory.timestamp` is **not a video MM:SS position**. `server/api/validate.ts` validates it as `YYYY-MM-DD`, and Tree/Memory create paths invoke that validator. Existing runtime semantics therefore treat it as a record/discovery date.

V4, however, asks for both:

- a discovery/record date; and
- an exact YouTube video point such as `01:30`.

For the migration-free P0 slice:

- discovery date → current `memories.timestamp` (`YYYY-MM-DD`);
- exact video point → canonical `memories.sourceUrl` as a YouTube deep-link with `t=<seconds>s`;
- V4 re-hydration reconstructs `MM:SS` from that URL.

This preserves both values without a destructive migration. A dedicated `videoOffsetSeconds`/`videoTimestampSeconds` field remains a P1 contract candidate if URL-level persistence is not sufficient for later Graph/Timeline/editor behavior.

## 5. Capability integration matrix

| Product capability | LoveBud source | LoveBud behavior | LoveBud API/data | Current lovetree backend | Current V4 screen | Current V4 data mode | Gap | Integration decision | Priority | Acceptance test |
|---|---|---|---|---|---|---|---|---|---|---|
| 비로그인 랜딩 | `PRODUCT_IDENTITY`, `BRAND_EXPERIENCE` | product identity first; public appreciation/start CTA | public read does not require user token | public routes and root `AuthProvider` already exist | `/v4`, `V4Landing` | mostly visual/local navigation | landing was not connected to real creation/auth spine | `FRONTEND_ONLY_WIRING` | P0 | signed-out user loads `/v4` and can enter real creation/auth path |
| 회원가입 | LoveBud auth flow | account creation is a transition into the first Tree, not a separate product | Firebase identity → bearer token | shared `AuthProvider.signUpWithEmailPassword` exists | V4 had no canonical signup surface | none | V4 must reuse shared auth rather than make a second auth runtime | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | email signup produces authenticated user accepted by owner API |
| 로그인 | LoveBud protected editor/My Trees | login resumes intended product action | Firebase ID token | Google + email sign-in exist | V4 had no real login action | none | V4 CTA was disconnected | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | V4 login succeeds and authenticated API calls carry bearer token |
| 로그아웃 | LoveBud auth | clear auth session, leave public experience usable | Firebase sign-out | shared `logout` exists | no persisted V4 account action before A-track | none | wiring | `FRONTEND_ONLY_WIRING` | P0 | logout clears authenticated user and owner-only calls no longer succeed anonymously |
| 재로그인 | LoveBud auth + server persistence | same identity gets same Trees/Moments | UID-owned server records | supported by current Auth/API/DB | V4 localStorage flows masked server source | localStorage | server re-hydration needed | `FRONTEND_ONLY_WIRING` | P0 | logout → same account login → same Tree/root Memory ids restored |
| 인증 상태 복원 | LoveBud protected-route behavior | refresh must not destroy session/product state | Firebase auth-state restoration | `onAuthStateChanged` in root provider | all V4 runs under provider | provider unused by many V4 demos | product hydration must follow auth restoration | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | hard refresh restores auth then reloads server Tree/Memory |
| 내 Tree 목록 | `js/my-trees.js` | owner sees actual Trees with empty/create/manage states | `GET /trees` owner list | `GET /api/trees` owner list exists | no final V4 My Trees product surface yet | fixture/demo links | visual list still missing real binding | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 continuation | same user sees real DB Trees, including from a clean browser |
| Tree 생성 | My Trees/editor start | create a named public-first emotional Tree | Tree create with title/visibility | `POST /api/trees`; atomic `with-first-memory`; client-key idempotence | `/v4`, `/v4/trees/new` | previously localStorage | real write missing in V4 | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | one submit creates exactly one owner Tree |
| Tree 읽기 | editor | hydrate real Tree by id | `GET /trees/:id` | owner/public readable Tree GET exists | V4 workspace/detail demos | fixtures/local | real-id hydration absent in final workspace | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0/P1 | reload real id returns same Tree metadata |
| Tree 수정 | My Trees/editor | owner edits metadata | Tree update | owner-guarded `PUT /api/trees/:id` | V4 controls/local forms | local state | not wired | `FRONTEND_ONLY_WIRING` | P1 | edit survives hard refresh |
| Tree 삭제 | My Trees | owner deletes Tree | Tree delete | owner-guarded DELETE + dependent Memory handling exists | local/demo delete affordances | local state | not wired | `FRONTEND_ONLY_WIRING` | P1 | delete removes Tree and no stale V4 entry remains |
| visibility | Product/API contract | public-first; private policy is a product decision | Tree visibility + Memory visibility | `private/unlisted/public` enum supported; Tree create defaults public | V4 visibility affordances are not authoritative | local/fixture | frontend wiring plus policy parity work | `ADAPT_EXISTING_API` + `FRONTEND_ONLY_WIRING` | P2 | persisted visibility drives read authorization and community eligibility |
| public/private 정책 | Product/API contract | direct read, storage privacy, Browse eligibility are distinct | parent/child visibility contract | tree read guards exist; child-list policy incomplete | community/public demos | fixtures | LoveBud privacy inheritance/discovery contract not fully enforced | `PORT_LOVEBUD_BEHAVIOR` + `PORT_LOVEBUD_API_CONTRACT` | P2 | private Tree is owner-only and never discoverable; private child never leaks |
| 첫 순간 생성 | `PRODUCT_IDENTITY`, editor | first Moment is the emotional root | Tree + root Memory | deterministic `POST /api/trees/with-first-memory` exists | V4 First Journey / new Tree flow | previously localStorage | V4 did not call atomic endpoint | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | exactly one Tree + root Memory created atomically/idempotently |
| YouTube URL | editor/API contract | source is part of remembered Moment | `sourceUrl`, `sourceType=youtube` | supported | V4 YouTube inputs | local state | persistence wiring | `FRONTEND_ONLY_WIRING` | P0 | server Memory returns same canonical YouTube source |
| 특정 영상 시점 | Connected/first-Moment UX | exact scene point is part of why the Moment matters | LoveBud product requires exact point; current field naming is not sufficient evidence of MM:SS | **no dedicated MM:SS field**; current `timestamp` validator is date-only | V4 `MM:SS` inputs | local state | backend data shape has no first-class video offset | `ADAPT_EXISTING_API` now; `MISSING_BACKEND_CAPABILITY` candidate later | P0/P1 | P0 `sourceUrl` contains `t=<seconds>s`; reload reconstructs same MM:SS; P1 decides dedicated offset field |
| 제목 | API contract | readable title for Moment | `title` | supported | V4 first/next Moment forms | local | wiring | `FRONTEND_ONLY_WIRING` | P0 | title survives refresh/relogin |
| 감정 | Emotion Over Archive | emotion is first-class product data | `emotionTags[]` | JSON/array support exists | V4 emotion chooser | localStorage/local | wiring | `FRONTEND_ONLY_WIRING` | P0 | selected emotion persists in `emotionTags` |
| memo | editor/product contract | why the moment mattered is first-class | `memo` | supported | V4 notes | local | wiring | `FRONTEND_ONLY_WIRING` | P0 | memo survives refresh/relogin |
| date | first-Moment UX | preserve when the Moment was discovered/recorded | current LoveTree contract uses `timestamp` as date | `validateTimestamp` enforces `YYYY-MM-DD`; create/update support it | V4 date input | local | V4 had not wired the existing date contract | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P0 | chosen date is returned as `Memory.timestamp` after refresh/relogin |
| Memory visibility | API/product contract | omitted child visibility inherits Tree policy | optional/inherited child policy | current Memory builders independently default to `public` | V4 memo visibility UI | local | inheritance mismatch | `ADAPT_EXISTING_API` + `PORT_LOVEBUD_API_CONTRACT` | P2 | omitted child visibility resolves to parent Tree visibility |
| 저장 후 실제 DB persistence | product baseline | server is source of truth | authenticated writes and reads | Neon/Drizzle persistence exists | V4 creation | localStorage before A-track | central P0 frontend gap | `FRONTEND_ONLY_WIRING` | P0 | create → hard refresh → same server Tree/root Memory |
| 다음 순간 추가 | editor | keep growing after first root | Memory create | nested `POST /api/trees/:treeId/memories` exists | V4 step3/workspace composer | local state | no server write | `FRONTEND_ONLY_WIRING` | P1 | second/third Moments persist with stable order |
| parent/connection 관계 | Connected Love Path | child records which prior Moment led to it | `parentId` | self-FK + same-Tree validation exists | V4 step3/workspace | local ids | convert UI ids to canonical server ids | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P1 | child `parentId` equals real parent Memory id |
| 관계 이유 | Connected Love Path | edge has a human reason, not only topology | behavior requires reason | no dedicated relation-reason field identified | V4 relation selector | localStorage | canonical persistence missing | `MISSING_BACKEND_CAPABILITY` | P1 | relation reason survives reload without overloading memo |
| 감정 연결 | Connected Love Path | later Moment continues emotional trajectory | child emotion + parent relation | `emotionTags` + `parentId` exist | V4 step3/workspace | local | wiring | `FRONTEND_ONLY_WIRING` | P1 | connected child retains its own emotion and parent id |
| 계속 성장 | editor | repeated append, not one-shot form | Memory create/list | repeated create supported | V4 growth/workspace | local | server loop absent | `FRONTEND_ONLY_WIRING` | P1 | several appended Moments restore in deterministic order |
| Tree workspace | editor | Tree is primary emotional workspace | Tree detail + Memory list/write | APIs exist | `V4TreeWorkspace` | `INITIAL_MOMENTS` + localStorage | entire workspace still noncanonical | `FRONTEND_ONLY_WIRING` | P1 | real Tree id renders server Moments, not fixtures |
| Diary | product experience | re-read same canonical Moments as diary | same Memory source | shared moment-model projection exists | V4 workspace/Diary | fixture | selector/API binding missing | `FRONTEND_ONLY_WIRING` | P1/P3 | Diary and Tree show same canonical Memory ids |
| Timeline | product experience | chronological re-view of same emotional records | same Memory source/date | selector support exists | V4 Timeline | fixture/local | hydration | `FRONTEND_ONLY_WIRING` | P3 | Timeline derives from canonical server records |
| Album | product experience | visual scrapbook projection of same records | same Memory source | selector support exists | V4 Album variants | fixture/local | hydration | `FRONTEND_ONLY_WIRING` | P3 | Album uses same ids/content as Tree |
| Graph | Connected Love Path | visualize emotional relationship graph | `parentId` edges | parent relation persisted | V4 Graph/100 Moments | fixtures | hydration | `FRONTEND_ONLY_WIRING` | P3 | graph edges derive from real parentIds |
| Memory 수정 | editor | owner refines Moment | Memory PUT | owner-guarded update exists | V4 workspace local edits | local | wiring | `FRONTEND_ONLY_WIRING` | P1 | edit survives reload and updates all projections |
| Memory 삭제 | editor | owner removes Moment safely | Memory DELETE | owner-guarded delete; DB child-edge semantics must be reconciled with V4 | V4 local delete/reparent | local | V4 reparent behavior may differ from DB set-null behavior | `ADAPT_EXISTING_API` + `FRONTEND_ONLY_WIRING` | P1 | deletion has explicit tested child-edge result |
| 재배치/연결 | editor desktop curation | user can curate visual relation/layout | relationship is durable; spatial contract separate | `parentId`/sortOrder persist; no x/y layout fields | V4 drag canvas | localStorage | spatial placement persistence missing | `MISSING_BACKEND_CAPABILITY` | P3 | reload preserves approved durable layout contract if product requires it |
| 공개 Tree | product/API contract | anonymous visitor can appreciate readable public Tree | public Tree read | public/unlisted direct-read guard exists | V4 community/public demos | fixtures | real-id V4 binding absent | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P2 | signed-out visitor opens real public Tree |
| 공개 Memory | product/API contract | public child of public-readable Tree is public material | child + parent visibility | single readable access exists; collection/community filtering needs hardening | V4 public preview/detail | fixtures | child-list privacy contract incomplete | `ADAPT_EXISTING_API` + `PORT_LOVEBUD_API_CONTRACT` | P2 | private child and child of private Tree never leak |
| Browse eligibility | `PRODUCT_IDENTITY`, API contract | visibility alone is insufficient; baseline public Moment count >= 3 | community summary eligibility | current community Tree query filters Tree visibility but not public-Moment threshold | `/v4/community` | fixtures | threshold missing | `PORT_LOVEBUD_BEHAVIOR` + `ADAPT_EXISTING_API` | P2 | public Tree with 0–2 public Moments absent; eligible 3+ Tree present |
| 공개 Tree 둘러보기 | Browse client/API | appreciation/discovery hub, not generic feed | community Tree summaries | `/api/community/trees` exists | `V4CommunityDiscovery` | hard-coded `TREES` | backend partially reusable, frontend fixture | `REUSE_CURRENT_LOVETREE_BACKEND` + `FRONTEND_ONLY_WIRING` | P2 | V4 cards originate from eligible server Trees |
| 공개 Tree detail | public read-only editor/detail | representative Moment and emotional path, no private editor data | Tree + public Moments | constituent APIs largely exist | V4 public demo detail | fixture | real route/data binding + privacy filter needed | `FRONTEND_ONLY_WIRING` + `ADAPT_EXISTING_API` | P2 | `/v4/community/trees/<real-id>` renders only public material |
| 비로그인 감상 | public loop | no login required to appreciate public Tree | anonymous public read | supported at Tree access layer | V4 Community/detail demos | fixtures | frontend wiring/privacy completion | `FRONTEND_ONLY_WIRING` + `ADAPT_EXISTING_API` | P2 | signed-out Browse/detail works without owner-private data |
| 새로고침 | persistence contract | server data survives browser reload | GET after write | supported | V4 local flows | localStorage before A-track | server hydration | `FRONTEND_ONLY_WIRING` | P0 | hard reload rehydrates persisted Tree/root Memory from API |
| logout → login | persistence contract | same UID sees same data | owner list/detail | supported | V4 had no server restore | browser-local | re-hydration | `FRONTEND_ONLY_WIRING` | P0 | logout/login restores same server ids/data |
| 다른 브라우저 세션 | persistence contract | account identity, not browser cache, owns data | owner list/detail | current API supports it | V4 had no real My Trees | localStorage cannot transfer | need server-list fallback and final My Trees UI | `FRONTEND_ONLY_WIRING` | P0/P1 | clean browser + same account can discover same Tree through server list |
| 서버 데이터 복원 | persistence contract | local cache is never authoritative product storage | Tree/Memory list/detail | supported | V4 local journey/workspace | localStorage | canonical restore mapping | `FRONTEND_ONLY_WIRING` | P0 | clearing local product cache does not delete server record; server list restores it |

## 6. Current architecture verdict

### Reuse the current runtime

The existing `lovetree-limone` runtime already provides the correct P0 foundation:

1. Firebase Authentication in the React root.
2. authenticated `apiFetch` using Firebase ID tokens.
3. Neon/PostgreSQL + Drizzle persistence.
4. owner-guarded Tree CRUD.
5. owner-guarded Memory CRUD.
6. same-Tree `parentId` validation.
7. deterministic/idempotent `POST /api/trees/with-first-memory`.
8. stable `sortOrder` for canonical projections.
9. canonical moment projection helpers for multiple views.
10. current `timestamp` date validation and persistence.

A new backend/auth/database stack is therefore not justified.

### Current gaps that require adaptation, not a runtime replacement

1. Memory visibility omission does not currently inherit Tree visibility.
2. community Tree summaries do not enforce the LoveBud `>= 3 public Moments` Browse baseline.
3. public/community Memory list paths require parent-Tree visibility + child visibility enforcement.
4. no first-class persisted video-offset field exists; P0 preserves it through YouTube deep-link semantics in `sourceUrl`.
5. no dedicated connection-reason field has been identified.
6. no durable canvas x/y layout contract has been identified.

## 7. MVP scenarios mapped to code

### 7.1 Signed-out loop

`/v4` (`V4Landing`)
→ `/v4/community` (`V4CommunityDiscovery`, real-data completion is P2)
→ public Tree detail by real id (P2)
→ `첫 순간 심기`
→ `/v4/trees/new`
→ shared `EmailAuthForm` / Firebase login or signup

P0 does not pretend the fixture Community page is production-ready. It establishes the authenticated creation spine while preserving signed-out V4 entry.

### 7.2 Signed-in creation loop

`AuthProvider`
→ `/v4/trees/new`
→ V4 Tree name + YouTube URL + exact video point + emotion + memo + discovery date
→ YouTube URL normalized with `t=<seconds>s`
→ `POST /api/trees/with-first-memory`
→ Neon-backed `trees` + root `memories`
→ store only last Tree id/client idempotency key locally
→ refresh
→ `GET /api/trees/:id`
→ `GET /api/trees/:id/memories`
→ server values re-hydrate V4
→ logout
→ login
→ same API hydration
→ if browser has no last-tree pointer, fallback `GET /api/trees` locates owner data

P1 continues from that root with `POST /api/trees/:treeId/memories`, real `parentId`, edit/delete and full `V4TreeWorkspace` binding.

### 7.3 Canonical P0 field map

| V4 concept | P0 canonical persistence |
|---|---|
| Tree name | `trees.title` |
| public-first Tree | `trees.visibility = public` |
| first-Moment title | `memories.title` |
| YouTube video | `memories.sourceUrl`, `sourceType = youtube` |
| exact video point | YouTube `sourceUrl` deep-link `t=<seconds>s` |
| discovery date | `memories.timestamp` (`YYYY-MM-DD` current runtime contract) |
| emotion | `memories.emotionTags[]` |
| why it mattered | `memories.memo` |
| root relationship | `memories.parentId = null` |
| canonical first position | `memories.sortOrder = 0` |
| first-Moment visibility | explicit `public` for P0 public-first slice; inheritance parity is P2 contract work |

## 8. Public product loop mapping

Tree is persisted as `public`
→ public Memories accumulate
→ eligibility must become: public Tree + minimum three public Memories + applicable quality/display rules
→ `/api/community/trees`
→ V4 Community discovery
→ public V4 Tree detail
→ emotional path appreciation

The current backend completes public Tree readability and community summary basics, but **does not yet complete Browse eligibility or collection-level privacy parity**. Those items are P2 release gates, not reasons to replace the runtime.

## 9. P0 vertical slice implemented on this branch

The smallest complete product-spine implementation is:

> **V4 entry → shared Firebase Auth → atomic real Tree + root Memory write → server re-hydration after refresh/relogin.**

Implementation rules:

- V4 visual language remains the UI baseline.
- no LoveBud UI is copied.
- no replacement Firebase/Auth/API/DB runtime is introduced.
- `POST /api/trees/with-first-memory` is reused.
- localStorage is used only for a last-Tree pointer and idempotency key, never the Moment payload.
- server data wins during authenticated hydration.
- no Production deploy, Production DB write, Auth config change or schema migration is part of this branch.
- no Telegram/B-track implementation is included.

## 10. P0 acceptance contract

Code/static/integration gates for this slice:

1. V4 signed-out entry remains renderable.
2. save requires the shared Firebase authentication path.
3. one create request targets the existing atomic/idempotent Tree + first-Memory endpoint.
4. root Memory persists title, emotion, memo, discovery date and YouTube source.
5. exact video point is preserved as `sourceUrl?t=<seconds>s` and reconstructed as MM:SS on hydration.
6. hard refresh rehydrates Tree/root Memory from server API rather than from a local JSON payload.
7. logout followed by login can rehydrate the same server record.
8. no-local-pointer path falls back to owner `GET /api/trees`, enabling cross-browser server recovery in the product spine even before the final My Trees UI is wired.
9. no protected PR/Telegram design branch is modified or merged.

Runtime release gate still requires a **non-production** authenticated environment to execute signup/login → Tree/Memory create → refresh → logout → relogin against a disposable/test database. Production writes are explicitly prohibited for this track.

## 11. Deferred backlog produced by this audit

### P0 continuation

- final V4 My Trees screen bound to owner `/api/trees`.
- real-id V4 Tree read shell/workspace entry.
- non-production authenticated persistence E2E fixture/environment if one is not already available.

### P1 — Connected Growth

- bind `V4TreeWorkspace` to canonical Tree/Memories.
- append second and later Memory with real `parentId`.
- Memory edit/delete and Tree edit/delete.
- define/persist connection reason.
- decide whether video offset graduates from `sourceUrl?t=` to a dedicated `videoOffsetSeconds` field.
- explicitly reconcile child behavior on parent-Memory deletion.

### P2 — Public Product Loop

- implement Tree-visibility inheritance for omitted Memory visibility.
- enforce public parent + public child on community/public Memory collections.
- implement Browse eligibility (`>= 3` public Moments baseline).
- wire `V4CommunityDiscovery` to real summaries.
- add real-id public V4 Tree detail.
- finish private/unlisted/public product-policy parity.

### P3 — Rich Experiences

- hydrate Timeline, Album, Graph and Archive from the same canonical Moment source.
- decide whether V4 canvas x/y placement is durable product data; if yes, add a dedicated layout persistence contract rather than hiding it in unrelated fields.
