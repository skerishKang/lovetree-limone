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

// 1. 원본 4개 보존
test("four motion-archive originals are preserved under reference/v3/sibling-prototypes", async () => {
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

// 2. 새 컴포넌트 존재
test("motion-archive components exist", async () => {
  for (const file of [
    "V3VideoViewer.tsx",
    "V3AlbumStage.tsx",
    "V3AlbumAccordion.tsx",
  ]) {
    const content = await readApp(`components/v3/${file}`);
    assert.ok(content.length > 0, `${file} must exist`);
  }
});

// 3. shared viewer: click-to-play, start/end 시점
test("V3VideoViewer uses click-to-play with start/end timestamps", async () => {
  const viewer = await readApp("components/v3/V3VideoViewer.tsx");
  assert.match(viewer, /youtube-nocookie\.com\/embed/);
  assert.match(viewer, /memory\.startSeconds/);
  assert.match(viewer, /playsinline=1/);
  assert.match(viewer, /setPlaying\(true\)/);
  assert.match(viewer, /aria-label=.*재생/);
});

// 4. stage: 물결/궤도/사선 3모드
test("V3AlbumStage provides wave/orbit/cascade modes", async () => {
  const stage = await readApp("components/v3/V3AlbumStage.tsx");
  assert.match(stage, /"wave"/);
  assert.match(stage, /"orbit"/);
  assert.match(stage, /"cascade"/);
  assert.match(stage, /V3VideoViewer/);
});

// 5. accordion은 공통 viewer 재사용
test("V3AlbumAccordion reuses V3VideoViewer", async () => {
  const accordion = await readApp("components/v3/V3AlbumAccordion.tsx");
  assert.match(accordion, /V3VideoViewer/);
  assert.match(accordion, /aria-pressed=\{openIndex === index\}/);
});

// 6. V3SubjectAlbums에 모션 아카이브 모드 연결
test("V3SubjectAlbums wires motion-archive mode and accordion", async () => {
  const subject = await readApp("components/v3/V3SubjectAlbums.tsx");
  assert.match(subject, /view === "motion"/);
  assert.match(subject, /모션 아카이브/);
  assert.match(subject, /V3AlbumStage/);
  assert.match(subject, /V3AlbumAccordion/);
});

// 7. 모션 아카이브 fixture는 감정 상태 태그만 사용
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

// 8. 원본이 아닌 합성 데이터에 placeholder video id가 없어야 함
test("motion archive fixture avoids placeholder video IDs", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  const motion = fixtures.match(
    /export const v3MotionArchiveMemories: V3PreviewMemory\[\] = \[([\s\S]*?)\n\];/,
  )?.[1];
  assert.ok(motion);
  for (const id of ["dQw4w9WgXcQ", "9bZkp7q19f0"]) {
    assert.ok(!motion.includes(id), `must not use placeholder video id ${id}`);
  }
});
