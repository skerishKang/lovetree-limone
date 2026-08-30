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

## Machine schemas and registries

- `source-identity-registry.json` — capsule→source-family identity binding for the Five-Source calibration set
- `source-capsule.schema.json` — normalized capsule manifest, schema version `2.0`
- `source-authority-record.schema.json` — exact Drive/source/adoption/duplicate authority
- `source-live-authority-verification.schema.json` — bounded live Drive observation record
- `source-recovery-import.schema.json` — OLD→NEW recovery classification with `SOURCE_CONTRACT_IMPACT=NONE`
- `source-baseline.schema.json` — immutable A/source baseline contract including intentional source quirks
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
├─ SRC056-00-live-authority.json
├─ SRC056-00-recovery-import.json         # only when OLD material is imported/reused
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

## S0 identity and live authority rules

S0 can PASS only when:

- `CAPSULE_ID` is mapped to the registered canonical source family;
- manifest title matches the registered source-family hints;
- exact Drive folder ID and file ID are present;
- exact bytes and SHA-256 are present;
- adoption is explicit and resolves to the capsule revision;
- duplicate/variant authority is `CLEAR`;
- generated authority summary matches the authority record exactly;
- a bounded live Drive observation record matches the same folder ID, file ID, bytes and SHA-256;
- the live observation is no older than 24 hours.

Version number, filename, timestamp or `pass:true` alone never selects authority.

Unresolved adoption, duplicate authority, wrong family, missing live observation or stale/mismatched live tuple forces fail-closed behavior.

The checked-in live observation record is a verification binding, not a substitute for a trusted Drive observer. A repository-side trusted observer/WIF path must still be deployed and independently verified before system-wide readiness can be declared.

## S1 raw rules

`RAW_MODE` is `EXACT_COPY` or `AUTHORITY_POINTER`.

For `EXACT_COPY`, the checked-in raw bytes must exist and match the exact authority byte count and SHA-256.

The normalized large-inline threshold is **1,048,576 bytes (1 MiB)**. `EXACT_COPY` at or above that threshold requires an explicit `OWNER` or `DELEGATED_OWNER` machine-readable exception with evidence reference and reason.

## OLD→NEW recovery import

Historical work is not blindly discarded or silently imported. Every reused/referenced OLD artifact is classified as one of:

- `REUSE_EXACT`
- `REUSE_AFTER_VERIFY`
- `REGRESSION_CORPUS`
- `REPORT_ONLY`
- `DISCARD_FROM_NEW_RUNTIME`

Reusable byte-bearing artifacts require exact SHA-256 verification. `REPORT_ONLY` and `DISCARD_FROM_NEW_RUNTIME` may not claim imported bytes into the NEW runtime. Every recovery item must declare:

```text
SOURCE_CONTRACT_IMPACT = NONE
```

Any recovery import that changes the Source contract belongs to a separately authorized source-delta task and cannot pass this gate.

## S2 baseline rules

Baseline A is captured before source runtime splitting and must include at least:

- 1280×800
- 390×844
- 320×720
- source-defining states
- interaction inventory
- intentional source-quirk inventory
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

A↔B parity requires geometry, critical style, interaction, intentional-quirk preservation and independent reviewer statuses to PASS.

A SOURCE_TO_PORT record must contain independent `SOURCE_A` and `PORT_B` artifacts.

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

SOURCE_TO_PRODUCT must contain an independent `PRODUCT_C` capture for every required B viewport/state. A `PORT_B` artifact path cannot be reused as a `PRODUCT_C` artifact path.

The product head must be an ancestor of the evidence/promotion commit and no declared Product-bound path may change after that head. Any Source runtime change after the exact port head also invalidates promotion evidence.

Both WEB and Luna1 must independently PASS against the same source authority, port head, product head, product parity hash and evidence hash.

## #564 mandatory negative fixture corpus

`tests/new-source-machine-gates.test.mjs` must deterministically reject all sixteen historical failure classes from Issue #564:

1. `WRONG_FAMILY_IN_NAMESPACE`
2. `DUPLICATE_AUTHORITY_UNRESOLVED`
3. `REVISION_ADOPTION_AMBIGUOUS`
4. `PR_BODY_MANIFEST_HEAD_DRIFT`
5. `DRIVE_AUTHORITY_TUPLE_STALE_OR_WRONG`
6. `MANIFEST_SCHEMA_SHAPE_DRIFT`
7. `REQUIRED_CHECK_CANCELLED_OR_MISSING`
8. `OLD_REPAIR_WHILE_NEW_HOLD_ACTIVE`
9. `CI_GREEN_VISUAL_MISMATCH`
10. `B_C_SCREENSHOT_ALIAS`
11. `SOURCE_INTENTIONAL_QUIRK_SILENTLY_FIXED`
12. `ADAPTER_CONTENT_CAUSES_GEOMETRY_DRIFT`
13. `PRODUCT_SHELL_CLIPS_SOURCE`
14. `VERIFICATION_STALE_AFTER_HEAD_CHANGE`
15. `SELF_DECLARED_PASS_WITHOUT_DERIVED_EVIDENCE`
16. `UNPROTECTED_PROMOTION_PATH`

Additional regression checks cover stale live authority observations, invalid recovery-import impact, pre-S2 runtime creation, TSX/React conversion and large-inline exception handling.

One synthetic positive S0/S1 fixture is useful for validator health, but it does **not** satisfy the required real-source calibration. Final V2 control acceptance remains:

```text
all 16 known-bad fixtures rejected
+ first real source S0→S9 accepted
+ second materially different real source S0→S9 accepted without weakening the rules
```

## CI workflows

- `NEW Source Capsule Gate`
  - schema self-test
  - fail-closed unit tests / #564 negative corpus
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

## Repository-level system readiness

`scripts/new/validate-source-system-readiness.mjs` models the final repository boundary. `SYSTEM_READY` requires all of the following:

- main branch protection or an active ruleset;
- stable NEW checks configured as required checks;
- administrator/emergency bypass handling explicitly audited;
- exact-head required checks all `success`;
- trusted live-authority observation path ready;
- at least sixteen negative fixtures and all passing;
- recovery-import enforcement active.

This validator intentionally reports NOT_READY against an unprotected repository. It does not mutate GitHub settings.

## Remaining repository-level enforcement gap

Workflow checks are necessary but not sufficient while `main` has no repository-level required-check protection/ruleset. Do not declare the #564 system complete or broad implementation released until the intended stable NEW gate checks are configured as repository-level merge requirements and independently verified.

Likewise, a checked-in live authority verification record is not enough by itself: the trusted Drive observer/WIF execution path must be operational and bound into the promotion process.
