import {
  computeCanvasBackingSize,
  lookAtMatrix,
  orbitViewportPolicy,
  perspectiveMatrix,
  sampleConnectionMotion,
  type OrbitCameraState,
  type SpatialConnectionProjection,
  type SpatialMomentProjection,
} from "./spatial-orbit";

export interface WebGLResourceSnapshot {
  readonly buffers: number;
  readonly textures: number;
  readonly programs: number;
  readonly shaders: number;
  readonly disposed: boolean;
}

export interface WebGLResourceRegistry {
  trackBuffer(buffer: WebGLBuffer): WebGLBuffer;
  trackTexture(texture: WebGLTexture): WebGLTexture;
  trackProgram(program: WebGLProgram): WebGLProgram;
  trackShader(shader: WebGLShader): WebGLShader;
  snapshot(): WebGLResourceSnapshot;
  dispose(): void;
}

export interface SpatialPrimitiveRenderScene {
  readonly camera: OrbitCameraState;
  readonly moments: readonly SpatialMomentProjection[];
  readonly connections: readonly SpatialConnectionProjection[];
  readonly progress: number;
  readonly selectedMomentId: string | null;
  readonly reducedMotion: boolean;
  readonly depthProbe?: boolean;
}

export interface SpatialPrimitiveRenderer {
  readonly available: boolean;
  readonly reason: string | null;
  render(scene: SpatialPrimitiveRenderScene): void;
  readCenterPixel(): readonly [number, number, number, number] | null;
  snapshot(): WebGLResourceSnapshot;
  dispose(): void;
}

export function createWebGLResourceRegistry(gl: WebGLRenderingContext): WebGLResourceRegistry {
  const buffers = new Set<WebGLBuffer>();
  const textures = new Set<WebGLTexture>();
  const programs = new Set<WebGLProgram>();
  const shaders = new Set<WebGLShader>();
  let disposed = false;

  const ensureLive = () => {
    if (disposed) throw new Error("WebGL resource registry already disposed");
  };

  return {
    trackBuffer(buffer) {
      ensureLive();
      buffers.add(buffer);
      return buffer;
    },
    trackTexture(texture) {
      ensureLive();
      textures.add(texture);
      return texture;
    },
    trackProgram(program) {
      ensureLive();
      programs.add(program);
      return program;
    },
    trackShader(shader) {
      ensureLive();
      shaders.add(shader);
      return shader;
    },
    snapshot() {
      return {
        buffers: buffers.size,
        textures: textures.size,
        programs: programs.size,
        shaders: shaders.size,
        disposed,
      };
    },
    dispose() {
      if (disposed) return;
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      for (const texture of textures) gl.deleteTexture(texture);
      for (const program of programs) gl.deleteProgram(program);
      for (const shader of shaders) gl.deleteShader(shader);
      buffers.clear();
      textures.clear();
      programs.clear();
      shaders.clear();
      disposed = true;
    },
  };
}

function createUnavailableRenderer(reason: string): SpatialPrimitiveRenderer {
  let disposed = false;
  return {
    available: false,
    reason,
    render() {},
    readCenterPixel() {
      return null;
    },
    snapshot() {
      return { buffers: 0, textures: 0, programs: 0, shaders: 0, disposed };
    },
    dispose() {
      disposed = true;
    },
  };
}

