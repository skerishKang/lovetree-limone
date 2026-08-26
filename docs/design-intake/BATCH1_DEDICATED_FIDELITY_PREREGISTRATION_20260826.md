# Batch1 Dedicated Fidelity Preregistration — 2026-08-26

## Scope

CENTRAL-only reconciliation for the currently approved Batch1 source candidates:

- Source56 Vertical Moment Network → bounded Lineage53 extension
- Source57 Living Glass Moment V1.3 native
- Source58 Living Memory Pinboard V1.2 native

This change does not implement, redesign, adopt, merge, or mark Ready any source candidate.

## Problem

Each source PR owns a dedicated exact-head Playwright workflow. The fail-closed Design Fidelity inventory correctly rejects an unknown dedicated workflow. Because source-specific lanes are forbidden from editing the CENTRAL inventory, the source route/workflow can arrive together while the shared registry remains on main, producing a circular handoff blocker.

## Resolution: classify by the proof model, not by Source number

The preregistration is intentionally mixed.

### Source56 → preregistered `REGISTERED_TARGET`

Source56 has a static Design Lab route and its browser gate can run against the shared Design Fidelity app server. Once materialized, CENTRAL should execute the actual route as an `interaction-contract` target.

Namespace guard: Source56 remains a Lineage53 extension and is not repository Lineage56 Crystal Memory Atelier.

### Source57 → preregistered `REGISTERED_TARGET`

Source57 also has a static Design Lab native route and its repaired browser gate can run against the shared Design Fidelity app server. Once materialized, CENTRAL should execute the actual route as an `interaction-contract` target.

Namespace guard: Source57 Living Glass is not repository Lineage57 Living Character World.

### Source58 → preregistered `EXPLICIT_MACHINE_CHECKED_EXCLUSION`

Source58's meaningful Pinboard proof requires a canonical `treeId` plus deterministic canonical-shape network fixtures in its dedicated QA. A generic central initial-route capture cannot supply that environment. Source58 therefore remains a `dedicated-fixture-browser-qa` exclusion whose dedicated exact-head workflow owns the browser certification surface.

Namespace guard: Source58 Living Memory Pinboard is not repository Lineage58 VideoFigure Atelier.

## Fail-closed preregistration semantics

A preregistered target or exclusion may be completely absent before its source PR lands.

For preregistered targets, once any configured evidence surface appears, route entry, configured browser gate, dedicated workflow, and any configured asset verifier must be fully materialized. Partial materialization fails repository validation.

For preregistered exclusions, once any configured evidence surface appears, route entry, actual-route browser gate, and dedicated workflow must all exist. Partial materialization also fails closed.

Unknown dedicated browser workflows outside these explicit entries remain rejected.

Global CENTRAL-only inventory changes do not execute or report still-unmaterialized preregistered entries merely because the registry changed.

## Non-scope

No Auth/API/DB/schema/navigation/product-route mutation.
No Source60 handoff mutation.
No Source71 work.
No Ready or merge transition for Source56/57/58.
