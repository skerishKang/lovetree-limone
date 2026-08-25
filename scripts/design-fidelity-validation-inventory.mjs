import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  DESIGN_FIDELITY_TARGETS as BASE_TARGETS,
  GLOBAL_ORCHESTRATION_PREFIXES,
  selectImpactedTargets as selectBaseTargets,
  targetIsMaterialized as baseTargetIsMaterialized,
} from "./design-fidelity-validation-registry.mjs";

const VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1280, height: 800 }),
  Object.freeze({ width: 390, height: 844, mobile: true }),
  Object.freeze({ width: 320, height: 720, mobile: true }),
]);

export const SUPPLEMENTAL_DESIGN_FIDELITY_TARGETS = Object.freeze([
  Object.freeze({
    id: "lineage-59-v5",
    label: "Lineage 59 V5 Living Memory Book",
    route: "/design-lab/lineages/59/v5",
    routeEntry: "app/design-lab/lineages/59/v5/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/lineages/59/", "lib/lineage-59",
      "design-intake/manifests/track-59-living-memory-book.json",
      "tests/lineage-59", "qa/design-fidelity/lineage-59-v5-browser-gate.mjs",
    ]),
    assetGate: null,
    exactAssetStatus: "LARGE_ENVIRONMENT_MEDIA_SOURCE_REFERENCE_ONLY; ORIGIN_RIGHTS_PROVENANCE_HOLD",
    browserGates: Object.freeze(["qa/design-fidelity/lineage-59-v5-browser-gate.mjs"]),
    actualRouteBrowserGate: "qa/design-fidelity/lineage-59-v5-browser-gate.mjs",
    dedicatedWorkflow: null,
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze(["qa/evidence/lineage-59"]),
  }),
  Object.freeze({
    id: "lineage-60-v1-2",
    label: "Lineage 60 V1.2 3D Moment Cluster Explorer",
    route: "/design-lab/lineages/60/v1-2",
    routeEntry: "app/design-lab/lineages/60/v1-2/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/lineages/60/", "lib/lineage-60", "design-intake/manifests/track-60",
      "qa/lineage-60-v12-native-browser-qa.mjs", "tests/lineage-60",
      ".github/workflows/lineage60-v12-native-browser-qa.yml",
    ]),
    assetGate: null,
    exactAssetStatus: "NOT_REQUIRED",
    browserGates: Object.freeze(["qa/lineage-60-v12-native-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/lineage-60-v12-native-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/lineage60-v12-native-browser-qa.yml",
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze(["qa/evidence/lineage-60"]),
  }),
  Object.freeze({
    id: "lineage-52-phase2-native",
    label: "Lineage52 Phase2 native spatial primitive proof",
    route: "/design-lab/lineages/52/phase-2",
    routeEntry: "app/design-lab/lineages/52/phase-2/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/lineages/52/phase-2/",
      "lib/lineage-52/",
      "qa/lineage-52-phase2-native-browser-qa.mjs",
      "tests/lineage-52-phase2-",
      ".github/workflows/lineage52-phase2-native-browser-qa.yml",
    ]),
    assetGate: null,
    exactAssetStatus: "NOT_REQUIRED",
    browserGates: Object.freeze(["qa/lineage-52-phase2-native-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/lineage-52-phase2-native-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/lineage52-phase2-native-browser-qa.yml",
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze([]),
  }),
  Object.freeze({
    id: "track-67-v2-4-2-native",
    label: "Track67 V2.4.2 native Memory Tape",
    route: "/design-lab/lineages/67/v2-4/native",
    routeEntry: "app/design-lab/lineages/67/v2-4/native/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/lineages/67/", "app/styles/lineage-67", "lib/lineage-67",
      "design-intake/manifests/track-67", "qa/track67-native-browser-qa.mjs", "tests/track-67",
      ".github/workflows/track67-native-browser-qa.yml",
    ]),
    assetGate: null,
    exactAssetStatus: "V2.4.2_SOURCE_PACKAGE_DEPENDENCY_HOLD_OUTSIDE_NATIVE_INTERACTION_GATE",
    browserGates: Object.freeze(["qa/track67-native-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/track67-native-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/track67-native-browser-qa.yml",
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze(["qa-artifacts/track67-native"]),
  }),
  Object.freeze({
    id: "track-18-v2-source-runner",
    label: "Track18 V2 exact Fragment Loader source runner",
    route: "/design-lab/source-tracks/18/v2/source",
    routeEntry: "app/design-lab/source-tracks/18/v2/source/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze(["app/design-lab/source-tracks/18/v2/", "design-intake/manifests/source-track-18-fragment-loader-v2.json", "lib/source-track-18/", "public/design-lab-assets/source-tracks/18/v2/", "qa/source-track-18-v2-browser-qa.mjs", "tests/source-track-18", ".github/workflows/source-track18-v2-browser-qa.yml", "scripts/verify-source-track-18-assets.mjs"]),
    assetGate: Object.freeze({ verifier: "scripts/verify-source-track-18-assets.mjs", expectedMarker: "TRACK18_V2_EXACT_ASSET_GATE_PASS" }),
    exactAssetStatus: "EXACT_GATE_PASS",
    browserGates: Object.freeze(["qa/source-track-18-v2-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/source-track-18-v2-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/source-track18-v2-browser-qa.yml",
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze(["qa/evidence/source-track-18-v2"]),
  }),
  Object.freeze({
    id: "track-62-v1-1-continuous-exhibition-rail",
    label: "Track62 V1.1 continuous exhibition rail native capability proof",
    route: "/design-lab/capabilities/continuous-exhibition-rail",
    routeEntry: "app/design-lab/capabilities/continuous-exhibition-rail/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze(["app/design-lab/capabilities/continuous-exhibition-rail/", "design-intake/manifests/track-62-v11-continuous-exhibition-native-proof.json", "lib/track-62-v11/", "qa/track62-v11-continuous-exhibition-qa.mjs", "tests/track-62-v11", ".github/workflows/track62-v11-continuous-exhibition-qa.yml"]),
    exactAssetStatus: "SOURCE_REFERENCE_ONLY_MEDIA",
    browserGates: Object.freeze(["qa/track62-v11-continuous-exhibition-qa.mjs"]),
    actualRouteBrowserGate: "qa/track62-v11-continuous-exhibition-qa.mjs",
    dedicatedWorkflow: ".github/workflows/track62-v11-continuous-exhibition-qa.yml",
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze(["qa/evidence/track62-v11"]),
  }),
  Object.freeze({
    id: "lineage-55-moonlit-blossom",
    label: "Lineage 55 Moonlit Blossom Hero V1 native",
    route: "/design-lab/lineages/55",
    routeEntry: "app/design-lab/lineages/55/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/lineages/55/",
      "app/styles/lineage-55-moonlit-blossom.css",
      "lib/lineage-55-moonlit-blossom-data.ts",
      "lib/lineage-55-moonlit-blossom-controller.ts",
      "lib/lineage-55-moonlit-blossom-source.ts",
      "tests/lineage-55-moonlit-blossom",
      "qa/lineage55-native-browser-qa.mjs",
      "reference/lineage-55-moonlit-blossom-v1/",
      "public/reference/lineage-55-moonlit-blossom-v1/",
    ]),
    exactAssetStatus: "SOURCE_REFERENCE_ONLY_MEDIA; HISTORICAL_ASSET_SOURCE_UNRESOLVED_PROVENANCE_HOLD",
    browserGates: Object.freeze(["qa/lineage55-native-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/lineage55-native-browser-qa.mjs",
    dedicatedWorkflow: null,
    viewports: VIEWPORTS,
    captureReducedMotion: false,
    extraEvidencePaths: Object.freeze(["qa/evidence/lineage55"]),
  }),
  Object.freeze({
    id: "track-74-v2-native",
    label: "Track74 V2 Orbit Morph Template Portal native candidate",
    route: "/design-lab/source-tracks/74/v2/native",
    routeEntry: "app/design-lab/source-tracks/74/v2/native/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/source-tracks/74/",
      "app/components/v4/V4OrbitMorphTemplatePortal",
      "lib/source-track-74/",
      "qa/track74-native-browser-qa.mjs",
    ]),
    exactAssetStatus: "OVERSIZE_MP4_FINGERPRINT_ONLY_OUT_OF_GIT; LOGO_SVG_CANDIDATE_PENDING_OWNER_APPROVAL",
    browserGates: Object.freeze(["qa/track74-native-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/track74-native-browser-qa.mjs",
    dedicatedWorkflow: null,
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze(["qa-artifacts/track74-native"]),
  }),
  Object.freeze({
    id: "track-36-v3-home-donor",
    label: "Track36 V3 bounded HOME visual donor proof",
    route: "/design-lab/source-tracks/36/v3/donor",
    routeEntry: "app/design-lab/source-tracks/36/v3/donor/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/source-tracks/36/v3/donor/",
      "lib/source-track-36/",
      "design-intake/manifests/source-track-36-cinematic-memory-portal-v3.json",
      "reference/source-tracks-snapshot/36_시네마틱메모리포털_버전통합/",
      "qa/source-track-36-v3-home-donor-browser-qa.mjs",
      "tests/source-track-36-v3-donor-contract.test.mjs",
      ".github/workflows/source-track36-v3-home-donor-browser-qa.yml",
    ]),
    assetGate: null,
    exactAssetStatus: "SOURCE_REFERENCE_ONLY; STANDALONE_HOME_REJECTED; CANONICAL_V4_DATA_SPINE_PRESERVED",
    browserGates: Object.freeze(["qa/source-track-36-v3-home-donor-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/source-track-36-v3-home-donor-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/source-track36-v3-home-donor-browser-qa.yml",
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze([]),
  }),
  Object.freeze({
    id: "source-track-24-v1-video-memory-workflow-donor",
    label: "Track24 V1 Video Memory Workflow bounded donor proof",
    route: "/design-lab/source-tracks/24/v1/donor",
    routeEntry: "app/design-lab/source-tracks/24/v1/donor/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/source-tracks/24/v1/donor/",
      "lib/sourceTrack24V1DonorNative.ts",
      "design-intake/source-track-24-video-memory-workflow-v1-donor.json",
      "reference/source-tracks-snapshot/24_영상기억_워크플로우/",
      "qa/source-track-24-v1-donor-browser-qa.mjs",
      "tests/source-track-24-v1-donor-contract.test.mjs",
    ]),
    assetGate: null,
    exactAssetStatus: "REFERENCE_SOURCE_PINNED; EXTERNAL_DEMO_VIDEO_NOT_PROMOTED; CANONICAL_V4_HANDOFF_PRESERVED",
    browserGates: Object.freeze(["qa/source-track-24-v1-donor-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/source-track-24-v1-donor-browser-qa.mjs",
    dedicatedWorkflow: null,
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze([]),
  }),
  Object.freeze({
    id: "drive-track-18-electric-aurora-donor",
    label: "Drive Track18 Electric Aurora MYTREE visual donor",
    route: "/design-lab/drive-track-18-electric-aurora",
    routeEntry: "app/design-lab/drive-track-18-electric-aurora/page.tsx",
    validationClass: "interaction-contract",
    inventoryDisposition: "REGISTERED_TARGET",
    impactPrefixes: Object.freeze([
      "app/design-lab/drive-track-18-electric-aurora/",
      "lib/drive-track-18-electric-aurora/",
      "reference/source-tracks-snapshot/18_메모리코어_전기오로라/",
      "qa/drive-track-18-electric-aurora-browser-qa.mjs",
      "tests/drive-track-18-electric-aurora-contract.test.mjs",
      ".github/workflows/drive-track-18-electric-aurora-browser-qa.yml",
    ]),
    assetGate: null,
    exactAssetStatus: "REFERENCE_SOURCE_PINNED; DRIVE_TRACK18_NAMESPACE_SEPARATE_FROM_SOURCE_TRACK18; CANONICAL_MOMENT_PRESENTATION_ONLY",
    browserGates: Object.freeze(["qa/drive-track-18-electric-aurora-browser-qa.mjs"]),
    actualRouteBrowserGate: "qa/drive-track-18-electric-aurora-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/drive-track-18-electric-aurora-browser-qa.yml",
    viewports: VIEWPORTS,
    captureReducedMotion: true,
    extraEvidencePaths: Object.freeze([]),
  }),
]);

