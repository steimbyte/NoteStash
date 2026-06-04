/**
 * UI Elements Module - DOM element factory
 */

export const createElements = ({ bridge, eventBus, chromeApi, config }) => {
  let theme = {};
  let accentRgb = '139, 0, 0';

  function init() {
    theme = config?.getTheme() || {};
    accentRgb = theme.accentRgb || '139, 0, 0';
    injectGlobalStyles();

    eventBus?.on('config:theme-changed', ({ accentColor, theme: newTheme }) => {
      theme = newTheme || theme;
      accentRgb = theme.accentRgb || accentRgb;
      injectGlobalStyles();
    });
  }

  function injectGlobalStyles() {
    const styleId = 'notestash-global-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      /* Better Glassmorphism Scrollbars for NoteStash Elements */
      [id^="notestash-"]::-webkit-scrollbar,
      [id^="notestash-"] *::-webkit-scrollbar,
      #notestash-popup::-webkit-scrollbar,
      #notestash-popup *::-webkit-scrollbar,
      #notestash-cleaner-popup::-webkit-scrollbar,
      #notestash-cleaner-popup *::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
        display: block !important;
      }
      
      [id^="notestash-"]::-webkit-scrollbar-track,
      [id^="notestash-"] *::-webkit-scrollbar-track,
      #notestash-popup::-webkit-scrollbar-track,
      #notestash-popup *::-webkit-scrollbar-track,
      #notestash-cleaner-popup::-webkit-scrollbar-track,
      #notestash-cleaner-popup *::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1) !important;
        border-radius: 10px !important;
      }
      
      [id^="notestash-"]::-webkit-scrollbar-thumb,
      [id^="notestash-"] *::-webkit-scrollbar-thumb,
      #notestash-popup::-webkit-scrollbar-thumb,
      #notestash-popup *::-webkit-scrollbar-thumb,
      #notestash-cleaner-popup::-webkit-scrollbar-thumb,
      #notestash-cleaner-popup *::-webkit-scrollbar-thumb {
        background: rgba(${accentRgb}, 0.4) !important;
        border-radius: 10px !important;
        border: 2px solid transparent !important;
        background-clip: content-box !important;
        backdrop-filter: blur(4px) !important;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
      }
      
      [id^="notestash-"]::-webkit-scrollbar-thumb:hover,
      [id^="notestash-"] *::-webkit-scrollbar-thumb:hover,
      #notestash-popup::-webkit-scrollbar-thumb:hover,
      #notestash-popup *::-webkit-scrollbar-thumb:hover,
      #notestash-cleaner-popup::-webkit-scrollbar-thumb:hover,
      #notestash-cleaner-popup *::-webkit-scrollbar-thumb:hover {
        background: rgba(${accentRgb}, 0.6) !important;
        background-clip: content-box !important;
      }
      
      [id^="notestash-"]::-webkit-scrollbar-corner,
      [id^="notestash-"] *::-webkit-scrollbar-corner,
      #notestash-popup::-webkit-scrollbar-corner,
      #notestash-popup *::-webkit-scrollbar-corner,
      #notestash-cleaner-popup::-webkit-scrollbar-corner,
      #notestash-cleaner-popup *::-webkit-scrollbar-corner {
        background: transparent !important;
      }

      /* Firefox Support */
      [id^="notestash-"], #notestash-popup, #notestash-cleaner-popup {
        scrollbar-width: thin !important;
        scrollbar-color: rgba(${accentRgb}, 0.5) transparent !important;
      }

      /* Spinner Animation */
      @keyframes notestash-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .notestash-spinner-animate {
        animation: notestash-spin 1s linear infinite !important;
      }
    `;
  }

  function createContainer() {
    const container = document.createElement('div');
    container.id = 'notestash-container';
    container.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;
    return container;
  }

  function createClipButton() {
    const btn = document.createElement('button');
    btn.id = 'notestash-clip';
    btn.className = 'notestash-btn-clip';
    btn.innerHTML = 'ðŸ“¦';
    btn.style.cssText = `
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, rgba(${accentRgb}, 0.95), rgba(${accentRgb}, 0.75));
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(${accentRgb}, 0.25), 0 2px 8px rgba(0,0,0,0.1);
      backdrop-filter: blur(12px);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    return btn;
  }

  function createBadge(count = 0) {
    const badge = document.createElement('span');
    badge.id = 'notestash-badge';
    badge.textContent = count;
    badge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      background: #dc2626;
      color: white;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    return badge;
  }

  function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'notestash-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 800px;
      height: 80%;
      max-height: 600px;
      background: ${theme.bg || 'rgba(30, 41, 59, 0.85)'};
      backdrop-filter: blur(16px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      z-index: 2147483646;
      overflow: hidden;
    `;
    return popup;
  }

  function createGlassButton(text, icon = '') {
    const btn = document.createElement('button');
    btn.innerHTML = `${icon} ${text}`.trim();
    btn.style.cssText = `
      padding: 10px 16px;
      background: rgba(${accentRgb}, 0.15);
      border: 1px solid rgba(${accentRgb}, 0.3);
      border-radius: 10px;
      color: ${theme.text || '#e2e8f0'};
      font-size: 13px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(${accentRgb}, 0.1);
    `;
    return btn;
  }

  return {
    init,
    createContainer,
    createClipButton,
    createBadge,
    createPopup,
    createGlassButton
  };
};
