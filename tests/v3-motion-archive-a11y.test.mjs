import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readCss(file) {
  return readFile(new URL(`app/styles/v3/${file}`, root), "utf8");
}

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

// 1. visible focus styles exist for archive interaction surfaces
test("archive surfaces provide visible focus styles", async () => {
  const albums = await readCss("albums.css");
  const views = await readCss("views.css");
  const shell = await readCss("shell.css");
  assert.match(albums, /\.v3-shelf-book:focus-visible/, "shelf books must show visible focus");
  assert.match(albums, /\.v3-folding-book:focus-visible/, "folding book must show visible focus");
  assert.match(views, /\.v3-album-stage:focus-visible/, "stage must show visible focus");
  assert.match(views, /\.v3-video-poster:focus-visible/, "viewer play button must show focus");
  assert.match(shell, /\.v3-btn:focus-visible/, "buttons must show visible focus");
});

// 2. the video viewer is a labeled dialog
test("video viewer is a labeled modal dialog", async () => {
  const viewer = await readApp("components/v3/V3VideoViewer.tsx");
  assert.match(viewer, /role="dialog"/);
  assert.match(viewer, /aria-modal="true"/);
  assert.match(viewer, /aria-labelledby=\{titleId\}/);
  assert.match(viewer, /id=\{titleId\}/, "dialog title must be linked by id");
  assert.match(viewer, /tabIndex={-1}/, "dialog must be focusable programmatically");
});

// 3. Escape closes the viewer and focus returns to the trigger
test("viewer implements Escape close and focus return", async () => {
  const viewer = await readApp("components/v3/V3VideoViewer.tsx");
  assert.match(viewer, /event\.key === "Escape"/, "Escape must close the viewer");
  assert.match(viewer, /previousFocus\?\.focus\(\)/, "focus must return to the trigger");
  assert.match(viewer, /event\.key !== "Tab"/, "viewer must implement a Tab focus trap");
  assert.match(viewer, /focusables\[focusables\.length - 1\]/, "viewer must trap the last element");
});

// 4. the viewer iframe only appears after explicit user action
test("viewer iframe only renders after an explicit user action", async () => {
  const viewer = await readApp("components/v3/V3VideoViewer.tsx");
  assert.match(viewer, /setPlaying\(true\)/, "iframe must mount on explicit play click");
  assert.match(viewer, /playing && embeddable \?/, "iframe must be conditional on playing");
  assert.doesNotMatch(viewer, /autoplay/, "viewer must not force autoplay behavior");
});

// 5. reduced motion covers stage, shelf, and folding transitions
test("reduced-motion CSS exists for stage, shelf, and folding transitions", async () => {
  const responsive = await readCss("responsive.css");
  assert.match(responsive, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(responsive, /\.v3-album-stage-card/, "stage transitions reduced");
  assert.match(responsive, /\.v3-shelf-book/, "shelf transitions reduced");
  assert.match(responsive, /\.v3-folding-page/, "folding page-turn reduced");
  assert.match(
    responsive,
    /animation: none !important/,
    "folding animation removed under reduced motion",
  );
});

// 6. keyboard and explicit controls exist for the folding view
test("folding view provides keyboard and explicit controls", async () => {
  const folding = await readApp("components/v3/V3AlbumFolding.tsx");
  assert.match(folding, /event\.key === "ArrowLeft"/, "ArrowLeft navigates folding");
  assert.match(folding, /event\.key === "ArrowRight"/, "ArrowRight navigates folding");
  assert.match(folding, /aria-label="이전 페이지"/, "explicit previous button");
  assert.match(folding, /aria-label="다음 페이지"/, "explicit next button");
  assert.doesNotMatch(folding, /scaleY\(-1\)/, "folding must not mirror text");
});

// 7. no nested dialogs: viewer is the single dialog and is never stacked
test("archive viewer is not nested inside another dialog", async () => {
  const viewer = await readApp("components/v3/V3VideoViewer.tsx");
  assert.doesNotMatch(viewer, /V3FullscreenDrawer/, "viewer must not embed the fullscreen drawer");
  assert.doesNotMatch(viewer, /V3MomentComposer/, "viewer must not embed the composer");
  const explorer = await readApp("components/v3/V3ArchiveExplorer.tsx");
  const dialogCount = (explorer.match(/role="dialog"/g) ?? []).length;
  assert.ok(dialogCount <= 1, "explorer should render at most one dialog at a time");
});
