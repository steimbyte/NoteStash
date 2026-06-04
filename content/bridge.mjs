/**
 * Bridge Module - Adapter between old content.js and new modular architecture
 * 
 * Pattern: Explicit bridge.call('module', 'method', ...args)
 * Allows gradual migration while keeping old code functional
 */

class ModuleBridge {
  constructor() {
    this.modules = new Map();
    this.loading = new Map();
    this.errors = new Map();
    this.eventBus = null;
    this.chromeApi = null;
    this.initialized = false;
  }

  /**
   * Initialize the bridge with core dependencies
   */
  async init({ eventBus, chromeApi }) {
    this.eventBus = eventBus;
    this.chromeApi = chromeApi;
    this.initialized = true;
    
    console.log('[NoteStash Bridge] Initialized');
    this.eventBus?.emit('bridge:initialized');
  }

  /**
   * Load a module dynamically with error handling
   * @param {string} moduleName - Module identifier (e.g., 'core/config')
   * @returns {Promise<Object>} Module instance
   */
  async load(moduleName) {
    if (this.modules.has(moduleName)) {
      return this.modules.get(moduleName);
    }

    if (this.loading.has(moduleName)) {
      return this.loading.get(moduleName);
    }

    const loadPromise = this._doLoad(moduleName);
    this.loading.set(moduleName, loadPromise);
    
    return loadPromise;
  }

  async _doLoad(moduleName) {
    try {
      const modulePath = `./modules/${moduleName}.mjs`;
      const module = await import(modulePath);
      
      const createFnName = `create${this._toPascalCase(moduleName.replace(/\//g, '_'))}`;
      const createFn = module[createFnName] || module.default;
      
      if (!createFn) {
        throw new Error(`Module ${moduleName} does not export a create function`);
      }

      const instance = createFn({
        bridge: this,
        eventBus: this.eventBus,
        chromeApi: this.chromeApi,
        config: await this.call('core/config', 'getConfig').catch(() => ({})),
        state: await this.call('core/state', 'getState').catch(() => ({}))
      });

      if (instance.init) {
        await instance.init();
      }

      this.modules.set(moduleName, instance);
      this.loading.delete(moduleName);
      this.errors.delete(moduleName);
      
      console.log(`[NoteStash Bridge] Module loaded: ${moduleName}`);
      this.eventBus?.emit('bridge:module-loaded', { module: moduleName });
      
      return instance;
    } catch (error) {
      this.loading.delete(moduleName);
      this.errors.set(moduleName, error);
      
      console.warn(`[NoteStash Bridge] Failed to load module ${moduleName}:`, error.message);
      this.eventBus?.emit('bridge:module-error', { module: moduleName, error });
      
      return null;
    }
  }

  /**
   * Call a method on a module (explicit pattern)
   * @param {string} moduleName - Module identifier
   * @param {string} methodName - Method to call
   * @param {...any} args - Arguments to pass
   * @returns {Promise<any>} Method result
   * 
   * Usage: bridge.call('core/config', 'getSetting', 'theme')
   */
  async call(moduleName, methodName, ...args) {
    if (!this.initialized) {
      throw new Error('Bridge not initialized');
    }

    try {
      const module = await this.load(moduleName);
      
      if (!module) {
        console.warn(`[NoteStash Bridge] Module ${moduleName} unavailable, skipping ${methodName}`);
        return null;
      }

      if (typeof module[methodName] !== 'function') {
        throw new Error(`Method ${methodName} not found in module ${moduleName}`);
      }

      return await module[methodName](...args);
    } catch (error) {
      console.error(`[NoteStash Bridge] Error calling ${moduleName}.${methodName}:`, error);
      this.eventBus?.emit('bridge:call-error', { module: moduleName, method: methodName, error });
      
      return null;
    }
  }

  /**
   * Check if a module is available (loaded and functional)
   */
  async isAvailable(moduleName) {
    if (this.modules.has(moduleName)) {
      return true;
    }
    if (this.errors.has(moduleName)) {
      return false;
    }
    const module = await this.load(moduleName);
    return module !== null;
  }

  /**
   * Get list of loaded modules
   */
  getLoadedModules() {
    return Array.from(this.modules.keys());
  }

  /**
   * Get list of failed modules
   */
  getFailedModules() {
    return Array.from(this.errors.entries()).map(([name, error]) => ({
      name,
      error: error.message
    }));
  }

  /**
   * Preload multiple modules for faster subsequent calls
   */
  async preload(moduleNames) {
    await Promise.all(moduleNames.map(name => this.load(name)));
  }

  /**
   * Destroy all modules and cleanup
   */
  async destroy() {
    for (const [name, module] of this.modules) {
      if (module.destroy) {
        try {
          await module.destroy();
        } catch (error) {
          console.warn(`[NoteStash Bridge] Error destroying module ${name}:`, error);
        }
      }
    }
    this.modules.clear();
    this.loading.clear();
    this.errors.clear();
    this.initialized = false;
    
    console.log('[NoteStash Bridge] Destroyed');
  }

  _toPascalCase(str) {
    return str
      .split(/[-_\/]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}

const bridge = new ModuleBridge();

if (typeof window !== 'undefined') {
  window.NoteStashBridge = bridge;
}

export default bridge;
export { ModuleBridge };
