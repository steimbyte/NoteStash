/**
 * Bridge Module - Coordinates the modular event bus and chrome API
 * for the NoteStash content script. The original dynamic-loader methods
 * (load/call/preload/isAvailable) were removed once the new index.mjs
 * orchestrator switched to static imports.
 */

class ModuleBridge {
  constructor() {
    this.eventBus = null;
    this.chromeApi = null;
    this.initialized = false;
  }

  async init({ eventBus, chromeApi }) {
    this.eventBus = eventBus;
    this.chromeApi = chromeApi;
    this.initialized = true;

    if (typeof console !== 'undefined') {
      console.log('[NoteStash Bridge] Initialized');
    }
    this.eventBus?.emit('bridge:initialized');
  }

  destroy() {
    this.eventBus = null;
    this.chromeApi = null;
    this.initialized = false;
  }
}

const bridge = new ModuleBridge();

if (typeof window !== 'undefined') {
  window.NoteStashBridge = bridge;
}

export default bridge;
export { ModuleBridge };
