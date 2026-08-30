import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const root = path.join(repoRoot, 'src');
const failures = [];

function fail(message) { failures.push(message); }
function readJson(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) { fail(`missing required file: ${relativePath}`); return null; }
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (error) { fail(`invalid JSON ${relativePath}: ${error.message}`); return null; }
}
function requirePath(relativePath) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) fail(`missing required path: ${relativePath}`);
}
function listActiveDirs(relativePath, pattern) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) return [];
  const dirs = fs.readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_template')
    .map((entry) => entry.name);
  for (const name of dirs) if (!pattern.test(name)) fail(`invalid directory identity under ${relativePath}: ${name}`);
  return dirs;
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full)); else out.push(full);
  }
  return out;
}
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

for (const required of [
  'src/README.md','src/00_governance/GENERATION_CONTRACT.md','src/00_governance/IDENTITY_CONTRACT.md',
  'src/00_governance/IMPLEMENTATION_CONTRACT.md','src/00_governance/PARITY_CONTRACT.md',
  'src/01_registry/namespaces.json','src/01_registry/master-108.registry.json','src/01_registry/identity-mappings.json',
  'src/01_registry/calibration-batch.json','src/01_registry/generation-state.json','src/02_master/README.md',
  'src/02_master/_template/record.example.json','src/03_sources/_template/README.md',
  'src/03_sources/_template/manifest.example.json','src/04_codex/_template/manifest.example.json',
  'src/05_families/_template/family.example.json','src/06_components/README.md','src/07_compositions/README.md',
  'src/08_harness/README.md','src/09_reports/SETUP_STATUS.md'
]) requirePath(required);

const namespaces = readJson('src/01_registry/namespaces.json');
if (namespaces) {
  for (const key of ['MST','SRC','CDX','FAM','TRK','LIN','CAP']) if (!namespaces.namespaces?.[key]) fail(`missing namespace definition: ${key}`);
  if (namespaces.cross_namespace_rule !== 'Numeric equality never establishes identity.') fail('cross-namespace identity rule drifted');
}

const master = readJson('src/01_registry/master-108.registry.json');
if (master) {
  const keys = master.master_keys;
  if (!Array.isArray(keys)) fail('master_keys must be an array');
  else {
    if (keys.length !== 108) fail(`master registry must contain 108 rows, got ${keys.length}`);
    if (new Set(keys).size !== 108) fail('master registry contains duplicate MST keys');
    const expected = Array.from({ length: 108 }, (_, i) => `MST${String(i + 1).padStart(3, '0')}`);
    for (let i = 0; i < expected.length; i += 1) if (keys[i] !== expected[i]) fail(`master registry sequence mismatch at ${i + 1}: expected ${expected[i]}, got ${keys[i]}`);
  }
  if (master.default_mapping_status !== 'UNRESOLVED') fail('master rows must default to UNRESOLVED');
}

const mappings = readJson('src/01_registry/identity-mappings.json');
if (mappings) {
  const policy = mappings.mapping_policy ?? {};
  if (policy.numeric_equality_implies_identity !== false) fail('numeric equality must not imply identity');
  if (policy.filename_only_resolution_allowed !== false) fail('filename-only identity resolution must remain forbidden');
  if (policy.source_to_lineage_automatic !== false) fail('automatic Source→Lineage mapping must remain forbidden');
  if (policy.codex_to_source_renumbering_allowed !== false) fail('Codex→Source renumbering must remain forbidden');
  if (policy.family_allocation_requires_evidence !== true) fail('FAM allocation must require evidence');
}

