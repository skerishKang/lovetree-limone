# Semantic Memory Exploded View — source provenance

This capability candidate extracts only the Memory Stack mechanic from the sibling Drive package `06_LoveTree_3D_Experience_Suite_V1`.

## Authority

- Drive folder: `131menEkP2-XGnPlu4DqsjynPErIptoQ_`
- source file: `02-memory-stack.html`
- Drive file id: `13F5tUplnEoHTh4gIrkbZ6o-g7Nk-OyUh`
- exact bytes: `15,578`
- SHA256: `0114c705dcb316b99e46931cd131e2ae211c4e5824b759ccb9f594ea31e23785`
- intake classification: `CAPABILITY`
- implementation recommendation: `PARTIAL IMPLEMENT`
- tracking issue: `#140`

`02-memory-stack.html` in this directory is preserved byte-exact as provenance evidence. The native candidate is not an iframe runner and does not import this HTML at runtime.

## Product job

`one Moment → seven semantic layers → assembled / exploded / selected-layer → assembled`

The canonical seven-layer order is:

1. `SOURCE VIDEO / ORIGINAL`
2. `MOMENT CUT / TIMECODE`
3. `PERSON LOCK / IDENTITY`
4. `OUTFIT MAP / COSTUME`
5. `EMOTION / FEELING`
6. `MY NOTE / PERSONAL`
7. `CONNECTION / NEXT PATH`

The native implementation uses one renderer-independent state/model for both the spatial renderer and the accessible 2D representation.

## Explicit boundaries

- No Three.js, WebGL, canvas, GLB or GLTF.
- Synthetic/in-memory Moment data only; no Auth/API/DB/Firebase/Worker/Production mutation.
- Source demo analytics are not product truth. The native fixture intentionally exposes no identity confidence or route-strength percentage.
- Memory Capsule, A–J × 8 turntable assets, Tree Keeper, LUMI and character-led cinematic onboarding are outside this branch.
- Open Draft PR #113 owns the shared capability registry/index. This branch intentionally does not modify `lib/experience-capabilities.ts` or the shared Design Lab capability cards/index.
