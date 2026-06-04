/**
 * Floating Buttons Module
 * Main floating action button + badge + recording ring + drag
 *
 * @module content/modules/ui/floating-buttons
 * @version 2.0.0
 * @license ISC
 */

export const createFloatingButtons = ({ bridge, eventBus, chromeApi, config, state, utils, registry }) => {
  const logger = (...args) => { if (utils?.isDebug?.()) (utils?.nsLog || console.log)(...args); };
  const lucide = registry?.get?.('lucide')?.icon;

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
  const DRAG_THRESHOLD = 5;
  const DEFAULT_POSITION = { bottom: 20, right: 20 };

  function create(options = {}) {
    const {
      position = { bottom: 20, right: 20 },
      onClick,
      onHover,
      onLeave
    } = options;

    container = document.createElement('div');
    container.id = 'notestash-clip';
    container.className = 'ns-floating-button-container';
    container.dataset.bottom = position.bottom;
    container.dataset.right = position.right;

    const hoverOverlay = document.createElement('div');
    hoverOverlay.id = 'notestash-hover-overlay';
    Object.assign(hoverOverlay.style, {
      position: 'absolute', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2147483644', background: 'transparent'
    });

    badge = document.createElement('div');
    badge.className = 'ns-floating-badge';
    Object.assign(badge.style, {
      position: 'absolute', top: '-5px', right: '-5px',
      background: 'var(--ns-danger)', color: 'var(--ns-text-inverse)',
      borderRadius: '50%', width: '22px', height: '22px',
      fontSize: '12px', fontWeight: 'bold', display: 'none',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--ns-font-family)', zIndex: '2',
      boxSizing: 'border-box'
    });

    recordingRing = document.createElement('div');
    recordingRing.id = 'notestash-recording-ring';
    Object.assign(recordingRing.style, {
      position: 'absolute', width: '70px', height: '70px',
      border: '2px solid var(--ns-danger)', borderRadius: '50%',
      pointerEvents: 'none', opacity: '0', zIndex: '0',
      left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 0.3s ease'
    });

    mainButton = document.createElement('button');
    mainButton.className = 'ns-floating-button';
    mainButton.id = 'notestash-main-button';
    mainButton.setAttribute('aria-label', 'Clip this page (Alt+C)');
    mainButton.setAttribute('title', 'Clip this page (Alt+C)');
    if (lucide) {
      mainButton.appendChild(lucide('scissors', 22));
    } else {
      mainButton.textContent = '\u2702';
    }
    mainButton.appendChild(badge);
    mainButton.appendChild(recordingRing);

    container.appendChild(hoverOverlay);
    container.appendChild(mainButton);
    if (registry) registry.register('floating', mainButton);

    if (onClick) mainButton.addEventListener('click', onClick);
    if (onHover) {
      hoverOverlay.addEventListener('mouseenter', onHover);
      mainButton.addEventListener('mouseenter', onHover);
    }
    if (onLeave) hoverOverlay.addEventListener('mouseleave', onLeave);

    document.body.appendChild(container);
    enableDragging();

    logger('[FloatingButtons] Created with design system + lucide');
    return { container, mainButton, badge, recordingRing, menuCircle };
  }

  function setLoading(loading) {
    if (!mainButton) return;
    if (loading) {
      mainButton.classList.add('ns-floating-button--loading');
      mainButton.replaceChildren();
      if (lucide) {
        const spinner = lucide('loader', 22);
        spinner.classList.add('ns-spinner');
        mainButton.appendChild(spinner);
      } else {
        mainButton.textContent = '\u27F3';
      }
    } else {
      mainButton.classList.remove('ns-floating-button--loading');
      mainButton.replaceChildren();
      if (lucide) {
        mainButton.appendChild(lucide('scissors', 22));
      } else {
        mainButton.textContent = '\u2702';
      }
      mainButton.appendChild(badge);
      mainButton.appendChild(recordingRing);
    }
  }

  function setPosition({ bottom, right }) {
    if (!container) return;
    if (bottom != null) { container.style.bottom = `${bottom}px`; container.dataset.bottom = String(bottom); }
    if (right != null) { container.style.right = `${right}px`; container.dataset.right = String(right); }
  }

  function getPosition() {
    if (!container) return DEFAULT_POSITION;
    return { bottom: parseInt(container.style.bottom) || 20, right: parseInt(container.style.right) || 20 };
  }

  function setVisible(visible) {
    if (!container) return;
    container.style.display = visible ? 'flex' : 'none';
  }

  function isVisible() {
    return container && container.style.display !== 'none';
  }

  function updateBadge(count) {
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function setRecording(isRecording, clipCount = 0) {
    if (!badge || !recordingRing) return;
    if (isRecording) {
      badge.style.animation = 'ns-pulse 1.5s ease-in-out infinite';
      badge.style.border = '2px solid var(--ns-text-inverse)';
      badge.style.display = 'flex';
      badge.textContent = String(clipCount);
      recordingRing.style.opacity = '1';
      recordingRing.style.animation = 'ns-pulse-ring 1.5s ease-out infinite';
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

  function showRecordingTooltip(clipCount) {
    if (!container || recordingTooltip) return;
    recordingTooltip = document.createElement('div');
    recordingTooltip.id = 'notestash-recording-tooltip';
    Object.assign(recordingTooltip.style, {
      position: 'absolute', bottom: '-32px', right: '0',
      background: 'var(--ns-danger)', color: 'var(--ns-text-inverse)',
      padding: '4px 10px', borderRadius: 'var(--ns-radius-md)',
      fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap',
      pointerEvents: 'none', transition: 'opacity 0.3s ease', opacity: '0',
      fontFamily: 'var(--ns-font-family)',
      display: 'flex', alignItems: 'center', gap: '4px'
    });
    if (lucide) recordingTooltip.appendChild(lucide('circle-dot', 10));
    const label = document.createElement('span');
    label.textContent = `Recording (${clipCount})`;
    recordingTooltip.appendChild(label);
    container.appendChild(recordingTooltip);
    requestAnimationFrame(() => { if (recordingTooltip) recordingTooltip.style.opacity = '1'; });
  }

  function hideRecordingTooltip() {
    if (recordingTooltip) {
      recordingTooltip.style.opacity = '0';
    }
  }

  function enableDragging() {
    if (!mainButton) return;
    mainButton.addEventListener('mousedown', handleMouseDown);
    mainButton.addEventListener('click', (e) => {
      if (hasDragged) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  function disableDragging() {
    if (!mainButton) return;
    mainButton.removeEventListener('mousedown', handleMouseDown);
  }

  function resetPosition() {
    setPosition(DEFAULT_POSITION);
    config?.set?.('floatingButtonPosition', DEFAULT_POSITION);
    eventBus?.emit('floating-button:moved', DEFAULT_POSITION);
  }

  function handleMouseDown(e) {
    if (!container || !mainButton || e.button !== 0) return;
    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialRight = parseInt(container.style.right) || 20;
    initialBottom = parseInt(container.style.bottom) || 20;
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
    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) hasDragged = true;
    const newRight = Math.max(0, initialRight + deltaX);
    const newBottom = Math.max(0, initialBottom + deltaY);
    container.style.right = `${newRight}px`;
    container.style.bottom = `${newBottom}px`;
    eventBus?.emit('floating-button:dragging', { right: newRight, bottom: newBottom });
  }

  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    if (container) container.style.transition = '';
    dragListeners.forEach(h => {
      document.removeEventListener('mousemove', h);
      document.removeEventListener('mouseup', h);
    });
    dragListeners = [];
    if (hasDragged) {
      const pos = getPosition();
      eventBus?.emit('floating-button:moved', pos);
      eventBus?.emit('dragging:position-saved', pos);
      config?.set?.('floatingButtonPosition', pos);
    }
    setTimeout(() => { hasDragged = false; }, 50);
  }

  function destroy() {
    if (container) {
      container.remove();
      container = null; mainButton = null; badge = null;
      recordingRing = null; menuCircle = null; recordingTooltip = null;
    }
    dragListeners = [];
  }

  function init() {
    logger('[FloatingButtons] Initialized');
    eventBus?.emit('module:initialized', { module: 'floatingButtons' });
  }

  return {
    init, create, setLoading, setPosition, getPosition, setVisible, isVisible,
    updateBadge, setRecording, enableDragging, disableDragging, resetPosition, destroy
  };
};
