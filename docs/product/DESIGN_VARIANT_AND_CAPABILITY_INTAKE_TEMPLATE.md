# Design Lineage, Variant & Capability Intake Template

Use this template whenever a new sibling-supplied design arrives in Google Drive or another approved source.

## Source

- Source project:
- Source folder:
- Source file/artifact:
- Received/modified date:
- Original preserved unchanged: yes / no

## Observed product job

What is the design actually helping the user do?

- Product job:
- Observed flow:
- Observed primary interaction:

Do not infer missing behavior without labeling it as an inference.

## First classification: Lineage or Revision?

Before creating a new Variant, decide whether the item belongs to an existing numbered/design lineage.

- Existing Lineage id/number:
- New Lineage needed: yes / no
- Revision id/version label:
- Revision decision: `baseline` / `candidate` / `approved-plan` / `rejected` / `reference`
- Executable implementation exists: yes / no
- Current lineage status: `active` / `closed` / `hold` / `incoming`

**A V1/V2/V3/V4 label inside one design track is a Revision, not a new LoveTree product generation.**

Create a new Lineage only when the work has a genuinely separate design thesis, benchmark lineage, product job or interaction direction. Cosmetic fixes and iterative refinements stay inside the existing Lineage.

## Second classification: Variant / Capability / Reference

Select every classification that applies:

- [ ] Scenario Variant — a candidate surface/experience to compare
- [ ] Experience Capability — a reusable mechanic that multiple Variants could consume
- [ ] Both
- [ ] Reference-only benchmark
- [ ] Superseded/history

Do **not** create a new V5/V6/V7 whole product by default.

## Scenario mapping

Choose existing Scenario(s) when possible:

- Historical Baselines
- Entry / Onboarding
- Tree Workspace / Lifecycle
- Graph / Timeline / Retrospective
- People / Archive
- Community
- Milestones / 300+ Growth
- Cinematic / Brand

New Scenario justification, only if truly necessary:

## Variant record, when applicable

- Candidate id:
- Parent Lineage id, when applicable:
- Revision id, when applicable:
- Candidate route:
- Kind: `screen` / `mechanic` / `experience` / `historical`
- Status: `received` / `mapped` / `implemented` / `validated` / `shortlisted` / `selected` / `superseded`
- Source-faithful characteristics that must be preserved:
  - layout/hierarchy:
  - typography/color:
  - signature geometry/material:
  - motion/transitions:
  - modal/overlay lifecycle:
  - drag/pan/zoom/keyboard:
  - mobile behavior:
  - media lifecycle:

## Capability record, when applicable

- Capability id:
- Reusable mechanism:
- Status: `observed` / `mapped` / `prototype-requested` / `prototyped` / `validated` / `adopted` / `rejected`
- Observed source evidence:
- LoveTree scenarios that could consume it:
- Data/input contract:
- Integration rule:
- What must **not** be copied from the source product:
- Browser/performance risk:
- Mobile/touch risk:
- Accessibility/reduced-motion risk:

## Shared Product Core boundary

State the shared core dependencies. Visual work must not fork them by default.

- Auth:
- Tree:
- Moment:
- Relation:
- Community:
- privacy/visibility:
- media/video timing:
- additional backend need, if any:

If a capability appears to require schema/backend changes, record the need and open a separate backend decision. Do not silently change DB/Auth contracts from a design intake task.

## Validation

Revision/Lineage checks:

- [ ] revision is attached to the correct lineage
- [ ] baseline/candidate/rejected status is explicit
- [ ] earlier approved/baseline files remain preserved
- [ ] a cosmetic revision did not create a new product family

Variant-owned checks:

- [ ] renders
- [ ] primary interaction
- [ ] desktop responsive behavior
- [ ] mobile responsive behavior
- [ ] modal/overflow lifecycle when relevant
- [ ] shared-data compatibility

Capability-owned checks:

- [ ] isolated mechanism works
- [ ] fallback defined
- [ ] touch/mobile behavior defined
- [ ] reduced-motion/accessibility considered
- [ ] performance/browser risk measured when needed

## Review outcome

- Strongest characteristic:
- Weakest characteristic:
- Better/worse than which existing revision/candidate:
- Recommendation: observe / prototype / implement / shortlist / select / reject
- User review:
- Sibling review:
- Follow-up issue/PR:
