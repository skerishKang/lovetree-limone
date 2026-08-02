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
6. A dirty worktree is blocked by default.
7. The build output must exist at `dist/client`.
8. The generated safe config must pass `wrangler deploy --dry-run` first.

## Generated config policy

The guard never edits `wrangler.jsonc`. It writes a fresh JSON config into a
temporary directory that forces:

```text
name                    = exact isolated Preview Worker
workers_dev             = true
main                    = worker/index.ts
assets.directory        = dist/client
assets.binding          = ASSETS
APP_ENV                 = staging
API_MUTATIONS_ENABLED   = false
```

The following are removed or blocked:

```text
routes
custom_domains
env (production and staging blocks, including staging mutation-true values)
```

Only safe common values (compatibility date/flags, `main`, `assets`,
`FIREBASE_PROJECT_ID`, required secrets list) are copied from the source
config. The generated config file path and its SHA-256 are printed. The temp
config is deleted on exit unless `--keep-config` is passed.

The Worker name is specified only inside the generated config. The deploy
command never passes `--name`, so it cannot fall back to the repository
default name.

## Deploy command form

```text
npx wrangler deploy --dry-run --config <generated-safe-config>
npx wrangler deploy --config <generated-safe-config>
```

The dry-run runs first and a dry-run failure aborts the deployment.

## A/B dirty marker procedure

An explicit A/B validation may need a visible safe marker on top of the exact
head. The dirty worktree is blocked by default; allow it only with an explicit
flag, which also prints the patch SHA-256:

```bash
npm run preview:deploy:safe -- \
  --worker lovetree-limone-issue-26-preview \
  --confirm-worker lovetree-limone-issue-26-preview \
  --source-sha "$(git rev-parse HEAD)" \
  --allow-dirty \
  --execute
```

Record the printed patch SHA-256 with the A/B result.

## Before/after version recording

In execute mode the guard records, before deployment:

```text
intended Worker
source SHA
worktree state
generated config SHA-256
current target deployment/version metadata
protected Worker deployment/version metadata
```

and after deployment:

```text
new target version
target version delta
protected Worker version delta
```

If any protected Worker gained a version during the deployment, the guard
fails with `PROTECTED_WORKER_CHANGED`, prints the detected deltas, and stops.

## Target mismatch response

If the resolved target does not equal the intended isolated Preview Worker,
abort immediately. Do not proceed, do not roll back automatically, and do not
run further deploy commands.

## Rollback principles

- No automated rollback. An automatic rollback can turn a single incident
  into a second-order incident.
- On `PROTECTED_WORKER_CHANGED`, the guard prints the exact rollback command
  and the prior version ID for a human to run after triage:

  ```text
  npx wrangler rollback <PRIOR_VERSION_ID> --config <generated-safe-config>
  ```

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
target version before / after
protected Worker versions before / after
rollback command and prior version ID
PROTECTED_WORKER_CHANGED: YES/NO
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
