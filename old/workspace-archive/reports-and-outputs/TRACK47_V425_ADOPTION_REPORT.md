# TRACK47_V425_ADOPTION_REPORT

Source Track 47 · Cinematic Front Door V4.2.5 (PINNED NAV MENU FIX) — adoption review
Issue #234 · refs #201 #80 #141. Implementation: isolated Design Lab candidate only.
**Canonical `/v4` change: NOT AUTHORIZED and NOT performed in this PR.**

---

## 1. What was pinned (source identity)

| Item | Value |
|---|---|
| HTML A `현재후보.html` | Drive `1aONTs8UGsz0Kzs3rpwhAhEPFyu1vo1Z7` · 40,890 B · `676f5220…a596` |
| HTML B `최종선택-…후보.html` | Drive `18tZB-eTCz6aeceNlbhXN3iEnfD1N442X` · 40,890 B · `676f5220…a596` |
| Byte identity | A ≡ B (one revision, never two) |
| Poster `poster-act01.jpg` | Drive `1jQ6A4RX933xPik9HKZmoyU55d969Xwg0` · 187,679 B · `1056d9b8…8fdd` — REPO_PINNED exact |
| Video `Track47_V4.2_Cinematic_DirectorCut_v2.1_CLEAN_1920x1080.mp4` | Drive `1dRmVkiHrV-dGJ4XNA4mp9ftKP5ozqRGT` · 28,650,099 B · `28951ccb…27ce` — NOT transported (see §3) |
| Lifecycle | `TRACK_47_V4.2.5_PINNED_NAV_MENU_FIX_CANDIDATE_FOR_OWNER_REVIEW` (filename prefix `최종선택-` alone is not an owner adoption decision) |

Complete source forensics: `docs/design/source-tracks/TRACK47_V425_SOURCE_FORENSICS.md`.

## 2. Delivered surfaces (isolated namespace)

- `/design-lab/source-tracks/47/v4-2-5/source` — SOURCE RUNNER. Fetches the served exact HTML, verifies bytes+SHA-256 in-browser, fail-closed gate (no iframe on mismatch), sandboxed (`allow-scripts`) exact execution. The absent video runs the source's own `video-failed` poster path — presented as `VIDEO_EXACT_ASSET_HOLD`, never as video fidelity PASS.
- `/design-lab/source-tracks/47/v4-2-5/native` — native React/TS/CSS candidate (no iframe), explicit state architecture:
  - `PlaybackState` — mode machine AUTO_CINEMATIC/USER_CONTROLLED/PAUSED/COMPLETED/REPLAY
  - `CinematicState` — act 1..5 / progress / CTA-ready projection (ACT boundaries 2.45/6.10/10.65/12.25/14.187007, CTA at 12.9)
  - `NavMenuState` — ONE canonical `openMenu` authority (hover styles only; no focus auto-open)
  - `MotionPreference` — reduced-motion 5-keyframe still mode
  - `RouteResolution` — `lib/source-track-47/route-map.ts` repo-route authority
- `design-intake/manifests/track-47-cinematic-frontdoor.json` — REFERENCE_CAPABILITY_ONLY / EXECUTABLE_FINGERPRINT_PINNED (no lineage reservation; SOURCE TRACK 47 ≠ repository Lineage 47).
- Tests: `tests/source-track-47-intake.test.mjs`, `-state.test.mjs`, `-native-contract.test.mjs` (27 tests, node --test, no browser classification) + explicit `tests/source-track-47-browser-qa.mjs` (Playwright; deliberately NOT a `.test.mjs` so the shared A-track browser-test gate is untouched).

## 3. Asset transport decision (Task B)

**Poster: REPO_PIN_ALLOWED** — 187,679 B, same scale as committed lineage PNGs (largest existing blob 2,703,222 B).

**Video: REPO_PIN_NOT_APPROPRIATE — VIDEO_EXACT_ASSET_HOLD (truthful hold):**
1. 28,650,099 B exceeds the Cloudflare Workers static-asset per-file limit (25 MiB). Everything in `public/` ships into `dist/client`; a commit would break the guarded `main → Production` auto-deploy fail-closed.
2. Repository precedent: Track62 V1.1's 22,264,995 B reference video is manifest `REFERENCE_ONLY`, never committed.
3. No substitute video is served at the declared path; the runner and native candidate execute the source-faithful missing-video behavior and explicitly label video fidelity HOLD.

## 4. Route normalization (Task E)

Audited against fresh-fetched `origin/main` (`21a3992` at implementation start):

