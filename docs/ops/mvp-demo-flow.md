# MVP Demo Flow — v4 Entry Integration (Issue #318)

Owner-approved demo lane. The Moonlit Blossom first screen (Lineage 55, merged
via #315) becomes the entry surface of the v4 demo journey.

## Route map

```text
/v4/entry                    ← demo start (Moonlit Blossom first screen)
        │  click "ENTER MY TREE" (primary header pill)
        ▼
/v4/trees/demo/graph         ← free connection graph editor
```

## Screen order and click path

1. **First screen — `/v4/entry`**
   - Renders the Lineage 55 Moonlit Blossom Hero V1 first screen verbatim
     (SEED → FEELING → MOMENTS → BLOOM staged bloom).
   - No design-lab implementation change: the entry route wraps the merged
     component with a capture-phase click bridge (`app/v4/entry/MvpEntryFlow.tsx`).
2. **Click `ENTER MY TREE`** — the primary pill in the header.
   - The bridge intercepts the click and navigates to the editor route.
   - All other first-screen interactions (flower click, Space/arrow keys,
     throttled wheel, MOMENTS/BLOSSOM pills, memory cards, auto-play) keep
     their original semantics untouched.
3. **Editor — `/v4/trees/demo/graph`**
   - Free connection graph editor (`V4FreeGraph`, 자유 연결 그래프).
   - Graph internals are owned by #317; this lane adds no graph logic.

## Checkpoints per step

| Step | URL | Confirm |
| --- | --- | --- |
| 1 | `/v4/entry` | `.lt55` root rendered; step label `01 · SEED`; ENTER MY TREE pill visible; console errors 0 |
| 2 | unchanged | single click on ENTER MY TREE triggers navigation (no double-advance of bloom state) |
| 3 | `/v4/trees/demo/graph` | `.v4-freegraph-page` rendered with `자유 연결 그래프` toolbar; console errors 0 |

## Automation

`qa/mvp-entry-flow-smoke.mjs` proves steps 1–3 end-to-end against a built app
server:

```bash
npm run build && npm start &
V4_BASE_URL=http://127.0.0.1:3000 node qa/mvp-entry-flow-smoke.mjs
```

Evidence artifacts land under `qa/evidence/mvp-entry-flow/` (uncommitted).

## Boundaries

- Design-lab Lineage 55 files: unchanged (pure reuse).
- Graph editor internals (`app/components/v4/V4GraphExperiences*`): #317's
  scope — untouched here.
- Design fidelity inventory: not contacted (no new design-lab surface).
