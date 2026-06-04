/**
 * Chrome API Wrapper - Safe abstraction for chrome extension APIs
 * 
 * Features:
 * - Extension context validation
 * - Error recovery for invalidated contexts
 * - Promise-based APIs
 * - Automatic retries for transient failures
 * - Storage abstraction with type safety
 */

class ChromeAPI {
  constructor() {
    this.isValid = true;
    this.lastError = null;
    this.retryAttempts = 3;
    this.retryDelay = 100; // ms
  }

  /**
   * Check if extension context is valid
   * @returns {boolean}
   */
  checkContext() {
    try {
      this.isValid = !!(chrome.runtime?.id);
      return this.isValid;
    } catch (error) {
      this.isValid = false;
      this.lastError = error;
      return false;
    }
  }

  /**
   * Send message to background script
   * @param {Object} message - Message to send
   * @returns {Promise<any>} Response from background
   */
  async sendMessage(message) {
    if (!this.checkContext()) {
      throw new Error('Extension context invalidated');
    }

    return this._withRetry(() => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    });
  }

  /**
   * Listen for messages from background/other content scripts
   * @param {Function} callback - Message handler
   * @returns {Function} Unsubscribe function
   */
  onMessage(callback) {
    if (!this.checkContext()) {
      console.warn('[ChromeAPI] Cannot add message listener: context invalidated');
      return () => {};
    }

    const listener = (message, sender, sendResponse) => {
      try {
        const result = callback(message, sender, sendResponse);
        if (result && typeof result.then === 'function') {
          return true;
        }
      } catch (error) {
        console.error('[ChromeAPI] Message handler error:', error);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }

  /**
   * Storage API abstraction
   */
  storage = {
    /**
     * Get value from storage
     * @param {string|Array|Object} keys - Key(s) to retrieve
     * @param {string} area - Storage area ('local', 'sync', 'session')
     * @returns {Promise<Object>} Storage data
     */
    get: async (keys, area = 'local') => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      const storageArea = chrome.storage[area] || chrome.storage.local;

      return this._withRetry(() => {
        return new Promise((resolve, reject) => {
          storageArea.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      });
    },

    /**
     * Set value in storage
     * @param {Object} data - Data to store
     * @param {string} area - Storage area ('local', 'sync', 'session')
     * @returns {Promise<void>}
     */
    set: async (data, area = 'local') => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      const storageArea = chrome.storage[area] || chrome.storage.local;

      return this._withRetry(() => {
        return new Promise((resolve, reject) => {
          storageArea.set(data, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      });
    },

    /**
     * Remove value from storage
     * @param {string|Array} keys - Key(s) to remove
     * @param {string} area - Storage area ('local', 'sync', 'session')
     * @returns {Promise<void>}
     */
    remove: async (keys, area = 'local') => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      const storageArea = chrome.storage[area] || chrome.storage.local;

      return new Promise((resolve, reject) => {
        storageArea.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    /**
     * Clear all storage
     * @param {string} area - Storage area ('local', 'sync', 'session')
     * @returns {Promise<void>}
     */
    clear: async (area = 'local') => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      const storageArea = chrome.storage[area] || chrome.storage.local;

      return new Promise((resolve, reject) => {
        storageArea.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    /**
     * Get storage usage
     * @param {string} area - Storage area ('local', 'sync', 'session')
     * @returns {Promise<Object>} Usage info
     */
    getBytesInUse: async (area = 'local') => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      const storageArea = chrome.storage[area] || chrome.storage.local;

      return new Promise((resolve, reject) => {
        storageArea.getBytesInUse((bytes) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve({
              bytes,
              mb: (bytes / 1024 / 1024).toFixed(2),
              percent: ((bytes / (1024 * 1024 * 10)) * 100).toFixed(1)
            });
          }
        });
      });
    },

    /**
     * Typed storage helper - get with default
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default if not found
     * @returns {Promise<*>}
     */
    getWithDefault: async (key, defaultValue) => {
      const result = await this.storage.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    },

    /**
     * Typed storage helper - update object
     * @param {string} key - Storage key
     * @param {Function} updater - Function that receives current value and returns new value
     * @returns {Promise<void>}
     */
    update: async (key, updater) => {
      const current = await this.storage.getWithDefault(key, {});
      const updated = updater(current);
      await this.storage.set({ [key]: updated });
    }
  };

  /**
   * Tabs API abstraction
   */
  tabs = {
    /**
     * Query tabs
     * @param {Object} queryInfo - Query parameters
     * @returns {Promise<Array>}
     */
    query: async (queryInfo) => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      return new Promise((resolve, reject) => {
        chrome.tabs.query(queryInfo, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      });
    },

    /**
     * Send message to specific tab
     * @param {number} tabId - Tab ID
     * @param {Object} message - Message to send
     * @returns {Promise<any>}
     */
    sendMessage: async (tabId, message) => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    }
  };

  /**
   * Download API abstraction
   */
  downloads = {
    /**
     * Download file
     * @param {Object} options - Download options
     * @returns {Promise<number>} Download ID
     */
    download: async (options) => {
      if (!this.checkContext()) {
        throw new Error('Extension context invalidated');
      }

      return new Promise((resolve, reject) => {
        chrome.downloads.download(options, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(downloadId);
          }
        });
      });
    }
  };

  /**
   * Execute function with retry logic
   * @private
   */
  async _withRetry(fn) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (error.message.includes('Extension context invalidated')) {
          throw error;
        }
        
        if (attempt < this.retryAttempts) {
          await this._delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const chromeAPI = new ChromeAPI();

if (typeof window !== 'undefined') {
  window.NoteStashChromeAPI = chromeAPI;
}

export default chromeAPI;
export { ChromeAPI };
