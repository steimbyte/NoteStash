/**
 * Glassmorphism Select Component
 * Custom dropdown with glassmorphism styling
 * 
 * @module content/modules/ui/components/glassmorphism-select
 * @version 1.0.0
 * @license ISC
 */

export const createGlassmorphismSelect = ({ bridge, eventBus, chromeApi, config, state, utils }) => {
  const logger = utils?.nsLog || console.log;

  /**
   * Create a glassmorphism-styled dropdown select
   * @param {Array} options - Array of {value, label} objects
   * @param {number} selectedIndex - Initial selected index
   * @param {Function} onChange - Callback when selection changes
   * @returns {HTMLElement} The select container
   */
  function create(options, selectedIndex = 0, onChange = null) {
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    const container = document.createElement('div');
    container.style.cssText = 'position: relative; display: inline-block; min-width: 160px;';

    const trigger = document.createElement('button');
    Object.assign(trigger.style, {
      width: '100%',
      padding: '10px 16px',
      background: `rgba(${accentRgb}, 0.15)`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid rgba(${accentRgb}, 0.3)`,
      borderRadius: '10px',
      color: theme.text || '#e2e8f0',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      transition: 'all 0.2s ease'
    });

    const selectedText = document.createElement('span');
    selectedText.textContent = options[selectedIndex]?.label || 'Select...';
    selectedText.style.flex = '1';
    selectedText.style.textAlign = 'left';
    trigger.appendChild(selectedText);

    const arrow = document.createElement('span');
    arrow.innerHTML = 'â–¼';
    arrow.style.cssText = 'font-size: 10px; transition: transform 0.2s ease;';
    trigger.appendChild(arrow);

    const dropdown = document.createElement('div');
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: '0',
      right: '0',
      background: `rgba(${accentRgb}, 0.12)`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid rgba(${accentRgb}, 0.25)`,
      borderRadius: '12px',
      padding: '8px',
      zIndex: '2147483647',
      boxShadow: `0 16px 40px rgba(${accentRgb}, 0.2)`,
      display: 'none',
      flexDirection: 'column',
      gap: '4px',
      maxHeight: '240px',
      overflowY: 'auto'
    });

    const optionElements = [];
    options.forEach((opt, idx) => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        padding: '10px 14px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        color: theme.text || '#e2e8f0',
        transition: 'all 0.2s ease',
        background: idx === selectedIndex ?
          `rgba(${accentRgb}, 0.25)` : 'transparent',
        border: idx === selectedIndex ?
          `1px solid rgba(${accentRgb}, 0.4)` : '1px solid transparent'
      });
      option.textContent = opt.label;

      option.addEventListener('mouseenter', () => {
        if (idx !== selectedIndex) {
          option.style.background = `rgba(${accentRgb}, 0.15)`;
        }
      });

      option.addEventListener('mouseleave', () => {
        if (idx !== selectedIndex) {
          option.style.background = 'transparent';
        }
      });

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const oldIndex = selectedIndex;
        selectedIndex = idx;
        selectedText.textContent = opt.label;

        optionElements.forEach((el, i) => {
          el.style.background = i === selectedIndex ?
            `rgba(${accentRgb}, 0.25)` : 'transparent';
          el.style.border = i === selectedIndex ?
            `1px solid rgba(${accentRgb}, 0.4)` : '1px solid transparent';
        });

        dropdown.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';

        if (onChange && oldIndex !== selectedIndex) {
          onChange(idx, opt);
        }
        
        eventBus?.emit('glassmorphism-select:change', { index: idx, option: opt });
      });

      optionElements.push(option);
      dropdown.appendChild(option);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      dropdown.style.display = isOpen ? 'none' : 'flex';
      arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    const closeDropdown = () => {
      dropdown.style.display = 'none';
      arrow.style.transform = 'rotate(0deg)';
    };

    document.addEventListener('click', closeDropdown);

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    container.getValue = () => options[selectedIndex];
    container.getSelectedIndex = () => selectedIndex;
    container.setSelectedIndex = (idx) => {
      if (idx >= 0 && idx < options.length) {
        selectedIndex = idx;
        selectedText.textContent = options[idx].label;
        optionElements.forEach((el, i) => {
          el.style.background = i === selectedIndex ?
            `rgba(${accentRgb}, 0.25)` : 'transparent';
          el.style.border = i === selectedIndex ?
            `1px solid rgba(${accentRgb}, 0.4)` : '1px solid transparent';
        });
      }
    };
    container.setOptions = (newOptions, newSelectedIndex = 0) => {
      options.length = 0;
      options.push(...newOptions);
      container.setSelectedIndex(newSelectedIndex);
    };
    container.cleanup = () => {
      document.removeEventListener('click', closeDropdown);
    };

    container.appendChild(trigger);
    container.appendChild(dropdown);

    return container;
  }

  /**
   * Create a compact version of the select
   * @param {Array} options - Options array
   * @param {number} selectedIndex - Initial index
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   */
  function createCompact(options, selectedIndex = 0, onChange = null) {
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    const container = document.createElement('div');
    container.style.cssText = 'position: relative; display: inline-block;';

    const trigger = document.createElement('button');
    Object.assign(trigger.style, {
      padding: '6px 12px',
      background: `rgba(${accentRgb}, 0.1)`,
      border: `1px solid rgba(${accentRgb}, 0.2)`,
      borderRadius: '6px',
      color: theme.text || '#e2e8f0',
      fontSize: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease'
    });

    const selectedText = document.createElement('span');
    selectedText.textContent = options[selectedIndex]?.label || 'Select';
    trigger.appendChild(selectedText);

    const arrow = document.createElement('span');
    arrow.innerHTML = 'â–¼';
    arrow.style.fontSize = '9px';
    trigger.appendChild(arrow);

    const dropdown = document.createElement('div');
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: '0',
      background: `rgba(30, 30, 30, 0.95)`,
      border: `1px solid rgba(${accentRgb}, 0.2)`,
      borderRadius: '6px',
      padding: '4px',
      zIndex: '2147483647',
      display: 'none',
      flexDirection: 'column',
      gap: '2px',
      minWidth: '100%'
    });

    options.forEach((opt, idx) => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        padding: '6px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        color: theme.text || '#e2e8f0',
        background: idx === selectedIndex ? `rgba(${accentRgb}, 0.2)` : 'transparent',
        whiteSpace: 'nowrap'
      });
      option.textContent = opt.label;

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedIndex = idx;
        selectedText.textContent = opt.label;
        dropdown.style.display = 'none';
        if (onChange) onChange(idx, opt);
      });

      dropdown.appendChild(option);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
    });

    const closeDropdown = () => { dropdown.style.display = 'none'; };
    document.addEventListener('click', closeDropdown);

    container.cleanup = () => {
      document.removeEventListener('click', closeDropdown);
    };

    container.appendChild(trigger);
    container.appendChild(dropdown);

    return container;
  }

  function init() {
    logger('[GlassmorphismSelect] Initialized');
    eventBus?.emit('module:initialized', { module: 'glassmorphismSelect' });
  }

  function destroy() {
    logger('[GlassmorphismSelect] Destroyed');
  }

  return {
    init,
    create,
    createCompact,
    destroy
  };
};
