// Source Track 47 V4.2.5 — native candidate component contract tests.
// Layer 3 of 3 (component/contract): real React server render plus
// interaction-code contracts. CSS modules are stubbed via a test loader so
// the exact shipped component file renders under node.

import assert from "node:assert/strict";
import { register } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

register(new URL("./fixtures/css-stub-loader.mjs", import.meta.url));

const root = new URL("../", import.meta.url);
const { default: Track47NativeFrontDoor } = await import(
  "../app/design-lab/source-tracks/47/v4-2-5/native/Track47NativeFrontDoor.tsx"
);
const { SOURCE_TRACK_47_POSTER, SOURCE_TRACK_47_VIDEO } = await import(
  "../lib/source-track-47/provenance.ts"
);
const { SOURCE_TRACK_47_ROUTES } = await import("../lib/source-track-47/route-map.ts");

const html = renderToString(createElement(Track47NativeFrontDoor));
const componentText = await readFile(
  new URL(
    "app/design-lab/source-tracks/47/v4-2-5/native/Track47NativeFrontDoor.tsx",
    root,
  ),
  "utf8",
);

const runnerText = await readFile(
  new URL(
    "app/design-lab/source-tracks/47/v4-2-5/source/SourceTrack47Runner.tsx",
    root,
  ),
  "utf8",
);

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test("renders the cinematic stage skeleton with initial ACT 1", () => {
  assert.match(html, /data-act="1"/);
  assert.match(html, /data-mode="AUTO_CINEMATIC"/);
  assert.match(html, /aria-live="polite"/);
  // All five scene-copy sections exist with exact act ids.
  for (const actId of [1, 2, 3, 4, 5]) {
    assert.match(html, new RegExp(`data-copy-act="${actId}"`));
  }
  // Exact act copy is present (fidelity: no paraphrase).
  assert.match(html, /마음이 움직인 순간은/);
  assert.match(html, /그 순간을 남기고\./);
  assert.match(html, /하나의 순간이/);
  assert.match(html, /왜 다음 장면을/);
  assert.match(html, /My LoveTree\./);
  assert.match(html, /표정이 계속 생각나서\./);
  assert.match(html, /CONNECTION · THE REASON YOU MOVED NEXT/);
});

