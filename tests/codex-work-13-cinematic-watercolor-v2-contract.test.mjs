import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(
  readFileSync(
    new URL("../design-intake/codex-work-13-cinematic-watercolor-v2.json", import.meta.url),
    "utf8",
  ),
);

const MD5 = /^[0-9a-f]{32}$/;
const DRIVE_ID = /^[A-Za-z0-9_-]{25,44}$/;

const expectedAssets = new Map([
  ["01-moment-awakens-clean.mp4", ["1BoyX3FF4qMMeoNv0pstI56xO2lJqm0fw", 3421328, "38a078edd6afd5249c5c5d7d01f37fb4"]],
  ["02-season-becomes-lovetree-clean.mp4", ["14UZkq6X46c_hqktrNF2hmQdhAMOqcM1o", 5594765, "2d6c4fada408dec057d1addee6aeee4e"]],
  ["03-quiet-editorial.png", ["1ACfWF2DYd2HfT8iPgXBsyD81Ro17xeOa", 2436662, "682cef8c9e05b7db9adb641f539bbea9"]],
  ["04-paths-editorial.png", ["1sF7IuiBtkDesA_ODvHJDpWRcv_6pgTfc", 2901881, "88338c2b6698a59371437c364bd6dcae"]],
  ["05-bloom-editorial.png", ["1lttDjdr4QN1bEY2TG36FngG1VLCPXyyl", 3014192, "b7991f9e439197ab04b3554b381bbb5f"]],
  ["06-season-cover.png", ["1iLHXmTr9hw_NjdG8SnemWj7JHkUStrW7", 2929558, "e70f62f60b7f8f78a590ceca1d8bf9d4"]],
  ["07-lovetree-overhead-final.png", ["16oBdZD-mjVBtgoX545YlfJAgw8_4p47j", 2635847, "09efae09c7b720b59e2b28eb59953ac7"]],
]);

const expectedRecordings = [
  {
    master_row: 13,
    filename: "녹화_2026_08_13_23_03_02_988.mp4",
    drive_file_id: "1lQ_8XURf1urCQaVyMcbCNEp4svYaSsD_",
    bytes: 11788540,
    md5: "ad0fd43069d1f567eb20b8ebd1133052",
  },
  {
    master_row: 14,
    filename: "녹화_2026_08_13_23_58_56_620.mp4",
    drive_file_id: "1q7ICZl0dtoIAao3nMX0HRC5PnUtlvfMB",
    bytes: 19730720,
    md5: "c3ac967839110774051145e2fd6037f7",
  },
];

test("Codex-work-13 is one SUBJECT family with master 13 as its only anchor", () => {
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.family_id, "Codex-work-13 LoveTree Cinematic Watercolor V2");
  assert.equal(manifest.intake_issue, 471);
  assert.deepEqual(manifest.master_rows, [13, 14]);
  assert.equal(manifest.family_anchor, 13);
  assert.equal(manifest.duplicate_recording_row, 14);
  assert.equal(manifest.product_job, "SUBJECT");
  assert.equal(manifest.source_authority, "V2");

  assert.equal(manifest.namespace.repository_lineage, null);
  assert.equal(manifest.namespace.source_track_alias, null);
  assert.equal(manifest.namespace.parent_storage_track_47_is_source_track_47, false);
  assert.equal(manifest.namespace.number_only_aliasing_forbidden, true);
  assert.equal(manifest.drive.parent_storage_track_alias, false);
});

