# Product / MVP Compositions

This directory contains later compositions assembled from parity-approved components. It is downstream of Source/Codex authority and must never become the canonical location of frozen originals.

Rules:

- composition may bind product data, routes, navigation and shell context;
- composition must not silently edit source-family geometry/style/interaction semantics;
- source authority stays in `src/03_sources/` or `src/04_codex/`;
- reusable component implementation stays in `src/06_components/`;
- no MVP composition is created in the #569 setup slice.

## Compositions

### MVP001 — Five-Source Product Surface Composition

First formal composition. Binds the five admitted components (SRC064 portal, SRC058 board, SRC056 relationships, SRC057 memory detail, SRC060 explore) to canonical product routes with shared ViewSwitcher/navigation/data contracts.

- Manifest: `MVP001/composition.json`
- Route map: `MVP001/route-map.json`
- Acceptance: `MVP001/acceptance.json`
- Validator: `src/08_harness/validate-mvp001-composition.mjs`
- Contract test: `tests/mvp001-composition-contract.test.mjs`
