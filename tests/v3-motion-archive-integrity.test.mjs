import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const EXPECTED = {
  "lovetree-liquid-orbit-video-gallery.html": {
    sha256: "ca96061286d47047b73dee0addf7c4dc09c86def0bae644e49be8422fee8ccbb",
    size: 219889,
  },
  "lovetree-motion-archive-v5-video-click-autoplay.html": {
    sha256: "c4297518897762b5b65063e6b1a6046e482a5964ae5df90fc942df055be1a178",
    size: 41025,
  },
  "lovetree-accordion-album-archive-v3-fixed.html": {
    sha256: "5c02aa02b9c9894a49ce62d919dbfc163a2bc9b802be19eba682be9e46752f77",
    size: 37054,
  },
  "lovetree-folding-person-archive.html": {
    sha256: "762d1bd3d332e22d5d2ebd113c5a2163506a6f80e5696d830408d6712fe06c64",
    size: 88870,
  },
};

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(new URL(dir, root), { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      await walk(path, acc);
    } else {
      acc.push(path);
    }
  }
  return acc;
}

// 1. exact byte-identical preservation verified by hashing actual file bytes
test("all four sibling prototypes match their exact SHA-256 and byte size", async () => {
  for (const [file, expected] of Object.entries(EXPECTED)) {
    const buf = await readFile(new URL(`reference/v3/sibling-prototypes/${file}`, root));
    const actualSha = createHash("sha256").update(buf).digest("hex");
    assert.equal(actualSha, expected.sha256, `${file} SHA-256 mismatch`);
    assert.equal(buf.byteLength, expected.size, `${file} byte size mismatch`);
  }
});

// 2. inventory document is complete
test("sibling prototype inventory lists every file with SHA-256 and size", async () => {
  const inventory = await readFile(
    new URL("reference/v3/sibling-prototypes/INVENTORY.md", root),
    "utf8",
  );
  for (const [file, expected] of Object.entries(EXPECTED)) {
    assert.ok(inventory.includes(file), `${file} must appear in the inventory`);
    assert.ok(inventory.includes(expected.sha256), `${file} SHA-256 must appear in the inventory`);
    const sizePattern = new RegExp(String(expected.size));
    assert.ok(
      inventory.replace(/,/g, "").match(sizePattern) !== null,
      `${file} byte size must appear in the inventory`,
    );
  }
  assert.match(inventory, /reference prototypes[\s\S]*?not runtime product[\s\S]*?source/i);
  assert.match(inventory, /Telegram handoff/i);
});

// 3. originals are never placed under public
test("sibling originals are not shipped under public", async () => {
  const publicFiles = await walk("public");
  for (const file of Object.keys(EXPECTED)) {
    assert.ok(
      !publicFiles.some((path) => path.endsWith(file)),
      `${file} must not be under public/`,
    );
  }
});

// 4. originals are not exposed as app routes
test("sibling originals are not exposed as app routes", async () => {
  const appFiles = await walk("app");
  for (const file of Object.keys(EXPECTED)) {
    assert.ok(
      !appFiles.some((path) => path.endsWith(file)),
      `${file} must not be an app route`,
    );
  }
});

// 5. runtime product code never iframes or inlines the originals
test("runtime product code never iframes or inlines the originals", async () => {
  const appFiles = await walk("app");
  const tsxFiles = appFiles.filter((path) => path.endsWith(".tsx") || path.endsWith(".ts"));
  for (const path of tsxFiles) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.doesNotMatch(source, /sibling-prototypes/, `${path} must not reference the originals`);
    assert.doesNotMatch(
      source,
      /dangerouslySetInnerHTML[\s\S]{0,80}reference\//,
      `${path} must not inject reference HTML`,
    );
  }
});

// 6. each original file has a line count and HTML title recorded
test("inventory records line counts and HTML titles", async () => {
  const inventory = await readFile(
    new URL("reference/v3/sibling-prototypes/INVENTORY.md", root),
    "utf8",
  );
  const files = await Promise.all(
    Object.keys(EXPECTED).map(async (file) => {
      const buf = await readFile(new URL(`reference/v3/sibling-prototypes/${file}`, root), "utf8");
      return {
        file,
        lines: (buf.match(/\n/g) ?? []).length,
        title: buf.match(/<title>([^<]*)<\/title>/)?.[1] ?? "",
      };
    }),
  );
  for (const item of files) {
    assert.ok(inventory.includes(String(item.lines)), `${item.file} line count must be recorded`);
    assert.ok(inventory.includes(item.title), `${item.file} title must be recorded`);
  }
});
