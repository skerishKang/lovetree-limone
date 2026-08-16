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
