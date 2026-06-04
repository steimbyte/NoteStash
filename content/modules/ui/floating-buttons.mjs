/**
 * Floating Buttons Module
 * Main floating action button with badge and recording ring
 * 
 * @module content/modules/ui/floating-buttons
 * @version 1.0.0
 * @license ISC
 */

export const createFloatingButtons = ({ bridge, eventBus, chromeApi, config, state, utils, registry }) => {
  const logger = utils?.nsLog || console.log;
  let container = null;
  let mainButton = null;
  let badge = null;
  let recordingRing = null;
  let menuCircle = null;
  let recordingTooltip = null;

  let isDragging = false;
  let hasDragged = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialRight = 0;
  let initialBottom = 0;
  let dragListeners = [];
  const DRAG_THRESHOLD = 5; // pixels
  const DEFAULT_POSITION = { bottom: 20, right: 20 };

  /**
   * Create the floating button container and main button
   * @param {Object} options - Configuration options
   * @returns {Object} Button references
   */
  function create(options = {}) {
    const { 
      position = { bottom: 20, right: 20 },
      onClick,
      onHover,
      onLeave
    } = options;

    const theme = state?.theme || {};
    const accentRgb = theme.accentRgb || '139, 0, 0';
    const accentGradient = theme.accentGradient || `linear-gradient(135deg, rgba(${accentRgb}, 0.95) 0%, rgba(${accentRgb}, 0.75) 100%)`;

    container = document.createElement('div');
    container.id = 'notestash-clip';
    Object.assign(container.style, {
      position: 'fixed',
      bottom: `${position.bottom}px`,
      right: `${position.right}px`,
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      gap: '0px',
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: '300px',
      height: '250px',
      pointerEvents: 'none' // Container doesn't block clicks, but children do
    });
    
    const hoverOverlay = document.createElement('div');
    hoverOverlay.id = 'notestash-hover-overlay';
    Object.assign(hoverOverlay.style, {
      position: 'absolute',
      width: '100%',
      height: '100%',
      pointerEvents: 'auto',
      zIndex: '2147483644',
      background: 'transparent'
    });

    badge = document.createElement('div');
    Object.assign(badge.style, {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      background: '#ef4444',
      color: 'white',
      borderRadius: '50%',
      width: '22px',
      height: '22px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      zIndex: '2',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box'
    });

    recordingRing = document.createElement('div');
    recordingRing.id = 'notestash-recording-ring';
    Object.assign(recordingRing.style, {
      position: 'absolute',
      width: '70px',
      height: '70px',
      border: '2px solid rgba(239, 68, 68, 0.5)',
      borderRadius: '50%',
      pointerEvents: 'none',
      opacity: '0',
      zIndex: '0',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 0.3s ease'
    });

    menuCircle = document.createElement('div');
    menuCircle.id = 'notestash-menu-circle';
    Object.assign(menuCircle.style, {
      position: 'absolute',
      width: '380px',
      height: '380px',
      background: `radial-gradient(circle at center, rgba(${accentRgb}, 0.08) 0%, rgba(${accentRgb}, 0.03) 50%, transparent 70%)`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: '50%',
      pointerEvents: 'auto', // Enable mouse events
      opacity: '0',
      zIndex: '2147483645',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      border: `1px solid rgba(${accentRgb}, 0.15)`
    });
    
    menuCircle.addEventListener('mouseenter', () => {
      eventBus?.emit('arc-menu:hover');
    });
    
    menuCircle.addEventListener('mouseleave', () => {
      eventBus?.emit('arc-menu:leave');
    });

    mainButton = document.createElement('div');
    mainButton.className = 'notestash-btn-clip';
    mainButton.innerHTML = 'âœ‚ï¸';
    mainButton.title = 'Clip this page (Alt+C)';
    Object.assign(mainButton.style, {
      position: 'relative',
      width: '58px',
      height: '58px',
      background: accentGradient,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '50%',
      fontSize: '26px',
      cursor: 'pointer',
      boxShadow: `0 8px 32px rgba(${accentRgb}, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
      userSelect: 'none',
      zIndex: '2147483647',
      pointerEvents: 'auto'
    });

    mainButton.appendChild(badge);
    mainButton.appendChild(recordingRing);
    container.appendChild(hoverOverlay);
    container.appendChild(menuCircle);
    container.appendChild(mainButton);

    if (onClick) {
      mainButton.addEventListener('click', onClick);
    }

    if (onHover) {
      hoverOverlay.addEventListener('mouseenter', onHover);
      mainButton.addEventListener('mouseenter', onHover);
      menuCircle.addEventListener('mouseenter', onHover);
    }

    if (onLeave) {
      hoverOverlay.addEventListener('mouseleave', onLeave);
    }

    mainButton.addEventListener('mouseenter', () => {
      mainButton.style.transform = 'scale(1.1)';
      mainButton.style.boxShadow = `0 12px 40px rgba(${accentRgb}, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15)`;
    });

    mainButton.addEventListener('mouseleave', () => {
      mainButton.style.transform = 'scale(1)';
      mainButton.style.boxShadow = `0 8px 32px rgba(${accentRgb}, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)`;
    });

    addBadgeStyles();

    document.body.appendChild(container);

    if (registry) {
      registry.register('popups', container);
    }

    enableDragging();
    
    logger('[FloatingButtons] Created main button with dragging enabled');

    return {
      container,
      mainButton,
      badge,
      recordingRing,
      menuCircle
    };
  }

  /**
   * Add CSS animations for badge
   */
  function addBadgeStyles() {
    if (document.getElementById('notestash-badge-styles')) return;

    const style = document.createElement('style');
    style.id = 'notestash-badge-styles';
    style.textContent = `
      @keyframes notestash-badge-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      }
      @keyframes notestash-badge-recording {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes notestash-recording-pulse {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; border-color: rgba(239, 68, 68, 0.5); }
        50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.5; border-color: rgba(239, 68, 68, 0.3); }
        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; border-color: rgba(239, 68, 68, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Update badge count
   * @param {number} count - Clip count to display
   */
  function updateBadge(count) {
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  /**
   * Set recording state
   * @param {boolean} isRecording - Whether recording is active
   * @param {number} clipCount - Number of clips captured
   */
  function setRecording(isRecording, clipCount = 0) {
    if (!badge || !recordingRing) return;

    if (isRecording) {
      badge.style.animation = 'notestash-badge-pulse 1.5s ease-in-out infinite, notestash-badge-recording 1s ease-in-out infinite';
      badge.style.border = '2px solid white';
      badge.style.display = 'flex';
      badge.textContent = clipCount;

      recordingRing.style.opacity = '1';
      recordingRing.style.animation = 'notestash-recording-pulse 1.5s ease-out infinite';

      showRecordingTooltip(clipCount);
    } else {
      badge.style.animation = 'none';
      badge.style.border = 'none';
      badge.textContent = '';
      recordingRing.style.opacity = '0';
      recordingRing.style.animation = 'none';

      hideRecordingTooltip();
    }
  }

  /**
   * Show recording tooltip below main button
   */
  function showRecordingTooltip(clipCount) {
    if (!container) return;
    
    if (!recordingTooltip) {
      recordingTooltip = document.createElement('div');
      recordingTooltip.id = 'notestash-recording-tooltip';
      Object.assign(recordingTooltip.style, {
        position: 'absolute', bottom: '-32px', right: '0',
        background: 'rgba(239, 68, 68, 0.9)', color: 'white',
        padding: '4px 10px', borderRadius: '6px', fontSize: '10px',
        fontWeight: '600', whiteSpace: 'nowrap', pointerEvents: 'none',
        transition: 'opacity 0.3s ease', opacity: '0',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      });
      container.appendChild(recordingTooltip);
    }
    
    recordingTooltip.textContent = `ðŸ”´ Recording (${clipCount} clips)`;
    recordingTooltip.style.opacity = '1';
  }

  function hideRecordingTooltip() {
    if (recordingTooltip) {
      recordingTooltip.style.opacity = '0';
    }
  }

  /**
   * Show/hide menu circle
   * @param {boolean} show - Whether to show
   */
  function showMenuCircle(show) {
    if (!menuCircle) return;
    menuCircle.style.opacity = show ? '1' : '0';
  }

  /**
   * Set main button loading state
   * @param {boolean} loading - Whether loading
   */
  function setLoading(loading) {
    if (!mainButton) return;
    
    if (loading) {
      mainButton.innerHTML = '<span style="animation: notestash-spin 1s linear infinite;">âŸ³</span>';
      mainButton.style.cursor = 'wait';
    } else {
      mainButton.innerHTML = 'âœ‚ï¸';
      mainButton.style.cursor = 'pointer';
    }
  }

  /**
   * Update position
   * @param {Object} position - {bottom, right}
   */
  function setPosition(position) {
    if (!container) return;
    container.style.bottom = `${position.bottom}px`;
    container.style.right = `${position.right}px`;
  }

  /**
   * Get current position
   * @returns {Object} {bottom, right}
   */
  function getPosition() {
    if (!container) return { bottom: 20, right: 20 };
    return {
      bottom: parseInt(container.style.bottom),
      right: parseInt(container.style.right)
    };
  }

  /**
   * Show/hide the entire button system
   * @param {boolean} visible - Whether visible
   */
  function setVisible(visible) {
    if (!container) return;
    container.style.display = visible ? 'flex' : 'none';
  }

  /**
   * Check if button is visible
   * @returns {boolean}
   */
  function isVisible() {
    return container && container.style.display !== 'none';
  }

  /**
   * Dragging handlers
   */
  function handleMouseDown(e) {
    if (!container || !mainButton) return;
    
    if (e.button !== 0) return;
    
    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialRight = parseInt(container.style.right) || DEFAULT_POSITION.right;
    initialBottom = parseInt(container.style.bottom) || DEFAULT_POSITION.bottom;
    
    mainButton.style.cursor = 'grabbing';
    container.style.transition = 'none';
    
    const moveHandler = (e) => handleMouseMove(e);
    const upHandler = (e) => handleMouseUp(e);
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    
    dragListeners.push(moveHandler, upHandler);
  }

  function handleMouseMove(e) {
    if (!isDragging || !container) return;
    
    const deltaX = dragStartX - e.clientX;
    const deltaY = dragStartY - e.clientY;
    
    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      hasDragged = true;
    }
    
    const newRight = Math.max(0, initialRight + deltaX);
    const newBottom = Math.max(0, initialBottom + deltaY);
    
    container.style.right = `${newRight}px`;
    container.style.bottom = `${newBottom}px`;
    
    eventBus?.emit('floating-button:dragging', { right: newRight, bottom: newBottom });
  }

  function handleMouseUp(e) {
    if (!isDragging) return;
    
    isDragging = false;
    
    if (mainButton) {
      mainButton.style.cursor = 'pointer';
    }
    if (container) {
      container.style.transition = '';
    }
    
    dragListeners.forEach(handler => {
      document.removeEventListener('mousemove', handler);
      document.removeEventListener('mouseup', handler);
    });
    dragListeners = [];
    
    if (hasDragged) {
      const currentPos = getPosition();
      eventBus?.emit('floating-button:moved', currentPos);
      eventBus?.emit('dragging:position-saved', currentPos); // AbwÃ¤rtskompatibilitÃ¤t
      config?.set?.('floatingButtonPosition', currentPos);
      logger('[FloatingButtons] Position saved:', currentPos);
    }
    
    setTimeout(() => {
      hasDragged = false;
    }, 50);
  }

  /**
   * Enable dragging on main button
   */
  function enableDragging() {
    if (!mainButton) {
      logger('[FloatingButtons] Cannot enable dragging - button not created');
      return;
    }
    
    mainButton.addEventListener('mousedown', handleMouseDown);
    
    mainButton.addEventListener('click', (e) => {
      if (hasDragged) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
    
    logger('[FloatingButtons] Dragging enabled');
  }

  /**
   * Disable dragging
   */
  function disableDragging() {
    if (!mainButton) return;
    mainButton.removeEventListener('mousedown', handleMouseDown);
    logger('[FloatingButtons] Dragging disabled');
  }

  /**
   * Reset position to default
   */
  function resetPosition() {
    if (!container) return;
    setPosition(DEFAULT_POSITION);
    config?.set?.('floatingButtonPosition', DEFAULT_POSITION);
    eventBus?.emit('floating-button:moved', DEFAULT_POSITION);
    logger('[FloatingButtons] Position reset to default');
  }

  /**
   * Destroy and clean up
   */
  function destroy() {
    if (container) {
      container.remove();
      container = null;
      mainButton = null;
      badge = null;
      recordingRing = null;
      menuCircle = null;
      recordingTooltip = null;
    }
    dragListeners = [];
    logger('[FloatingButtons] Destroyed');
  }

  function init() {
    logger('[FloatingButtons] Initialized');
    eventBus?.emit('module:initialized', { module: 'floatingButtons' });
  }

  return {
    init,
    create,
    updateBadge,
    setRecording,
    showMenuCircle,
    setLoading,
    setPosition,
    getPosition,
    setVisible,
    isVisible,
    enableDragging,
    disableDragging,
    resetPosition,
    destroy
  };
};
