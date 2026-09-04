/**
 * Capture-surface disposition for SINGLE authority Sources.
 *
 * The shared baseline/parity capture harnesses serve a Source from its own
 * repository path (/SRCxxx/original.html and /SRCxxx/split/index.html) and drive
 * it through the generic single-executable contract. That is only sound for a
 * Source whose runtime surface IS that single file.
 *
 * Some Sources are path-context-sensitive: their own relative URLs only resolve
 * from a canonical external directory depth, so neither original/original.html
 * nor split/index.html is a valid standalone runtime surface at its repository
 * path. For those, capture must fail closed with an explicit SKIP rather than
 * produce a green-but-wrong artifact or attempt a parity promotion the Source
 * cannot support.
 *
 * DUAL_VARIANT Sources never reach this helper: they are handled by
 * dual-variant-mechanical.mjs, which owns its own SKIP dispositions.
 *
 * The flag is opt-in and read from manifest metadata only. SINGLE Sources that
 * do not declare capture_surface are unaffected and keep the existing generic
 * capture behavior.
 */

export const CAPTURE_SURFACE_MODES = Object.freeze({
  SINGLE_EXECUTABLE: 'SINGLE_EXECUTABLE',
  CONTEXT_AWARE_ONLY: 'CONTEXT_AWARE_ONLY',
});

export const CAPTURE_SKIP_REASONS = Object.freeze({
  CONTEXT_AWARE_ONLY: 'CONTEXT_AWARE_SURFACE_ONLY',
});

export function getCaptureSurfaceDisposition({ manifest }) {
  if (manifest?.authority_mode === 'DUAL_VARIANT') return null;
  const mode = manifest?.capture_surface?.mode;
  if (mode === CAPTURE_SURFACE_MODES.CONTEXT_AWARE_ONLY) {
    return {
      action: 'SKIP',
      reason: CAPTURE_SKIP_REASONS.CONTEXT_AWARE_ONLY,
      mode,
      required_serving: manifest?.capture_surface?.required_serving ?? null,
    };
  }
  return null;
}
