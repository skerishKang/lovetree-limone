# Lineage 55 — Moonlit Blossom V1 provenance split

## Status

- Lineage: `lt-55-moonlit-blossom-hero`
- Tracking issue: #134
- Draft intake PR: #135
- Provenance status: `PROVENANCE_UNRESOLVED`
- Root-cause class: `INTAKE_SOURCE_PROVENANCE_MIS-ASSOCIATION`
- Product policy inference: none. Source fixtures are evidence, not canonical V4 business rules.

The earlier intake combined an historical recorded fingerprint, the Git-preserved HTML, and the currently observable Drive V1 object as if they were one byte-exact identity. Forensic review disproved that association. This document preserves the historical claim but separates all three identities.

## Record A — historical recorded claim

State: `HISTORICALLY_RECORDED_UNVERIFIED_FINGERPRINT`

The original #135 intake recorded `index-v1.html` against Drive ID `11VCsXcP2OlOH1pOAwFmhD4HwIU1blc6M` as:

- 22,260 bytes
- SHA-256 `1c68271530d426237c122249ef27cb9f7ad6057d1dd245c3739740ef4836ae38`
- Git blob `7dbad6aa26f77a576da0aa13af9b884a52fd944b`

These values are retained as forensic history. They are **not** verified current Drive truth, and their originating source remains unresolved.

## Record B — actual Git-preserved snapshot

State: `UNVERIFIED_HISTORICAL_GIT_SNAPSHOT`

Repository path:

`reference/lineage-55-moonlit-blossom-v1/source/index-v1.html`

Observed identity: `LoveTree Memory Blossom Hero v1`

Actual Git blob:

`3590e5fbe3af35c364f9ca3444901ee2671e18e5`

Origin: `UNRESOLVED`

This file must remain preserved as historical forensic evidence. It must not be overwritten with current Drive bytes and must not be described as the canonical Drive V1 source.

Its staged states, 2100ms autoplay, 700ms wheel throttle, 36-petal burst, displayed `127 / 150 MOMENTS`, and related UI surfaces are facts about this Git fixture only. They do not define canonical LoveTree V4 product policy.

## Record C — Drive-authoritative observable V1 R3

State: `V1_DRIVE_AUTHORITATIVE_R3`

- Drive folder: `14_LoveTree_Moonlit_Blossom_Hero_V1` / `151yoYBj7rVaQbZuKvSbt8D5_LZC6vpqs`
- file: `index-v1.html`
- Drive ID: `11VCsXcP2OlOH1pOAwFmhD4HwIU1blc6M`
- revision ID: `0B-UtbwYpFaMJZWpzeVE0eGU4MDNWR1pTTVRzZWlZbHBIM3dJPQ`
- modified: `2026-08-10T19:43:06.020Z`
- bytes: `22,260`
- SHA-256: `1c682715a193ae9b1670f4a415d555a27ee7ad49a4dd58fecfa83e9f14da5f41`
- Git blob: `0fa3066680a556e9f6c0ee50780f39abe0f98cfc`
- identity: `LoveTree — Moonlit Blossom`

The raw Drive file was re-downloaded and rehashed during remediation. No repository evidence copy is committed because the available GitHub connector cannot accept the raw file reference directly; re-serializing the text through a connector string would not satisfy the exact-byte evidence standard. The historical Git path remains untouched.

R3 predates PR #135. It is explicitly **not** a later post-PR snapshot.

## PNG provenance split

Each of the five V1 assets now has independently represented identities:

1. Drive object identity — current V1 Drive ID and visible revision ID.
2. Historical recorded fingerprint — the old #135 bytes/dimensions/SHA/blob, retained as unverified historical evidence.
3. Current Drive fingerprint — raw downloaded bytes independently rehashed during remediation.
4. V2 alias — a different Drive object in `15_LoveTree_Moonlit_Blossom_Journey_V2` whose bytes are identical to the current V1 object.

The five current V1 assets and five V2 aliases are 5/5 byte-identical, including SHA-256, Git blob SHA, PNG dimensions, and color type. Their Drive object IDs are distinct.

The historical five-asset source remains `HISTORICAL_ASSET_SOURCE_UNRESOLVED`.

## Verifier semantics

`scripts/verify-lineage-55-assets.mjs` no longer treats the historical fingerprint as the expected bytes of the current Drive IDs.

- Default mode verifies any transferred current-Drive V1 binaries, then remains fail-closed with `HISTORICAL_ASSET_SOURCE_UNRESOLVED` and exit code 2.
- `--current-drive-only` may emit `LINEAGE_55_CURRENT_DRIVE_ONLY_GATE_PASS` when the current observable V1 set is byte-exact. This is not a historical provenance pass.
- The former `LINEAGE_55_EXACT_ASSET_GATE_PASS` marker is removed because it conflated current Drive identity with unresolved historical evidence.

## V2 boundary

`15_LoveTree_Moonlit_Blossom_Journey_V2` remains a **Lineage 55 Revision**, not a new lineage. Its asset reuse relationship is now explicit and does not depend on resolving the foreign historical snapshot origin.

After this provenance split is verified by tests, V2 provenance work may proceed. Native V2 UI implementation is not part of this remediation.

## Remaining unresolved evidence

- origin of the Git-preserved `LoveTree Memory Blossom Hero v1` snapshot;
- origin of historical HTML fingerprint `1c68271530d4...ae38` / `7dbad6aa...`;
- origin of the five historical PNG fingerprints.

These unknowns remain recorded and fail-closed; they are not silently converted into verified Drive provenance.
