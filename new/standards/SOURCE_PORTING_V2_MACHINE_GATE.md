# Source Porting V2 — Machine Gate Overlay

> Governing standing MVP architecture: Issue #565  
> Corrective/process authority: Issue #564  
> Status: machine-enforcement overlay for NEW Source work

## Authority and precedence

This file is the executable-policy companion to `SOURCE_CAPSULE_STANDARD.md` and `VERSION_COMPOSITION_STANDARD.md`.

Identity prefixes, capsule directory layering, source-number independence and raw-preservation rules from those standards remain valid. Where an older prose manifest example conflicts with the machine schemas introduced by this overlay, the machine schema/validator is controlling for NEW work.

The Product Owner's standing rule remains:

```text
RAW ORIGINAL
→ STRUCTURAL SPLIT
→ STRUCTURAL EQUIVALENCE
→ ADAPTER / BRIDGE
→ MVP COMPOSITION
```

Structural split is not framework conversion, reimplementation, redesign or fidelity repair.

## Required state order

```text
S0  IDENTITY_VERIFIED
S1  RAW_AUTHORITY_LOCKED
S2  SOURCE_BASELINE_CAPTURED
S3  MECHANICAL_PORT_COMPLETE
S4  SOURCE_PORT_PARITY_PASS
S5  CANONICAL_ADAPTER_BOUND
S6  PRODUCT_SHELL_CONNECTED
S7  SOURCE_PRODUCT_PARITY_PASS
S8  WEB_VERIFICATION_PASS
S9  LUNA1_INDEPENDENT_VERIFICATION_PASS
S10 PROMOTION_READY
```

No later stage may PASS while an earlier required stage is FAIL, BLOCKED, UNKNOWN or NOT_STARTED.

## Machine schemas

- `source-capsule.schema.json` — normalized capsule manifest, schema version `2.0`
- `source-authority-record.schema.json` — exact Drive/source/adoption/duplicate authority
- `source-baseline.schema.json` — immutable A/source baseline contract
- `source-evidence-manifest.schema.json` — artifact inventory with exact SHA-256
- `source-parity-result.schema.json` — A↔B or A↔C parity result bound to exact implementation heads
- `source-verification-record.schema.json` — WEB or Luna1 independent verification record
- `source-promotion-record.schema.json` — S0–S10 promotion binding
- `version-composition.schema.json` — MVP source-reference map

Freeform PR prose is informational only. It must not compete with these records as authority.

## Conventional capsule files

For `SRC056` the machine paths are:

```text
new/sources/SRC056/
├─ SRC056-00-manifest.json
├─ SRC056-00-authority.json
├─ SRC056-00-authority-summary.json
├─ SRC056-01-raw/**
├─ SRC056-02-runtime/
│  ├─ SRC056-02-01-index.html
│  ├─ SRC056-02-02-styles.css      # required when source has inline CSS
│  └─ SRC056-02-03-app.js          # required when source has inline JS
├─ SRC056-03-evidence/
│  ├─ SRC056-03-00-evidence-manifest.json
│  ├─ SRC056-03-01-baseline-a.json
│  ├─ SRC056-03-02-source-port-parity.json
│  ├─ SRC056-03-03-source-product-parity.json
│  ├─ SRC056-03-04-web-verification.json
│  ├─ SRC056-03-05-luna1-verification.json
│  └─ SRC056-03-06-promotion.json
└─ SRC056-04-tests/**
```

## S0 authority rules

S0 can PASS only when:

- `CAPSULE_ID`, family and revision agree;
- exact Drive folder ID and file ID are present;
- exact bytes and SHA-256 are present;
- adoption is explicit and resolves to the capsule revision;
- duplicate/variant authority is `CLEAR`;
- generated authority summary matches the authority record exactly.

Version number, filename, timestamp or `pass:true` alone never selects authority.

Unresolved adoption or duplicate authority forces fail-closed behavior.

## S1 raw rules

`RAW_MODE` is `EXACT_COPY` or `AUTHORITY_POINTER`.

For `EXACT_COPY`, the checked-in raw bytes must exist and match the exact authority byte count and SHA-256.

The normalized large-inline threshold is **1,048,576 bytes (1 MiB)**. `EXACT_COPY` at or above that threshold requires an explicit `OWNER` or `DELEGATED_OWNER` machine-readable exception with evidence reference and reason.

## S2 baseline rules

Baseline A is captured before source runtime splitting and must include at least:

- 1280×800
- 390×844
- 320×720
- source-defining states
- interaction inventory
- exact evidence artifact hashes

The baseline binds both the source SHA-256 and exact authority-record file SHA-256/revision.

## S3 mechanical port rules

Default runtime is framework-independent HTML/CSS/JS preservation.

Allowed:

- extract inline style into the runtime CSS file without semantic change;
- extract inline script into the runtime JS file without behavioral change;
- relocate exact assets and rebase paths only when required by relocation;
- add minimum `<link>` / `<script src>` glue.

Forbidden during S3 unless separately owner-authorized:

- React/TSX conversion merely because the Product shell uses React;
- DOM redesign;
- CSS layout algorithm rewrite;
- responsive redesign/new breakpoints;
- interaction/state reinterpretation;
- canonical Product data substitution;
- product navigation;
- visual cleanup or silent source repair;
- premature component/runtime abstraction.

## S4 parity and evidence staleness

A↔B parity requires geometry, critical style, interaction and reviewer statuses to PASS.

Evidence binds:

- source SHA-256;
- authority-record exact file SHA-256 + revision;
- exact port implementation commit SHA;
- evidence-manifest SHA-256;
- viewport/state matrix;
- each artifact SHA-256.

The parity record may be committed after the implementation commit. Therefore the gate does **not** use an impossible self-referential `evidence commit == implementation commit` rule. Instead the referenced exact port SHA must be an ancestor of HEAD and the gate fails if any Source runtime file changed after that SHA.

## MVP composition boundary

Version composition manifests live at:

```text
new/versions/<version>/manifest/composition.json
```

Every referenced `SRCxxx` must exist and machine-validate with `SOURCE_PORT_PARITY=PASS` before the composition can pass.

A single PR/lane must not mutate both `new/versions/**` and Source-owned `*-02-runtime/**`. Source runtime and MVP composition are separate ownership layers.

## Promotion / dual independent verification

Promotion binds:

- exact port head;
- exact product head;
- Product-owned path list;
- source-port parity record hash;
- source-product parity record hash;
- evidence manifest hash;
- WEB verification record hash;
- Luna1 verification record hash.

The product head must be an ancestor of the evidence/promotion commit and no declared Product-bound path may change after that head. Any Source runtime change after the exact port head also invalidates promotion evidence.

Both WEB and Luna1 must independently PASS against the same source authority, port head, product head, product parity hash and evidence hash.

## CI workflows

- `NEW Source Capsule Gate`
  - schema self-test
  - fail-closed unit tests
  - changed-capsule validation
  - exact-head prerequisite completeness
- `NEW Source Promotion Gate`
  - machine contract
  - affected MVP composition validation
  - Source/runtime vs Version scope separation
  - promotion/dual-verification record validation
  - exact-head prerequisite completeness
- `NEW Old Repair Promotion Guard`
  - blocks historical repair PRs #559–#563 from promotion while #564 hold is active

Cancelled, skipped, missing or failed prerequisite jobs are not PASS.

## Repository-level enforcement gap

Workflow checks are necessary but not sufficient while `main` has no repository-level required-check protection/ruleset. Do not declare the #564 system complete or broad implementation released until the intended stable NEW gate checks are configured as repository-level merge requirements and independently verified.
