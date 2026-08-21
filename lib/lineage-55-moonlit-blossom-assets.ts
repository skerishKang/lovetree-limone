// Lineage 55 asset materialization gate.
//
// The five historical PNGs (2 flowers, 3 portraits) remain under provenance
// hold: HISTORICAL_ASSET_SOURCE_UNRESOLVED. Their canonical public paths are
// already declared in lib/lineage-55-moonlit-blossom-data.ts, but the bytes
// are NOT committed, so requesting them would produce 404 console noise and
// fail-closed fidelity gates.
//
// While this flag is false the native route renders stylized placeholders and
// emits ZERO network requests for lineage-55 media. The follow-up lane that
// materializes the exact verified Drive V1 bytes (verify-lineage-55-assets.mjs
// CURRENT_DRIVE_V1_EXACT for all five) must flip this flag to true in the same
// change so <img> requests activate only against real, verified bytes.

export const LINEAGE_55_ASSETS_MATERIALIZED = false;
