import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

const V3_CSS_FILES = [
  "tokens.css",
  "shell.css",
  "landing.css",
  "onboarding.css",
  "workspace.css",
  "views.css",
  "albums.css",
  "community.css",
  "milestone.css",
  "responsive.css",
];

// 1. V3 CSS 파일 존재
test("all V3 CSS files exist under app/styles/v3", async () => {
  for (const file of V3_CSS_FILES) {
    const content = await readFile(new URL(`app/styles/v3/${file}`, root), "utf8");
    assert.ok(content.length > 0, `app/styles/v3/${file} must not be empty`);
  }
});

// 2. V3 CSS는 전역 selector를 scope 없이 사용하지 않음
test("V3 CSS has no unscoped global element selectors", async () => {
  for (const file of V3_CSS_FILES) {
    const css = await readFile(new URL(`app/styles/v3/${file}`, root), "utf8");
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const lines = withoutComments.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      // selectors like `body {`, `button {`, `input {`, `h1 {`, `a {`
      if (/^(body|button|input|textarea|select|h1|h2|h3|p|a|ul|li|span|div)\s*[,{]/.test(trimmed)) {
        assert.fail(`${file}: unscoped global selector found: ${trimmed}`);
      }
    }
  }
});

// 3. V3 CSS는 v3- prefix 규칙을 따름
test("V3 CSS rules use v3- prefixed class names only", async () => {
  for (const file of V3_CSS_FILES) {
    const css = await readFile(new URL(`app/styles/v3/${file}`, root), "utf8");
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const classSelectors = [
      ...withoutComments.matchAll(/\.([a-zA-Z][\w-]*)/g),
    ].map((m) => m[1]);
    const offenders = classSelectors.filter((name) => !name.startsWith("v3-"));
    // allow animation keyframe names defined via @keyframes if any (none currently)
    assert.deepEqual(offenders, [], `${file} must only use v3- prefixed classes`);
  }
});

// 4. V3 CSS는 모든 파일이 .v3-shell 아래 scope됨
test("V3 CSS scopes rules under .v3-shell", async () => {
  for (const file of V3_CSS_FILES) {
    const css = await readFile(new URL(`app/styles/v3/${file}`, root), "utf8");
    assert.match(css, /\.v3-shell/, `${file} must reference .v3-shell scope`);
  }
});

// 5. V1/V2 스타일에는 V3 규칙이 침투하지 않음
test("V1 globals and V2 styles are untouched by V3 CSS", async () => {
  const globals = await readFile(new URL("app/globals.css", root), "utf8");
  assert.doesNotMatch(globals, /\.v3-shell/);
  const v2Files = await readdir(new URL("app/styles/v2/", root));
  for (const file of v2Files) {
    const css = await readFile(new URL(`app/styles/v2/${file}`, root), "utf8");
    assert.doesNotMatch(css, /\.v3-shell/);
  }
});

// 6. V3 컴포넌트는 V3 CSS만 import
test("V3 components do not import V1/V2 stylesheets", async () => {
  const components = await readdir(new URL("app/components/v3/", root));
  for (const file of components.filter((f) => f.endsWith(".tsx"))) {
    const source = await readFile(new URL(`app/components/v3/${file}`, root), "utf8");
    assert.doesNotMatch(source, /styles\/v2\//);
    assert.doesNotMatch(source, /email-auth\.css/);
  }
});

// 7. V3 경로 페이지는 V3 CSS aggregator 사용
test("V3 route pages import the v3 stylesheet aggregator", async () => {
  const page = await readApp("v3/page.tsx");
  assert.match(page, /styles\/v3\/index\.css/);
  const workspace = await readApp("v3/trees/demo/page.tsx");
  assert.match(workspace, /styles\/v3\/index\.css/);
});
