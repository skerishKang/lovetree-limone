import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { verifyExactAssetFingerprint } from "../lib/design-runtime/exact-asset.ts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function writeUint32BE(data, offset, value) {
  data[offset] = (value >>> 24) & 0xff;
  data[offset + 1] = (value >>> 16) & 0xff;
  data[offset + 2] = (value >>> 8) & 0xff;
  data[offset + 3] = value & 0xff;
}

function pngHeader(width = 10, height = 20, colorType = 6) {
  const data = new Uint8Array(33);
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  writeUint32BE(data, 8, 13);
  data.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  writeUint32BE(data, 16, width);
  writeUint32BE(data, 20, height);
  data[24] = 8; // bit depth
  data[25] = colorType;
  data[26] = 0; // compression
  data[27] = 0; // filter
  data[28] = 0; // interlace
  // Four zero CRC bytes are sufficient for bounded identity parsing.
  return data;
}

function fingerprint(data, overrides = {}) {
  const png = overrides.png ?? { width: 10, height: 20, mode: "RGBA" };
  return {
    bytes: overrides.bytes ?? data.byteLength,
    sha256: overrides.sha256 ?? HASH_A,
    png,
  };
}

test("P8 exact-asset core — exact PNG byte/hash/dimension/mode match passes", () => {
  const data = pngHeader();
  const result = verifyExactAssetFingerprint(fingerprint(data), { data, sha256: HASH_A });

  assert.equal(result.ok, true);
  assert.deepEqual(result.mismatches, []);
  assert.deepEqual(result.png, { width: 10, height: 20, colorType: 6, mode: "RGBA" });
});

test("P8 exact-asset core — RGB color type is identified when declared", () => {
  const data = pngHeader(12, 18, 2);
  const result = verifyExactAssetFingerprint(
    fingerprint(data, { png: { width: 12, height: 18, mode: "RGB" } }),
    { data, sha256: HASH_A },
  );

  assert.equal(result.ok, true);
  assert.equal(result.png?.mode, "RGB");
});

test("P8 exact-asset core — malformed fingerprint fails closed", () => {
  const data = pngHeader();
  const result = verifyExactAssetFingerprint(
    { bytes: data.byteLength, sha256: HASH_A.toUpperCase(), png: { width: 10, height: 20 } },
    { data, sha256: HASH_A },
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.mismatches.map((item) => item.code), ["INVALID_FINGERPRINT"]);
  assert.match(result.mismatches[0].message, /64 lowercase hexadecimal/);
});

test("P8 exact-asset core — malformed observation fails closed", () => {
  const data = pngHeader();
  const result = verifyExactAssetFingerprint(fingerprint(data), { data: [...data], sha256: HASH_A });

  assert.equal(result.ok, false);
  assert.deepEqual(result.mismatches.map((item) => item.code), ["INVALID_OBSERVATION"]);
});

test("P8 exact-asset core — exact byte mismatch is reported", () => {
  const data = pngHeader();
  const result = verifyExactAssetFingerprint(
    fingerprint(data, { bytes: data.byteLength + 1 }),
    { data, sha256: HASH_A },
  );

  assert.equal(result.ok, false);
  assert.equal(result.mismatches[0].code, "BYTES_MISMATCH");
  assert.equal(result.mismatches[0].message, `bytes ${data.byteLength} != ${data.byteLength + 1}`);
});

test("P8 exact-asset core — SHA-256 mismatch is exact and case-sensitive", () => {
  const data = pngHeader();
  const result = verifyExactAssetFingerprint(
    fingerprint(data, { sha256: HASH_B }),
    { data, sha256: HASH_A },
  );

  assert.equal(result.ok, false);
  assert.equal(result.mismatches[0].code, "SHA256_MISMATCH");
  assert.equal(result.mismatches[0].expected, HASH_B);
  assert.equal(result.mismatches[0].actual, HASH_A);
});

