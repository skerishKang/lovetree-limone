// Central Design Fidelity adapter for the already-proven Lineage59 actual-route
// browser gate. The existing QA owns assertions; this file only binds its base
// URL to the orchestration server so no second server/port authority is created.
process.env.LINEAGE59_BASE_URL ??=
  process.env.LOVETREE_QA_BASE_URL || process.env.V4_BASE_URL || "http://127.0.0.1:3000";

await import("../../tests/lineage-59-browser-qa.test.mjs");
