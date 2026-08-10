import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const component = fs.readFileSync("app/design-lab/lineages/54/v4/Lineage54PetalRunner.tsx", "utf8");
const page = fs.readFileSync("app/design-lab/lineages/54/v4/page.tsx", "utf8");
const css = fs.readFileSync("app/styles/lineage-54-petal-runner-v4.css", "utf8");
const registry = fs.readFileSync("lib/design-lineages.ts", "utf8");

test("Lineage 54 native review keeps all four source chapters and exact asset paths", () => {
  for (const label of ["FIRST MOMENT", "FEELING GROWS", "CONNECTION", "LOVE BLOOMS"]) {
    assert.match(component, new RegExp(label.replaceAll(" ", "\\s")));
  }
  for (const asset of [
    "lovetree-arrival-garden-v3.png",
    "petal-runner-front-v3.png",
    "petal-runner-side-v3.png",
    "petal-runner-rear-v3.png",
    "petal-runner-open-v3.png",
  ]) {
    assert.match(component, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(component, /184개의 순간은 잎이 되고 12개의 연결은 가지가 됩니다/);
  assert.match(component, /FIRST MOMENT → DEPART → TRAVEL → ARRIVE/);
});

test("Lineage 54 native review preserves travel, drag, path and arrival mechanics", () => {
  assert.match(component, /const TRAVEL_MS = 1800/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /releasePointerCapture/);
  assert.match(component, /onPointerCancel=/);
  assert.match(component, /lt54-memory-path/);
  assert.match(component, /triggerBloom/);
  assert.match(css, /@keyframes lt54-camera-travel/);
  assert.match(css, /@keyframes lt54-route-drive/);
  assert.match(css, /1\.8s cubic-bezier/);
  assert.match(css, /lt54-speed-field/);
  assert.match(css, /chapter-3 \.lt54-car-wrap/);
});

test("Lineage 54 keeps reduced-motion and exact-binary approval boundaries explicit", () => {
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /ASSET TRANSFER HOLD/);
  assert.match(component, /fidelity approval stays blocked until all 5 PNG assets/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(page, /binary asset transfer는 별도 gate/);
  assert.match(page, /canonical 정책으로 자동 채택하지 않습니다/);
});

test("Lineage 54 is registered as the executable V4 Design Lab candidate", () => {
  assert.match(registry, /id: "lt-54-petal-runner-love-journey"/);
  assert.match(registry, /number: 54/);
  assert.match(registry, /id: "54-v4-petal-runner-love-journey"/);
  assert.match(registry, /route: "\/design-lab\/lineages\/54\/v4"/);
  assert.match(registry, /decision: "candidate"/);
  assert.match(registry, /exact PNG transfer gate remains open/);
});

test("Lineage 54 mobile source composition keeps the 760px safe-floor contract", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.lt54-stage \{ height: 680px; min-height: 680px; \}/);
  assert.match(css, /width: 72%; left: 14%; bottom: 8%;/);
  assert.match(css, /\.lt54-timeline \{ left: 8px; right: 8px; \}/);
});
