/**
 * Element Registry Module - High-performance DOM element caching with automatic GC
 * 
 * Features:
 * - WeakRef-based element storage (allows garbage collection)
 * - Automatic cleanup of GC'd references
 * - Batch operations for performance
 * - Type-based element categorization
 */

export const createElementRegistry = ({ bridge, eventBus, chromeApi }) => {
  const registry = {
    floatingBtns: new Set(),
    secondaryBtns: new Set(),
    arrows: new Set(),
    popups: new Set(),
    modals: new Set(),
    sessionViewers: new Set(),
    aiCleaners: new Set(),
    accentTexts: new Set(),
    accentLinks: new Set(),
    accentBorders: new Set(),
    tabBtns: new Set(),
    actionBtns: new Set()
  };

  const validTypes = Object.keys(registry);

  /**
   * Initialize registry
   */
  function init() {
    startCleanupInterval();
    eventBus?.emit('registry:initialized');
  }

  /**
   * Register an element for fast access
   * @param {string} type - Registry category
   * @param {HTMLElement} element - Element to register
   * @returns {boolean} Success
   */
  function register(type, element) {
    if (!registry[type]) {
      console.warn(`[ElementRegistry] Unknown registry type: ${type}`);
      return false;
    }

    if (!element || (!(element instanceof HTMLElement) && !(element instanceof SVGElement))) {
      console.warn(`[ElementRegistry] Invalid element provided for type: ${type}`);
      return false;
    }

    registry[type].add(new WeakRef(element));
    return true;
  }

  /**
   * Register multiple elements at once
   * @param {string} type - Registry category
   * @param {HTMLElement[]} elements - Elements to register
   * @returns {number} Number of elements registered
   */
  function registerAll(type, elements) {
    if (!registry[type]) {
      console.warn(`[ElementRegistry] Unknown registry type: ${type}`);
      return 0;
    }

    let count = 0;
    for (const element of elements) {
      if (element && element instanceof HTMLElement) {
        registry[type].add(new WeakRef(element));
        count++;
      }
    }
    return count;
  }

  /**
   * Get all valid (non-GC'd) elements of a type
   * @param {string} type - Registry category
   * @returns {HTMLElement[]} Array of valid elements
   */
  function getAll(type) {
    if (!registry[type]) {
      return [];
    }

    const valid = [];
    const toDelete = [];

    for (const ref of registry[type]) {
      const el = ref.deref();
      if (el && el.isConnected) {
        valid.push(el);
      } else {
        toDelete.push(ref);
      }
    }

    toDelete.forEach(ref => registry[type].delete(ref));

    return valid;
  }

  /**
   * Get first valid element of a type
   * @param {string} type - Registry category
   * @returns {HTMLElement|null}
   */
  function getFirst(type) {
    const all = getAll(type);
    return all[0] || null;
  }

  /**
   * Check if any elements exist for a type
   * @param {string} type - Registry category
   * @returns {boolean}
   */
  function hasAny(type) {
    return getAll(type).length > 0;
  }

  /**
   * Get count of valid elements
   * @param {string} type - Registry category
   * @returns {number}
   */
  function count(type) {
    return getAll(type).length;
  }

  /**
   * Batch update all elements of a type
   * @param {string} type - Registry category
   * @param {Function} updaterFn - Function to apply to each element
   * @returns {number} Number of elements updated
   */
  function updateAll(type, updaterFn) {
    const elements = getAll(type);
    elements.forEach(updaterFn);
    return elements.length;
  }

  /**
   * Remove a specific element from registry
   * @param {string} type - Registry category
   * @param {HTMLElement} element - Element to remove
   * @returns {boolean} Success
   */
  function remove(type, element) {
    if (!registry[type]) {
      return false;
    }

    for (const ref of registry[type]) {
      const el = ref.deref();
      if (el === element) {
        registry[type].delete(ref);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all elements of a type
   * @param {string} type - Registry category
   */
  function clearType(type) {
    if (registry[type]) {
      registry[type].clear();
    }
  }

  /**
   * Clear all registries (useful for full cleanup)
   */
  function clear() {
    Object.keys(registry).forEach(key => {
      registry[key].clear();
    });
  }

  /**
   * Cleanup GC'd references for a specific type
   * @param {string} type - Registry category
   * @returns {number} Number of references removed
   */
  function cleanup(type) {
    if (!registry[type]) {
      return 0;
    }

    const toDelete = [];
    for (const ref of registry[type]) {
      const el = ref.deref();
      if (!el || !el.isConnected) {
        toDelete.push(ref);
      }
    }

    toDelete.forEach(ref => registry[type].delete(ref));
    return toDelete.length;
  }

  /**
   * Cleanup all registries
   * @returns {Object} Cleanup stats by type
   */
  function cleanupAll() {
    const stats = {};
    for (const type of validTypes) {
      stats[type] = cleanup(type);
    }
    return stats;
  }

  /**
   * Get registry statistics
   * @returns {Object} Stats by type
   */
  function getStats() {
    const stats = {};
    for (const type of validTypes) {
      let totalRefs = 0;
      let validRefs = 0;
      
      for (const ref of registry[type]) {
        totalRefs++;
        const el = ref.deref();
        if (el && el.isConnected) {
          validRefs++;
        }
      }
      
      stats[type] = {
        total: totalRefs,
        valid: validRefs,
        gcPending: totalRefs - validRefs
      };
    }
    return stats;
  }

  /**
   * Start automatic cleanup interval
   */
  let cleanupInterval = null;
  
  function startCleanupInterval(interval = 30000) {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    
    cleanupInterval = setInterval(() => {
      const stats = cleanupAll();
      const totalCleaned = Object.values(stats).reduce((a, b) => a + b, 0);
      
      if (totalCleaned > 0) {
        eventBus?.emit('registry:cleaned', { stats, total: totalCleaned });
      }
    }, interval);
  }

  /**
   * Stop automatic cleanup
   */
  function stopCleanupInterval() {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }

  /**
   * Find elements by custom predicate
   * @param {string} type - Registry category
   * @param {Function} predicate - Test function
   * @returns {HTMLElement[]}
   */
  function find(type, predicate) {
    return getAll(type).filter(predicate);
  }

  /**
   * Get valid registry types
   * @returns {string[]}
   */
  function getValidTypes() {
    return [...validTypes];
  }

  /**
   * Destroy registry and cleanup
   */
  function destroy() {
    stopCleanupInterval();
    clear();
    eventBus?.emit('registry:destroyed');
  }

  return {
    init,
    register,
    registerAll,
    getAll,
    getFirst,
    hasAny,
    count,
    updateAll,
    remove,
    clearType,
    clear,
    cleanup,
    cleanupAll,
    getStats,
    startCleanupInterval,
    stopCleanupInterval,
    find,
    getValidTypes,
    destroy
  };
};
