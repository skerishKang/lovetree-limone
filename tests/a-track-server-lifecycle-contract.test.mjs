import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/a-track-p0-validation.yml', 'utf8');
const helper = readFileSync('scripts/ci/a-track-server-lifecycle.sh', 'utf8');

test('A-track browser servers are process-group owned and fail closed on port reuse', () => {
  assert.match(helper, /atrack_assert_port_3000_free \|\| return 1/);
  assert.match(helper, /setsid npm start/);
  assert.match(helper, /kill -- -"\$server_pid"/);
  assert.match(helper, /kill -0 "\$server_pid"/);
  assert.match(helper, /\/dev\/tcp\/127\.0\.0\.1\/3000/);
  assert.match(helper, /FAIL-CLOSED: port 3000 is already occupied before A-track server launch/);
  assert.match(helper, /FAIL-CLOSED: port 3000 is still occupied after A-track server cleanup/);

  const helperSources = workflow.match(/source scripts\/ci\/a-track-server-lifecycle\.sh/g) ?? [];
  const starts = workflow.match(/atrack_start_server_group/g) ?? [];
  const stops = workflow.match(/atrack_stop_server_group/g) ?? [];

  assert.equal(helperSources.length, 4, 'all A-track server lifecycle steps must source the helper');
  assert.equal(starts.length, 3, 'Lineage53, shared A-track, and Orbit must use owned starts');
  assert.equal(stops.length, 5, 'Lineage53/Orbit traps + explicit cleanup and shared stop must use owned stops');
});
