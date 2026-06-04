/**
 * Event Bus Module - Type-safe event system for decoupled communication
 * 
 * Features:
 * - Type-safe event names and payloads
 * - Async event handlers
 * - Wildcard subscriptions
 * - One-time listeners
 * - Event history for debugging
 */

class EventBus {
  constructor(options = {}) {
    this.listeners = new Map();
    this.wildcards = [];
    this.history = [];
    this.maxHistory = options.maxHistory || 100;
    this.debug = options.debug || false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports wildcards: 'user.*', '*.update')
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    if (event.includes('*')) {
      this.wildcards.push({ pattern: event, handler });
      return () => this._removeWildcard(event, handler);
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(handler);

    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    const onceHandler = (...args) => {
      this.off(event, onceHandler);
      return handler(...args);
    };
    return this.on(event, onceHandler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Handler to remove
   */
  off(event, handler) {
    if (event.includes('*')) {
      this._removeWildcard(event, handler);
      return;
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event payload
   * @returns {Promise<Array>} Results from all handlers
   */
  async emit(event, data) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    const timestamp = Date.now();
    
    this._addToHistory(event, data, timestamp);

    if (this.debug) {
      console.log(`[EventBus] ${event}`, data);
    }

    const results = [];
    const errors = [];

    const handlers = this.listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        const result = await handler(data, { event, timestamp });
        results.push(result);
      } catch (error) {
        errors.push({ handler, error });
        console.error(`[EventBus] Error in handler for ${event}:`, error);
      }
    }

    for (const { pattern, handler } of this.wildcards) {
      if (this._matchWildcard(pattern, event)) {
        try {
          const result = await handler(data, { event, pattern, timestamp });
          results.push(result);
        } catch (error) {
          errors.push({ handler, error });
          console.error(`[EventBus] Error in wildcard handler for ${event}:`, error);
        }
      }
    }

    if (errors.length > 0) {
      this.emit('eventbus:handler-error', { event, errors, timestamp });
    }

    return results;
  }

  /**
   * Synchronous emit (for non-async handlers)
   * @param {string} event - Event name
   * @param {*} data - Event payload
   * @returns {Array} Results from all handlers
   */
  emitSync(event, data) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    const timestamp = Date.now();
    this._addToHistory(event, data, timestamp);

    if (this.debug) {
      console.log(`[EventBus:Sync] ${event}`, data);
    }

    const results = [];
    const errors = [];

    const handlers = this.listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        const result = handler(data, { event, timestamp });
        results.push(result);
      } catch (error) {
        errors.push({ handler, error });
        console.error(`[EventBus:Sync] Error in handler for ${event}:`, error);
      }
    }

    for (const { pattern, handler } of this.wildcards) {
      if (this._matchWildcard(pattern, event)) {
        try {
          const result = handler(data, { event, pattern, timestamp });
          results.push(result);
        } catch (error) {
          errors.push({ handler, error });
          console.error(`[EventBus:Sync] Error in wildcard handler for ${event}:`, error);
        }
      }
    }

    if (errors.length > 0) {
      this.emitSync('eventbus:handler-error', { event, errors, timestamp });
    }

    return results;
  }

  /**
   * Get all listeners for an event
   * @param {string} event - Event name
   * @returns {Array} Array of handlers
   */
  listeners(event) {
    return this.listeners.get(event) || [];
  }

  /**
   * Check if event has listeners
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasListeners(event) {
    return (this.listeners.get(event)?.length || 0) > 0;
  }

  /**
   * Get event history
   * @param {string} eventFilter - Optional event name filter
   * @param {number} limit - Max number of events to return
   * @returns {Array} Event history
   */
  getHistory(eventFilter = null, limit = 50) {
    let history = this.history;
    if (eventFilter) {
      history = history.filter(h => h.event === eventFilter);
    }
    return history.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.clear();
    this.wildcards = [];
  }

  _addToHistory(event, data, timestamp) {
    this.history.push({ event, data, timestamp });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  _removeWildcard(pattern, handler) {
    const index = this.wildcards.findIndex(
      w => w.pattern === pattern && w.handler === handler
    );
    if (index > -1) {
      this.wildcards.splice(index, 1);
    }
  }

  _matchWildcard(pattern, event) {
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    );
    return regex.test(event);
  }
}

const EventTypes = {
  BRIDGE: {
    INITIALIZED: 'bridge:initialized',
    MODULE_LOADED: 'bridge:module-loaded',
    MODULE_ERROR: 'bridge:module-error',
    CALL_ERROR: 'bridge:call-error'
  },
  
  CONFIG: {
    THEME_CHANGED: 'config:theme-changed',
    SETTINGS_LOADED: 'config:settings-loaded',
    SETTINGS_SAVED: 'config:settings-saved'
  },
  
  STATE: {
    CHANGED: 'state:changed',
    SYNCED: 'state:synced'
  },
  
  CLIP: {
    CAPTURED: 'clip:captured',
    DELETED: 'clip:deleted',
    UPDATED: 'clip:updated'
  },
  
  SESSION: {
    CREATED: 'session:created',
    SWITCHED: 'session:switched',
    DELETED: 'session:deleted',
    RENAMED: 'session:renamed'
  },
  
  RECORDING: {
    STARTED: 'recording:started',
    STOPPED: 'recording:stopped',
    AUTO_CAPTURED: 'recording:auto-captured'
  },
  
  UI: {
    POPUP_OPENED: 'ui:popup-opened',
    POPUP_CLOSED: 'ui:popup-closed',
    CLEANER_OPENED: 'ui:cleaner-opened',
    CLEANER_CLOSED: 'ui:cleaner-closed',
    TOAST_SHOWN: 'ui:toast-shown'
  }
};

const eventBus = new EventBus({ debug: false });

if (typeof window !== 'undefined') {
  window.NoteStashEvents = eventBus;
  window.NoteStashEventTypes = EventTypes;
}

export default eventBus;
export { EventBus, EventTypes };
