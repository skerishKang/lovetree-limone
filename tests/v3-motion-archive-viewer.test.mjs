import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemoryEmbedUrl,
  buildYouTubeEmbedUrl,
  formatSeconds,
  isEmbeddableVideo,
  parseYouTubeId,
} from "../app/components/v3/v3-archive-state.ts";

// 1. embed URLs never autoplay before an explicit user action
test("viewer embed URL never enables autoplay", () => {
  const url = buildYouTubeEmbedUrl("nqofkzQD19E", { startSeconds: 90 });
  assert.equal(url.includes("autoplay=1"), false, "autoplay=1 must never appear");
  assert.match(url, /autoplay=0/);
});

// 2. start seconds propagate to the embed URL
test("start seconds propagate to the embed URL", () => {
  const url = buildYouTubeEmbedUrl("nqofkzQD19E", { startSeconds: 90 });
  assert.match(url, /start=90/);
});

// 3. valid end seconds propagate
test("valid end seconds propagate to the embed URL", () => {
  const url = buildYouTubeEmbedUrl("nqofkzQD19E", { startSeconds: 90, endSeconds: 150 });
  assert.match(url, /start=90/);
  assert.match(url, /end=150/);
});

// 4. invalid end seconds are omitted
test("invalid or non-increasing end seconds are omitted", () => {
  const equal = buildYouTubeEmbedUrl("nqofkzQD19E", { startSeconds: 90, endSeconds: 90 });
  assert.equal(equal.includes("end="), false, "end === start must be omitted");
  const reversed = buildYouTubeEmbedUrl("nqofkzQD19E", { startSeconds: 90, endSeconds: 30 });
  assert.equal(reversed.includes("end="), false, "end < start must be omitted");
  const endOnly = buildYouTubeEmbedUrl("nqofkzQD19E", { startSeconds: null, endSeconds: 60 });
  assert.equal(endOnly.includes("end="), false, "end without start must be omitted");
  const negative = buildYouTubeEmbedUrl("nqofkzQD19E", { startSeconds: -5, endSeconds: 60 });
  assert.equal(negative.includes("start="), false, "negative start must be omitted");
});

// 5. privacy-enhanced youtube-nocookie host
test("embed URLs use the privacy-enhanced youtube-nocookie host", () => {
  const url = buildYouTubeEmbedUrl("nqofkzQD19E", {});
  assert.match(url, /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  assert.doesNotMatch(url, /youtube\.com\/watch/);
});

// 6. non-YouTube and invalid sources are rejected
test("non-YouTube or missing sources are rejected", () => {
  assert.equal(parseYouTubeId("https://example.com/video"), null);
  assert.equal(parseYouTubeId(""), null);
  assert.equal(parseYouTubeId("https://vimeo.com/123456"), null);
  assert.equal(parseYouTubeId("not a url"), null);
  const memory = {
    id: "x",
    treeId: "demo",
    sourceType: "song",
    sourceUrl: "https://example.com/audio",
    recordDate: "2026-01-01",
    title: "song",
    emotionTags: [],
    memoVisibility: "public",
  };
  assert.equal(isEmbeddableVideo(memory), false);
  assert.equal(buildMemoryEmbedUrl(memory), "");
});

// 7. YouTube URL forms parse to a video id
test("common YouTube URL forms parse to a video id", () => {
  assert.equal(parseYouTubeId("https://www.youtube.com/watch?v=nqofkzQD19E"), "nqofkzQD19E");
  assert.equal(parseYouTubeId("https://youtu.be/nqofkzQD19E"), "nqofkzQD19E");
  assert.equal(parseYouTubeId("https://www.youtube.com/embed/nqofkzQD19E"), "nqofkzQD19E");
});

// 8. full memory embed uses start and valid end
test("memory embed URL carries start and valid end from fixture data", () => {
  const memory = {
    id: "ma-01",
    treeId: "demo",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=ldfmc4lnwoY",
    recordDate: "2026-07-30",
    startSeconds: 18,
    endSeconds: 39,
    title: "처음 마음이 멈춘 장면",
    emotionTags: [],
    memoVisibility: "public",
  };
  const url = buildMemoryEmbedUrl(memory);
  assert.match(url, /start=18/);
  assert.match(url, /end=39/);
  assert.match(url, /youtube-nocookie\.com\/embed\/ldfmc4lnwoY/);
});

// 9. formatSeconds renders MM:SS
test("formatSeconds renders MM:SS labels", () => {
  assert.equal(formatSeconds(90), "1:30");
  assert.equal(formatSeconds(0), "0:00");
  assert.equal(formatSeconds(undefined), "");
  assert.equal(formatSeconds(NaN), "");
});
