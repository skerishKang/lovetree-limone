import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const root = path.join(repoRoot, 'src');
const failures = [];
const fail = (message) => failures.push(message);

function readJson(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) { fail(`missing required file: ${relativePath}`); return null; }
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (error) { fail(`invalid JSON ${relativePath}: ${error.message}`); return null; }
}
function requirePath(relativePath) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) fail(`missing required path: ${relativePath}`);
}
function listDirs(relativePath, pattern) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) return [];
  const dirs = fs.readdirSync(full, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== '_template').map((e) => e.name);
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
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

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
  const expected = Array.from({ length: 108 }, (_, i) => `MST${String(i + 1).padStart(3, '0')}`);
  if (!Array.isArray(keys) || keys.length !== 108 || new Set(keys).size !== 108 || keys.some((v, i) => v !== expected[i])) fail('MST001..MST108 registry is not exactly 108 unique ordered rows');
  if (master.default_mapping_status !== 'UNRESOLVED') fail('master rows must default to UNRESOLVED');
}

const mappings = readJson('src/01_registry/identity-mappings.json');
if (mappings) {
  const p = mappings.mapping_policy ?? {};
  if (p.numeric_equality_implies_identity !== false) fail('numeric equality must not imply identity');
  if (p.filename_only_resolution_allowed !== false) fail('filename-only identity resolution must remain forbidden');
  if (p.source_to_lineage_automatic !== false) fail('automatic Source→Lineage mapping must remain forbidden');
  if (p.codex_to_source_renumbering_allowed !== false) fail('Codex→Source renumbering must remain forbidden');
  if (p.family_allocation_requires_evidence !== true) fail('FAM allocation must require evidence');
}

const calibration = readJson('src/01_registry/calibration-batch.json');
const calibrationSet = new Set(['SRC064','SRC058','SRC057','SRC056','SRC060']);
if (calibration) {
  const actual = calibration.selected_sources;
  if (!Array.isArray(actual) || actual.length !== 5 || new Set(actual).size !== 5 || actual.some((id) => !calibrationSet.has(id))) fail('calibration batch must contain exactly SRC064/SRC058/SRC057/SRC056/SRC060');
  if (calibration.first_calibration?.source_id !== 'SRC056') fail('first calibration must remain SRC056');
}

const state = readJson('src/01_registry/generation-state.json');
const sourceDirs = listDirs('src/03_sources', /^SRC\d{3}$/);
const codexDirs = listDirs('src/04_codex', /^CDX(?:\d{3}|\d{3}-\d+)$/);
const familyDirs = listDirs('src/05_families', /^FAM\d{3}$/);
const masterDirs = listDirs('src/02_master', /^MST\d{3}$/);

for (const name of codexDirs) requirePath(`src/04_codex/${name}/manifest.json`);
for (const name of familyDirs) requirePath(`src/05_families/${name}/family.json`);
for (const name of masterDirs) requirePath(`src/02_master/${name}/record.json`);

