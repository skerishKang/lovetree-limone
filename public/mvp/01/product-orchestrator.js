import {
  MVP001_SOURCE_BY_STEP,
  MVP001_STEPS,
  parseMvp001UrlState,
  serializeMvp001UrlState,
  validateMvp001BridgeEnvelope,
} from './productization-contract.js';

function generateSessionId() {
  return 'frm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export class ProductOrchestrator {
  constructor(shellApi = {}) {
    this.shell = {
      createFrame: shellApi.createFrame || (() => null),
      removeFrame: shellApi.removeFrame || (() => {}),
      updateUrl: shellApi.updateUrl || (() => {}),
      emitError: shellApi.emitError || (() => {}),
    };

    this.context = null;
    this.contextRevision = 0;
    this.activeSourceId = null;
    this.activeFrame = null;
    this.activeFrameWindow = null;
    this.activeFrameSessionId = null;
    this.readySessions = new Map();
  }

  init() {
    const urlContext = parseMvp001UrlState(window.location.search);
    this.context = urlContext;
    this.contextRevision = urlContext.contextRevision || 1;
    return this.context;
  }

  getContext() {
    return this.context;
  }

  getSourceIdForStep(stepId) {
    return MVP001_SOURCE_BY_STEP[stepId] || null;
  }

  getStepIndexForSourceId(sourceId) {
    const stepId = Object.entries(MVP001_SOURCE_BY_STEP).find(([, s]) => s === sourceId)?.[0];
    return stepId ? MVP001_STEPS.indexOf(stepId) : -1;
  }

  mountFrame(stepId, surfaceUrl) {
    const sourceId = this.getSourceIdForStep(stepId);
    if (!sourceId) return null;

    const sessionId = generateSessionId();
    const frame = this.shell.createFrame(surfaceUrl, sessionId, sourceId);
    if (!frame) return null;

    this.activeFrame = frame;
    this.activeFrameWindow = frame.contentWindow;
    this.activeFrameSessionId = sessionId;
    this.activeSourceId = sourceId;

    return { frame, sessionId, sourceId };
  }

  unmountFrame() {
    const frame = this.activeFrame;
    const sessionId = this.activeFrameSessionId;
    const sourceId = this.activeSourceId;

    if (frame && sessionId && sourceId) {
      this.signalDispose(frame, sessionId, sourceId);
    }

    this.activeFrame = null;
    this.activeFrameWindow = null;
    this.activeFrameSessionId = null;
    this.activeSourceId = null;
    this.readySessions.delete(sessionId);
  }

  signalDispose(frame, sessionId, sourceId) {
    try {
      const win = frame.contentWindow;
      if (win && typeof win.postMessage === 'function') {
        win.postMessage(
          {
            protocol: 'lovetree.mvp.bridge',
            protocolVersion: 1,
            mvpId: 'MVP001',
            sourceId,
            frameSessionId: sessionId,
            messageId: 'msg-dispose-' + Date.now(),
            type: 'SOURCE_DISPOSE',
            contextRevision: this.contextRevision,
            payload: {},
          },
          window.location.origin,
        );
      }
    } catch {}
  }

  sendSourceInit(frame, sessionId, sourceId) {
    const projection = { sourceId };
    const permissions = { canRead: true, canCreate: false, canUpdate: false, canDelete: false };

    const initPayload = {
      context: this.context,
      projection,
      permissions,
    };

    try {
      const win = frame.contentWindow;
      if (win && typeof win.postMessage === 'function') {
        win.postMessage(
          {
            protocol: 'lovetree.mvp.bridge',
            protocolVersion: 1,
            mvpId: 'MVP001',
            sourceId,
            frameSessionId: sessionId,
            messageId: 'msg-init-' + Date.now(),
            type: 'SOURCE_INIT',
            contextRevision: this.contextRevision,
            payload: initPayload,
          },
          window.location.origin,
        );
      }
    } catch {}
  }

  handleBridgeMessage(event) {
    const expectations = {
      activeSourceId: this.activeSourceId,
      frameSessionId: this.activeFrameSessionId,
      expectedOrigin: window.location.origin,
      senderOrigin: event.origin,
      senderWindow: event.source,
      activeFrameWindow: this.activeFrameWindow,
    };

    const result = validateMvp001BridgeEnvelope(event.data, expectations);
    if (!result.ok) {
      return { accepted: false, code: result.code };
    }

    const message = result.value;

    if (message.type === 'SOURCE_READY') {
      this.readySessions.set(message.frameSessionId, true);
      if (message.frameSessionId === this.activeFrameSessionId && this.activeFrame) {
        this.sendSourceInit(this.activeFrame, message.frameSessionId, message.sourceId);
      }
      return { accepted: true, type: 'SOURCE_READY' };
    }

    if (message.type === 'TREE_SELECTED') {
      const newTreeId = message.payload.treeId;
      if (newTreeId !== this.context.treeId) {
        this.context.treeId = newTreeId;
        this.context.selectedMemoryId = null;
        this.context.selectedRelationshipId = null;
        this.contextRevision++;
        this.context.contextRevision = this.contextRevision;
        this.updateUrl();
      }
      return { accepted: true, type: 'TREE_SELECTED', context: this.context };
    }

    if (message.type === 'MEMORY_SELECTED') {
      if (!this.context.treeId) {
        return { accepted: false, code: 'ORPHAN_MEMORY_SELECTION' };
      }
      this.context.selectedMemoryId = message.payload.memoryId;
      this.context.selectedRelationshipId = null;
      this.contextRevision++;
      this.context.contextRevision = this.contextRevision;
      this.updateUrl();
      return { accepted: true, type: 'MEMORY_SELECTED', context: this.context };
    }

    if (message.type === 'NAVIGATE') {
      const targetStep = message.payload.targetStep;
      const stepIndex = MVP001_STEPS.indexOf(targetStep);
      if (stepIndex < 0) {
        return { accepted: false, code: 'INVALID_TARGET_STEP' };
      }

      if (message.payload.memoryId !== undefined) {
        if (!this.context.treeId) {
          return { accepted: false, code: 'ORPHAN_MEMORY_IN_NAVIGATE' };
        }
        this.context.selectedMemoryId = message.payload.memoryId;
      }

      this.context.currentStep = targetStep;
      this.contextRevision++;
      this.context.contextRevision = this.contextRevision;
      this.updateUrl();

      return { accepted: true, type: 'NAVIGATE', context: this.context, stepIndex };
    }

    if (message.type === 'ERROR') {
      return { accepted: true, type: 'ERROR', payload: message.payload };
    }

    return { accepted: false, code: 'UNKNOWN_TYPE' };
  }

  updateUrl() {
    const url = serializeMvp001UrlState(this.context);
    try {
      const current = new URL(window.location.href);
      const newUrl = new URL(url, current.origin);
      if (current.search !== newUrl.search) {
        window.history.pushState({ ...this.context }, '', newUrl.toString());
      }
    } catch {}
  }

  onPopState() {
    const restored = parseMvp001UrlState(window.location.search);
    this.context = restored;
    this.contextRevision = restored.contextRevision || 1;
    const stepIndex = MVP001_STEPS.indexOf(restored.currentStep);
    return { stepIndex: stepIndex >= 0 ? stepIndex : 0, context: this.context };
  }

  isSourceReadyForSession(sessionId) {
    return this.readySessions.has(sessionId);
  }
}
