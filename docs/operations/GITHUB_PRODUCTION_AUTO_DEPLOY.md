# GitHub → Cloudflare guarded Production deployment

Issue: #75

## Goal

Make the normal release path:

`merge/push to main → validation → exact Production build → guarded Cloudflare deploy → post-deploy smoke`

without requiring an operator to run Wrangler manually for each release.

This workflow deliberately reuses the repository's existing fail-closed Production guard. It does **not** replace it with a raw `wrangler deploy` command.

## Workflow

`.github/workflows/production-auto-deploy.yml`

Triggers:

- push to `main`;
- manual `workflow_dispatch`.

The Production job runs only when repository variable:

`LOVETREE_PRODUCTION_AUTO_DEPLOY=true`

is set. The default/unconfigured state is therefore OFF.

## Required repository secrets

Configure these in GitHub repository Actions secrets. Never commit their values.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`

`NEXT_PUBLIC_FIREBASE_PROJECT_ID` is pinned by the workflow to the repository Production contract value `relovetree`.

The Cloudflare token must have only the permissions needed to inspect and deploy the existing `lovetree-limone` Worker. Do not give the workflow unrelated account-wide write permissions.

## Required repository variables

- `LOVETREE_PRODUCTION_AUTO_DEPLOY`
  - set to `true` only when automatic Production deployment is intentionally enabled;
  - any other value keeps the Production job skipped.
- `LOVETREE_PRODUCTION_BASE_URL`
  - exact HTTPS base URL used for post-deploy smoke checks;
  - must point to the current `lovetree-limone` Production deployment, not Preview/V2/V3/another repository.

## Fail-closed sequence

1. Checkout full history and explicitly refresh `origin/main`.
2. Require `HEAD == origin/main` and a clean worktree.
3. Run the same lint/typecheck/targeted/full-suite/schema validation gates used by the A-track.
4. Run `npm run production:build:safe` so Firebase client config and build provenance are checked.
5. Resolve the current active `lovetree-limone` Worker version through `collectActiveVersion()` from the Production guard.
6. Run `production:deploy:safe` without `--execute` and require the dry-run to pass.
7. Re-run the same guarded command with `--execute`.
8. Resolve the active Worker again and require the version to have changed.
9. Smoke the configured Production base URL at `/`, `/v4`, representative Tree routes, Subjects, Community and Design Lab.
10. Publish source SHA, old/new version IDs and the exact rollback command in the Actions step summary.

Any missing secret/variable, wrong Worker identity, source SHA mismatch, dirty checkout, binding drift, DB Expand-state failure, stale build provenance, Firebase build-config failure, Cloudflare read failure, deploy failure or smoke failure stops the workflow.

## Explicitly prohibited shortcuts

- no raw ad-hoc `wrangler deploy` in the workflow;
- no `lovetree-limone-production` target;
- no force push or main reset;
- no Production DB migration/write performed by the workflow;
- no Firebase user/data mutation;
- no secret values in logs or summaries;
- no treating a failed post-deploy smoke as success.

## Rollback

Every successful run records the previous active Worker version and prints:

`npx wrangler rollback <previous-version-id> --name lovetree-limone`

Rollback is an explicit operator action. The workflow does not automatically mutate Production again after a failed smoke because automatic rollback can hide a partial infrastructure problem; the failed run preserves the exact previous version ID needed for a controlled rollback.

## First enablement checklist

Before setting `LOVETREE_PRODUCTION_AUTO_DEPLOY=true`:

1. Confirm the current manually deployed Production URL and set `LOVETREE_PRODUCTION_BASE_URL` exactly.
2. Add the required Actions secrets.
3. Confirm the Cloudflare token resolves the intended account and existing `lovetree-limone` Worker.
4. Run the workflow once with `workflow_dispatch` while the enable variable is true.
5. Verify source SHA, previous/new Worker version, smoke result and rollback command in the run summary.
6. After that, normal main pushes use the same path automatically.
