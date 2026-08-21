# Source Track 69 — Fullviewport Portfolio LoveTree Motion Landing Source Gate Record

Issue: #290 · Refs: #80 #236
Classification: `NEW_LINEAGE (reservation HOLD) + REFERENCE_PINNED`
Manifest: `design-intake/manifests/source-track-69-fullviewport-portfolio.json`
Provenance: `reference/source-track-69-fullviewport-portfolio/`

## Design authority

```text
CURRENT_REVISION    = MULTI_REVISION_SNAPSHOT_2026-08-17
                      (V1 A/B pair · V2 template nav portal · SELECTED V3 exact-source
                       multi-template portal · V4 A-person cinematic portal candidate)
AUTHORITY_SOURCE    = Drive [[지피티 작업]]/[01_러브트리]/03_디자인채택본/69_풀뷰포트폴리오_러브트리모션랜딩
                      (folder id 1sBdAyhjn5bDen4FswIcWKTeeCLzTZRni)
V1_A                = ORIGINAL_PROMPT_EXACT — fidelity reference / comparison only
V1_B                = LOVETREE_ADAPTED — design-review candidate, NOT owner-approved
V2                  = TEMPLATE_NAV_PORTAL — recorded attempt (잘안됨.mp4 preserved as evidence)
V3                  = EXACT_SOURCE_MULTI_TEMPLATE_PORTAL — sibling-selected surface;
                      11 works pages link other adopted tracks via local relative paths
V4_CANDIDATE        = A_PERSON_CINEMATIC_PORTAL — male AI-human key visual, no video;
                      source-recorded product-owner reaction positive, wiring pending
LINEAGE69           = NOT ALLOCATED (no repository lineage number reserved)
ADOPTION            = HOLD (no canonical V4 adoption; IMPLEMENTATION_RELEASE=NO)
PRODUCTION SOURCE   = DO NOT MODIFY (Drive originals read-only)
```

The four layers are revision history of one source track, not competing products.
Per Design Ops intake rules (#80), a V1/V2/V3/V4 label inside Track 69 never implies a new
LoveTree product generation, and this registration reserves no lineage number.

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Owner approval | OPEN | no single authoritative revision is owner-approved (V1 B explicitly not approved; V4 reaction positive but unwired) |
| Portal target resolution | MAPPING_HOLD | V3 nav/chips/CTA targets are Drive-local relative paths to Tracks 02/06/12/44/55/59/61/65/66/67/68 — none resolved to stable repository targets |
| Runtime render evidence | OPEN | source-side headless Chromium stalled on CloudFront video/fonts; no visual acceptance screenshot promoted (QA_RENDER_NOTES.txt) |
| Asset classification | PARTIAL | uuid-named root PNG and A/B vite_react_source.zip preserved byte-exact but unclassified → PENDING in manifest |
| Executable | NOT AVAILABLE | no authoritative native implementation exists to port |
| Native intake | NOT STARTED | full sequence below |

Correct sequence:

```text
owner-approved single revision
→ portal ledger resolution for every nav/chip/CTA target (HOLD targets never navigate)
→ local re-host of remote video/font assets
→ executable/source QA → exact fingerprint → repository native intake/proving
```

## Provenance

Fresh preservation pin (this registration):

- Preserved to `reference/source-track-69-fullviewport-portfolio/` via read-only
  `rclone copy --transfers 2`; Drive originals untouched.
- Full preservation at registration: 40 files, 73,153,681 bytes; `rclone check --one-way`
  against the live Drive folder at 2026-08-21T03:58:51Z: **0 differences found,
  40 matching files** — byte fidelity proven at registration time.
- Note: the initial `find … > SHA256SUMS` pass captured the just-created empty list file
  itself; the pin was regenerated with `! -name SHA256SUMS` so the list is deterministic.

### Committed payload (Issue #290 rework — 50MB total / 10MB single-file caps)

The repository commit carries a trimmed payload; byte-exact local preservation copies and
Drive originals of every excluded item remain intact, and each excluded item keeps its
Drive ID + bytes + SHA-256 fingerprint pinned in the manifest as `PENDING`.

Committed: **36 files / 10,444,282 bytes (≤50MB) · largest single file 1,565,694 bytes
(≤10MB)** · `SHA256SUMS` covers exactly these 36 files.

Excluded from commit (4 items):

| File | Bytes | Reason | SHA-256 |
|---|---|---|---|
| `69_풀뷰포트폴리오_러브트리모션랜딩.mp4` | 26,223,001 | video media excluded by rework rule + >10MB cap | `15f85030d18e7c19da17cd5220da283e23b618a8c63dc57ccf0241111763badf` |
| `선택-D_…/works/09_memory_storybook.html` | 17,192,064 | >10MB single-file cap | `763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71` |
| `선택-D_…/works/06_memory_tape.html` | 12,265,511 | >10MB single-file cap | `85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f` |
| `C_V2_TEMPLATE_NAV_PORTAL/잘안됨.mp4` | 7,028,823 | video media excluded by rework rule | `631d25613170b2062e5d7569c908d23d1ba6584912313c97fa1b1a37d9e8e918` |

Preservation priority was respected: all executable HTML entry points, prompts/instruction
material and gate/QA documents stay committed; only media and cap-breaking files moved to
fingerprint-only status.

Drive history pin:

- No prior repository record of Track 69 (no manifest, gate doc, or hash pin) was found on
  `origin/main` at registration; the fresh pin above is currently the only pin.
- Isolation rule: if a conflicting historical hash pin surfaces later, the disagreement is
  recorded as an OPEN flag on this gate and the affected artifacts are quarantined from any
  adoption claim until reconciled against the Drive original.

Manifest artifact statuses follow the lane contract: `PINNED` only for files whose role is
evidenced, whose bytes+SHA-256 are pinned, AND whose bytes fit the committed payload;
`PENDING` where the classification basis is unknown (uuid root PNG, both source zips) or
where the payload caps exclude the file from this commit (both mp4 videos,
works/09_memory_storybook.html, works/06_memory_tape.html).

## Repository disposition

```text
SOURCE_TRACK_69_INTAKE      = RECORDED
ALL_REVISIONS               = REFERENCE_ONLY (byte-exact preservation)
LINEAGE69_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```
