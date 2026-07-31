# Initial Limone UI Baseline

## Import status

- GitHub issue: [#1](https://github.com/skerishKang/lovetree-limone/issues/1)
- Working branch: `ui/1-initial-limone-baseline`
- Source snapshot: copied into this workspace from the read-only original project
- Scope: UI source, public assets, package manifest, lockfile, project configuration, and existing UI test material
- Backend, database, authentication, and deployment implementation: not included in this scope

## Path and safety checks

- Original absolute `H:` path references in the copied text files: `0`
- Secret scan: `0` matches
- Environment files: `0`
- Forbidden generated directories: none found outside `.git` metadata
- Generated file patterns (`*.map`, `*.tsbuildinfo`, `*.log`): none found

Relative project paths were preserved. No absolute path rewrite was required.

## Validation

| Check | Result | Notes |
| --- | --- | --- |
| Node.js | passed | `v22.19.0` |
| npm | passed | `10.9.3` via `npm.cmd` |
| `npm ci` | passed | 507 packages installed; npm reported 18 audit vulnerabilities (1 low, 4 moderate, 13 high) |
| `npm run lint` | passed | ESLint completed successfully |
| `npm test` | failed | The package script's POSIX `WRANGLER_LOG_PATH=...` syntax is not recognized by Windows `cmd.exe` |
| `npm run build` | failed | Same Windows environment-variable syntax issue |
| Direct `vinext build` | failed | `vite.config.ts` imports missing `./build/sites-vite-plugin`; the `build/` directory was excluded by the import rules |
| typecheck | not configured | No `typecheck` script exists in `package.json` |

The validation failures are recorded for follow-up; they do not change the
imported source snapshot. No automatic vulnerability fix or build configuration
change was applied.

## Foundation branch recovery validation
(`foundation/pr-2-hardening-recovered`, branch `531befb`)

| Check | Result | Notes |
| --- | --- | --- |
| Node.js | passed | `v22.19.0` |
| npm | passed | `10.9.3` |
| `npm ci` | passed | 507 packages installed; 18 audit vulnerabilities (1 low, 4 moderate, 13 high) |
| `npm run lint` | passed | 0 errors, 5 warnings (unused vars in pre-existing code) |
| `npm run typecheck` | passed | No TypeScript errors |
| `npm run build` | passed | vinext build complete |
| `npm test` | passed | 68 tests, 0 fail |
| `npx drizzle-kit check` | passed | Everything's fine |
| `npm audit --omit=dev` | 3 high | postcss (via next) and sharp (via next) — pre-existing, not introduced by this change |
| `npx wrangler types` | passed | Generated `worker-configuration.d.ts` with all env vars |
| Windows scripts | fixed | Removed POSIX `WRANGLER_LOG_PATH=...` prefix; all scripts run on cmd.exe |
| Route: `GET /api/health` | passed | 200 `{"status":"ok","env":"staging"}` |
| Route: `GET /api/trees` | passed | 401 (auth required) |
| Route: `GET /api/community/trees` | passed | DB query wired correctly |
| Route: `POST /api/trees` (mutations disabled) | passed | 503 (mutations gated by `API_MUTATIONS_ENABLED`) |
| Secret scan | 0 secrets committed | All `DATABASE_URL`, `FIREBASE_PROJECT_ID` values are placeholders |

### Concurrent worktree recovery summary

- **Current branch at start**: `foundation/user-staging-preview` (HEAD `84d62df`)
- **Recovery backup branch**: `backup/concurrent-worktree-recovery-20260731` (local only, commit `371b99b`)
- **`84d62df` assessment**: staging preview commit with parent `7683f3e` (cherry-pick of local foundation work `4fc29ea`); contains the full foundation + staging snapshot
- **Local `foundation/pr-2-hardening` assessment**: at `7683f3e`, content-identical to backup `4fc29ea`; left untouched
- **Canonical branch**: `foundation/pr-2-hardening-recovered` at `531befb`, pushed to remote, Draft PR [#5](https://github.com/skerishKang/lovetree-limone/pull/5)
- **Cloudflare deployment**: not performed
