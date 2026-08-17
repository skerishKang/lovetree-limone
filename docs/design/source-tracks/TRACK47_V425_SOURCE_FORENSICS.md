# Source Track 47 · Cinematic Front Door V4.2.5 — Complete Source Forensics

- Issue: #234 ([Source Track 47] Cinematic Front Door V4.2.5 intake + Entry/Living Home adoption review)
- Pinned source: `현재후보.html` ≡ `최종선택-12_V4.2.5_CINEMATIC_FRONTDOOR·PINNED_NAV_MENU_FIX_후보.html`
- Bytes: 40,890 · SHA-256: `676f5220ec4e4c8c1b15c36eaeb6a2ee4320ecceb7e413b15eee585e8ed9a596` (byte-identical pair — ONE revision)
- Drive folder: `1cQLZEA2auL2qaab9rP-0TjhcrFXC1m5m` (`12_V4.2.5_CINEMATIC_FRONTDOOR·PINNED_NAV_MENU_FIX_후보` under `47_시즌수채화블_통합개발`)
- Design-lead lifecycle: `TRACK_47_V4.2.5_PINNED_NAV_MENU_FIX_CANDIDATE_FOR_OWNER_REVIEW`
- This document is a complete read of the pinned HTML. No guessing; every claim below is traceable to the source text.

## 1. Runtime dependencies

- Zero external runtime dependencies: no CDN, no fonts fetched over the network (font stacks are local family lists: Pretendard Variable/SUIT/Wanted Sans/Noto Sans KR/… + Manrope/Space Grotesk/Inter).
- Asset references (relative): `assets/poster-act01.jpg` (poster attribute + `.poster-fallback` background) and `assets/Track47_V4.2_Cinematic_DirectorCut_v2.1_CLEAN_1920x1080.mp4` (`<source>`).
- Self-contained single-file application; `color-scheme: dark`, `lang="ko"`, viewport `viewport-fit=cover`.

## 2. DOM structure

```
body (min-height 600vh scroll driver, overflow-x hidden)
├─ main.stage#stage[data-act][aria-live=polite]  (position:fixed; inset:0; 100svh)
│  ├─ .video-world[aria-hidden]                  (absolute, overflow hidden)
│  │  ├─ video#film (muted playsinline preload=auto poster=poster-act01.jpg)
│  │  │  └─ source#filmSource (mp4)
│  │  └─ .poster-fallback                        (bg image, opacity 0 → 1 on failure)
│  ├─ .scrim#scrim[data-act]                     (per-act gradient overlays, z2)
│  ├─ nav.nav[aria-label="LoveTree front door"]  (z8, 68px)
│  │  ├─ a.brand (LOVETREE, data-action=replay)
│  │  └─ .nav-links
│  │     ├─ .nav-group ×3 (Moments / Connections / My Tree)
│  │     │  ├─ button.nav-link[data-nav-menu][aria-haspopup=true][aria-expanded]
│  │     │  └─ .nav-popover[role=menu] > a.nav-option[data-route] ×5/2/3
│  │     └─ a.nav-plant (첫 순간 심기, direct data-route=firstMoment)
│  ├─ section.scene-copy.act-1..5[data-copy-act] (eyebrow/h1/sub; act4 +reason-list+tiny; act5 +cta-row)
│  ├─ .ghost-word (LOVETREE, act5 only, desktop only)
│  ├─ .mini-controls (playPause / muteBtn[aria-pressed] / stateChip)
│  ├─ .progress (progressCount "01 / 05" / progressLabel / .progress-rail[role=slider][tabindex=0])
│  ├─ .reduced-card#reducedCard (reducedPlay + "5 KEYFRAME STILL MODE")
│  └─ section.fallback-message#fallbackMessage (video-failed CTA surface)
├─ .modal-shell#modal[role=dialog][aria-modal=true] (demo composer)
└─ .route-notice#routeNotice[role=status][aria-live=polite] (toast)
```

