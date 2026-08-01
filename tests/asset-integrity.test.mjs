import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const clientAssetsDir = new URL("dist/client/assets/", root);
const manifests = [
  new URL("dist/server/__vite_rsc_assets_manifest.js", root),
  new URL("dist/server/ssr/__vite_rsc_assets_manifest.js", root),
];

function parseManifest(url) {
  return readFile(url, "utf8").then((code) => JSON.parse(code.replace(/^export default\s+/, "")));
}

function collectRefs(manifest) {
  const refs = [];
  for (const section of ["clientReferenceDeps", "serverResources"]) {
    const map = manifest[section];
    if (!map) continue;
    for (const deps of Object.values(map)) {
      if (!deps) continue;
      refs.push(...(deps.js ?? []), ...(deps.css ?? []));
    }
  }
  return refs;
}

test("build output exists with client assets", async () => {
  assert.ok(existsSync(clientAssetsDir), "dist/client/assets must exist after build");
  const files = await readdir(clientAssetsDir);
  assert.ok(files.some((f) => f.endsWith(".js")), "client assets must include JS files");
});

test("every RSC manifest asset reference exists in dist/client/assets", async () => {
  const available = new Set((await readdir(clientAssetsDir)).map((f) => `/assets/${f}`));
  for (const manifestUrl of manifests) {
    if (!existsSync(manifestUrl)) continue;
    const manifest = await parseManifest(manifestUrl);
    const refs = collectRefs(manifest);
    assert.ok(refs.length > 0, `${manifestUrl.pathname.split("/").pop()} must reference assets`);
    const missing = [...new Set(refs)].filter((url) => url.startsWith("/assets/") && !available.has(url));
    assert.deepEqual(missing, [], `${manifestUrl.pathname.split("/").pop()} references missing assets`);
  }
});

test("no stale prefetch JS assets remain in the RSC manifests", async () => {
  const available = new Set((await readdir(clientAssetsDir)).map((f) => `/assets/${f}`));
  for (const manifestUrl of manifests) {
    if (!existsSync(manifestUrl)) continue;
    const manifest = await parseManifest(manifestUrl);
    const refs = collectRefs(manifest).filter((u) => u.startsWith("/assets/") && u.endsWith(".js"));
    const missing = [...new Set(refs)].filter((u) => !available.has(u));
    assert.deepEqual(missing, [], `${manifestUrl.pathname} still references stale JS prefetch chunks`);
  }
});

test("bootstrap script content points to an existing asset", async () => {
  const manifest = await parseManifest(manifests[0]);
  const match = manifest.bootstrapScriptContent?.match(/import\("(\/assets\/[^"]+)"\)/);
  assert.ok(match, "bootstrapScriptContent must reference a script");
  assert.ok(existsSync(new URL(`dist/client${match[1]}`, root)), `bootstrap asset ${match[1]} must exist`);
});

test("manifest dep arrays contain no duplicate references", async () => {
  const manifest = await parseManifest(manifests[0]);
  for (const deps of Object.values(manifest.clientReferenceDeps ?? {})) {
    for (const kind of ["js", "css"]) {
      const list = deps[kind] ?? [];
      assert.equal(new Set(list).size, list.length, `duplicate ${kind} reference in clientReferenceDeps`);
    }
  }
});

test("V1 route asset references are preserved (non-regression)", async () => {
  const manifest = await parseManifest(manifests[0]);
  const refs = collectRefs(manifest);
  // V1 home page CSS and V1 tree detail CSS must still be referenced.
  assert.ok(refs.some((u) => u.startsWith("/assets/home-") && u.endsWith(".css")), "V1 home CSS missing from manifest");
  assert.ok(refs.some((u) => u.startsWith("/assets/tree-") && u.endsWith(".css")), "V1 tree CSS missing from manifest");
  // The route page chunks emitted for V1/V2 routes must all exist on disk.
  const clientManifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  for (const entry of Object.values(clientManifest)) {
    assert.ok(existsSync(new URL(`dist/client/${entry.file}`, root)), `emitted chunk ${entry.file} missing`);
  }
});

test("post-build prune step is wired into the build", async () => {
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.match(pkg.scripts.build, /vinext build/);
  assert.match(pkg.scripts.build, /prune-rsc-assets\.mjs/);
  assert.ok(existsSync(new URL("scripts/prune-rsc-assets.mjs", root)), "prune script must exist");
});

test("worker asset binding uses the built client output directory", async () => {
  const wrangler = JSON.parse(await readFile(new URL("dist/server/wrangler.json", root), "utf8"));
  assert.ok(wrangler.assets?.directory, "worker assets.directory must be set");
  const dir = new URL(`dist/server/${wrangler.assets.directory}`, root);
  assert.ok(existsSync(dir), `assets directory ${wrangler.assets.directory} must exist`);
  assert.ok(existsSync(new URL(`dist/server/${wrangler.assets.directory}/assets`, root)), "assets directory must contain a hashed assets/ folder");
  assert.ok((await readdir(new URL(`dist/server/${wrangler.assets.directory}/assets`, root))).some((f) => f.endsWith(".js")), "assets/ folder must contain built JS files");
});

test("auth CTA component and auth wiring are unchanged", async () => {
  const form = await readFile(new URL("app/components/EmailAuthForm.tsx", root), "utf8");
  assert.match(form, /EnvelopeIcon/);
  assert.match(form, /GoogleIcon/);
  assert.match(form, /signInWithEmailPassword/);
  assert.match(form, /signUpWithEmailPassword/);
  assert.match(form, /onClick=\{\(\) => void login\(\)\}/);
  const auth = await readFile(new URL("lib/auth.tsx", root), "utf8");
  assert.match(auth, /signInWithPopup/);
  assert.match(auth, /createUserWithEmailAndPassword/);
});
