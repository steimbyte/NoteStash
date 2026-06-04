/**
 * Utils Module - Utility functions and helpers
 * 
 * Features:
 * - Debug logging with conditional output
 * - Content hashing for change detection
 * - Color manipulation utilities
 * - Date/time formatting
 * - String manipulation helpers
 * - Debounce/throttle utilities
 */

export const createUtils = ({ bridge, eventBus, chromeApi }) => {
  let isDebugEnabled = false;

  /**
   * Initialize utils module
   */
  async function init() {
    try {
      const result = await chromeApi?.storage?.get('debugLogging');
      isDebugEnabled = result?.debugLogging === true;
    } catch (e) {
      isDebugEnabled = false;
    }
    
    eventBus?.on('config:setting-changed', (data) => {
      if (data.key === 'debugLogging') {
        isDebugEnabled = data.value;
      }
    });
  }

  /**
   * Conditional debug logger
   * Only outputs when debug logging is enabled
   */
  function nsLog(...args) {
    if (isDebugEnabled) {
      console.log(`[NoteStash ${new Date().toISOString()}]`, ...args);
    }
  }

  function nsWarn(...args) {
    if (isDebugEnabled) {
      console.warn(`[NoteStash ${new Date().toISOString()}]`, ...args);
    }
  }

  function nsError(...args) {
    if (isDebugEnabled) {
      console.error(`[NoteStash ${new Date().toISOString()}]`, ...args);
    } else {
      console.error(...args);
    }
  }

  function setDebugMode(enabled) {
    isDebugEnabled = enabled;
    console.log(`[NoteStash] Debug logging ${enabled ? 'enabled' : 'disabled'} (current: ${isDebugEnabled})`);
  }

  function isDebug() {
    return isDebugEnabled;
  }

  /**
   * Simple hash function for content change detection
   * Creates a numeric hash from a string (only first 5000 chars for performance)
   */
  function hashContent(str) {
    if (!str) return 0;
    const sample = str.slice(0, 5000);
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16); // Return as hex string
  }

  /**
   * Create a unique ID
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate timestamp string
   */
  function getTimestamp() {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Format date for display
   */
  function formatDate(date = new Date()) {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format time for display
   */
  function formatTime(date = new Date()) {
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format datetime for display
   */
  function formatDateTime(date = new Date()) {
    const d = new Date(date);
    return `${formatDate(d)} ${formatTime(d)}`;
  }

  /**
   * Debounce function
   */
  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle function
   */
  function throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Deep clone an object
   */
  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
      return obj.map(item => deepClone(item));
    }
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep merge objects
   */
  function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  /**
   * Check if value is an object
   */
  function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Sanitize string for use as filename
   */
  function sanitizeFilename(name) {
    return name
      .replace(/[\\/<>:"|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
  }

  /**
   * Truncate string with ellipsis
   */
  function truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Strip HTML tags from string
   */
  function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Escape special regex characters
   */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Wait for a condition to be true
   */
  async function waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, interval);
        }
      };
      check();
    });
  }

  /**
   * Retry an async operation
   */
  async function retry(fn, attempts = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < attempts - 1) {
          await sleep(delay * (i + 1));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get file extension from filename or URL
   */
  function getFileExtension(filename) {
    if (!filename) return '';
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Get filename from URL
   */
  function getFilenameFromUrl(url) {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch {
      return '';
    }
  }

  /**
   * Convert bytes to human readable size
   */
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Validate URL
   */
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Measure performance of a function
   */
  function measurePerformance(fn, label = 'Performance') {
    return async function (...args) {
      const start = performance.now();
      try {
        const result = await fn.apply(this, args);
        const duration = performance.now() - start;
        nsLog(`[${label}] ${fn.name || 'anonymous'} took ${duration.toFixed(2)}ms`);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        nsLog(`[${label}] ${fn.name || 'anonymous'} failed after ${duration.toFixed(2)}ms`);
        throw error;
      }
    };
  }

  /**
   * Create a memoized version of a function
   */
  function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();
    
    return function (...args) {
      const key = keyGenerator(...args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    };
  }

  /**
   * Group array items by key
   */
  function groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * Flatten nested arrays
   */
  function flatten(arr, depth = 1) {
    return arr.flat(depth);
  }

  /**
   * Remove duplicates from array
   */
  function unique(array, keyFn) {
    if (!keyFn) {
      return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Chunk array into smaller arrays
   */
  function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Check if element is in viewport
   */
  function isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= -threshold &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Get element position relative to document
   */
  function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }

  /**
   * Copy text to clipboard
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        return true;
      } catch (err) {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  /**
   * Generate a random string
   */
  function randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Parse query string to object
   */
  function parseQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Build query string from object
   */
  function buildQueryString(obj) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    }
    return params.toString();
  }

  return {
    init,
    
    nsLog,
    nsWarn,
    nsError,
    setDebugMode,
    isDebug,
    
    hashContent,
    generateId,
    
    getTimestamp,
    formatDate,
    formatTime,
    formatDateTime,
    
    debounce,
    throttle,
    retry,
    sleep,
    memoize,
    measurePerformance,
    
    deepClone,
    deepMerge,
    isObject,
    
    sanitizeFilename,
    truncate,
    stripHtml,
    escapeRegex,
    
    waitFor,
    
    getFileExtension,
    getFilenameFromUrl,
    formatBytes,
    
    isValidUrl,
    
    groupBy,
    flatten,
    unique,
    chunk,
    
    isInViewport,
    getElementPosition,
    copyToClipboard,
    
    randomString,
    
    parseQueryString,
    buildQueryString
  };
};
