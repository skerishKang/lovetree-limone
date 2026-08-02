# Isolated Preview Deployment Safety

Status: enforced by the guarded deployment command in this repository.

## 2026-08-02 incident summary

During independent PR #12 cache/versioning validation, the first deployment
attempt intended for the isolated Worker `lovetree-limone-cache-pr12-preview`
executed against the repository default Worker `lovetree-limone` instead:

- The ad hoc command used `vinext deploy --skip-build` and requested a Worker
  name override that the command path did not honor.
- The repository default Wrangler name is `lovetree-limone` (Production).
- The reviewer detected the target mismatch immediately and reported rolling
  Production back to the exact prior version `cc92d036-5868-4bb6-b4f4-dfd747ea6485`.
- The unauthorized write is tracked in Issue #26 and is never described as
  "Production untouched", even though rollback was reported successful.

## Root cause

The `vinext deploy --skip-build` path silently fell back to the canonical
Wrangler `name` from `wrangler.jsonc` when the requested override did not
apply. Ad hoc deploy commands therefore have no guaranteed target isolation.

## Protected Workers

The following Worker names are always rejected as deployment targets:

```text
lovetree-limone
lovetree-limone-staging
lovetree-limone-v2
```

The canonical Wrangler default name (`lovetree-limone`) is also always
rejected, so the guard works even if the repository default name changes.

## Forbidden commands

```text
vinext deploy --skip-build --name <anything>
npx wrangler deploy --config wrangler.jsonc
npx wrangler deploy --config wrangler.jsonc --env production
npx wrangler deploy --config wrangler.jsonc --env staging
npx wrangler deploy --name lovetree-limone-cache-pr12-preview --skip-build
```

Any deploy command that relies on a `--name` override of the repository
default config is forbidden for isolated Preview validation.

## Canonical guarded command

```bash
npm run preview:deploy:safe -- \
  --worker lovetree-limone-issue-26-preview \
  --confirm-worker lovetree-limone-issue-26-preview \
  --source-sha "$(git rev-parse HEAD)"
```

This is the only sanctioned way to deploy an isolated Preview Worker from
this repository. It defaults to dry-run and performs no remote write.

### Dry-run example

```bash
npm run preview:deploy:safe -- \
  --worker lovetree-limone-issue-26-preview \
  --confirm-worker lovetree-limone-issue-26-preview \
  --source-sha "$(git rev-parse HEAD)"
```

Output ends with `DRY-RUN COMPLETE; no Cloudflare version was created`.

### Execute example

```bash
npm run preview:deploy:safe -- \
  --worker lovetree-limone-issue-26-preview \
  --confirm-worker lovetree-limone-issue-26-preview \
  --source-sha "$(git rev-parse HEAD)" \
  --execute
```

`--execute` is the only flag that allows an actual remote upload. It also
enables before/after version recording for the target and the protected
Workers (requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).

## Guards enforced before upload

1. `--worker` and `--confirm-worker` must be byte-identical.
2. The target must not equal any protected Worker name.
3. The target must not equal the canonical Wrangler default name.
4. The target must match `^lovetree-limone-[a-z0-9][a-z0-9-]*-preview$`.
   - Allowed: `lovetree-limone-cache-pr12-preview`, `lovetree-limone-issue-26-preview`.
   - Rejected: empty, whitespace, upper-case, `/`, shell metacharacters,
     `lovetree-limone`, `lovetree-limone-staging`, `lovetree-limone-v2`,
     `lovetree-limone-preview-production`, `other-worker`.
5. The current git HEAD must equal `--source-sha` (detached HEAD is fine).
6. A dirty worktree is blocked by default; with `--allow-dirty` only tracked
   A/B marker modifications are permitted (untracked content is rejected).
7. The build output must exist at `dist/client` and `dist/server/wrangler.json`.
8. The generated safe config must pass `wrangler deploy --dry-run` first.
9. In `--execute` mode, the before-deployment version snapshot must be
   complete for the target and every protected Worker.

## Generated config policy

The guard never edits `wrangler.jsonc`. It writes a fresh JSON config into a
temporary directory that forces:

