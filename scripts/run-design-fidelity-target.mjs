import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDesignFidelityTarget } from "./design-fidelity-validation-registry.mjs";

const targetId = process.argv[2];
const target = getDesignFidelityTarget(targetId);

if (!target) {
  console.error(`Unknown design fidelity target: ${targetId ?? "<missing>"}`);
  process.exit(2);
}

const root = process.cwd();
const evidenceDir = path.join(root, "test-results", "design-fidelity", target.id);
await mkdir(evidenceDir, { recursive: true });

function repoPath(relativePath) {
  return path.join(root, relativePath);
}

function requireConfiguredFile(relativePath, label) {
  if (!existsSync(repoPath(relativePath))) {
    throw new Error(`${target.id}: configured ${label} is missing: ${relativePath}`);
  }
}

function runAssetVerifier() {
  if (!target.assetGate) return { required: false, passed: true, marker: null };

  const { verifier, expectedMarker } = target.assetGate;
  requireConfiguredFile(verifier, "asset verifier");
  const result = spawnSync(process.execPath, [verifier], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  writeFile(path.join(evidenceDir, "asset-verifier.log"), output).catch(() => {});

  assert.equal(
    result.status,
    0,
    `${target.id}: exact-asset verifier failed closed (${verifier})\n${output}`,
  );
  assert.match(
    result.stdout ?? "",
    new RegExp(expectedMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${target.id}: verifier exited 0 but did not emit expected marker ${expectedMarker}`,
  );

  return { required: true, passed: true, marker: expectedMarker };
}

async function waitForRoute(url, serverState) {
  let lastError = null;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    if (serverState.exited) {
      throw new Error(`${target.id}: app server exited before route became ready`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${target.id}: route did not become ready: ${url}; last error: ${lastError?.message ?? "unknown"}`);
}

async function runLoggedProcess(command, args, { env, logName }) {
  const log = createWriteStream(path.join(evidenceDir, logName), { flags: "w" });
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    log.write(chunk);
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  log.end();

  if (exitCode !== 0) {
    throw new Error(`${target.id}: command failed (${exitCode}): ${command} ${args.join(" ")}`);
  }
}

async function captureBrowserEvidence(baseUrl) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const captures = [];

  async function capture(viewport, suffix, reducedMotion = "no-preference") {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile === true,
      hasTouch: viewport.mobile === true,
      reducedMotion,
    });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(`page:${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(`console:${message.text()}`);
    });

    try {
      const response = await page.goto(`${baseUrl}${target.route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      assert.ok(response?.ok(), `${target.id}: evidence route HTTP ${response?.status()}`);
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      assert.ok(overflow <= 1, `${target.id}: ${suffix} horizontal overflow ${overflow}px`);
      assert.deepEqual(
        runtimeErrors,
        [],
        `${target.id}: ${suffix} runtime errors: ${runtimeErrors.join(" | ")}`,
      );

      const filename = `${viewport.width}x${viewport.height}-${suffix}.png`;
      const screenshotPath = path.join(evidenceDir, filename);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      captures.push(filename);
    } finally {
      await context.close();
    }
  }

  try {
    for (const viewport of target.viewports) {
      await capture(viewport, "initial");
    }

    if (target.captureReducedMotion) {
      const reducedViewport = target.viewports.find(
        (viewport) => viewport.width === 390 && viewport.height === 844,
      ) ?? target.viewports.find((viewport) => viewport.mobile) ?? target.viewports[0];
      await capture(reducedViewport, "reduced-motion", "reduce");
    }
  } finally {
    await browser.close();
  }

  return captures;
}

async function copyExtraEvidence() {
  const copied = [];
  for (const configuredPath of target.extraEvidencePaths) {
    const source = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(root, configuredPath);
    if (!existsSync(source)) continue;
    const destination = path.join(evidenceDir, `extra-${path.basename(source)}`);
    await cp(source, destination, { recursive: true, force: true });
    copied.push(path.relative(root, destination));
  }
  return copied;
}

for (const browserGate of target.browserGates) {
  requireConfiguredFile(browserGate, "browser gate");
}

const summary = {
  id: target.id,
  label: target.label,
  route: target.route,
  validationClass: target.validationClass,
  assetGate: null,
  browserGates: target.browserGates,
  screenshots: [],
  copiedEvidence: [],
  status: "STARTED",
};

let server = null;
let serverLog = null;
let failure = null;
const serverState = { exited: false };

try {
  summary.assetGate = runAssetVerifier();

  const port = process.env.DESIGN_FIDELITY_PORT || "3000";
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: port,
    V4_BASE_URL: baseUrl,
    LOVETREE_QA_BASE_URL: baseUrl,
  };

  serverLog = createWriteStream(path.join(evidenceDir, "server.log"), { flags: "w" });
  server = spawn("npm", ["start"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.pipe(serverLog, { end: false });
  server.stderr.pipe(serverLog, { end: false });
  server.once("close", () => { serverState.exited = true; });

  await waitForRoute(`${baseUrl}${target.route}`, serverState);
  summary.screenshots = await captureBrowserEvidence(baseUrl);

  for (const browserGate of target.browserGates) {
    const logName = `gate-${path.basename(browserGate).replace(/[^a-zA-Z0-9._-]/g, "_")}.log`;
    await runLoggedProcess(
      process.execPath,
      ["--import", "tsx", "--test", browserGate],
      { env, logName },
    );
  }

  summary.status = "PASS";
  console.log(`DESIGN_FIDELITY_TARGET_PASS ${target.id}`);
} catch (error) {
  failure = error;
  summary.status = "FAIL";
  summary.error = error instanceof Error ? error.message : String(error);
  console.error(`DESIGN_FIDELITY_TARGET_FAIL ${target.id}: ${summary.error}`);
} finally {
  try {
    summary.copiedEvidence = await copyExtraEvidence();
  } catch (copyError) {
    summary.evidenceCopyError = copyError instanceof Error ? copyError.message : String(copyError);
    if (!failure) failure = copyError;
  }

  if (server && !serverState.exited) {
    server.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!serverState.exited) server.kill("SIGKILL");
  }
  if (serverLog) serverLog.end();

  await writeFile(
    path.join(evidenceDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
}

if (failure) throw failure;