export const EXPLICIT_MACHINE_CHECKED_EXCLUSIONS = Object.freeze([
  Object.freeze({
    id: "track-47-v4-2-5-hold", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Track47 V4.2.5 cinematic source HOLD", validationClass: "truthful-hold",
    route: "/design-lab/source-tracks/47/v4-2-5/native",
    routeEntry: "app/design-lab/source-tracks/47/v4-2-5/native/page.tsx",
    impactPrefixes: Object.freeze(["app/design-lab/source-tracks/47/", "public/design-lab-assets/source-tracks/47/", "tests/source-track-47-browser-qa.mjs", ".github/workflows/source-track47-v425-browser-qa.yml"]),
    actualRouteBrowserGate: "tests/source-track-47-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/source-track47-v425-browser-qa.yml",
    exactAssetStatus: "VIDEO_EXACT_ASSET_HOLD", viewports: VIEWPORTS, reducedMotion: true,
    holdSemantics: "Dedicated CI proves only the missing-video HOLD path; never FULL source-fidelity PASS.",
    reason: "Exact 28,650,099-byte cinematic video is intentionally absent from Git; dedicated HOLD workflow owns current truth.",
  }),
  Object.freeze({
    id: "living-media-sphere-v3-hold", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Living Media Sphere V3 source-family HOLD", validationClass: "truthful-hold",
    route: "/design-lab/source-families/living-media-sphere/v3/source",
    routeEntry: "app/design-lab/source-families/living-media-sphere/v3/source/page.tsx",
    impactPrefixes: Object.freeze(["app/design-lab/source-families/living-media-sphere/", "public/design-lab-assets/source-families/living-media-sphere/", "tests/living-media-sphere-v3-browser-qa.mjs", ".github/workflows/living-media-sphere-v3-hold-browser-qa.yml"]),
    actualRouteBrowserGate: "tests/living-media-sphere-v3-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/living-media-sphere-v3-hold-browser-qa.yml",
    exactAssetStatus: "LOCAL_EXACT_OUT_OF_GIT_ONLY", viewports: VIEWPORTS, reducedMotion: true,
    holdSemantics: "Dedicated CI proves missing-media HOLD only; never FULL source-fidelity PASS.",
    reason: "Exact media remains local/out-of-Git by authority; dedicated HOLD workflow is the truthful certification surface.",
  }),
  Object.freeze({
    id: "track-66-v1-2-dedicated-product-qa", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Track66 V1.2 canonical journey dedicated QA", validationClass: "canonical-product-dedicated-qa",
    route: "/v4/journey?v12=1", routeEntry: "app/v4/journey/page.tsx",
    impactPrefixes: Object.freeze(["app/components/v4/V4FirstJourneyV12", "app/styles/v4/first-journey-v12", "qa/track66-native-browser-qa.mjs", "tests/track-66", ".github/workflows/track66-native-browser-qa.yml"]),
    actualRouteBrowserGate: "qa/track66-native-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/track66-native-browser-qa.yml",
    exactAssetStatus: "NOT_REQUIRED", viewports: VIEWPORTS, reducedMotion: true, holdSemantics: null,
    reason: "Track66 validates canonical /v4 journey behavior in its dedicated workflow; it is not a Design Lab/source-fidelity target.",
  }),
  Object.freeze({
    id: "source-track-17-living-memory-terrain-dedicated-product-qa", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Drive Track17 Living Memory Terrain canonical MYTREE donor QA", validationClass: "canonical-product-dedicated-qa",
    route: "/trees/:treeId/terrain", routeEntry: "app/trees/[id]/terrain/page.tsx",
    impactPrefixes: Object.freeze(["app/trees/[id]/terrain/", "lib/source-track-17/", "design-intake/source-track-17-living-memory-terrain-mytree-donor.json", "qa/source-track-17-living-memory-terrain-browser-qa.mjs", "tests/source-track-17-living-memory-terrain-contract.test.mjs", ".github/workflows/source-track17-living-memory-terrain-browser-qa.yml"]),
    actualRouteBrowserGate: "qa/source-track-17-living-memory-terrain-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/source-track17-living-memory-terrain-browser-qa.yml",
    exactAssetStatus: "REFERENCE_SOURCE_PINNED; CANONICAL_RUNTIME_USES_TREE_MOMENT_DATA", viewports: VIEWPORTS, reducedMotion: true, holdSemantics: null,
    reason: "Track17 validates a canonical /trees/:treeId terrain donor lens in its dedicated workflow; it is not a Design Lab/source-fidelity certification target and must not promote source demo return/Season semantics.",
  }),
  Object.freeze({
    id: "source-track-35-lp-archive-dedicated-product-qa", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Track35 LP Player canonical ARCHIVE native QA", validationClass: "canonical-product-dedicated-qa",
    route: "/v4/trees/:treeId/archive/lp", routeEntry: "app/v4/trees/[id]/archive/lp/page.tsx",
    impactPrefixes: Object.freeze(["app/v4/trees/[id]/archive/lp/", "lib/source-track-35/", "qa/track35-lp-player-browser-qa.mjs", "tests/track35-lp-player-contract.test.mjs", ".github/workflows/track35-lp-player-browser-qa.yml"]),
    actualRouteBrowserGate: "qa/track35-lp-player-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/track35-lp-player-browser-qa.yml",
    exactAssetStatus: "REFERENCE_SOURCE_PINNED; CANONICAL_RUNTIME_USES_EXISTING_MOMENT_MEDIA", viewports: VIEWPORTS, reducedMotion: true, holdSemantics: null,
    reason: "Track35 validates the canonical /v4/trees/:treeId/archive/lp ARCHIVE lens in its dedicated workflow; it is not a Design Lab/source-fidelity certification target and adds no LP-specific backend, persistence, or media authority.",
  }),
  Object.freeze({
    id: "codex-work-13-cinematic-watercolor-v2-subject-dedicated-product-qa", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Codex-work-13 Cinematic Watercolor V2 canonical SUBJECT donor QA", validationClass: "canonical-product-dedicated-qa",
    route: "/v4/subjects/cinematic-watercolor-v2", routeEntry: "app/v4/subjects/cinematic-watercolor-v2/page.tsx",
    impactPrefixes: Object.freeze(["app/v4/subjects/cinematic-watercolor-v2/", "app/components/v4/V4PersonAlbums.tsx", "app/components/v4/v4-subject-albums.ts", "design-intake/codex-work-13-cinematic-watercolor-v2.json", "qa/codex-work-13-cinematic-watercolor-v2-browser-qa.mjs", "tests/codex-work-13-cinematic-watercolor-v2-native-contract.test.mjs", ".github/workflows/codex-work-13-cinematic-watercolor-v2-browser-qa.yml"]),
    actualRouteBrowserGate: "qa/codex-work-13-cinematic-watercolor-v2-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/codex-work-13-cinematic-watercolor-v2-browser-qa.yml",
    exactAssetStatus: "SOURCE_BINARIES_FINGERPRINT_ONLY; CANONICAL_RUNTIME_REUSES_EXISTING_SUBJECT_PROJECTION", viewports: VIEWPORTS, reducedMotion: true, holdSemantics: null,
    reason: "Cinematic Watercolor V2 validates a bounded canonical /v4/subjects presentation donor lens in its dedicated workflow; it is not a Design Lab/source-fidelity certification target and adds no parallel SUBJECT application, backend, persistence, or source-binary product authority.",
  }),
  Object.freeze({
    id: "codex14-rotating-memory-index-dedicated-product-qa", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Codex14 Rotating Memory Index canonical ARCHIVE native QA", validationClass: "canonical-product-dedicated-qa",
    route: "/v4/trees/:treeId/archive/rotating-index", routeEntry: "app/v4/trees/[id]/archive/rotating-index/page.tsx",
    impactPrefixes: Object.freeze(["app/v4/trees/[id]/archive/rotating-index/", "lib/codex14/", "design-intake/codex14-rotating-memory-index-archive-native.json", "qa/codex14-rotating-memory-index-browser-qa.mjs", "tests/codex14-rotating-memory-index-contract.test.mjs", ".github/workflows/codex14-rotating-memory-index-browser-qa.yml"]),
    actualRouteBrowserGate: "qa/codex14-rotating-memory-index-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/codex14-rotating-memory-index-browser-qa.yml",
    exactAssetStatus: "REFERENCE_SOURCE_PINNED; CANONICAL_RUNTIME_USES_EXISTING_MOMENT_MEDIA", viewports: VIEWPORTS, reducedMotion: true, holdSemantics: null,
    reason: "Codex14 validates a bounded canonical ARCHIVE presentation over existing Moment/media authority in its dedicated workflow; it is not a Design Lab/source-fidelity certification target and adds no archive backend, persistence, schema, API, or parallel media authority.",
  }),
  Object.freeze({
    id: "source-track-38-v1-discover-donor-dedicated-fixture-qa", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Track38 V1 Voyager DISCOVER donor dedicated fixture-backed QA", validationClass: "dedicated-fixture-browser-qa",
    route: "/design-lab/source-tracks/38/v1/donor", routeEntry: "app/design-lab/source-tracks/38/v1/donor/page.tsx",
    impactPrefixes: Object.freeze(["app/design-lab/source-tracks/38/v1/donor/", "lib/source-track-38/", "design-intake/manifests/source-track-38-voyager-space-memory-map-v1.json", "reference/source-tracks-snapshot/38_보이저_우주기억지도/", "qa/source-track-38-v1-discover-donor-browser-qa.mjs", "tests/source-track-38-v1-donor-contract.test.mjs", ".github/workflows/source-track38-v1-discover-donor-browser-qa.yml"]),
    actualRouteBrowserGate: "qa/source-track-38-v1-discover-donor-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/source-track38-v1-discover-donor-browser-qa.yml",
    exactAssetStatus: "REFERENCE_SOURCE_PINNED; CANONICAL_API_SHAPE_VERIFIED_WITH_DETERMINISTIC_BROWSER_FIXTURES", viewports: VIEWPORTS, reducedMotion: true, holdSemantics: null,
    reason: "Track38 donor reads canonical /api/community Tree/Memory data. Generic Design Fidelity route capture has no DATABASE_URL and produces an environment-only API 500, while the dedicated workflow deterministically intercepts the canonical API shape and verifies desktop/mobile/touch/keyboard/reduced-motion behavior without promoting source fixtures into product truth.",
  }),
  Object.freeze({
    id: "source-track-68-v3-3-2-compare-hold", disposition: "EXPLICIT_MACHINE_CHECKED_EXCLUSION",
    label: "Track68 V3.3.2 bounded source compare — external equivalence HOLD", validationClass: "truthful-hold",
    route: "/design-lab/source-tracks/68/v3-3-2/compare",
    routeEntry: "app/design-lab/source-tracks/68/v3-3-2/compare/page.tsx",
    impactPrefixes: Object.freeze([
      "app/design-lab/source-tracks/68/v3-3-2/",
      "public/design-lab-assets/source-tracks/68/v3-3-2/",
      "design-intake/manifests/source-track-68-v332-compare-runner.json",
      "scripts/verify-source-track68-v332-assets.mjs",
      "tests/source-track68-",
      ".github/workflows/source-track68-v332-browser-qa.yml",
    ]),
    actualRouteBrowserGate: "tests/source-track68-v332-browser-qa.mjs",
    dedicatedWorkflow: ".github/workflows/source-track68-v332-browser-qa.yml",
    exactAssetStatus: "LOCAL_EXACT_PACKAGE_23_23_PINNED; CLOUDFRONT_BYTE_EQUIVALENCE_HOLD",
    viewports: VIEWPORTS,
    reducedMotion: true,
    holdSemantics: "Dedicated Track68 CI proves the pinned local compare package, exact local assets, A/B behavior, and actual-route interactions; it must never be reported as FULL source-fidelity equivalence while CloudFront byte equivalence remains HOLD.",
    reason: "The bounded local compare runner is implementation-ready and locally exact, but original CloudFront hero-byte equivalence is not proven and direct CloudFront hotlink is not authorized; keep central fidelity classification truthful HOLD.",
  }),
]);

