/**
 * Arc Menu Module
 * Radial menu with 5 floating buttons around the main floating button
 *
 * @module content/modules/ui/arc-menu
 * @version 2.0.0
 * @license ISC
 */

export const createArcMenu = ({ bridge, eventBus, chromeApi, config, state, utils, registry }) => {
  const logger = (...args) => { if (utils?.isDebug?.()) (utils?.nsLog || console.log)(...args); };
  const lucide = registry?.get?.('lucide')?.icon;

  let container = null;
  let buttons = [];
  let isExpanded = false;

  const MENU_ITEMS = [
    { id: 'view',       label: 'View',   icon: 'eye',          angle: 0   },
    { id: 'newSession', label: 'New',    icon: 'folder-plus',  angle: -45 },
    { id: 'record',     label: 'Rec',    icon: 'circle-dot',   angle: -75 },
    { id: 'download',   label: 'Save',   icon: 'download',     angle: 45  },
    { id: 'settings',   label: 'Set',    icon: 'settings',     angle: 75  }
  ];

  function create(parentContainer, handlers = {}) {
    container = parentContainer;

    MENU_ITEMS.forEach(item => {
      const button = createButton(item);
      buttons.push({ ...item, element: button });
      container.appendChild(button);
    });

    logger('[ArcMenu] Created', buttons.length, 'buttons with lucide icons');
    return { buttons, expand, collapse };
  }

  function createButton(item) {
    const btn = document.createElement('button');
    btn.className = 'ns-arc-menu-button';
    btn.dataset.id = item.id;
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', item.label);
    btn.setAttribute('tabindex', '-1');

    const radius = 130;
    const rad = (item.angle * Math.PI) / 180;
    const x = Math.sin(rad) * radius;
    const y = Math.cos(rad) * radius;

    btn.style.left = `calc(50% + ${x}px)`;
    btn.style.bottom = `${70 + y}px`;

    if (lucide) {
      btn.appendChild(lucide(item.icon, 16));
    }
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

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
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        eventBus?.emit('arc-menu:click', { id: item.id });
      }
    });

    return btn;
  }

  function expand() {
    if (isExpanded) return;
    isExpanded = true;
    buttons.forEach(({ element }) => {
      element.classList.add('ns-arc-menu-button--visible');
      element.setAttribute('tabindex', '0');
    });
    eventBus?.emit('arc-menu:expanded');
    logger('[ArcMenu] Expanded');
  }

  function collapse() {
    if (!isExpanded) return;
    isExpanded = false;
    buttons.forEach(({ element }) => {
      element.classList.remove('ns-arc-menu-button--visible');
      element.setAttribute('tabindex', '-1');
    });
    eventBus?.emit('arc-menu:collapsed');
    logger('[ArcMenu] Collapsed');
  }

  function toggle() {
    if (isExpanded) collapse(); else expand();
  }

  function updateButton(id, updates) {
    const button = buttons.find(b => b.id === id);
    if (button?.element) Object.assign(button.element.style, updates);
  }

  function setButtonContent(id, html) {
    const button = buttons.find(b => b.id === id);
    if (button?.element) button.element.innerHTML = html;
  }

  function getButton(id) {
    return buttons.find(b => b.id === id)?.element || null;
  }

  function isMenuExpanded() { return isExpanded; }

  function destroy() {
    buttons.forEach(({ element }) => element?.remove());
    buttons = [];
    isExpanded = false;
    container = null;
  }

  function init() {
    logger('[ArcMenu] Initialized (v2.0 with design system)');
    eventBus?.emit('module:initialized', { module: 'arcMenu' });
  }

  return {
    init, create, expand, collapse, toggle,
    updateButton, setButtonContent, getButton, isMenuExpanded, destroy,
    MENU_ITEMS
  };
};
