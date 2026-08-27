# LoveTree Exact Source Parity Policy

Authority: Product-owner decision / Issue #539

Status: **P0 HARD GATE** for every authoritative design-source IMPLEMENT / PORT / RECREATE / 원본대로 구현 task.

This policy strengthens `IMPLEMENTATION_FIDELITY_CONTRACT.md`. If wording in an older issue, PR, ledger, checklist, implementation report, or review can be interpreted as allowing a merely similar implementation, this policy controls the current interpretation.

## 1. Non-negotiable principle

When LoveTree receives an authoritative executable design source such as HTML/CSS/JS and the product owner asks to **IMPLEMENT / PORT / RECREATE / 원본대로 구현**, the job is a **runtime/framework translation**, not a redesign exercise.

```text
AUTHORITATIVE HTML/CSS/JS
        ↓
100% observable UI/UX parity
        ↓
React / Next.js runtime translation
        ↓
canonical Tree / Moment / media / route binding
        ↓
matched source-native-product proof
```

The default expectation is therefore:

```text
SOURCE_DESIGN_RECEIVED = YES
PORT_REQUESTED = YES
EXPECTED_SOURCE_PARITY = 100%
KNOWN_UNAPPROVED_DIFFERENCES = 0
```

A port is not considered complete because it is “close”, “similar”, “same design language”, “same mood”, “same concept”, “mostly faithful”, or “visually inspired by” the source.

There is **no 90%, 95%, 98%, or close-enough completion class** for a faithful-port task.

## 2. What “100%” means

`100% SOURCE PARITY` means **all observable source-owned UI and interaction requirements have been preserved, and there are zero known unapproved semantic/visual/interaction differences**.

This includes, where present in the source:

- overall composition;
- spatial hierarchy;
- viewport occupation;
- component position;
- width / height / aspect ratio;
- margins / padding / gaps;
- typography family / weight / size / line-height / tracking;
- colors / gradients / opacity;
- borders / radii;
- shadows / glow / glass / blur / refraction;
- depth / perspective / transforms / z-order;
- image/video placement and crop behavior;
- entry state;
- hover state;
- selected state;
- expanded / inspector / modal / viewer state;
- transitions and animation sequence;
- timing and easing identity where observable;
- click / tap result;
- second-click / deselection behavior;
- pointer movement effects;
- drag / swipe ownership;
- wheel / zoom / pan behavior;
- keyboard navigation;
- focus behavior;
- Escape / close behavior;
- Back / Forward state continuity where relevant;
- branch / path / WHY NEXT behavior;
- replay / cinema / media controls;
- mobile composition;
- touch behavior;
- reduced-motion semantic behavior;
- navigation outcome.

If any source-owned observable behavior or visual property is knowingly missing, simplified, replaced, reordered, resized, recolored, retimed, or reinterpreted without explicit owner approval:

```text
SOURCE_PARITY = FAIL
PRODUCT_FIDELITY_PASS = NO
IMPLEMENTED = NO
```

## 3. 100% parity is evaluated semantically, not by naive pixel identity

The acceptance target is exact observable parity, but raw raster pixels may differ for reasons that do not represent a design difference, for example:

- browser text anti-aliasing;
- OS font rasterization;
- GPU compositing;
- sub-pixel rounding;
- canonical content strings having different lengths from demo strings;
- canonical media identity replacing demo media identity;
- browser-native control rendering that the source itself did not lock.

These do **not** create permission to visually reinterpret the source.

A difference may be accepted only if all of the following are true:

1. the source-owned design/interaction intent is unchanged;
2. the difference is technically unavoidable or caused by truthful canonical data substitution;
3. the difference is explicitly documented in the evidence report;
4. the independent reviewer agrees that it is non-semantic;
5. there is no feasible source-faithful alternative being skipped for convenience.

Therefore the operative gate is:

```text
KNOWN_UNAPPROVED_SOURCE_DIFFERENCES = 0
```

not merely a screenshot similarity percentage.

## 4. Framework conversion is not a design-authoring step

The following translations are normal implementation mechanics and do not authorize visual/UX changes:

```text
HTML            → JSX / TSX
CSS             → CSS module / scoped product CSS
DOM mutation    → React state
DOM events      → React event handlers
source fixtures → canonical Tree / Moment data adapter
relative links  → Next.js routes
local selection → canonical URL / product selection state
```

A developer or model must not treat framework conversion as permission to:

