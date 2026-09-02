import crypto from 'node:crypto';
import fs from 'node:fs';

export const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// Shared HTTP Range server helper, reused by both the baseline harness and the
// original-to-split parity harness. SRC047 serves a 28 MB H.264/AAC MP4 through a
// local http server; Chromium will not seek past the first buffered segment unless
// the server honours Range requests (206 Partial Content). fs.readFileSync does not
// support start/end offsets, so the file is loaded once and sliced to the exact
// requested window. Suffix ranges (bytes=-N) and unsatisfiable ranges (416) are
// handled per RFC 7233.
export function sendFileRange(res, filePath, mimeType) {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = res.req?.headers?.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) {
      res.statusCode = 416;
      res.setHeader('content-range', `bytes */${total}`);
      res.setHeader('accept-ranges', 'bytes');
      res.end();
      return;
    }
    let start = match[1] ? +match[1] : 0;
    let end = match[2] ? +match[2] : total - 1;
    if (match[1] === '' && match[2] !== '') {
      const suffixLen = +match[2];
      if (!Number.isFinite(suffixLen) || suffixLen <= 0) {
        res.statusCode = 416;
        res.setHeader('content-range', `bytes */${total}`);
        res.setHeader('accept-ranges', 'bytes');
        res.end();
        return;
      }
      start = Math.max(0, total - suffixLen);
      end = total - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      res.statusCode = 416;
      res.setHeader('content-range', `bytes */${total}`);
      res.setHeader('accept-ranges', 'bytes');
      res.end();
      return;
    }
    const clampedEnd = Math.min(end, total - 1);
    const buf = fs.readFileSync(filePath);
    const body = buf.subarray(start, clampedEnd + 1);
    res.statusCode = 206;
    res.setHeader('content-range', `bytes ${start}-${clampedEnd}/${total}`);
    res.setHeader('accept-ranges', 'bytes');
    res.setHeader('content-length', body.length);
    res.setHeader('content-type', mimeType);
    res.end(body);
    return;
  }
  const buf = fs.readFileSync(filePath);
  res.statusCode = 200;
  res.setHeader('accept-ranges', 'bytes');
  res.setHeader('content-length', buf.length);
  res.setHeader('content-type', mimeType);
  res.end(buf);
}