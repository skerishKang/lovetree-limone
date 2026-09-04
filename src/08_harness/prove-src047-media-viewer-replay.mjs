import { replayApprovedSRC047MediaViewerPair } from './state-replay/replay-approved-src047-media-viewer-pair.mjs';

const exactHead = process.env.SRC_EXACT_HEAD || null;
const browserChannel = process.env.SRC_BROWSER_CHANNEL || null;
const outRoot = process.env.SRC047_MEDIA_VIEWER_REPLAY_EVIDENCE_DIR || '/tmp/src047-media-viewer-replay';

const summary = await replayApprovedSRC047MediaViewerPair({
  exactHead,
  browserChannel,
  outRoot,
});

console.log(`SRC047_ACCEPTED_S4_POLICY_REUSED=${summary.passed ? 'PASS' : 'FAIL'}`);
console.log(`SRC047_MEDIA_DECODE=${summary.passed ? 'PASS' : 'FAIL'}`);
console.log(`SRC047_MATCHED_STATE_COUNT=${summary.matchedStateCount}`);
console.log(`SRC047_MEDIA_VIEWER_REPLAY_PASS=${summary.exactHead}`);
console.log(JSON.stringify(summary, null, 2));
