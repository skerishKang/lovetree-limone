import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const root = path.join(repoRoot, 'src');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) {
    fail(`missing required file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    fail(`invalid JSON ${relativePath}: ${error.message}`);
    return null;
  }
}

function requirePath(relativePath) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    fail(`missing required path: ${relativePath}`);
  }
}

function listActiveDirs(relativePath, pattern) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) return [];
  const dirs = fs.readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_template')
    .map((entry) => entry.name);
  for (const name of dirs) {
    if (!pattern.test(name)) fail(`invalid directory identity under ${relativePath}: ${name}`);
  }
  return dirs;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

for (const required of [
  'src/README.md',
  'src/00_governance/GENERATION_CONTRACT.md',
  'src/00_governance/IDENTITY_CONTRACT.md',
  'src/00_governance/IMPLEMENTATION_CONTRACT.md',
  'src/00_governance/PARITY_CONTRACT.md',
  'src/01_registry/namespaces.json',
  'src/01_registry/master-108.registry.json',
  'src/01_registry/calibration-batch.json',
  'src/01_registry/generation-state.json',
  'src/02_master/_template/record.example.json',
  'src/03_sources/_template/README.md',
  'src/03_sources/_template/manifest.example.json',
  'src/04_codex/_template/manifest.example.json',
  'src/05_families/_template/family.example.json',
  'src/06_components/README.md',
  'src/07_compositions/README.md',
  'src/08_harness/README.md'
]) requirePath(required);

const namespaces = readJson('src/01_registry/namespaces.json');
if (namespaces) {
  const expected = ['MST', 'SRC', 'CDX', 'FAM', 'TRK', 'LIN', 'CAP'];
  for (const key of expected) {
    if (!namespaces.namespaces?.[key]) fail(`missing namespace definition: ${key}`);
  }
  if (namespaces.cross_namespace_rule !== 'Numeric equality never establishes identity.') {
    fail('cross-namespace identity rule drifted');
  }
}

const master = readJson('src/01_registry/master-108.registry.json');
if (master) {
  const keys = master.master_keys;
  if (!Array.isArray(keys)) fail('master_keys must be an array');
  else {
    if (keys.length !== 108) fail(`master registry must contain 108 rows, got ${keys.length}`);
    if (new Set(keys).size !== 108) fail('master registry contains duplicate MST keys');
    const expected = Array.from({ length: 108 }, (_, i) => `MST${String(i + 1).padStart(3, '0')}`);
    for (let i = 0; i < expected.length; i += 1) {
      if (keys[i] !== expected[i]) fail(`master registry sequence mismatch at ${i + 1}: expected ${expected[i]}, got ${keys[i]}`);
    }
  }
  if (master.default_mapping_status !== 'UNRESOLVED') fail('master rows must default to UNRESOLVED');
}

const calibration = readJson('src/01_registry/calibration-batch.json');
if (calibration) {
  const expectedSet = new Set(['SRC064', 'SRC058', 'SRC057', 'SRC056', 'SRC060']);
  const actual = calibration.selected_sources;
  if (!Array.isArray(actual) || actual.length !== 5 || actual.some((id) => !expectedSet.has(id))) {
    fail('calibration batch must contain exactly SRC064/SRC058/SRC057/SRC056/SRC060');
  }
  if (calibration.first_calibration?.source_id !== 'SRC056') fail('first calibration must remain SRC056');
}

const state = readJson('src/01_registry/generation-state.json');
const sourceDirs = listActiveDirs('src/03_sources', /^SRC\d{3}$/);
const codexDirs = listActiveDirs('src/04_codex', /^CDX(?:\d{3}|\d{3}-\d+)$/);
const familyDirs = listActiveDirs('src/05_families', /^FAM\d{3}$/);
const masterDirs = listActiveDirs('src/02_master', /^MST\d{3}$/);

for (const name of sourceDirs) requirePath(`src/03_sources/${name}/manifest.json`);
for (const name of codexDirs) requirePath(`src/04_codex/${name}/manifest.json`);
for (const name of familyDirs) requirePath(`src/05_families/${name}/family.json`);
for (const name of masterDirs) requirePath(`src/02_master/${name}/record.json`);

if (state?.phase === 'SETUP') {
  if (state.real_source_runtime_started !== false || state.real_codex_runtime_started !== false) {
    fail('SETUP phase must declare real runtime not started');
  }
  if (sourceDirs.length !== 0) fail('SETUP phase must not contain active SRC runtime folders');
  if (codexDirs.length !== 0) fail('SETUP phase must not contain active CDX runtime folders');
}

for (const base of ['src/03_sources', 'src/04_codex']) {
  for (const file of walk(path.join(repoRoot, base))) {
    const rel = path.relative(repoRoot, file);
    const inSplit = rel.split(path.sep).includes('split');
    if (inSplit && /\.(tsx|jsx|ts)$/i.test(file)) {
      fail(`framework/TypeScript file forbidden in mechanical split surface: ${rel}`);
    }
  }
}

if (!fs.existsSync(root)) fail('src/ root missing');

if (failures.length) {
  console.error('SRC_108_HARNESS_GATE=FAIL');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('SRC_108_HARNESS_GATE=PASS');
console.log(`MASTER_ROW_COUNT=${master?.master_keys?.length ?? 'UNKNOWN'}`);
console.log(`ACTIVE_SOURCE_COUNT=${sourceDirs.length}`);
console.log(`ACTIVE_CODEX_COUNT=${codexDirs.length}`);
console.log(`ACTIVE_FAMILY_COUNT=${familyDirs.length}`);
console.log(`ACTIVE_MASTER_WORKDIR_COUNT=${masterDirs.length}`);
console.log(`GENERATION_PHASE=${state?.phase ?? 'UNKNOWN'}`);
