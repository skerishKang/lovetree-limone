# OLD — Legacy Frontend Generation

## Identity

`OLD` = the legacy frontend generation of LoveTree Limone.

This directory is the **namespace declaration** for all historical LoveTree frontend work.

## Status

- Existing implementation is **preserved in place** under the original repository paths (`app/`, `lib/`, `components/`, `design-intake/`, etc.)
- No new product design work should begin here
- Security / runtime compatibility fixes may still occur on legacy code
- Authoritative backend / database remain shared with the NEW generation

## What Lives Here

See `LEGACY_FRONTEND_MANIFEST.md` for the complete inventory.

## What Does NOT Live Here

- New source-faithful implementations → `new/v1/`
- Backend / DB / Auth boundary contracts → `core/`
- Source implementations → `new/v1/sources/`

## Migration Context

This legacy namespace was established on **2026-08-28** as part of the Frontend Generation Reset.

The existing frontend files remain at their current paths because Next.js App Router expects `app/` at the repository root. Moving them to `old/app/` would break the build/runtime. Therefore this is a **logical namespace** — the manifest declares ownership without physically relocating files.

## Rules

1. Do not begin new product design work under legacy paths
2. Do not delete legacy code — it is preserved as historical evidence
3. Do not fork backend truth from legacy paths
4. NEW development belongs under `new/v1/`
5. Legacy source/design history may be referenced but does not control NEW implementation
