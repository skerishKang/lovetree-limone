# Lineage 56 — Crystal Memory Atelier V3

## Decision

- Lineage: `lt-56-crystal-memory-atelier`
- Classification: `REVISION`
- Recommendation: `PARTIAL IMPLEMENT`
- Review route: `/design-lab/lineages/56/v3`
- Product boundary: Design Lab candidate only. This is not canonical `/v4` adoption.

## Revision history

- V1 — collectible viewer: four neutral views, drag/wheel/auto turntable, material/light/inscription/Bloom.
- V2 — living premium Moment relic: expression awakening, heart light, visible engraving, source-demo 100/200/365 reward framing.
- V3 — direct expression + rotation living relic: short click owns expression cycling; horizontal drag owns discrete angle rotation.

## Source authority

Primary V3 source:

- Drive: `1Sd9KFxEFWoJKHiiidaRspGh2bALg9iOr`
- file: `index-v3.html`
- bytes: `19,262`
- SHA256: `9a7bb3415dade7d6fd04cecfe1be6ae04595d3b46d326f2b596dab819633a66c`
- repository preservation path: `old/reference/lineage-56-crystal-memory-atelier-v3/source/index-v3.html`

The repository copy is required to remain byte-exact.

## Source-model limitation

V3 is 2.5D, not a GLB/WebGL mesh. The authoritative runtime contract is exactly:

- four neutral angle frames: front / three-quarter / profile / rear;
- four frontal expression frames: sleeping / eyes open / watching / smiling.

It is **not** a `4 angles × 4 expressions = 16 states` model. Selecting an angle switches to a neutral angle frame rather than inventing a profile/rear version of the active expression.

## Interaction contract

- short click: expression cycle;
- movement around 10px: click-vs-drag boundary;
- horizontal movement around 48px per step: discrete angle change;
- transient CSS `rotateY` tilt during drag;
- expression autoplay sequence: `0 → 1 → 2 → 3 → 2 → 1 ...` at about `1150ms`;
- manual expression or angle interaction takes autoplay authority;
- `CLOSE EYES` returns to sleeping;
- ROSE / ICE / OBSIDIAN / AURORA material states;
- refraction-light control;
- on-relic engraving and laser scan;
- Crystal Bloom;
- responsive Material & Service drawer.

## Non-canonical source values

`148 / 200` and the `100 / 200 / 365` milestones are source-demo hypotheses only. They must not be connected to real user data or backend entitlement without a separate product decision.

## Native remediation

The original V3 clips the lower Material/Service content around the 1280×800 review viewport. The native candidate keeps the hierarchy and identity but makes the right panel scroll-safe using `overflow:auto`.

The source does not include a reduced-motion policy. The native candidate therefore stops continuous float/ring/heart motion, disables expression autoplay by default, removes Bloom particles, removes drag tilt, and reduces engraving scan duration under `prefers-reduced-motion: reduce`, while preserving explicit state selection.

## EXACT_ASSET_TRANSFER_HOLD

The implementation environment cannot safely attach binary blobs to the existing Git tree through the available connector without a verified base tree SHA. No generated, approximate, or text-encoded substitute is permitted.

Required target directory:

`public/old/reference/lineage-56-crystal-memory-atelier-v3/assets/`

Required files and exact fingerprints are pinned in `lib/lineage-56-crystal-memory-source.ts` and enforced by `scripts/verify-lineage-56-assets.mjs`.

Browser fidelity QA must not be reported PASS until the verifier emits:

`LINEAGE_56_EXACT_ASSET_GATE_PASS`

and `tests/lineage-56-route-browser-qa.mjs` passes at 1280×800 and 390×844.
