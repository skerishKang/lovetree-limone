const PROTOCOL = 'lovetree.mvp.bridge';
const PROTOCOL_VERSION = 1;
const MVP_ID = 'MVP001';

export const MVP001_BRIDGE_PROTOCOL = PROTOCOL;
export const MVP001_BRIDGE_PROTOCOL_VERSION = PROTOCOL_VERSION;
export const MVP001_ID = MVP_ID;

export const MVP001_STEPS = Object.freeze(['entry', 'board', 'relationships', 'memory', 'explore']);
export const MVP001_SOURCE_BY_STEP = Object.freeze({
  entry: 'SRC064',
  board: 'SRC058',
  relationships: 'SRC056',
  memory: 'SRC057',
  explore: 'SRC060',
});
export const MVP001_SOURCE_IDS = Object.freeze(Object.values(MVP001_SOURCE_BY_STEP));

export const MVP001_READ_ONLY_BRIDGE_TYPES = Object.freeze([
  'SOURCE_READY',
  'SOURCE_INIT',
  'SOURCE_DISPOSE',
  'TREE_SELECTED',
  'MEMORY_SELECTED',
  'RELATIONSHIP_SELECTED',
  'NAVIGATE',
  'ERROR',
]);

export const MVP001_FUTURE_WRITE_BRIDGE_TYPES = Object.freeze([
  'DATA_UPDATED',
  'CREATE_MEMORY_REQUEST',
  'UPDATE_MEMORY_REQUEST',
  'SET_CONNECTION_REQUEST',
  'UPDATE_PRESENTATION_REQUEST',
]);

export const MVP001_EVENT_TYPES_BY_SOURCE = Object.freeze({
  SRC064: Object.freeze(['SOURCE_READY', 'SOURCE_INIT', 'SOURCE_DISPOSE', 'TREE_SELECTED', 'MEMORY_SELECTED', 'NAVIGATE', 'ERROR']),
  SRC058: Object.freeze(['SOURCE_READY', 'SOURCE_INIT', 'SOURCE_DISPOSE', 'MEMORY_SELECTED', 'NAVIGATE', 'ERROR']),
  SRC056: Object.freeze(['SOURCE_READY', 'SOURCE_INIT', 'SOURCE_DISPOSE', 'MEMORY_SELECTED', 'RELATIONSHIP_SELECTED', 'NAVIGATE', 'ERROR']),
  SRC057: Object.freeze(['SOURCE_READY', 'SOURCE_INIT', 'SOURCE_DISPOSE', 'MEMORY_SELECTED', 'NAVIGATE', 'ERROR']),
  SRC060: Object.freeze(['SOURCE_READY', 'SOURCE_INIT', 'SOURCE_DISPOSE', 'MEMORY_SELECTED', 'RELATIONSHIP_SELECTED', 'NAVIGATE', 'ERROR']),
});

const STEP_SET = new Set(MVP001_STEPS);
const SOURCE_SET = new Set(MVP001_SOURCE_IDS);
const READ_ONLY_TYPE_SET = new Set(MVP001_READ_ONLY_BRIDGE_TYPES);
const SELECTION_REASONS = new Set(['user', 'path', 'resume', 'first', 'search', 'next']);
const VIEWER_STATES = new Set(['unknown', 'loading', 'signed-in', 'signed-out']);
const SECRET_KEY_PATTERN = /(?:^|[_-])(authorization|bearer|token|secret|password|database[_-]?url|api[_-]?key)(?:$|[_-])/i;
const BEARER_VALUE_PATTERN = /^\s*bearer\s+/i;
const DATABASE_URL_PATTERN = /^\s*postgres(?:ql)?:\/\//i;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9._~:-]{1,128}$/;
const MESSAGE_ID_PATTERN = /^[A-Za-z0-9._~:-]{1,160}$/;
const BOUNDED_TEXT_PATTERN = /^[^\u0000-\u001f\u007f]{1,160}$/u;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactKeys(value, required, optional = []) {
  if (!isPlainObject(value)) return false;
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  if (required.some((key) => !(key in value))) return false;
  return keys.every((key) => allowed.has(key));
}

function isOpaqueId(value) {
  return typeof value === 'string' && OPAQUE_ID_PATTERN.test(value);
}

function isMessageId(value) {
  return typeof value === 'string' && MESSAGE_ID_PATTERN.test(value);
}

function isBoundedText(value, max = 160) {
  return typeof value === 'string' && value.length <= max && BOUNDED_TEXT_PATTERN.test(value);
}

function containsSecretMaterial(value, seen = new Set()) {
  if (typeof value === 'string') {
    return BEARER_VALUE_PATTERN.test(value) || DATABASE_URL_PATTERN.test(value);
  }
  if (value === null || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) return true;
    if (containsSecretMaterial(child, seen)) return true;
  }
  return false;
}

