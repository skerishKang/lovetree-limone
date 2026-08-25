import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SOURCE_TRACK_38_BASE_IMPLEMENTATION,
  SOURCE_TRACK_38_CANONICAL_DISCOVER,
  SOURCE_TRACK_38_DISPOSITION,
  SOURCE_TRACK_38_DONOR_ELEMENTS,
  SOURCE_TRACK_38_FAMILY,
  SOURCE_TRACK_38_SOURCE_GAPS,
} from "../lib/source-track-38/donor.ts";

const sourceUrl = new URL(
  "../reference/source-tracks-snapshot/38_보이저_우주기억지도/01_보이저_우주영상기억지도.html",
  import.meta.url,
);
const sumsUrl = new URL(
  "../reference/source-tracks-snapshot/38_보이저_우주기억지도/SHA256SUMS.txt",
  import.meta.url,
);
const componentUrl = new URL(
  "../app/design-lab/source-tracks/38/v1/donor/Track38DiscoverDonor.tsx",
  import.meta.url,
);
const stylesUrl = new URL(
  "../app/design-lab/source-tracks/38/v1/donor/track38-discover-donor.module.css",
  import.meta.url,
);
const manifestUrl = new URL(
  "../design-intake/manifests/source-track-38-voyager-space-memory-map-v1.json",
  import.meta.url,
);

const source = readFileSync(sourceUrl, "utf8");
const sums = readFileSync(sumsUrl, "utf8");
const component = readFileSync(componentUrl, "utf8");
const styles = readFileSync(stylesUrl, "utf8");
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
const actualSha256 = createHash("sha256").update(source).digest("hex");

test("Track38 Voyager source snapshot remains byte and fingerprint pinned", () => {
  assert.equal(Buffer.byteLength(source), SOURCE_TRACK_38_FAMILY.sourceBytes);
  assert.equal(actualSha256, SOURCE_TRACK_38_FAMILY.sourceSha256);
  assert.match(sums, new RegExp(`^${SOURCE_TRACK_38_FAMILY.sourceSha256}\\s+\\./01_보이저_우주영상기억지도\\.html`, "m"));
  assert.equal(SOURCE_TRACK_38_FAMILY.sourceGitBlob, "0e393316c8682215634546724950aba91ab7ba7e");
});

test("Track38 disposition keeps existing Discover and public-tree implementation canonical", () => {
  assert.equal(SOURCE_TRACK_38_DISPOSITION, "USE_AS_VISUAL_FUNCTION_DONOR");
  assert.equal(SOURCE_TRACK_38_CANONICAL_DISCOVER, "/v4/community");
  assert.deepEqual([...SOURCE_TRACK_38_BASE_IMPLEMENTATION], [
    "app/components/v4/V4CommunityDiscovery.tsx#V4CommunityDiscovery",
    "app/components/v4/V4CommunityDiscovery.tsx#V4PublicTree",
  ]);
  assert.equal(manifest.productJob.startsWith("DISCOVER"), true);
  assert.equal(manifest.adoption.status, "SOURCE_REFERENCE_ONLY");
  assert.match(manifest.adoption.note, /USE_AS_VISUAL_FUNCTION_DONOR/);
  assert.ok(SOURCE_TRACK_38_DONOR_ELEMENTS.includes("public-memory node constellation"));
});

test("source-only runtime and accessibility gaps remain explicit", () => {
  assert.match(source, /touch-action:none/);
  assert.match(source, /https:\/\/i\.ytimg\.com\/vi\//);
  assert.match(source, /https:\/\/www\.youtube\.com\/embed\//);
  assert.match(source, /requestAnimationFrame\(frame\)/);
  assert.match(source, /camera\.auto/);
  assert.match(source, /document\.addEventListener\('keydown'/);
  assert.doesNotMatch(source, /prefers-reduced-motion/);
  assert.ok(SOURCE_TRACK_38_SOURCE_GAPS.some((gap) => gap.includes("keyboard")));
});

test("bounded donor consumes canonical public APIs without copying source fixture runtime", () => {
  assert.match(component, /apiFetch\("\/api\/community\/trees\?view=summary&sort=latest&limit=24"\)/);
  assert.match(component, /apiFetch\(`\/api\/community\/memories\?treeId=/);
  assert.match(component, /SOURCE_TRACK_38_CANONICAL_PUBLIC_TREE_PREFIX/);
  assert.match(component, /parentId/);
  assert.doesNotMatch(component, /youtube\.com|ytimg\.com|<iframe/i);
  assert.doesNotMatch(component, /Math\.random|requestAnimationFrame\(frame\)/);
  assert.doesNotMatch(component, /createFirstTree|localStorage|firebase|drizzle/);
});

test("donor remediation is keyboard, touch and reduced-motion safe at the bounded route", () => {
  assert.match(component, /type="button"/);
  assert.match(component, /onKeyDown=/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /aria-pressed=/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /touch-action:\s*none/);
  assert.deepEqual(manifest.qa.viewports, [
    { width: 1280, height: 800 },
    { width: 390, height: 844, mobile: true },
  ]);
  assert.equal(manifest.qa.keyboardFocus, true);
  assert.equal(manifest.qa.touch, true);
  assert.equal(manifest.qa.reducedMotion, true);
});

test("Track38 manifest keeps product and protected-file boundaries explicit", () => {
  assert.equal(manifest.stableId, "source-track-38-voyager-space-memory-map-v1");
  assert.equal(manifest.classification, "REFERENCE_CAPABILITY_ONLY");
  assert.equal(manifest.reservation.held, true);
  assert.match(manifest.summary, /current \/v4\/community/i);
  const boundedText = `${component}\n${styles}\n${JSON.stringify(manifest)}`;
  assert.doesNotMatch(boundedText, /master-design-coverage\.json/);
  assert.doesNotMatch(boundedText, /pull\/191|PR #191/);
});
