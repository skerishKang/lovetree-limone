# LoveTree Next — sibling Drive capability audit · 2026-08-09

Status: research/provenance only. This document does not promote a sibling product into LoveTree and does not authorize Production implementation.

Parent research: #78  
Capability architecture: #77 / #74  
Validated implementation base: PR #76 head `cb715cdbd46484d73805f8d3f7c0442065fb445f`

## Audit rules used

- Drive originals were read only; nothing was moved or edited.
- Only behavior present in executable HTML is recorded as **observed**.
- Product-specific semantics are not copied wholesale into LoveTree.
- A LoveTree application below is an **inference/recommendation**, not a claim about the source.
- Patterns already represented by #77 (orbit, cinematic transition, fragment convergence, relationship board, temporal evolution, physical book, spatial document exploration, long-form chapter navigation) are not re-registered here.

---

## CAP-09 — Intent-to-Path Navigation

### 1. Source

Project: 광주 북구 AI Navigator  
Drive file: `02_광주북구_AI내비게이터_시네마틱홈_v1.html`  
Drive id: `1jqUERqZ8DIZku441gmMQcDAA-UTXh-IP`  
Observed file size: 72,763 bytes.

### 2. What the interaction actually does — observed

The page accepts a free-text question or a suggested question, matches keywords against a small scenario registry, then reconfigures one continuous experience around the selected scenario.

Observed flow:

`question / suggestion → scenario match → tokenized question → route nodes → staged result → next action`

The source implements `findScenario(q)`, scores each scenario's `match` keywords, and calls the same scenario execution flow from suggestion/discovery buttons. The route/result area then updates its tokens, route labels and staged result content from the selected scenario.

This is not merely a search box. The question becomes the organizing key for the rest of the page.

### 3. Signature visual / motion characteristics — observed

- command-card entry with free-text question and suggestion chips;
- long sticky `route-scene` / route theater;
- route nodes and connecting line progression;
- staged result tabs (`지금 상황`, `확인된 조건`, `가능한 결과`, `다음 행동`);
- page-level cinematic progression while preserving an actionable information architecture.

### 4. Input / data needed

Minimum reusable interface:

```ts
type IntentPath = {
  id: string;
  matchTerms: string[];
  prompt: string;
  tokens: string[];
  route: [string, string, string];
  stages: Array<{
    label: string;
    title: string;
    body: string;
    action?: string;
  }>;
};
```

A production implementation should replace keyword scoring with an explicit deterministic router or AI classifier whose selected path remains inspectable.

### 5. Mobile / responsive behavior — observed

- viewport-aware responsive CSS;
- navigation collapses for mobile;
- discovery cards become horizontally scrollable/snap-oriented;
- route/path areas allow overflow where needed rather than forcing desktop geometry;
- large detail compositions collapse to one column.

### 6. Accessibility / reduced-motion — observed

Strong source baseline:

- skip link;
- `:focus-visible` treatment;
- semantic buttons for scene/suggestion navigation;
- `prefers-reduced-motion: reduce` disables boot and animated transitions, converts the sticky route sequence to a static relative layout, and makes route/workflow elements immediately visible.

Risk: a future AI classifier must expose why a path was selected and must not trap keyboard/screen-reader users inside a purely cinematic route.

### 7. LoveTree scenarios it could improve — inference

Best fit:

- First Journey: user says what they want to remember, then LoveTree routes them into an appropriate first-moment capture path;
- Tree Detail / revisit: user asks a natural question such as “처음 좋아하게 된 순간 보여줘”, “무대 기억만 보고 싶어”, “올해 가장 많이 저장한 순간은?” and receives an inspectable path through existing Moments;
- Memory discovery/search: query becomes a path through people, dates, categories and linked Moments rather than a flat result list.

### 8. Classification

`Capability` first.  
It could also underpin several Scenario Variants, but the source itself should **not** be registered as a LoveTree whole-screen Variant.

### 9. Risks / cost

- classifier ambiguity and wrong routing;
- cinematic/sticky route can become expensive on low-end mobile if over-animated;
- query-to-path logic must be deterministic enough for validation;
- path explanation and no-result recovery are required;
- source is DOM/CSS/JS, not WebGL, so baseline implementation cost is moderate.

