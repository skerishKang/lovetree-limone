/**
 * P8 — Exact Asset Fingerprint: narrow pure-core extraction from #141 / #192.
 *
 * This module is renderer-neutral, filesystem-neutral and LoveTree-domain-neutral.
 * Callers own file reads, SHA-256 computation, source/provenance policy and
 * Lineage-specific HOLD/PASS reporting. The core only compares immutable caller-
 * declared fingerprint metadata against caller-observed bytes/hash and parses the
 * bounded PNG identity needed by the first proven consumer.
 *
 * Deliberately excluded from this core:
 *   - fs/path/process/CLI behavior
 *   - Google Drive IDs or source-revision policy
 *   - Git blob provenance
 *   - duplicate manifest-entry policy
 *   - Lineage counts/readiness/HOLD markers
 *   - network/download/copy/mutation behavior
 *   - WebP (deferred until a later Lineage57-backed extraction)
 */

export type ExactAssetPngMode = "RGB" | "RGBA";

export interface ExactAssetFingerprint {
  readonly bytes: number;
  readonly sha256: string;
  readonly png: {
    readonly width: number;
    readonly height: number;
    readonly mode?: ExactAssetPngMode;
  };
}

export interface ExactAssetObservation {
  readonly data: Uint8Array;
  readonly sha256: string;
}

export type ExactAssetMismatchCode =
  | "INVALID_FINGERPRINT"
  | "INVALID_OBSERVATION"
  | "BYTES_MISMATCH"
  | "SHA256_MISMATCH"
  | "INVALID_PNG"
  | "DIMENSIONS_MISMATCH"
  | "MODE_MISMATCH";

export interface ExactAssetMismatch {
  readonly code: ExactAssetMismatchCode;
  readonly message: string;
  readonly expected?: string | number;
  readonly actual?: string | number | null;
}

export interface ExactAssetPngIdentity {
  readonly width: number;
  readonly height: number;
  readonly colorType: number;
  readonly mode: ExactAssetPngMode | null;
}

export interface ExactAssetVerificationResult {
  readonly ok: boolean;
  readonly mismatches: readonly ExactAssetMismatch[];
  readonly png: ExactAssetPngIdentity | null;
}

const LOWER_SHA256 = /^[0-9a-f]{64}$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const IHDR = [0x49, 0x48, 0x44, 0x52] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function fingerprintProblem(value: unknown): string | null {
  if (!isRecord(value)) return "fingerprint must be an object";
  if (!isNonNegativeInteger(value.bytes)) return "fingerprint.bytes must be a non-negative integer";
  if (typeof value.sha256 !== "string" || !LOWER_SHA256.test(value.sha256)) {
    return "fingerprint.sha256 must be exactly 64 lowercase hexadecimal characters";
  }
  if (!isRecord(value.png)) return "fingerprint.png must be an object";
  if (!isPositiveInteger(value.png.width)) return "fingerprint.png.width must be a positive integer";
  if (!isPositiveInteger(value.png.height)) return "fingerprint.png.height must be a positive integer";
  if (value.png.mode !== undefined && value.png.mode !== "RGB" && value.png.mode !== "RGBA") {
    return "fingerprint.png.mode must be RGB or RGBA when declared";
  }
  return null;
}

function observationProblem(value: unknown): string | null {
  if (!isRecord(value)) return "observation must be an object";
  if (!(value.data instanceof Uint8Array)) return "observation.data must be a Uint8Array";
  if (typeof value.sha256 !== "string" || !LOWER_SHA256.test(value.sha256)) {
    return "observation.sha256 must be exactly 64 lowercase hexadecimal characters";
  }
  return null;
}

function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    data[offset] * 0x1000000 +
    data[offset + 1] * 0x10000 +
    data[offset + 2] * 0x100 +
    data[offset + 3]
  ) >>> 0;
}

function sameBytes(data: Uint8Array, offset: number, expected: readonly number[]): boolean {
  if (data.byteLength < offset + expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (data[offset + index] !== expected[index]) return false;
  }
  return true;
}

