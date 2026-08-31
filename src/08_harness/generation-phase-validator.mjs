export function validateGenerationPhase({ state, sourceDirs, codexDirs, familyDirs }) {
  const failures = [];
  const sourceIds = sourceDirs ?? [];
  const codexIds = codexDirs ?? [];
  const familyIds = familyDirs ?? [];

  if (state?.phase === 'SETUP') {
    if (sourceIds.length || codexIds.length || familyIds.length) failures.push('SETUP phase must not contain active Source/Codex/Family runtime');
  } else if (state?.phase === 'CALIBRATION') {
    if (state.active_root !== 'src/') failures.push('CALIBRATION active_root must be src/');
    if (state.real_source_runtime_started !== true) failures.push('CALIBRATION must declare real Source runtime started');
    if (state.real_codex_runtime_started !== false) failures.push('CALIBRATION must not start Codex runtime');
    if (state.broad_108_rollout_released !== false) failures.push('CALIBRATION cannot release broad 108 rollout');
    if (codexIds.length || familyIds.length) failures.push('CALIBRATION must not contain active CDX/FAM runtime');
  } else if (state?.phase === 'ROLLOUT') {
    if (state.active_root !== 'src/') failures.push('ROLLOUT active_root must be src/');
    if (state.real_source_runtime_started !== true) failures.push('ROLLOUT must declare real Source runtime started');
    if (state.broad_108_rollout_released !== true) failures.push('ROLLOUT requires broad_108_rollout_released=true');
    if (state.real_codex_runtime_started !== false) failures.push('ROLLOUT must not start Codex runtime');
    if (codexIds.length || familyIds.length) failures.push('ROLLOUT must not contain active CDX/FAM runtime');
  } else {
    failures.push(`unsupported generation phase: ${state?.phase ?? 'UNKNOWN'}`);
  }

  return failures;
}
