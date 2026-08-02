import assert from "node:assert/strict";
import test from "node:test";
import {
  ARCHIVE_LAYOUTS,
  ARCHIVE_VIEWS,
  DEFAULT_ARCHIVE_LAYOUT,
  DEFAULT_ARCHIVE_VIEW,
  archiveHref,
  archiveQueryFromSearch,
  normalizeArchiveQuery,
  parseArchiveLayout,
  parseArchiveView,
  parseMomentId,
  parseSubjectId,
  serializeArchiveQuery,
  withArchiveState,
} from "../app/components/v3/v3-archive-state.ts";

const SUBJECTS = ["person-example", "work-spring-stage", "travel-songs", "study-nights"];
const MOMENTS = ["ma-01", "ma-02", "ma-09", "mc-01"];

function params(search) {
  return new URLSearchParams(search.replace(/^\?/, ""));
}

// 1. valid view parsing
test("archive state parses valid views", () => {
  assert.equal(parseArchiveView("stage"), "stage");
  assert.equal(parseArchiveView("shelf"), "shelf");
  assert.equal(parseArchiveView("folding"), "folding");
  assert.equal(parseArchiveView(undefined), DEFAULT_ARCHIVE_VIEW);
});

// 2. invalid view fallback
test("archive state falls back to a safe default for invalid views", () => {
  assert.equal(parseArchiveView("banana"), DEFAULT_ARCHIVE_VIEW);
  assert.equal(parseArchiveView("GRID"), DEFAULT_ARCHIVE_VIEW);
  assert.equal(parseArchiveView(""), DEFAULT_ARCHIVE_VIEW);
  assert.equal(parseArchiveView(null), DEFAULT_ARCHIVE_VIEW);
});

// 3. valid layout parsing
test("archive state parses valid stage layouts", () => {
  assert.equal(parseArchiveLayout("wave"), "wave");
  assert.equal(parseArchiveLayout("orbit"), "orbit");
  assert.equal(parseArchiveLayout("free"), "free");
  assert.equal(parseArchiveLayout("diagonal"), "diagonal");
  assert.equal(parseArchiveLayout("vinyl"), "vinyl");
});

// 4. invalid layout fallback
test("archive state falls back to a safe default for invalid layouts", () => {
  assert.equal(parseArchiveLayout("spiral"), DEFAULT_ARCHIVE_LAYOUT);
  assert.equal(parseArchiveLayout(""), DEFAULT_ARCHIVE_LAYOUT);
  assert.equal(parseArchiveLayout(null), DEFAULT_ARCHIVE_LAYOUT);
  assert.equal(parseArchiveLayout("GRID"), DEFAULT_ARCHIVE_LAYOUT);
});

// 5. old cascade alias resolves to diagonal
test("legacy cascade layout alias is disposed as diagonal", () => {
  assert.equal(parseArchiveLayout("cascade"), "diagonal");
  const state = normalizeArchiveQuery(params("view=stage&layout=cascade"), SUBJECTS, MOMENTS);
  assert.equal(state.layout, "diagonal");
  assert.equal(serializeArchiveQuery(state).get("layout"), "diagonal");
});

// 6. layout is ignored and normalized away outside the stage view
test("layout is ignored and normalized away outside the stage view", () => {
  const state = normalizeArchiveQuery(params("view=shelf&layout=orbit"), SUBJECTS, MOMENTS);
  assert.equal(state.view, "shelf");
  assert.equal(state.layout, DEFAULT_ARCHIVE_LAYOUT);
  const serialized = serializeArchiveQuery(state);
  assert.equal(serialized.get("layout"), null, "non-stage URLs must not carry a layout param");
});

// 7. valid and invalid subject ids
test("subject ids are validated against the known subject set", () => {
  assert.equal(parseSubjectId("person-example", SUBJECTS), "person-example");
  assert.equal(parseSubjectId("missing-subject", SUBJECTS), null);
  assert.equal(parseSubjectId("", SUBJECTS), null);
  assert.equal(parseSubjectId(null, SUBJECTS), null);
  const state = normalizeArchiveQuery(params("view=stage&subject=no-such-id"), SUBJECTS, MOMENTS);
  assert.equal(state.subjectId, null);
});