```text
name                    = exact isolated Preview Worker
workers_dev             = true
main                    = built dist/server output (index.js)
assets.directory        = dist/client
assets.binding          = ASSETS
no_bundle               = true
compatibility_flags     = nodejs_compat
APP_ENV                 = staging
API_MUTATIONS_ENABLED   = false
```

The following are removed or blocked:

```text
routes
custom_domains
env (production and staging blocks, including staging mutation-true values)
secrets (no secret metadata or values are copied into the generated config)
```

Only safe common values (compatibility date/flags, `main`, `assets`,
`FIREBASE_PROJECT_ID`) are copied from the source config. No secret values or
`secrets.required` metadata are carried into the generated config; the
Worker name is specified only inside the generated config. The generated
config file path and its SHA-256 are printed.

The deploy command never passes `--name`, so it cannot fall back to the
repository default name. Command results distinguish process spawn errors,
signal termination, and numeric exit codes so a failed spawn is never treated
as exit 0.

### Config cleanup (fail-closed ownership)

The guarded core owns the generated config lifecycle. The temporary config is
deleted on every exit path — dry-run success or failure, preflight snapshot
failure, deploy failure, postflight snapshot failure, `PROTECTED_WORKER_CHANGED`,
`TARGET_VERSION_NOT_CHANGED`, and generic exceptions. `--keep-config` is the
only opt-out that preserves the file for inspection or rollback.

## Deploy command form

```text
npx wrangler deploy --dry-run --config <generated-safe-config>
npx wrangler deploy --config <generated-safe-config>
```

The dry-run runs first and a dry-run failure aborts the deployment.

## A/B dirty marker procedure

An explicit A/B validation may need a visible safe marker on top of the exact
head. The dirty worktree is blocked by default. `--allow-dirty` permits only
tracked A/B marker modifications — untracked files and directories are
rejected with `UNTRACKED_FILES_NOT_ALLOWED` so the patch identity is exact:

```bash
npm run preview:deploy:safe -- \
  --worker lovetree-limone-issue-26-preview \
  --confirm-worker lovetree-limone-issue-26-preview \
  --source-sha "$(git rev-parse HEAD)" \
  --allow-dirty \
  --execute
```

The patch SHA-256 is computed from a deterministic payload:

```text
STATUS\0<normalized tracked status manifest>\0DIFF\0<git diff --binary --no-ext-diff HEAD>
```

The manifest covers staged and unstaged modifications, tracked binary
modifications, and file names. Identical tracked patches produce the same
hash; distinct tracked patches produce different hashes. Untracked file
content is never hashed — it is rejected immediately. Record the printed
patch SHA-256 with the A/B result.

## Before/after version recording (fail-closed snapshots)

In execute mode the guard records structured snapshots, before deployment:

```text
intended Worker
source SHA
worktree state / patch SHA-256
generated config SHA-256
target snapshot  { worker, state: present|absent, deploymentId, createdOn, strategy, versions[], deploymentFingerprint }
protected Worker snapshots (must all be present with exact deployment fingerprints)
```

and after deployment:

```text
target snapshot (must be present with a changed deployment id or fingerprint)
protected Worker snapshots (must be byte-identical to before: same deploymentId and deploymentFingerprint)
```

Snapshot states are explicit — `present` with a full deployment, or `absent`
(only allowed for a brand-new isolated target). Every failure mode — missing
credentials, authentication/permission/rate-limit failures, network failure,
timeout, invalid JSON, malformed payload, an empty deployments array, a
malformed first deployment, or version percentages that do not sum to 100 —
is a `VERSION_SNAPSHOT_UNAVAILABLE` error that blocks the deploy command. If
any snapshot is unavailable, the deploy command is invoked zero times.

### Real Cloudflare deployments schema

`GET /accounts/{account_id}/workers/scripts/{script_name}/deployments` returns
a REST envelope, NOT a direct array:

```json
{
  "success": true,
  "result": {
    "deployments": [
      {
        "id": "deployment-id",
        "created_on": "2026-08-02T00:00:00.000000Z",
        "strategy": "percentage",
        "versions": [
          { "version_id": "version-a", "percentage": 60 },
          { "version_id": "version-b", "percentage": 40 }
        ]
      }
    ]
  }
}
```