- rebuild the page in a different layout system merely for convenience;
- substitute a generic product card/list/shell;
- simplify a spatial scene;
- replace custom interactions with standard controls;
- extract only “design grammar” or “visual language”;
- change visual hierarchy because React components are easier that way;
- reduce item counts because canonical data integration is harder;
- remove animation because state management is harder;
- change mobile behavior because the source CSS is inconvenient to port.

If the original executable can render the behavior, the port is expected to reproduce it unless the owner explicitly authorizes an exception.

## 5. Port first, UX hardening second

An authoritative source may itself contain UX problems. That does **not** justify changing the design during the initial faithful port.

The required sequence is:

```text
PHASE A — EXACT SOURCE PORT
source UI/UX → React/Next with 100% observable parity

PHASE B — PRODUCT INTEGRATION
canonical data / routes / Auth-compatible behavior behind the same surface

PHASE C — UX HARDENING
identify real UX defects after parity is proven

PHASE D — APPROVED UX REPAIR
make the smallest approved improvement and prove no unintended design regression
```

This distinction is mandatory.

A source UX defect must be reported as a separate item such as:

```text
SOURCE_PARITY = PASS
SOURCE_UX_DEFECT = <description>
UX_REPAIR_REQUIRED = YES/NO
UX_REPAIR_OWNER_APPROVED = YES/NO
```

Do not “fix UX” by silently changing the source during the port and then claim the result is the source implementation.

Safety, accessibility, browser-compatibility, or severe responsive defects may require earlier hardening, but any such change must be minimal, explicit, evidence-backed, and reviewed against the original source identity.

## 6. Canonical data substitution must preserve the surface

Demo values are not product truth. They may be replaced with canonical values, but the UI/UX structure must remain source-faithful.

Examples:

```text
demo Moment       → canonical Moment
fixture parent    → canonical parentId / Connection
fixture image     → canonical thumbnail / sourceUrl
demo tree id      → canonical treeId
local file link   → canonical Next route
in-memory select  → canonical selected Moment state
```

Canonical data substitution is **not** permission to replace the source UI with an existing generic product screen.

If canonical data is temporarily missing for a source region, prefer an explicit bounded empty/unavailable state inside the original composition. Do not redesign the entire page to avoid the missing field.

## 7. Forbidden completion shortcuts

None of the following is sufficient evidence of 100% implementation:

```text
CI_GREEN
ROUTE_EXISTS
PAGE_LOADS
NATIVE_COMPONENT_EXISTS
DESIGN_LAB_PASS
CANONICAL_DATA_BOUND
CLICK_WORKS
SCREENSHOT_EXISTS
NO_CONSOLE_ERRORS
RESPONSIVE_TEST_PASS
DONOR_INTEGRATED
VISUAL_LANGUAGE_REUSED
SAME_COLOR_PALETTE
SAME_GENERAL_COMPOSITION
```

All may be useful evidence, but none replaces matched source fidelity review.

Likewise:

```text
“looks close”            = FAIL
“same idea”              = FAIL
“same design language”   = FAIL
“adapted for product”    = DONOR/ADAPT unless explicitly approved
“better UX”              = separate UX change, not proof of source parity
“React version”          = not automatically a faithful port
```

## 8. Required three-surface proof

Every faithful port must compare:

```text
A = authoritative source executable
B = native React/Next source-faithful proving surface
C = canonical product route with canonical data
```

Required matched viewports at minimum:

- `1280x800`
- `390x844`
- `320x720`

Required matched states must include:

- initial state;
- selected / focused state;
- inspector / modal / viewer state where present;
- one or more source-defining interaction states;
- mobile state;
- reduced-motion state where applicable.

Evidence must include:

- source screenshot;
- native screenshot;
- product screenshot;
- source/native side-by-side;
- source/product side-by-side;
- overlay or diff where useful;
- interaction outcome matrix;
- console/page/network/overflow observations;
- explicit list of every known difference;
- reviewer disposition for every difference.

## 9. Difference accounting is mandatory

Every visual/interaction review must produce a difference ledger.

For every observed difference:

```text
DIFF_ID =
SURFACE = SOURCE_NATIVE | SOURCE_PRODUCT
CATEGORY = VISUAL | INTERACTION | DATA_SUBSTITUTION | RASTER_ONLY | SOURCE_DEFECT
DESCRIPTION =
SOURCE_EXPECTATION =
IMPLEMENTATION_RESULT =
BLOCKING = YES/NO
APPROVED_EXCEPTION = YES/NO
REVIEWER =
```

