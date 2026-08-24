import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflows = new Map([
  ['lineage52-phase2-native-browser-qa.yml', [
    'app/design-lab/lineages/52/phase-2/**',
    'qa/lineage-52-phase2-native-browser-qa.mjs',
    'tests/lineage-52-phase2-spatial-core.test.mjs',
    'lib/lineage-52/**',
    'lib/design-runtime/transport*',
  ]],
  ['lineage60-v12-native-browser-qa.yml', [
    'app/design-lab/lineages/60/v1-2/**',
    'qa/lineage-60-v12-native-browser-qa.mjs',
    'lib/lineage-60/**',
  ]],
  ['living-media-sphere-v3-hold-browser-qa.yml', [
    'app/design-lab/source-families/living-media-sphere/v3/source/**',
    'tests/living-media-sphere-v3-browser-qa.mjs',
    'lib/living-media-sphere-v3/**',
  ]],
  ['source-track18-v2-browser-qa.yml', [
    'app/design-lab/source-tracks/18/v2/source/**',
    'qa/source-track-18-v2-browser-qa.mjs',
    'tests/source-track-18-*.test.mjs',
    'design-intake/manifests/source-track-18-fragment-loader-v2.json',
    'lib/source-track-18/**',
    'drizzle.config.ts',
    'db/**',
    'drizzle/**',
  ]],
  ['source-track47-v425-browser-qa.yml', [
    'app/design-lab/source-tracks/47/v4-2-5/native/**',
    'tests/source-track-47-browser-qa.mjs',
    'lib/source-track-47/**',
  ]],
  ['source-track68-v332-browser-qa.yml', [
    'app/design-lab/source-tracks/68/v3-3-2/compare/**',
    'tests/source-track68-v332-browser-qa.mjs',
    'scripts/verify-source-track68-v332-assets.mjs',
  ]],
  ['track62-v11-continuous-exhibition-qa.yml', [
    'app/design-lab/capabilities/continuous-exhibition-rail/**',
    'qa/track62-v11-continuous-exhibition-qa.mjs',
    'lib/track-62-v11/**',
  ]],
  ['track66-native-browser-qa.yml', [
    'app/v4/journey/page.tsx',
    'app/components/v4/V4FirstJourney.tsx',
    'app/components/v4/V4FirstJourneyV12.tsx',
    'app/components/v4/V4FirstJourneyFidelityBridge.tsx',
    'app/components/EmailAuthForm*',
    'app/styles/v4/first-journey.css',
    'app/styles/v4/first-journey-v12.css',
    'app/styles/v4/existing-fidelity-remediation.css',
    'lib/api*',
    'lib/auth*',
    'lib/firebase*',
    'lib/first-tree-create-client*',
    'qa/track66-native-browser-qa.mjs',
  ]],
  ['track67-native-browser-qa.yml', [
    'app/design-lab/lineages/67/v2-4/native/**',
    'qa/track67-native-browser-qa.mjs',
    'lib/lineage-67-v24/**',
  ]],
]);

const commonPaths = [
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'vite.config.ts',
  'postcss.config.mjs',
  'tsconfig.json',
  'scripts/apply-vinext-static-cache-posix-keys.mjs',
  'scripts/prune-rsc-assets.mjs',
  'app/layout.tsx',
  'app/globals.css',
  'app/flow.css',
  'app/tree-pages.css',
  'lib/auth.tsx',
  'lib/auth-errors.ts',
  'lib/firebase.ts',
  'public/**',
  'assets/**',
];

const globalWorkflows = [
  'a-track-p0-validation.yml',
  'design-fidelity-validation.yml',
  'design-source-freshness-observer.yml',
];

function sourceFor(name) {
  return readFileSync(`.github/workflows/${name}`, 'utf8');
}

function pullRequestBlock(source) {
  const match = source.match(/\n  pull_request:\n([\s\S]*?)(?=\n  workflow_dispatch:|\n\npermissions:)/);
  assert.ok(match, 'missing pull_request block');
  return match[1];
}

