# GitHub → Cloudflare guarded Production deployment

Issue: #75

## Goal

Normal release path:

`merge/push to main → validation → exact Production build → guarded Cloudflare deploy → post-deploy smoke`

The workflow reuses the repository's existing fail-closed Production guard. It never replaces it with a raw `wrangler deploy` command.

## Workflow

`.github/workflows/production-auto-deploy.yml`

Triggers:

- push to `main`;
- manual `workflow_dispatch`.

Automatic Production deployment is **default ON**. The job runs whenever `main` changes unless repository variable:

`LOVETREE_PRODUCTION_AUTO_DEPLOY=false`

is explicitly set as an emergency pause switch.

The Production smoke target is pinned to the verified Worker URL:

`https://lovetree-limone.charliekant.workers.dev`

## Required repository secrets

Configure these once in GitHub repository Actions secrets. Never commit their values.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`

`DATABASE_URL` must point to the verified Production Neon database:

- project: `autumn-cherry-54971674`
- branch: `br-holy-scene-azwi84gb`
- database: `neondb`

The current Production DB is already Expand compliant. Automatic deployment does **no Production DB migration/write**.

`NEXT_PUBLIC_FIREBASE_PROJECT_ID` is pinned to `relovetree`. Automatic deployment performs **no Firebase user/data mutation**.

The Cloudflare token must only have permissions needed to inspect and deploy the existing `lovetree-limone` Worker.

## Fail-closed sequence

1. Checkout full history and refresh `origin/main`.
2. Require `HEAD == origin/main` and a clean worktree.
3. Require all configured Production secrets to exist.
4. Run lint, typecheck, targeted contracts, full suite, build and schema validation.
5. Run `npm run production:build:safe`.
6. Resolve the current active `lovetree-limone` Worker version.
7. Run `production:deploy:safe` without `--execute` and require dry-run PASS.
8. Re-run the same guarded command with `--execute`.
9. Require the active Worker version to change.
10. Smoke the pinned Production URL at `/`, `/v4`, representative Tree routes, Subjects, Community and `/design-lab`.
11. Publish source SHA, old/new Worker versions and rollback command in the Actions summary.

Any missing secret, wrong Worker identity, source mismatch, dirty checkout, binding drift, DB Expand-state failure, stale build provenance, Firebase build-config failure, Cloudflare failure, deploy failure or smoke failure stops the workflow.

## Explicitly prohibited shortcuts

- no raw ad-hoc `wrangler deploy`;
- no `lovetree-limone-production` target;
- no force push or main reset;
- no Production DB migration/write performed by the workflow;
- no Firebase user/data mutation;
- no secret values in logs or summaries;
- no treating a failed post-deploy smoke as success.

## Emergency pause

Set repository variable:

`LOVETREE_PRODUCTION_AUTO_DEPLOY=false`

Only use this to intentionally stop automatic Production releases. Removing the variable or setting any value other than `false` restores default-on behavior.

## Rollback

Every successful run records the previous active Worker version and prints:

`npx wrangler rollback <previous-version-id> --name lovetree-limone`

Rollback remains an explicit controlled action. The workflow does not automatically deploy again after a failed smoke.

## First activation

1. Add the five required Actions secrets from the already verified local Production deployment environment.
2. Do not run any DB migration; Production is already compliant.
3. Run `workflow_dispatch` once, or merge a normal validated change into `main`.
4. Confirm source SHA, previous/new Worker version, smoke result and rollback command.
5. From then on, every normal `main` update automatically uses the same guarded path.
