# Product / MVP Compositions

This directory contains later compositions assembled from parity-approved components. It is downstream of Source/Codex authority and must never become the canonical location of frozen originals.

Rules:

- composition may bind product data, routes, navigation and shell context;
- composition must not silently edit source-family geometry/style/interaction semantics;
- source authority stays in `src/03_sources/` or `src/04_codex/`;
- reusable component implementation stays in `src/06_components/`;
- no MVP composition is created in the #569 setup slice.
