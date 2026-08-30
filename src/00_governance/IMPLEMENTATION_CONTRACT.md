# Implementation Contract

## Purpose

This generation exists to faithfully reimplement the authoritative standalone designs before product composition. Source/Codex preservation and product adaptation are separate phases.

## Canonical capsule sequence

```text
authority/authority.json
original/original.html
baseline/
split/index.html
split/styles.css
split/script.js
split/assets/
evidence/source/
evidence/split/
evidence/parity/
tests/
```

The frozen `original/original.html` is authority evidence and must remain byte-identical to the resolved source executable.

## Mechanical split phase

Allowed:

- move inline `<style>` content to `styles.css` without semantic edits;
- move inline `<script>` content to `script.js` without semantic edits;
- preserve body/head markup except minimal stylesheet/script references and exact relative asset relocation;
- copy referenced local assets byte-for-byte;
- make only path changes required by the new file layout.

Forbidden:

- HTML → React/Next/TSX/JSX conversion;
- DOM restructuring for cleanliness;
- CSS redesign, new responsive rules, spacing/color/typography cleanup;
- component abstraction;
- state-management redesign;
- product/canonical data substitution;
- product navigation or shell integration;
- silent correction of source quirks/defects.

## Import from old/new/history

Existing runtime code is never active authority by existence alone. Historical material may be classified as `REUSE_EXACT`, `REUSE_AFTER_VERIFY`, `REGRESSION_CORPUS`, `REPORT_ONLY`, or `DISCARD_FROM_ACTIVE_RUNTIME`. Import must be explicit and evidence-backed.

## Component eligibility

A Source/Codex split does not become a reusable component until source↔split parity passes. Component records live under `src/06_components/`; product compositions live under `src/07_compositions/` and must never mutate frozen source authority.
