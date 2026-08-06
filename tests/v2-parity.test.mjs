import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

async function readRoot(path) {
  return readFile(new URL(path, root), "utf8");
}

// ---- Anonymous public detail ----
test("V2 tree detail does not gate the whole page behind a login", async () => {
  const page = await readApp("components/v2/V2TreeDetail.tsx");
  assert.doesNotMatch(page, /if \(!user\)/, "page must not early-return on anonymous users");
  assert.match(page, /isOwner = Boolean\(tree && user && tree\.ownerId === user\.uid\)/);
});

test("owner-only controls are gated by isOwner", async () => {
  const page = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(page, /\{isOwner && \([\s\S]*?V2MomentEditor/);
  assert.match(page, /isOwner && \(\s*<div className="v2-memory-tools">/);
  assert.match(page, /isOwner && \(\s*<div className="v2-tree-action-row">/);
});

test("private tree protection message does not leak internals", async () => {
  const page = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(page, /이 러브트리를 찾을 수 없거나 공개되지 않았어요\./);
  assert.doesNotMatch(page, /SQL|stack|ownerId.*memo|endpoint/);
});

// ---- Media ----
test("save flow derives a YouTube thumbnail from sourceUrl", async () => {
  const page = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(page, /youtubeThumbnail\(form\.sourceUrl\.trim\(\)\)/);
  assert.match(page, /thumbnail: thumbnail \?\? ""/);
});

test("display derives a safe fallback thumbnail with existing priority", async () => {
  const types = await readRoot("lib/tree-types.ts");
  assert.match(types, /resolveMemoryThumbnail/);
  assert.match(types, /if \(memory\.thumbnail\) return memory\.thumbnail/);
  assert.match(types, /youtubeThumbnail/);
});

test("unsafe URL schemes are rejected", async () => {
  const types = await readRoot("lib/tree-types.ts");
  assert.match(types, /isSafeExternalUrl/);
  assert.match(types, /url\.protocol === "http:" \|\| url\.protocol === "https:"/);
});

test("source links open safely in a new tab", async () => {
  const page = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(page, /isSafeExternalUrl\(memory\.sourceUrl\)/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noreferrer noopener"/);
  assert.match(page, /v2-memory-source/);
});

test("album shows a real thumbnail image with a placeholder fallback", async () => {
  const album = await readApp("components/v2/V2AlbumView.tsx");
  assert.match(album, /resolveMemoryThumbnail\(memory\)/);
  assert.match(album, /<img src=\{thumbnail\}/);
  assert.match(album, /onError=\{\(e\) => e\.currentTarget\.remove\(\)\}/);
});

test("views render thumbnail images without breaking layout on error", async () => {
  for (const file of ["V2GrowthTree.tsx", "V2DiaryView.tsx", "V2StoryView.tsx", "V2AlbumView.tsx"]) {
    const view = await readApp(`components/v2/${file}`);
    assert.match(view, /resolveMemoryThumbnail/, `${file} should derive thumbnails`);
    assert.match(view, /onError=\{\(e\) => e\.currentTarget\.remove\(\)\}/, `${file} should handle image load failures`);
  }
});

// ---- Editor synchronization ----
test("moment editor syncs its fields when editingMemory changes", async () => {
  const editor = await readApp("components/v2/V2MomentEditor.tsx");
  assert.match(editor, /editingIdRef/);
  assert.match(editor, /if \(editingIdRef\.current === nextId\) return/);
  assert.match(editor, /formFromMemory\(editingMemory\)/);
  assert.match(editor, /editingMemory \? formFromMemory\(editingMemory\) : EMPTY_FORM/);
});

test("editor cancels to a blank create mode", async () => {
  const editor = await readApp("components/v2/V2MomentEditor.tsx");
  assert.match(editor, /onCancel/);
  assert.match(editor, /EMPTY_FORM/);
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(detail, /function resetForm\(\) \{[\s\S]*?setEditingId\(null\)/);
});

test("parentId cannot reference the edited memory itself", async () => {
  const editor = await readApp("components/v2/V2MomentEditor.tsx");
  assert.match(editor, /memory\.parentId === memory\.id \? "" : memory\.parentId \|\| ""/);
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(detail, /form\.parentId && form\.parentId !== editingId/);
  assert.match(detail, /memories\.filter\(\(m\) => m\.id !== editingId\)/);
});

test("edit payload never includes a create clientKey", async () => {
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(detail, /clientKey: isEditing \? undefined : clientKey/);
});

// ---- Onboarding ----
test("tree creation navigates to a first-moment guide", async () => {
  const home = await readApp("components/v2/V2Home.tsx");
  assert.match(home, /router\.push\(`\/v2\/trees\/\$\{treeId\}\?first=1`\)/);
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(detail, /first.*=== "1"/);
  assert.match(detail, /첫 순간을 기록해 볼까요\?/);
  assert.match(detail, /첫 순간 기록하기/);
  assert.match(detail, /나중에 할게요/);
});

test("tree create API is called once with an idempotency clientKey", async () => {
  const flow = await readApp("components/v2/V2TreeCreateFlow.tsx");
  assert.match(flow, /apiFetch\("\/api\/trees"/);
  assert.match(flow, /method: "POST"/);
  assert.match(flow, /clientKey/);
});

test("pending creation resumes after email login without forcing Google", async () => {
  const flow = await readApp("components/v2/V2TreeCreateFlow.tsx");
  assert.match(flow, /pendingIntent/);
  assert.match(flow, /onRequireAuth/);
  assert.match(flow, /pendingIntent \|\| !user/, "create flow must wait for the auth result");
  assert.doesNotMatch(flow, /void login\(\)/, "create flow must not force Google login");
});

// ---- Errors and labels ----
test("error messages distinguish 401/403/404/server/network", async () => {
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(detail, /로그인 세션이 만료되었거나 로그인이 필요해요\./);
  assert.match(detail, /이 러브트리에 접근할 권한이 없어요\./);
  assert.match(detail, /이 러브트리를 찾을 수 없거나 공개되지 않았어요\./);
  assert.match(detail, /서버에 일시적인 문제가 있어요\./);
  assert.match(detail, /네트워크 오류가 발생했어요\./);
});

test("internal sourceType values are shown with user-facing labels", async () => {
  const types = await readRoot("lib/tree-types.ts");
  assert.match(types, /sourceTypeLabel/);
  for (const file of ["V2TreeDetail.tsx", "V2GrowthTree.tsx", "V2DiaryView.tsx", "V2StoryView.tsx", "V2AlbumView.tsx"]) {
    const page = await readApp(`components/v2/${file}`);
    assert.match(page, /sourceTypeLabel\(/, `${file} should use sourceTypeLabel`);
  }
});

// ---- Non-regression ----
test("shared auth, API, and DB core are unchanged", async () => {
  const auth = await readRoot("lib/auth.tsx");
  assert.match(auth, /signInWithPopup/);
  assert.match(auth, /createUserWithEmailAndPassword/);
  const api = await readRoot("lib/api.ts");
  assert.match(api, /Bearer/);
  const schema = await readRoot("db/schema.ts");
  assert.match(schema, /pgTable/);
});

test("V1 routes and files are untouched", async () => {
  const v1Home = await readApp("page.tsx");
  assert.match(v1Home, /첫 순간 심기/);
  // Tree detail is a real App Router page wired to the shared hook;
  // thumbnail derivation moved into the shared moment layer in Slice 3.
  const v1Detail = await readApp("trees/[id]/page.tsx");
  assert.match(v1Detail, /"use client"/);
  assert.match(v1Detail, /useTreeMoments/);
  const hook = await readRoot("lib/use-tree-moments.ts");
  assert.match(hook, /youtubeThumbnail/);
});

test("PR #4 source is not copied into V2 files", async () => {
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.doesNotMatch(detail, /sampleMoments|localStorage/);
  const home = await readApp("components/v2/V2Home.tsx");
  assert.doesNotMatch(home, /sampleMoments|localStorage/);
});
