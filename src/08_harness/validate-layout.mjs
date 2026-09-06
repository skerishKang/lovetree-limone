import fs from 'node:fs';
import path from 'node:path';
import { validateGenerationPhase } from './generation-phase-validator.mjs';
import { validateCodexDuplicateVariantGovernance, validateMechanicalSplitSurface, validateSourceCapsules } from './source-capsule-validator.mjs';

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

failures.push(...validateGenerationPhase({ state, sourceDirs, codexDirs, familyDirs }));
if (state?.phase === 'CALIBRATION' || state?.phase === 'ROLLOUT') {
  failures.push(...validateSourceCapsules({ repoRoot, sourceDirs, phase: state.phase, calibrationSet }));
}
// duplicate_variant_status / duplicate_variant_note are governed corpus-wide by
// rule docs/design-intake/duplicate-variant-governance-rule-2026-09-06.md §7.
// SRC capsules reach the check through validateSourceCapsules above; Codex
// capsules have no per-capsule validator, so their governance is checked here,
// independently of the generation phase.
failures.push(...validateCodexDuplicateVariantGovernance({ repoRoot, codexDirs }));

failures.push(...validateMechanicalSplitSurface({ repoRoot }));
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
