import crypto from 'node:crypto';

export async function canonical16PixelDigest(page, pngBuffer) {
  if (!Buffer.isBuffer(pngBuffer)) throw new Error('CANONICAL16_PNG_BUFFER_REQUIRED');
  const data = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `data:image/png;base64,${src}`;
    });
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canonical16 canvas context unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    const px = ctx.getImageData(0, 0, size, size).data;
    return Array.from(px, (value, index) => (index % 4 === 3 ? value : value & 0xF0));
  }, pngBuffer.toString('base64'));
  return crypto.createHash('sha256').update(Buffer.from(data)).digest('hex');
}

export function normalizeEvidenceForMatchedComparison({ evidence, screenshotDigests, contentElementCount }) {
  if (!evidence || typeof evidence !== 'object') throw new Error('NORMALIZE_EVIDENCE_REQUIRED');
  const normalized = structuredClone(evidence);
  if (Number.isInteger(contentElementCount)) normalized.dom.elementCount = contentElementCount;

  const digestMap = screenshotDigests instanceof Map
    ? screenshotDigests
    : new Map(Object.entries(screenshotDigests ?? {}));

  normalized.screenshots = (normalized.screenshots ?? []).map((shot) => {
    const digest = digestMap.get(shot.name);
    if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/.test(digest)) {
      throw new Error(`NORMALIZE_SCREENSHOT_DIGEST_REQUIRED:${shot.name}`);
    }
    return {
      name: shot.name,
      digestModeRequested: shot.digestModeRequested,
      digestSha256: digest,
    };
  });
  return normalized;
}
