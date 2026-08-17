import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PAGE = fs.readFileSync(path.join(ROOT, "app/v4/journey/page.tsx"), "utf8");
const V12 = fs.readFileSync(path.join(ROOT, "app/components/v4/V4FirstJourneyV12.tsx"), "utf8");
const SEAM = fs.readFileSync(path.join(ROOT, "lib/first-tree-create-client.ts"), "utf8");

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("#248: canonical V1.2 is the default /v4/journey product authority", () => {
  assert.match(PAGE, /setMode\(params\.get\("legacy"\) === "1" \? "legacy-demo" : "canonical"\)/);
  assert.match(PAGE, /return <V4FirstJourneyV12 storageKey=\{STORAGE_KEY\} \/>/);
  assert.doesNotMatch(PAGE, /v12Mode|params\.get\("v12"\)|\?v12=1/);
  assert.match(PAGE, /mode === "legacy-demo"/);
  assert.match(PAGE, /<V4FirstJourney \/>/);
});

test("#248: canonical writes never use SAMPLE_MOMENTS or fixture fallbacks", () => {
  assert.doesNotMatch(V12, /SAMPLE_MOMENTS/);
  assert.doesNotMatch(V12, /ScMzIvxBSi4|ysz5S6PUM-U|dQw4w9WgXcQ|bcUfIpQ6aeA/);
  assert.match(V12, /const sourceUrl = draft\.firstMoment\.url\.trim\(\);/);
  assert.match(V12, /const title = draft\.firstMoment\.title\.trim\(\);/);
  assert.match(V12, /memo: note,/);
  assert.match(V12, /sourceUrl,/);
  assert.match(V12, /timestamp: draft\.firstMoment\.discoveryDate/);
  assert.match(V12, /title: draft\.secondMoment\.title\.trim\(\)/);
  assert.match(V12, /memo: draft\.secondMoment\.note\.trim\(\)/);
  assert.match(V12, /sourceUrl: draft\.secondMoment\.url\.trim\(\)/);
});

test("#248: first-save reuses the existing createFirstTree seam", () => {
  assert.match(V12, /import \{ createFirstTree[, ].*\} from "@\/lib\/first-tree-create-client"/);
  assert.match(V12, /await createFirstTree\(\{/);
  assert.doesNotMatch(V12, /apiFetch\(\s*["'`]\/api\/trees\/with-first-memory["'`]/);
  assert.match(SEAM, /POST \/api\/trees\/with-first-memory/);
});

test("#248: localStorage schema contains draft only and no durable truth", () => {
  const persist = sliceBetween(V12, "function persistDraftSnapshot", "function loadDraftSnapshot");
  assert.match(persist, /version: 2/);
  assert.match(persist, /treeName: draft\.treeName/);
  assert.match(persist, /firstMoment:/);
  assert.match(persist, /secondMoment:/);
  assert.match(persist, /whyNext: draft\.secondMoment\.whyNext/);
  assert.doesNotMatch(persist, /canonical|treeId|firstMemoryId|secondMemoryId|memoryId|saved|complete/);
});

test("#248: stale or malformed localStorage fails closed", () => {
  const load = sliceBetween(V12, "function loadDraftSnapshot", "function requireFirstInput");
  assert.match(load, /JSON\.parse\(raw\)/);
  assert.match(load, /localStorage\.removeItem\(storageKey\)/);
  assert.doesNotMatch(load, /parsed\.canonical|parsed\.saved|firstMemoryId|secondMemoryId|memoryId/);
  assert.match(V12, /setCanonical\(\{ treeId, firstMemoryId: memoryId \}\)/);
  assert.match(V12, /setCanonical\(null\)/);
});

test("#248: failed first write cannot claim success", () => {
  const firstSave = sliceBetween(V12, "const performFirstSave", "const submitFirstMoment");
  assert.match(firstSave, /setCanonical\(\{ treeId, firstMemoryId: memoryId \}\)/);
  assert.match(firstSave, /setFirstSaved\(true\)/);
  const catchBranch = firstSave.slice(firstSave.indexOf("} catch (cause)"));
  assert.match(catchBranch, /setFirstSaved\(false\)/);
  assert.match(catchBranch, /setCanonical\(null\)/);
  assert.doesNotMatch(catchBranch, /setFirstSaved\(true\)/);
});

test("#248: second Moment uses real firstMemoryId and exact user WHY NEXT", () => {
  const second = sliceBetween(V12, "const submitSecondMoment", "const completeJourney");
  assert.match(second, /parentId: canonical\.firstMemoryId/);
  assert.match(second, /connectionReason: input\.whyNext/);
  assert.match(second, /const whyNext = draft\.secondMoment\.whyNext\.trim\(\);/);
  assert.doesNotMatch(second, /whyNext \|\||connectionReason:.*relation|SAMPLE/);
  assert.match(second, /if \(!response\.ok \|\| !data\.id\)/);
  assert.match(second, /secondMemoryId: data\.id/);
  assert.match(second, /setSecondSaved\(true\)/);
  const catchBranch = second.slice(second.indexOf("} catch (cause)"));
  assert.match(catchBranch, /setSecondSaved\(false\)/);
  assert.doesNotMatch(catchBranch, /setSecondSaved\(true\)/);
});

test("#248: second-write retry keeps an operation-scoped clientKey", () => {
  assert.match(V12, /const SECOND_PENDING_KEY = "lovetree-v12-second-moment-client-key"/);
  assert.match(V12, /if \(pendingSecondKey\.current\) return pendingSecondKey\.current/);
  assert.match(V12, /localStorage\.getItem\(SECOND_PENDING_KEY\)/);
  assert.match(V12, /const generated = `v12-second-\$\{crypto\.randomUUID\(\)\}`/);
  assert.match(V12, /const clientKey = ensureSecondClientKey\(\);/);
  assert.match(V12, /clientKey,/);
  assert.match(V12, /retireSecondClientKey\(\);/);
  assert.doesNotMatch(V12, /Math\.random\(\)/);
});

test("#248: completion requires the actual persisted second Memory id", () => {
  const completion = sliceBetween(V12, "const completeJourney", "const resetAll");
  assert.match(completion, /!canonical\?\.treeId \|\| !canonical\.secondMemoryId/);
  assert.match(completion, /\/trees\/\$\{encodeURIComponent\(canonical\.treeId\)\}\?highlight=\$\{encodeURIComponent\(canonical\.secondMemoryId\)\}/);
  assert.doesNotMatch(completion, /firstMemoryId.*highlight|\?highlight=.*firstMemoryId/);
});

test("#248: auth is composed from the existing stack only", () => {
  assert.match(V12, /import \{ useAuth \} from "@\/lib\/auth"/);
  assert.match(V12, /import EmailAuthForm from "@\/app\/components\/EmailAuthForm"/);
  assert.match(V12, /if \(!user\) \{[\s\S]*setPendingFirstSave\(true\);[\s\S]*setAuthOpen\(true\);/);
  assert.doesNotMatch(V12, /signInWith|createUserWith|firebase\/auth/);
});

test("#248: no new backend, schema, or top-level route authority", () => {
  assert.doesNotMatch(V12, /server\/api|drizzle|migration|neon|getAuthTokenProvider/);
  assert.match(V12, /\/api\/memories\/\$\{encodeURIComponent\(canonical\.firstMemoryId\)\}/);
  assert.match(V12, /\/api\/trees\/\$\{encodeURIComponent\(canonical\.treeId\)\}\/memories/);
  assert.doesNotMatch(PAGE, /app\/api|\/journey-v2|\/first-journey-v2/);
});