export const FUTURE_MERGE_GUARDS = Object.freeze([]);

export const DESIGN_FIDELITY_TARGETS = Object.freeze([...BASE_TARGETS, ...SUPPLEMENTAL_DESIGN_FIDELITY_TARGETS]);
const GLOBAL_PREFIXES = Object.freeze([...GLOBAL_ORCHESTRATION_PREFIXES, "scripts/design-fidelity-validation-inventory.mjs", "tests/design-fidelity-inventory-drift.test.mjs"]);
const NON_TARGET_WORKFLOWS = new Set([".github/workflows/design-fidelity-validation.yml", ".github/workflows/a-track-p0-validation.yml", ".github/workflows/production-auto-deploy.yml"]);
const matches = (p, prefix) => p === prefix || p.startsWith(prefix);
const nonempty = (v) => typeof v === "string" && v.trim().length > 0;

function validateCommon(entry) {
  if (!nonempty(entry.id)) throw new Error("inventory entry missing id");
  if (!nonempty(entry.route) || !entry.route.startsWith("/")) throw new Error(`${entry.id}: invalid route`);
  if (!Array.isArray(entry.impactPrefixes) || entry.impactPrefixes.length === 0) throw new Error(`${entry.id}: impactPrefixes required`);
  if (!Array.isArray(entry.viewports) || entry.viewports.length < 2) throw new Error(`${entry.id}: viewports required`);
}
function validateRegistered(target) {
  validateCommon(target);
  if (!["source-fidelity", "interaction-contract"].includes(target.validationClass)) throw new Error(`${target.id}: registered target has invalid/full-HOLD validation class ${target.validationClass}`);
  if (!Array.isArray(target.browserGates) || target.browserGates.length === 0) throw new Error(`${target.id}: browserGates must be non-empty`);
  if (typeof target.captureReducedMotion !== "boolean") throw new Error(`${target.id}: captureReducedMotion required`);
  if (target.assetGate && (!nonempty(target.assetGate.verifier) || !nonempty(target.assetGate.expectedMarker))) throw new Error(`${target.id}: invalid exact asset gate`);
}

