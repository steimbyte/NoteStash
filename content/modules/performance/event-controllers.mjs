/**
 * Event Controllers Module - Centralized event listener management
 * 
 * Features:
 * - AbortController-based event management
 * - Automatic cleanup on component removal
 * - Scoped event controllers for different contexts
 * - Memory leak prevention
 */

export const createEventControllers = ({ bridge, eventBus, chromeApi }) => {
  const controllers = {
    popup: null,
    recording: null,
    cards: new Map(), // cardId -> AbortController
    global: null,
    cleanup: null
  };

  /**
   * Initialize event controllers
   */
  function init() {
    controllers.global = new AbortController();
    eventBus?.emit('event-controllers:initialized');
  }

  /**
   * Create a new managed event controller
   * @param {string} type - Controller type ('popup', 'recording', 'global', etc.)
   * @returns {AbortController} The created controller
   */
  function create(type) {
    if (controllers[type] && controllers[type] instanceof AbortController) {
      controllers[type].abort();
    }

    const controller = new AbortController();
    controllers[type] = controller;

    controller.signal.addEventListener('abort', () => {
      eventBus?.emit('event-controller:aborted', { type });
    });

    return controller;
  }

  /**
   * Add event listener with automatic controller management
   * @param {string} controllerType - Type of controller to use
   * @param {EventTarget} target - Element/window/document to listen on
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - addEventListener options
   */
  function addListener(controllerType, target, event, handler, options = {}) {
    let controller;

    if (controllerType === 'cards') {
      throw new Error('Use addCardListener for card-specific events');
    }

    if (!controllers[controllerType]) {
      controller = create(controllerType);
    } else {
      controller = controllers[controllerType];
    }

    target.addEventListener(event, handler, {
      ...options,
      signal: controller.signal
    });
  }

  /**
   * Add listener for a specific card
   * @param {string} cardId - Unique card identifier
   * @param {EventTarget} target - Element to listen on
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - addEventListener options
   */
  function addCardListener(cardId, target, event, handler, options = {}) {
    if (!controllers.cards.has(cardId)) {
      controllers.cards.set(cardId, new AbortController());
    }

    const controller = controllers.cards.get(cardId);

    target.addEventListener(event, handler, {
      ...options,
      signal: controller.signal
    });
  }

  /**
   * Remove all listeners for a specific card
   * @param {string} cardId - Card identifier
   */
  function removeCard(cardId) {
    const controller = controllers.cards.get(cardId);
    if (controller) {
      controller.abort();
      controllers.cards.delete(cardId);
      eventBus?.emit('event-controller:card-removed', { cardId });
    }
  }

  /**
   * Remove multiple cards at once
   * @param {string[]} cardIds - Array of card identifiers
   */
  function removeCards(cardIds) {
    cardIds.forEach(id => removeCard(id));
  }

  /**
   * Clear all card controllers
   */
  function clearCards() {
    for (const [cardId, controller] of controllers.cards) {
      controller.abort();
    }
    controllers.cards.clear();
    eventBus?.emit('event-controller:cards-cleared');
  }

  /**
   * Abort a specific controller type
   * @param {string} type - Controller type
   */
  function abort(type) {
    if (controllers[type] && controllers[type] instanceof AbortController) {
      controllers[type].abort();
      controllers[type] = null;
      eventBus?.emit('event-controller:aborted', { type });
    }
  }

  /**
   * Abort all controllers except global
   */
  function abortAll() {
    ['popup', 'recording', 'cleanup'].forEach(type => abort(type));
    
    clearCards();
    
    eventBus?.emit('event-controller:all-aborted');
  }

  /**
   * Get controller by type
   * @param {string} type - Controller type
   * @returns {AbortController|null}
   */
  function get(type) {
    return controllers[type] || null;
  }

  /**
   * Check if controller exists and is active
   * @param {string} type - Controller type
   * @returns {boolean}
   */
  function isActive(type) {
    const controller = controllers[type];
    return controller instanceof AbortController && !controller.signal.aborted;
  }

  /**
   * Get all card IDs
   * @returns {string[]}
   */
  function getCardIds() {
    return Array.from(controllers.cards.keys());
  }

  /**
   * Get active card count
   * @returns {number}
   */
  function getCardCount() {
    return controllers.cards.size;
  }

  /**
   * Create a one-time listener that auto-removes after first trigger
   * @param {string} controllerType - Controller type
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Additional options
   */
  function once(controllerType, target, event, handler, options = {}) {
    const wrappedHandler = (...args) => {
      handler(...args);
    };

    addListener(controllerType, target, event, wrappedHandler, { ...options, once: true });
  }

  /**
   * Add a debounced event listener
   * @param {string} controllerType - Controller type
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {number} delay - Debounce delay in ms
   * @param {Object} options - Additional options
   */
  function debounced(controllerType, target, event, handler, delay = 300, options = {}) {
    let timeoutId;

    const debouncedHandler = (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handler(...args), delay);
    };

    addListener(controllerType, target, event, debouncedHandler, options);

    return () => {
      clearTimeout(timeoutId);
    };
  }

  /**
   * Add a throttled event listener
   * @param {string} controllerType - Controller type
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {number} limit - Throttle limit in ms
   * @param {Object} options - Additional options
   */
  function throttled(controllerType, target, event, handler, limit = 300, options = {}) {
    let inThrottle;

    const throttledHandler = (...args) => {
      if (!inThrottle) {
        handler(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };

    addListener(controllerType, target, event, throttledHandler, options);
  }

  /**
   * Get statistics about controllers
   * @returns {Object}
   */
  function getStats() {
    return {
      popup: isActive('popup'),
      recording: isActive('recording'),
      global: isActive('global'),
      cards: getCardCount()
    };
  }

  /**
   * Destroy all controllers
   */
  function destroy() {
    abortAll();
    if (controllers.global) {
      controllers.global.abort();
      controllers.global = null;
    }
    eventBus?.emit('event-controllers:destroyed');
  }

  return {
    init,
    create,
    addListener,
    addCardListener,
    removeCard,
    removeCards,
    clearCards,
    abort,
    abortAll,
    get,
    isActive,
    getCardIds,
    getCardCount,
    once,
    debounced,
    throttled,
    getStats,
    destroy
  };
};
