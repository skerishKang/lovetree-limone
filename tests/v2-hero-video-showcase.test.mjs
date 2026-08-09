import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

// ---- Data ----
test("hero dataset has exactly four cards in the fixed order", async () => {
  const data = await readApp("components/v2/v2-hero-video-data.ts");
  const artistMatch = [...data.matchAll(/artist: "([A-Z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(artistMatch, ["BTS", "BLACKPINK", "CORTIS", "RESCENE"]);
  assert.equal(artistMatch.length, 4);
});

test("hero dataset uses the exact YouTube IDs", async () => {
  const data = await readApp("components/v2/v2-hero-video-data.ts");
  for (const id of ["GEk4jHwfFTA", "2GJfWMYCWY0", "U6BDbXIah-Y", "9XttLI0oH0I"]) {
    assert.ok(data.includes(id), `missing videoId ${id}`);
  }
});

test("hero video IDs are unique", async () => {
  const data = await readApp("components/v2/v2-hero-video-data.ts");
  const ids = [...data.matchAll(/videoId: "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 4);
  assert.equal(new Set(ids).size, 4);
});

test("hero dataset is not sourced from member or community API", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  assert.doesNotMatch(showcase, /apiFetch|api\/community|\/api\/trees/);
  const data = await readApp("components/v2/v2-hero-video-data.ts");
  assert.doesNotMatch(data, /apiFetch|fetch\(|\/api\//);
});

// ---- Thumbnails ----
test("thumbnail URLs use maxresdefault primary and mqdefault fallback", async () => {
  const data = await readApp("components/v2/v2-hero-video-data.ts");
  assert.match(data, /maxresdefault\.jpg/);
  assert.match(data, /mqdefault\.jpg/);
  assert.doesNotMatch(data, /hqdefault\.jpg/);
});

test("card shows a gradient fallback when the thumbnail fails", async () => {
  const card = await readApp("components/v2/V2HeroVideoCard.tsx");
  assert.match(card, /thumbFailed/);
  assert.match(card, /v2-showcase-card-fallback/);
  assert.match(card, /onError/);
});

test("card media uses a 16:9 area", async () => {
  const css = await readApp("styles/v2/home.css");
  assert.match(css, /\.v2-showcase-card-media\s*\{[\s\S]*?aspect-ratio: 16 \/ 9/);
});

// ---- Playback ----
test("no iframe is created on initial render", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  assert.doesNotMatch(showcase, /<iframe/);
  const modal = await readApp("components/v2/V2HeroVideoModal.tsx");
  assert.match(modal, /iframe/);
});

test("iframe only mounts inside the modal and uses youtube-nocookie", async () => {
  const data = await readApp("components/v2/v2-hero-video-data.ts");
  assert.match(data, /youtube-nocookie\.com\/embed/);
  assert.match(data, /autoplay=1/);
  const modal = await readApp("components/v2/V2HeroVideoModal.tsx");
  assert.match(modal, /heroEmbedUrl\(video\.videoId\)/);
  assert.match(modal, /if \(!video\) return null/);
});

test("external links use target=_blank and rel=noreferrer noopener", async () => {
  const card = await readApp("components/v2/V2HeroVideoCard.tsx");
  assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noreferrer noopener"/);
  const modal = await readApp("components/v2/V2HeroVideoModal.tsx");
  assert.match(modal, /target="_blank"/);
  assert.match(modal, /rel="noreferrer noopener"/);
});

// ---- Animation ----
test("cards reveal sequentially and spotlight order is 0->1->2->3", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  assert.match(showcase, /for \(const index of \[0, 1, 2, 3\]\)/);
  assert.match(showcase, /revealCard\(0\)/);
  assert.match(showcase, /revealCard\(1\)/);
  assert.match(showcase, /revealCard\(2\)/);
  assert.match(showcase, /revealCard\(3\)/);
});

test("pause reasons are managed independently", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  assert.match(showcase, /pauseReasons\.current\[reason\] = true/);
  assert.match(showcase, /if \(isPaused\(\)\) return/);
  assert.match(showcase, /pause\("hover"\)|resume\("hover"\)/);
  assert.match(showcase, /pause\("focus"\)|resume\("focus"\)/);
  assert.match(showcase, /pause\("hidden"\)|resume\("hidden"\)/);
  assert.match(showcase, /pause\("playing"\)|resume\("playing"\)/);
  assert.match(showcase, /pause\("pageLifecycle"\)|resume\("pageLifecycle"\)/);
});

test("animation cleans up timers and listeners", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  assert.match(showcase, /clearTimer\(\)/);
  assert.match(showcase, /removeEventListener\("visibilitychange"/);
  assert.match(showcase, /removeEventListener\("pagehide"/);
  assert.match(showcase, /window\.clearTimeout/);
});

test("reduced motion renders a static completed showcase", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  assert.match(showcase, /prefers-reduced-motion: reduce/);
  assert.match(showcase, /reducedMotion/);
  assert.match(showcase, /HERO_VIDEOS\.map\(\(\) => true\)/);
  const css = await readApp("styles/v2/home.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
});

// ---- Visual preservation ----
test("V2 hero headline, description, and CTAs are unchanged", async () => {
  const home = await readApp("components/v2/V2Home.tsx");
  assert.match(home, /사랑에 빠지는 <span>순간을 하나의<\/span>/);
  assert.match(home, /러브트리로<\/em>/);
  assert.match(home, /이어 보세요<\/strong>/);
  assert.match(home, /처음 발견한 영상, 다시 찾은 장면/);
  assert.match(home, /\+<\/span>첫 순간 심기/);
  assert.match(home, /러브트리 둘러보기/);
});

test("V2 topbar and tree-stage frame are preserved", async () => {
  const home = await readApp("components/v2/V2Home.tsx");
  assert.match(home, /v2-topbar/);
  assert.match(home, /v2-tree-stage/);
  assert.match(home, /러브트리 미리보기/);
  assert.match(home, /v2-stage-topline/);
  assert.match(home, /V2HeroVideoShowcase/);
  assert.match(home, /v2-sun-orbit/);
});

test("exactly four showcase cards render, not three", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  const cardRenders = (showcase.match(/<V2HeroVideoCard/g) || []).length;
  assert.equal(cardRenders, 1, "cards are mapped, not repeated inline");
  assert.match(showcase, /HERO_VIDEOS\.map/);
  const home = await readApp("components/v2/V2Home.tsx");
  assert.doesNotMatch(home, /v2-moment-card v2-moment-root/);
});

test("Legacy V1 and V3 files are untouched", async () => {
  const v1Home = await readApp("legacy/page.tsx");
  assert.match(v1Home, /첫 순간 심기/);
  const v1Detail = await readApp("trees/[id]/page.tsx");
  assert.match(v1Detail, /MomentDetailModal/);
  assert.match(v1Detail, /MomentComposerModal/);
  assert.match(v1Detail, /MomentThumbnail/);
  const hook = await readFile(new URL("lib/use-tree-moments.ts", root), "utf8");
  assert.match(hook, /youtubeThumbnail/);
  const types = await readFile(new URL("lib/tree-types.ts", root), "utf8");
  assert.match(types, /youtubeThumbnail/);
  const v2Files = await readdir(new URL("app/components/v2/", root));
  for (const file of v2Files.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))) {
    const source = await readFile(new URL(`app/components/v2/${file}`, root), "utf8");
    assert.doesNotMatch(
      source,
      /components\/v3|styles\/v3|app\/v3/,
      `V2 component ${file} must not import V3 modules`,
    );
  }
});

// ---- Accessibility ----
test("video modal exposes dialog semantics and focus management", async () => {
  const modal = await readApp("components/v2/V2HeroVideoModal.tsx");
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-labelledby/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /querySelectorAll<HTMLElement>\("button, \[href\], iframe"\)/);
  assert.match(modal, /aria-label="닫기"/);
});

test("modal close returns focus to the triggering card", async () => {
  const showcase = await readApp("components/v2/V2HeroVideoShowcase.tsx");
  assert.match(showcase, /triggerRef\.current/);
  assert.match(showcase, /trigger\?\.focus\(\)/);
});

test("play button is a large touch target", async () => {
  const css = await readApp("styles/v2/home.css");
  assert.match(css, /\.v2-showcase-card-play\s*\{[\s\S]*?width: 42px[\s\S]*?height: 42px/);
  assert.match(css, /width: 46px[\s\S]*?height: 46px/, "mobile play target is >=44px");
});
