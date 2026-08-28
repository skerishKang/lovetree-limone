# track-55-free-connection-routing — Provenance Re-hash (Issue #285)

- laneScope: RE-MEASUREMENT + RECORD CORRECTION ONLY — no implementation
- subject artifact: `★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html` (Track55 V1.2 executable)
- driveId: `1hAnmi-bJ5OUSjjouznJQdLxf8VxHsqBS`
- date: 2026-08-21
- dispute: two recorded identities sharing the 10-char prefix `768a49f64d`
  - mirror / manifest / issue-body pin: `768a49f64da8621fc357a90401baa8f870351a6d27e58dc4d43dab89e80094bd`
  - Integration CTO reconciliation comment on #162 ("current fresh raw SHA256"): `768a49f64dc810d6279497c32347249753351455600dd0b32b06024ecb7bff19`

## Independent triple re-measurement (each digest computed twice, byte size recorded)

### ① Fresh Drive original re-download (new temp dir, no cache reuse)

- source: `padiemipu:[[지피티 작업]]/[01_러브트리]/03_디자인채택본/55_자유연결_경로편집/★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html`
- live object identity check (`rclone lsjson`): id `1hAnmi-bJ5OUSjjouznJQdLxf8VxHsqBS`, 55,327 B, modTime `2026-08-10T17:24:47.501Z` — matches manifest `driveId`/`bytes`; object unmodified since before both disputed records were written
- bytes: **55,327**
- sha256 run1/run2: **`768a49f64da8621fc357a90401baa8f870351a6d27e58dc4d43dab89e80094bd`** (both runs identical)
- server-side native MD5 (`rclone md5sum`): `374074c11cf9457fa7187997eb92c737`

### ② Repository mirror

- path: `old/reference/source-track-55-lupt/★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html`
- bytes: **55,327**
- sha256 run1/run2: **`768a49f64da8621fc357a90401baa8f870351a6d27e58dc4d43dab89e80094bd`** (both runs identical)
- ledger cross-check: entry in `old/reference/source-track-55-lupt/SHA256SUMS` matches; `sha256sum -c` → OK
- `cmp` fresh-download ↔ mirror: **byte-identical**

### ③ Recorded pin texts (no file measured — text comparison only)

| record | bytes | pinned sha256 | agrees with measurement |
|---|---|---|---|
| `design-intake/manifests/track-55-free-connection-routing.json` (`sourceArtifacts[0]`, status PINNED) | 55,327 | `768a49f64da8621f…80094bd` | YES |
| Issue #162 body pin (driveId + exact downloaded bytes + SHA256) | 55,327 | `768a49f64da8621f…80094bd` | YES |
| Integration CTO reconciliation comment on #162 ("current fresh raw SHA256") | 55,327 | `768a49f64dc810d6…bff19` | **NO — sole outlier** |

Additional independent observation: a separate fresh `rclone copy` of the same Drive path performed earlier the same day (2026-08-21, during the #284 snapshot lane, distinct temp dir) also yielded `768a49f64da8621f…80094bd`.

## Judgment (per lane decision rules)

Rule applied: "전부 일치하면 → 과거 전사 오류 확정".

- All three measurement legs agree with the mirror/manifest/issue-body pin `768a49f64da8621fc357a90401baa8f870351a6d27e58dc4d43dab89e80094bd`.
- The CTO comment value `768a49f64dc810d6279497c32347249753351455600dd0b32b06024ecb7bff19` is confirmed as a **transcription error**, not a different object:
  - it shares its first 10 hex characters with the true digest — consistent with a copy-then-edit slip; two independent SHA-256 digests agreeing on 40 leading bits by chance has probability ≈ 2⁻⁴⁰ ≈ 10⁻¹²;
  - no 55,327-byte variant producing that digest exists in any location reachable by this lane (Drive original, mirror, ledger);
  - the byte length recorded alongside it (55,327) matches the true object exactly.
- **No DRIVE_MUTATION**: live Drive object id, byte size, and digest all equal the pinned values, and modTime (`2026-08-10T17:24:47.501Z`) predates both records. Who/when tracking is therefore unnecessary — nothing on Drive changed.
- The issue-body pin remains authoritative; the CTO comment's claim that its own hash "supersedes the historical issue-body hash" is voided by this re-measurement.

## Record corrections made by this lane

- `docs/product/design-intake/track-55-free-connection-routing/ADOPTION_REVIEW.md`: OPEN provenance flag → RESOLVED (this file cited as evidence). Minimal single-bullet edit; no other lines touched.

## Boundaries observed

no implementation started; `scripts/design-fidelity-validation-inventory.mjs` untouched; Drive originals read-only (copy + metadata reads only); no direct merge; Draft PR only.
