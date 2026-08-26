import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

const SOURCE_PATH = "reference/source-track-57-living-glass/04_버전1.3_모바일반응형수정_자료/후보_버전1.3_리빙글라스_모먼트카드_모바일반응형수정.html";
const ROUTE_PATH = "app/design-lab/source-tracks/57/v1-3-native/page.tsx";
const ROUTE_COMPONENT = "app/design-lab/source-tracks/57/v1-3-native/Source57LivingGlassNative.tsx";
const LIB = "lib/source-track-57-living-glass.ts";
const CARD = "app/components/moment-presentation/LivingGlassMomentCard.tsx";
const INSPECTOR = "app/components/moment-presentation/LivingGlassMomentInspector.tsx";
const GALLERY = "app/components/moment-presentation/LivingGlassMomentGallery.tsx";
const CSS = "app/styles/source-track-57-living-glass.css";
const NEXT_CONFIG = "next.config.ts";

const EXPECTED_SHA = "ca30cdb430067a0649c9f3ee61c148f0b6e606220a9c05ba806ae0afffa66ace";
const EXPECTED_BYTES = 676_320;

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

test("Source57 V1.3 preserved executable remains exact authority", () => {
  const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH));
  assert.equal(source.byteLength, EXPECTED_BYTES);
  assert.equal(sha256(source), EXPECTED_SHA);

  const manifest = JSON.parse(read("design-intake/manifests/source-track-57-living-glass.json"));
  const v13 = manifest.sourceArtifacts.find((artifact) => artifact.sha256 === EXPECTED_SHA);
  assert.ok(v13, "manifest must retain the exact V1.3 artifact");
  assert.equal(v13.bytes, EXPECTED_BYTES);
  assert.equal(v13.driveId, "1J4_JbDs256rYXMayx-6EOA95au5hYmRg");
});

test("Source57 staging namespace remains separate from repository Lineage57", () => {
  const source57 = read(LIB);
  const route = read(ROUTE_COMPONENT);
  assert.match(source57, /source-track-57-living-glass/);
  assert.match(source57, /\/design-lab\/source-tracks\/57\/v1-3-native/);
  assert.doesNotMatch(source57, /\/design-lab\/lineages\/57/);
  assert.doesNotMatch(route, /\/design-lab\/lineages\/57/);

  const existing = read("lib/lineage-57-living-character-source.ts");
  assert.match(existing, /lt-57-living-character-world/);
  assert.doesNotMatch(source57, /Living Character World|lt-57-living-character-world/);
});

test("native staging is split into reusable Moment presentation components", () => {
  for (const file of [CARD, INSPECTOR, GALLERY, ROUTE_PATH, ROUTE_COMPONENT, CSS, LIB]) {
    assert.ok(exists(file), `${file} must exist`);
  }
  assert.match(read(LIB), /import type \{ TreeMomentView \} from "@\/lib\/moment-model"/);
  assert.match(read(CARD), /moment: TreeMomentView/);
  assert.match(read(INSPECTOR), /moment: TreeMomentView/);
  assert.match(read(GALLERY), /moments: TreeMomentView\[\]/);
  assert.match(read(ROUTE_COMPONENT), /<LivingGlassMomentGallery/);
});

test("canonical Moment/media fields drive the Source57 visual system without persistence", () => {
  const implementation = [LIB, CARD, INSPECTOR, GALLERY, ROUTE_COMPONENT].map(read).join("\n");
  for (const field of ["title", "memo", "sourceType", "thumbnail", "emotionTags", "discoveryDate", "connectionReason"]) {
    assert.match(implementation, new RegExp(`moment\\.${field}`), `${field} should come from canonical Moment projection`);
  }
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "prisma", "drizzle", "neon", "supabase", "/api/memories", "fetch("]) {
    assert.equal(implementation.includes(forbidden), false, `${forbidden} must not become staging authority`);
  }
  assert.match(read(LIB), /presentation metadata/i);
  assert.match(read(INSPECTOR), /WHY NEXT/);
  assert.match(read(INSPECTOR), /저장되지 않습니다/);
});

test("exact preserved Source57 media is routed through canonical thumbnail presentation", () => {
  const lib = read(LIB);
  for (const name of ["moment-1.jpg", "moment-2.jpg", "moment-3.jpg"]) {
    assert.match(lib, new RegExp(`/reference/source-track-57-living-glass/${name.replace(".", "\\.")}`));
  }
  assert.match(lib, /sourceType: "video"/);
  assert.match(read(CARD), /moment\.thumbnail/);
  assert.match(read(INSPECTOR), /moment\.thumbnail/);
});

test("Source57 exact-media bypass stays component-local instead of changing global Next image behavior", () => {
  const card = read(CARD);
  const nextConfig = read(NEXT_CONFIG);
  assert.match(card, /<Image[\s\S]*?\bunoptimized\b[\s\S]*?\/>/);
  assert.doesNotMatch(nextConfig, /images\s*:\s*\{[\s\S]*?unoptimized\s*:\s*true/);
});

test("pointer, touch-compatible pointer events, keyboard and visible-focus contracts are present", () => {
  const card = read(CARD);
  const css = read(CSS);
  assert.match(card, /onPointerMove/);
  assert.match(card, /pointerType === "touch"/);
  assert.match(card, /onPointerCancel/);
  assert.match(card, /onKeyDown/);
  assert.match(card, /event\.key !== "Enter"/);
  assert.match(card, /event\.key !== " "/);
  assert.match(card, /tabIndex=\{0\}/);
  assert.match(card, /aria-pressed=\{selected\}/);
  assert.match(css, /\.living-glass-card-wrap:focus-visible/);
  assert.match(css, /outline: 2px solid/);
});

test("desktop/mobile/reduced-motion and overflow-safe visual contracts are explicit", () => {
  const css = read(CSS);
  assert.match(css, /grid-template-columns: repeat\(3/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /backdrop-filter: blur\(28px\)/);
  assert.match(css, /--gx:/);
  assert.match(css, /living-glass-inspector/);
});
