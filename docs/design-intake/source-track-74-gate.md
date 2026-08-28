# Source Track 74 — 오빗모프_러브트리_템플릿포털_V1 (Orbit Morph Template Portal) Gate

Issue: #314 · Lane: preservation + SHA256SUMS + manifest(HOLD) + gate document. No implementation.
Refs: #80 (intake rules) · #236 / #287 / #289 patterns (commit-size + fingerprint contract)

## Authority

- adopted-design Drive mirror: `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/74_오빗모프_러브트리_템플릿포털_V1` (Drive folder `1TTr4NWYWzoZ3JP0Owc5K4zo0dVuu5wbr`, 11 objects, 21.26 MiB)
- preserved read-only at: `old/reference/source-track-74-orbitmorph-portal/`
- checksum ledger: `old/reference/source-track-74-orbitmorph-portal/SHA256SUMS` (11 entries, self-reference excluded)
- manifest: `design-intake/manifests/source-track-74-orbitmorph-portal.json` (`REFERENCE_CAPABILITY_ONLY` / `EXECUTABLE_FINGERPRINT_PINNED` / `dom-2d`, lineage reservation HOLD-by-omission, adoption HOLD)
- revision ladder: V1 → **V2 (`V2_70경로_고딕타이포_열매트리로고`) = current candidate**; V2 preserves V1 structure/imagery/morph-trail/entrance and applies four product-owner corrections (Track70 menu path, gothic typography, LOVETREE wordmark width, fruit-tree candidate logo)

## Executable identity

| file | bytes | SHA-256 | Drive ID | status |
|---|---:|---|---|---|
| `V1/index.html` | 25,536 | `5e4e99b8b50ec7c7f3d363ca8a79d088ae0632385a15f842aa79f4bef1b046fe` | `12CNeF8WfzzfF8Qr4KHTwWFUcRDCIp-aN` | PINNED (committed) |
| `V2_70경로_고딕타이포_열매트리로고/index.html` | 27,012 | `fcc7cad6bf0277c0dd304aa8bb2bc5a2f1ae6a9a021fff43c6ad6374b66a0b09` | `1yjnAVu8Fuu7MpC1M1SVgf2e-89DPcM9r` | PINNED (committed) |

## Provenance contract — fresh vs historical pin

No prior historical pin exists for Track 74 in the repository or in Issue #314. This preservation therefore **establishes the first fingerprint baseline**; there is no second value to diverge from, so no OPEN flag is required at gate time. Any future re-download that disagrees with `SHA256SUMS` must be treated as a provenance incident and reconciled before any implementation slice consumes this evidence.

## Commit-size contract (#287 standard, MiB interpretation: single ≤ 10,485,760 B, total ≤ 52,428,800 B)

Committed set: **10 of 11 files (~53 KB of source + ledger)** — everything except the single oversize reference recording.

### FILE_INDEX — oversize exclusion (preserved + fingerprinted, NOT committed)

| path | bytes | SHA-256 | Drive ID | manifest status |
|---|---:|---|---|---|
| `74_오빗모프_러브트리_템플릿포털_V1.mp4` | 22,201,260 | `dc9e01bfddbb7f1efc58fcb893604dac8d4b566470f671b94ec8912055154bff` | `16-FaLOH4_0jAxZuHsG_kNLCQfG_kBE9_` | PENDING |

Recovery path for any future consumer: byte-safe transfer from the pinned Drive ID, then verify against the recorded digest before use. No approximate substitution.

## Selection priority applied (per lane instruction)

1. executables — both revision `index.html` files committed and pinned;
2. 작업지시/문서 — all prompts, application records, QA notes, changelog committed;
3. reference text (`5.Orbit Flora.txt`) — committed;
4. oversize reference MP4 — fingerprint-only per cap.

## Open gates

- implementation: FORBIDDEN by this gate; any future slice requires explicit release under #80/#201;
- logo authority: the V2 fruit-tree SVG is an explicit CANDIDATE until the product owner approves a final LoveTree logo;
- story-menu target: source-local sibling Track70 relative path is provenance only; native work must resolve targets through repository-owned stable route mapping or HOLD them;
- keyboard/focus/reduced-motion audit: not yet performed on the source prototype;
- lineage allocation: none; reservation HOLD-by-omission under the REFERENCE_CAPABILITY_ONLY identity rule.

## Boundaries observed

no implementation started; `scripts/design-fidelity-validation-inventory.mjs` untouched; Drive originals read-only; no lineage number reserved; no direct merge; Draft PR only.
