import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

test("Track66 V1.2 manifest exists and pins correct source fingerprint", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "design-intake/manifests/track-66-first-journey-v1-2.json"), "utf8"),
  );
  assert.equal(manifest.classification, "CANONICAL_OWNER_CAPABILITY");
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(manifest.rendering, "css3d-dom");
  assert.equal(manifest.backendScope, "BACKEND_FREE");
  assert.equal(manifest.sourceSnapshot.revisionLabel, "V1.2 (continuous-scroll interactive guide)");
  assert.equal(manifest.sourceSnapshot.sourceAuthorityState, "CURRENT_AT_OBSERVATION");
  assert.equal(manifest.ownerRoute, "/v4/journey");

  const exec = manifest.sourceArtifacts.find((a) => a.role === "executable");
  assert.ok(exec, "executable source artifact present");
  assert.equal(exec.filename, "현재후보.html");
  assert.equal(exec.driveId, "1IV94ub-t9qFs37FfwamViNUYtq5UkvaZ");
  assert.equal(exec.bytes, 166996);
  assert.equal(exec.sha256, "b50e16984774f3284be38b2b8609fd0a6d7ca9f3d51e3ce5bcd910995911ffc6");
  assert.equal(exec.status, "PINNED");

  const qa = manifest.sourceArtifacts.find((a) => a.role === "qa-artifact");
  assert.ok(qa, "QA artifact present");
  assert.equal(qa.filename, "검증결과.json");
  assert.equal(qa.driveId, "1AT7hyNVsahUw3b6IZtuD_D8SKjCSVuiv");
  assert.equal(qa.bytes, 5097);
  assert.equal(qa.sha256, "e49f07b46794d447ea8a7f1cd5715f153b47171161bbcd01eced2324137ca1e6");

  assert.equal(manifest.adoption.status, "UNDECIDED");
});

test("Track66 V1.2 page component exists and exports default component", () => {
  const content = fs.readFileSync(path.join(ROOT, "app/components/v4/V4FirstJourneyV12.tsx"), "utf8");
  assert.match(content, /export default function V4FirstJourneyV12/);
  assert.match(content, /scroll|morph|sticky/i);
  assert.match(content, /MAIN.*BRANCH|YOUR FIRST TREE/i);
});

test("Track66 page.tsx makes V1.2 default and isolates V1 as explicit legacy demo", () => {
  const content = fs.readFileSync(path.join(ROOT, "app/v4/journey/page.tsx"), "utf8");
  assert.match(content, /V4FirstJourneyV12/);
  assert.match(content, /V4FirstJourney/);
  assert.match(content, /searchParams: Promise/);
  assert.match(content, /const legacy = Array\.isArray\(params\.legacy\)/);
  assert.match(content, /if \(legacy === "1"\)/);
  assert.match(content, /return <V4FirstJourneyV12 storageKey=\{STORAGE_KEY\} \/>/);
  assert.doesNotMatch(content, /v12Mode|params\.get\("v12"\)|\?v12=1|JourneyMode|useEffect|useState/);
});

test("V1.2 presentation avoids forbidden scope", () => {
  const component = fs.readFileSync(path.join(ROOT, "app/components/v4/V4FirstJourneyV12.tsx"), "utf8");
  assert.doesNotMatch(component, /from.*server\/api/);
  assert.doesNotMatch(component, /from.*db\//);
  assert.doesNotMatch(component, /from.*auth\//);
  assert.doesNotMatch(component, /Firebase|Neon|Worker|Production/);
});

test("Existing V1 regression files remain available for explicit legacy-demo coverage", () => {
  const v1Component = fs.readFileSync(path.join(ROOT, "app/components/v4/V4FirstJourney.tsx"), "utf8");
  assert.match(v1Component, /export default function V4FirstJourney/);

  const v1Test = fs.readFileSync(path.join(ROOT, "tests/v4-first-journey-source-faithful.test.mjs"), "utf8");
  assert.match(v1Test, /v4 first journey/);
});

test("V1.2 CSS exists and defines scroll layout", () => {
  const css = fs.readFileSync(path.join(ROOT, "app/styles/v4/first-journey-v12.css"), "utf8");
  assert.match(css, /v4-j-v12-scroll/);
  assert.match(css, /v4-j-v12-progress/);
  assert.match(css, /v4-j-v12-section/);
  assert.match(css, /v4-j-v12-miniature/);
  assert.match(css, /reduced-motion/);
  assert.match(css, /@media[\s\S]*?max-width:\s*720px/);
});