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

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

const V3_ROUTES = [
  "app/v3/page.tsx",
  "app/v3/trees/new/page.tsx",
  "app/v3/trees/demo/onboarding/source/page.tsx",
  "app/v3/trees/demo/onboarding/heart/page.tsx",
  "app/v3/trees/demo/onboarding/connect/page.tsx",
  "app/v3/trees/demo/page.tsx",
  "app/v3/my-trees/page.tsx",
  "app/v3/subjects/demo/page.tsx",
  "app/v3/community/page.tsx",
  "app/v3/community/trees/demo/page.tsx",
  "app/v3/trees/demo/celebrate/300/page.tsx",
  "app/v3/trees/[id]/page.tsx",
];

// 1. 모든 V3 route 파일 존재
test("all V3 route files exist", async () => {
  for (const route of V3_ROUTES) {
    assert.ok(await exists(route), `${route} must exist`);
  }
});

// 2. 모든 주요 navigation href 유효
test("V3 navigation links resolve to real routes", async () => {
  const header = await readApp("components/v3/V3Header.tsx");
  const navLinks = header.match(/href: "(\/v3[^"]*)"/g) ?? [];
  assert.ok(navLinks.length >= 3, "header must have nav links");
  for (const link of navLinks) {
    const href = link.replace(/href: "/, "").replace(/"$/, "");
    assert.ok(
      await exists(`app${href}/page.tsx`),
      `nav href ${href} must map to an existing route`,
    );
  }
});

// 3. 온보딩 흐름: source → heart → connect → tree
test("onboarding flow connects source -> heart -> connect -> tree", async () => {
  const source = await readApp("components/v3/V3SourceStep.tsx");
  const heart = await readApp("components/v3/V3HeartStep.tsx");
  const connect = await readApp("components/v3/V3ConnectStep.tsx");
  assert.match(source, /\/v3\/trees\/demo\/onboarding\/heart/);
  assert.match(source, /\/v3\/trees\/new/);
  assert.match(heart, /\/v3\/trees\/demo\/onboarding\/connect/);
  assert.match(heart, /\/v3\/trees\/demo\/onboarding\/source/);
  assert.match(connect, /\/v3\/trees\/demo/);
  assert.match(connect, /\/v3\/trees\/demo\/onboarding\/heart/);
});

// 4. 필수 여정 링크: landing, community, my-trees, subjects, milestone
test("canonical journeys are wired with real links", async () => {
  const landing = await readApp("components/v3/V3Landing.tsx");
  const myGarden = await readApp("components/v3/V3MyGarden.tsx");
  const subject = await readApp("components/v3/V3SubjectAlbums.tsx");
  const communityPreview = await readApp("components/v3/V3CommunityPreview.tsx");
  const milestone = await readApp("components/v3/V3Milestone.tsx");

  assert.match(landing, /\/v3\/trees\/new/);
  assert.match(landing, /\/v3\/community/);
  assert.match(myGarden, /\/v3\/trees\/new/);
  assert.match(myGarden, /\/v3\/subjects\/demo/);
  assert.match(myGarden, /\/v3\/trees\/\$\{tree\.id\}/);
  assert.match(subject, /\/v3\/trees\/\$\{treeId\}/);
  assert.match(communityPreview, /\/v3\/community\/trees\/\$\{tree\.id\}/);
  assert.match(milestone, /\/v3\/trees\/demo/);
});

// 5. 랜딩 → 커뮤니티 프리뷰 → 공개 트리
test("community preview links to public tree", async () => {
  const preview = await readApp("components/v3/V3CommunityPreview.tsx");
  assert.match(preview, /\/v3\/community\/trees\/\$\{tree\.id\}/);
  const publicTree = await readApp("components/v3/V3PublicTree.tsx");
  assert.match(publicTree, /\/v3\/community/);
});

// 6. 브라우저 뒤로가기/직접 접근 대비 — onboarding은 state로 이전 이동 가능
test("onboarding steps provide back navigation", async () => {
  const heart = await readApp("components/v3/V3HeartStep.tsx");
  assert.match(heart, /router\.push\("\/v3\/trees\/demo\/onboarding\/source"\)/);
  const connect = await readApp("components/v3/V3ConnectStep.tsx");
  assert.match(connect, /router\.push\("\/v3\/trees\/demo\/onboarding\/heart"\)/);
});

// 7. fixture 기반 동적 라우트 — 실제 URL이 존재해야 함
test("dynamic route file exists and renders from fixture", async () => {
  const dynamic = await readApp("v3/trees/[id]/page.tsx");
  assert.match(dynamic, /v3TreesById/);
  assert.match(dynamic, /notFound\(\)/);
});
