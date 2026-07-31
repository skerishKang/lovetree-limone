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

## Next UI integration (2026-07-31)

- Shared base: `ui/1-initial-limone-baseline` at `840cf86f2dbc711b0fd1a32deaa8e40a725bc953`
- Integration branch: `ui/3-limone-next-ui`
- Issue: [#3](https://github.com/skerishKang/lovetree-limone/issues/3)
- Included: Limone tree/flow/diary/story/album views, growth-state interactions, deletion affordances, discovery visuals, and local public assets.
- Excluded: backend, database, authentication, deployment, package metadata, and shared layout/configuration files.
- `npm ci`: passed; 508 packages installed, with npm reporting 18 audit vulnerabilities (1 low, 4 moderate, 13 high).
- `npm run lint`: passed.
- `npm test`: failed on Windows because the existing script uses POSIX `WRANGLER_LOG_PATH=...` assignment.
- Direct `node --test tests/rendered-html.test.mjs tests/limone-ui.test.mjs`: passed (8 tests).
- Direct `vinext build`: passed.
- typecheck: not configured.
- Browser QA: blocked by the in-app browser's loopback isolation; the local preview server was healthy on the Windows host, but the browser could not reach `localhost`/`127.0.0.1`. Static UI assertions and direct build checks passed.
- Secret scan: no suspected credentials in changed files; `.dev.vars.example` remains the existing placeholder-only example.
