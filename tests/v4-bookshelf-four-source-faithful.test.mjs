import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

const ROUTES = [
  "app/v4/subjects/bookshelf/v1/page.tsx",
  "app/v4/subjects/bookshelf/v2-1/page.tsx",
  "app/v4/subjects/bookshelf/v2-3d/page.tsx",
  "app/v4/subjects/bookshelf/v2a-2/page.tsx",
];

const COMPONENTS = [
  "app/components/v4/V4BookShelfV1.tsx",
  "app/components/v4/V4BookShelfV2P1.tsx",
  "app/components/v4/V4BookShelfV2D3.tsx",
  "app/components/v4/V4BookShelfV2A2.tsx",
];

const CSS_FILES = [
  "app/styles/v4/bookshelf-v1.css",
  "app/styles/v4/bookshelf-v2-1.css",
  "app/styles/v4/bookshelf-v2-3d.css",
  "app/styles/v4/bookshelf-v2a-2.css",
];

const SOURCES = [
  "lovetree-people-book-shelf-v1.html",
  "lovetree-people-book-shelf-v2-1-true-page-motion.html",
  "lovetree-people-book-shelf-v2-3d.html",
  "lovetree-people-book-shelf-v2a-2-interaction-stable.html",
];

test("source HTML files exist in the sample folder", async () => {
  for (const source of SOURCES) {
    assert.ok(await exists(`[샘플]/${source}`), `[샘플]/${source} must exist`);
  }
});

const PROTECTED_IMPORTS = [
  "components/v3",
  "styles/v3",
  "V3Album",
  "V3Stage",
  "components/v2",
  "V2Album",
  "server/",
  "lib/db",
  "drizzle",
];

