/**
 * Track 67 V2.4.2 native renderer — pure WebGL2 / matrix helpers.
 *
 * Renderer-neutral, DOM-neutral, testable. The React client component
 * (app/design-lab/lineages/67/v2-4/native/NativeRenderer.tsx) owns the canvas
 * and the requestAnimationFrame loop; this module only provides projection math
 * and shader source so the bounded mechanics stay unit-testable without WebGL.
 */

export type Mat4 = readonly number[];

export function perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ];
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + r] * b[c * 4 + k];
      }
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

export function viewMatrix(eye: readonly [number, number, number], dir: readonly [number, number, number]): Mat4 {
  const [ex, ey, ez] = eye;
  let [dx, dy, dz] = dir;
  const dl = Math.hypot(dx, dy, dz) || 1;
  dx /= dl; dy /= dl; dz /= dl;
  const cx = 0; const cy = 1; const cz = 0;
  const fx = dx; const fy = dy; const fz = dz;
  let sx = fy * cz - fz * cy;
  let sy = fz * cx - fx * cz;
  let sz = fx * cy - fy * cx;
  const sl = Math.hypot(sx, sy, sz) || 1;
  sx /= sl; sy /= sl; sz /= sl;
  const ux = sy * fz - sz * fy;
  const uy = sz * fx - sx * fz;
  const uz = sx * fy - sy * fx;
  return [
    sx, ux, -fx, 0,
    sy, uy, -fy, 0,
    sz, uz, -fz, 0,
    -(sx * ex + sy * ey + sz * ez),
    -(ux * ex + uy * ey + uz * ez),
    (fx * ex + fy * ey + fz * ez),
    1,
  ];
}

export function project(
  m: Mat4,
  p: readonly [number, number, number],
): readonly [number, number, number] {
  const [x, y, z] = p;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  const w = cw === 0 ? 1e-6 : cw;
  return [cx / w, cy / w, cw];
}

export const CHUNK_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in float aHeight;
uniform mat4 uVP;
out float vHeight;
void main(){
  vHeight = aHeight;
  gl_Position = uVP * vec4(aPos.x, aPos.y + aHeight * 0.5, aPos.z, 1.0);
}`;

export const CHUNK_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in float vHeight;
out vec4 frag;
void main(){
  float t = clamp(vHeight / 40.0, 0.0, 1.0);
  vec3 lo = vec3(0.42, 0.55, 0.78);
  vec3 hi = vec3(0.95, 0.78, 0.45);
  frag = vec4(mix(lo, hi, t), 1.0);
}`;

export const TAIL_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in float aAge;
uniform mat4 uVP;
out float vAge;
void main(){
  vAge = aAge;
  gl_Position = uVP * vec4(aPos, 1.0);
}`;

export const TAIL_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in float vAge;
out vec4 frag;
void main(){
  frag = vec4(0.85, 0.6, 0.3, 1.0 - clamp(vAge, 0.0, 1.0));
}`;

/**
 * Shared ribbon-wall shader used for BOTH the rendered surface and the hit-test
 * surface authority. The renderer builds the exact same vertical-wall triangles
 * (per consecutive sample pair) that v24RibbonHitTest intersects, so what is drawn
 * is what is hit. `uColor` lets static chunks and the active tail share one program.
 */
export const RIBBON_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uVP;
void main(){
  gl_Position = uVP * vec4(aPos, 1.0);
}`;

export const RIBBON_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec3 uColor;
out vec4 frag;
void main(){
  frag = vec4(uColor, 1.0);
}`;
