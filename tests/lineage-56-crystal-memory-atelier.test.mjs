import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = new URL("old/reference/lineage-56-crystal-memory-atelier-v3/source/index-v3.html", root);
const componentUrl = new URL("app/design-lab/lineages/56/v3/CrystalMemoryAtelierV3.tsx", root);
const metadataUrl = new URL("lib/lineage-56-crystal-memory-source.ts", root);
const cssUrl = new URL("app/styles/lineage-56-crystal-memory-atelier.css", root);

function sha256(buffer){return createHash("sha256").update(buffer).digest("hex")}
function gitBlob(buffer){return createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex")}

const ASSETS = [
  ["crystal-front.png",548429,"22ff5cbd7a125bc2d6fa955668e5c2a3140840aaefee63a6fefaa33ce7c6598a"],
  ["crystal-threequarter.png",548301,"f42888b30bf417c486b0c28dbb153c2983de42c6a14ed81c74058b22d2842e9b"],
  ["crystal-profile.png",550521,"a7a3f9c92bccfd75927a2f05f7866c1d2517e705737a4386ac36cc0169df8138"],
  ["crystal-rear.png",568418,"fdb40900e5c8e971ec2b5d0c20a3aeb6f33ec2d169ee7d0a109629962d716217"],
  ["crystal-awake-01.png",559524,"c8fa0d3849e7e841d23f3c227eac31161623f36f4ba6470e689aa4e0806d8b9c"],
  ["crystal-awake-02.png",555716,"bead2e9c2c834e716bb903516abdaa7de9a784e5582516272b1c5c0e88221d84"],
  ["crystal-awake-03.png",558172,"75893d9563fffe35cac171c7fb47feda9455494dc7c3e015f49f75ab992a6421"],
  ["crystal-awake-04.png",557520,"4f39a44fbd69c9c0c91aa8c15604c42e55bce97b385416abf898257675e80811"],
];

test("Lineage 56 exact source provenance is byte-pinned", async()=>{const buffer=await readFile(source);assert.equal(buffer.length,19_262);assert.equal(sha256(buffer),"9a7bb3415dade7d6fd04cecfe1be6ae04595d3b46d326f2b596dab819633a66c");assert.equal(gitBlob(buffer),"883e9f0aa1fe18d79fdbb6cc7163ecf69ae63d88")});

test("Lineage 56 pins exact fingerprints for four neutral angles and four frontal expressions", async()=>{const metadata=await readFile(metadataUrl,"utf8");for(const [file,bytes,hash] of ASSETS){assert.match(metadata,new RegExp(file.replace(".","\\.")));assert.match(metadata,new RegExp(String(bytes).replace(/(?=(\d{3})+(?!\d))/g,"_?")));assert.match(metadata,new RegExp(hash))}assert.equal((metadata.match(/kind: "angle"/g)??[]).length,4);assert.equal((metadata.match(/kind: "expression"/g)??[]).length,4);assert.doesNotMatch(metadata,/16-state|sixteen-state/i)});

test("V3 interaction contract keeps click and drag authorities separate", async()=>{const component=await readFile(componentUrl,"utf8");for(const marker of ["CRYSTAL_DRAG_START_PX","CRYSTAL_ANGLE_STEP_PX","cycleExpression()","rotateAngle(","pointer.dragged","visualMode","setAutoplay(false)","CRYSTAL_EXPRESSION_AUTOPLAY","CRYSTAL_EXPRESSION_INTERVAL_MS","CLOSE EYES","drawerRef","event.key !== \"Tab\"","openDrawer()"])assert.match(component,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));assert.match(component,/expression frames are frontal; angle drag switches to one of four neutral angle frames/)});

test("V3 preserves materials, engraving, Bloom and source-demo product boundary",async()=>{const component=await readFile(componentUrl,"utf8");for(const marker of ["rose", "ice", "obsidian", "aurora", "REFRACTION LIGHT","MEMORY INSCRIPTION","ENGRAVE ON CRYSTAL","CRYSTAL BLOOM","148 / 200","SOURCE DEMO VALUES · NON-CANONICAL PRODUCT POLICY","NOT BACKEND ENTITLEMENT"])assert.match(component,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});

test("native CSS remediates clipping and adds mobile/reduced-motion contracts",async()=>{const css=await readFile(cssUrl,"utf8");assert.match(css,/\.lt56__right\{[^}]*overflow:auto/);assert.match(css,/visibility:hidden;pointer-events:none/);assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/position:fixed/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/\.lt56__particles\{display:none\}/);assert.match(css,/touch-action:pan-y/)});

test("Lineage 56 registry preserves V1 V2 V3 revision history", async()=>{const registry=await readFile(new URL("lib/design-lineages.ts", root),"utf8");for(const marker of ["lt-56-crystal-memory-atelier","56-v1-collectible-viewer","56-v2-living-premium-relic","56-v3-direct-expression-rotation","/design-lab/lineages/56/v3","source demo value","canonical V4 policy가 아닙니다"])assert.match(registry,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});
