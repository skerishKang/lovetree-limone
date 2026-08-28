# Lineage 57 — Living Character World source provenance

Authoritative Drive:
- V2 folder `1Ui-0V0KWhJyAIq-JEkswKLA0VpUxC6BH`
- V1 folder `1xRwrB3GA8qfyhpDhPid0LIL3mRkPzf3F`

## Exact original text sources

| Revision/file | Drive ID | Original bytes | Original SHA256 | Stored archive |
|---|---|---:|---|---|
| V1 `index.html` | `1X2TXWCXCe8wFIf7NsQk5jMiOw7T2JmAQ` | 22,218 | `d71197cf97db913a7498e8ce732acf4f094e13d83fde06129d04c265fd1b6710` | `../lineage-57-living-character-world-v1/source/index.html.xz.b64` |
| V2 `index.html` | `1vUMhdOXGo586GnJCnl8o_9zGizF_jYMI` | 22,310 | `4f28f1671146a36c53e88e0645c6dbe29076b1db526e21adb40794617a36223b` | `source/index.html.xz.b64` |
| V2 `living-world-v2.js` | `1fd42ni1Y287_v1yHGjhc5zdw2Pn_CQTc` | 14,449 | `6c0d33c96fc507d2732bb92d4d0b0a65e66014fb5ede159d5862e359b51e1838` | `source/living-world-v2.js.xz.b64` |
| V2 `living-world-v2.css` | `1_ajrjUZby-689e8qblcyawX-BT3xfHqy` | 2,736 | `b8c3a829ebeef1432ef01edf633bb6b2da184bf0147eed0047489cfe9b0f2214` | `source/living-world-v2.css.xz.b64` |

The `.xz.b64` files are **lossless deterministic archives** of the exact Drive bytes. Restore with `base64 -d | xz -dc`; then verify the original byte count and SHA256 above. They are archives, not product runtime files.

Deterministic archive SHA256 values:
- V1 index XZ: `7d02767bda41caf77d3d59aefa87abfa8a4a62052161f3abe7d1421c91100d5f`
- V2 index XZ: `0655535302e677d040ffeb1b58c578e7701bc07a32aea976354c7fab910a6a5f`
- V2 JS XZ: `7892fe84c7dbb9fac7cdb06eeb42f7a1ec64a9bc76727cd0f8b30024565ea93c`
- V2 CSS XZ: `478ef4b617f1c5688feaf8cb90b1c930a6ad63e2dcb834c7cd0876131db6bd2c`

## Revision relationship

The authoritative V2 `index.html` is byte-for-byte the V1 `index.html` after adding only:
- `<link rel="stylesheet" href="living-world-v2.css">`
- `<script src="living-world-v2.js"></script>`

Therefore this intake models V2 as **V1 base composition + V2 interaction overlay**, not a new UI thesis.

## Binary boundary

The 48 character WebP frames and 6 Lubt PNG poses are fingerprinted in `lib/lineage-57-assets.ts` but intentionally are **not** transferred by this web session. Until all 54 exact binaries exist at their registered paths, the route and verifier must remain `EXACT_CHARACTER_ASSET_TRANSFER_HOLD` and no visual source-fidelity PASS may be claimed.
