import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COMMON_INSPECTION_METADATA,
  MOMENT_INSPECTION_ADAPTERS,
  PROTOTYPE_INSPECTION_MOMENTS,
  adapterForKind,
  adjacentInspectionMomentId,
  inspectionMomentById,
} from "../lib/media-inspection-prototype.ts";

const root = new URL("../", import.meta.url);

test("CAP-10 exposes five typed Moment media adapters with local controls", () => {
  assert.equal(MOMENT_INSPECTION_ADAPTERS.length, 5);
  assert.deepEqual(
    MOMENT_INSPECTION_ADAPTERS.map((adapter) => adapter.kind),
    ["photo", "video", "audio", "note", "document"],
  );
  assert.equal(new Set(MOMENT_INSPECTION_ADAPTERS.map((adapter) => adapter.kind)).size, 5);

  for (const adapter of MOMENT_INSPECTION_ADAPTERS) {
    assert.ok(adapter.viewerLabel.length > 0, `${adapter.kind} needs a viewer label`);
    assert.ok(adapter.controls.length > 0, `${adapter.kind} needs at least one type-specific control`);
    assert.ok(adapter.controls.every((control) => control.ariaLabel.length > 0));
    assert.ok(adapter.preserves.length > 0, `${adapter.kind} needs an explicit preservation contract`);
  }
});

test("every synthetic Moment resolves through the adapter registry and shares one metadata contract", () => {
  assert.deepEqual(COMMON_INSPECTION_METADATA, ["person", "capturedAt", "sourceLabel", "kind"]);
  assert.equal(PROTOTYPE_INSPECTION_MOMENTS.length, 5);

  for (const moment of PROTOTYPE_INSPECTION_MOMENTS) {
    assert.equal(adapterForKind(moment.kind).kind, moment.kind);
    assert.equal(inspectionMomentById(moment.id).id, moment.id);
    for (const key of COMMON_INSPECTION_METADATA) {
      assert.ok(moment[key], `${moment.id} is missing common metadata ${key}`);
    }
  }
});

test("previous and next inspection navigation stays inside the same Moment registry", () => {
  assert.equal(adjacentInspectionMomentId("inspect-01", -1), "inspect-05");
  assert.equal(adjacentInspectionMomentId("inspect-01", 1), "inspect-02");
  assert.equal(adjacentInspectionMomentId("inspect-05", 1), "inspect-01");
  assert.equal(adjacentInspectionMomentId("missing", 1), "inspect-01");
});

test("Design Lab route keeps one shell and derives local controls from the selected adapter", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/media-inspection/page.tsx", root),
    "utf8",
  );

  assert.match(page, /useState\(INITIAL_MOMENT_ID\)/);
  assert.match(page, /adapterForKind\(moment\.kind\)/);
  assert.match(page, /adapter\.controls\.map/);
  assert.match(page, /data-control=\{control\.id\}/);
  assert.match(page, /adjacentInspectionMomentId\(selectedId, direction\)/);
  assert.doesNotMatch(page, /router\.push|useRouter\(/, "selection must not become route navigation");
  assert.doesNotMatch(page, /fetch\(|\/api\/|firebase|signedUrl/i, "prototype must remain in-memory and backend-free");
});

test("selection exposes focus and announcement behavior without legal-product semantics", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/media-inspection/page.tsx", root),
    "utf8",
  );

  assert.match(page, /requestAnimationFrame\(\(\) => stageTitleRef\.current\?\.focus/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /aria-atomic="true"/);
  assert.match(page, /role="listbox"/);
  assert.match(page, /role="option"/);
  assert.match(page, /aria-selected=/);
  assert.match(page, /aria-expanded=\{detailOpen\}/);
  assert.match(page, /PROTOTYPE · NOT PRODUCT-READY/);
  assert.doesNotMatch(page, /피의자|고소인|유죄|증거능력|입증책임/);
});

test("CAP-10 provenance pins the exact source fingerprint", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/media-inspection/page.tsx", root),
    "utf8",
  );

  assert.match(page, /49,133 bytes/);
  assert.match(page, /46db34ee…bdd63/);
  assert.match(page, /CAP-10 #101/);
});

test("mobile disclosure, touch chips, focus visibility and reduced-motion remain explicit", async () => {
  const css = await readFile(new URL("app/styles/media-inspection-prototype.css", root), "utf8");

  assert.match(css, /grid-template-columns:\s*240px minmax\(0, 1fr\) 330px/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.lt-media-inspection__shell\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/);
  assert.match(css, /\.lt-media-inspection__rail\s*\{[\s\S]*?position:\s*sticky;/);
  assert.match(css, /\.lt-media-inspection__types\s*\{[\s\S]*?overflow-x:\s*auto;/);
  assert.match(css, /\.lt-media-inspection__detail-toggle\s*\{[\s\S]*?display:\s*flex;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration:\s*0\.001ms/);
  assert.match(css, /:focus-visible/);
});