test("four bookshelf routes exist", async () => {
  for (const path of ROUTES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("four bookshelf components exist", async () => {
  for (const path of COMPONENTS) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("four bookshelf CSS files are separated per screen", async () => {
  for (const path of CSS_FILES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("every component names its exact source HTML", async () => {
  const pairs = [
    ["V4BookShelfV1.tsx", "lovetree-people-book-shelf-v1.html"],
    ["V4BookShelfV2P1.tsx", "lovetree-people-book-shelf-v2-1-true-page-motion.html"],
    ["V4BookShelfV2D3.tsx", "lovetree-people-book-shelf-v2-3d.html"],
    ["V4BookShelfV2A2.tsx", "lovetree-people-book-shelf-v2a-2-interaction-stable.html"],
  ];
  for (const [component, source] of pairs) {
    const code = await read(`app/components/v4/${component}`);
    assert.match(code, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${component} must name ${source}`);
  }
});

test("every route imports its own component and CSS", async () => {
  const pairs = [
    ["app/v4/subjects/bookshelf/v1/page.tsx", "V4BookShelfV1", "bookshelf-v1.css"],
    ["app/v4/subjects/bookshelf/v2-1/page.tsx", "V4BookShelfV2P1", "bookshelf-v2-1.css"],
    ["app/v4/subjects/bookshelf/v2-3d/page.tsx", "V4BookShelfV2D3", "bookshelf-v2-3d.css"],
    ["app/v4/subjects/bookshelf/v2a-2/page.tsx", "V4BookShelfV2A2", "bookshelf-v2a-2.css"],
  ];
  for (const [route, component, css] of pairs) {
    const source = await read(route);
    assert.match(source, new RegExp(component), `${route} must import ${component}`);
    assert.match(source, new RegExp(css), `${route} must import ${css}`);
  }
});

test("no screen depends on an existing V4 component as a shortcut", async () => {
  for (const path of COMPONENTS) {
    const source = await read(path);
    for (const dependency of PROTECTED_IMPORTS) {
      assert.doesNotMatch(source, new RegExp(dependency), `${path} must not import ${dependency}`);
    }
  }
});

test("no source or page-wrapper iframe is used as delivery", async () => {
  for (const path of COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /src=\{.*\.html|srcdoc=|<iframe[^>]*src=["'](?!https:\/\/www\.youtube)/, `${path} must not wrap HTML sources or same-origin pages in iframes`);
  }
});

test("youtube iframes carry title and allow attributes", async () => {
  const files = COMPONENTS.slice(0, 3);
  for (const path of files) {
    const source = await read(path);
    if (/<iframe/.test(source)) {
      assert.match(source, /<iframe[^>]*\btitle=/, `${path} iframe must carry title`);
      assert.match(source, /<iframe[^>]*\ballow=/, `${path} iframe must carry allow`);
      assert.match(source, /<iframe[^>]*allowFullScreen/, `${path} iframe must carry allowFullScreen`);
    }
  }
});

test("v1 preserves search, filter, chapter tree, video modal, new book and storage", async () => {
  const v1 = await read("app/components/v4/V4BookShelfV1.tsx");
  assert.match(v1, /query|setQuery/);
  assert.match(v1, /setFilter/);
  assert.match(v1, /bsv1-chapter-tree/);
  assert.match(v1, /setModal\("video"\)|openVideo/);
  assert.match(v1, /setModal\("new"\)|submitNewBook/);
  assert.match(v1, /lovetree-people-book-shelf-v1/);
  assert.match(v1, /localStorage\.(getItem|setItem)/);
  assert.match(v1, /youtube\.com\/embed/);
});

test("v2-1 preserves carousel, flight, ten strips, drag progress and underPage", async () => {
  const v2p1 = await read("app/components/v4/V4BookShelfV2P1.tsx");
  assert.match(v2p1, /updateCarousel|book-card|--x|--z|--rot/);
  assert.match(v2p1, /openReader|animateSharedBook|transfer-book|is-leaving/);
  assert.match(v2p1, /STRIPS/);
  assert.match(v2p1, /curl-strips|bsv21-curl/);
  assert.match(v2p1, /openProgress|dragRef|setPointerCapture/);
  assert.match(v2p1, /under-page|underPage/);
  assert.match(v2p1, /lovetree-people-book-shelf-v2-1-true-page-motion/);
});

test("v2-3d preserves horizontal shelf, cover open, keyframe flip and internal video", async () => {
  const v2d3 = await read("app/components/v4/V4BookShelfV2D3.tsx");
  assert.match(v2d3, /scrollBy|overscroll|shelf-rail/);
  assert.match(v2d3, /bsv23-book-cover-face|rotateY\(-164deg\)|-164deg/);
  assert.match(v2d3, /turn-next|turn-prev|page-next|page-prev/);
  assert.match(v2d3, /youtube\.com\/embed/);
  assert.match(v2d3, /lovetree-people-book-shelf-v2-3d/);
});

test("v2a-2 preserves explicit state machine, segmented page, corner drag, theme and pointer cancel", async () => {
  const v2a2 = await read("app/components/v4/V4BookShelfV2A2.tsx");
  assert.match(v2a2, /SHELF|FOCUSING|FOCUSED|OPENING|OPEN|FLIPPING|CLOSING|RETURNING/);
  assert.match(v2a2, /flip-segment|segments|segmented/);
  assert.match(v2a2, /handleCornerDown|handleCornerMove|handleCornerUp|page-corner/);
  assert.match(v2a2, /--theme-bg-1|setProperty\("--theme|bg1|accent/);
  assert.match(v2a2, /handleCornerCancel|pointercancel|onPointerCancel/);
  assert.match(v2a2, /lovetree-people-book-shelf-v2a-2-interaction-stable/);
});

test("all four screens keep full source data counts (7 books, 35 chapters)", async () => {
  for (const path of COMPONENTS.slice(0, 3)) {
    const source = await read(path);
    const names = ["juyeon", "plave", "lee-junhyuk", "lee-junyoung", "nicholas", "cooper", "hudson"];
    for (const name of names) {
      assert.match(source, new RegExp(`id: "${name}"`), `${path} must keep source person ${name}`);
    }
  }
  const v2a2 = await read("app/components/v4/V4BookShelfV2A2.tsx");
  for (const name of ["juyeon", "plave", "hudson"]) {
    assert.match(v2a2, new RegExp(`id: "${name}"`), `V2A-2 must keep source person ${name}`);
  }
});

test("components do not import the protected central registry files", async () => {
  for (const path of COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /v4-source-manifest|v4-implemented-sources|v4-source-registry|V4JourneyDock|V4Landing/, `${path} must not import central registry files`);
  }
});