test("P8 exact-asset core — invalid PNG signature fails closed", () => {
  const data = pngHeader();
  data[0] = 0;
  const result = verifyExactAssetFingerprint(fingerprint(data), { data, sha256: HASH_A });

  assert.equal(result.ok, false);
  assert.equal(result.mismatches.at(-1).code, "INVALID_PNG");
  assert.match(result.mismatches.at(-1).message, /not a PNG/);
  assert.equal(result.png, null);
});

test("P8 exact-asset core — malformed IHDR fails closed", () => {
  const data = pngHeader();
  data[15] = 0;
  const result = verifyExactAssetFingerprint(fingerprint(data), { data, sha256: HASH_A });

  assert.equal(result.ok, false);
  assert.equal(result.mismatches.at(-1).code, "INVALID_PNG");
  assert.match(result.mismatches.at(-1).message, /IHDR/);
});

test("P8 exact-asset core — dimension mismatch is reported as one stable reason", () => {
  const data = pngHeader(9, 21, 6);
  const result = verifyExactAssetFingerprint(fingerprint(data), { data, sha256: HASH_A });

  assert.equal(result.ok, false);
  assert.deepEqual(result.mismatches.map((item) => item.code), ["DIMENSIONS_MISMATCH"]);
  assert.equal(result.mismatches[0].message, "dimensions 9x21 != 10x20");
});

test("P8 exact-asset core — optional mode mismatch is fail-closed", () => {
  const data = pngHeader(10, 20, 2);
  const result = verifyExactAssetFingerprint(fingerprint(data), { data, sha256: HASH_A });

  assert.equal(result.ok, false);
  assert.deepEqual(result.mismatches.map((item) => item.code), ["MODE_MISMATCH"]);
  assert.equal(result.mismatches[0].message, "mode RGB != RGBA");
});

test("P8 exact-asset core — undeclared mode does not invent a color policy", () => {
  const data = pngHeader(10, 20, 0); // grayscale source is still a valid PNG identity
  const result = verifyExactAssetFingerprint(
    fingerprint(data, { png: { width: 10, height: 20 } }),
    { data, sha256: HASH_A },
  );

  assert.equal(result.ok, true);
  assert.equal(result.png?.mode, null);
  assert.equal(result.png?.colorType, 0);
});

test("P8 exact-asset core — mismatch ordering is deterministic", () => {
  const data = pngHeader(9, 21, 2);
  const result = verifyExactAssetFingerprint(
    fingerprint(data, {
      bytes: data.byteLength + 5,
      sha256: HASH_B,
      png: { width: 10, height: 20, mode: "RGBA" },
    }),
    { data, sha256: HASH_A },
  );

  assert.deepEqual(result.mismatches.map((item) => item.code), [
    "BYTES_MISMATCH",
    "SHA256_MISMATCH",
    "DIMENSIONS_MISMATCH",
    "MODE_MISMATCH",
  ]);
});

test("P8 exact-asset core — caller fingerprint and bytes are never mutated", () => {
  const data = pngHeader();
  const before = Uint8Array.from(data);
  const png = Object.freeze({ width: 10, height: 20, mode: "RGBA" });
  const declared = Object.freeze({ bytes: data.byteLength, sha256: HASH_A, png });
  const observed = Object.freeze({ data, sha256: HASH_A });

  const result = verifyExactAssetFingerprint(declared, observed);

  assert.equal(result.ok, true);
  assert.deepEqual(data, before);
  assert.deepEqual(declared, { bytes: 33, sha256: HASH_A, png: { width: 10, height: 20, mode: "RGBA" } });
});

test("P8 exact-asset core — reusable module imports no fs/path/process/network/Lineage policy", () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, "../lib/design-runtime/exact-asset.ts"), "utf8");

  assert.doesNotMatch(source, /from\s+["']node:(?:fs|path|crypto|http|https|net)/);
  assert.doesNotMatch(source, /\bprocess\./);
  assert.doesNotMatch(source, /\bdriveId\b|LINEAGE_\d|holdMarker|targetPath/);
});
