import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(await readFile("design-intake/codex-work-13-cinematic-watercolor-v2.json", "utf8"));
const dataModule = await readFile("app/components/v4/v4-subject-albums.ts", "utf8");
const currentLibrary = await readFile("app/components/v4/V4PersonAlbums.tsx", "utf8");
const routePage = await readFile("app/v4/subjects/cinematic-watercolor-v2/page.tsx", "utf8");
const lens = await readFile("app/v4/subjects/cinematic-watercolor-v2/CinematicWatercolorSubjectLens.tsx", "utf8");
const styles = await readFile("app/v4/subjects/cinematic-watercolor-v2/cinematic-watercolor-subject.module.css", "utf8");

const forbiddenRuntimeSourceAssets = [
  "01-moment-awakens-clean.mp4",
  "02-season-becomes-lovetree-clean.mp4",
  "03-quiet-editorial.png",
  "04-paths-editorial.png",
  "05-bloom-editorial.png",
  "06-season-cover.png",
  "07-lovetree-overhead-final.png",
];

test("Issue 492 remains a V4 SUBJECT visual/presentation donor", () => {
  assert.equal(manifest.product_job, "SUBJECT");
  assert.equal(manifest.source_authority, "V2");
  assert.equal(manifest.adoption.mode, "VISUAL_PRESENTATION_DONOR");
  assert.equal(manifest.adoption.structural_base, "/v4/subjects");
  assert.equal(manifest.adoption.product_disposition, "V4_SUBJECT_VISUAL_DONOR");
  assert.equal(manifest.adoption.distinct_native_required, false);
  assert.equal(manifest.adoption.parallel_subject_application_authorized, false);
  assert.equal(manifest.repository_intake.binary_archive_status, "FINGERPRINT_ONLY");
});

test("current SUBJECT library and donor lens share one album projection", () => {
  assert.match(currentLibrary, /V4_SUBJECT_ALBUMS/);
  assert.match(currentLibrary, /V4_SUBJECT_ARCHIVE_ROUTES/);
  assert.doesNotMatch(currentLibrary, /const PEOPLE\s*=/);
  assert.match(dataModule, /export const V4_SUBJECT_ALBUMS/);
  assert.match(dataModule, /export const V4_SUBJECT_ARCHIVE_ROUTES/);
  assert.match(lens, /V4_SUBJECT_ALBUMS/);
  assert.match(lens, /V4_SUBJECT_ARCHIVE_ROUTES/);
});

test("bounded proving route ends in the current SUBJECT product surface", () => {
  assert.match(routePage, /CinematicWatercolorSubjectLens/);
  assert.match(routePage, /V4PersonAlbums/);
  assert.match(routePage, /data-current-subject-authority="\/v4\/subjects"/);
  assert.match(lens, /data-product-boundary="visual-presentation-donor-only"/);
  assert.match(lens, /href="\/v4\/subjects"/);
  assert.doesNotMatch(routePage + lens, /\/api\//);
  assert.doesNotMatch(routePage + lens, /firebase|neon|drizzle|database/i);
});

test("source cinematic phase language and 12.15 second pacing are preserved", () => {
  for (const phase of ["ONE_MOMENT", "AWAKENING", "CONNECTION", "SEASON", "LIVING_ARCHIVE", "SEASON_COVER"]) {
    assert.match(lens, new RegExp(`id: "${phase}"`));
  }
  assert.match(lens, /SOURCE_PHASE_DURATIONS_MS = \[2200, 3350, 2650, 2900, 1050\]/);
  assert.match(lens, /Source V2 hero timing: 0–2\.2–5\.55–8\.2–11\.1–12\.15s/);
  assert.match(styles, /cubic-bezier\(0\.2, 0\.7, 0\.2, 1\)/);
  assert.match(styles, /--rose:/);
  assert.match(styles, /--teal:/);
  assert.match(styles, /paperNoise/);
});

test("fingerprint-only source binaries are not silently promoted into Product runtime", () => {
  for (const asset of forbiddenRuntimeSourceAssets) {
    assert.ok(manifest.required_assets.some((entry) => entry.filename === asset), `${asset} must remain pinned in source authority`);
    assert.equal((routePage + lens + styles).includes(asset), false, `${asset} must not be runtime-promoted by the donor lens`);
  }
  assert.doesNotMatch(routePage + lens, /drive\.google|googleusercontent/);
  assert.doesNotMatch(routePage + lens, /<video|<iframe/i);
});

test("native remediation covers keyboard, touch, replay, live status and reduced motion", () => {
  assert.match(lens, /ArrowRight/);
  assert.match(lens, /ArrowLeft/);
  assert.match(lens, /event\.key === "Home"/);
  assert.match(lens, /event\.key === "End"/);
  assert.match(lens, /SWIPE_THRESHOLD_PX = 42/);
  assert.match(lens, /onPointerCancel/);
  assert.match(lens, /aria-live="polite"/);
  assert.match(lens, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /touch-action: pan-y/);
  assert.match(styles, /:focus-visible/);
});
