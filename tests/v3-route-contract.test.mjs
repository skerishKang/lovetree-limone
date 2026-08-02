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
  const accordion = await readApp("components/v3/V3AlbumAccordion.tsx");
  const communityPreview = await readApp("components/v3/V3CommunityPreview.tsx");
  const milestone = await readApp("components/v3/V3Milestone.tsx");

  assert.match(landing, /\/v3\/trees\/new/);
  assert.match(landing, /\/v3\/community/);
  assert.match(myGarden, /\/v3\/trees\/new/);
  assert.match(myGarden, /\/v3\/subjects\/demo/);
  assert.match(myGarden, /\/v3\/trees\/\$\{tree\.id\}/);
  assert.match(accordion, /\/v3\/trees\/\$\{subject\.treeIds\[0\]\}/);
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

// 8. 중복 DOM ID 없음 — h1 id와 input id는 분리돼야 함
test("onboarding steps do not reuse h1 id for inputs", async () => {
  const source = await readApp("components/v3/V3SourceStep.tsx");
  const connect = await readApp("components/v3/V3ConnectStep.tsx");
  const heart = await readApp("components/v3/V3HeartStep.tsx");

  for (const [name, sourceText] of [
    ["source", source],
    ["connect", connect],
    ["heart", heart],
  ]) {
    const ids = [...sourceText.matchAll(/\bid="(v3-[a-z-]+)"/g)].map((m) => m[1]);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(
      [...new Set(duplicates)],
      [],
      `${name} must not contain duplicate DOM ids: ${duplicates}`,
    );
  }
});

// 9. source step의 시점 검증 — runtime validation 함수 실행 (초 00-59, end-only, end<start 차단)
test("source step uses runtime interval validation", async () => {
  const source = await readApp("components/v3/V3SourceStep.tsx");
  assert.match(source, /validateSourceInterval/, "source step must call the runtime validator");
  const { parseTime, timeToSeconds, validateSourceInterval } = await import(
    "../app/components/v3/v3-validation.ts"
  );
  assert.deepEqual(parseTime("1:30"), { minutes: 1, seconds: 30 });
  assert.equal(parseTime("1:75"), null, "01:75 must be rejected");
  assert.equal(parseTime("999:00"), null, "minutes above two digits must be rejected");
  assert.equal(timeToSeconds({ minutes: 1, seconds: 30 }), 90);
  assert.equal(validateSourceInterval("1:75", "").valid, false, "invalid start rejected");
  assert.equal(validateSourceInterval("", "0:30").valid, false, "end-only rejected");
  assert.equal(validateSourceInterval("0:30", "").valid, true, "start-only allowed");
  assert.equal(
    validateSourceInterval("1:00", "0:30").valid,
    false,
    "end before start rejected",
  );
  assert.equal(validateSourceInterval("1:00", "1:30").valid, true, "valid interval passes");
});

// 10. connect step은 runtime validation으로 빈 다음 Moment와 blank custom relation을 차단
test("connect step uses runtime connect validation", async () => {
  const connect = await readApp("components/v3/V3ConnectStep.tsx");
  assert.match(connect, /validateConnectDraft/, "connect step must call the runtime validator");
  const { validateConnectDraft } = await import("../app/components/v3/v3-validation.ts");
  const presetOk = {
    nextUrl: "https://youtube.com/watch?v=nqofkzQD19E",
    nextTitle: "다음으로 이어진 무대",
    relationType: "follow-comment",
    relationLabel: "댓글을 따라갔어요",
  };
  assert.equal(validateConnectDraft({ ...presetOk, nextUrl: "" }).valid, false, "empty URL rejected");
  assert.equal(validateConnectDraft({ ...presetOk, nextTitle: "" }).valid, false, "empty title rejected");
  assert.equal(
    validateConnectDraft({ ...presetOk, nextUrl: "   " }).valid,
    false,
    "whitespace URL rejected",
  );
  assert.equal(validateConnectDraft(presetOk).valid, true, "valid preset connect passes");
  const customBlank = { ...presetOk, relationType: "custom", relationLabel: "" };
  const customSpace = { ...presetOk, relationType: "custom", relationLabel: "   " };
  const customPlaceholder = {
    ...presetOk,
    relationType: "custom",
    relationLabel: "이어진 이유를 직접 적어 보세요",
  };
  const customPresetLabel = { ...presetOk, relationType: "custom", relationLabel: "직접 입력" };
  assert.equal(validateConnectDraft(customBlank).valid, false, "blank custom relation rejected");
  assert.equal(validateConnectDraft(customSpace).valid, false, "whitespace custom relation rejected");
  assert.equal(validateConnectDraft(customPlaceholder).valid, false, "placeholder custom relation rejected");
  assert.equal(validateConnectDraft(customPresetLabel).valid, false, "preset label as custom value rejected");
  assert.equal(
    validateConnectDraft({ ...presetOk, relationType: "custom", relationLabel: "그날의 이유" }).valid,
    true,
    "real custom relation passes",
  );
});