test("video ownership points at the declared exact asset (absent → poster fallback)", () => {
  assert.match(html, new RegExp(`poster="${SOURCE_TRACK_47_POSTER.assetPath}"`));
  assert.match(html, new RegExp(`src="${SOURCE_TRACK_47_VIDEO.videoAssetPath}"`));
  assert.match(html, /playsinline/i);
  const component = componentText;
  // Error is wired via an effect listener (refs survive fast 404s better than
  // a synthetic onError on <source> — see Track47NativeFrontDoor.tsx).
  assert.match(component, /addEventListener\("error", failVideo\)/);
  // Poster fallback layer mirrors the source .poster-fallback div.
  assert.match(html, /background-image:url\(&#x27;|background-image:url\('/);
});

test("pinned nav contract: triggers are buttons with ARIA menu semantics", () => {
  assert.equal(count(html, 'aria-haspopup="true"'), 3);
  assert.equal(count(html, 'aria-expanded="false"'), 3);
  assert.match(html, /data-nav-menu="moments"/);
  assert.match(html, /data-nav-menu="connections"/);
  assert.match(html, /data-nav-menu="mytree"/);
  // Triggers navigate nowhere by themselves (no href on the trigger path).
  assert.doesNotMatch(html, /<button[^>]*data-nav-menu="moments"[^>]*>[^<]*<\/button><a/);
  for (const group of ["Moment views", "Connection views", "My Tree views"]) {
    assert.match(html, new RegExp(`aria-label="${group}"`));
  }
  assert.equal(count(html, 'role="menu"'), 3);
  assert.equal(count(html, 'role="menuitem"'), 10);
});

test("route presentation: only resolved routes carry live hrefs", () => {
  // moment64 → /design-lab/lineages/64/v1-2-1 is the single live menu href.
  assert.match(html, /href="\/design-lab\/lineages\/64\/v1-2-1"/);
  assert.equal(
    count(html, 'href="/design-lab/lineages/64/v1-2-1"'),
    1,
    "exactly one resolved design-lab target",
  );

  // Every HOLD option is aria-disabled with a truthful hold marker.
  const holdRoutes = SOURCE_TRACK_47_ROUTES.filter((r) => r.classification === "HOLD_UNRESOLVED");
  assert.equal(holdRoutes.length, 9);
  for (const route of holdRoutes) {
    assert.match(
      html,
      new RegExp(`data-route-key="${route.key}"[^>]*data-route-hold="true"`),
      `${route.key} must render as HOLD`,
    );
  }
  assert.equal(count(html, 'data-route-hold="true"'), 10, "9 menu HOLD options + tree46 CTA");

  // firstMoment renders as mapping proof, not a canonical adoption link.
  assert.doesNotMatch(html, /href="\/v4"/);
  assert.match(componentText, /ROUTE MAPPING PROOF/);

  // No source-local path is ever promoted into an href.
  assert.doesNotMatch(html, /href="\.\.\//);
  assert.doesNotMatch(html, /href="file:/);
  assert.doesNotMatch(html, /window\.open/);
});

test("progress rail and mini controls carry the source controls", () => {
  assert.match(html, /role="slider"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="100"/);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /01<!-- --> \/ 05/);
  assert.match(html, /FIRST FEELING/);
  assert.match(html, /&gt;Play&lt;|>Play</);
  assert.match(html, /Muted/);
  assert.match(html, /AUTO_CINEMATIC/);
  assert.match(html, /5 KEYFRAME STILL MODE/);
  assert.match(html, /Play video/);
  // Not-canonical marker is always present on the candidate surface.
  assert.match(html, /T47 NATIVE CANDIDATE · NOT CANONICAL/);
});

test("fallback message (video-failed poster path) and demo composer render", () => {
  assert.match(html, /마음이 움직인 순간부터,/);
  assert.match(html, /LoveTree는 시작됩니다\./);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /입력은 서버에 저장되지 않습니다/);
  assert.match(html, /저장 기능은 연결하지 않았습니다/);
  for (const emotion of ["궁금해", "설레", "계속 생각나", "놀랐어"]) {
    assert.match(html, new RegExp(emotion));
  }
  assert.match(html, /maxLength="140"/);
});

test("component source holds the interaction contracts browser QA exercises", async () => {
  const source = componentText;
  // Menu open → first option focus (preventScroll, post-commit rAF).
  assert.match(source, /first-option/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  // Escape → close + trigger focus restore.
  assert.match(source, /navEscape/);
  // Outside pointerdown close.
  assert.match(source, /pointerdown/);
  assert.match(source, /navOutsidePointer/);
  // Wheel/touch/keys transfer authority from autoplay to the user.
  assert.match(source, /addEventListener\("wheel"/);
  assert.match(source, /touchstart/);
  assert.match(source, /ArrowDown/);
  // Scrub easing + rail seek + reduced-motion keyframes come from the model.
  assert.match(source, /scrubStep/);
  assert.match(source, /actForScrollRatio/);
  assert.match(source, /railSeek/);
  // Video failure path.
  assert.match(source, /failVideo/);
  // demoComposer parity hook.
  assert.match(source, /demoComposer/);
});

test("source runner retry re-runs verification (nonce-gated re-fetch, fail-closed)", () => {
  // Regression guard for the Re-verify control: it must bump a retry nonce
  // (not only reset state) so the verification effect actually re-fetches and
  // re-hashes the exact source; the iframe stays fail-closed until
  // verification reaches "ready".
  assert.match(runnerText, /setNonce\(\(n\) => n \+ 1\)/);
  assert.match(runnerText, /runner\.sourceAssetPath, nonce/);
});