### 10. Recommendation

**PROTOTYPE.** Extract the question→path state machine and reduced-motion contract. Do not copy the municipal visual language.

---

## CAP-10 — Source / Media Inspection Deck

### 1. Source

Project: 사실로  
Drive file: `01_사실로_증거검사실_v1.html`  
Drive id: `1bxgbIAlS4zyu1765ZsbyXZUukQNCqMkl`.

### 2. What the interaction actually does — observed

The UI keeps one inspection shell but swaps both the viewed object and the control set according to media type.

Observed media-specific controls include:

- message: previous/next sentence highlight;
- audio: play, rewind, forward, playhead;
- CCTV: play, previous/next frame, time/frame state;
- document: previous/next page;
- photo: original/edited toggle;
- video: playback;
- generic objects: linked-fact inspection;
- all types: previous/next evidence plus zoom controls.

Selecting an item also replaces the right-hand metadata and context panel. The data model exposes acquisition route, original/copy status, edit status, hash, privacy, linked event/person, supporting meaning and conflicting/limiting meaning.

### 3. Signature visual / motion characteristics — observed

- three-part desktop workspace: type rail / centered inspection stage / metadata panel;
- physicalized media objects presented on a neutral inspection stage;
- object-specific control deck;
- subtle object enter/leave transitions and optional zoom/rotation;
- metadata remains visually distinct from the media itself.

### 4. Input / data needed

A reusable LoveTree adaptation would need a media-agnostic item plus type-specific inspection adapters:

```ts
type InspectableMemory = {
  id: string;
  mediaType: "image" | "video" | "audio" | "document" | "message" | "link";
  sourceUrl?: string;
  thumbnail?: string;
  capturedAt?: string;
  createdAt?: string;
  sourceLabel?: string;
  originalStatus?: string;
  editStatus?: string;
  checksum?: string;
  privacy?: string;
  relatedMomentIds?: string[];
};
```

### 5. Mobile / responsive behavior — observed

Below 760px:

- desktop body overflow lock is removed;
- type rail becomes a sticky horizontal chip rail;
- inspection stage gets a fixed mobile-height composition;
- media objects are resized substantially;
- bottom controls become horizontally scrollable;
- metadata becomes a collapsible detail section via `aria-expanded`.

### 6. Accessibility / reduced-motion — observed

- evidence/type items use button/option semantics and `aria-selected`;
- focus is moved to the new stage title after changing media;
- live-region text announces the new selected item;
- control buttons carry labels for previous/next/zoom;
- mobile metadata disclosure updates `aria-expanded`;
- reduced-motion media query reduces all animation/transition durations to effectively zero.

Risks for LoveTree: media playback controls need full keyboard semantics, captions/transcripts for audiovisual memory, and privacy rules must be product-specific rather than inherited from 사실로.

### 7. LoveTree scenarios it could improve — inference

Strong fit:

- Moment Detail: inspect the original image/video/audio/link without leaving the emotional context;
- Tree Detail: switch between media types while keeping related Moment context stable;
- Memory provenance/history: show capture date, source, edits, linked Moments and derived thumbnails;
- creator review / import: compare an imported asset with its transformed/cropped representation.

The emotional surface should remain LoveTree-like. The reusable part is the **inspection adapter architecture**, not the legal-evidence styling.

### 8. Classification

`Capability`.

It is not a LoveTree Variant because its strongest value is the media-type adapter/control model that several Moment/Tree variants could share.

### 9. Risks / cost

- multiple media players increase implementation/test surface;
- large source media can hurt memory and startup performance;
- cross-origin/video frame inspection has browser limitations;
- checksum/provenance fields must not imply evidentiary/legal validity in LoveTree;
- mobile fixed inspection height must be tested against very small viewports.

### 10. Recommendation

**ADOPT THE ADAPTER PATTERN / PROTOTYPE THE UI.** High reuse potential for Moment Detail and imported memories. Rename all evidence/legal semantics before any LoveTree implementation.

---

## CAP-11 — Question-Lens Recomposition

### 1. Source

Project: 이어온  
Drive file: `01_이어온_오늘의회사_v1_기능형.html`  
Drive id: `1BBMWVJlZOSdNkb2ZHuQIigcAjCX7fnh8`.

