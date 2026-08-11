export type MomentOrbitAxis = "horizontal" | "vertical";
export type MomentOrbitMediaType = "photo" | "video";
export type MomentOrbitViewport = "desktop" | "mobile";

export interface MomentOrbitCandidateMoment {
  id: string;
  label: string;
  mediaType: MomentOrbitMediaType;
  poster: string;
}

export interface MomentOrbitProjection {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  brightness: number;
  saturation: number;
  blur: number;
  rotateX: number;
  rotateY: number;
}

export const MOMENT_ORBIT_SOURCE_PROVENANCE = {
  classification: "CAPABILITY",
  recommendation: "PARTIAL IMPLEMENT",
  sourceFolder: "10_LoveTree_Idol_Moment_Orbit_Carousel_V1",
  sourceFolderId: "1qyrwsNyxi5f4uiRQ8rl0gyzhNRTwAnvv",
  sourceHtml: "01_HTML/index-v1.html",
  sourceHtmlId: "1WRV1mFJ3_3P-AdEzAd9CtyeCETNj2wLE",
  sourceHtmlAliasId: "1JasHmRE20FH05S9KZw9GcPCoIT2F4e98",
  sourceHtmlBytes: 24146,
  sourceHtmlSha256: "5268d78efc757854a6bc123396f3e4cfa03e70a2b73f6a7d19b3f1ce9564d7a1",
  comparisonSource: "04_LoveTree_Idol_Orbit_Archive_V1",
  comparisonFolderId: "17aoUk-jLjC9W5ptddFzDom9jS6EW626E",
  canonicalComparisonRoute: "/v4/subjects/demo/orbit",
  benchmarkReferenceRuntimeAllowed: false,
  productAdopted: false,
} as const;

export const MOMENT_ORBIT_AUTOPLAY_MS = 4200;
export const MOMENT_ORBIT_DRAG_PX_PER_STEP = 120;
export const MOMENT_ORBIT_CLICK_SLOP_PX = 8;

const CANDIDATE_MEDIA: readonly MomentOrbitMediaType[] = [
  "video",
  "photo",
  "video",
  "photo",
  "video",
  "photo",
  "video",
  "video",
  "photo",
  "video",
] as const;

function createPoster(index: number, mediaType: MomentOrbitMediaType): string {
  const palettes = [
    ["#24151f", "#d77c9d"],
    ["#15242a", "#75b8c5"],
    ["#261c31", "#9c83cc"],
    ["#30241b", "#d3a56c"],
    ["#172820", "#7ea58d"],
  ] as const;
  const [background, accent] = palettes[index % palettes.length];
  const number = String(index + 1).padStart(2, "0");
  const kind = mediaType === "video" ? "VIDEO" : "PHOTO";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 960 1280"><defs><radialGradient id="g" cx="68%" cy="20%" r="78%"><stop stop-color="${accent}" stop-opacity=".58"/><stop offset="1" stop-color="${background}"/></radialGradient></defs><rect width="960" height="1280" fill="url(#g)"/><circle cx="480" cy="510" r="218" fill="none" stroke="${accent}" stroke-opacity=".4" stroke-width="3"/><circle cx="480" cy="510" r="128" fill="${accent}" fill-opacity=".12"/><path d="M190 940 C330 820 630 820 770 940" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/><text x="78" y="106" fill="#fff" fill-opacity=".68" font-family="Arial,sans-serif" font-size="24" letter-spacing="8">LOVETREE · ${kind}</text><text x="78" y="1160" fill="#fff" font-family="Georgia,serif" font-size="70">Moment ${number}</text><text x="78" y="1212" fill="#fff" fill-opacity=".58" font-family="Arial,sans-serif" font-size="20" letter-spacing="5">INTERNAL CAPABILITY MEDIA STUB</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const MOMENT_ORBIT_CANDIDATE_MOMENTS: readonly MomentOrbitCandidateMoment[] = CANDIDATE_MEDIA.map(
  (mediaType, index) => ({
    id: `candidate-moment-${String(index + 1).padStart(2, "0")}`,
    label: `Moment ${String(index + 1).padStart(2, "0")}`,
    mediaType,
    poster: createPoster(index, mediaType),
  }),
);

function requireCount(count: number): void {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`moment count must be a positive integer: ${count}`);
  }
}

export function wrapMomentIndex(index: number, count: number): number {
  requireCount(count);
  return ((Math.trunc(index) % count) + count) % count;
}

export function stepMomentIndex(index: number, delta: number, count: number): number {
  return wrapMomentIndex(index + delta, count);
}

export function nearestEquivalentMomentPosition(currentPosition: number, index: number, count: number): number {
  requireCount(count);
  const canonical = wrapMomentIndex(index, count);
  const nearestCycle = Math.round((currentPosition - canonical) / count);
  const candidates = [
    canonical + (nearestCycle - 1) * count,
    canonical + nearestCycle * count,
    canonical + (nearestCycle + 1) * count,
  ];
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate - currentPosition) < Math.abs(best - currentPosition) ? candidate : best,
  );
}

export function canonicalSnap(position: number, count: number): { position: number; index: number } {
  requireCount(count);
  const snappedPosition = Math.round(position);
  return {
    position: snappedPosition,
    index: wrapMomentIndex(snappedPosition, count),
  };
}

export function projectMomentOnOrbit(
  index: number,
  position: number,
  count: number,
  axis: MomentOrbitAxis,
  viewport: MomentOrbitViewport,
): MomentOrbitProjection {
  requireCount(count);
  const equivalent = nearestEquivalentMomentPosition(position, index, count);
  const difference = equivalent - position;
  const angle = difference * ((Math.PI * 2) / count);
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const front = (cosine + 1) / 2;
  const mobile = viewport === "mobile";

  const radiusX = mobile ? 176 : 330;
  const radiusY = mobile ? 170 : 245;
  const radiusZ = mobile ? 185 : 270;

  let x: number;
  let y: number;
  let rotateX = 0;
  let rotateY = 0;

  if (axis === "horizontal") {
    x = sine * radiusX;
    y = Math.abs(sine) * (mobile ? 20 : 28) - 7;
    rotateY = -sine * 48;
  } else {
    x = sine * (mobile ? 72 : 105);
    y = sine * radiusY;
    rotateX = sine * 34;
    rotateY = -sine * 12;
  }

  return {
    x,
    y,
    z: cosine * radiusZ,
    scale: 0.62 + front * 0.43,
    opacity: 0.2 + front * 0.8,
    brightness: 0.55 + front * 0.48,
    saturation: 0.58 + front * 0.52,
    blur: (1 - front) * 1.2,
    rotateX,
    rotateY,
  };
}
