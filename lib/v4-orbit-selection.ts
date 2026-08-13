const TAU = Math.PI * 2;
const FRONT_ANGLE = Math.PI / 2;

function assertCount(count: number) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("V4 Orbit count must be a positive integer");
  }
}

export function wrapV4OrbitIndex(index: number, count: number) {
  assertCount(count);
  return ((Math.trunc(index) % count) + count) % count;
}

export function canonicalV4OrbitRotation(index: number, count: number) {
  assertCount(count);
  const wrapped = wrapV4OrbitIndex(index, count);
  return FRONT_ANGLE - (wrapped / count) * TAU;
}

export function nearestV4OrbitIndex(rotation: number, count: number) {
  assertCount(count);
  if (!Number.isFinite(rotation)) {
    throw new RangeError("V4 Orbit rotation must be finite");
  }

  const rawIndex = ((FRONT_ANGLE - rotation) / TAU) * count;
  return wrapV4OrbitIndex(Math.round(rawIndex), count);
}

export function nearestEquivalentV4OrbitRotation(
  currentRotation: number,
  index: number,
  count: number,
) {
  assertCount(count);
  if (!Number.isFinite(currentRotation)) {
    throw new RangeError("V4 Orbit rotation must be finite");
  }

  const canonical = canonicalV4OrbitRotation(index, count);
  const turns = Math.round((currentRotation - canonical) / TAU);
  return canonical + turns * TAU;
}

export function snapV4OrbitRotation(rotation: number, count: number) {
  const index = nearestV4OrbitIndex(rotation, count);
  return {
    index,
    rotation: nearestEquivalentV4OrbitRotation(rotation, index, count),
  };
}
