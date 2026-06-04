/**
 * Processing Overlay Component
 * Shows loading/processing states with progress and logs
 * 
 * @module content/modules/ui/components/processing-overlay
 * @version 1.0.0
 * @license ISC
 */

export const createProcessingOverlay = ({ bridge, eventBus, chromeApi, config, state, utils }) => {
  const logger = utils?.nsLog || console.log;
  let overlay = null;
  let logContainer = null;
  let logs = [];
  let startTime = null;

  /**
   * Create and show the processing overlay
   * @param {Object} options - Overlay options
   * @param {string} options.status - Initial status text
   * @param {boolean} options.showProgress - Whether to show progress bar
   */
  function show(options = {}) {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'notestash-processing-overlay';
    overlay.innerHTML = `
      <div class="notestash-processing-content">
        <div class="notestash-processing-spinner"></div>
        <div class="notestash-processing-text" id="notestash-processing-status">${options.status || 'Processing...'}</div>
        
        <div class="notestash-progress-container" id="notestash-progress-container" style="display: ${options.showProgress ? 'flex' : 'none'};">
          <div class="notestash-progress-bar">
            <div class="notestash-progress-fill" id="notestash-progress-fill" style="width: 0%"></div>
          </div>
          <div class="notestash-progress-text">
            <span id="notestash-progress-current">0</span> / <span id="notestash-progress-total">0</span>
          </div>
          <div class="notestash-progress-stage" id="notestash-progress-stage">Scanning...</div>
        </div>
        
        <div class="notestash-processing-log"></div>
      </div>
    `;

    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(${accentRgb}, 0.25);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      pointer-events: none;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    logContainer = overlay.querySelector('.notestash-processing-log');
    logs = [];
    startTime = Date.now();

    addStyles();
    document.body.appendChild(overlay);
    
    logger('[ProcessingOverlay] Overlay shown');
    eventBus?.emit('processing-overlay:shown');
  }

  /**
   * Add CSS styles for the overlay
   */
  function addStyles() {
    if (document.getElementById('notestash-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'notestash-overlay-styles';
    style.textContent = `
      @keyframes notestash-overlay-pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes notestash-spin {
        to { transform: rotate(360deg); }
      }
      .notestash-processing-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        background: rgba(0, 0, 0, 0.4);
        padding: 40px 60px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
      }
      .notestash-processing-spinner {
        width: 56px;
        height: 56px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top-color: #ff4444;
        border-radius: 50%;
        animation: notestash-spin 1s linear infinite;
        box-shadow: 0 0 30px rgba(255, 68, 68, 0.4);
      }
      .notestash-processing-text {
        color: white;
        font-size: 18px;
        font-weight: 600;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        letter-spacing: 1px;
      }
      .notestash-processing-log {
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        padding: 16px 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
        font-family: 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
      }
      .notestash-processing-log::-webkit-scrollbar {
        width: 8px;
      }
      .notestash-processing-log::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      .notestash-processing-log::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }
      .notestash-progress-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin: 10px 0;
        width: 100%;
        max-width: 300px;
      }
      .notestash-progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        overflow: hidden;
      }
      .notestash-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff4444, #ff6666);
        border-radius: 4px;
        transition: width 0.3s ease;
        box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
      }
      .notestash-progress-text {
        color: white;
        font-size: 12px;
        opacity: 0.9;
        font-family: 'Courier New', monospace;
      }
      .notestash-progress-stage {
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Log a message to the overlay
   * @param {string} icon - Emoji or icon
   * @param {string} message - Message text
   */
  function log(icon, message) {
    logs.push({ icon, message, time: Date.now() });

    if (logContainer) {
      logContainer.innerHTML = '';
      logs.forEach(l => {
        const line = document.createElement('div');
        line.style.cssText = 'padding: 4px 0; font-size: 12px; opacity: 0.9;';
        const iconSpan = document.createElement('span');
        iconSpan.textContent = `${l.icon || ''} `;
        const msgSpan = document.createElement('span');
        msgSpan.textContent = l.message || '';
        line.appendChild(iconSpan);
        line.appendChild(msgSpan);
        logContainer.appendChild(line);
      });
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  /**
   * Update the status text
   * @param {string} status - New status text
   */
  function updateStatus(status) {
    const statusEl = document.getElementById('notestash-processing-status');
    if (statusEl) {
      statusEl.textContent = status;
    }
    log('', status);
  }

  /**
   * Update progress bar
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {string} stage - Stage description
   */
  function updateProgress(current, total, stage) {
    const fill = document.getElementById('notestash-progress-fill');
    const currentEl = document.getElementById('notestash-progress-current');
    const totalEl = document.getElementById('notestash-progress-total');
    const stageEl = document.getElementById('notestash-progress-stage');
    const container = document.getElementById('notestash-progress-container');

    if (container) container.style.display = 'flex';
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (currentEl) currentEl.textContent = current;
    if (totalEl) totalEl.textContent = total;
    if (stageEl && stage) stageEl.textContent = stage;
  }

  /**
   * Hide and remove the overlay
   */
  function hide() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    logContainer = null;
    logs = [];
    startTime = null;
    
    logger('[ProcessingOverlay] Overlay hidden');
    eventBus?.emit('processing-overlay:hidden');
  }

  /**
   * Check if overlay is currently visible
   * @returns {boolean}
   */
  function isVisible() {
    return !!overlay;
  }

  /**
   * Get elapsed time since overlay was shown
   * @returns {number} Elapsed time in ms
   */
  function getElapsedTime() {
    return startTime ? Date.now() - startTime : 0;
  }

  function init() {
    logger('[ProcessingOverlay] Initialized');
    eventBus?.emit('module:initialized', { module: 'processingOverlay' });
  }

  function destroy() {
    hide();
    logger('[ProcessingOverlay] Destroyed');
  }

  return {
    init,
    show,
    hide,
    log,
    updateStatus,
    updateProgress,
    isVisible,
    getElapsedTime,
    destroy
  };
};
