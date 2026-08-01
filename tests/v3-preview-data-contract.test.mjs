import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

// 1. fixture에 preview label 존재
test("fixtures expose a V3 preview label", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  assert.match(fixtures, /V3_PREVIEW_LABEL/);
  assert.match(fixtures, /V3 예시 데이터/);
});

// 2. fixture가 localStorage나 실제 데이터처럼 표현되지 않음
test("fixtures do not use localStorage as source of truth", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  assert.doesNotMatch(fixtures, /localStorage/);
});

// 3. fixture 구조: 3개 이상 트리, 비공개 1, 공개 1, 12개 이상 순간
test("fixtures satisfy preview data contract", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  // 3개 이상 트리
  const treeObject = fixtures.match(/export const v3Trees: V3PreviewTree\[\] = \[([\s\S]*?)\n\];/)?.[1];
  const treeEntries = treeObject ? treeObject.split(/\n\s*\{/).length : 0;
  assert.ok(treeEntries >= 3, "must define at least 3 trees");

  const memoryObject = fixtures.match(
    /export const v3Memories: V3PreviewMemory\[\] = \[([\s\S]*?)\n\];/,
  )?.[1];
  const memoryEntries = memoryObject ? memoryObject.split(/\n\s*\{/).length : 0;
  assert.ok(memoryEntries >= 12, "must define at least 12 moments");
});

// 4. 비공개 트리와 공개 트리가 존재
test("fixtures contain at least one private and one public tree", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  const privateTrees = fixtures.match(/visibility: "private"/g) ?? [];
  const publicTrees = fixtures.match(/visibility: "public"/g) ?? [];
  assert.ok(privateTrees.length >= 1, "at least one private tree");
  assert.ok(publicTrees.length >= 1, "at least one public tree");
});

// 5. 화면에 V3 예시 데이터 라벨이 노출됨
test("V3 screens render the V3 preview badge", async () => {
  const header = await readApp("components/v3/V3Header.tsx");
  assert.match(header, /V3 예시 데이터/);
  const badge = await readApp("components/v3/V3PreviewBadge.tsx");
  assert.match(badge, /V3 예시 데이터/);
});

// 6. public tree 화면에 편집 control 없음
test("V3 public tree screen has no edit controls", async () => {
  const publicTree = await readApp("components/v3/V3PublicTree.tsx");
  assert.match(publicTree, /읽기 전용/);
  assert.match(publicTree, /편집 버튼이 없어요/);
  // 편집 관련 문구는 존재하지 않아야 함 (편집 불가 안내는 제외)
  assert.doesNotMatch(publicTree, /배치 편집/);
  assert.doesNotMatch(publicTree, /새 순간 추가/);
});

// 7. milestone 네 테마 존재
test("milestone defines four themes", async () => {
  const milestone = await readApp("components/v3/V3Milestone.tsx");
  assert.match(milestone, /완성 트리/);
  assert.match(milestone, /오로라 하트/);
  assert.match(milestone, /무지개 수관/);
  assert.match(milestone, /마음꽃/);
});

// 8. icon-only button에 aria-label 존재
test("icon-only buttons carry aria-labels", async () => {
  const workspace = await readApp("components/v3/V3TreeWorkspace.tsx");
  assert.match(workspace, /aria-label="전체 화면으로 열기"/);
  const fullscreen = await readApp("components/v3/V3FullscreenDrawer.tsx");
  assert.match(fullscreen, /aria-label="드로어 닫기"/);
  const milestone = await readApp("components/v3/V3Milestone.tsx");
  assert.match(milestone, /aria-label={isPlaying/);
});

// 9. unsafe external URL 실행 없음
test("no unsafe script execution in V3 components", async () => {
  const components = [
    "V3Landing.tsx",
    "V3SourceStep.tsx",
    "V3HeartStep.tsx",
    "V3ConnectStep.tsx",
    "V3TreeWorkspace.tsx",
    "V3PublicTree.tsx",
  ];
  for (const file of components) {
    const source = await readApp(`components/v3/${file}`);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/, `${file} must not use dangerouslySetInnerHTML`);
    assert.doesNotMatch(source, /eval\(/, `${file} must not call eval`);
  }
});

// 10. V3 화면은 자체 라벨로 예시 데이터임을 표시
test("workspace and community screens display the preview notice", async () => {
  const workspace = await readApp("components/v3/V3TreeWorkspace.tsx");
  assert.match(workspace, /V3 예시 데이터/);
  const community = await readApp("components/v3/V3Community.tsx");
  assert.match(community, /V3 예시 데이터/);
  const subject = await readApp("components/v3/V3SubjectAlbums.tsx");
  assert.match(subject, /V3 예시 데이터/);
});

// 11. 실존 인물 개인정보 없음 — fixture는 일반화된 예시명만 사용
test("fixtures use only generalized example names", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  assert.doesNotMatch(fixtures, /주연/);
  assert.doesNotMatch(fixtures, /이주연/);
  assert.match(fixtures, /예시 인물/);
});

// 12. emotionTags는 감정 상태만 포함 (관계/탐색 라벨 제외)
test("fixture emotionTags contain only emotional states", async () => {
  const fixtures = await readApp("components/v3/fixtures/v3-fixtures.ts");
  const memoryObject = fixtures.match(
    /export const v3Memories: V3PreviewMemory\[\] = \[([\s\S]*?)\n\];/,
  )?.[1];
  assert.ok(memoryObject, "memories fixture must exist");
  // emotionTags 배열 값만 추출
  const emotionTags = [
    ...memoryObject.matchAll(/emotionTags: \[([^\]]*)\]/g),
  ].flatMap((m) =>
    [...m[1].matchAll(/"([^"]+)"/g)].map((tag) => tag[1]),
  );
  assert.ok(emotionTags.length >= 12, "must have many emotion tags");
  const forbidden = [
    "첫 발견",
    "댓글 따라감",
    "팬의 추천",
    "다시 보기",
    "같은 작품",
    "라이브",
    "음원",
    "직캠",
    "풀버전",
    "앵콜",
    "리마스터",
    "책",
    "인터뷰",
    "회고",
  ];
  for (const label of forbidden) {
    assert.ok(
      !emotionTags.includes(label),
      `emotionTags must not contain "${label}" (relation/discovery label)`,
    );
  }
});

// 13. heart step 태그 프리셋은 감정 상태만 사용
test("heart step tag presets are emotional states", async () => {
  const heart = await readApp("components/v3/V3HeartStep.tsx");
  assert.match(heart, /두근거림/);
  assert.match(heart, /벅참/);
  assert.doesNotMatch(heart, /댓글 따라감/);
  assert.doesNotMatch(heart, /팬의 추천/);
});
