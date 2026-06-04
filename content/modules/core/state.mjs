/**
 * State Module - Reactive state management with auto-sync
 * 
 * Features:
 * - ES6 Proxy-based reactivity
 * - Automatic chrome.storage synchronization
 * - Change detection and event emission
 * - State persistence across sessions
 */

export const createState = ({ bridge, eventBus, chromeApi }) => {
  const internalState = {
    isDebugEnabled: false,
    isDragging: false,
    isRecording: false,
    clipping: false,
    isExpanded: false,
    fullContentLoaded: false,
    
    theme: {
      accentRgb: '139, 0, 0',
      accentGradient: 'linear-gradient(135deg, rgba(139, 0, 0, 0.95) 0%, rgba(139, 0, 0, 0.75) 100%)'
    },
    
    lastContentHash: '',
    recordingClipCount: 0,
    lastCaptureTime: 0,
    autoSaveInterval: null,
    
    allClips: [],
    filter: '',
    sessionImages: {},
    
    processingOverlay: null,
    
    startX: 0,
    startY: 0,
    startRight: 0,
    startBottom: 0,
    
    isHovering: false,
    hoverTimeout: null,
    
    renderedCards: new Map(),
    visibleRange: { start: 0, end: 0 },
    
    cleanedContent: '',
    originalContent: '',
    imageRefs: [],
    
    referencedImages: new Set()
  };

  const persistentKeys = new Set([
    'isRecording',
    'recordingClipCount',
    'lastCaptureTime'
  ]);

  let lastSyncTime = 0;
  let syncDebounceTimer = null;
  const SYNC_DEBOUNCE = 500; // ms

  /**
   * Create reactive proxy
   */
  function createReactiveProxy() {
    return new Proxy(internalState, {
      get(target, prop) {
        return target[prop];
      },
      
      set(target, prop, value) {
        const oldValue = target[prop];
        
        if (oldValue !== value) {
          target[prop] = value;
          
          eventBus?.emit('state:changed', {
            key: prop,
            value,
            oldValue,
            timestamp: Date.now()
          });
          
          if (persistentKeys.has(prop)) {
            queueSync(prop, value);
          }
        }
        
        return true;
      },
      
      deleteProperty(target, prop) {
        const hadKey = prop in target;
        delete target[prop];
        
        if (hadKey) {
          eventBus?.emit('state:changed', {
            key: prop,
            value: undefined,
            oldValue: undefined,
            timestamp: Date.now()
          });
        }
        
        return true;
      }
    });
  }

  const state = createReactiveProxy();

  /**
   * Initialize state module
   */
  async function init() {
    await loadPersistedState();
    eventBus?.emit('state:initialized', getState());
  }

  /**
   * Load persisted state from chrome.storage
   */
  async function loadPersistedState() {
    try {
      const data = await chromeApi?.storage?.get([...persistentKeys]) || {};
      
      for (const [key, value] of Object.entries(data)) {
        if (persistentKeys.has(key) && value !== undefined) {
          internalState[key] = value;
        }
      }
      
      eventBus?.emit('state:synced', { direction: 'load', keys: Object.keys(data) });
    } catch (error) {
      console.error('[State] Failed to load persisted state:', error);
    }
  }

  /**
   * Queue state sync with debouncing
   */
  function queueSync(key, value) {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }
    
    syncDebounceTimer = setTimeout(() => {
      syncToStorage();
    }, SYNC_DEBOUNCE);
  }

  /**
   * Sync persistent state to chrome.storage
   */
  async function syncToStorage() {
    try {
      const dataToSync = {};
      
      for (const key of persistentKeys) {
        dataToSync[key] = internalState[key];
      }
      
      await chromeApi?.storage?.set(dataToSync);
      lastSyncTime = Date.now();
      
      eventBus?.emit('state:synced', { direction: 'save', keys: Object.keys(dataToSync) });
    } catch (error) {
      console.error('[State] Failed to sync to storage:', error);
    }
  }

  /**
   * Get current state (full or by key)
   */
  function getState(key) {
    if (key) {
      return internalState[key];
    }
    return { ...internalState };
  }

  /**
   * Get a specific state value
   */
  function get(key, defaultValue) {
    return internalState[key] !== undefined ? internalState[key] : defaultValue;
  }

  /**
   * Set a state value
   */
  function set(key, value) {
    state[key] = value;
  }

  /**
   * Update multiple state values at once
   */
  function batchUpdate(updates) {
    for (const [key, value] of Object.entries(updates)) {
      state[key] = value;
    }
  }

  /**
   * Toggle a boolean state value
   */
  function toggle(key) {
    const current = internalState[key];
    if (typeof current === 'boolean') {
      state[key] = !current;
      return state[key];
    }
    return undefined;
  }

  /**
   * Increment a numeric state value
   */
  function increment(key, amount = 1) {
    const current = internalState[key] || 0;
    state[key] = current + amount;
    return state[key];
  }

  /**
   * Decrement a numeric state value
   */
  function decrement(key, amount = 1) {
    const current = internalState[key] || 0;
    state[key] = Math.max(0, current - amount);
    return state[key];
  }

  /**
   * Add item to array state
   */
  function push(key, item) {
    const current = internalState[key] || [];
    if (Array.isArray(current)) {
      state[key] = [...current, item];
      return state[key].length;
    }
    return 0;
  }

  /**
   * Remove item from array state
   */
  function remove(key, itemOrIndex) {
    const current = internalState[key] || [];
    if (Array.isArray(current)) {
      if (typeof itemOrIndex === 'number') {
        state[key] = current.filter((_, i) => i !== itemOrIndex);
      } else {
        state[key] = current.filter(item => item !== itemOrIndex);
      }
      return state[key].length;
    }
    return 0;
  }

  /**
   * Reset state to defaults
   */
  function reset(keys) {
    const defaults = {
      isDragging: false,
      clipping: false,
      isExpanded: false,
      fullContentLoaded: false,
      lastContentHash: '',
      filter: '',
      isHovering: false,
      hoverTimeout: null,
      cleanedContent: '',
      originalContent: '',
      imageRefs: []
    };
    
    if (keys) {
      for (const key of keys) {
        if (defaults[key] !== undefined) {
          state[key] = defaults[key];
        }
      }
    } else {
      for (const [key, value] of Object.entries(defaults)) {
        if (!persistentKeys.has(key)) {
          state[key] = value;
        }
      }
    }
  }

  /**
   * Subscribe to state changes
   */
  function subscribe(key, callback) {
    return eventBus?.on('state:changed', (data) => {
      if (!key || data.key === key) {
        callback(data.value, data.oldValue, data.key);
      }
    });
  }

  /**
   * Watch for specific state changes
   */
  function watch(key, callback) {
    return subscribe(key, callback);
  }

  /**
   * Create a computed value that updates when dependencies change
   */
  function computed(deps, computeFn) {
    let lastValue;
    
    const update = () => {
      const depValues = deps.map(dep => internalState[dep]);
      lastValue = computeFn(...depValues);
      return lastValue;
    };
    
    const unsubscribers = deps.map(dep => 
      eventBus?.on('state:changed', (data) => {
        if (data.key === dep) {
          update();
        }
      })
    );
    
    update();
    
    return {
      get value() {
        return lastValue;
      },
      destroy() {
        unsubscribers.forEach(unsub => unsub?.());
      }
    };
  }

  /**
   * Force immediate sync to storage
   */
  async function forceSync() {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
    await syncToStorage();
  }

  /**
   * Register a key for auto-persistence
   */
  function registerPersistentKey(key) {
    persistentKeys.add(key);
  }

  /**
   * Unregister a key from auto-persistence
   */
  function unregisterPersistentKey(key) {
    persistentKeys.delete(key);
  }

  /**
   * Get all persistent keys
   */
  function getPersistentKeys() {
    return [...persistentKeys];
  }

  /**
   * Destroy state module
   */
  function destroy() {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }
    
    syncToStorage();
  }

  return {
    state,
    
    init,
    loadPersistedState,
    syncToStorage,
    forceSync,
    
    getState,
    get,
    set,
    batchUpdate,
    
    toggle,
    increment,
    decrement,
    push,
    remove,
    reset,
    
    subscribe,
    watch,
    computed,
    
    registerPersistentKey,
    unregisterPersistentKey,
    getPersistentKeys,
    
    destroy
  };
};
