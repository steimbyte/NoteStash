/**
 * Config Module - Settings, theme, and accent color management
 */

export const createConfig = ({ bridge, eventBus, chromeApi })   => {
  const defaults = {
    minImageSize: 75,
    maxImagesPerClip: 10,
    preserveModernFormats: true,
    detectTransparency: true,
    lazyLoadTimeout: 10000,
    contentFilterMode: 'lean',
    theme: 'auto',
    accentColor: '#8b0000',
    showFloatingButton: true,
    position: { bottom: 20, right: 20 },
    blacklist: [],
    whitelist: [],
    mode: 'blacklist',
    prefix: 'NoteStash',
    defaultSaveLocation: 'NoteStash',
    debugLogging: false,
    confirmDeletion: true,
    sendImagesToAi: false,
    aiProvider: 'openrouter',
    aiApiUrl: 'https://openrouter.ai/api/v1',
    aiApiKey: '',
    aiModel: 'x-ai/grok-4.1-fast',
    exportPrompts: [
      { name: 'Clean Markdown', prompt: 'Merge and clean the following web clippings into one well-structured markdown document. Describe all images in detail wherever they appear. Remove duplicates, fix formatting, and organize by topic. Keep all important information.' },
      { name: 'Word-Ready', prompt: 'Clean and merge the following web clippings into a professional document suitable for Microsoft Word. Provide comprehensive descriptions for all images. Use clear headings, proper paragraphs, and formal language. Remove web artifacts.' },
      { name: 'Clean Text', prompt: 'Extract the essential text content and provide detailed descriptions of all images from these web clippings. Remove all formatting, links, and web artifacts. Return plain, readable text organized by topic.' },
      { name: 'Custom', prompt: 'Describe images in detail.' }
    ]
  };

  let config = { ...defaults };
  
  let accentState = {
    color: defaults.accentColor,
    rgb: '139, 0, 0',
    gradient: '',
    darker: ''
  };

  let themeState = null;

  async function init() {
    await loadSettings();
    setupStorageListener();
    eventBus?.emit('config:initialized', config);
  }

  async function loadSettings() {
    logger('[Config] === loadSettings() START ===');
    try {
      const syncKeys = [
        'minImageSize', 'maxImagesPerClip', 'preserveModernFormats', 'detectTransparency',
        'lazyLoadTimeout', 'contentFilterMode', 'blacklist', 'whitelist', 'mode',
        'prefix', 'position', 'theme', 'showFloatingButton', 'accentColor',
        'debugLogging', 'aiProvider', 'aiApiUrl', 'aiApiKey', 'aiModel',
        'exportPrompts', 'confirmDeletion', 'sendImagesToAi', 'defaultSaveLocation'
      ];
      
      let storage = await chromeApi?.storage?.get(syncKeys, 'sync') || {};
      logger('[Config] loadSettings() - Sync storage check:', !!storage.aiApiKey);

      if (!storage.aiApiKey) {
        const localStorage = await chromeApi?.storage?.get(syncKeys, 'local') || {};
        if (localStorage.aiApiKey || localStorage.aiProvider) {
          logger('[Config] loadSettings() - Found legacy settings in local storage, migrating to sync...');
          storage = { ...storage, ...localStorage };
          await chromeApi?.storage?.set(localStorage, 'sync');
          logger('[Config] loadSettings() - Migration complete');
        }
      }

      config = { ...defaults, ...storage };
      
      if (config.maxImagesPerClip === 'unlimited') config.maxImagesPerClip = 999;

      updateAccentColor(config.accentColor);
      generateTheme();

      eventBus?.emit('config:settings-loaded', config);
      logger('[Config] === loadSettings() END ===');
      return config;
    } catch (error) {
      console.error('[Config] loadSettings() ERROR:', error);
      return defaults;
    }
  }

  async function saveSettings(newSettings) {
    try {
      config = { ...config, ...newSettings };
      await chromeApi?.storage?.set(newSettings, 'sync');
      eventBus?.emit('config:settings-saved', config);
      return true;
    } catch (error) {
      console.error('[Config] Failed to save settings:', error);
      return false;
    }
  }

  function get(key, defaultValue) {
    const value = config[key] !== undefined ? config[key] : defaultValue;
    return value;
  }

  async function set(key, value) {
    config[key] = value;
    if (key === 'accentColor') updateAccentColor(value);
    if (key === 'theme') generateTheme();
    eventBus?.emit('config:setting-changed', { key, value });
    return await saveSettings({ [key]: value });
  }

  function getAll() {
    return { ...config };
  }

  function isSiteAllowed(url = window.location.href) {
    const currentUrl = url.toLowerCase();
    const currentHost = new URL(url).hostname.toLowerCase();
    const { mode, blacklist, whitelist } = config;
    if (mode === 'blacklist') {
      return !blacklist?.some(pattern => {
        const p = pattern.toLowerCase().trim();
        return currentUrl.includes(p) || currentHost.includes(p);
      });
    } else {
      return whitelist?.some(pattern => {
        const p = pattern.toLowerCase().trim();
        return currentUrl.includes(p) || currentHost.includes(p);
      }) || false;
    }
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '139, 0, 0';
  }

  function generateAccentGradient(rgb) {
    return `linear-gradient(135deg, rgba(${rgb}, 0.95) 0%, rgba(${rgb}, 0.75) 100%)`;
  }

  function generateDarkerAccent(rgb) {
    const [r, g, b] = rgb.split(',').map(n => parseInt(n.trim()));
    return `rgb(${Math.floor(r * 0.8)}, ${Math.floor(g * 0.8)}, ${Math.floor(b * 0.8)})`;
  }

  function updateAccentColor(newColor) {
    accentState.color = newColor;
    accentState.rgb = hexToRgb(newColor);
    accentState.gradient = generateAccentGradient(accentState.rgb);
    accentState.darker = generateDarkerAccent(accentState.rgb);
    generateTheme();
    eventBus?.emit('config:theme-changed', { accentColor: newColor, theme: themeState });
  }

  function getAccent() { return { ...accentState }; }
  function getAccentColor() { return accentState.color; }

  function generateTheme() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const { rgb, color } = accentState;
    themeState = {
      isDarkMode,
      bg: isDarkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.72)',
      bgSecondary: isDarkMode ? 'rgba(51, 65, 85, 0.7)' : 'rgba(248, 250, 252, 0.65)',
      text: isDarkMode ? '#e2e8f0' : '#1e293b',
      textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
      border: isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 0.6)',
      cardBg: isDarkMode ? 'rgba(51, 65, 85, 0.65)' : 'rgba(248, 250, 252, 0.6)',
      codeBg: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(30, 41, 59, 0.85)',
      codeText: '#e2e8f0',
      accent: color,
      accentRgb: rgb,
      glassBackdrop: 'blur(12px)',
      glassBorder: '1px solid rgba(255, 255, 255, 0.3)',
      glassShadow: `0 8px 32px rgba(${rgb}, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)`,
      glassCardShadow: `0 4px 24px rgba(${rgb}, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)`,
    };
    return themeState;
  }

  function getTheme() {
    if (!themeState) generateTheme();
    return { ...themeState };
  }

  function setupStorageListener() {
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
          for (const [key, { newValue }] of Object.entries(changes)) {
            if (config[key] !== undefined && config[key] !== newValue) {
              config[key] = newValue;
              if (key === 'accentColor') updateAccentColor(newValue);
              eventBus?.emit('config:setting-changed', { key, value: newValue, external: true });
            }
          }
        }
      });
    }
  }

  function getImageSettings() {
    return {
      minImageSize: config.minImageSize,
      maxImagesPerClip: config.maxImagesPerClip,
      preserveModernFormats: config.preserveModernFormats,
      detectTransparency: config.detectTransparency,
      lazyLoadTimeout: config.lazyLoadTimeout
    };
  }

  function getUISettings() {
    return { theme: config.theme, showFloatingButton: config.showFloatingButton, position: config.position };
  }

  function getContentSettings() {
    return { contentFilterMode: config.contentFilterMode, prefix: config.prefix };
  }

  function destroy() {
    config = { ...defaults };
    accentState = { color: defaults.accentColor, rgb: '139, 0, 0', gradient: '', darker: '' };
    themeState = null;
  }

  return {
    init, loadSettings, saveSettings, get, getSetting: get, getAll, set, setSetting: set,
    isSiteAllowed, getAccent, getAccentColor, getTheme, updateAccentColor,
    getImageSettings, getUISettings, getContentSettings, destroy
  };
};

console.log('[Config] Module factory created');
