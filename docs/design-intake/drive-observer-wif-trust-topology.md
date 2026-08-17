# Drive Observer — WIF Trust Topology (Issue #173)

Status: **LIVE_WIF_CONFIGURATION_HOLD** — the preferred topology below is
*designed and fail-closed implemented*, but NOT provisioned. No Google Cloud
IAM/WIF resource, GitHub secret or branch-protection rule was created or
modified by this work.

## Pipeline boundary (enforced in code)

```
Drive API v3 (read-only GET; transport injectable)
        ↓ raw provider records (pagination evidence kept)
observeDriveTrack — pagination fail-closed, bounded streaming SHA-256,
        ↓         declared-vs-received size verification
DriveObservation (normalized, secret-redacted, deterministic JSON)
        ↓ observationToDriveSourceState (fail-closed precedence)
DriveSourceState
        ↓
#171 pure resolver (lib/design-intake/source-freshness.ts — REUSED UNCHANGED)
        ↓
PASS / FAIL / NON_PASS / UNKNOWN (+ mergeBlock on every non-PASS)
```

The pure resolver never gains network logic. The observation layer never
re-implements resolution semantics.

## Provider-state precedence (fail closed)

| providerState | resolver input | resolver verdict |
| --- | --- | --- |
| `SUCCESS` + `observationComplete` | full evidence state | resolved normally |
| `INCOMPLETE` (pagination truncated, hash failure, size mismatch, unobserved declared evidence) | `available: true, incomplete: true` | `UNKNOWN/DRIVE_INCOMPLETE` + mergeBlock |
| `AUTH_FAILED` / `PERMISSION_DENIED` / `UNAVAILABLE` / `API_ERROR` | `available: false` | `UNKNOWN/DRIVE_UNAVAILABLE` + mergeBlock |

No code path may treat a non-SUCCESS provider state as PASS.

## Credential contract (short-lived only)

Accepted runtime credential: **one short-lived access token** injected as
`DESIGN_INTAKE_DRIVE_ACCESS_TOKEN` by a trusted workflow job. Absent ⇒
`LIVE_DISABLED`, CLI exit 3, never a synthetic PASS.

Explicitly refused (fail-closed at runtime, asserted by tests):

- `GOOGLE_APPLICATION_CREDENTIALS` (committed/exported service-account JSON)
- `SERVICE_ACCOUNT_KEY` / `GOOGLE_SERVICE_ACCOUNT_KEY`
- `OAUTH_REFRESH_TOKEN` / `DRIVE_OAUTH_REFRESH_TOKEN`

A long-lived static secret would be a worse state than the current honest
HOLD; keeping `LIVE_WIF_HOLD` is the correct decision until provisioning is
authorized.

## Target GitHub Actions topology (not yet provisioned)

```
pull_request (unprivileged)                  workflow_dispatch (trusted, default branch only)
  observer-contract job                        live-observation job
  - PR code, NO secrets, NO id-token           - default-branch code ONLY (never PR head)
  - fixture acceptance matrix                  - id-token: write (AFTER WIF exists)
  - static security contracts                  - OIDC → google-github-actions/auth (WIF)
  - proves LIVE fail-closed (exit 3)           - short-lived token → DESIGN_INTAKE_DRIVE_ACCESS_TOKEN
                                               - observe → resolve → report verdicts
```

Hardening corrections from the #173 CTO review that the future provisioning
MUST apply (already reflected in the workflow skeleton):

1. The WIF policy must pin the repository by **immutable `repository_id`**
   (not only `repository/ref`) AND pin the exact trusted observer workflow
   identity (`job_workflow_ref` + SHA for reusable workflows).
2. A `workflow_run`-triggered privileged job is privileged even when the
   triggering workflow came from an untrusted PR: it must never check out,
   execute or consume artifacts/caches built from the PR head. PR SHA/file
   data may only be fetched as untrusted data via API.
3. `workflow_run` has no `paths` filter. If the freshness check ever becomes
   globally required, applicability must be computed inside the trusted
   observer, and non-applicable PRs must still receive a deterministic
   `NOT_APPLICABLE` result on the current PR head — omitting the check would
   deadlock the required-check gate.
4. `pull_request_target` is forbidden for any job that touches Drive
   credentials.

## Read-only enforcement

- The transport interface exposes listing + content streaming only; there is
  no write/move/rename/share/trash code path (`NO_DRIVE_WRITE_SCOPE`).
- Downloaded content is streamed through a bounded SHA-256 hasher and
  discarded; it is never decoded as a page, parsed, imported or executed
  (`NO_ARBITRARY_DRIVE_HTML_EXECUTION`). Hashes above `hashMaxBytes` (default
  256 MiB) fail closed as `HASH_TRUNCATED` instead of truncating evidence.
