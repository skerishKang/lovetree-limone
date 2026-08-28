# Source Track 44 — 손으로여는기억창 컴포저 Source Gate Record

Issue: #302 · Refs: #80
Classification: `ENTRY_MATERIAL + TREE_WORKSPACE_MOMENT_PRESENTATION + SOURCE_FIDELITY_REBUILD`
Manifest: `design-intake/manifests/source-track-44-handopen-memory-composer.json`
Provenance: `old/reference/source-track-44-handopen-memory-composer/`

## Design authority

```text
CURRENT_REVISION   = V2_COMPOSER_CURRENT_CANDIDATE (folder-fresh 2026-08-21 snapshot)
AUTHORITY_SOURCE   = [[지피티 작업]]/[01_러브트리]/03_디자인채택본/44_손으로여는기억창_컴포저
                     (Drive folder 1Pwv81tD0eneDYlf-hvVxb3j9fWVdHRhA, read-only)
CANDIDATE          = 01_손으로여는기억창_컴포저_v2.html (427,043 B, SHA256 8fd6a4f1…5d705a)
PREVIOUS_REVISION  = V1 camera/hand-tracking variant (90_이전버전_v1/, separate lineage evidence)
SIBLING_QA         = PASS (04_완성패키지_v2/13_검증결과.json) — with a playback-verification limitation
PRODUCTION SOURCE  = DO NOT MODIFY (Drive originals read-only)
NATIVE IMPLEMENTATION = MUST NOT START (구현 금지 Lane — registration only)
```

## What the source is

V2 is a **no-camera memory-window composer**: four independent corner handles drag a perspective
quad over a selectable season background; an 8×8 homography solver maps the quad to CSS
`matrix3d`; a LoveTree moment placed inside can play through the window — the quad flattens to
full-screen for YouTube playback and restores the saved perspective on close. Six presentation
styles (CLEAN, CINEMA, ARCHIVE, GLOW, COLLAGE, LIVE MOMENT), six placement presets, ratio lock,
mirror/tilt/scale controls, mobile bottom sheets with ≥44px targets, and a
`lovetree-memory-window-composer-v1` localStorage payload.

V1 (`90_이전버전_v1/`) was the camera/hand-tracking variant (`getUserMedia` + MediaPipe). V2
deliberately removed the entire camera pipeline while preserving the interaction foundations.
The two variants are separate evidence and must not be merged without an explicit design decision.

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Source pinning | DONE | 4 artifacts PINNED byte-exact; MD5 cross-checked against the 2026-08-21 full-tree snapshot |
| Sibling QA | PASS (limited) | remote YouTube playback unverified in the sibling's restricted container |
| Playback parity proof | OPEN | real embed playback inside the quad must be reproduced in unrestricted browser QA before any native port claims it |
| Variant split decision | OPEN | camera(V1) vs no-camera(V2) interaction merge requires product-owner decision |
| Native intake | NOT STARTED | requires a separate approval lane (구현 금지) |
| Lineage number | HOLD | no repository lineage allocated by this gate |

Correct sequence (per #80 continuous-intake rules):

```text
playback parity reproduced unrestricted
→ variant-split decision by product owner
→ approval lane admits Track44
→ scaffold → native implementation → focused/browser QA
→ exact fingerprint → registry admission (lineage number allocated then)
```

## Source-preservation rules (carried into any future native review)

- The pinned V2 executable is REFERENCE/comparison evidence only — never executed by product code,
  never routed, never cited as current product truth.
- One source photo/sample = source fixture only; the three embedded moments and three backgrounds
  never become product content without replacement assets.
- Demo localStorage payload (`personId: "felix"`) is fake data — never presented as backend truth.
- Style/preset vocabulary stays source-side naming until adopted by decision.

## Repository disposition

```text
SOURCE_TRACK_44_INTAKE      = RECORDED
SIBLING_V2_EXECUTABLE       = REFERENCE_ONLY (PINNED byte-exact)
LINEAGE44_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (source is localStorage-only; no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```

Artifact pinning state: all four registered text/executable artifacts are PINNED under
`old/reference/source-track-44-handopen-memory-composer/` —

- V2 composer executable HTML (427,043 B, SHA256 `8fd6a4f1…5d705a`, MD5 equals the same-day
  full-tree Drive snapshot),
- implementation report (1,899 B, SHA256 `bc24dfe9…b6b74e`),
- submission manifest (1,928 B, SHA256 `e878a64d…544428`),
- sibling QA result json (1,799 B, SHA256 `b3b96661…03b04`).

The two reference videos (34.9 MB / 24.5 MB) remain Drive-side `REFERENCE_ONLY` evidence;
the remaining ~92 files (captures, contact sheets, V1 verification materials) stay on Drive
read-only and are not intake artifacts of this gate.

---

*Gate record written 2026-08-21 (Issue #302 Lane). This document registers evidence only;
it does not implement, adopt, or route anything.*