export function createMvp001Context(overrides = {}) {
  const base = {
    schemaVersion: 1,
    mvpId: MVP_ID,
    contextRevision: 1,
    currentStep: 'entry',
    treeId: null,
    selectedMemoryId: null,
    selectedRelationshipId: null,
    navigationOrigin: 'shell',
    viewer: {
      state: 'unknown',
      uid: null,
    },
  };
  return {
    ...base,
    ...overrides,
    viewer: {
      ...base.viewer,
      ...(isPlainObject(overrides.viewer) ? overrides.viewer : {}),
    },
  };
}

export function validateMvp001Context(context) {
  const required = [
    'schemaVersion',
    'mvpId',
    'contextRevision',
    'currentStep',
    'treeId',
    'selectedMemoryId',
    'selectedRelationshipId',
    'navigationOrigin',
    'viewer',
  ];
  if (!hasExactKeys(context, required)) return { ok: false, code: 'CONTEXT_SHAPE' };
  if (context.schemaVersion !== 1 || context.mvpId !== MVP_ID) return { ok: false, code: 'CONTEXT_VERSION' };
  if (!Number.isInteger(context.contextRevision) || context.contextRevision < 1) return { ok: false, code: 'CONTEXT_REVISION' };
  if (!STEP_SET.has(context.currentStep)) return { ok: false, code: 'CONTEXT_STEP' };
  if (context.treeId !== null && !isOpaqueId(context.treeId)) return { ok: false, code: 'CONTEXT_TREE_ID' };
  if (context.selectedMemoryId !== null && !isOpaqueId(context.selectedMemoryId)) return { ok: false, code: 'CONTEXT_MEMORY_ID' };
  if (context.selectedRelationshipId !== null && !isOpaqueId(context.selectedRelationshipId)) return { ok: false, code: 'CONTEXT_RELATIONSHIP_ID' };
  if (!context.treeId && (context.selectedMemoryId || context.selectedRelationshipId)) return { ok: false, code: 'CONTEXT_ORPHAN_SELECTION' };
  if (!isBoundedText(context.navigationOrigin)) return { ok: false, code: 'CONTEXT_NAVIGATION_ORIGIN' };
  if (!hasExactKeys(context.viewer, ['state', 'uid'])) return { ok: false, code: 'CONTEXT_VIEWER_SHAPE' };
  if (!VIEWER_STATES.has(context.viewer.state)) return { ok: false, code: 'CONTEXT_VIEWER_STATE' };
  if (context.viewer.uid !== null && !isOpaqueId(context.viewer.uid)) return { ok: false, code: 'CONTEXT_VIEWER_UID' };
  if (containsSecretMaterial(context)) return { ok: false, code: 'CONTEXT_SECRET_MATERIAL' };
  return { ok: true, value: context };
}

