/**
 * committed-blob-reader.mjs (#676 / #663)
 *
 * Cross-platform committed-blob hash locks.
 *
 * Normative rule:
 *   FROZEN_AUTHORITY_HASH_INPUT = COMMITTED_GIT_BLOB_BYTES
 *   WORKTREE_EOL_SMUDGE         = NOT_AUTHORITY
 *
 * On CRLF checkouts (core.autocrlf), Git smudges committed LF blobs to CRLF
 * in the worktree. Hash locks that read worktree bytes therefore report
 * platform-dependent false drift even when the committed authority is
 * intact. Authority checks must read the committed blob bytes instead.
 * Simply normalizing CRLF->LF is NOT a substitute: the actual Git blob
 * bytes are read, so a genuine committed-content change still fails.
 *
 * Root model:
 *   real current Git repository / worktree
 *                                  -> committed blob authority
 *                                     (git cat-file blob HEAD:<path>)
 *   synthetic / non-Git fixture root -> fixture worktree bytes
 *                                        (intentional fixture mutations
 *                                         must still be detected)
 *
 * Real-repo vs fixture classification is based on source-controlled
 * FILESYSTEM evidence at the root, NOT on the success of a git command:
 *
 *   <root>/.git exists (directory)  -> normal clone
 *   <root>/.git exists (file)       -> git worktree / submodule pointer
 *   <root>/.git exists (symlink)    -> marker of a repo claim
 *   <root>/.git absent              -> true non-Git synthetic fixture
 *
 * Invariant: a missing or failing git binary is NOT proof that a root is a
 * synthetic fixture. A real repository whose git command is unavailable or
 * whose blobs are missing stays in committed mode and fails closed with
 * COMMITTED_BLOB_UNAVAILABLE.
 *
 * Fail-closed: in committed mode a Git failure or unavailable blob yields
 * COMMITTED_BLOB_UNAVAILABLE; there is never a silent worktree fallback.
 *
 * Git rules: argv form only (execFileSync, no shell, no string command
 * interpolation); repository-relative POSIX paths only; the revision is
 * pinned to HEAD (no revision input surface). Command stderr is not
 * surfaced in failure values.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 64 MiB covers the largest frozen original (multi-MB HTML) with margin.
const BLOB_MAX_BUFFER = 64 * 1024 * 1024;

/**
 * True when rootDir carries source-controlled repository metadata: a `.git`
 * entry present as a directory (normal clone), a file (git worktree /
 * submodule pointer), or a symlink (repo claim). A git binary being absent
 * or a git command failing is deliberately NOT used as fixture evidence —
 * such a root stays in committed mode and fails closed. Synthetic fixture
 * roots (mkdtemp directories holding copied capsule files) have no `.git`
 * entry and stay on fixture worktree bytes. Fixture roots must live
 * OUTSIDE the repository so they are never misclassified.
 */
export function isGitRepoRoot(rootDir) {
  let st;
  try {
    st = lstatSync(join(rootDir, '.git'));
  } catch {
    return false; // no .git marker: true non-Git fixture
  }
  return st.isDirectory() || st.isFile() || st.isSymbolicLink();
}

function isRepoRelativePosixPath(p) {
  if (typeof p !== 'string' || p.length === 0) return false;
  if (p.startsWith('/')) return false;                       // absolute POSIX
  if (/^[A-Za-z]:/.test(p)) return false;                    // drive absolute
  if (p.includes('\\')) return false;                        // not POSIX
  if (p.split('/').some((seg) => seg === '..')) return false; // no parent refs
  return true;
}

/**
 * Read the committed blob bytes for a repo-relative path at HEAD.
 * Returns a Buffer, or null when the blob is unavailable
 * (COMMITTED_BLOB_UNAVAILABLE). No shell, no worktree fallback.
 */
export function readCommittedBlob(rootDir, repoRelativePath) {
  if (!isRepoRelativePosixPath(repoRelativePath)) return null;
  const rel = repoRelativePath.split('\\').join('/');
  try {
    return execFileSync('git', ['cat-file', 'blob', `HEAD:${rel}`], {
      cwd: rootDir,
      maxBuffer: BLOB_MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return null; // COMMITTED_BLOB_UNAVAILABLE — callers fail closed.
  }
}

/**
 * Root-dependent frozen-authority byte source.
 *
 *   real Git repo      -> { mode: 'committed', read(rel) -> Buffer|null }
 *                          (null = COMMITTED_BLOB_UNAVAILABLE)
 *   non-Git fixture    -> { mode: 'fixture',   read(rel) -> Buffer|null }
 *                          (fixture worktree bytes; null = file missing)
 */
export function createAuthorityByteSource(rootDir) {
  if (isGitRepoRoot(rootDir)) {
    return {
      mode: 'committed',
      read: (rel) => readCommittedBlob(rootDir, rel),
    };
  }
  return {
    mode: 'fixture',
    read: (rel) => {
      if (!isRepoRelativePosixPath(rel)) return null;
      const full = join(rootDir, rel);
      return existsSync(full) ? readFileSync(full) : null;
    },
  };
}