if (state?.phase === 'SETUP') {
  if (sourceDirs.length || codexDirs.length || familyDirs.length) fail('SETUP phase must not contain active Source/Codex/Family runtime');
} else if (state?.phase === 'CALIBRATION') {
  if (state.active_root !== 'src/') fail('CALIBRATION active_root must be src/');
  if (state.real_source_runtime_started !== true) fail('CALIBRATION must declare real Source runtime started');
  if (state.real_codex_runtime_started !== false) fail('CALIBRATION must not start Codex runtime');
  if (state.broad_108_rollout_released !== false) fail('CALIBRATION cannot release broad 108 rollout');
  if (!sourceDirs.includes('SRC056')) fail('CALIBRATION must include first calibration SRC056');
  if (sourceDirs.some((id) => !calibrationSet.has(id))) fail('CALIBRATION active Source must belong to fixed five-source batch');
  if (codexDirs.length || familyDirs.length) fail('CALIBRATION must not contain active CDX/FAM runtime');

  for (const sourceId of sourceDirs) {
    const base = `src/03_sources/${sourceId}`;
    for (const required of ['manifest.json','authority/authority.json','authority/sha256.txt','original/original.html','baseline/capture-plan.json','baseline/accepted-baseline.json','evidence/source/drive-authority-readback.json']) requirePath(`${base}/${required}`);
    const manifest = readJson(`${base}/manifest.json`);
    const authority = readJson(`${base}/authority/authority.json`);
    const driveReadback = readJson(`${base}/evidence/source/drive-authority-readback.json`);
    if (!manifest || !authority || !driveReadback) continue;

    const m = manifest.authority ?? {};
    const a = authority;
    const d = driveReadback.fresh_drive ?? {};
    if (manifest.source_id !== sourceId || a.source_id !== sourceId || driveReadback.source_id !== sourceId) fail(`${sourceId}: source_id identity drift`);
    if (m.drive_folder_id !== a.drive_folder_id || a.drive_folder_id !== d.folder_id) fail(`${sourceId}: Drive folder id mismatch`);
    if (m.drive_file_id !== a.drive_file_id || a.drive_file_id !== d.file_id) fail(`${sourceId}: Drive file id mismatch`);
    if (m.filename !== a.filename || a.filename !== d.filename) fail(`${sourceId}: Drive filename mismatch`);
    if (m.bytes !== a.bytes || a.bytes !== d.bytes) fail(`${sourceId}: Drive byte count mismatch`);
    if (m.sha256 !== a.sha256 || a.sha256 !== d.sha256) fail(`${sourceId}: Drive SHA256 mismatch`);
    if (a.authority_status !== 'LOCKED' || m.status !== 'LOCKED') fail(`${sourceId}: authority must be LOCKED`);
    if (driveReadback.verification_mode !== 'CENTRAL_FRESH_DRIVE_READBACK') fail(`${sourceId}: Drive readback mode drift`);

    const originalPath = path.join(repoRoot, base, 'original/original.html');
    if (fs.existsSync(originalPath)) {
      const original = fs.readFileSync(originalPath);
      if (original.length !== m.bytes) fail(`${sourceId}: frozen original byte count drift`);
      if (sha256(original) !== m.sha256) fail(`${sourceId}: frozen original SHA256 drift`);
    }
    const shaPath = path.join(repoRoot, base, 'authority/sha256.txt');
    if (fs.existsSync(shaPath) && !fs.readFileSync(shaPath, 'utf8').trim().startsWith(m.sha256)) fail(`${sourceId}: sha256.txt mismatch`);

    const stages = manifest.stages ?? {};
    const ordered = ['identity_verified','raw_authority_locked','baseline_captured','mechanical_split_complete','source_split_parity_pass'];
    let falseSeen = false;
    for (const stage of ordered) {
      if (typeof stages[stage] !== 'boolean') fail(`${sourceId}: stage ${stage} must be boolean`);
      if (falseSeen && stages[stage] === true) fail(`${sourceId}: stage ordering violated at ${stage}`);
      if (stages[stage] === false) falseSeen = true;
    }
    if (stages.identity_verified !== true || stages.raw_authority_locked !== true) fail(`${sourceId}: S0/S1 incomplete`);

    const acceptedBase = readJson(`${base}/baseline/accepted-baseline.json`);
    if (!acceptedBase || acceptedBase.status !== 'ACCEPTED' || acceptedBase.source_id !== sourceId) fail(`${sourceId}: accepted baseline invalid`);
    if (stages.baseline_captured !== true) fail(`${sourceId}: baseline_captured must be true before S3`);

    if (stages.mechanical_split_complete === true) {
      for (const required of ['split/index.html','split/styles.css','split/script.js','split/materialization.json']) requirePath(`${base}/${required}`);
      const materialization = readJson(`${base}/split/materialization.json`);
      if (!materialization || !['MATERIALIZED_PENDING_PARITY','ACCEPTED'].includes(materialization.status)) fail(`${sourceId}: invalid materialization status`);
      if (materialization && (materialization.authority?.bytes !== m.bytes || materialization.authority?.sha256 !== m.sha256)) fail(`${sourceId}: materialization authority drift`);
    }
    if (stages.source_split_parity_pass === true) {
      const parity = readJson(`${base}/evidence/parity/accepted-parity.json`);
      if (!parity || parity.status !== 'ACCEPTED' || parity.source_id !== sourceId) fail(`${sourceId}: accepted parity evidence missing/invalid`);
      if (parity && (parity.authority?.bytes !== m.bytes || parity.authority?.sha256 !== m.sha256)) fail(`${sourceId}: parity authority drift`);
      const comps = parity?.comparisons ?? {};
      for (const [key, expected] of Object.entries({dom:'EQUAL',geometry:'EQUAL',computed_style:'EQUAL',runtime_state:'EQUAL',interactions:'EQUAL',screenshots:'BYTE_IDENTICAL'})) if (comps[key] !== expected) fail(`${sourceId}: parity ${key} is not ${expected}`);
      if (parity?.browser_errors !== 0) fail(`${sourceId}: parity browser errors present`);
    }
  }
} else {
  fail(`unsupported generation phase: ${state?.phase ?? 'UNKNOWN'}`);
}

for (const base of ['src/03_sources','src/04_codex']) {
  for (const file of walk(path.join(repoRoot, base))) {
    const rel = path.relative(repoRoot, file);
    if (rel.split(path.sep).includes('split') && /\.(tsx|jsx|ts)$/i.test(file)) fail(`framework/TypeScript file forbidden in mechanical split surface: ${rel}`);
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
