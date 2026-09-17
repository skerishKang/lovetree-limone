import { replayApprovedSRC062LargeInlinePair } from './state-replay/replay-approved-src062-large-inline-pair.mjs';

const exactHead = process.env.SRC_EXACT_HEAD;
const browserChannel = process.env.SRC_BROWSER_CHANNEL || null;
const outRoot = process.env.SRC062_LARGE_INLINE_REPLAY_EVIDENCE_DIR || '/tmp/src062-large-inline-replay';

const summary = await replayApprovedSRC062LargeInlinePair({
  exactHead,
  browserChannel,
  outRoot,
});

console.log('SRC062_ACCEPTED_S4_POLICY_REUSED=PASS');
console.log(`SRC062_VIEWPORT_COUNT=${summary.viewportCount}`);
console.log(`SRC062_MATCHED_STATE_COUNT=${summary.matchedStateCount}`);
console.log(`SRC062_PIXEL_PAIR_COUNT=${summary.pixelPairCount}`);
console.log(`SRC062_MAX_DIFFERING_PIXELS=${summary.maxDifferingPixels}`);
console.log(`SRC062_MAX_CHANNEL_DELTA=${summary.maxChannelDelta}`);
console.log(`SRC062_LARGE_INLINE_REPLAY_PASS=${summary.exactHead}`);
