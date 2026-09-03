/**
 * MVP001 — Read-only Productized Alpha dispatch.
 *
 * Product-owned composition layer between the read context and the five
 * Source adapters. Pure, deterministic, framework-neutral: no DOM, no fetch,
 * no Firebase, no DB, no write.
 *
 * Responsibility:
 * - buildSurfaceUrl(): append only mvpSession/mvpSource bootstrap params
 * - projectAlphaContext(): dispatch a validated read context to the adapter
 *   owned by the active sourceId
 * - loadAlphaProjection(): bounded async loader (read-client -> read-context
 *   -> adapter) for shell/orchestrator consumption
 *
 * Unknown sourceId fails closed. Adapter files are never modified here.
 */

import { projectMvp001ContextToSrc064 } from './src064-adapter.js';
import { projectMvp001ContextToSrc058 } from './src058-adapter.js';
import { projectMvp001ContextToSrc056 } from './src056-adapter.js';
import { projectMvp001ContextToSrc057 } from './src057-adapter.js';
import { projectMvp001ContextToSrc060, searchSrc060Nodes } from './src060-adapter.js';
import { loadMvp001ReadContext } from './read-context.js';

export const ALPHA_SUPPORTED_SOURCES = Object.freeze([
  'SRC064',
  'SRC058',
  'SRC056',
  'SRC057',
  'SRC060',
]);

const SOURCE_SET = new Set(ALPHA_SUPPORTED_SOURCES);

function alphaError(code, message) {
  const e = new Error(message);
  e.name = 'ProductizedAlphaError';
  e.code = code;
  return e;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

/**
 * Maps read-context failures to explicit Product states. Pure and total:
 * every failure becomes a named shell state — never fixture fallback data.
 * Returns {status, text} where status is one of:
 * 'unauthorized' | 'not-found' | 'network-error' | 'error'.
 */
export function mapAlphaReadError(error) {
  if (error && typeof error === 'object') {
    if (error.name === 'Mvp001ReadError' && error.code === 'HTTP') {
      if (error.status === 401) return { status: 'unauthorized', text: 'Sign-in required to read this Tree (401). No demo content is shown.' };
      if (error.status === 404) return { status: 'not-found', text: 'Requested Tree or Memory was not found (404). No demo content is shown.' };
      return { status: 'error', text: `MVP01 read failed (HTTP ${error.status}). No demo content is shown.` };
    }
    if (error.name === 'Mvp001ReadError' && error.code === 'NETWORK') {
      return { status: 'network-error', text: 'Network unavailable. Check connection and retry. No demo content is shown.' };
    }
    if (error.code === 'SELECTED_MEMORY_TREE_MISMATCH') {
      return { status: 'not-found', text: 'Selected Memory does not belong to this Tree. No demo content is shown.' };
    }
  }
  return { status: 'error', text: 'MVP01 read unavailable. No demo content is shown.' };
}

/**
 * Appends ONLY the MVP bridge bootstrap params to a surface URL.
 * Never carries tokens, payloads, or private content — canonical data flows
 * exclusively through validated SOURCE_INIT.
 */
export function buildSurfaceUrl(surfaceUrl, sessionId, sourceId) {
  if (!isNonEmptyString(surfaceUrl)) throw new TypeError('surfaceUrl must be a non-empty string');
  if (!isNonEmptyString(sessionId)) throw new TypeError('sessionId must be a non-empty string');
  if (!SOURCE_SET.has(sourceId)) {
    throw alphaError('UNKNOWN_SOURCE', `unsupported Productized Alpha source: ${String(sourceId)}`);
  }
  const sep = surfaceUrl.includes('?') ? '&' : '?';
  return `${surfaceUrl}${sep}mvpSession=${encodeURIComponent(sessionId)}&mvpSource=${encodeURIComponent(sourceId)}`;
}

export function parseAlphaBootstrap(search) {
  const params = new URLSearchParams(typeof search === 'string' ? search.replace(/^[?]/, '') : '');
  const sessionId = params.get('mvpSession');
  const sourceId = params.get('mvpSource');
  if (!isNonEmptyString(sessionId) || !SOURCE_SET.has(sourceId)) return null;
  return { sessionId, sourceId };
}

/**
 * Dispatches a validated {tree, memories, selectedMemory} read context to the
 * adapter owned by sourceId. Returns the adapter projection verbatim (plus the
 * sourceId it was produced for). Unknown sourceId fails closed.
 */
export function projectAlphaContext(sourceId, readContext) {
  if (!SOURCE_SET.has(sourceId)) {
    throw alphaError('UNKNOWN_SOURCE', `unsupported Productized Alpha source: ${String(sourceId)}`);
  }
  if (readContext === null || typeof readContext !== 'object' || Array.isArray(readContext)) {
    throw alphaError('INVALID_CONTEXT', 'readContext must be a plain object');
  }
  switch (sourceId) {
    case 'SRC064':
      return { sourceId, projection: projectMvp001ContextToSrc064(readContext) };
    case 'SRC058':
      return { sourceId, projection: projectMvp001ContextToSrc058(readContext) };
    case 'SRC056':
      return { sourceId, projection: projectMvp001ContextToSrc056(readContext) };
    case 'SRC057':
      return { sourceId, projection: projectMvp001ContextToSrc057(readContext) };
    case 'SRC060':
      return { sourceId, projection: projectMvp001ContextToSrc060(readContext) };
    default:
      throw alphaError('UNKNOWN_SOURCE', `unsupported Productized Alpha source: ${String(sourceId)}`);
  }
}

/**
 * Bounded async loader: read-client -> read-context -> adapter dispatch.
 * client must implement the MVP001 read-client contract
 * ({getTree, getTreeMemories, getMemory}). Throws the underlying read error
 * unchanged so shell can map HTTP 401/404 / NETWORK / INVALID_RESPONSE to
 * explicit Product states. Never fabricates fallback data.
 */
export async function loadAlphaProjection({ client, treeId, selectedMemoryId = null, sourceId, signal } = {}) {
  if (!SOURCE_SET.has(sourceId)) {
    throw alphaError('UNKNOWN_SOURCE', `unsupported Productized Alpha source: ${String(sourceId)}`);
  }
  const readContext = await loadMvp001ReadContext({ client, treeId, selectedMemoryId, signal });
  return projectAlphaContext(sourceId, readContext);
}

export { searchSrc060Nodes };
