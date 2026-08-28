import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const treePage = readFileSync("app/trees/[id]/page.tsx", "utf8");
const source57Styles = readFileSync("app/styles/mvp-source57-moment-language.css", "utf8");
const detailModal = readFileSync("app/components/MomentDetailModal.tsx", "utf8");
const source57Native = readFileSync("app/design-lab/source-tracks/57/v1-3-native/Source57LivingGlassNative.tsx", "utf8");

test("Source57 is adopted as presentation language inside the canonical Tree route", () => {
  assert.match(treePage, /source57-moment-language/);
  assert.match(treePage, /source57-product-detail-scope/);
  assert.match(treePage, /data-mvp-source="57"/);
  assert.match(treePage, /MomentDetailModal/);
  assert.doesNotMatch(treePage, /\/design-lab\/source-tracks\/57\/v1-3-native/);
});

test("canonical Moment URL and edit/delete behavior remain owned by existing product components", () => {
  assert.match(treePage, /const momentParam = searchParams\.get\("moment"\)/);
  assert.match(treePage, /useMomentUrlState/);
  assert.match(treePage, /onUpdate=\{updateMoment\}/);
  assert.match(treePage, /onDelete=\{deleteMoment\}/);
  assert.match(detailModal, /handleSave/);
  assert.match(detailModal, /handleDelete/);
});

test("Living Glass adaptation includes selected hierarchy, media depth, WHY NEXT and reduced-motion protection", () => {
  assert.match(source57Styles, /\.memory-record\.selected/);
  assert.match(source57Styles, /backdrop-filter: blur\(24px\) saturate\(145%\)/);
  assert.match(source57Styles, /\.moment-detail-parent::before/);
  assert.match(source57Styles, /content: "WHY NEXT"/);
  assert.match(source57Styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("Source57 authoritative Design Lab proof remains intact and separate", () => {
  assert.match(source57Native, /SOURCE57_NATIVE_MOMENTS/);
  assert.match(source57Native, /LivingGlassMomentGallery/);
  assert.match(source57Native, /DESIGN-LAB STAGING/);
  assert.doesNotMatch(treePage, /SOURCE57_NATIVE_MOMENTS|SOURCE57_PRESENTATION_BY_ID/);
});
