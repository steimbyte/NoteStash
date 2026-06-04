/**
 * Arc Menu Module
 * Radial menu with floating arc buttons
 *
 * @module content/modules/ui/arc-menu
 * @version 1.2.0
 * @license ISC
 */

export const createArcMenu = ({ bridge, eventBus, chromeApi, config, state, utils, registry }) => {
  const logger = utils?.nsLog || console.log;
  let container = null;
  let buttons = [];
  let arrows = [];
  let isExpanded = false;

  const MENU_ITEMS = [
    { id: 'view', label: 'View', angle: 0 },
    { id: 'newSession', label: 'New', angle: -45 },
    { id: 'record', label: 'Rec', angle: -75 },
    { id: 'download', label: 'Save', angle: 45 },
    { id: 'settings', label: 'Set', angle: 75 }
  ];

  /**
   * Create the arc menu
   * @param {HTMLElement} parentContainer - Parent container element
   * @param {Object} handlers - Click handlers for each button
   * @returns {Object} Menu elements
   */
  function create(parentContainer, handlers = {}) {
    container = parentContainer;
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    MENU_ITEMS.forEach(item => {
      const arrow = createArrow(item.angle, accentRgb);
      const button = createButton(item, accentRgb, theme, handlers[item.id]);

      arrows.push(arrow);
      buttons.push({ ...item, element: button, arrow });

      container.appendChild(arrow);
      container.appendChild(button);
    });

    logger('[ArcMenu] Created with', buttons.length, 'buttons');

    return {
      buttons,
      arrows,
      expand,
      collapse
    };
  }

  /**
   * Create arrow SVG pointing from main button
   */
  function createArrow(angle, accentRgb) {
    const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowSvg.setAttribute('width', '24');
    arrowSvg.setAttribute('height', '50');
    arrowSvg.setAttribute('viewBox', '0 0 24 50');
    arrowSvg.setAttribute('class', 'notestash-floating-arrow');

    const rotation = -angle;

    arrowSvg.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 58px;
      transform: translateX(-50%) rotate(${rotation}deg);
      transform-origin: center bottom;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 2147483645;
    `;

    const ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', `arrowGrad${angle}`);
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '100%');
    grad.setAttribute('x2', '0%');
    grad.setAttribute('y2', '0%');
    [{ off: '0%', color: `rgba(${accentRgb}, 1)`, op: '1' },
     { off: '60%', color: `rgba(${accentRgb}, 0.5)`, op: '1' },
     { off: '100%', color: `rgba(${accentRgb}, 0.1)`, op: '1' }].forEach(s => {
      const stop = document.createElementNS(ns, 'stop');
      stop.setAttribute('offset', s.off);
      stop.setAttribute('style', `stop-color:${s.color};stop-opacity:${s.op}`);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
    arrowSvg.appendChild(defs);

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M12 46 L12 6 M5 13 L12 4 L19 13');
    path.setAttribute('stroke', `url(#arrowGrad${angle})`);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('fill', 'none');
    path.setAttribute('filter', `drop-shadow(0 2px 3px rgba(${accentRgb}, 0.4))`);
    arrowSvg.appendChild(path);

    if (registry) {
      registry.register('arrows', arrowSvg);
    }

    return arrowSvg;
  }

  /**
   * Create arc button — text-based, accessible, clearly visible
   */
  function createButton(item, accentRgb, theme, clickHandler) {
    const btn = document.createElement('div');
    btn.className = 'notestash-floating-btn';
    btn.dataset.id = item.id;
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', item.label);
    btn.setAttribute('tabindex', '0');

    const radius = 130;
    const rad = (item.angle * Math.PI) / 180;
    const x = Math.sin(rad) * radius;
    const y = Math.cos(rad) * radius;

    Object.assign(btn.style, {
      position: 'absolute',
      left: `calc(50% + ${x}px)`,
      bottom: `${70 + y}px`,
      transform: 'translate(-50%, 0) scale(1)',
      transformOrigin: 'center center',
      padding: '10px 18px',
      background: `rgba(${accentRgb}, 0.95)`,
      color: '#ffffff',
      border: `2px solid rgba(${accentRgb}, 1)`,
      boxShadow: `0 6px 20px rgba(${accentRgb}, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2)`,
      transition: 'opacity 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
      borderRadius: '22px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      whiteSpace: 'nowrap',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '2147483646',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minWidth: '90px'
    });

    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translate(-50%, 0) scale(1.08)';
      btn.style.boxShadow = `0 10px 28px rgba(${accentRgb}, 0.7), 0 4px 12px rgba(0, 0, 0, 0.3)`;
      eventBus?.emit('arc-menu:hover');
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(-50%, 0) scale(1)';
      btn.style.boxShadow = `0 6px 20px rgba(${accentRgb}, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2)`;
      eventBus?.emit('arc-menu:leave');
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      eventBus?.emit('arc-menu:click', { id: item.id });
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        eventBus?.emit('arc-menu:click', { id: item.id });
      }
    });

    if (registry) {
      registry.register('floatingBtns', btn);
    }

    return btn;
  }

  /**
   * Expand the arc menu
   */
  function expand() {
    if (isExpanded) return;
    isExpanded = true;

    buttons.forEach(({ element, arrow }) => {
      if (element) {
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
      }
      if (arrow) arrow.style.opacity = '0.8';
    });

    eventBus?.emit('arc-menu:expanded');
    logger('[ArcMenu] Expanded', buttons.length, 'buttons');
  }

  /**
   * Collapse the arc menu
   */
  function collapse() {
    if (!isExpanded) return;
    isExpanded = false;

    buttons.forEach(({ element, arrow }) => {
      if (element) {
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
      }
      if (arrow) arrow.style.opacity = '0';
    });

    eventBus?.emit('arc-menu:collapsed');
    logger('[ArcMenu] Collapsed');
  }

  /**
   * Toggle expand/collapse
   */
  function toggle() {
    if (isExpanded) collapse(); else expand();
  }

  function updateButton(id, updates) {
    const button = buttons.find(b => b.id === id);
    if (button && button.element) {
      Object.assign(button.element.style, updates);
    }
  }

  function setButtonContent(id, html) {
    const button = buttons.find(b => b.id === id);
    if (button && button.element) {
      button.element.innerHTML = html;
    }
  }

  function getButton(id) {
    const button = buttons.find(b => b.id === id);
    return button ? button.element : null;
  }

  function isMenuExpanded() {
    return isExpanded;
  }

  function destroy() {
    buttons.forEach(({ element, arrow }) => {
      element?.remove();
      arrow?.remove();
    });
    buttons = [];
    arrows = [];
    isExpanded = false;
    container = null;
    logger('[ArcMenu] Destroyed');
  }

  function init() {
    logger('[ArcMenu] Initialized');
    eventBus?.emit('module:initialized', { module: 'arcMenu' });
  }

  return {
    init,
    create,
    expand,
    collapse,
    toggle,
    updateButton,
    setButtonContent,
    getButton,
    isMenuExpanded,
    destroy,
    MENU_ITEMS
  };
};