### 2. What the interaction actually does — observed

The page defines four user questions/lenses:

1. `지금 어디에 있는가`
2. `무엇이 바뀌었는가`
3. `무엇이 위험한가`
4. `다음에 무엇을 해야 하는가`

`setQuestion(key)` does more than highlight a tab: it changes the active issue, default entity and dependent state, then re-renders the page. Selecting timeline items can also infer the appropriate question lens. Search terms can move the system to a question/entity/timeline combination. The lens is therefore a state coordinator across several visual/data regions.

### 3. Signature visual / motion characteristics — observed

- persistent question rail on desktop;
- the same underlying workspace is recomposed rather than navigating to separate pages;
- hero summary, issue list, entity state, timeline and evidence/next-action areas respond to one shared lens state;
- URL/state helpers are present for compact/highlight state;
- visual treatment is dashboard-like rather than cinematic.

### 4. Input / data needed

```ts
type ExperienceLens = {
  id: string;
  label: string;
  applicableItemIds: string[];
  defaultFocusId?: string;
  deriveSummary(data: unknown): unknown;
};
```

The important contract is a single canonical data graph plus multiple explicit lens projections; not separate copies of the data per view.

### 5. Mobile / responsive behavior — observed

- three-column desktop collapses to two, then one column;
- question rail is reproduced as a sticky mobile bottom navigation;
- hero/content/detail grids collapse to one column;
- selected question state is preserved between desktop and mobile control surfaces.

### 6. Accessibility / reduced-motion — observed / concern

Observed source has semantic buttons and mobile button navigation.  
No `prefers-reduced-motion` handling was found in this source, so motion accessibility is a **gap**, not a capability to copy.

### 7. LoveTree scenarios it could improve — inference

Possible LoveTree lenses over one Tree/Moment dataset:

- `처음` — origin / first Moment;
- `최근` — what changed or was added recently;
- `연결` — which Moments lead to other people/categories/memories;
- `다시보기` — what should be resurfaced now.

This could improve mature Tree exploration without creating four different pages or duplicating state.

### 8. Classification

`Capability`.

Potentially used by Tree Detail, long-running Tree archive, seasonal recap and “100 Moments” exploration variants.

### 9. Risks / cost

- recomposition can be disorienting if too much of the page changes at once;
- lens state must remain shareable/deep-linkable;
- mobile and desktop controls must point to the same state source;
- source lacks reduced-motion handling;
- avoid executive-dashboard semantics in the consumer LoveTree surface.

### 10. Recommendation

**OBSERVE → PROTOTYPE after CAP-09.** CAP-09 is the stronger immediate First Journey mechanic; CAP-11 becomes more valuable once a Tree has enough Moments that multiple views are necessary.

---

## Reviewed but not promoted in this batch

### BioR&D

Files found include IA/user-journey, safety/HITL, PoC roadmap and design-team specifications, but no BioR&D executable HTML was found in the targeted Drive search. Those documents may contain useful planned review/provenance patterns, but #78 requires us to distinguish observed behavior from design intent. **No executable capability is promoted from BioR&D in this batch.**

### Existing #77 sources

이어온 cinematic memory trace, 사실로 relationship/incident board, 또다른우주 book navigation, 아스테리브 spatial shelf/document work and Guided Reader long-form navigation remain covered by #77 and were not duplicated here.

---

## Intake decisions

| ID | Pattern | Source | Classification | Recommendation |
|---|---|---|---|---|
| CAP-09 | Intent-to-Path Navigation | 광주 북구 AI Navigator | Capability | Prototype |
| CAP-10 | Source / Media Inspection Deck | 사실로 | Capability | Adopt adapter pattern; prototype UI |
| CAP-11 | Question-Lens Recomposition | 이어온 | Capability | Observe → prototype |

## Suggested order

1. Prototype CAP-09 against LoveTree First Journey using a small deterministic intent registry.
2. Extract CAP-10 as a typed media inspection adapter independent of visuals.
3. Prototype CAP-11 only against a sufficiently dense Tree dataset; do not add it to the first-use flow.

No DB, Auth, Worker, Firebase, Production or Drive original was modified by this audit.
