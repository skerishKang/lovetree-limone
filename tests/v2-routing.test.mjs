import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

async function exists(path) {
  try { await stat(new URL(path, root)); return true; } catch { return false; }
}

// 1. Legacy V1 홈은 /legacy에 보존되고 나머지 V1 기능 라우트는 유지됨
test("Legacy V1 home exists at /legacy", async () => {
  const page = await readApp("legacy/page.tsx");
  assert.match(page, /"use client"/);
  assert.match(page, /useAuth/);
  assert.match(page, /apiFetch/);
});

test("V1 routes unchanged: my-trees page exists", async () => {
  const page = await readApp("my-trees/page.tsx");
  assert.match(page, /"use client"/);
  assert.match(page, /useAuth/);
  assert.match(page, /apiFetch/);
});

test("V1 routes unchanged: tree detail page exists", async () => {
  const page = await readApp("trees/[id]/page.tsx");
  assert.match(page, /"use client"/);
  assert.match(page, /useAuth/);
  assert.match(page, /useTreeMoments/);
  const hook = await readFile(new URL("lib/use-tree-moments.ts", root), "utf8");
  assert.match(hook, /apiFetch/);
});

test("V1 layout unchanged with AuthProvider", async () => {
  const layout = await readApp("layout.tsx");
  assert.match(layout, /AuthProvider/);
  assert.match(layout, /@\/lib\/auth/);
  assert.match(layout, /globals\.css/);
  assert.match(layout, /flow\.css/);
  assert.match(layout, /tree-pages\.css/);
});

// 2. V2 라우트가 존재함
test("V2 home route exists at /v2", async () => {
  const page = await readApp("v2/page.tsx");
  assert.match(page, /"use client"/);
  assert.match(page, /AuthProvider/);
  assert.match(page, /V2Home/);
});

test("V2 my-trees route exists at /v2/my-trees", async () => {
  const page = await readApp("v2/my-trees/page.tsx");
  assert.match(page, /"use client"/);
  assert.match(page, /AuthProvider/);
  assert.match(page, /V2MyTrees/);
});

test("V2 tree detail route exists at /v2/trees/:id", async () => {
  const page = await readApp("v2/trees/[id]/page.tsx");
  assert.match(page, /"use client"/);
  assert.match(page, /AuthProvider/);
  assert.match(page, /V2TreeDetail/);
});

test("V2 community route exists at /v2/community", async () => {
  const page = await readApp("v2/community/page.tsx");
  assert.match(page, /"use client"/);
  assert.match(page, /AuthProvider/);
  assert.match(page, /V2CommunityView/);
});

// 3. V2 UI가 공통 Firebase auth 사용
test("V2 home uses shared auth from lib/auth", async () => {
  const page = await readFile(new URL("app/components/v2/V2Home.tsx", root), "utf8");
  assert.match(page, /@\/lib\/auth/);
  assert.match(page, /useAuth/);
  assert.match(page, /login/);
  assert.match(page, /logout/);
});

test("V2 my-trees uses shared auth from lib/auth", async () => {
  const page = await readFile(new URL("app/components/v2/V2MyTrees.tsx", root), "utf8");
  assert.match(page, /@\/lib\/auth/);
  assert.match(page, /useAuth/);
});

test("V2 tree detail uses shared auth from lib/auth", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /@\/lib\/auth/);
  assert.match(page, /useAuth/);
});

test("V2 tree create flow uses shared auth", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeCreateFlow.tsx", root), "utf8");
  assert.match(page, /@\/lib\/auth/);
  assert.match(page, /useAuth/);
});

test("V2 community uses shared API client", async () => {
  const page = await readFile(new URL("app/components/v2/V2CommunityView.tsx", root), "utf8");
  assert.match(page, /@\/lib\/api/);
  assert.match(page, /apiFetch/);
});

// 4. V2 tree 생성 - 실제 API 사용
test("V2 tree create flow calls real API POST /api/trees", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeCreateFlow.tsx", root), "utf8");
  assert.match(page, /apiFetch\(["'`]/);
  assert.match(page, /\/api\/trees/);
  assert.match(page, /method:\s*"POST"/);
  assert.match(page, /clientKey/);
  assert.match(page, /title/);
});

// 5. V2 첫 memory 생성 - 실제 API 사용
test("V2 tree detail calls real memory API", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /apiFetch/);
  assert.match(page, /\/api\/trees\/.*memories/);
  assert.match(page, /method:\s*isEditing \? "PUT" : "POST"/);
  assert.match(page, /clientKey/);
});

// 6. V2 my-trees 목록 - 실제 API 사용
test("V2 my-trees calls real API GET /api/trees", async () => {
  const page = await readFile(new URL("app/components/v2/V2MyTrees.tsx", root), "utf8");
  assert.match(page, /apiFetch\(["'`]/);
  assert.match(page, /\/api\/trees/);
});

// 7. V2 tree 상세 - 실제 API 사용
test("V2 tree detail calls real API GET /api/trees/:id", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /apiFetch\([`]/);
  assert.match(page, /\/api\/trees\/\$\{.*\}/);
});

// 8. V2 memory 수정 - 실제 API 사용
test("V2 tree detail supports memory edit via PUT /api/memories/:id", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /method:\s*"PUT"/);
  assert.match(page, /\/api\/memories/);
});

// 9. V2 memory 삭제 - 실제 API 사용
test("V2 tree detail supports memory delete via DELETE /api/memories/:id", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /method:\s*"DELETE"/);
  assert.match(page, /\/api\/memories/);
});

// 10. V2 공개/비공개 설정
test("V2 tree detail supports visibility toggle via PUT /api/trees/:id", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /toggleVisibility/);
  assert.match(page, /method:\s*"PUT"/);
  assert.match(page, /visibility/);
});

// 11. V2 공개 둘러보기 - 실제 API 사용
test("V2 community calls real API GET /api/community/trees", async () => {
  const page = await readFile(new URL("app/components/v2/V2CommunityView.tsx", root), "utf8");
  assert.match(page, /\/api\/community\/trees/);
});

// 12. V2 성장 트리·다이어리·스토리·앨범이 동일 memory 사용
test("V2 views all consume the same MemoryRecord type", async () => {
  const growth = await readFile(new URL("app/components/v2/V2GrowthTree.tsx", root), "utf8");
  const diary = await readFile(new URL("app/components/v2/V2DiaryView.tsx", root), "utf8");
  const story = await readFile(new URL("app/components/v2/V2StoryView.tsx", root), "utf8");
  const album = await readFile(new URL("app/components/v2/V2AlbumView.tsx", root), "utf8");
  assert.match(growth, /MemoryRecord/);
  assert.match(diary, /MemoryRecord/);
  assert.match(story, /MemoryRecord/);
  assert.match(album, /MemoryRecord/);
});

test("V2 tree detail passes same memories array to all views", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /memories=\{memories\}/);
});

// 13. sample/localStorage가 실제 데이터 화면에서 제거됨
test("V2 home has no sampleMoments or localStorage", async () => {
  const page = await readFile(new URL("app/components/v2/V2Home.tsx", root), "utf8");
  assert.doesNotMatch(page, /sampleMoments/);
  assert.doesNotMatch(page, /localStorage/);
});

test("V2 tree detail has no sampleMoments or localStorage", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.doesNotMatch(page, /sampleMoments/);
  assert.doesNotMatch(page, /localStorage/);
});

test("V2 growth tree has no sampleMoments or localStorage", async () => {
  const page = await readFile(new URL("app/components/v2/V2GrowthTree.tsx", root), "utf8");
  assert.doesNotMatch(page, /sampleMoments/);
  assert.doesNotMatch(page, /localStorage/);
});

test("V2 community view has no hardcoded sample trees", async () => {
  const page = await readFile(new URL("app/components/v2/V2CommunityView.tsx", root), "utf8");
  assert.doesNotMatch(page, /sampleMoments/);
  assert.doesNotMatch(page, /localStorage/);
  assert.doesNotMatch(page, /communityTrees\s*=\s*\[/);
});

// 14. loading/empty/error/retry 상태
test("V2 my-trees has loading state", async () => {
  const page = await readFile(new URL("app/components/v2/V2MyTrees.tsx", root), "utf8");
  assert.match(page, /loading/);
  assert.match(page, /skeleton|Skeleton|v2-skeleton/i);
});

test("V2 my-trees has empty state", async () => {
  const page = await readFile(new URL("app/components/v2/V2MyTrees.tsx", root), "utf8");
  assert.match(page, /length === 0/);
});

test("V2 my-trees has error and retry state", async () => {
  const page = await readFile(new URL("app/components/v2/V2MyTrees.tsx", root), "utf8");
  assert.match(page, /error/);
  assert.match(page, /다시 시도/);
});

test("V2 community has loading/empty/error/retry states", async () => {
  const page = await readFile(new URL("app/components/v2/V2CommunityView.tsx", root), "utf8");
  assert.match(page, /loading/);
  assert.match(page, /error/);
  assert.match(page, /length === 0/);
  assert.match(page, /다시 시도/);
});

test("V2 tree detail has loading/empty/error states", async () => {
  const page = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(page, /loading/);
  assert.match(page, /error/);
  assert.match(page, /불러오는 중/);
});

// 15. V2 shared core - 별도 auth/API/backend 복제 없음
test("V2 components import from shared lib, not duplicate", async () => {
  const home = await readFile(new URL("app/components/v2/V2Home.tsx", root), "utf8");
  const detail = await readFile(new URL("app/components/v2/V2TreeDetail.tsx", root), "utf8");
  assert.match(home, /@\/lib\/auth/);
  assert.match(home, /@\/lib\/api/);
  assert.match(detail, /@\/lib\/auth/);
  assert.match(detail, /@\/lib\/api/);
  assert.match(detail, /@\/lib\/tree-types/);
});

test("V2 does not duplicate firebase config", async () => {
  const files = ['V2Home.tsx','V2MyTrees.tsx','V2TreeDetail.tsx','V2TreeCreateFlow.tsx','V2CommunityView.tsx'];
  for (const f of files) {
    const content = await readFile(new URL(`app/components/v2/${f}`, root), "utf8");
    assert.doesNotMatch(content, /initializeApp/);
    assert.doesNotMatch(content, /firebaseConfig/);
  }
});

// 16. V2 전용 스타일 분리
test("V2 styles are separated in app/styles/v2/", async () => {
  assert.ok(await exists("app/styles/v2/home.css"));
  assert.ok(await exists("app/styles/v2/tree.css"));
  assert.ok(await exists("app/styles/v2/diary.css"));
  assert.ok(await exists("app/styles/v2/story.css"));
  assert.ok(await exists("app/styles/v2/album.css"));
  assert.ok(await exists("app/styles/v2/community.css"));
});

test("V2 styles use v2- prefix to avoid V1 conflicts", async () => {
  const home = await readFile(new URL("app/styles/v2/home.css", root), "utf8");
  assert.match(home, /\.v2-home/);
  assert.match(home, /\.v2-button/);
  assert.match(home, /\.v2-eyebrow/);
});

// 17. V2 Worker 설정
test("V2 wrangler config targets lovetree-limone-v2", async () => {
  const config = await readFile(new URL("wrangler-v2.jsonc", root), "utf8");
  assert.match(config, /lovetree-limone-v2/);
  assert.match(config, /APP_ENV.*staging/);
  assert.match(config, /API_MUTATIONS_ENABLED.*true/);
  assert.match(config, /FIREBASE_PROJECT_ID.*relovetree/);
});

test("V1 wrangler config unchanged", async () => {
  const config = await readFile(new URL("wrangler.jsonc", root), "utf8");
  assert.match(config, /lovetree-limone/);
  assert.doesNotMatch(config, /lovetree-limone-v2/);
});
