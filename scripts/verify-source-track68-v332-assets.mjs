// Source Track 68 V3.3.2 — exact asset verifier.
//
// Verifies that every pinned source artifact (3 HTML + 18 PNG + 2 hero MP4)
// served from the public assets directory matches the exact bytes and
// SHA-256 recorded in the Issue #244 source-authority closure ledger.
//
// Run:
//   node scripts/verify-source-track68-v332-assets.mjs
//
// Exit 0 = all assets exact. Exit 1 = any mismatch (fail-closed).

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSET_BASE = "public/design-lab-assets/source-tracks/68/v3-3-2/compare";

const LEDGER = [
  // ── 3 HTML ──
  { rel: "html/68_V3.3.2_COMPARE_LAUNCHER_ENGLISH.html", bytes: 2670, sha256: "31637f6ffd49a280cded499e6c1a65fda79f0647561bdfd83d4696332129d8c8", role: "launcher" },
  { rel: "html/68_V3.3.1A_신비혼혈형_CODEX_PORTALS_C14FIX.html", bytes: 18565, sha256: "9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42", role: "variant-A" },
  { rel: "html/68_V3.3.1B_동양인형_CODEX_PORTALS_C14FIX.html", bytes: 18646, sha256: "cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004", role: "variant-B" },

  // ── 9 A images ──
  { rel: "images/01.png", bytes: 1864548, sha256: "9471f5dee67354e48d8495ab4572b6aca693d896de64567b7c9530b3d33907fc", role: "image-A" },
  { rel: "images/02.png", bytes: 2031825, sha256: "5e35a017293e98d9f5bff4fefa8733ac4af8b555408274540a15375084f27c81", role: "image-A" },
  { rel: "images/03.png", bytes: 1860675, sha256: "9d52f8f58110274143dcb1e9b0726a2b74677fb00bbbcb9f714cf02a19be4936", role: "image-A" },
  { rel: "images/04.png", bytes: 1842341, sha256: "816df9ea5689ccbe1126d1ae08379710280ba7a4f4c977be8e6929f6d1071221", role: "image-A" },
  { rel: "images/05.png", bytes: 1459649, sha256: "78493b5fa6caa5697d489048133330d01b4ad748c2af751751581b5cbab2cc5e", role: "image-A" },
  { rel: "images/06.png", bytes: 1734205, sha256: "fb46e4bf7b155648b26b1e898949c6d60e9957b9724a8c7f93372188ac02e699", role: "image-A" },
  { rel: "images/07.png", bytes: 1773216, sha256: "90778997f43589132ade524d9a2965314330989d9e88e8d5e8a73f7d7f2faefa", role: "image-A" },
  { rel: "images/08.png", bytes: 1908180, sha256: "0626c2b6ea5240cc022a3769a14c3dd632334c1ccd5f0b622dd8b8298cce43d6", role: "image-A" },
  { rel: "images/09.png", bytes: 1715727, sha256: "49696b6485e17eb08e07c3c5fda10ae3e7014940b8c2baf66ed58b3ae093c0e9", role: "image-A" },

  // ── 9 B images ──
  { rel: "images/동양인01.png", bytes: 1813828, sha256: "5bc21565a6367be631e25012e54c71de74cf459c0495a4f6f397a18a1c8fc715", role: "image-B" },
  { rel: "images/동양인02.png", bytes: 1871481, sha256: "eabfa7d9e4d0fe6ce7f7caeab6fa23ef8a8b83c511f960e2ca23baa699a38d94", role: "image-B" },
  { rel: "images/동양인03.png", bytes: 2035128, sha256: "b65cbcc1b1b15d1993bd8b87ed482dd6590e9cd84816e5cee146784435b85e6b", role: "image-B" },
  { rel: "images/동양인04.png", bytes: 1478799, sha256: "0e92bf16b68660ac93fdebf455bd01e1281c3e01f713be018dd84c78b70a57a6", role: "image-B" },
  { rel: "images/동양인05.png", bytes: 1715876, sha256: "6925327b7fa8722dc79c8b831ad566fb9299deb36c285450e029b94962d65e44", role: "image-B" },
  { rel: "images/동양인06.png", bytes: 2074268, sha256: "cae1b06cde3c94a5ae778a718dabc169a51d2deac3c5e1cef56d30f34a7adf87", role: "image-B" },
  { rel: "images/동양인07.png", bytes: 1843218, sha256: "843b7417df49ee6c5b7ecb49ab54aec9038563740f3602a1d48fa19ec8221fd3", role: "image-B" },
  { rel: "images/동양인08.png", bytes: 1777216, sha256: "2d2f7151e4ebf6154b2f543a73537c95693735d90daf60062e67162548c95024", role: "image-B" },
  { rel: "images/동양인09.png", bytes: 1792944, sha256: "4529a55ec3996856afb71f91f630de7590763578bf342d2cbee5ba9f07a3b7df", role: "image-B" },

  // ── 2 hero MP4 ──
  { rel: "video/hero_left.mp4", bytes: 2485522, sha256: "2b898552691e6562c255ed18fd318979134eec4c7005647336e3390187a1cb59", role: "hero-left" },
  { rel: "video/hero_right.mp4", bytes: 2265192, sha256: "e70bbeea35a13c55f92942f1dbd8d2fcc097921b33def0bec3fafa2eedb65500", role: "hero-right" },
];

let pass = 0;
let fail = 0;

console.log("Source Track 68 V3.3.2 — exact asset verifier");
console.log(`Checking ${LEDGER.length} pinned assets at ${ASSET_BASE}\n`);

for (const entry of LEDGER) {
  const fullPath = join(ASSET_BASE, entry.rel);
  try {
    const buf = await readFile(fullPath);
    const bytes = buf.byteLength;
    const sha256 = createHash("sha256").update(buf).digest("hex");

    const bytesOk = bytes === entry.bytes;
    const shaOk = sha256 === entry.sha256;

    if (bytesOk && shaOk) {
      pass++;
      console.log(`  PASS  ${entry.role.padEnd(12)} ${entry.rel} (${bytes} B)`);
    } else {
      fail++;
      console.error(`  FAIL  ${entry.role.padEnd(12)} ${entry.rel}`);
      if (!bytesOk) console.error(`        bytes: got ${bytes}, expected ${entry.bytes}`);
      if (!shaOk) console.error(`        sha256: got ${sha256}, expected ${entry.sha256}`);
    }
  } catch (err) {
    fail++;
    console.error(`  FAIL  ${entry.role.padEnd(12)} ${entry.rel} — ${err && err.message ? err.message : String(err)}`);
  }
}

console.log(`\nRESULT: ${pass}/${LEDGER.length} PASS, ${fail} FAIL`);

if (fail > 0) {
  console.error("\nFAIL-CLOSED: exact source assets are not all present or do not match.");
  process.exit(1);
} else {
  console.log("\nALL PINNED — exact source assets verified.");
  process.exit(0);
}
