# OLD — Legacy Frontend Generation

## Identity

`OLD` = the legacy frontend generation of LoveTree Limone.

This directory is the **namespace declaration** for all historical LoveTree frontend work.

## Status

- Existing implementation is **preserved in place** under the original repository paths (`app/`, `components/`, `design-intake/`, etc.)
- No new product design work should begin here
- Security / runtime compatibility fixes may still occur on legacy code
- Authoritative backend / database remain shared with the NEW generation

## What Lives Here

See `LEGACY_FRONTEND_MANIFEST.md` for the complete inventory.

## `lib/` Ownership Split

`lib/` is **NOT** entirely OLD. It is split into two logical zones:

### OLD_FRONTEND_LIB (legacy ownership)

Design / source / lineage / presentation / frontend implementation files:

- `lib/design-lab.ts`, `lib/design-lineages.ts`, `lib/design-intake/`, `lib/design-runtime/`
- `lib/experience-capabilities.ts`, `lib/experience-capability-registry.ts`, `lib/experience-runtime/`
- `lib/lineage-*`, `lib/source-track-*`, `lib/source-codex-*`, `lib/codex14/`
- `lib/sourceTrack24V1DonorNative.ts`, `lib/living-media-sphere-v3/`
- `lib/v4-orbit-product.ts`, `lib/v4-orbit-selection.ts`
- `lib/graph/`, `lib/template-platform/`, `lib/track-62-v11/`
- `lib/drive-track-18-electric-aurora/`
- `lib/moment-model.ts`, `lib/moment-url.ts`, `lib/use-moment-url.ts`, `lib/use-tree-moments.ts`
- `lib/memory-anatomy.ts`, `lib/narrative-moment-assembly.ts`
- `lib/first-tree-create-client.ts`, `lib/tree-types.ts`
- `lib/intent-path-prototype.ts`, `lib/media-inspection-prototype.ts`, `lib/question-lens-prototype.ts`
- `lib/videofigure-turntable.ts`

### SHARED_CORE_BRIDGE_LIB (shared with NEW — NOT OLD-owned)

Backend / Auth / API bridge files used by both OLD and NEW:

- `lib/api.ts` — API client
- `lib/auth.tsx` — Auth provider
- `lib/auth-errors.ts` — Auth error handling
- `lib/auth-token-provider.ts` — Auth token provider
- `lib/firebase.ts` — Firebase configuration

These files are **SHARED** between OLD and NEW. Neither generation exclusively owns them. They bridge frontend to canonical backend.

## What Does NOT Live Here

- New source-faithful implementations → `new/v1/`
- Backend / DB / Auth boundary contracts → `core/`
- Source implementations → `new/v1/sources/`
- SHARED_CORE_BRIDGE_LIB files (shared with NEW)

## Migration Context

This legacy namespace was established on **2026-08-28** as part of the Frontend Generation Reset.

The existing frontend files remain at their current paths because Next.js App Router expects `app/` at the repository root. Moving them to `old/app/` would break the build/runtime. Therefore this is a **logical namespace** — the manifest declares ownership without physically relocating files.

## Rules

1. Do not begin new product design work under legacy paths
2. Do not delete legacy code — it is preserved as historical evidence
3. Do not fork backend truth from legacy paths
4. NEW development belongs under `new/v1/`
5. Legacy source/design history may be referenced but does not control NEW implementation
6. SHARED_CORE_BRIDGE_LIB files are shared — both generations may consume them