function compileShader(
  gl: WebGLRenderingContext,
  registry: WebGLResourceRegistry,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("unable to allocate WebGL shader");
  registry.trackShader(shader);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "WebGL shader compile failed");
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  registry: WebGLResourceRegistry,
): WebGLProgram {
  const vertex = compileShader(
    gl,
    registry,
    gl.VERTEX_SHADER,
    `
      attribute vec3 aPosition;
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform float uYaw;
      uniform float uPitch;
      uniform float uPointSize;

      vec3 rotateY(vec3 p, float a) {
        float c = cos(a);
        float s = sin(a);
        return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
      }

      vec3 rotateX(vec3 p, float a) {
        float c = cos(a);
        float s = sin(a);
        return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
      }

      void main() {
        vec3 rotated = rotateX(rotateY(aPosition, uYaw), uPitch);
        gl_Position = uProjection * uView * vec4(rotated, 1.0);
        gl_PointSize = uPointSize;
      }
    `,
  );
  const fragment = compileShader(
    gl,
    registry,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      uniform vec4 uColor;
      void main() {
        gl_FragColor = uColor;
      }
    `,
  );
  const program = gl.createProgram();
  if (!program) throw new Error("unable to allocate WebGL program");
  registry.trackProgram(program);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "WebGL program link failed");
  }
  return program;
}

function createSphereVertices(radius = 1, latitudeBands = 20, longitudeBands = 28): Float32Array {
  const values: number[] = [];
  const point = (latIndex: number, lonIndex: number): readonly [number, number, number] => {
    const theta = (latIndex / latitudeBands) * Math.PI - Math.PI / 2;
    const phi = (lonIndex / longitudeBands) * Math.PI * 2;
    const cosTheta = Math.cos(theta);
    return [
      radius * cosTheta * Math.cos(phi),
      radius * Math.sin(theta),
      radius * cosTheta * Math.sin(phi),
    ];
  };
  for (let lat = 0; lat < latitudeBands; lat += 1) {
    for (let lon = 0; lon < longitudeBands; lon += 1) {
      const a = point(lat, lon);
      const b = point(lat + 1, lon);
      const c = point(lat + 1, lon + 1);
      const d = point(lat, lon + 1);
      values.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  return new Float32Array(values);
}

const CONNECTION_COLORS: readonly (readonly [number, number, number, number])[] = [
  [0.24, 0.91, 1, 1],
  [0.67, 0.48, 1, 1],
  [1, 0.47, 0.68, 1],
  [1, 0.78, 0.34, 1],
  [0.31, 0.92, 0.63, 1],
];

export function createSpatialPrimitiveRenderer(
  canvas: HTMLCanvasElement,
): SpatialPrimitiveRenderer {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: true,
    depth: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return createUnavailableRenderer("WEBGL_CONTEXT_UNAVAILABLE");

  const registry = createWebGLResourceRegistry(gl);
  try {
    const program = createProgram(gl, registry);
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) throw new Error("unable to allocate WebGL position buffer");
    registry.trackBuffer(positionBuffer);

    // Exercise texture ownership without imposing a source-specific texture.
    // The neutral 1x1 texture is not sampled by the proof shader; it solely
    // proves lifecycle ownership/disposal at the Tier-C boundary.
    const ownedTexture = gl.createTexture();
    if (!ownedTexture) throw new Error("unable to allocate WebGL texture resource");
    registry.trackTexture(ownedTexture);
    gl.bindTexture(gl.TEXTURE_2D, ownedTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    gl.bindTexture(gl.TEXTURE_2D, null);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    const uProjection = gl.getUniformLocation(program, "uProjection");
    const uView = gl.getUniformLocation(program, "uView");
    const uYaw = gl.getUniformLocation(program, "uYaw");
    const uPitch = gl.getUniformLocation(program, "uPitch");
    const uPointSize = gl.getUniformLocation(program, "uPointSize");
    const uColor = gl.getUniformLocation(program, "uColor");
    if (
      aPosition < 0 ||
      !uProjection ||
      !uView ||
      !uYaw ||
      !uPitch ||
      !uPointSize ||
      !uColor
    ) {
      throw new Error("WebGL program is missing a required attribute/uniform");
    }

    const sphereVertices = createSphereVertices(1);
    let disposed = false;

    const draw = (
      mode: number,
      positions: Float32Array,
      color: readonly [number, number, number, number],
      pointSize = 1,
    ) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
      gl.uniform4f(uColor, color[0], color[1], color[2], color[3]);
      gl.uniform1f(uPointSize, pointSize);
      gl.drawArrays(mode, 0, positions.length / 3);
    };

    const renderer: SpatialPrimitiveRenderer = {
      available: true,
      reason: null,
      render(scene) {
        if (disposed) return;
        const rect = canvas.getBoundingClientRect();
        const cssWidth = Math.max(1, rect.width || canvas.clientWidth || 1);
        const cssHeight = Math.max(1, rect.height || canvas.clientHeight || 1);
        const policy = orbitViewportPolicy(cssWidth, cssHeight);
        const backing = computeCanvasBackingSize(
          cssWidth,
          cssHeight,
          typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
          policy.maxDevicePixelRatio,
        );
        if (canvas.width !== backing.pixelWidth) canvas.width = backing.pixelWidth;
        if (canvas.height !== backing.pixelHeight) canvas.height = backing.pixelHeight;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.018, 0.026, 0.045, 1);
        gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        const effectiveDistance = scene.camera.distance + (policy.baseDistance - 4.15);
        const projection = perspectiveMatrix(
          policy.fieldOfViewRadians,
          canvas.width / canvas.height,
          0.1,
          40,
        );
        const view = lookAtMatrix([0, 0, effectiveDistance], [0, 0, 0], [0, 1, 0]);
        gl.uniformMatrix4fv(uProjection, false, new Float32Array(projection));
        gl.uniformMatrix4fv(uView, false, new Float32Array(view));
        gl.uniform1f(uYaw, scene.camera.yaw);
        gl.uniform1f(uPitch, scene.camera.pitch);

        // Neutral occluder: proves depth authority without promoting Earth into
        // a shared product visual. This is intentionally source-agnostic.
        draw(gl.TRIANGLES, sphereVertices, [0.075, 0.11, 0.17, 1]);

        if (scene.depthProbe) {
          // Two points share the center projection. Depth testing must display
          // only the point in front of the neutral occluder. Rotating yaw by PI
          // swaps which identity is visible, giving browser QA an actual pixel
          // proof instead of a metadata-only depth claim.
          draw(gl.POINTS, new Float32Array([0, 0, -1.18]), [0.1, 0.95, 0.42, 1], 34);
          draw(gl.POINTS, new Float32Array([0, 0, 1.18]), [1, 0.15, 0.2, 1], 34);
          return;
        }

        scene.connections.forEach((connection, index) => {
          const color = CONNECTION_COLORS[index % CONNECTION_COLORS.length] ?? CONNECTION_COLORS[0];
          const stagger = Math.min(0.7, index * 0.1);
          const motion = sampleConnectionMotion(scene.progress, stagger);
          const all = new Float32Array(connection.points.flatMap((point) => [...point]));
          draw(gl.LINE_STRIP, all, [color[0], color[1], color[2], 0.16]);

          const revealCount = Math.max(2, Math.ceil(connection.points.length * motion.reveal));
          const revealed = connection.points.slice(0, revealCount);
          if (revealed.length >= 2) {
            draw(
              gl.LINE_STRIP,
              new Float32Array(revealed.flatMap((point) => [...point])),
              [color[0], color[1], color[2], 0.9],
            );
          }

          if (!scene.reducedMotion && motion.pulse > 0 && motion.pulse < 1) {
            const pulseIndex = Math.min(
              connection.points.length - 1,
              Math.max(0, Math.round(motion.pulse * (connection.points.length - 1))),
            );
            const pulse = connection.points[pulseIndex];
            if (pulse) draw(gl.POINTS, new Float32Array(pulse), [1, 1, 1, 1], 10);
          }
        });

        scene.moments.forEach((moment) => {
          const selected = moment.id === scene.selectedMomentId;
          const active = selected || moment.active;
          draw(
            gl.POINTS,
            new Float32Array(moment.position),
            active ? [0.95, 0.97, 1, 1] : [0.25, 0.77, 0.95, 0.9],
            selected ? 15 : active ? 10 : 7,
          );
        });
      },
      readCenterPixel() {
        if (disposed) return null;
        const pixel = new Uint8Array(4);
        gl.finish();
        gl.readPixels(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixel,
        );
        return [pixel[0], pixel[1], pixel[2], pixel[3]];
      },
      snapshot() {
        return registry.snapshot();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        registry.dispose();
      },
    };
    return renderer;
  } catch (error) {
    registry.dispose();
    return createUnavailableRenderer(
      error instanceof Error ? `WEBGL_INIT_FAILED:${error.message}` : "WEBGL_INIT_FAILED",
    );
  }
}
