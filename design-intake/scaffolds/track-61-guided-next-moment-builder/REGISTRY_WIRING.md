# track-61-guided-next-moment-builder — Registry Wiring

A scaffolded route must never be missing from any of the three registry seams.
Apply these registrations to the target files below, then run:

```bash
npm run design:intake:validate -- design-intake/manifests/track-61-guided-next-moment-builder.json
npm run lint && npm run typecheck && npm test
```

## designLineages (entry)

Target file: `lib/design-lineages.ts`

```json
{
  "action": "add-lineage",
  "lineage": {
    "id": "lt-61-guided-next-moment-builder",
    "number": 61,
    "label": "Guided Next Moment LoveTree Builder V1.7",
    "status": "incoming",
    "summary": "Track61 (감정경로 연결검토실) Guided Next Moment / Choice-based LoveTree Builder — this manifest pins the current V1.7 proving snapshot (Issue #158 current authority). V1.5 and V1.6 are prior revision history. The native candidate is implemented in code (nativeReadiness IMPLEMENTED) but remains a candidate: Design Fidelity exact-asset gate (P8) and source navigation holds are HOLD. Cross-track handoffs to Track 55/56/59 are RESOLVED to stable repository product targets — never inferred as repository Lineage 55/56/59 routes from raw numbers.",
    "scenarios": [
      "tree-workspace"
    ],
    "currentDecision": "Intake scaffolded from track-61-guided-next-moment-builder (candidate review) — canonical adoption is a separate decision.",
    "sourceLabel": "61_러브트리_감정경로_연결검토실 / Issue #158 (V1.7 current authority)",
    "revisions": [
      {
        "id": "61-v1-7",
        "label": "Guided Next Moment LoveTree Builder V1.7",
        "decision": "candidate",
        "executable": true,
        "route": "/design-lab/lineages/61/61-v1-7",
        "notes": "scaffolded from track-61-guided-next-moment-builder; source fidelity not claimed"
      }
    ]
  }
}
```

## designLab (entry)

Target file: `lib/design-lab.ts`

```json
{
  "action": "add-candidate",
  "candidate": {
    "id": "lineage:lt-61-guided-next-moment-builder-61-v1-7",
    "label": "Guided Next Moment LoveTree Builder V1.7",
    "scenarioId": "tree-workspace",
    "route": "/design-lab/lineages/61/61-v1-7",
    "status": "implemented",
    "origin": "lineage-intake",
    "kind": "experience",
    "lineageId": "lt-61-guided-next-moment-builder",
    "revisionId": "61-v1-7",
    "sourceFile": "현재후보.html",
    "role": "Discover someone else's/public LoveTree path → start from one Moment → inspect several plausible next Moments → understand WHY NEXT / fan context → choose one → edit/own the WHY NEXT → grow my Tree as Main or Branch → receive the next choices and continue.",
    "nativeReadiness": "IMPLEMENTED",
    "notes": "scaffolded from track-61-guided-next-moment-builder; source fidelity not claimed"
  }
}
```

## designFidelity (entry)

Target file: `scripts/design-fidelity-validation-registry.mjs`

```json
{
  "action": "add-target",
  "target": {
    "id": "lineage-61-61-v1-7",
    "label": "Guided Next Moment LoveTree Builder V1.7",
    "route": "/design-lab/lineages/61/61-v1-7",
    "validationClass": "source-fidelity",
    "impactPrefixes": [
      "app/design-lab/lineages/61/61-v1-7/",
      "reference/design-intake/track-61-guided-next-moment-builder/",
      "tests/track-61-guided-next-moment-builder-",
      "docs/product/design-intake/track-61-guided-next-moment-builder/",
      "design-intake/manifests/track-61-guided-next-moment-builder",
      "design-intake/scaffolds/track-61-guided-next-moment-builder/"
    ],
    "assetGate": null,
    "browserGates": [
      "tests/track-61-guided-next-moment-builder-route-browser-qa.mjs"
    ],
    "viewports": [
      {
        "width": 1280,
        "height": 800,
        "mobile": false
      },
      {
        "width": 390,
        "height": 844,
        "mobile": true
      },
      {
        "width": 320,
        "height": 720,
        "mobile": true
      }
    ],
    "captureReducedMotion": true,
    "extraEvidencePaths": []
  }
}
```

Reminders:
- Source HTML/JS referenced by the manifest is never executed by product code.
- Do not claim source fidelity until the exact-asset gate passes with verifier evidence.
- The factory never writes under canonical /v4 product trees.