function parsePngIdentity(data: Uint8Array):
  | { readonly ok: true; readonly identity: ExactAssetPngIdentity }
  | { readonly ok: false; readonly message: string } {
  // Signature (8) + IHDR length/type/data (4 + 4 + 13) + CRC (4).
  if (data.byteLength < 33 || !sameBytes(data, 0, PNG_SIGNATURE)) {
    return { ok: false, message: "not a PNG" };
  }
  if (readUint32BE(data, 8) !== 13 || !sameBytes(data, 12, IHDR)) {
    return { ok: false, message: "invalid PNG IHDR" };
  }

  const width = readUint32BE(data, 16);
  const height = readUint32BE(data, 20);
  if (width === 0 || height === 0) {
    return { ok: false, message: "invalid PNG dimensions" };
  }

  const colorType = data[25];
  const mode: ExactAssetPngMode | null = colorType === 2 ? "RGB" : colorType === 6 ? "RGBA" : null;
  return { ok: true, identity: { width, height, colorType, mode } };
}

/**
 * Compare one declared exact-asset fingerprint with one observed binary/hash.
 *
 * Mismatch ordering is stable and intentional:
 * bytes -> sha256 -> PNG identity -> dimensions -> optional mode.
 * Malformed fingerprint/observation shapes fail closed before comparison.
 * Neither caller input object nor the observed Uint8Array is mutated.
 */
export function verifyExactAssetFingerprint(
  fingerprint: unknown,
  observation: unknown,
): ExactAssetVerificationResult {
  const invalidFingerprint = fingerprintProblem(fingerprint);
  if (invalidFingerprint) {
    return {
      ok: false,
      mismatches: [{ code: "INVALID_FINGERPRINT", message: `invalid fingerprint: ${invalidFingerprint}` }],
      png: null,
    };
  }

  const invalidObservation = observationProblem(observation);
  if (invalidObservation) {
    return {
      ok: false,
      mismatches: [{ code: "INVALID_OBSERVATION", message: `invalid observation: ${invalidObservation}` }],
      png: null,
    };
  }

  const expected = fingerprint as ExactAssetFingerprint;
  const observed = observation as ExactAssetObservation;
  const mismatches: ExactAssetMismatch[] = [];

  if (observed.data.byteLength !== expected.bytes) {
    mismatches.push({
      code: "BYTES_MISMATCH",
      message: `bytes ${observed.data.byteLength} != ${expected.bytes}`,
      expected: expected.bytes,
      actual: observed.data.byteLength,
    });
  }

  if (observed.sha256 !== expected.sha256) {
    mismatches.push({
      code: "SHA256_MISMATCH",
      message: `sha256 ${observed.sha256} != ${expected.sha256}`,
      expected: expected.sha256,
      actual: observed.sha256,
    });
  }

  const parsed = parsePngIdentity(observed.data);
  if (!parsed.ok) {
    mismatches.push({ code: "INVALID_PNG", message: parsed.message });
    return { ok: false, mismatches, png: null };
  }

  const identity = parsed.identity;
  if (identity.width !== expected.png.width || identity.height !== expected.png.height) {
    mismatches.push({
      code: "DIMENSIONS_MISMATCH",
      message: `dimensions ${identity.width}x${identity.height} != ${expected.png.width}x${expected.png.height}`,
      expected: `${expected.png.width}x${expected.png.height}`,
      actual: `${identity.width}x${identity.height}`,
    });
  }

  if (expected.png.mode !== undefined && identity.mode !== expected.png.mode) {
    const actualMode = identity.mode ?? `PNG_COLOR_TYPE_${identity.colorType}`;
    mismatches.push({
      code: "MODE_MISMATCH",
      message: `mode ${actualMode} != ${expected.png.mode}`,
      expected: expected.png.mode,
      actual: actualMode,
    });
  }

  return { ok: mismatches.length === 0, mismatches, png: identity };
}
