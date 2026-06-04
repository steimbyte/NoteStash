/**
 * Bridge Initializer - Add this to the beginning of content.js
 * 
 * This snippet initializes the modular bridge system, making it available
 * to the rest of the content.js code. Old code continues to work while
 * new features can be implemented in modules.
 * 
 * Add this as the first code inside the IIFE in content.js
 */

// Initialize modular bridge system (Phase 0)
(async function initBridge() {
  try {
    // Dynamic imports for infrastructure modules
    const [{ default: bridge }, { default: eventBus }, { default: chromeAPI }] = await Promise.all([
      import('./bridge.mjs'),
      import('./events.mjs'),
      import('./chrome-api.mjs')
    ]);

    // Initialize bridge with dependencies
    await bridge.init({
      eventBus,
      chromeApi: chromeAPI
    });

    console.log('[NoteStash] Modular bridge initialized successfully');

    // Expose bridge globally for debugging
    window.NoteStashBridge = bridge;
    window.NoteStashEvents = eventBus;
    window.NoteStashChromeAPI = chromeAPI;

    // Example usage for old code:
    // const theme = await window.NoteStashBridge.call('core/config', 'getTheme');
    
  } catch (error) {
    console.warn('[NoteStash] Failed to initialize modular bridge:', error);
    // Extension continues working without modular features
  }
})();
