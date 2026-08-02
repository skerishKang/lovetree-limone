import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

// 1. Fullscreen drawer: focus trap + scroll lock
test("V3FullscreenDrawer traps focus and locks body scroll", async () => {
  const drawer = await readApp("components/v3/V3FullscreenDrawer.tsx");
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /document\.body\.style\.overflow = "hidden"/);
  assert.match(drawer, /event\.key !== "Tab"/);
  assert.match(drawer, /focusables\[0\]/);
  assert.match(drawer, /focusables\[focusables\.length - 1\]/);
  assert.match(drawer, /previousFocus\?\.focus\(\)/);
});

// 2. Fullscreen drawer는 폼 용도(drawer)와 트리 용도(fullscreen)를 구분
test("V3FullscreenDrawer separates drawer and fullscreen variants", async () => {
  const drawer = await readApp("components/v3/V3FullscreenDrawer.tsx");
  assert.match(drawer, /variant\?: "drawer" \| "fullscreen"/);
  assert.match(drawer, /variant === "fullscreen"/);
  const workspace = await readApp("components/v3/V3TreeWorkspace.tsx");
  assert.match(workspace, /variant="drawer"/);
  assert.match(workspace, /variant="fullscreen"/);
});

// 3. 필터 일관성: growth tree와 connection map은 filtered roots를 받음
test("workspace passes filtered roots to tree and map views", async () => {
  const workspace = await readApp("components/v3/V3TreeWorkspace.tsx");
  assert.match(workspace, /const filteredRoots = useMemo/);
  assert.match(workspace, /roots=\{filteredRoots\}/);
  assert.match(workspace, /effectiveSelectedId/);
  assert.match(workspace, /selectedId=\{effectiveSelectedId\}/);
});

// 4. growth tree: 키보드 위치 변경, pointer capture, role=application 제거
test("growth tree supports keyboard move and pointer capture", async () => {
  const tree = await readApp("components/v3/V3GrowthTree.tsx");
  assert.match(tree, /setPointerCapture/);
  assert.match(tree, /releasePointerCapture/);
  assert.match(tree, /moveSelectedBy/);
  assert.match(tree, /event\.key === "ArrowLeft"/);
  assert.doesNotMatch(tree, /role=\{editMode \? "application"/);
  assert.match(tree, /if \(didDrag\.current\) return;/);
});

// 5. 연결 지도 줌 컨트롤 동작
test("connection map zoom controls are functional", async () => {
  const map = await readApp("components/v3/V3ConnectionMap.tsx");
  assert.match(map, /const \[zoom, setZoom\] = useState\(1\)/);
  assert.match(map, /setZoom\(\(value\) => Math\.min\(2, value \+ 0\.2\)\)/);
  assert.match(map, /setZoom\(\(value\) => Math\.max\(0\.5, value - 0\.2\)\)/);
  assert.match(map, /onClick=\{\(\) => setZoom\(1\)\}/);
});

// 6. community preview는 필터된 목록에서만 선택
test("community preview selects from filtered list", async () => {
  const community = await readApp("components/v3/V3Community.tsx");
  assert.match(community, /filtered\.find\(\(tree\) => tree\.id === selectedTreeId\)/);
});
