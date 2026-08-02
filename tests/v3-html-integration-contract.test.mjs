import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const ALL_16_HTML = [
  "lovetree-complete-manga-refinement.html",
  "lovetree-step2-emotion-refined.html",
  "lovetree-step3-connect-next-video.html",
  "lovetree-growing-tree-v5-draggable-notes.html",
  "lovetree-growing-tree-v6-fullscreen-add.html",
  "lovetree-node-graph-prototype.html",
  "lovetree-obsidian-graph1.html",
  "lovetree-love-nebula.html",
  "lovetree-juyeon-timeline.html",
  "lovetree-person-albums.html",
  "lovetree-vertical-person-album.html",
  "lovetree-community-discovery-v2.html",
  "lovetree-300-moments-finale.html",
  "lovetree-aurora-particle-heart.html",
  "lovetree-rainbow-memory-canopy.html",
  "lovetree-purple-bloom-graph.html",
];

// 1. Audit 문서에 16개 HTML이 모두 존재
test("V3 audit document lists all 16 HTML files", async () => {
  const audit = await readFile(new URL("docs/v3/V3_HTML_INTEGRATION_AUDIT.md", root), "utf8");
  for (const file of ALL_16_HTML) {
    assert.ok(audit.includes(file), `${file} must appear in the V3 audit document`);
  }
});

// 2. 각 HTML이 하나 이상의 V3 목적에 매핑되어야 함
test("every HTML maps to at least one V3 purpose in the audit", async () => {
  const audit = await readFile(new URL("docs/v3/V3_HTML_INTEGRATION_AUDIT.md", root), "utf8");
  const sections = audit.split(/^## /m);
  const htmlSections = sections.filter((s) =>
    ALL_16_HTML.some((f) => s.includes(f)),
  );
  assert.equal(htmlSections.length, 16, "audit must have one section per HTML file");
  for (const section of htmlSections) {
    assert.ok(
      /V3 사용 위치/.test(section) && /V3에서 버릴 요소/.test(section),
      "each HTML section must include v3_use and v3_discard rows",
    );
  }
});

// 3. 문서 산출물 존재
test("all V3 docs exist", async () => {
  const docs = [
    "docs/v3/V3_PRODUCT_CONTRACT.md",
    "docs/v3/V3_HTML_INTEGRATION_AUDIT.md",
    "docs/v3/V3_ROUTE_COMPONENT_MAP.md",
    "docs/v3/V3_SHARED_CORE_GAPS.md",
    "docs/v3/V3_PHASE_PLAN.md",
  ];
  for (const doc of docs) {
    const content = await readFile(new URL(doc, root), "utf8");
    assert.ok(content.length > 0, `${doc} must not be empty`);
  }
});

// 4. product contract documents V1/V2 separation and worker scope
test("product contract states V3 is a separate candidate, not a replacement", async () => {
  const contract = await readFile(new URL("docs/v3/V3_PRODUCT_CONTRACT.md", root), "utf8");
  assert.match(contract, /V1\/V2의 대체가 아니라/);
  assert.match(contract, /생성·배포하지 않/);
});
