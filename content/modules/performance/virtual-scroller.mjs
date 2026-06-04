/**
 * Virtual Scroller Module - Performance: render only visible clips
 * 
 * Features:
 * - Only renders clips visible in viewport
 * - Automatic recycling of DOM elements
 * - Smooth scrolling with RAF
 * - Memory efficient for large clip lists
 */

export const createVirtualScroller = ({ bridge, eventBus, chromeApi }) => {
  const config = {
    bufferSize: 3,        // Extra items to render above/below viewport
    itemHeight: 150,      // Estimated height per item
    containerPadding: 20  // Container padding
  };

  let container = null;
  let items = [];
  let renderedItems = new Map(); // itemIndex -> DOM element
  let visibleRange = { start: 0, end: 0 };
  let scrollHandler = null;
  let resizeHandler = null;
  let renderFrame = null;
  let isInitialized = false;

  /**
   * Initialize virtual scroller
   */
  function init(options = {}) {
    Object.assign(config, options);
    isInitialized = true;
    eventBus?.emit('virtual-scroller:initialized');
  }

  /**
   * Mount virtual scroller to container
   * @param {HTMLElement} containerEl - Container element
   * @param {Array} itemsData - Array of clip data
   * @param {Object} sessionData - Session context
   * @param {Function} renderFn - Function to render a single item
   */
  function mount(containerEl, itemsData, sessionData, renderFn) {
    if (!isInitialized) {
      init();
    }

    container = containerEl;
    items = itemsData;

    container.innerHTML = '';
    renderedItems.clear();

    updateContainerHeight();

    updateVisibleRange();
    renderVisibleItems(sessionData, renderFn);

    attachListeners(sessionData, renderFn);

    eventBus?.emit('virtual-scroller:mounted', {
      itemCount: items.length,
      containerHeight: container.style.height
    });
  }

  /**
   * Update container height based on total items
   */
  function updateContainerHeight() {
    if (!container) return;
    const totalHeight = items.length * config.itemHeight;
    container.style.height = `${totalHeight}px`;
    container.style.position = 'relative';
  }

  /**
   * Calculate visible range based on scroll position
   */
  function updateVisibleRange() {
    if (!container) return;

    const scrollTop = container.scrollTop || 0;
    const containerHeight = container.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / config.itemHeight) - config.bufferSize);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / config.itemHeight) + config.bufferSize
    );

    visibleRange = { start: startIndex, end: endIndex };
  }

  /**
   * Render visible items, remove off-screen items
   */
  function renderVisibleItems(sessionData, renderFn) {
    if (!container) return;

    const { start, end } = visibleRange;

    for (const [index, element] of renderedItems) {
      if (index < start || index > end) {
        element.remove();
        renderedItems.delete(index);
      }
    }

    for (let i = start; i <= end; i++) {
      if (i >= items.length) break;
      
      if (!renderedItems.has(i)) {
        const item = items[i];
        const element = renderFn(item, i, sessionData);
        
        if (element) {
          element.style.position = 'absolute';
          element.style.top = `${i * config.itemHeight}px`;
          element.style.left = '0';
          element.style.right = '0';
          element.style.height = `${config.itemHeight}px`;
          
          container.appendChild(element);
          renderedItems.set(i, element);
        }
      }
    }

    eventBus?.emit('virtual-scroller:rendered', {
      visibleRange,
      renderedCount: renderedItems.size
    });
  }

  /**
   * Attach scroll and resize listeners
   */
  function attachListeners(sessionData, renderFn) {
    detachListeners();

    let ticking = false;
    scrollHandler = () => {
      if (!ticking) {
        renderFrame = requestAnimationFrame(() => {
          updateVisibleRange();
          renderVisibleItems(sessionData, renderFn);
          ticking = false;
        });
        ticking = true;
      }
    };

    resizeHandler = () => {
      updateVisibleRange();
      renderVisibleItems(sessionData, renderFn);
    };

    container?.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler);
  }

  /**
   * Remove event listeners
   */
  function detachListeners() {
    if (scrollHandler && container) {
      container.removeEventListener('scroll', scrollHandler);
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }
    if (renderFrame) {
      cancelAnimationFrame(renderFrame);
    }
  }

  /**
   * Update items data and re-render
   * @param {Array} newItems - New items array
   * @param {Object} sessionData - Session context
   * @param {Function} renderFn - Render function
   */
  function updateItems(newItems, sessionData, renderFn) {
    items = newItems;
    
    for (const element of renderedItems.values()) {
      element.remove();
    }
    renderedItems.clear();

    updateContainerHeight();
    updateVisibleRange();
    renderVisibleItems(sessionData, renderFn);

    eventBus?.emit('virtual-scroller:items-updated', {
      itemCount: items.length
    });
  }

  /**
   * Scroll to a specific item
   * @param {number} index - Item index
   * @param {string} behavior - Scroll behavior ('smooth' | 'auto')
   */
  function scrollToItem(index, behavior = 'smooth') {
    if (!container || index < 0 || index >= items.length) return;
    
    const scrollTop = index * config.itemHeight;
    container.scrollTo({
      top: scrollTop,
      behavior
    });
  }

  /**
   * Get current visible range
   * @returns {Object} { start, end }
   */
  function getVisibleRange() {
    return { ...visibleRange };
  }

  /**
   * Get rendered item element by index
   * @param {number} index - Item index
   * @returns {HTMLElement|null}
   */
  function getRenderedItem(index) {
    return renderedItems.get(index) || null;
  }

  /**
   * Get all rendered items
   * @returns {Map}
   */
  function getAllRendered() {
    return new Map(renderedItems);
  }

  /**
   * Refresh a specific item
   * @param {number} index - Item index
   * @param {Object} sessionData - Session context
   * @param {Function} renderFn - Render function
   */
  function refreshItem(index, sessionData, renderFn) {
    const existing = renderedItems.get(index);
    if (existing) {
      existing.remove();
      renderedItems.delete(index);
      
      if (index >= visibleRange.start && index <= visibleRange.end) {
        const item = items[index];
        const element = renderFn(item, index, sessionData);
        
        if (element) {
          element.style.position = 'absolute';
          element.style.top = `${index * config.itemHeight}px`;
          element.style.left = '0';
          element.style.right = '0';
          element.style.height = `${config.itemHeight}px`;
          
          container.appendChild(element);
          renderedItems.set(index, element);
        }
      }
    }
  }

  /**
   * Destroy virtual scroller
   */
  function destroy() {
    detachListeners();
    
    for (const element of renderedItems.values()) {
      element.remove();
    }
    renderedItems.clear();
    
    container = null;
    items = [];
    isInitialized = false;
    
    eventBus?.emit('virtual-scroller:destroyed');
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  function configure(newConfig) {
    Object.assign(config, newConfig);
    
    if (container && items.length > 0) {
      updateContainerHeight();
      updateVisibleRange();
    }
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  function getConfig() {
    return { ...config };
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  function getStats() {
    return {
      totalItems: items.length,
      renderedItems: renderedItems.size,
      visibleRange,
      containerHeight: container?.style.height,
      bufferSize: config.bufferSize
    };
  }

  return {
    init,
    mount,
    updateItems,
    scrollToItem,
    getVisibleRange,
    getRenderedItem,
    getAllRendered,
    refreshItem,
    configure,
    getConfig,
    getStats,
    destroy
  };
};