// 8. valid and invalid moment ids
test("moment ids are validated against the known moment set", () => {
  assert.equal(parseMomentId("ma-01", MOMENTS), "ma-01");
  assert.equal(parseMomentId("m-01", MOMENTS), null);
  assert.equal(parseMomentId("", MOMENTS), null);
  assert.equal(parseMomentId(null, MOMENTS), null);
  const state = normalizeArchiveQuery(params("view=stage&moment=ghost"), SUBJECTS, MOMENTS);
  assert.equal(state.momentId, null);
});

// 9. serialization round trip
test("archive state survives a serialization round trip", () => {
  const inputs = [
    "view=stage&layout=vinyl&subject=person-example&moment=ma-01",
    "view=shelf&subject=work-spring-stage",
    "view=folding&moment=mc-01",
    "",
  ];
  for (const input of inputs) {
    const first = normalizeArchiveQuery(params(input), SUBJECTS, MOMENTS);
    const serialized = serializeArchiveQuery(first);
    const second = normalizeArchiveQuery(serialized, SUBJECTS, MOMENTS);
    assert.deepEqual(second, first, `round trip failed for ${input || "(empty)"}`);
  }
});

// 10. mode change preserves selected subject and moment
test("mode changes preserve the selected subject and moment", () => {
  const state = normalizeArchiveQuery(
    params("view=stage&layout=orbit&subject=person-example&moment=ma-01"),
    SUBJECTS,
    MOMENTS,
  );
  const folded = withArchiveState(state, { view: "folding" });
  assert.equal(folded.subjectId, "person-example");
  assert.equal(folded.momentId, "ma-01");
  const shelved = withArchiveState(folded, { view: "shelf" });
  assert.equal(shelved.subjectId, "person-example");
  assert.equal(shelved.momentId, "ma-01");
});

// 11. layout change preserves the selected moment
test("layout changes preserve the selected moment", () => {
  const state = normalizeArchiveQuery(
    params("view=stage&layout=wave&subject=person-example&moment=ma-09"),
    SUBJECTS,
    MOMENTS,
  );
  for (const layout of ARCHIVE_LAYOUTS) {
    const next = withArchiveState(state, { layout });
    assert.equal(next.momentId, "ma-09", `layout ${layout} must keep the moment`);
  }
});

// 12. invalid query values normalize without errors and produce stable URLs
test("invalid query values normalize without errors and are not rewritten in a loop", () => {
  const state = normalizeArchiveQuery(
    params("view=explode&layout=spiral&subject=nope&moment=ghost"),
    SUBJECTS,
    MOMENTS,
  );
  assert.deepEqual(state, {
    view: DEFAULT_ARCHIVE_VIEW,
    layout: DEFAULT_ARCHIVE_LAYOUT,
    subjectId: null,
    momentId: null,
  });
  const serialized = serializeArchiveQuery(state).toString();
  const again = normalizeArchiveQuery(new URLSearchParams(serialized), SUBJECTS, MOMENTS);
  assert.equal(serializeArchiveQuery(again).toString(), serialized, "normalization must be idempotent");
});

// 13. archiveHref builds copy-paste-able URLs
test("archiveHref serializes a full shareable href", () => {
  const state = {
    view: "stage",
    layout: "vinyl",
    subjectId: "person-example",
    momentId: "ma-01",
  };
  assert.equal(
    archiveHref("/v3/subjects/demo", state),
    "/v3/subjects/demo?layout=vinyl&subject=person-example&moment=ma-01",
  );
});

// 14. archiveQueryFromSearch parses a raw location search string
test("archiveQueryFromSearch parses raw search strings", () => {
  const state = archiveQueryFromSearch(
    "?view=folding&subject=work-spring-stage&moment=mc-01",
    SUBJECTS,
    MOMENTS,
  );
  assert.equal(state.view, "folding");
  assert.equal(state.subjectId, "work-spring-stage");
  assert.equal(state.momentId, "mc-01");
  const clean = archiveQueryFromSearch("", SUBJECTS, MOMENTS);
  assert.deepEqual(clean, {
    view: DEFAULT_ARCHIVE_VIEW,
    layout: DEFAULT_ARCHIVE_LAYOUT,
    subjectId: null,
    momentId: null,
  });
});

// 15. constants cover the required contract
test("archive constants cover the required view and layout contract", () => {
  assert.deepEqual([...ARCHIVE_VIEWS], ["stage", "shelf", "folding"]);
  assert.deepEqual([...ARCHIVE_LAYOUTS], ["wave", "orbit", "free", "diagonal", "vinyl"]);
});