## 3. State variables (source script)

| Variable | Type | Initial | Authority |
|---|---|---|---|
| `mode` / `priorMode` | enum | `AUTO_CINEMATIC` | film timeline ownership |
| `duration` | seconds | `14.187007` (ACTS[4].end), replaced on `loadedmetadata` | timeline length |
| `targetTime` / `scrubTime` | seconds | 0 | user scrub target / eased position |
| `userAuthority` | boolean | false | user took over autoplay |
| `stillMode` | boolean | `reduceMotion.matches` | reduced-motion keyframe mode |
| `dragRail` | boolean | false | rail pointer capture |
| `failure` | boolean | false | video error state |
| `restorePending` | payload/null | null | handoff awaiting loadedmetadata |
| `routeNoticeTimer` | timer id | 0 | toast auto-hide (2800ms) |
| `params` | URLSearchParams | — | `qa=failure`, `demoComposer=1` |

MODES: `AUTO_CINEMATIC`, `USER_CONTROLLED`, `PAUSED`, `COMPLETED`, `REPLAY` (rendered to `stateChip` and `stage.dataset.mode`).

## 4. 5-ACT timeline / state machine

| ACT | start | end | key (still) | label |
|---|---:|---:|---:|---|
| 1 | 0 | 2.450 | 0.900 | FIRST FEELING |
| 2 | 2.450 | 6.100 | 4.100 | MOMENT |
| 3 | 6.100 | 10.650 | 7.500 | BLOOM |
| 4 | 10.650 | 12.250 | 11.100 | WHY NEXT |
| 5 | 12.250 | 14.187007 | 13.200 | LOVETREE |

- `timeToAct(t)` = first act with `t < end` (clamps to ACT5 beyond duration).
- `applyAct(t)`: toggles `cta-ready` (`t >= 12.900 || mode===COMPLETED`), updates `stage.dataset.act` + `scrim.dataset.act` + active `.scene-copy` + progress count/label (only on act boundary change), and always updates `--stage-progress` CSS var + rail `aria-valuenow`.
- `tickVisual` rAF: applies act from `video.currentTime` in AUTO/REPLAY/COMPLETED/PAUSED modes.
- `ended` → COMPLETED + `applyAct(duration-.001)`.

## 5. Scroll → stage mapping

- `maxScroll = scrollHeight - innerHeight` (body is the 600vh scroll driver).
- First user intent (wheel / touchstart / ArrowDown·ArrowUp·PageDown·PageUp·Space) → `enterUser`: pause video, `userAuthority=true`, `syncScrollToCurrent` (map currentTime→scrollY), mode USER_CONTROLLED. Wheel is `preventDefault`-ed until authority transfers.
- `onScroll` (user authority): `targetTime = scrollY/maxScroll × duration` (capped `duration-.001`).
- `scrubLoop` rAF: `scrubTime += (target−scrub)×0.16`, snap when |delta|<0.006; writes `video.currentTime` when |Δ|>0.008; `applyAct(scrubTime)` — eased scroll-scrubbed film.
- `pauseToggle` resume path drops user authority and returns to AUTO (or REPLAY if prior).

## 6. Video ownership / fallback

- Autoplay muted; `play()` rejection → PAUSED (chip PAUSED, button Play).
- `error` on video (or forced via `?qa=failure`: swaps source to `assets/__missing_video__.mp4` + 250ms `failVideo`) → `failure=true`, pause, `.video-failed` on stage: `.poster-fallback` opacity 1, video opacity 0, scene-copy+progress hidden (`visibility:hidden`), fallback-message shown, scrim replaced by a fixed gradient.
- Mute button toggles `video.muted` + `aria-pressed` + label Muted/Sound.
- Reduced-motion "Play video" exits still mode and restarts playback from 0 (scroll reset).

## 7. Poster fallback

