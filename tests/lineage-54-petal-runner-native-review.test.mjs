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

test("Lineage 54 native review preserves travel, drag, source swap, path and arrival mechanics", () => {
  assert.match(component, /const TRAVEL_MS = 1800/);
  assert.match(component, /const SOURCE_RELEASE_PAD_MS = 80/);
  assert.match(component, /const VEHICLE_SWAP_TRIGGER_MS = 520/);
  assert.match(component, /const VEHICLE_FADE_MS = 170/);
  assert.match(component, /const PETAL_LIFETIME_MS = 2400/);
  assert.match(component, /swapVehicle\(chapter\.image\)/);
  assert.match(component, /swapVehicle\(VEHICLE_FILES\[next\]\)/);
  assert.match(component, /dragTilt === 0 \? "none"/);
  assert.match(component, /opacity: vehicleFading \? 0\.15 : 1/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /releasePointerCapture/);
  assert.match(component, /setDragging\(true\)/);
  assert.match(component, /setDragging\(false\)/);
  assert.match(component, /currentToken === token \? 0 : currentToken/);
  assert.match(component, /onPointerCancel=/);
  assert.match(component, /lt54-memory-path/);
  assert.match(component, /triggerBloom/);
  assert.doesNotMatch(component, /setCurrent\(next\);\s*setFreeIndex\(next\);/);
  assert.match(css, /@keyframes lt54-camera-travel/);
  assert.match(css, /@keyframes lt54-route-drive/);
  assert.match(css, /1\.8s cubic-bezier/);
  assert.match(css, /lt54-speed-field/);
  assert.match(css, /chapter-3 \.lt54-car-wrap/);
  assert.match(css, /\.lt54-car-wrap\.is-dragging \{ cursor: grabbing; \}/);
});

test("Lineage 54 keeps review policy outside the normal source composition", () => {
  assert.doesNotMatch(component, /lt54-product-boundary/);
  assert.doesNotMatch(component, /Motion review: 1\.8s travel sequence enabled/);
  assert.match(component, /Reduced motion: chapter changes are immediate/);
  assert.match(page, /canonical 정책으로 자동 채택하지 않습니다/);
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

test("Lineage 54 source composition preserves viewport and fixed overlay contracts", () => {
  assert.match(css, /\.lt54-layout \{\s*height: calc\(100vh - 76px\);\s*min-height: 700px;/);
  assert.match(css, /\.lt54-toast \{ position: fixed;/);
  assert.match(css, /height: calc\(100vh - 112px\)/);
  assert.match(css, /linear-gradient\(rgba\(255,221,216,0\.08\), rgba\(255,231,224,0\.04\)\)/);
});

test("Lineage 54 mobile source composition keeps the 760px safe-floor contract", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.lt54-layout \{ height: auto; min-height: 0; display: block; padding: 8px; \}/);
  assert.match(css, /\.lt54-stage \{ height: 680px; min-height: 680px; \}/);
  assert.match(css, /\.lt54-side--right \{ position: fixed;/);
  assert.match(css, /width: 72%; left: 14%; bottom: 8%;/);
  assert.match(css, /\.lt54-timeline \{ left: 8px; right: 8px; \}/);
});
