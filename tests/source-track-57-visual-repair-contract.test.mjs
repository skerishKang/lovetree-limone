import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

const SOURCE = "reference/source-track-57-living-glass/04_버전1.3_모바일반응형수정_자료/후보_버전1.3_리빙글라스_모먼트카드_모바일반응형수정.html";
const CARD = "app/components/moment-presentation/LivingGlassMomentCard.tsx";
const GALLERY = "app/components/moment-presentation/LivingGlassMomentGallery.tsx";
const INSPECTOR = "app/components/moment-presentation/LivingGlassMomentInspector.tsx";
const REPAIR_CSS = "app/styles/source-track-57-living-glass-repair.css";
const PAGE = "app/design-lab/source-tracks/57/v1-3-native/page.tsx";

const source = read(SOURCE);
const card = read(CARD);
const gallery = read(GALLERY);
const inspector = read(INSPECTOR);
const css = read(REPAIR_CSS);

test("authoritative V1.3 source explicitly uses horizontal responsive card travel", () => {
  assert.match(source, /@media\(max-width:880px\)/);
  assert.match(source, /display:flex;overflow-x:auto;scroll-snap-type:x mandatory/);
  assert.match(source, /flex:0 0 min\(82vw,350px\);scroll-snap-align:center/);
  assert.match(source, /Math\.abs\(dx\)>55&&Math\.abs\(dx\)>Math\.abs\(dy\)\*1\.2/);
  assert.match(source, /scrollIntoView\(\{behavior:reduced\?'auto':'smooth',inline:'center',block:'nearest'\}\)/);
});

test("native repair restores V1.3 horizontal gallery instead of vertical feed", () => {
  assert.match(read(PAGE), /source-track-57-living-glass-repair\.css/);
  assert.match(css, /@media \(max-width: 880px\)/);
  assert.match(css, /display: flex/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /flex: 0 0 min\(82vw, 350px\)/);
  assert.match(css, /flex-basis: min\(calc\(100vw - 52px\), 360px\)/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.doesNotMatch(css, /grid-template-columns:\s*1fr/);
  assert.match(gallery, /data-mobile-horizontal-authority="v1\.3"/);
  assert.match(gallery, /scrollMomentIntoView/);
  assert.match(gallery, /scrollIntoView\(\{ behavior: reduced \? "auto" : "smooth", inline: "center", block: "nearest" \}\)/);
});

test("touch swipe and tap are separated with Source57 gesture thresholds", () => {
  assert.match(card, /onPointerDown=\{handlePointerDown\}/);
  assert.match(card, /onPointerUp=\{handlePointerUp\}/);
  assert.match(card, /Math\.abs\(dx\) > 55/);
  assert.match(card, /Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.2/);
  assert.match(card, /distance < 9 && !start\.moved/);
  assert.match(card, /suppressClick\.current/);
  assert.match(card, /onNavigate\(dx < 0 \? 1 : -1, moment\)/);
  assert.match(gallery, /navigateMoment/);
});

test("desktop selected hierarchy restores bloom, recede and in-viewport fixed inspector", () => {
  assert.match(card, /living-glass-selection-bloom/);
  assert.match(card, /living-glass-edge-runner/);
  assert.match(card, /living-glass-selected-mark/);
  assert.match(css, /\.living-glass-gallery-shell\.has-selection \.living-glass-card-wrap:not\(\.is-selected\) \.living-glass-card/);
  assert.match(css, /filter: saturate\(\.82\) brightness\(\.84\)/);
  assert.match(css, /0 0 105px color-mix/);
  assert.match(css, /@media \(min-width: 881px\)/);
  assert.match(css, /position: fixed/);
  assert.match(css, /top: 118px/);
  assert.match(css, /right: 28px/);
  assert.match(css, /bottom: 28px/);
  assert.match(inspector, /living-glass-inspector-media/);
  assert.match(inspector, /WHY NEXT/);
});

test("mobile inspector remains a foreground sheet while gallery context stays mounted", () => {
  assert.match(css, /max-height: 72svh/);
  assert.match(css, /backdrop-filter: blur\(28px\) saturate\(132%\)/);
  assert.match(css, /\.living-glass-mobile-travel-cue/);
  assert.match(gallery, /selectedId/);
  assert.match(gallery, /onClose=\{\(\) => setSelectedId\(null\)\}/);
});

test("repair stays presentation-only and preserves canonical Moment/media boundary", () => {
  const repair = [card, gallery, inspector, css].join("\n");
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "prisma", "drizzle", "neon", "supabase", "/api/memories", "fetch("]) {
    assert.equal(repair.includes(forbidden), false, `${forbidden} must not become Source57 repair authority`);
  }
  assert.match(card, /moment\.thumbnail/);
  assert.match(card, /moment\.sourceType/);
  assert.match(card, /moment\.emotionTags/);
  assert.match(inspector, /moment\.connectionReason/);
});