export function validateDesignFidelityInventory({ registeredTargets = DESIGN_FIDELITY_TARGETS, exclusions = EXPLICIT_MACHINE_CHECKED_EXCLUSIONS, futureGuards = FUTURE_MERGE_GUARDS } = {}) {
  registeredTargets.forEach(validateRegistered);
  exclusions.forEach((entry) => { validateCommon(entry); if (entry.disposition !== "EXPLICIT_MACHINE_CHECKED_EXCLUSION" || !nonempty(entry.reason) || !nonempty(entry.actualRouteBrowserGate)) throw new Error(`${entry.id}: invalid exclusion`); if (entry.validationClass === "truthful-hold" && !nonempty(entry.holdSemantics)) throw new Error(`${entry.id}: HOLD semantics required`); });
  futureGuards.forEach((entry) => { validateCommon(entry); if (entry.disposition !== "FUTURE_MERGE_GUARD" || !nonempty(entry.requiredResolution)) throw new Error(`${entry.id}: invalid future guard`); });
  const ids = [...registeredTargets, ...exclusions, ...futureGuards].map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate Design Fidelity inventory id");
  return true;
}

export function getDesignFidelityTarget(id) { return DESIGN_FIDELITY_TARGETS.find((target) => target.id === id) ?? null; }
const supplementalMaterialized = (target, cwd) => [target.routeEntry, ...target.browserGates, ...(target.assetGate ? [target.assetGate.verifier] : [])].every((p) => existsSync(path.join(cwd, p)));

