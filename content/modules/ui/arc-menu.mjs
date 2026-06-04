/**
 * Arc Menu Module
 * Radial menu with floating arc buttons
 * 
 * @module content/modules/ui/arc-menu
 * @version 1.0.0
 * @license ISC
 */

export const createArcMenu = ({ bridge, eventBus, chromeApi, config, state, utils, registry }) => {
  const logger = utils?.nsLog || console.log;
  let container = null;
  let buttons = [];
  let arrows = [];
  let isExpanded = false;

  const MENU_ITEMS = [
    { id: 'view', emoji: 'ðŸ‘ï¸', label: 'View', angle: 0 },
    { id: 'newSession', emoji: 'ðŸ“', label: 'New', angle: -45 },
    { id: 'record', emoji: 'ðŸ”´', label: 'Rec', angle: -75 },
    { id: 'download', emoji: 'ðŸ’¾', label: 'Save', angle: 45 },
    { id: 'settings', emoji: 'âš™ï¸', label: 'Set', angle: 75 }
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
   * @param {number} angle - Angle in degrees
   * @param {string} accentRgb - Accent color
   * @returns {SVGElement}
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
    
    arrowSvg.innerHTML = `
      <defs>
        <linearGradient id="arrowGrad${angle}" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:rgba(${accentRgb}, 1);stop-opacity:1" />
          <stop offset="60%" style="stop-color:rgba(${accentRgb}, 0.5);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(${accentRgb}, 0.1);stop-opacity:1" />
        </linearGradient>
      </defs>
      <path d="M12 46 L12 6 M5 13 L12 4 L19 13" 
            stroke="url(#arrowGrad${angle})" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            fill="none"
            filter="drop-shadow(0 2px 3px rgba(${accentRgb}, 0.4))" />
    `;
    
    if (registry) {
      registry.register('arrows', arrowSvg);
    }
    
    return arrowSvg;
  }

  /**
   * Create arc button
   * @param {Object} item - Menu item config
   * @param {string} accentRgb - Accent color
   * @param {Object} theme - Theme object
   * @param {Function} clickHandler - Click handler
   * @returns {HTMLElement}
   */
  function createButton(item, accentRgb, theme, clickHandler) {
    const btn = document.createElement('div');
    btn.className = 'notestash-floating-btn';
    btn.dataset.id = item.id;
    btn.innerHTML = '';
    const emojiSpan = document.createElement('span');
    emojiSpan.style.cssText = 'font-size:16px;margin-right:6px;';
    emojiSpan.textContent = item.emoji || '';
    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = 'font-size:12px;font-weight:500;white-space:nowrap;';
    labelSpan.textContent = item.label || '';
    btn.appendChild(emojiSpan);
    btn.appendChild(labelSpan);
    
    const radius = 130;
    const rad = (item.angle * Math.PI) / 180;
    const x = Math.sin(rad) * radius;
    const y = Math.cos(rad) * radius;
    
    Object.assign(btn.style, {
      position: 'absolute',
      left: `calc(50% + ${x}px)`,
      bottom: `${70 + y}px`,
      padding: '8px 14px',
      background: `rgba(${accentRgb}, 0.15)`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: theme.text || '#e2e8f0',
      border: `1px solid rgba(${accentRgb}, 0.4)`,
      boxShadow: `0 4px 16px rgba(${accentRgb}, 0.2), 0 2px 8px rgba(0,0,0,0.1)`,
      transition: 'opacity 0.3s ease',
      borderRadius: '20px',
      fontSize: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '2147483646',
      transform: 'translate(-50%, 0) scale(1)',
      transformOrigin: 'center center'
    });
    
    btn.addEventListener('mouseenter', () => {
      eventBus?.emit('arc-menu:hover');
    });
    
    btn.addEventListener('mouseleave', () => {
      eventBus?.emit('arc-menu:leave');
    });
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      eventBus?.emit('arc-menu:click', { id: item.id });
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
      if (arrow) arrow.style.opacity = '1';
    });

    eventBus?.emit('arc-menu:expanded');
    logger('[ArcMenu] Expanded');
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
    if (isExpanded) {
      collapse();
    } else {
      expand();
    }
  }

  /**
   * Update button state
   * @param {string} id - Button ID
   * @param {Object} updates - Style updates
   */
  function updateButton(id, updates) {
    const button = buttons.find(b => b.id === id);
    if (button && button.element) {
      Object.assign(button.element.style, updates);
    }
  }

  /**
   * Set button content
   * @param {string} id - Button ID
   * @param {string} html - New HTML content
   */
  function setButtonContent(id, html) {
    const button = buttons.find(b => b.id === id);
    if (button && button.element) {
      button.element.innerHTML = html;
    }
  }

  /**
   * Get button element
   * @param {string} id - Button ID
   * @returns {HTMLElement|null}
   */
  function getButton(id) {
    const button = buttons.find(b => b.id === id);
    return button ? button.element : null;
  }

  /**
   * Check if menu is expanded
   * @returns {boolean}
   */
  function isMenuExpanded() {
    return isExpanded;
  }

  /**
   * Destroy the menu
   */
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
    destroy
  };
};
