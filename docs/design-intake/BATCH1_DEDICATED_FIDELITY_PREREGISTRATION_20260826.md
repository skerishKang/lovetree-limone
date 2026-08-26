# Batch1 Dedicated Fidelity Preregistration — 2026-08-26

## Scope

CENTRAL-only reconciliation for the currently approved Batch1 source candidates:

- Source56 Vertical Moment Network → Lineage53 extension
- Source57 Living Glass Moment native
- Source58 Living Memory Pinboard native

This change does not implement, redesign, adopt, merge, or mark Ready any source candidate.

## Problem

Each source PR owns a dedicated exact-head browser workflow. The fail-closed Design Fidelity inventory correctly rejects an unknown dedicated Playwright workflow. Because the source-specific lanes are forbidden from editing the CENTRAL inventory, the dedicated workflow and route arrive together while the shared registry remains on main, producing a circular handoff blocker.

## Resolution

The CENTRAL inventory preregisters the three approved dedicated QA surfaces as explicit machine-checked exclusions.

A preregistered exclusion may be completely absent from the repository before its source PR lands. Once any configured evidence surface is materialized, the repository inventory requires the full route-entry / actual-route-browser-gate / dedicated-workflow set. This preserves fail-closed behavior for partial materialization.

Global registry changes do not report still-unmaterialized preregistered exclusions as active exclusions. Once a source branch contains its route and QA workflow, the planner classifies it explicitly instead of treating the added route/workflow as an unknown fidelity surface.

## Namespace guards

- Source56 is not Lineage56. It remains a bounded Lineage53 extension.
- Source57 is not repository Lineage57 Living Character World.
- Source58 is not repository Lineage58 VideoFigure Atelier.

## Non-scope

No Auth/API/DB/schema/navigation/product-route mutation.
No Source60 handoff mutation.
No Source71 work.
No Ready or merge transition for Source56/57/58.
