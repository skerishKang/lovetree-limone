/**
 * SRC068 Variant Contract
 * 
 * DUAL_MEDIA_VARIANT policy: both A and B are retained.
 * Product adapter sets `mediaVariant` to "A" or "B".
 * Common HTML/CSS/JS/hero-media/layout/animation are shared.
 * Only the 9 image asset references differ.
 * 
 * Contract:
 *   - Valid values: "A" | "B"
 *   - Invalid values: fail closed (throw)
 *   - null/undefined: fail closed (throw)
 * 
 * Usage by Product adapter:
 *   import { resolveVariant, VALID_VARIANTS } from './variant-contract.js';
 *   const assets = resolveVariant("A"); // or "B"
 */

const VALID_VARIANTS = Object.freeze(["A", "B"]);

const VARIANT_ASSETS = Object.freeze({
  A: Object.freeze([
    "../images/01.png",
    "../images/02.png",
    "../images/03.png",
    "../images/04.png",
    "../images/05.png",
    "../images/06.png",
    "../images/07.png",
    "../images/08.png",
    "../images/09.png",
  ]),
  B: Object.freeze([
    "../images/동양인01.png",
    "../images/동양인02.png",
    "../images/동양인03.png",
    "../images/동양인04.png",
    "../images/동양인05.png",
    "../images/동양인06.png",
    "../images/동양인07.png",
    "../images/동양인08.png",
    "../images/동양인09.png",
  ]),
});

const VARIANT_NAMES = Object.freeze({
  A: "신비혼혈형",
  B: "동양인형",
});

/**
 * Resolve a media variant to its image asset list.
 * Fails closed for any invalid input.
 * 
 * @param {"A" | "B"} variant
 * @returns {{ variant: string, name: string, images: readonly string[] }}
 * @throws {Error} if variant is not "A" or "B"
 */
function resolveVariant(variant) {
  if (!VALID_VARIANTS.includes(variant)) {
    throw new Error(
      `SRC068 variant contract violation: invalid variant "${variant}". ` +
      `Valid values: ${VALID_VARIANTS.join(", ")}. ` +
      `Fail-closed policy active.`
    );
  }
  return Object.freeze({
    variant,
    name: VARIANT_NAMES[variant],
    images: VARIANT_ASSETS[variant],
  });
}

/**
 * Check if a variant string is valid without throwing.
 * 
 * @param {string} variant
 * @returns {boolean}
 */
function isValidVariant(variant) {
  return VALID_VARIANTS.includes(variant);
}

// Node.js / ESM exports
if (typeof module !== "undefined" && module.exports) {
  module.exports = { resolveVariant, isValidVariant, VALID_VARIANTS, VARIANT_ASSETS, VARIANT_NAMES };
}
