import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sourcePath = path.join(root, "reference/source-tracks-snapshot/01_0730작업물/lovetree-community-discovery-v2.html");
const component = read("app/components/v4/product/V4GlobalDiscoveryHome.tsx");
const styles = read("app/styles/v4/global-discovery-home.css");
const route = read("app/v4/community/page.tsx");

const sha256 = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");

test("Track01 source executable remains pinned exactly", () => {
  assert.equal(sha256, "661d21d4e85711603f7e8fe3966d3fd5ccc29c920fd6479850c2f99040e39f59");
});

test("canonical /v4/community route stays native React rather than source iframe", () => {
  assert.match(route, /V4GlobalDiscoveryHome/);
  assert.match(route, /global-discovery-home\.css/);
  assert.doesNotMatch(component, /iframe|srcDoc|lovetree-community-discovery-v2\.html/);
});

test("Track01 visual progression is restored on canonical community data", () => {
  assert.match(component, /\/api\/community\/trees\?view=summary/);
  assert.match(component, /\/api\/community\/memories\?treeId=/);
  assert.match(component, /data-track01-native="community"/);
  assert.match(component, /data-track01-tree-card/);
  assert.match(component, /data-track01-preview/);
  assert.match(component, /data-track01-open/);
  assert.match(component, /data-track01-full-tree/);
  assert.match(component, /data-track01-moment-node/);
  assert.match(component, /connectionReason/);
  assert.match(component, /canonical Moment 상세 열기/);
});

test("source visual language survives through paper, rose, scrapbook, and responsive composition", () => {
  assert.match(styles, /--paper:#fffdf8/);
  assert.match(styles, /--rose:#d17883/);
  assert.match(styles, /track01-main\{display:grid;grid-template-columns:minmax\(560px/);
  assert.match(styles, /track01-book/);
  assert.match(styles, /track01-collage/);
  assert.match(styles, /track01-paper/);
  assert.match(styles, /track01-tree-shell/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /focus-visible/);
});

test("Track01 native keeps source demo data out of product truth", () => {
  for (const sample of ["함께 쌓인 보랏빛 순간", "레드와 별빛 사이", "우리가 사랑하는 새로운 계절", "반짝이는 우리의 청춘 기록", "2814", "3160"]) {
    assert.equal(component.includes(sample), false, `source fixture leaked into native: ${sample}`);
  }
});
