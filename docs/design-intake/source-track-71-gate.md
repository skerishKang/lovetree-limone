# Source Track 71 — Emotion Path Helix Interactive Front Door V1 Source Gate Record

Issue: #311 · Refs: #80 · 패턴 선례 #236 #287 #289
Classification: `NEW_LINEAGE (reservation HOLD) + REFERENCE_PINNED`
Manifest: `design-intake/manifests/source-track-71-emotion-helix.json`
Provenance: `reference/source-track-71-emotion-helix/`

## Design authority

```text
CURRENT_REVISION    = V1_PACKAGE_SNAPSHOT_2026-08-18
                      (latest executable: V7_FINAL_MOTION_INTERACTIVE_ACTIVATION/
                       71_V7_FINAL_INTERACTIVE_R2.4.html)
AUTHORITY_SOURCE    = Drive [[지피티 작업]]/[01_러브트리]/03_디자인채택본/
                      71_러브트리_감정경로헬릭스_인터랙티브대문_V1
                      (folder id 1bv5BpMjhOgCxlpdHwPfr4MoSSPT6HbgN)
REVISION CHAIN      = V1 helix build → V2 GABE_EXACT_GLASS_ORBIT gate A→A6
                      (A1→A2 정밀교정, A3 REJECT, A4 REJECT, A5 REJECT/SOLID_JELLY,
                       A6 pair-proof 반복) → V3/V4/V5 pair-proof iterations
                      (v3 REJECT → v4 REJECT → v5 reference-trace optical map)
                      → V6 FINAL one-shot batch completion (반복 Gate 종료 최종후보 일괄완성)
                      → V7 FINAL MOTION INTERACTIVE ACTIVATION (R2 → R2.4;
                       R2.4 = REPLAY/MY TREE route fix to 코덱스 Track14/15)
SOURCE INTERNAL TAG = V1 artifacts carry sibling-internal "Track16" names — numbering
                      history only; never a repository identity claim (Track71 ≠ Lineage16/71)
LINEAGE71           = NOT ALLOCATED (no repository lineage number reserved)
ADOPTION            = HOLD (no canonical adoption; IMPLEMENTATION_RELEASE=NO)
PRODUCTION SOURCE   = DO NOT MODIFY (Drive originals read-only)
```

The V1→V7 folders are one source track's gate history, not competing products. Per #80,
labels inside Track 71 never imply a new LoveTree product generation, and this registration
reserves no lineage number.

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Owner revision selection | OPEN | V6 final-candidate surface vs V7 R2.4 interactive activation not uniquely selected by product owner |
| Portal target resolution | MAPPING_HOLD | V7 R2.4 routes resolve into 코덱스 Track14/15 via `../../..` local relative paths — no stable repository targets |
| Root video provenance | OPEN | `참고영상.mp4` exists at folder root while `V1/07_메모/참고영상_미확보.md` records the reference video as not secured — undocumented provenance |
| Payload transport | PARTIAL | 12 videos + 2 zips fingerprint-only (`PENDING`) under the 50MB/10MB commit caps and video exclusion rule |
| Executable | NOT AVAILABLE | no authoritative native implementation exists to port |
| Native intake | NOT STARTED | sequence below |

Correct sequence:

```text
owner-selected single authoritative revision
→ portal ledger resolution for REPLAY/MY TREE/index routes (HOLD targets never navigate)
→ executable/source QA → exact fingerprint → repository native intake/proving
```

Duplicate-object check: SHA-256 sweep across all 100 preserved files found **0 duplicate
hashes** — no 이중 객체 isolation flag required at registration.

## First-screen suitability memo (MVP 첫화면 v2 확장 후보)

- 구조: 단일 연속 WebGL2 helix ribbon(420 subdivision + companion 2개) 위에 8개 Moment가
  8192×1024 단일 atlas로 연속 UV 부착 — card carousel / video wall / sphere 회피 의도가
  `V1/01_분석/01_컨셉판단.md`에 명시. 첫 화면이 곧 구조물 하나로 읽히는 구성.
- 진입 버튼: **있음** — V7 R2.4에 원형 CTA `MY TREE`(aria-label 포함, focus-visible 스타일)
  + 우상단 theme toggle(WHITE/…). Index drawer는 기본 숨김(호출형).
- 모션/성능: 첫 화면 비디오 autoplay 없음, detail에서 Moment 03 로컬 MP4만 재생, 외부 CDN
  불사용 — 자체 포함 이식성 양호, reduced-motion 분기 존재.
- 전환 문법: modal fade 대신 taper ribbon clip-path가 전체 화면으로 펴지는 detail transition.
- 리스크: 라우트가 코덱스 상대경로(MAPPING_HOLD), atlas 저작권은 source-owned, drag/wheel
  인터랙션이 모바일 단일 손가락 스크롤과 충돌하지 않는지 별도 QA 필요.
- 요약: 첫화면 후보로서 구조적 완성도와 자체 포함도는 높음; 진입 버튼·인덱스·테마 전환이
  이미 갖춰져 있어 v2 확장 검토 비용은 낮음. 최종 판단은 product-owner 몫이며 본 메모는
  사실 기록만 담는다.

## Provenance

Fresh preservation pin (this registration):

- Preserved to `reference/source-track-71-emotion-helix/` via read-only
  `rclone copy --transfers 2`; Drive originals untouched.
- Full preservation: 100 files, 110,724,280 bytes; `rclone check --one-way` against the live
  Drive folder at 2026-08-21T06:14:59Z: **0 differences found, 100 matching files**.
- `SHA256SUMS` covers exactly the 86 committed files; the 14 payload-excluded items keep
  Drive ID + bytes + SHA-256 fingerprints pinned in the manifest as `PENDING`.

Drive history pin:

- No prior repository record of Track 71 (no manifest, gate doc, or hash pin) was found on
  `origin/main` at registration; the fresh pin above is currently the only pin.
- Isolation rule: if a conflicting historical hash pin surfaces later, the disagreement is
  recorded as an OPEN flag on this gate and the affected artifacts are quarantined from any
  adoption claim until reconciled against the Drive original.

## Committed payload (50MB total / 10MB single-file caps)

Committed: **86 files / 25,810,397 bytes (≤50MB) · largest single file 4,421,666 bytes
(≤10MB)** — `V1/최종본.html`.

Excluded from commit (14 items, fingerprint-only `PENDING`): both root videos
(`참고영상.mp4` 22,588,284B · `71_…_V1.mp4` 16,611,419B), `V1/04_녹화/Track16_V1_전체시연.mp4`
8,785,599B, `실패/` recordings ×2, `V1/03_에셋/moment_03_stage_light.mp4`, V7 evidence
videos ×6, and both source zips (`Track16_…_REVIEW_….zip` 23,033,245B >10MB cap ·
`Track71_V7_R2.3_ENDLESS_REEL_ROUTE_FIX.zip` unverified archive).

Preservation priority respected: every executable HTML (V1 최종본/개발본, V2 gates,
V6 FINAL, V7 R2→R2.4), all instructions/rejects, QA/proof PNGs, assets and build script
stay committed.

## Repository disposition

```text
SOURCE_TRACK_71_INTAKE      = RECORDED
ALL_REVISIONS               = REFERENCE_ONLY (byte-exact preservation)
LINEAGE71_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```
