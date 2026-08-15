import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const V12 = fs.readFileSync(path.join(ROOT, "app/components/v4/V4FirstJourneyV12.tsx"), "utf8");
const SEAM = fs.readFileSync(path.join(ROOT, "lib/first-tree-create-client.ts"), "utf8");

/**
 * COM2 #204 Slice B — client-only canonical persistence truthfulness contract.
 *
 * Scope is CLIENT/UI WIRING ONLY (no backend/schema/Auth authority mutation).
 * Runtime end-to-end success navigation requires an authenticated Firebase
 * session; that path is covered by the reused `lib/first-tree-create-client`
 * seam (#224) and asserted here only as static reuse + failure truthfulness,
 * because real-DB / real-auth proving is explicitly forbidden for this slice.
 */

test("V12 first-save reuses the createFirstTree seam (no duplicate direct POST)", () => {
  // Must import the seam.
  assert.match(V12, /import \{ createFirstTree[, ].*\} from "@\/lib\/first-tree-create-client"/);
  // Must CALL the seam (not implement its own POST to with-first-memory).
  assert.match(V12, /await createFirstTree\(\{/);
  // Must NOT contain a hand-rolled POST to the first-create endpoint.
  assert.doesNotMatch(
    V12,
    /apiFetch\(\s*["'`]\/api\/trees\/with-first-memory["'`]/,
    "V12 must not directly POST to /api/trees/with-first-memory",
  );
  // Seam itself must stay single-writer (Slice A owns it).
  assert.match(SEAM, /POST \/api\/trees\/with-first-memory/);
});

test("API failure / partial IDs must NOT claim durable first-save success", () => {
  // firstMoment.saved becomes true ONLY inside the createFirstTree success branch,
  // alongside the preserved presentation fields (BLOCKER 4).
  const successBranch = V12.slice(V12.indexOf("const { treeId, memoryId } = await createFirstTree"));
  const savedSet = successBranch.slice(0, successBranch.indexOf("} catch"));
  assert.match(savedSet, /firstMoment: \{/);
  assert.match(savedSet, /saved: true/);
  assert.match(savedSet, /url: `https:\/\/youtube\.com\/watch\?v=\$\{first\.videoId\}`/);
  // In the catch branch there must be NO saved:true assignment.
  const catchBranch = V12.slice(V12.indexOf("} catch (cause) {"), V12.indexOf("} finally {", V12.indexOf("} catch (cause) {")));
  assert.doesNotMatch(catchBranch, /saved:\s*true/);
  // Failure keeps draft (no early success flag), so failure truthfulness holds.
});

test("dual-ID canonical result is the only authority for saved success", () => {
  // The success branch destructures BOTH ids from the seam result.
  assert.match(V12, /const \{ treeId, memoryId \} = await createFirstTree\(/);
  // And persists them as canonical refs (mirror, not local authority).
  assert.match(V12, /canonical: \{ treeId, firstMemoryId: memoryId \}/);
  // No local-only ID is ever used as the canonical memory id.
  assert.doesNotMatch(V12, /firstMemoryId:\s*["'`][^"'`]+["'`]/);
});

test("first Memory enrichment uses EXISTING same-origin PUT (no fake second Memory)", () => {
  assert.match(V12, /\/api\/memories\/\$\{encodeURIComponent\(refs\.firstMemoryId\)\}/);
  assert.match(V12, /method: "PUT"/);
  // emotion → emotionTags mapping present.
  assert.match(V12, /emotionTags: \[selectedEmotion\]/);
  // blank memo must not overwrite existing memo.
  assert.match(V12, /if \(memoNote\) payload\.memo = memoNote;/);
});

test("subsequent Moment uses existing same-origin nested POST with canonical parentId", () => {
  assert.match(V12, /\/api\/trees\/\$\{encodeURIComponent\(refs\.treeId\)\}\/memories/);
  assert.match(V12, /method: "POST"/);
  assert.match(V12, /parentId: refs\.firstMemoryId/);
  assert.match(V12, /connectionReason: editWhy\[idx\] \|\| m\.whyNext \|\| ""/);
  // MAIN/BRANCH must NOT be persisted as a DB/entity field.
  assert.doesNotMatch(V12, /mainBranch|pathType|MAIN_BRANCH|main:\s*true|branch:\s*true/);
});

test("completion route uses actual persisted IDs (no sample/local IDs)", () => {
  assert.match(V12, /router\.push\(`\/trees\/\$\{encodeURIComponent\(refs\.treeId\)\}\?highlight=\$\{encodeURIComponent\(highlight\)\}`\)/);
  // highlight falls back to firstMemoryId when no subsequent Moment persisted.
  assert.match(V12, /const highlight = latestPersisted \?\? refs\.firstMemoryId;/);
  // No video-id / sample-id used as the navigation target.
  assert.doesNotMatch(V12, /\/trees\/[^`]*ScMzIvxBSi4/);
});

test("auth reuse only — no second auth implementation in V12", () => {
  assert.match(V12, /import \{ useAuth \} from "@\/lib\/auth"/);
  assert.match(V12, /import EmailAuthForm from "@\/app\/components\/EmailAuthForm"/);
  assert.match(V12, /<EmailAuthForm open=\{authOpen\} onClose=\{closeAuth\} \/>/);
  // anonymous entry defers to the existing auth UI rather than writing unauthenticated.
  assert.match(V12, /if \(!user\) \{\s*setPendingFirstSave\(true\);\s*setAuthOpen\(true\);\s*return;/);
});

test("localStorage stays draft/progress (no local override of canonical truth)", () => {
  // The component still persists appState to localStorage...
  assert.match(V12, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(next\)\)/);
  // ...but reset clears the pending clientKey too (retry starts fresh, no fake durable id).
  assert.match(V12, /localStorage\.removeItem\("lovetree-v4-product-spine-create-client-key"\)/);
  // No code path treats localStorage presence alone as persisted success authority.
  assert.doesNotMatch(V12, /canonical\s*=\s*.*localStorage/);
});

test("no new backend / endpoint / schema / Auth authority introduced", () => {
  // Every /api/ reference in V12 must resolve to one of the two pre-existing
  // same-origin contracts (the first-create endpoint lives inside the reused
  // seam; the Memory PUT and nested Moment POST are inline template literals).
  const allowed = [
    /\/api\/trees\/\$\{encodeURIComponent\(refs\.treeId\)\}\/memories/,
    /\/api\/memories\/\$\{encodeURIComponent\(refs\.firstMemoryId\)\}/,
    /FIRST_CREATE_ENDPOINT/,
  ];
  const refs = [...V12.matchAll(/\/api\/[^\s"'`]+/g)].map((m) => m[0]);
  const unique = [...new Set(refs)];
  for (const ep of unique) {
    const ok = allowed.some((re) => re.test(ep));
    assert.ok(ok, `unexpected new endpoint referenced: ${ep}`);
  }
  // No server/api, db, drizzle, migration, worker, or firebase-auth-authority edits here.
  assert.doesNotMatch(V12, /server\/api|drizzle|migration|neon|getAuthTokenProvider|signInWith/);
});

// --- Remediation BLOCKER 1: memory form inputs are wired to draft state ---
test("BLOCKER 1: emotion radio + textarea are bound to memory draft state", () => {
  // radio uses controlled `checked` + `onChange` → setMemoryDraft("emotion", ...)
  assert.match(V12, /checked=\{appState\.memory\.emotion === e\}/);
  assert.match(V12, /onChange=\{\(ev\) => setMemoryDraft\("emotion", ev\.target\.value\)\}/);
  // textarea uses controlled `value` + `onChange` → setMemoryDraft("note", ...)
  assert.match(V12, /value=\{appState\.memory\.note\}/);
  assert.match(V12, /onChange=\{\(ev\) => setMemoryDraft\("note", ev\.target\.value\)\}/);
  // submitMemory reads the actual draft (not a hardcoded default)
  assert.match(V12, /const selectedEmotion = appState\.memory\.emotion;/);
  assert.match(V12, /const memoNote = appState\.memory\.note\.trim\(\);/);
});

// --- Remediation BLOCKER 2: reload must NOT resurrect durable claims ---
test("BLOCKER 2: reload strips localStorage durable claims (fail-closed)", () => {
  // Initialization sets saved:false for both even when localStorage had saved:true.
  assert.match(V12, /saved: false, \/\/ fail-closed: never trust localStorage for durable saved/);
  assert.match(V12, /saved: false, \/\/ fail-closed/);
  // canonical is reset to null (never restored from localStorage).
  assert.match(V12, /canonical: null, \/\/ fail-closed: never restore canonical from localStorage/);
  // connection memoryId is intentionally dropped on reload.
  assert.match(V12, /\/\/ memoryId intentionally omitted — requires canonical revalidation/);
});

// --- Remediation BLOCKER 3: subsequent Moment POST carries stable clientKey ---
test("BLOCKER 3: subsequent Moment POST sends stable clientKey, retired after confirmed ID", () => {
  // key is created before the attempt and reused.
  assert.match(V12, /const clientKey = ensureSubsequentClientKey\(\);/);
  assert.match(V12, /clientKey,/);
  // key is retired only after a confirmed canonical returned memory id.
  assert.match(V12, /retireSubsequentClientKey\(\);/);
  assert.match(V12, /\/\/ Confirmed canonical returned memory ID → retire the pending key\./);
});

// --- Remediation BLOCKER 4: first-save preserves FirstMoment presentation ---
test("BLOCKER 4: first-save success preserves FirstMoment presentation semantics", () => {
  const branch = V12.slice(V12.indexOf("// Only after BOTH canonical IDs exist"), V12.indexOf("showToast(\"첫 순간이 심어졌어요"));
  for (const field of ["url", "videoId", "title", "note", "discoveryDate", "thumbnail"]) {
    assert.match(branch, new RegExp(`\\b${field}:`), `FirstMoment.${field} is populated on success`);
  }
  assert.match(branch, /saved: true/);
});
