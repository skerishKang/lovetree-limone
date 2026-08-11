import { existsSync } from "node:fs";

export const GLOBAL_ORCHESTRATION_PREFIXES = Object.freeze([
  ".github/workflows/design-fidelity-validation.yml",
  "scripts/design-fidelity-validation-registry.mjs",
  "scripts/plan-design-fidelity-validation.mjs",
  "scripts/run-design-fidelity-target.mjs",
  "tests/design-fidelity-validation-orchestration.test.mjs",
]);

export const DESIGN_FIDELITY_TARGETS = Object.freeze([
  {
    id: "lineage-52-v3",
    label: "Lineage 52 V3",
    route: "/design-lab/lineages/52/v3",
    validationClass: "source-fidelity",
    impactPrefixes: [
      "app/design-lab/lineages/52/",
      "app/styles/lineage-52",
      "lib/lineage-52",
      "reference/lineage-52",
      "public/reference/lineage-52",
      "scripts/lineage-52",
      "tests/lineage-52",
      "docs/product/lineages/52",
    ],
    assetGate: null,
    browserGates: ["tests/lineage-52-route-browser-qa.test.mjs"],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: [],
  },
  {
    id: "lineage-53-v2",
    label: "Lineage 53 V2",
    route: "/design-lab/lineages/53/v2",
    validationClass: "source-fidelity",
    impactPrefixes: [
      "app/design-lab/lineages/53/",
      "app/styles/lineage-53",
      "lib/lineage-53",
      "reference/lineage-53",
      "public/reference/lineage-53",
      "scripts/lineage-53",
      "tests/lineage-53",
      "docs/product/lineages/53",
    ],
    assetGate: null,
    browserGates: ["tests/lineage-53-v2-route-browser-qa.test.mjs"],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: [],
  },
  {
    id: "lineage-54-v4",
    label: "Lineage 54 V4 Petal Runner",
    route: "/design-lab/lineages/54/v4",
    validationClass: "source-fidelity",
    impactPrefixes: [
      "app/design-lab/lineages/54/",
      "app/styles/lineage-54",
      "lib/lineage-54",
      "reference/lineage-54",
      "public/reference/lineage-54",
      "scripts/verify-lineage-54-assets.mjs",
      "tests/lineage-54",
      "docs/product/lineages/54",
    ],
    assetGate: {
      verifier: "scripts/verify-lineage-54-assets.mjs",
      expectedMarker: "LINEAGE_54_EXACT_ASSET_GATE_PASS",
    },
    browserGates: ["tests/lineage-54-route-browser-qa.mjs"],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: ["/tmp/lineage-54-browser-qa"],
  },
  {
    id: "lineage-56-v3",
    label: "Lineage 56 V3 Crystal Memory Atelier",
    route: "/design-lab/lineages/56/v3",
    validationClass: "source-fidelity",
    impactPrefixes: [
      "app/design-lab/lineages/56/",
      "app/styles/lineage-56",
      "lib/lineage-56",
      "reference/lineage-56",
      "public/reference/lineage-56",
      "scripts/verify-lineage-56-assets.mjs",
      "tests/lineage-56",
      "docs/product/lineages/56",
    ],
    assetGate: {
      verifier: "scripts/verify-lineage-56-assets.mjs",
      expectedMarker: "LINEAGE_56_EXACT_ASSET_GATE_PASS",
    },
    browserGates: ["tests/lineage-56-route-browser-qa.mjs"],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: [],
  },
  {
    id: "lineage-57-v2",
    label: "Lineage 57 V2 Living Character World",
    route: "/design-lab/lineages/57/v2",
    validationClass: "source-fidelity",
    impactPrefixes: [
      "app/design-lab/lineages/57/",
      "app/styles/lineage-57",
      "lib/lineage-57",
      "reference/lineage-57",
      "public/reference/lineage-57",
      "scripts/verify-lineage-57-assets.mjs",
      "tests/lineage-57",
      "docs/product/lineages/57",
    ],
    assetGate: {
      verifier: "scripts/verify-lineage-57-assets.mjs",
      expectedMarker: "LINEAGE_57_EXACT_ASSET_GATE_PASS",
    },
    browserGates: ["tests/lineage-57-route-browser-qa.mjs"],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
      { width: 320, height: 720, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: [],
  },
  {
    id: "lineage-58-v2",
    label: "Lineage 58 V2 VideoFigure Atelier",
    route: "/design-lab/lineages/58/v2",
    validationClass: "source-fidelity",
    impactPrefixes: [
      "app/design-lab/lineages/58/",
      "app/styles/lineage-58",
      "lib/lineage-58",
      "lib/videofigure-turntable",
      "reference/lineage-58",
      "public/design-lab/lineages/58",
      "scripts/verify-lineage-58-videofigure-assets.mjs",
      "tests/lineage-58",
      "docs/product/lineages/58",
    ],
    assetGate: {
      verifier: "scripts/verify-lineage-58-videofigure-assets.mjs",
      expectedMarker: "LINEAGE_58_VIDEOFIGURE_EXACT_ASSETS_PASS",
    },
    browserGates: ["tests/lineage-58-route-browser-qa.mjs"],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
      { width: 320, height: 720, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: ["test-results/lineage-58-videofigure"],
  },
  {
    id: "memory-anatomy",
    label: "Memory Anatomy capability",
    route: "/design-lab/capabilities/memory-anatomy",
    validationClass: "interaction-contract",
    impactPrefixes: [
      "app/design-lab/capabilities/memory-anatomy/",
      "app/styles/memory-anatomy",
      "lib/memory-anatomy",
      "tests/memory-anatomy",
      "docs/product/capabilities/MEMORY_ANATOMY",
    ],
    assetGate: null,
    browserGates: ["tests/memory-anatomy-route-browser-qa.test.mjs"],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
      { width: 320, height: 720, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: [],
  },
  {
    id: "moment-orbit-carousel",
    label: "Moment Orbit Carousel capability",
    route: "/design-lab/capabilities/moment-orbit-carousel",
    validationClass: "interaction-contract",
    impactPrefixes: [
      "app/design-lab/capabilities/moment-orbit-carousel/",
      "app/styles/moment-orbit-carousel",
      "lib/moment-orbit-carousel",
      "tests/moment-orbit-carousel",
      "docs/product/capabilities/MOMENT_ORBIT_CAROUSEL",
    ],
    assetGate: null,
    browserGates: [
      "tests/moment-orbit-carousel-browser-qa.mjs",
      "tests/moment-orbit-carousel-inspector-open-qa.mjs",
    ],
    viewports: [
      { width: 1280, height: 800 },
      { width: 390, height: 844, mobile: true },
      { width: 320, height: 720, mobile: true },
    ],
    captureReducedMotion: true,
    extraEvidencePaths: ["test-results/moment-orbit-carousel"],
  },
]);

function matchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(prefix);
}

export function getDesignFidelityTarget(id) {
  return DESIGN_FIDELITY_TARGETS.find((target) => target.id === id) ?? null;
}

export function targetIsMaterialized(target, cwd = process.cwd()) {
  const required = [
    ...target.browserGates,
    ...(target.assetGate ? [target.assetGate.verifier] : []),
  ];
  return required.every((relativePath) => existsSync(`${cwd}/${relativePath}`));
}

export function selectImpactedTargets(changedPaths, cwd = process.cwd()) {
  const normalized = [...new Set(changedPaths.filter(Boolean))];
  const globalChange = normalized.some((path) =>
    GLOBAL_ORCHESTRATION_PREFIXES.some((prefix) => matchesPrefix(path, prefix)),
  );

  return DESIGN_FIDELITY_TARGETS.filter((target) => {
    const directImpact = normalized.some((path) =>
      target.impactPrefixes.some((prefix) => matchesPrefix(path, prefix)),
    );

    if (directImpact) return true;
    return globalChange && targetIsMaterialized(target, cwd);
  });
}
