import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://lovetree.example/", {
      headers: {
        accept: "text/html",
        host: "lovetree.example",
        "x-forwarded-host": "lovetree.example",
        "x-forwarded-proto": "https",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished LoveTree landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<title>러브트리 \| 좋아하는 순간을 키워보세요<\/title>/);
  assert.match(html, /좋아하는 순간을,/);
  assert.match(html, /러브트리<\/em>로 키워보세요/);
  assert.match(html, /공개 트리 둘러보기/);
  assert.match(html, /마음이 닿은 트리들/);
  assert.match(html, /moment-purple\.jpg/);
  assert.match(html, /moment-spring\.jpg/);
  assert.match(html, /https:\/\/lovetree\.example\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("keeps finished-site assets and metadata wired", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="hero-collage"/);
  assert.match(page, /className="builder-shell"/);
  assert.match(page, /오래 품고 싶은 순간을/);
  assert.match(page, /공개 범위 선택/);
  assert.match(page, /workspace-shell workspace-mode-/);
  assert.match(page, /성장 트리/);
  assert.match(page, /이어지는 트리/);
  assert.match(page, /마음 다이어리/);
  assert.match(page, /스토리/);
  assert.match(page, /앨범 보드/);
  assert.match(page, /flow-h1/);
  assert.match(page, /workspace-standalone-mode/);
  assert.match(page, /className="diary-flow-board"/);
  assert.match(page, /CONNECTED VIDEO DIARY/);
  assert.match(page, /영상으로 남기기/);
  assert.match(page, /이 순간 다이어리에 붙이기/);
  assert.match(page, /className="community-shell"/);
  assert.match(page, /전체 러브트리 펼쳐보기/);
  assert.match(page, /setView\("community"\)/);
  assert.match(page, /setView\("workspace"\)/);
  assert.match(page, /setView\("builder"\)/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /new URL\("\/og\.png", metadataBase\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await Promise.all([
    access(new URL("../public/moment-purple.jpg", import.meta.url)),
    access(new URL("../public/moment-stage.jpg", import.meta.url)),
    access(new URL("../public/moment-spring.jpg", import.meta.url)),
    access(new URL("../public/moment-friends.jpg", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
});