- The first deployment entry is the current active deployment per the API
  contract. The guard uses `deployments[0]` directly and never re-determines
  the active deployment by fabricated timestamp sorting.
- Each deployment carries a nested `versions[]` array
  (`versions[n].version_id`, `versions[n].percentage`); there is no top-level
  `version_id`.
- The test suite pins this shape with the sanitized
  `CLOUDFLARE_DEPLOYMENTS_RESPONSE_FIXTURE` contract fixture. If the response
  envelope ever drifts back to a direct `result` array, the fixture tests fail
  and the parser stays fail-closed (`VERSION_SNAPSHOT_UNAVAILABLE`).

### Deployment fingerprint and weighted deployments

A deployment may split traffic across two or more versions. The guard never
reduces a weighted deployment to a single `versionId`. Each snapshot carries a
deterministic `deploymentFingerprint` computed from:

```text
deployment id
created_on
strategy
sorted versionId + percentage pairs (percentage descending, versionId ascending)
```

Identical deployments always produce the same fingerprint; deployments with
different percentages or version sets produce different fingerprints.

Pass conditions after deploy:

- a target that was `absent` becomes `present`;
- a target that was `present` changes its deployment id or its deployment
  fingerprint (otherwise `TARGET_VERSION_NOT_CHANGED`);
- every protected Worker keeps the same deploymentId and deploymentFingerprint
  (otherwise `PROTECTED_WORKER_CHANGED`);
- every postflight snapshot is complete.

If the deploy command succeeded but the postflight snapshot is impossible,
the guard reports an explicit incident state — it never reports success, never
auto-rollbacks, and prints the before snapshot plus manual verification
procedure.

## Target mismatch response

If the resolved target does not equal the intended isolated Preview Worker,
abort immediately. Do not proceed, do not roll back automatically, and do not
run further deploy commands.

## Rollback principles

- No automated rollback. An automatic rollback can turn a single incident
  into a second-order incident.
- On `PROTECTED_WORKER_CHANGED`, the guard prints rollback guidance. When the
  preflight deployment has exactly one version at 100%, it prints an exact
  rollback command and the prior version ID for a human to run after triage:

  ```text
  npx wrangler rollback <PRIOR_VERSION_ID> --config <generated-safe-config>
  ```

- When the preflight deployment is weighted (two or more versions, or a
  version below 100%), the guard never fabricates a single-version rollback
  command. It prints `MANUAL_WEIGHTED_DEPLOYMENT_RESTORE_REQUIRED` with the
  prior deployment id and the prior version/percentage set so a human can
  restore the exact weighted deployment.

- The 2026-08-02 prior version for `lovetree-limone` was
  `cc92d036-5868-4bb6-b4f4-dfd747ea6485`; Cloudflare deployment history
  remains the authority for any audit.

## Incident report format

Include in every isolated Preview incident report:

```text
intended Worker
actual Worker (if different)
source SHA
worktree state / patch SHA-256
generated config SHA-256
deploy command used
target snapshot before / after (deployment id + fingerprint + versions)
protected Worker snapshots before / after (deployment id + fingerprint)
rollback command / manual weighted restore requirement
PROTECTED_WORKER_CHANGED: YES/NO
TARGET_VERSION_NOT_CHANGED: YES/NO
VERSION_SNAPSHOT_UNAVAILABLE: YES/NO
postflight incident (deploy succeeded, verification impossible): YES/NO
```

## Preview Worker cleanup

After validation, the isolated Preview Worker should be deleted when it is no
longer needed:

```bash
npx wrangler delete --config <generated-safe-config> --force
```

Only delete the exact isolated Preview Worker. Never delete a protected
Worker.

## Ordinary-refresh acceptance relationship

Isolated Preview validation must be verified with an ordinary browser refresh
of the exact deployment, matching the cache/versioning contract (see the PR #12
cache and asset versioning policy). No hard refresh, DevTools cache disable, or
manual cache purge is allowed for acceptance. The guarded deployment command
exists so that this validation can never target a protected Worker.
