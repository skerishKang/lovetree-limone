export const LINEAGE_52_V3_SOURCE = {
  lineageId: "lt-52-global-moment-orbit",
  revisionId: "52-v3-reference-earth-orbit",
  candidateId: "lineage:52-v3-reference-earth-orbit",
  runnerRoute: "/design-lab/lineages/52/v3",
  sourceFile: "lovetree-52-v3-reference-earth-orbit.html",
  sourceAssetPath: "/design-lab-assets/lineages/52/v3/lovetree-52-v3-reference-earth-orbit.html",
  sourceBytes: 1_140_569,
  sourceSha256: "f8c017f964338a77b4286cc7fe3baed2675e8f6117aff0b83f943c071bf4f45b",
  runtimeSeconds: 20,
  expectedRuntimeApi: [
    "window.__ORBIT3.duration",
    "window.__ORBIT3.seek(t)",
    "window.__ORBIT3.pause()",
    "window.__ORBIT3.play()",
    "window.__ORBIT3.capture(v)",
    "window.__ORBIT3.state()",
    "window.__V3_READY",
  ],
} as const;

export const LINEAGE_52_V3_RUNNER_LABEL = "SOURCE RUNNER — NOT NATIVE NEXT IMPLEMENTATION";