| Source route | Classification | Resolution |
|---|---|---|
| moment57 Living Glass Cards | HOLD_UNRESOLVED | repo Lineage 57 is `lt-57-living-character-world` — different product; no route |
| moment58 Living Memory Pinboard | HOLD_UNRESOLVED | repo Lineage 58 is `lt-58-videofigure-atelier` — different product; no route |
| moment62 Memory Sculpture Rail | HOLD_UNRESOLVED | Lineage 62 reservation HOLD |
| moment63 3D Moment Field Studio | HOLD_UNRESOLVED | only implementation is PR #191 (SOURCE HOLD — not promoted) |
| moment64 Floating Moment Orbit | DESIGN_LAB_TARGET | `/design-lab/lineages/64/v1-2-1` (identity verified) |
| connection11 Memory Graph Observatory | HOLD_UNRESOLVED | V4 P2 MERGE_BEHAVIOR mapping recorded, merge not proven complete |
| connection16 Memory Topology Lab | HOLD_UNRESOLVED | V4 P2 ADOPT_NEW_V4_SCREEN pending; no route |
| tree46 / tree35 / tree39 | HOLD_UNRESOLVED | no repo routes |
| firstMoment 첫 순간 심기 | STABLE_REPO_TARGET | `/v4` (canonical V4 Entry) — mapping PROOF only in the candidate |

Fake local route promotion: **NO**. HOLD options render aria-disabled with `REVIEW PENDING` notice; no `file://`/`../../` hrefs exist anywhere in the candidate.

## 5. Mechanic adoption classification

### ADOPT_ENTRY_MATERIAL (candidate value — decision pending, NOT implemented)
- **Cinematic 5-act front door as product framing**: fixed full-screen stage, scroll-scrubbed film, per-act copy hierarchy, ghost word, ACT5 CTA. Value case: LoveTree currently lacks an emotional "front door"; the 5-act structure (first feeling → moment → bloom → why next → my lovetree) narratively matches the product spine (Moment → Connection → Why Next → My Tree). If adopted, it should sit BEFORE `/v4` entry resolution as marketing/first-visit framing, with the ACT5 CTA delegating to the canonical `/v4` first-moment entry (never replacing its auth/cardinality logic).
- Cost/risks: 28.65 MB exact video transport (needs an asset pipeline decision — R2/external hosting — before any product adoption); poster-only fallback is proven but is not the authored experience.

### ADOPT_NAV_CAPABILITY (recommended for reuse)
- **Pinned navigation menu contract** (trigger click pins popover; closes only on item select / outside pointer / Escape; 14px pointer bridge; first-option focus on open; aria-haspopup/aria-expanded; focus restore without re-open). This is a generic, surface-independent menu capability — reusable on any LoveTree surface with grouped destinations (e.g. tree surfaces with multiple view variants). The pure model in `lib/source-track-47/cinematic-model.ts` (`navTriggerPressed`/`navEscape`/…) is directly portable.
- **Scroll-scrub timeline mechanics** (eased scrubLoop, rail slider keyboard contract, reduced-motion keyframe parity) as an interaction grammar for cinematic surfaces.

### SOURCE_REFERENCE_ONLY
- Scene copy (act-specific Korean copy is design-authority wording; canonical surfaces must use their own product copy).
- Demo composer modal (source explicitly demo-only, no persistence).
- sessionStorage `lovetree.frontdoor.handoff` (file:// navigation glue; canonical entry already has an owner).
- Drive-local multi-track route collection UI (the 10-screen collection is a design-lab comparison context, not a product IA).

### HOLD
- Video fidelity (exact asset not transportable under current policy — see §3).
- moment63 target promotion (PR #191 SOURCE HOLD).
- Any canonical `/v4` replacement (explicitly NOT authorized by #234).

## 6. Required answers (Issue #234)

1. **Cinematic 5-act front door → canonical Entry?** Yes, as pre-entry framing material — recommend an owner decision to prototype `/v4` entry with a cinematic 5-act "front door" that delegates CTA → existing `/v4` entry resolver. Do NOT replace the entry resolver. Blocking prerequisite: exact-video hosting decision (28.65 MB > static-asset limit).
2. **Pinned navigation → reuse elsewhere?** Yes — high value, low risk, zero product-data coupling. Recommend extracting as a shared capability (button trigger, one openMenu authority, close-only-on {select,outside,Escape}, focus contract). The Track47 native implementation is the reference.
3. **Source-local multi-track navigation → canonical?** No. The 10-screen Drive collection is design-review context. Canonical IA must stay product-owned (`/v4` families); individual tracks enter through their own intake/adoption decisions (e.g. moment64 already has a lineage route).
4. **Combining with the current `/v4` MVP Entry contract?** The ACT5 `첫 순간 심기` maps to `/v4` (auth-aware entry resolver owns first-moment semantics — #226/#227). `러브트리 둘러보기` has no canonical target yet (tree46 HOLD) — if a "browse" entry is wanted, it should map to the canonical My Tree root after an owner decision, not to a Drive track.
5. **Never adopt:** file:// route resolution / Drive-local hrefs; the demo composer's fake input semantics; `최종선택-` filename being treated as adoption authority; auto-creating repository Lineage 47 from source Track 47; committing the 28.65 MB video into `public/`; claiming video fidelity from poster-only runs.

## 7. Validation status of this PR

See PR body / GLM53_234_TRACK47_V425_DEEP_IMPLEMENTATION_REPORT for the exact evidence matrix (focused tests 27/27, browser QA matrix, lint/typecheck/build, intake validation). Design Fidelity registry registration was NOT performed (the registry file is PR-#191-owned shared surface — noted as an isolated-registration blocker, not silently skipped).