export function discoverDedicatedPlaywrightWorkflows(cwd = process.cwd()) {
  const dir = path.join(cwd, ".github", "workflows");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().filter((name) => /\.ya?ml$/i.test(name)).map((name) => `.github/workflows/${name}`).filter((relative) => !NON_TARGET_WORKFLOWS.has(relative) && readFileSync(path.join(cwd, relative), "utf8").includes("npx playwright install"));
}

export function assertDedicatedWorkflowCoverage(cwd = process.cwd(), { registeredTargets = DESIGN_FIDELITY_TARGETS, exclusions = EXPLICIT_MACHINE_CHECKED_EXCLUSIONS, futureGuards = FUTURE_MERGE_GUARDS } = {}) {
  const represented = new Set([...registeredTargets, ...exclusions, ...futureGuards].map((entry) => entry.dedicatedWorkflow).filter(Boolean));
  const unknown = discoverDedicatedPlaywrightWorkflows(cwd).filter((workflow) => !represented.has(workflow));
  if (unknown.length) throw new Error(`UNREGISTERED_DEDICATED_BROWSER_WORKFLOW: ${unknown.join(", ")}`);
  return true;
}

export function validateRepositoryInventory(cwd = process.cwd()) {
  validateDesignFidelityInventory();
  for (const target of SUPPLEMENTAL_DESIGN_FIDELITY_TARGETS) if (!supplementalMaterialized(target, cwd)) throw new Error(`${target.id}: registered target is not materialized`);
  for (const entry of EXPLICIT_MACHINE_CHECKED_EXCLUSIONS) for (const p of [entry.routeEntry, entry.actualRouteBrowserGate, entry.dedicatedWorkflow].filter(Boolean)) if (!existsSync(path.join(cwd, p))) throw new Error(`${entry.id}: configured evidence path missing: ${p}`);
  assertDedicatedWorkflowCoverage(cwd);
  return true;
}