const calibration = readJson('src/01_registry/calibration-batch.json');
const calibrationSet = new Set(['SRC064','SRC058','SRC057','SRC056','SRC060']);
if (calibration) {
  const actual = calibration.selected_sources;
  if (!Array.isArray(actual) || actual.length !== 5 || new Set(actual).size !== 5 || actual.some((id) => !calibrationSet.has(id))) fail('calibration batch must contain exactly SRC064/SRC058/SRC057/SRC056/SRC060');
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
  if (state.active_root !== 'src/') fail('SETUP active_root must be src/');
  if (state.real_source_runtime_started !== false || state.real_codex_runtime_started !== false) fail('SETUP phase must declare real runtime not started');
  if (state.broad_108_rollout_released !== false) fail('SETUP phase cannot release broad 108 rollout');
  if (sourceDirs.length !== 0) fail('SETUP phase must not contain active SRC runtime folders');
  if (codexDirs.length !== 0) fail('SETUP phase must not contain active CDX runtime folders');
  if (familyDirs.length !== 0) fail('SETUP phase must not allocate active FAM folders');
} else if (state?.phase === 'CALIBRATION') {
  if (state.active_root !== 'src/') fail('CALIBRATION active_root must be src/');
  if (state.real_source_runtime_started !== true) fail('CALIBRATION must declare real Source runtime started');
  if (state.real_codex_runtime_started !== false) fail('CALIBRATION must not start Codex runtime');
  if (state.broad_108_rollout_released !== false) fail('CALIBRATION cannot release broad 108 rollout');
  if (!sourceDirs.includes('SRC056')) fail('CALIBRATION must include first calibration SRC056');
  if (sourceDirs.some((id) => !calibrationSet.has(id))) fail('CALIBRATION active Source must belong to fixed five-source batch');
  if (codexDirs.length !== 0) fail('CALIBRATION must not contain active CDX runtime folders');
  if (familyDirs.length !== 0) fail('CALIBRATION must not allocate active FAM folders');

  for (const sourceId of sourceDirs) {
    const base = `src/03_sources/${sourceId}`;
    for (const required of ['manifest.json','authority/authority.json','authority/sha256.txt','original/original.html','baseline/capture-plan.json','evidence/source/drive-authority-readback.json']) requirePath(`${base}/${required}`);
    const manifest = readJson(`${base}/manifest.json`);
    const authority = readJson(`${base}/authority/authority.json`);
    if (!manifest || !authority) continue;
    if (manifest.source_id !== sourceId) fail(`${sourceId}: manifest source_id mismatch`);
    if (manifest.runtime_policy !== 'HTML_CSS_JS_MECHANICAL_ONLY') fail(`${sourceId}: runtime policy drift`);
    if (manifest.tsx_allowed_during_split !== false) fail(`${sourceId}: TSX must remain forbidden during split`);
    if (manifest.authority?.status !== 'LOCKED') fail(`${sourceId}: authority must be LOCKED`);
    if (authority.authority_status !== 'LOCKED') fail(`${sourceId}: authority record must be LOCKED`);
    if (authority.source_id !== sourceId) fail(`${sourceId}: authority source_id mismatch`);
    if (authority.drive_file_id !== manifest.authority?.drive_file_id) fail(`${sourceId}: Drive file id mismatch`);
    if (authority.sha256 !== manifest.authority?.sha256) fail(`${sourceId}: authority SHA mismatch`);
    if (authority.bytes !== manifest.authority?.bytes) fail(`${sourceId}: authority byte count mismatch`);

    const originalPath = path.join(repoRoot, base, 'original/original.html');
    if (fs.existsSync(originalPath)) {
      const bytes = fs.readFileSync(originalPath);
      if (bytes.length !== manifest.authority?.bytes) fail(`${sourceId}: frozen original byte count drift`);
      if (sha256(bytes) !== manifest.authority?.sha256) fail(`${sourceId}: frozen original SHA256 drift`);
    }
    const shaPath = path.join(repoRoot, base, 'authority/sha256.txt');
    if (fs.existsSync(shaPath) && !fs.readFileSync(shaPath, 'utf8').trim().startsWith(manifest.authority?.sha256 ?? 'INVALID')) fail(`${sourceId}: sha256.txt mismatch`);

    const stages = manifest.stages ?? {};
    const ordered = ['identity_verified','raw_authority_locked','baseline_captured','mechanical_split_complete','source_split_parity_pass'];
    let sawFalse = false;
    for (const stage of ordered) {
      if (stages[stage] !== true && stages[stage] !== false) fail(`${sourceId}: stage ${stage} must be boolean`);
      if (sawFalse && stages[stage] === true) fail(`${sourceId}: stage ordering violated at ${stage}`);
      if (stages[stage] === false) sawFalse = true;
    }
    if (stages.identity_verified !== true || stages.raw_authority_locked !== true) fail(`${sourceId}: identity/raw authority must be complete before calibration`);
    if (stages.mechanical_split_complete === true) {
      for (const required of ['split/index.html','split/styles.css','split/script.js']) requirePath(`${base}/${required}`);
    }
    if (stages.source_split_parity_pass === true && stages.mechanical_split_complete !== true) fail(`${sourceId}: parity cannot pass before mechanical split`);
  }
} else {
  fail(`unsupported generation phase: ${state?.phase ?? 'UNKNOWN'}`);
}

for (const base of ['src/03_sources','src/04_codex']) {
  for (const file of walk(path.join(repoRoot, base))) {
    const rel = path.relative(repoRoot, file);
    const inSplit = rel.split(path.sep).includes('split');
    if (inSplit && /\.(tsx|jsx|ts)$/i.test(file)) fail(`framework/TypeScript file forbidden in mechanical split surface: ${rel}`);
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
console.log(`IDENTITY_MAPPING_COUNT=${mappings?.mappings?.length ?? 'UNKNOWN'}`);
console.log(`ACTIVE_SOURCE_COUNT=${sourceDirs.length}`);
console.log(`ACTIVE_CODEX_COUNT=${codexDirs.length}`);
console.log(`ACTIVE_FAMILY_COUNT=${familyDirs.length}`);
console.log(`ACTIVE_MASTER_WORKDIR_COUNT=${masterDirs.length}`);
console.log(`GENERATION_PHASE=${state?.phase ?? 'UNKNOWN'}`);
