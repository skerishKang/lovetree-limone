# Source Track 43 — 기억장면 레시피도구 (Memory Scene Recipe Library) Gate

Issue: #297 · Lane: preservation + SHA256SUMS + manifest(HOLD) + gate document. No implementation.
Refs: #80 (intake rules) · #236 / #287 patterns (commit-size + fingerprint contract)

## Authority

- adopted-design Drive mirror: `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/43_기억장면_레시피도구` (53 objects, 39.24 MiB)
- preserved read-only at: `old/reference/source-track-43-memory-scene-recipe/`
- checksum ledger: `old/reference/source-track-43-memory-scene-recipe/SHA256SUMS` (53 entries, self-reference excluded)
- manifest: `design-intake/manifests/source-track-43-memory-scene-recipe.json` (`REFERENCE_CAPABILITY_ONLY` / `EXECUTABLE_FINGERPRINT_PINNED` / `dom-2d`, lineageReservation=HOLD, adoption=HOLD)

## Executable identity

| field | value |
|---|---|
| file | `01_기억장면_레시피도구.html` |
| bytes | 51,828 |
| SHA-256 | `e36c7b136628285976197e75ddde4d5395ac26e2de9db11445779db3fdf7ca2f` |
| Drive ID | `1Lxv8xosMapt9EtU5D9cEFkTMwVnnMiVu` |
| status | PINNED (committed) |

## Provenance contract — fresh vs historical pin

No prior historical pin exists for Track 43 in the repository or in Issue #297. This preservation therefore **establishes the first fingerprint baseline**; there is no second value to diverge from, so no OPEN flag is required at gate time. Any future re-download that disagrees with `SHA256SUMS` must be treated as a provenance incident and reconciled before any implementation slice consumes this evidence.

## Commit-size contract (#287 standard: total ≤ 50MB, single file ≤ 10MB)

Committed set: 52 of 53 preserved files (~10.9 MB total) — under both caps.

### FILE_INDEX — oversize exclusion (preserved + fingerprinted, NOT committed)

| path (under old/reference/source-track-43-memory-scene-recipe/) | bytes | SHA-256 | Drive ID | manifest status |
|---|---:|---|---|---|
| `03_참고영상_기억장면레시피_원본.mp4` | 28,841,597 | `73ff927e8a645828934ca53307635a8925ee428fc98a32f42484f58fdc512625` | `1byhtwOM-zKmX9zHeVcDVeHeOmtrZ4wLA` | PENDING |

Recovery path for any future consumer: byte-safe transfer from the pinned Drive ID, then verify against the recorded digest before use. No approximate substitution.

## Selection priority applied (per lane instruction)

1. executable (`01_기억장면_레시피도구.html`) — committed;
2. 작업지시/문서 (`40_문서자료/*`, `30_검증자료/*`) — committed;
3. README·분석·비교·키프레임·이미지 증거 — committed;
4. oversize reference video — excluded per cap, fingerprinted above.

## Open gates

- implementation: FORBIDDEN by this gate; any future slice requires explicit release under #80/#201;
- keyboard/focus/reduced-motion audit: not yet performed on the source prototype;
- brand/identity review: recipe previews reconstruct a third-party benchmark recording (MemoryCraft); PRODUCT/BRAND REVIEW REQUIRED before adoption;
- lineage allocation: none; `lineageReservation=HOLD`.

## Boundaries observed

no implementation started; `scripts/design-fidelity-validation-inventory.mjs` untouched; Drive originals read-only; no lineage number reserved; no direct merge; Draft PR only.
