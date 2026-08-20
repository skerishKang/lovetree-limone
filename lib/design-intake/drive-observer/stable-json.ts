/**
 * Deterministic stable JSON serializer (Issue #173 shadow decision layer).
 *
 * #243's live observer prints observations with `redactDeep` + `JSON.stringify`,
 * but there is NO canonical/byte-identical serializer anywhere in the
 * drive-observer namespace. The shadow decision layer needs deterministic
 * serialization for two reasons:
 *   - PROPERTY 10: serialize → parse → normalize must preserve the decision;
 *   - a PASS seal / check payload must be byte-identical for the same input so
 *     a re-published decision cannot drift.
 *
 * Rules:
 * - object keys emitted in fixed canonical (lexicographic) order;
 * - arrays emitted in their given order (callers sort where it matters);
 * - SHA-256 / Drive ids are NOT mutated here (the observation already
 *   lowercases content hashes); this serializer only canonicalizes STRUCTURE;
 * - no wall-clock time or random ids are injected by the serializer itself;
 * - 2-space indentation, LF-only, no trailing whitespace, no BOM.
 */

const INDENT = "  ";

/** Canonical key order: lexicographic by UTF-16 code unit (stable across runs). */
function canonicalKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).sort();
}

function escapeString(value: string): string {
  let out = '"';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const ch = value[i];
    switch (ch) {
      case '"':
        out += '\\"';
        break;
      case "\\":
        out += "\\\\";
        break;
      case "\b":
        out += "\\b";
        break;
      case "\f":
        out += "\\f";
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      default:
        if (code < 0x20) {
          out += `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          out += ch;
        }
    }
  }
  out += '"';
  return out;
}

function serializeValue(value: unknown, depth: number): string {
  if (value === null || value === undefined) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return Number.isFinite(value) ? String(value) : "null";
    case "string":
      return escapeString(value);
    case "bigint":
      return String(value);
    case "object": {
      if (Array.isArray(value)) {
        if (value.length === 0) return "[]";
        const pad = INDENT.repeat(depth + 1);
        const close = INDENT.repeat(depth);
        const items = value.map((item) => `${pad}${serializeValue(item, depth + 1)}`);
        return `[\n${items.join(",\n")}\n${close}]`;
      }
      const obj = value as Record<string, unknown>;
      const keys = canonicalKeys(obj);
      if (keys.length === 0) return "{}";
      const pad = INDENT.repeat(depth + 1);
      const close = INDENT.repeat(depth);
      const items = keys.map(
        (key) => `${pad}${escapeString(key)}: ${serializeValue(obj[key], depth + 1)}`,
      );
      return `{\n${items.join(",\n")}\n${close}}`;
    }
    default:
      return "null";
  }
}

/**
 * Serialize a value to byte-identical JSON for the same logical input.
 * `undefined` is normalized to `null` (lossless for round-trip comparison).
 */
export function stableStringify(value: unknown): string {
  return serializeValue(value, 0);
}

/** Parse + re-serialize — verifies deterministic round-trip (PROPERTY 10). */
export function stableParseAndReserialize(json: string): string {
  return stableStringify(JSON.parse(json));
}

/**
 * Structural equality via canonical serialization. Two values are logically
 * equal iff their stable serializations are byte-identical.
 */
export function stableEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
