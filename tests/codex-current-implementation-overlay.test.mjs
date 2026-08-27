import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const overlay = JSON.parse(
  fs.readFileSync(new URL("../design-intake/codex-current-implementation-overlay.json", import.meta.url), "utf8"),
);

const byId = new Map(overlay.families.map((family) => [family.codexId, family]));

test("Codex overlay preserves namespace/count authority", () => {
  assert.equal(overlay.kind, "CODEX_CURRENT_IMPLEMENTATION_OVERLAY");
  assert.equal(overlay.counts.primaryCodexDesignFolders, 20);
  assert.equal(overlay.counts.normalizedPrimaryCodexFamilies, 18);
  assert.equal(overlay.families.length, 20);
  assert.match(overlay.namespaceRules.join("\n"), /never implies SOURCE or LINEAGE identity/);
});

test("Codex12 variants remain one Living Media Sphere family", () => {
  const variants = [byId.get("12-1"), byId.get("12-2"), byId.get("12-3")];
  assert.ok(variants.every(Boolean));
  assert.ok(variants.every((item) => item.normalizedFamily === "Living Media Sphere"));
  assert.equal(byId.get("12-3").currentExecutable.sha256, "2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232");
});

test("current Codex02/03 source gaps are explicit and fingerprinted", () => {
  assert.equal(byId.get("02").implementationState, "SOURCE_ONLY_CURRENT_NATIVE_GAP");
  assert.equal(byId.get("02").currentExecutable.bytes, 22412);
  assert.equal(byId.get("02").currentExecutable.sha256, "30365a8d5bf7b7e6a1f6ec0b710d6e566d37d696cc1b700ede69d020a05ef1e9");
  assert.equal(byId.get("03").implementationState, "SOURCE_ONLY_CONFIRMED_NATIVE_GAP");
  assert.equal(byId.get("03").currentExecutable.bytes, 32775);
  assert.equal(byId.get("03").currentExecutable.sha256, "47dee98f61008ee1c054fb6055717f1e15346e30b039f7e0080e3d54ffe3daef");
  assert.equal(byId.get("02").route, null);
  assert.equal(byId.get("03").route, null);
});

test("Codex13/14/15 stale Draft state is currentized to merged main truth", () => {
  for (const id of ["13", "14", "15"]) {
    assert.equal(byId.get(id).mainPresent, true, `Codex${id} must be present on current main`);
  }
  assert.equal(byId.get("13").implementationState, "NATIVE_IMPLEMENTED");
  assert.equal(byId.get("14").implementationState, "NATIVE_IMPLEMENTED");
  assert.equal(byId.get("15").implementationState, "PRODUCT_DONOR_INTEGRATED");
  assert.equal(byId.get("13").prs[0], 503);
  assert.equal(byId.get("14").prs[0], 502);
  assert.equal(byId.get("15").prs[0], 506);
});

test("Five-Source assembly is recorded complete without changing canonical resolver authority", () => {
  assert.equal(overlay.productCurrentization.fiveSourceMvpAssembly, "COMPLETE_MERGED_MAIN");
  assert.equal(overlay.productCurrentization.fiveSourceSemanticUx, "COMPLETE_MERGED_MAIN");
  assert.equal(overlay.productCurrentization.canonicalTreeProtocol, "/trees/:treeId/<view>?moment=:momentId");
  assert.deepEqual(overlay.productCurrentization.assemblyPrs, [529, 531]);
});

test("accepted product review forbids a second broad SUBJECT application", () => {
  assert.equal(overlay.selectionGuard.groundUpNewNativeRequiredByAccepted469Review, 0);
  assert.equal(overlay.selectionGuard.subjectBase, "/v4/subjects");
  assert.match(overlay.selectionGuard.subjectDecision, /no second SUBJECT application/);
  assert.equal(overlay.selectionGuard.finalVisualPromotion, "PRODUCT_OWNER_CONTROLLED");
});