test("Cinematic Watercolor V2 executable, asset graph, and master recordings are fingerprint-pinned", () => {
  assert.equal(manifest.drive.family_folder_id, "12xDI-sLJXVZdDBp1PDPjA-kXU6DeSndS");
  assert.equal(manifest.drive.v2_folder_id, "1cmhnDjdP0UP04INXqlFsxnTgTeNkcqlT");
  assert.equal(manifest.drive.assets_folder_id, "1yYrW1jmJ8NB47KEb5W_WOPRFa-6RRy-O");

  assert.equal(manifest.executable.filename, "00_실행_러브트리_시네마틱수채화_V2.html");
  assert.equal(manifest.executable.drive_file_id, "1zSk20dUCFDjjLwz5uoMax3lWAXh1u7rF");
  assert.equal(manifest.executable.bytes, 19365);
  assert.equal(manifest.executable.md5, "bdf94584510c6a7817b857f521c4fede");
  assert.equal(manifest.executable.index_filename, "index.html");
  assert.equal(manifest.executable.index_bytes, 19365);
  assert.equal(manifest.executable.index_md5, manifest.executable.md5);
  assert.equal(manifest.executable.index_match, true);

  assert.equal(manifest.required_assets.length, expectedAssets.size);
  assert.deepEqual(new Set(manifest.required_assets.map(({ filename }) => filename)), new Set(expectedAssets.keys()));
  for (const asset of manifest.required_assets) {
    const expected = expectedAssets.get(asset.filename);
    assert.ok(expected, `unexpected required asset: ${asset.filename}`);
    assert.deepEqual([asset.drive_file_id, asset.bytes, asset.md5], expected);
    assert.match(asset.drive_file_id, DRIVE_ID);
    assert.match(asset.md5, MD5);
    assert.ok(Number.isInteger(asset.bytes) && asset.bytes > 0);
  }

  assert.equal(manifest.recordings.length, 2);
  for (let i = 0; i < expectedRecordings.length; i += 1) {
    const actual = manifest.recordings[i];
    const expected = expectedRecordings[i];
    assert.deepEqual(
      {
        master_row: actual.master_row,
        filename: actual.filename,
        drive_file_id: actual.drive_file_id,
        bytes: actual.bytes,
        md5: actual.md5,
      },
      expected,
    );
    assert.match(actual.drive_file_id, DRIVE_ID);
    assert.match(actual.md5, MD5);
  }

  assert.equal(manifest.functional_unit.folder_package_required, true);
  assert.equal(manifest.functional_unit.isolated_html_is_runnable, false);
  assert.deepEqual(
    manifest.functional_unit.runtime_files,
    [
      "00_실행_러브트리_시네마틱수채화_V2.html",
      ...[...expectedAssets.keys()].map((filename) => `assets/${filename}`),
    ],
  );
});

test("intake stays provenance-only and reuses the V4 SUBJECT product base", () => {
  assert.equal(manifest.source_character.inline_css, true);
  assert.equal(manifest.source_character.inline_javascript, true);
  assert.equal(manifest.source_character.relative_asset_graph, true);
  assert.equal(manifest.source_character.external_runtime_required, false);
  assert.equal(manifest.source_character.mobile_source, "PRESENT");
  assert.equal(manifest.source_character.reduced_motion_source, "PRESENT");
  assert.equal(manifest.source_character.autoplay_fallback, "PRESENT");
  assert.equal(manifest.source_character.replay_control, "PRESENT");
  assert.equal(manifest.source_character.muted_playsinline_video, true);
  assert.equal(manifest.source_character.accessibility.major_image_alt_text, "PRESENT");
  assert.equal(manifest.source_character.accessibility.aria_labels, "PRESENT");
  assert.equal(manifest.source_character.accessibility.aria_live, "PRESENT");

  assert.equal(manifest.repository_intake.intake_type, "PROVENANCE_MANIFEST");
  assert.equal(manifest.repository_intake.binary_archive_status, "FINGERPRINT_ONLY");
  assert.equal(manifest.repository_intake.runnable_snapshot_materialized, false);
  assert.match(manifest.repository_intake.binary_archival_child_issue, /^NOT_REQUIRED_FOR_ISSUE_471_COMPLETION/);

  assert.equal(manifest.adoption.mode, "VISUAL_PRESENTATION_DONOR");
  assert.equal(manifest.adoption.structural_base, "/v4/subjects");
  assert.equal(manifest.adoption.product_disposition, "V4_SUBJECT_VISUAL_DONOR");
  assert.equal(manifest.adoption.distinct_native_required, false);
  assert.equal(manifest.adoption.parallel_subject_application_authorized, false);
});