- Two poster paths: `poster` attribute (before first frame / during load) and `.poster-fallback` background layer (failure state) — both `assets/poster-act01.jpg` (pinned bytes 187,679 / SHA `1056d9b8…`).
- Fallback background-position fixed at 52% 48%; the video element itself carries per-act object-fit/position retunes (mobile).

## 8. Progress rail

- `role="slider"` `aria-valuemin=0/max=100/now`, `tabindex=0`, 1px×96px (68px mobile) with 7px horizontal hit padding; fill height = `--stage-progress×100%`.
- Pointer: `pointerdown` captures + seeks; `pointermove` drags; `pointerup` releases. `railSeek(clientY)` maps y-ratio→p; reduced mode snaps to the act keyframe and aligns scroll `(idx/4)×maxScroll`; normal mode `enterUser` + instant scroll + `targetTime=scrubTime=video.currentTime=p×duration`.
- Keyboard on rail: Up/Right +0.04, Down/Left −0.04 of progress, `preventDefault`.

## 9. CTA behavior

- ACT5 `cta-row` appears only when `cta-ready` (t ≥ 12.900 or COMPLETED): opacity/transform transition with 0.18s delay.
- CTAs: `첫 순간 심기` (primary, firstMoment), `러브트리 둘러보기` (tree46), `다시 보기` (tertiary button, replay).
- Fallback message carries its own `첫 순간 심기` CTA (video-failed path).

## 10. V4.2.5 locked pinned nav contract (the delta)

- Top triggers Moments/Connections/My Tree are **buttons** (`data-nav-menu`), never direct route links — no `data-route` on triggers.
- Trigger click → `e.preventDefault(); e.stopPropagation();` toggle `.is-open` (with `closeAll(otherGroups)`); `aria-expanded` reflects the pinned state exactly.
- `.is-open` popover stays open when hover breaks (CSS keeps `.nav-group:hover` visual parity, but pinned state is class-based).
- Close conditions: submenu item selection (`closeAll` on any `.nav-option` click), outside `pointerdown` (not inside `.nav-group`), Escape.
- Pointer bridge: `.nav-group::after` invisible 14px hit area between trigger and popover; real popover gap 4px (`top:calc(100% + 4px)`), gap narrowed from V4.2.4's 10px.
- On open: first `.nav-option` gets `focus({preventScroll:true})`.
- Escape: `closeAll()` then focus the trigger of the active (or open) group; `:focus-within` auto-open was REMOVED so focus-restore cannot re-open the menu.
- `aria-haspopup="true"` on triggers; popover `role="menu"` + `aria-label` per group; options are anchors (menu items).

## 11. Route map (source-local)

`ROUTES` (frozen): firstMoment (FIRST_JOURNEY), moment57/58/62/63/64, connection11/16, tree35/39/46 — all `../../<sibling folder>/<html>` relative paths.

- `resolveLocalRoute` throws unless `location.protocol === 'file:'` AND target ends `.html`.
- Non-file contexts: every route renders `href="#"` and click is prevented + toast: "실제 LoveTree 후보 연결은 Google Drive 동기화 로컬 HTML에서 실행됩니다."
- Navigation is native anchor behavior (same-tab default, Ctrl/Cmd→new tab via `auxclick` handoff save), preserving Back semantics.

## 12. Persistence / session state

- `sessionStorage['lovetree.frontdoor.handoff']` — written on route click/auxclick under file:: `{source:'track47-frontdoor', sourceVersion:'V4.2.5', target, videoTime, act, scrollY, timestamp}`.
- Restored when navigation type is `back_forward` (or `pageshow` persisted): pause, restore `videoTime`/`scrollY`, `applyAct`, mode PAUSED. Guarded by try/catch (sessionStorage may throw).
- NO localStorage anywhere. Composer inputs are never persisted (demo-only, "입력은 서버에 저장되지 않습니다", "저장 기능은 연결하지 않았습니다", demo button only mutates status text).