function pathList(source) {
  const block = pullRequestBlock(source);
  const match = block.match(/\n    paths:\n([\s\S]*?)$/);
  assert.ok(match, 'missing pull_request.paths');
  return [...match[1].matchAll(/^      - ['"]([^'"]+)['"]$/gm)].map((entry) => entry[1]);
}

function pathMatches(pattern, changedPath) {
  if (pattern.endsWith('/**')) return changedPath === pattern.slice(0, -3) || changedPath.startsWith(pattern.slice(0, -2));
  if (pattern.endsWith('*')) return changedPath.startsWith(pattern.slice(0, -1));
  if (pattern.includes('*')) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
    return new RegExp(`^${escaped}$`).test(changedPath);
  }
  return pattern === changedPath;
}

function applicableDedicated(changedPaths) {
  return [...workflows.keys()].filter((name) => {
    const owned = pathList(sourceFor(name));
    return changedPaths.some((changedPath) => owned.some((pattern) => pathMatches(pattern, changedPath)));
  });
}

test('dedicated workflow inventory remains exactly nine and every trigger is ownership-scoped', () => {
  assert.equal(workflows.size, 9);

  for (const [name, requiredTargetPaths] of workflows) {
    const source = sourceFor(name);
    const block = pullRequestBlock(source);
    const owned = new Set(pathList(source));

    assert.match(block, /branches:\n      - main/);
    assert.match(block, /paths:/);
    assert.doesNotMatch(block, /paths-ignore:/);
    assert.match(source, /\n  workflow_dispatch:/);

    for (const common of commonPaths) {
      assert.ok(owned.has(common), `${name}: missing common fail-closed path ${common}`);
    }

    const selfPath = `.github/workflows/${name}`;
    assert.ok(owned.has(selfPath), `${name}: workflow must own its own trigger file`);

    for (const target of requiredTargetPaths) {
      assert.ok(owned.has(target), `${name}: missing target ownership path ${target}`);
    }
  }
});

test('global three PR workflows remain globally applicable without path scoping', () => {
  for (const name of globalWorkflows) {
    const block = pullRequestBlock(sourceFor(name));
    assert.match(block, /branches:\n      - main/);
    assert.doesNotMatch(block, /\n    paths:/);
    assert.doesNotMatch(block, /paths-ignore:/);
  }
});

test('common dependency changes fail closed into all nine dedicated workflows', () => {
  assert.deepEqual(applicableDedicated(['package.json']).sort(), [...workflows.keys()].sort());
  assert.deepEqual(applicableDedicated(['app/layout.tsx']).sort(), [...workflows.keys()].sort());
  assert.deepEqual(applicableDedicated(['public/favicon.svg']).sort(), [...workflows.keys()].sort());
});

test('historical PR replay preserves owners while removing unrelated fan-out', () => {
  const fixtures = [
    {
      pr: 433,
      paths: ['tests/lineage-53-v2-route-browser-qa.test.mjs'],
      expected: [],
    },
    {
      pr: 435,
      paths: ['lib/template-platform/promotion-readiness.ts', 'tests/template-platform-promotion-readiness.test.mjs'],
      expected: [],
    },
    {
      pr: 436,
      paths: ['app/components/product/DesignVariantExplorer.tsx', 'app/design-lab/page.tsx'],
      expected: [],
    },
    {
      pr: 420,
      paths: ['tests/source-track68-v332-browser-qa.mjs'],
      expected: ['source-track68-v332-browser-qa.yml'],
    },
    {
      pr: 442,
      paths: ['docs/operations/CI_WORKFLOW_APPLICABILITY.md'],
      expected: [],
    },
  ];

  for (const fixture of fixtures) {
    assert.deepEqual(
      applicableDedicated(fixture.paths).sort(),
      fixture.expected.sort(),
      `historical PR #${fixture.pr} applicability drifted`,
    );
  }
});

test('each workflow-file edit triggers exactly its own dedicated workflow', () => {
  for (const name of workflows.keys()) {
    assert.deepEqual(applicableDedicated([`.github/workflows/${name}`]), [name]);
  }
});
