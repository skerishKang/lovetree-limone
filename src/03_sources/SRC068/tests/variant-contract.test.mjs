/**
 * SRC068 Variant Contract Tests
 * 
 * Validates:
 * - Valid variant A resolves correctly
 * - Valid variant B resolves correctly
 * - Invalid variant fails closed (throws)
 * - null fails closed
 * - undefined fails closed
 * - Empty string fails closed
 * - Image count is exactly 9 for both variants
 * - Image paths follow expected pattern
 */

import contractExports from "../split/variant-contract.cjs";

const { resolveVariant, isValidVariant, VALID_VARIANTS, VARIANT_ASSETS } = contractExports;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    failed++;
    console.log(`  ✗ FAIL: ${message} (did not throw)`);
  } catch (e) {
    passed++;
    console.log(`  ✓ ${message} (threw: ${e.message.substring(0, 60)}...)`);
  }
}

console.log("\n=== SRC068 Variant Contract Tests ===\n");

// Valid variants
console.log("Valid variant resolution:");
const resultA = resolveVariant("A");
assert(resultA.variant === "A", 'resolveVariant("A") returns variant "A"');
assert(resultA.name === "신비혼혈형", 'resolveVariant("A") returns name "신비혼혈형"');
assert(Array.isArray(resultA.images) && resultA.images.length === 9, 'resolveVariant("A") returns 9 images');
assert(resultA.images[0] === "../images/01.png", 'Variant A first image is "../images/01.png"');
assert(resultA.images[8] === "../images/09.png", 'Variant A last image is "../images/09.png"');

const resultB = resolveVariant("B");
assert(resultB.variant === "B", 'resolveVariant("B") returns variant "B"');
assert(resultB.name === "동양인형", 'resolveVariant("B") returns name "동양인형"');
assert(Array.isArray(resultB.images) && resultB.images.length === 9, 'resolveVariant("B") returns 9 images');
assert(resultB.images[0] === "../images/동양인01.png", 'Variant B first image is "../images/동양인01.png"');
assert(resultB.images[8] === "../images/동양인09.png", 'Variant B last image is "../images/동양인09.png"');

// Fail-closed for invalid inputs
console.log("\nFail-closed behavior:");
assertThrows(() => resolveVariant("C"), 'resolveVariant("C") throws');
assertThrows(() => resolveVariant(""), 'resolveVariant("") throws');
assertThrows(() => resolveVariant(null), 'resolveVariant(null) throws');
assertThrows(() => resolveVariant(undefined), 'resolveVariant(undefined) throws');
assertThrows(() => resolveVariant(1), 'resolveVariant(1) throws');
assertThrows(() => resolveVariant("a"), 'resolveVariant("a") (lowercase) throws');
assertThrows(() => resolveVariant("AB"), 'resolveVariant("AB") throws');

// isValidVariant
console.log("\nisValidVariant checks:");
assert(isValidVariant("A") === true, 'isValidVariant("A") is true');
assert(isValidVariant("B") === true, 'isValidVariant("B") is true');
assert(isValidVariant("C") === false, 'isValidVariant("C") is false');
assert(isValidVariant(null) === false, 'isValidVariant(null) is false');

// Constants
console.log("\nConstant validation:");
assert(VALID_VARIANTS.length === 2, 'VALID_VARIANTS has exactly 2 entries');
assert(VALID_VARIANTS.includes("A") && VALID_VARIANTS.includes("B"), 'VALID_VARIANTS contains A and B');
assert(Object.keys(VARIANT_ASSETS).length === 2, 'VARIANT_ASSETS has exactly 2 entries');

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
