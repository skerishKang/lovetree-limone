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