## 13. Modal (demo composer)

- Open: `?demoComposer=1` + firstMoment click (web contexts only via wireRoutes branch), focuses `#momentUrl` via `setTimeout(0)`.
- Close: × button, backdrop click (`e.target===modal`), Escape (global keydown).
- Quick emotions (궁금해/설레/계속 생각나/놀랐어): click selects exactly one (removes `.selected` from others).
- `한 줄` textarea `maxlength=140`; demo plant button writes status text only.
- Focus is NOT trapped (source defect recorded in intake manifest).

## 14. Responsive / mobile composition (≤820px)

- Nav: height 58px, padding 18px; `.nav-link`/`.nav-group` hidden — ONLY the brand + `첫 순간 심기` plant remain (intentional composition, not a shrunken desktop).
- Copy: full-width (100vw−36px), left-aligned, bottom-anchored per act (act1 17%, act2 10%, act3 13%, act4 top 15%, act5 13%); act-typography retuned (36/36/38/40px); sub 14px/1.62.
- Video per-act composition: act1 cover@42% 48%, act2 CONTAIN@50% 43%, act3 cover@52% 50%, act4 CONTAIN@50% 49%, act5 width 210% left −55% CONTAIN@50% 45% ("2/4는 물리 타이포의 전체 의미를 보존하기 위해 contain").
- Scrims switch to bottom-weighted gradients; ghost-word hidden; rail 68px; mini buttons 30px; state chip hidden; fallback message full-width bottom 18%; composer padding 22px/radius 22px.
- Body min-height drops to 560vh. `100svh` used for the fixed stage.

## 15. Reduced motion

- `prefers-reduced-motion: reduce`: all transitions/animations ≈0ms, scroll-behavior auto.
- `stillMode=true` from the start: video paused at ACT1 key; scroll maps `floor(p×5)` → act keyframe (`video.currentTime=act.key`, ±0.05 gate); rail seek snaps keyframes; `.reduced-motion` class shows the reduced card ("5 KEYFRAME STILL MODE" + Play video exit). `change` listener re-runs setup live.

## 16. Source-only fake values / persistence implications

- Demo composer values (URL/emotion/한 줄) — no persistence, demo-status strings.
- Route notice copy asserting Drive-local execution — source-context truth only.
- sessionStorage handoff — file:// navigation glue, not a product entry contract.
- `__lovetreeQA` debug hook (modes/acts/routes/getState/seek/complete/replay/fail) — QA-only surface.

## 17. QA hook surface (for browser automation of the exact source)

`window.__lovetreeQA` inside the iframe exposes `getState()` (mode/act/time/duration/paused/userAuthority/stillMode/failure/scrollY/maxScroll/overflowX), `seek(t)`, `complete()`, `replay()`, `fail()` — plus `?qa=failure` for the forced poster-fallback path.

## 18. V4.2.4 → V4.2.5 delta summary (변경설명.md, verified against the HTML)

Unchanged: video, 5-ACT, copy, scroll, CTA timing, route map. Changed: trigger buttons (was links), `.is-open` pinning, close-on option/outside/Escape only, 14px bridge + 4px gap (was 10px), first-option focus on open, aria-haspopup/aria-expanded. Cause: V4.2.4 menus depended on hover/focus and collapsed while moving the pointer across the 10px gap.

## 19. Fidelity boundaries for the native candidate

- Scene copy, ACT boundaries/keys, CTA time (12.9), rail geometry/behavior, mode machine values, pinned-menu contract, scrim gradients, mobile composition: 1:1.
- Video element: exact declared asset path (absent in repo) → source-faithful failure path; poster exact bytes pinned. Video fidelity PASS is not claimable (VIDEO_EXACT_ASSET_HOLD).
- Routes: normalized to repo authority (see `lib/source-track-47/route-map.ts`); source-local paths never become hrefs.
