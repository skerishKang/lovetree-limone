import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

async function readRef(path) {
  return readFile(new URL(`reference/${path}`, root), "utf8");
}

// 1. the canonical archive surface exists
test("archive explorer and mode dock components exist", async () => {
  for (const file of [
    "V3ArchiveExplorer.tsx",
    "V3ArchiveModeDock.tsx",
    "V3AlbumStage.tsx",
    "V3AlbumFolding.tsx",
    "V3AlbumAccordion.tsx",
    "V3ShelfView.tsx",
    "V3VideoViewer.tsx",
  ]) {
    const content = await readApp(`components/v3/${file}`);
    assert.ok(content.length > 0, `${file} must exist`);
  }
});

// 2. primary mode dock exposes the three archive modes
test("mode dock exposes 순간 갤러리, 앨범 서가, 펼쳐보는 앨범", async () => {
  const dock = await readApp("components/v3/V3ArchiveModeDock.tsx");
  assert.match(dock, /ARCHIVE_VIEWS\.map/);
  assert.match(dock, /ARCHIVE_VIEW_LABELS\[item\]/);
  const state = await readApp("components/v3/v3-archive-state.ts");
  assert.match(state, /\["stage", "shelf", "folding"\] as const/);
  assert.match(state, /stage: "순간 갤러리"/);
  assert.match(state, /shelf: "앨범 서가"/);
  assert.match(state, /folding: "펼쳐보는 앨범"/);
});

// 3. stage exposes all five approved layouts including diagonal
test("stage exposes wave, orbit, free, diagonal, and vinyl layouts", async () => {
  const state = await readApp("components/v3/v3-archive-state.ts");
  assert.match(state, /\["wave", "orbit", "free", "diagonal", "vinyl"\] as const/);
  assert.match(state, /wave: "물결"/);
  assert.match(state, /orbit: "궤도"/);
  assert.match(state, /free: "자유 유영"/);
  assert.match(state, /diagonal: "대각선"/);
  assert.match(state, /vinyl: "비닐 케이스"/);
  const stage = await readApp("components/v3/V3AlbumStage.tsx");
  for (const layout of ["orbit", "free", "diagonal", "vinyl"]) {
    assert.match(stage, new RegExp(`"${layout}"`), `stage must handle ${layout}`);
  }
  assert.match(stage, /data-layout=\{layout\}/, "stage must key placement by layout");
});

// 4. viewer is shared and click-to-play
test("V3VideoViewer is click-to-play with start/end propagation", async () => {
  const viewer = await readApp("components/v3/V3VideoViewer.tsx");
  assert.match(viewer, /buildMemoryEmbedUrl/);
  assert.match(viewer, /setPlaying\(true\)/);
  assert.match(viewer, /aria-label=\{`\$\{memory\.title\} 재생`\}/);
});

// 5. explorer wires the URL-backed mode state
test("archive explorer wires URL-backed views and active-view-only rendering", async () => {
  const explorer = await readApp("components/v3/V3ArchiveExplorer.tsx");
  assert.match(explorer, /useSearchParams/);
  assert.match(explorer, /normalizeArchiveQuery/);
  assert.match(explorer, /serializeArchiveQuery/);
  assert.match(explorer, /view === "stage"/);
  assert.match(explorer, /view === "shelf"/);
  assert.match(explorer, /view === "folding"/);
  assert.match(explorer, /V3VideoViewer/);
});

// 6. motion archive fixture keeps emotion-only tags
test("motion archive fixture uses only emotional tags", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  const motion = fixtures.match(
    /export const v3MotionArchiveMemories: V3PreviewMemory\[\] = \[([\s\S]*?)\n\];/,
  )?.[1];
  assert.ok(motion, "motion archive fixture must exist");
  const tags = [...motion.matchAll(/emotionTags: \[([^\]]*)\]/g)].flatMap((m) =>
    [...m[1].matchAll(/"([^"]+)"/g)].map((t) => t[1]),
  );
  const forbidden = ["댓글 따라감", "팬의 추천", "같은 작품", "첫 발견", "직접 다시 검색했어요"];
  for (const label of forbidden) {
    assert.ok(!tags.includes(label), `emotionTags must not contain "${label}"`);
  }
});

// 7. product code blocks unsafe prototype elements
test("product archive code blocks unsafe prototype elements", async () => {
  const files = [
    "V3ArchiveExplorer.tsx",
    "V3ArchiveModeDock.tsx",
    "V3AlbumStage.tsx",
    "V3AlbumFolding.tsx",
    "V3AlbumAccordion.tsx",
    "V3ShelfView.tsx",
    "V3VideoViewer.tsx",
    "v3-archive-state.ts",
  ];
  for (const file of files) {
    const source = await readApp(`components/v3/${file}`);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/, `${file} must not use dangerouslySetInnerHTML`);
    assert.doesNotMatch(source, /data:image\//, `${file} must not embed base64 images`);
    assert.doesNotMatch(source, /scaleY\(-1\)/, `${file} must not mirror content`);
    assert.doesNotMatch(source, /reference\/v3\/sibling-prototypes/, `${file} must not iframe originals`);
  }
});

// 8. originals remain byte-preserved references
test("four motion-archive originals remain preserved references", async () => {
  const files = [
    "lovetree-liquid-orbit-video-gallery.html",
    "lovetree-motion-archive-v5-video-click-autoplay.html",
    "lovetree-accordion-album-archive-v3-fixed.html",
    "lovetree-folding-person-archive.html",
  ];
  for (const file of files) {
    const content = await readRef(`v3/sibling-prototypes/${file}`);
    assert.ok(content.length > 0, `${file} must be preserved`);
    assert.match(content, /<html/i);
  }
});