The final faithful-port gate is:

```text
BLOCKING_DIFFS = 0
UNAPPROVED_DIFFS = 0
SOURCE_PARITY_100 = YES
```

If a reviewer can point to a real unapproved difference, the task is not done.

## 10. Two-stage independent verification is mandatory

The permanent verification pattern is:

```text
1. LOCAL implements and self-tests.
2. ChatGPT / Integration CTO independently reviews exact-head code, diff, source authority, file scope, collisions, tests and CI.
3. LOCAL captures matched source/native/product visual + interaction evidence.
4. ChatGPT / Integration CTO independently re-reviews the actual screenshots and interaction outcomes.
5. Only then can SOURCE_PARITY_100 = YES and PRODUCT_FIDELITY_PASS = YES be recorded.
```

A LOCAL self-report cannot self-certify 100% parity.

A text-only statement saying “screenshots match” cannot self-certify 100% parity.

The final reviewer must be able to inspect the actual matched visual evidence.

## 11. Required implementation states

For faithful-port work, use this state sequence:

```text
SOURCE_PINNED
→ SOURCE_BEHAVIOR_INVENTORIED
→ NATIVE_PORT_COMPLETE
→ SOURCE_NATIVE_PARITY_100
→ CANONICAL_DATA_BOUND
→ CANONICAL_ROUTE_INTEGRATED
→ SOURCE_PRODUCT_PARITY_100
→ PRODUCT_FIDELITY_PASS
→ UX_HARDENING_REVIEW
→ PRODUCTION_READY
```

`IMPLEMENTED = YES` is forbidden before `SOURCE_PRODUCT_PARITY_100 = YES` and `PRODUCT_FIDELITY_PASS = YES`.

## 12. Explicit donor/adaptation work remains allowed, but must be named correctly

If the owner explicitly asks for:

- DONOR;
- ADAPT;
- INSPIRED;
- GRAMMAR;
- VISUAL LANGUAGE;
- CAPABILITY EXTRACTION;
- MECHANICS EXTRACTION;

then 100% source parity is not the task.

Such work must be labeled as donor/adaptation work and must never be counted as an exact source implementation.

The absence of the words above is not permission to infer donor mode when the owner provided an executable design and asked to implement it.

## 13. Five-Source P0 application

Issue #539 calibration targets:

- SOURCE:64 Floating Moment Welcome Orbit;
- SOURCE:58 Living Memory Pinboard Cinematic;
- SOURCE:57 Living Glass Moment Card;
- SOURCE:56 Vertical Moment Relationship Network;
- SOURCE:60 3D Moment Cluster Deep Explorer.

For these five, the immediate goal is not “improve the product design”. The immediate goal is:

```text
FIRST: 100% source-faithful product implementation
THEN: identify and repair real UX problems as separate reviewed work
```

No Five-Source child issue may close on a merely similar canonical surface.

## 14. Codex and remaining corpus inheritance

After #539 closes, the same distinction applies to #540 Codex and then to the remaining 108-result / 88-working-family audit:

- faithful implementation request → 100% source parity required;
- explicit donor/adaptation decision → divergence allowed and labeled donor/adapt;
- ambiguous historical implementation claims → reclassify based on actual evidence, not wording optimism.

## 15. Required final report

Every faithful-port completion report must include:

```text
SOURCE_AUTHORITY =
SOURCE_FINGERPRINT =
PORT_REQUEST_MODE = EXACT_SOURCE_PORT
SOURCE_BEHAVIOR_INVENTORIED = YES/NO
NATIVE_PORT =
SOURCE_NATIVE_PARITY_100 = YES/NO
CANONICAL_DATA_BOUND = YES/NO
CANONICAL_ROUTE_INTEGRATED = YES/NO
SOURCE_PRODUCT_PARITY_100 = YES/NO
BLOCKING_DIFFS = <count>
UNAPPROVED_DIFFS = <count>
APPROVED_NON_SEMANTIC_EXCEPTIONS = <count + list>
SOURCE_UX_DEFECTS_FOUND = <count + list>
UX_REPAIR_SEPARATE_FROM_PORT = YES/NO
PRODUCT_FIDELITY_PASS = YES/NO
PRODUCTION_READY = YES/NO
```

The final acceptance invariant is:

```text
IMPLEMENT / PORT / 원본대로 구현
=
100% observable source parity
+
canonical product integration
+
zero known unapproved differences
```
