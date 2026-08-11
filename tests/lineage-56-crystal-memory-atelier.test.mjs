import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = new URL("reference/lineage-56-crystal-memory-atelier-v3/source/index-v3.html", root);
const componentUrl = new URL("app/design-lab/lineages/56/v3/CrystalMemoryAtelierV3.tsx", root);
const metadataUrl = new URL("lib/lineage-56-crystal-memory-source.ts", root);
const cssUrl = new URL("app/styles/lineage-56-crystal-memory-atelier.css", root);

function sha256(buffer){return createHash("sha256").update(buffer).digest("hex")}

test("Lineage 56 exact source provenance is byte-pinned", async()=>{const buffer=await readFile(source);assert.equal(buffer.length,19_262);assert.equal(sha256(buffer),"9a7bb3415dade7d6fd04cecfe1be6ae04595d3b46d326f2b596dab819633a66c")});

test("Lineage 56 pins exactly four neutral angles and four frontal expression assets", async()=>{const metadata=await readFile(metadataUrl,"utf8");for(const file of ["crystal-front.png","crystal-threequarter.png","crystal-profile.png","crystal-rear.png","crystal-awake-01.png","crystal-awake-02.png","crystal-awake-03.png","crystal-awake-04.png"])assert.match(metadata,new RegExp(file.replace(".","\\.")));assert.equal((metadata.match(/kind: "angle"/g)??[]).length,4);assert.equal((metadata.match(/kind: "expression"/g)??[]).length,4);assert.doesNotMatch(metadata,/16-state|sixteen-state/i)});

test("V3 interaction contract keeps click and drag authorities separate", async()=>{const component=await readFile(componentUrl,"utf8");for(const marker of ["CRYSTAL_DRAG_START_PX","CRYSTAL_ANGLE_STEP_PX","cycleExpression()","rotateAngle(","pointer.dragged","visualMode","setAutoplay(false)","CRYSTAL_EXPRESSION_AUTOPLAY","CRYSTAL_EXPRESSION_INTERVAL_MS","CLOSE EYES"])assert.match(component,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));assert.match(component,/expression frames are frontal; angle drag switches to one of four neutral angle frames/)});

test("V3 preserves materials, engraving, Bloom and source-demo product boundary",async()=>{const component=await readFile(componentUrl,"utf8");for(const marker of ["rose", "ice", "obsidian", "aurora", "REFRACTION LIGHT","MEMORY INSCRIPTION","ENGRAVE ON CRYSTAL","CRYSTAL BLOOM","148 / 200","SOURCE DEMO VALUES · NON-CANONICAL PRODUCT POLICY","NOT BACKEND ENTITLEMENT"])assert.match(component,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});

test("native CSS remediates clipping and adds mobile/reduced-motion contracts",async()=>{const css=await readFile(cssUrl,"utf8");assert.match(css,/\.lt56__right\{[^}]*overflow:auto/);assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/position:fixed/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/touch-action:pan-y/)});

test("Lineage 56 registry preserves V1 V2 V3 revision history", async()=>{const registry=await readFile(new URL("lib/design-lineages.ts", root),"utf8");for(const marker of ["lt-56-crystal-memory-atelier","56-v1-collectible-viewer","56-v2-living-premium-relic","56-v3-direct-expression-rotation","/design-lab/lineages/56/v3","source demo value","canonical V4 policy가 아닙니다"])assert.match(registry,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});
