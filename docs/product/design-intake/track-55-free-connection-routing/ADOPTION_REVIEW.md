# track-55-free-connection-routing — Adoption Review (Issue #162)

- laneScope: PRESERVATION + REGISTRATION VERIFICATION + REVIEW DOCUMENT ONLY — no implementation
- sourceTrackId: Track55 V1.2 (자유연결 경로편집 / LUPT Living Connection Router)
- manifest: `design-intake/manifests/track-55-free-connection-routing.json` (pre-existing on main — verified, not duplicated)
- classificationVerification: PASS — schema enum `CANONICAL_OWNER_CAPABILITY` + `adoption.status=PRODUCT_POLICY_REQUIRED` ("dynamic routing selective adoption review") is the truthful encoding of the issue-confirmed disposition `CAPABILITY_EVIDENCE + CANONICAL_GRAPH_SELECTIVE_ADOPTION_REVIEW`; no manifest edit required
- lineageReservation: NONE — repository Lineage 55 is Moonlit Blossom (#134), Lineage 56 is Crystal Memory Atelier; no number allocated or reserved
- canonicalOwnerSurface: `/v4/trees/demo/graph`
- adoptionDecision: HOLD — selective adoption review pending; Issue #201 still holds `PAGE_EXPANSION_DEFAULT=HOLD` / `CANONICAL_ADOPTION_AUTHORIZED=NO`

## Preservation evidence

- preserved path: `reference/source-track-55-lupt/` (57 files, read-only `rclone copy` from the adopted-design Drive mirror `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/55_자유연결_경로편집`)
- checksum ledger: `reference/source-track-55-lupt/SHA256SUMS` (57 entries, self-reference excluded)
- executable identity confirmed: `★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html` = 55,327 B, SHA-256 `768a49f64da8621fc357a90401baa8f870351a6d27e58dc4d43dab89e80094bd` — byte-length matches the Issue #162 pin and the digest independently re-confirms the manifest's pinned fingerprint from a second Drive location
- OPEN provenance flag: the Integration CTO reconciliation on #162 recorded a fresh raw download of the same-titled 55,327-byte object at SHA-256 `768a49f64dc810d6279497c32347249753351455600dd0b32b06024ecb7bff19`; mismatch cause NOT PROVEN. Both identities are recorded here without resolution. Reconcile before any implementation slice consumes this evidence.

## Canonical `/v4/trees/demo/graph` vs LUPT V1.2 feature comparison

| capability | canonical V4 Free Graph (owner) | LUPT V1.2 source | delta assessment |
|---|---|---|---|
| draggable Moment nodes | present | present (direct manipulation QA'd) | ALREADY_PRESENT |
| direct Connection creation | present | present | ALREADY_PRESENT |
| selected Connection/Moment inspection | present | present (emphasis + inspector) | ALREADY_PRESENT |
| zoom | present | present | ALREADY_PRESENT |
| automatic layout | present | AUTO TIDY (route tidy preserving Connection identity) | ALREADY_PRESENT |
| elastic route reflow while a node drags | partial (endpoints follow) | live bundle reflow with endpoints attached | ALREADY_PRESENT (per CTO reconciliation) |
| bundled parallel Connection lanes | absent | several Connections share a trunk with lane identity | MISSING_USEFUL |
| shared trunk + fan-out geometry | absent | legible trunk/fan-out instead of spaghetti | MISSING_USEFUL |
| visible draggable routing junction (LUPT) | absent | junction drag moves the related bundle | PRODUCT_DECISION_REQUIRED (brand/UX + persistence semantics) |
| selected-Connection path-follow light | absent | light travels along the SVG path (`getPointAtLength`) | PRODUCT_DECISION_REQUIRED (reduced-motion equivalent required) |
| persisted bundle/junction domain entities | absent (correct) | prototype-only concepts | DO_NOT_ADOPT |

## Selective adoption candidates (only if later released)

1. derived presentation geometry over existing canonical Moment + Connection facts: stable lane offsets + derived shared trunk/fan-out;
2. ordinary current-path fallback when bundling does not apply;
3. topology-invariance tests proving route geometry changes never change graph meaning.

Explicitly excluded: whole-page adoption; new persisted entities; automatic route decisions implying semantic grouping; LUPT character/junction visual identity and speech-bubble copy (PRODUCT/BRAND REVIEW REQUIRED).

## Native-adoption preconditions (from #162, unverified here)

keyboard alternative for moving a Moment/junction; focus visibility and logical order; accessible Connection selection/name/state; reduced-motion path-follow equivalent; 320×720 and touch-drag authority; no graph scroll trap / horizontal document overflow. Source prototype evidence alone is not canonical accessibility PASS.

## Boundaries observed by this lane

no graph product implementation started; `scripts/design-fidelity-validation-inventory.mjs` untouched; Drive originals read-only; no direct merge; Draft PR only.
