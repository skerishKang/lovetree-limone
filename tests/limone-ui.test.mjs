import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Limone UI integration keeps the requested visual modes and growth states", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /성장 트리/);
  assert.doesNotMatch(page, /label: "이어지는 트리"/);
  assert.match(page, /마음 다이어리/);
  assert.match(page, /공개 트리 둘러보기/);
  assert.match(page, /이 순간 삭제/);
  assert.match(page, /기억할 시각 5초 늘리기/);
  assert.match(page, /영상 하나로 바로 시작하기/);
  assert.match(page, /영상 링크를 붙여넣어 주세요/);
  assert.match(page, /이 영상으로 내 트리 만들기/);
  assert.match(page, /flow-branch-flower/);
  assert.match(page, /flow-branch-heart/);
  assert.match(page, /flow-node-delete/);
  assert.match(page, /diary-paper-picker/);
  assert.match(page, /THE BOYZ · 주연/);
  assert.match(page, /RESCENE · 미나미/);
  assert.match(page, /aespa · 카리나/);
  assert.match(page, /flow-node-like/);
  assert.match(page, /최근 공개순/);
  assert.match(styles, /growth-story-banner/);
  assert.match(styles, /delete-confirm-backdrop/);
  assert.match(styles, /next-connection-preview/);
  assert.match(styles, /Readability and first-video quick start/);
  assert.match(styles, /font-size: 20px/);
});