const impacted = (entry, paths) => paths.some((p) => entry.impactPrefixes.some((prefix) => matches(p, prefix)));
const potentialNewSurface = (p) => /^app\/design-lab\/.+\/page\.tsx$/.test(p) || (/^\.github\/workflows\/.+\.ya?ml$/i.test(p) && /(?:browser-)?qa\.ya?ml$/i.test(p));
const covered = (p) => [...DESIGN_FIDELITY_TARGETS, ...EXPLICIT_MACHINE_CHECKED_EXCLUSIONS, ...FUTURE_MERGE_GUARDS].some((entry) => entry.routeEntry === p || entry.dedicatedWorkflow === p || entry.impactPrefixes?.some((prefix) => matches(p, prefix)));

export function planDesignFidelityInventory(changedPaths, { addedPaths = [], cwd = process.cwd(), validateFilesystem = true } = {}) {
  const changed = [...new Set(changedPaths.filter(Boolean))];
  const added = [...new Set(addedPaths.filter(Boolean))];
  validateDesignFidelityInventory();
  if (validateFilesystem) validateRepositoryInventory(cwd);
  const unknown = added.filter((p) => potentialNewSurface(p) && !covered(p));
  if (unknown.length) throw new Error(`UNREGISTERED_FIDELITY_SURFACE: ${unknown.join(", ")}`);
  const future = FUTURE_MERGE_GUARDS.filter((entry) => impacted(entry, changed));
  if (future.length) throw new Error(`FUTURE_MERGE_GUARD: ${future.map((entry) => `${entry.id} (${entry.requiredResolution})`).join("; ")}`);
  const globalChange = changed.some((p) => GLOBAL_PREFIXES.some((prefix) => matches(p, prefix)));
  const base = globalChange ? BASE_TARGETS.filter((target) => baseTargetIsMaterialized(target, cwd)) : selectBaseTargets(changed, cwd);
  const supplemental = SUPPLEMENTAL_DESIGN_FIDELITY_TARGETS.filter((target) => (globalChange && (!validateFilesystem || supplementalMaterialized(target, cwd))) || impacted(target, changed));
  const targets = [...new Map([...base, ...supplemental].map((target) => [target.id, target])).values()];
  const exclusions = EXPLICIT_MACHINE_CHECKED_EXCLUSIONS.filter((entry) => globalChange || impacted(entry, changed));
  return { targets, exclusions, futureGuards: [], genuinelyNoImpact: targets.length === 0 && exclusions.length === 0 };
}
