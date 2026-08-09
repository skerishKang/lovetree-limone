import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  INTENT_PATHS,
  momentsForIntent,
  resolveIntentPath,
} from "../lib/intent-path-prototype.ts";

const root = new URL("../", import.meta.url);

test("CAP-09 resolver maps the four prototype intents deterministically", () => {
  assert.equal(resolveIntentPath("처음 좋아하게 된 순간 보여줘").path.id, "first");
  assert.equal(resolveIntentPath("최근에 추가한 순간 보여줘").path.id, "recent");
  assert.equal(resolveIntentPath("사람별로 이어진 순간 보여줘").path.id, "people");
  assert.equal(resolveIntentPath("사진이나 영상으로 남긴 순간 보여줘").path.id, "media");

  const tie = resolveIntentPath("처음 최근 순간");
  assert.equal(tie.path.id, "first", "registry order is the stable tie-breaker");
  assert.equal(tie.score, 1);
});

test("free-text fallback is explicit and safe rather than opaque", () => {
  const fallback = resolveIntentPath("그날의 느낌 다시 보여줘");
  assert.equal(fallback.path.id, "recent");
  assert.equal(fallback.score, 0);
  assert.equal(fallback.usedFallback, true);
  assert.deepEqual(fallback.matchedTerms, []);
});

test("suggested prompts pass through the same resolver and resolve to their own path", () => {
  for (const path of INTENT_PATHS) {
    const resolved = resolveIntentPath(path.suggestion);
    assert.equal(resolved.path.id, path.id, `${path.suggestion} must resolve through the shared resolver`);
    assert.equal(resolved.usedFallback, false);
  }
});

test("prototype Moment projections are deterministic and media filter excludes text-only records", () => {
  assert.deepEqual(momentsForIntent("first").map((moment) => moment.id), ["m-01", "m-02", "m-03"]);
  assert.deepEqual(momentsForIntent("recent").map((moment) => moment.id), ["m-05", "m-06", "m-04"]);
  assert.ok(momentsForIntent("people").every((moment) => moment.person !== "서윤"));
  assert.ok(momentsForIntent("media").every((moment) => moment.mediaType === "photo" || moment.mediaType === "video"));
  assert.ok(momentsForIntent("media").every((moment) => moment.id !== "m-03" && moment.id !== "m-06"));
});

test("Design Lab route exposes one shared runQuery path for form and suggestions", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/intent-to-path/page.tsx", root),
    "utf8",
  );

  assert.match(page, /runQuery\(query\)/);
  assert.match(page, /runQuery\(path\.suggestion\)/);
  assert.match(page, /resolveIntentPath\(nextQuery\)/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /aria-pressed=/);
  assert.match(page, /PROTOTYPE · NOT PRODUCT-READY/);
  assert.match(page, /synthetic Moment/);
  assert.match(page, /실제 Tree\/Moment route로 이동하지 않습니다/);
});

test("route exposes all four inspectable path stages", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/intent-to-path/page.tsx", root),
    "utf8",
  );

  for (const stage of ["01 · INTERPRET", "02 · MATCH", "03 · FOCUS", "04 · ACT"]) {
    assert.match(page, new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(page, /fallback=recent/);
  assert.match(page, /matchedTerms\.join/);
});

test("mobile and reduced-motion contracts remain explicit in CSS", async () => {
  const css = await readFile(new URL("app/styles/intent-path-prototype.css", root), "utf8");

  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration:\s*0\.001ms/);
  assert.match(css, /\.lt-intent-path__route li\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*none;/);
  assert.match(css, /:focus-visible/);
});
