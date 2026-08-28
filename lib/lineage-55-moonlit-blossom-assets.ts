// Lineage 55 asset materialization gate.
//
// The five historical PNGs (2 flowers, 3 portraits) are materialized under
// public/old/reference/lineage-55-moonlit-blossom-v1/assets from the Drive V1
// authoritative folder 14_LoveTree_Moonlit_Blossom_Hero_V1 after byte-exact
// verification: verify-lineage-55-assets.mjs CURRENT_DRIVE_V1_EXACT 5/5,
// LINEAGE_55_CURRENT_DRIVE_ONLY_GATE_PASS (exit 0). Historical provenance
// remains fail-closed by design: HISTORICAL_ASSET_SOURCE_UNRESOLVED.
//
// With this flag true the native route serves real verified bytes through the
// canonical paths declared in lib/lineage-55-moonlit-blossom-data.ts.

export const LINEAGE_55_ASSETS_MATERIALIZED = true;
