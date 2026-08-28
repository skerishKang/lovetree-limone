# Source Track 49 — 아이돌모먼트_리빌포털 (Idol Moment Reveal Portal) Gate

Issue: #306 · Lane: preservation + SHA256SUMS + manifest(HOLD) + gate document. No implementation.
Refs: #80 (intake rules) · #236 / #287 / #289 patterns (commit-size + fingerprint contract)

## Authority

- adopted-design Drive mirror: `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/49_아이돌모먼트_리빌포털` (Drive folder `15rgq99I_5hdd-6w33vUUX3nZvxiQ7TKj`, 1.151 GiB, 559 files)
- preserved read-only at: `reference/source-track-49-idol-moment-reveal/`
- checksum ledger: `reference/source-track-49-idol-moment-reveal/SHA256SUMS` (559 entries, self-reference excluded)
- manifest: `design-intake/manifests/source-track-49-idol-moment-reveal.json` (`REFERENCE_CAPABILITY_ONLY` / `EXECUTABLE_FINGERPRINT_PINNED` / `dom-2d`, lineage reservation HOLD-by-omission, adoption HOLD)
- current candidate: `01_버전별_결과물/16_슈퍼휴먼_인터랙티브웹_v1.4_현재후보/`

## Executable identity (v1.4 현재후보)

| file | bytes | SHA-256 | Drive ID | status |
|---|---:|---|---|---|
| `01_메인HTML_v1.4.html` | 382,861 | `f99d3b31a3642c56f4969c90658574b32d8bcc8a9919730134fc3d955d171f0e` | `1i9Mpczr0Ua6nw55Zpz0RkllpHzL2Oxuh` | PINNED (committed) |
| `02_단독실행HTML_v1.4.html` | 10,342,372 | `78fd4462484eda74bfd37e2cde0c81067d5ab6889aa90bf736b477531ab75f21` | `1S8w5qB1GxS4KBEDgOEudzOb21Z1wrVy2` | PINNED (committed) |

## Provenance contract — fresh vs historical pin

No prior historical pin exists for Track 49 in the repository or in Issue #306. This preservation therefore **establishes the first fingerprint baseline**; there is no second value to diverge from, so no OPEN flag is required at gate time. Any future re-download that disagrees with `SHA256SUMS` must be treated as a provenance incident and reconciled before any implementation slice consumes this evidence.

## Commit-size contract (#287 standard, MiB interpretation: single ≤ 10,485,760 B, total ≤ 52,428,800 B)

Committed set: **118 files (~18 MB)** = full v1.4 현재후보 set minus its oversize ZIP + all `.md`/`.txt`/`.json`/`.svg` documents across every version folder + the 559-entry ledger. Largest committed file is the v1.4 standalone HTML at 10,342,372 B (under the 10 MiB cap).

### FILE_INDEX — oversize exclusions (preserved + fingerprinted in SHA256SUMS, NOT committed)

Representative pinned exclusions (full list lives in `SHA256SUMS`; every one of the 441 uncommitted files is fingerprinted there):

| path | bytes | SHA-256 | Drive ID | note |
|---|---:|---|---|---|
| `01_버전별_결과물/16_…v1.4_현재후보/10_전체패키지_v1.4.zip` | 26,087,898 | `b4f0a2796e00f1f6398e414373b8c9cb061747253afd6c1d62b4a4a157954eed` | `1ZBCxCUkgjdSbtHnk4ipCG0BmUPU3dCmv` | candidate package archive; manifest status PENDING |
| `04_초기참고자료·분석/참고영상_A_히어로리빌_00분00-02분40.mp4` | 97,484,061 | `fc6ad3e368c87b04544980b9f2db9da1eae6a351a575ed436daa3d6f974b96bf` | (see Drive folder) | benchmark reference recording |
| `녹화_2026_08_10_19_32_30_147.mp4` | 72,550,904 | `dd59676928588189b046d63fd0d4b10b44fdd2408f48455041181c4170231546` | (see Drive folder) | full run recording |
| legacy builds (`90_이전시안·보관/*`, 초기포털 v2.x HTMLs, all version ZIPs) | various >10MiB | see ledger | (see Drive folder) | superseded candidates kept fingerprint-only |

Recovery path for any future consumer: byte-safe transfer from the pinned Drive folder, then verify against the recorded digest before use. No approximate substitution.

## Selection priority applied (per lane instruction)

1. ★현재후보/final 실행본 — v1.4 folder committed minus oversize ZIP;
2. 작업지시/분석 문서 — all `.md`/`.txt` across version folders committed (632 KB total);
3. 검증 JSON/SVG — committed;
4. videos, ZIPs, legacy build HTMLs over the single-file cap — fingerprint-only.

## Open gates

- implementation: FORBIDDEN by this gate; any future slice requires explicit release under #80/#201;
- selected-revision authority: the v1.4 folder label (`현재후보`) is packaging evidence; an explicit owner selection between the 초기포털 v2.x line and the 슈퍼휴먼 v1.x line is not recorded in the repository — reconcile before any native slice;
- keyboard/focus/reduced-motion audit: not yet performed on the source prototype;
- lineage allocation: none; reservation HOLD-by-omission under the REFERENCE_CAPABILITY_ONLY identity rule.

## Boundaries observed

no implementation started; `scripts/design-fidelity-validation-inventory.mjs` untouched; Drive originals read-only; no lineage number reserved; no direct merge; Draft PR only.