- Declared metadata size vs received bytes mismatch fails closed
  (`HASH_SIZE_MISMATCH`) — interrupted or inconsistent downloads never count
  as fingerprint evidence.

## Authority classification (explicit only)

`rootCurrentFileId`, `functionalFileIds`, `displayFileIds` and
`historicalFileIds` in `design-intake/observer/drive-observer.config.json`
(style: `tests/fixtures/source-freshness/observer/observer-config.json`) are
human declarations. Filename numbers, folder labels and bare Drive file ids
never classify a source or select the current revision. Filename-derived
revision labels are recorded as descriptive context only; the #171 resolver
never picks the current candidate by label.

## Offline stale-green / TOCTOU merge-authority contract

A prior `PASS` is evidence about one exact observation, not a reusable merge
capability. Before merge authority can be accepted, the trusted gate must bind
the PASS to the exact GitHub and Drive evidence tuple and reject historical
green when that tuple moves.

Minimum PASS seal:

- PR head SHA;
- observed base/main SHA;
- observation timestamp;
- track/root identity;
- root/current Drive file id;
- Drive `modifiedTime`;
- metadata-declared bytes;
- full-content SHA-256;
- `providerState=SUCCESS`, `observationComplete=true`, and terminal pagination.

If PR head or main moves, or if file id / `modifiedTime` / bytes / SHA-256 changes,
the old green immediately loses merge authority and a fresh full observation +
resolver run is required. A same-hash/new-file-id packaging-only revision may
resolve to PASS again **after** re-observation; the earlier PASS is still stale
because source identity changed. `INCOMPLETE`, `UNAVAILABLE`, `AUTH_FAILED`,
`PERMISSION_DENIED`, `API_ERROR`, pagination failure, or hash evidence failure
is `UNKNOWN`/non-authoritative with `mergeBlock`, never a reason to retain a
historical PASS.

## Concrete WIF subject contract — documentation only, NOT provisioned

The current repository facts used by the offline negative matrix are:

- `repository_id` == `1316947337`
- `repository` == `skerishKang/lovetree-limone`
- `ref` == `refs/heads/main`
- `ref_type` == `branch`
- `workflow_ref` == `skerishKang/lovetree-limone/.github/workflows/design-source-freshness-observer.yml@refs/heads/main`
- `event_name` == `workflow_dispatch`

All fields above are conjunctive. The future WIF condition must deny, at
minimum: a different repository id/name, `refs/tags/main`, any `refs/pull/**`
ref, a feature branch, the same workflow path loaded from a non-main ref, a
different workflow path, and an untrusted event. A future reusable-workflow
architecture may additionally pin `job_workflow_ref` + `job_workflow_sha`; the
current non-reusable skeleton must not pretend those claims are active today.

`id-token: write` remains disabled until the Google-side WIF condition and
read-only identity are independently provisioned and approved.

## Required-check naming contract — future enforcement only

GitHub enforcement must use stable **job/check identities**, not workflow
display names or conditional child jobs.

- CURRENT/STAGE-A required candidate: `validate`
- CURRENT/STAGE-A required candidate: `Design Fidelity Validation`
- FUTURE_FRESHNESS_REQUIRED_CHECK = `Design Source Freshness`
- NOT a required-check alias: workflow name `Design Source Freshness Observer`
- NOT globally required: `Fidelity · ${{ matrix.id }}`
- NOT the live freshness verdict: `Observer contract + security (unprivileged, credential-free)`

`REQUIRED_CHECK_RENAME_OR_ABSENCE = BLOCK/HOLD`

A rename, conditional omission, or accidental substitution must fail closed.
Do not silently accept a similarly named check and do not activate the future
`Design Source Freshness` requirement until one deterministic aggregator exists
for both applicable and `NOT_APPLICABLE` PRs and trusted merge-time
re-observation is proven.

## Enforcement rollout state

```
ENFORCEMENT_CODE_READY        = YES (observer + resolver + CLIs + tests)
LIVE_WIF_CONFIGURATION_HOLD  = YES (no Google-side provisioning authorized)
BRANCH_PROTECTION_MUTATION_HOLD = YES (no ruleset changes; Web CTO decision)
```

Staged activation (per the #173 CTO checkpoint) remains: Stage A current CI
checks → Stage B a stable `Design Source Freshness` aggregator only after the
trusted topology proves exact-head PASS/FAIL/UNKNOWN behavior → Stage C
required-check activation on a disposable proof branch first.