function searchParamsFrom(input) {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  if (input instanceof URL) return new URLSearchParams(input.searchParams);
  if (typeof input !== 'string') return new URLSearchParams();
  const text = input.trim();
  if (/^https?:\/\//i.test(text)) return new URL(text).searchParams;
  return new URLSearchParams(text.startsWith('?') ? text.slice(1) : text);
}

function cleanUrlId(value) {
  return isOpaqueId(value) ? value : null;
}

export function parseMvp001UrlState(input) {
  const params = searchParamsFrom(input);
  const step = STEP_SET.has(params.get('step')) ? params.get('step') : 'entry';
  const treeId = cleanUrlId(params.get('tree'));
  const selectedMemoryId = treeId ? cleanUrlId(params.get('memory')) : null;
  const selectedRelationshipId = treeId ? cleanUrlId(params.get('relationship')) : null;
  return createMvp001Context({
    currentStep: step,
    treeId,
    selectedMemoryId,
    selectedRelationshipId,
    navigationOrigin: 'url',
  });
}

export function serializeMvp001UrlState(context, basePath = '/mvp/01') {
  const params = new URLSearchParams();
  const step = STEP_SET.has(context?.currentStep) ? context.currentStep : 'entry';
  const treeId = cleanUrlId(context?.treeId);
  const memoryId = treeId ? cleanUrlId(context?.selectedMemoryId) : null;
  const relationshipId = treeId ? cleanUrlId(context?.selectedRelationshipId) : null;
  params.set('step', step);
  if (treeId) params.set('tree', treeId);
  if (memoryId) params.set('memory', memoryId);
  if (relationshipId) params.set('relationship', relationshipId);
  return `${basePath}?${params.toString()}`;
}

function validatePermissions(value) {
  if (!hasExactKeys(value, ['canRead', 'canCreate', 'canUpdate', 'canDelete'])) return false;
  return ['canRead', 'canCreate', 'canUpdate', 'canDelete'].every((key) => typeof value[key] === 'boolean');
}

function validatePayload(type, payload) {
  switch (type) {
    case 'SOURCE_READY':
      return hasExactKeys(payload, ['capabilities', 'sourceRuntimeVersion'])
        && Array.isArray(payload.capabilities)
        && payload.capabilities.length <= 32
        && payload.capabilities.every((capability) => isBoundedText(capability, 80))
        && isBoundedText(payload.sourceRuntimeVersion, 80);
    case 'SOURCE_INIT':
      return hasExactKeys(payload, ['context', 'projection', 'permissions'])
        && validateMvp001Context(payload.context).ok
        && isPlainObject(payload.projection)
        && validatePermissions(payload.permissions);
    case 'SOURCE_DISPOSE':
      return hasExactKeys(payload, []);
    case 'TREE_SELECTED':
      return hasExactKeys(payload, ['treeId']) && isOpaqueId(payload.treeId);
    case 'MEMORY_SELECTED':
      return hasExactKeys(payload, ['memoryId', 'selectionReason'])
        && isOpaqueId(payload.memoryId)
        && SELECTION_REASONS.has(payload.selectionReason);
    case 'RELATIONSHIP_SELECTED':
      return hasExactKeys(payload, ['relationshipId', 'fromMemoryId', 'toMemoryId'])
        && isOpaqueId(payload.relationshipId)
        && isOpaqueId(payload.fromMemoryId)
        && isOpaqueId(payload.toMemoryId);
    case 'NAVIGATE':
      return hasExactKeys(payload, ['targetStep', 'origin'], ['memoryId'])
        && STEP_SET.has(payload.targetStep)
        && (payload.memoryId === undefined || isOpaqueId(payload.memoryId))
        && isBoundedText(payload.origin);
    case 'ERROR':
      return hasExactKeys(payload, ['code', 'recoverable', 'operation'], ['requestId'])
        && /^[A-Z][A-Z0-9_]{1,63}$/.test(payload.code)
        && typeof payload.recoverable === 'boolean'
        && isBoundedText(payload.operation, 80)
        && (payload.requestId === undefined || isMessageId(payload.requestId));
    default:
      return false;
  }
}

export function validateMvp001BridgeEnvelope(message, expectations = {}) {
  const required = [
    'protocol',
    'protocolVersion',
    'mvpId',
    'sourceId',
    'frameSessionId',
    'messageId',
    'type',
    'contextRevision',
    'payload',
  ];
  if (!hasExactKeys(message, required)) return { ok: false, code: 'ENVELOPE_SHAPE' };
  if (message.protocol !== PROTOCOL) return { ok: false, code: 'PROTOCOL' };
  if (message.protocolVersion !== PROTOCOL_VERSION) return { ok: false, code: 'PROTOCOL_VERSION' };
  if (message.mvpId !== MVP_ID) return { ok: false, code: 'MVP_ID' };
  if (!SOURCE_SET.has(message.sourceId)) return { ok: false, code: 'SOURCE_ID' };
  if (!isMessageId(message.frameSessionId)) return { ok: false, code: 'FRAME_SESSION_ID' };
  if (!isMessageId(message.messageId)) return { ok: false, code: 'MESSAGE_ID' };
  if (!Number.isInteger(message.contextRevision) || message.contextRevision < 0) return { ok: false, code: 'CONTEXT_REVISION' };

  const allowedTypes = expectations.allowedTypes
    ? new Set(expectations.allowedTypes)
    : READ_ONLY_TYPE_SET;
  if (!allowedTypes.has(message.type)) return { ok: false, code: 'MESSAGE_TYPE' };
  if (!(MVP001_EVENT_TYPES_BY_SOURCE[message.sourceId] ?? []).includes(message.type)) return { ok: false, code: 'SOURCE_MESSAGE_TYPE' };
  if (!validatePayload(message.type, message.payload)) return { ok: false, code: 'PAYLOAD' };
  if (containsSecretMaterial(message.payload)) return { ok: false, code: 'SECRET_MATERIAL' };

  if (expectations.activeSourceId !== undefined && message.sourceId !== expectations.activeSourceId) {
    return { ok: false, code: 'ACTIVE_SOURCE' };
  }
  if (expectations.frameSessionId !== undefined && message.frameSessionId !== expectations.frameSessionId) {
    return { ok: false, code: 'STALE_FRAME_SESSION' };
  }
  if (expectations.expectedOrigin !== undefined && expectations.senderOrigin !== expectations.expectedOrigin) {
    return { ok: false, code: 'ORIGIN' };
  }
  if (expectations.activeFrameWindow !== undefined && expectations.senderWindow !== expectations.activeFrameWindow) {
    return { ok: false, code: 'SENDER_WINDOW' };
  }
  return { ok: true, value: message };
}
