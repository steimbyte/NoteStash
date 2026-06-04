/**
 * NoteStash Content Script - Main Entry Point
 * Orchestrates all modules using the modular bridge architecture
 * 
 * @version 1.0.0
 * @license ISC
 */

import bridge from '../bridge.mjs';
import eventBus from '../events.mjs';
import chromeApi from '../chrome-api.mjs';

import { createConfig } from './core/config.mjs';
import { createState } from './core/state.mjs';
import { createUtils } from './core/utils.mjs';

import { createElementRegistry } from './performance/element-registry.mjs';
import { createEventControllers } from './performance/event-controllers.mjs';

import CONTENT_FORMAT from './content/content-format.mjs';
import { createHtmlToMarkdown } from './content/html-to-markdown.mjs';
import { createLinkExtractor } from './content/link-extractor.mjs';
import { createFilterModes } from './content/filter-modes.mjs';
import { createXPathResolver } from './content/xpath-resolver.mjs';

import { createImageDetector } from './images/detector.mjs';
import { createImageProcessor } from './images/processor.mjs';

import { createSessionManager } from './session/manager.mjs';
import { createClipParser } from './session/clip-parser.mjs';
import { createSessionDataProcessor } from './session/data-processor.mjs';

import { createElements } from './ui/elements.mjs';
import { createToast } from './ui/components/toast.mjs';
import { createProcessingOverlay } from './ui/components/processing-overlay.mjs';
import { createThumbnailGrid } from './ui/components/thumbnail-grid.mjs';
import { createLightbox } from './ui/components/lightbox.mjs';
import { createGlassmorphismSelect } from './ui/components/glassmorphism-select.mjs';
import { createGallery } from './ui/components/gallery.mjs';
import { createFloatingButtons } from './ui/floating-buttons.mjs';
import { createArcMenu } from './ui/arc-menu.mjs';
import { createPopup } from './ui/popup.mjs';
import { createCleanerPopup } from './ui/cleaner-popup.mjs';

import { createClipCapture } from './features/clip-capture.mjs';
import { createDownloadExport } from './features/download-export.mjs';
import { createAiCleaner } from './features/ai-cleaner.mjs';

import { createRecordingMode } from './recording/mode.mjs';
import { createDomObserver } from './recording/dom-observer.mjs';
import { createAutoCapture } from './recording/auto-capture.mjs';

const modules = {};

let menuHoverTimeout = null;
const MENU_CLOSE_DELAY = 600; // ms to move from button to menu

/**
 * Initialize all modules
 */
async function init() {
  if (document.getElementById('notestash-clip')) {
    console.log('[NoteStash] Legacy system detected, modular version standing by...');
    return;
  }

  console.log('[NoteStash] Initializing modular content script...');

  try {
    await bridge.init({ eventBus, chromeApi });
    console.log('[NoteStash] Bridge initialized');

    const config = createConfig({ bridge, eventBus, chromeApi, utils });
    const state = createState({ bridge, eventBus, chromeApi, config });
    const utils = createUtils({ bridge, eventBus, chromeApi, config, state });
    
    await Promise.all([
      config.init(),
      state.init(),
      utils.init()
    ]);

    modules.config = config;
    modules.state = state;
    modules.utils = utils;

    const registry = createElementRegistry({ bridge, eventBus, chromeApi, config, state, utils });
    const eventControllers = createEventControllers({ bridge, eventBus, chromeApi, config, state, utils });

    await Promise.all([
      registry.init(),
      eventControllers.init()
    ]);

    modules.registry = registry;
    modules.eventControllers = eventControllers;

    const xpathResolver = createXPathResolver({ bridge, eventBus, chromeApi, config, state, utils });
    const htmlToMarkdown = createHtmlToMarkdown({ bridge, eventBus, chromeApi, config, state, utils, xpathResolver });
    const linkExtractor = createLinkExtractor({ bridge, eventBus, chromeApi, config, state, utils });
    const filterModes = createFilterModes({ bridge, eventBus, chromeApi, config, state, utils });

    await Promise.all([
      htmlToMarkdown.init(),
      xpathResolver.init(),
      linkExtractor.init(),
      filterModes.init()
    ]);

    modules.htmlToMarkdown = htmlToMarkdown;
    modules.xpathResolver = xpathResolver;
    modules.linkExtractor = linkExtractor;
    modules.filterModes = filterModes;

    const imageDetector = createImageDetector({ bridge, eventBus, chromeApi, config, state, utils });
    const imageProcessor = createImageProcessor({ bridge, eventBus, chromeApi, config, state, utils });
    
    await Promise.all([
      imageDetector.init(),
      imageProcessor.init()
    ]);

    modules.imageDetector = imageDetector;
    modules.imageProcessor = imageProcessor;

    const sessionManager = createSessionManager({ bridge, eventBus, chromeApi, config, state, utils });
    const clipParser = createClipParser({ bridge, eventBus, chromeApi, config, state, utils });
    const dataProcessor = createSessionDataProcessor({ bridge, eventBus, chromeApi, config, state, utils });
    
    await Promise.all([
      sessionManager.init(),
      clipParser.init(),
      dataProcessor.init()
    ]);

    modules.sessionManager = sessionManager;
    modules.clipParser = clipParser;
    modules.dataProcessor = dataProcessor;

    const elements = createElements({ bridge, eventBus, chromeApi, config, state, utils });
    const toast = createToast({ bridge, eventBus, chromeApi, config, state, utils });
    const processingOverlay = createProcessingOverlay({ bridge, eventBus, chromeApi, config, state, utils });
    const thumbnailGrid = createThumbnailGrid({ bridge, eventBus, chromeApi, config, state, utils });
    const lightbox = createLightbox({ bridge, eventBus, chromeApi, config, state, utils });
    const glassmorphismSelect = createGlassmorphismSelect({ bridge, eventBus, chromeApi, config, state, utils });
    const gallery = createGallery({ bridge, eventBus, chromeApi, config, state, utils });
    
    await Promise.all([
      elements.init(),
      toast.init(),
      processingOverlay.init(),
      thumbnailGrid.init(),
      lightbox.init(),
      glassmorphismSelect.init(),
      gallery.init()
    ]);

    modules.elements = elements;
    modules.toast = toast;
    modules.processingOverlay = processingOverlay;
    modules.thumbnailGrid = thumbnailGrid;
    modules.lightbox = lightbox;
    modules.glassmorphismSelect = glassmorphismSelect;
    modules.gallery = gallery;

    const floatingButtons = createFloatingButtons({ 
      bridge, eventBus, chromeApi, config, state, utils, registry 
    });
    const arcMenu = createArcMenu({ 
      bridge, eventBus, chromeApi, config, state, utils, registry 
    });
    const popup = createPopup({ 
      bridge, eventBus, chromeApi, config, state, utils, registry, sessionManager, dataProcessor 
    });
    const cleanerPopup = createCleanerPopup({ 
      bridge, eventBus, chromeApi, config, state, utils, registry, sessionManager, dataProcessor, glassmorphismSelect 
    });
    
    await Promise.all([
      floatingButtons.init(),
      arcMenu.init(),
      popup.init(),
      cleanerPopup.init()
    ]);

    modules.floatingButtons = floatingButtons;
    modules.arcMenu = arcMenu;
    modules.popup = popup;
    modules.cleanerPopup = cleanerPopup;

    const clipCapture = createClipCapture({ 
      bridge, eventBus, chromeApi, config, state, utils, 
      htmlToMarkdown, linkExtractor, filterModes, imageDetector, imageProcessor, sessionManager, processingOverlay, toast 
    });
    const downloadExport = createDownloadExport({ 
      bridge, eventBus, chromeApi, config, state, utils, sessionManager 
    });
    const aiCleaner = createAiCleaner({ 
      bridge, eventBus, chromeApi, config, state, utils, sessionManager, cleanerPopup 
    });
    
    await Promise.all([
      clipCapture.init(),
      downloadExport.init(),
      aiCleaner.init()
    ]);

    modules.clipCapture = clipCapture;
    modules.downloadExport = downloadExport;
    modules.aiCleaner = aiCleaner;

    const recordingMode = createRecordingMode({ 
      bridge, eventBus, chromeApi, config, state, utils, floatingButtons, clipCapture 
    });
    const domObserver = createDomObserver({ 
      bridge, eventBus, chromeApi, config, state, utils, recordingMode, clipCapture 
    });
    const autoCapture = createAutoCapture({ 
      bridge, eventBus, chromeApi, config, state, utils, recordingMode, clipCapture 
    });
    
    await Promise.all([
      recordingMode.init(),
      domObserver.init(),
      autoCapture.init()
    ]);

    modules.recordingMode = recordingMode;
    modules.domObserver = domObserver;
    modules.autoCapture = autoCapture;

    setupUIHandlers();

    await createMainUI();

    injectGlobalStyles();

  setupKeyboardShortcuts();

  setupCrossTabSync();

  setupRuntimeMessageHandler();

  validateExtensionContext();

  console.log('[NoteStash] === All modules initialized ===');
  console.log('[NoteStash] Modules loaded:', Object.keys(modules));
  console.log('[NoteStash] Debug logging enabled:', utils?.isDebug?.());
  
  console.log('[NoteStash] Modular content script initialized successfully');
  eventBus.emit('notestash:initialized', { modules: Object.keys(modules) });

  } catch (error) {
    console.error('[NoteStash] Initialization failed:', error);
    eventBus.emit('notestash:error', { error: error.message });
    
    console.warn('[NoteStash] Running in fallback mode');
  }
}

/**
 * Set up UI event handlers
 */
function setupUIHandlers() {
  const { floatingButtons, arcMenu, popup, cleanerPopup, recordingMode, sessionManager } = modules;

  eventBus.on('arc-menu:click', ({ id }) => {
    switch (id) {
      case 'view':
        popup?.show();
        break;
      case 'newSession': {
        const name = prompt('Enter session name:', `Session ${Date.now()}`);
        if (name) sessionManager?.createSession?.(name);
        break;
      }
      case 'record':
        recordingMode?.toggle();
        break;
      case 'download':
        modules.downloadExport?.download();
        break;
      case 'settings':
        chrome.runtime.sendMessage({ action: 'openOptions' });
        break;
    }
    arcMenu?.collapse();
  });

  let hoverTimeout = null;
  eventBus.on('arc-menu:hover', () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    arcMenu?.expand();
    floatingButtons?.showMenuCircle(true);
  });

  eventBus.on('arc-menu:leave', () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      arcMenu?.collapse();
      floatingButtons?.showMenuCircle(false);
    }, MENU_CLOSE_DELAY);
  });

  eventBus.on('gallery:image-click', ({ images, index }) => {
    modules.lightbox?.show(images, index);
  });

  eventBus.on('recording:state-changed', ({ isRecording, clipCount }) => {
    floatingButtons?.setRecording(isRecording, clipCount);
    
    if (isRecording) {
      arcMenu?.setButtonContent('record', '<span style="font-size:16px;margin-right:6px;">â¹ï¸</span><span style="font-size:12px;font-weight:500;white-space:nowrap;">Rec</span>');
    } else {
      arcMenu?.setButtonContent('record', '<span style="font-size:16px;margin-right:6px;">ðŸ”´</span><span style="font-size:12px;font-weight:500;white-space:nowrap;">Rec</span>');
    }
  });

  eventBus.on('session:changed', () => {
    updateBadge();
  });

  eventBus.on('dragging:position-saved', ({ right, bottom }) => {
    modules.config?.set('floatingButtonPosition', { right, bottom });
  });

  eventBus.on('popup:open-cleaner', () => {
    modules.cleanerPopup?.show?.();
  });

  eventBus.on('cleaner:clean', async ({ content, format }) => {
    try {
      const result = await modules.aiCleaner?.clean?.(content, format);
      if (result?.cleaned) {
        modules.cleanerPopup?.setCleanedContent?.(result.cleaned);
        modules.toast?.show?.('AI cleaning complete!', 'success');
      } else if (result?.error) {
        modules.toast?.show?.('AI cleaning failed: ' + result.error, 'error');
      }
    } catch (err) {
      console.error('AI cleaning failed:', err);
      modules.toast?.show?.('AI cleaning failed', 'error');
    }
  });

  eventBus.on('cleaner:accepted', async () => {
    modules.toast?.show?.('Content replaced successfully!', 'success');
    modules.popup?.render?.();
    await updateBadge();
  });

  eventBus.on('cleaner:download-cleaned-zip', async ({ cleanedContent }) => {
    try {
      const session = await modules.sessionManager?.getCurrentSession?.();
      const filename = await modules.downloadExport?.exportCleanedZip?.(cleanedContent, session);
      modules.toast?.show?.(`Downloaded: ${filename}`, 'success');
    } catch (err) {
      console.error('Cleaned ZIP download failed:', err);
      modules.toast?.show?.('Download failed: ' + err.message, 'error');
    }
  });

  eventBus.on('cleaner:download-cleaned-md', async ({ cleanedContent }) => {
    try {
      const session = await modules.sessionManager?.getCurrentSession?.();
      const filename = await modules.downloadExport?.exportCleanedMd?.(cleanedContent, session);
      modules.toast?.show?.(`Downloaded: ${filename}`, 'success');
    } catch (err) {
      console.error('Cleaned .md download failed:', err);
      modules.toast?.show?.('Download failed: ' + err.message, 'error');
    }
  });

  eventBus.on('cleaner:download-original-zip', async () => {
    try {
      modules.cleanerPopup?.hide?.();
      const filename = await modules.downloadExport?.exportSessionZip?.();
      modules.toast?.show?.(`Downloaded: ${filename}`, 'success');
    } catch (err) {
      console.error('Original ZIP download failed:', err);
      modules.toast?.show?.('Download failed: ' + err.message, 'error');
    }
  });

  eventBus.on('popup:view-html', ({ clipId, cachedData }) => {
    showHtmlViewer(cachedData);
  });
}

/**
 * Show HTML viewer modal (B12)
 */
function showHtmlViewer(cachedData) {
  const theme = modules.config?.getTheme?.() || {};
  const accentRgb = modules.config?.getAccent?.()?.rgb || '139, 0, 0';

  const modal = document.createElement('div');
  modal.id = 'notestash-html-modal';
  Object.assign(modal.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.8)', zIndex: '2147483647',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  const content = document.createElement('div');
  Object.assign(content.style, {
    background: theme.bg || 'rgba(30, 41, 59, 0.95)', width: '90%', maxWidth: '1200px', height: '85%',
    borderRadius: '12px', display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden'
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    padding: '16px 20px', borderBottom: `1px solid ${theme.border || 'rgba(71,85,105,0.5)'}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: `linear-gradient(135deg, rgba(${accentRgb}, 0.3) 0%, rgba(${accentRgb}, 0.2) 100%)`
  });
  const titleEl = document.createElement('div');
  const titleHeading = document.createElement('h3');
  titleHeading.style.cssText = 'margin:0;color:white;font-size:16px;';
  titleHeading.textContent = 'Cached HTML View';
  const titleMeta = document.createElement('span');
  titleMeta.style.cssText = 'color:rgba(255,255,255,0.8);font-size:12px;';
  titleMeta.textContent = cachedData?.title || '';
  titleEl.appendChild(titleHeading);
  titleEl.appendChild(titleMeta);
  header.appendChild(titleEl);
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = 'âœ•';
  Object.assign(closeBtn.style, {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
    width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer'
  });
  closeBtn.addEventListener('click', () => modal.remove());
  header.appendChild(closeBtn);

  const tabs = document.createElement('div');
  Object.assign(tabs.style, {
    display: 'flex', borderBottom: `1px solid ${theme.border || 'rgba(71,85,105,0.5)'}`,
    background: theme.bgSecondary || 'rgba(51,65,85,0.7)'
  });

  const renderedTab = document.createElement('button');
  renderedTab.textContent = 'ðŸ‘ï¸ Rendered';
  Object.assign(renderedTab.style, {
    padding: '10px 20px', background: theme.accent || `rgb(${accentRgb})`, color: 'white',
    border: 'none', cursor: 'pointer', fontSize: '13px'
  });

  const rawTab = document.createElement('button');
  rawTab.textContent = 'ðŸ“„ Raw HTML';
  Object.assign(rawTab.style, {
    padding: '10px 20px', background: 'transparent', color: theme.text || '#e2e8f0',
    border: 'none', cursor: 'pointer', fontSize: '13px'
  });

  const viewContainer = document.createElement('div');
  Object.assign(viewContainer.style, { flex: '1', overflow: 'auto', padding: '20px' });

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: 'white' });
  iframe.sandbox = 'allow-same-origin';
  viewContainer.appendChild(iframe);
  setTimeout(() => {
    if (iframe.contentDocument) {
      iframe.contentDocument.open();
      iframe.contentDocument.write(cachedData?.html || '<p>No cached HTML</p>');
      iframe.contentDocument.close();
    }
  }, 100);

  renderedTab.addEventListener('click', () => {
    viewContainer.innerHTML = '';
    const newIframe = document.createElement('iframe');
    Object.assign(newIframe.style, { width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: 'white' });
    newIframe.sandbox = 'allow-same-origin';
    viewContainer.appendChild(newIframe);
    setTimeout(() => {
      if (newIframe.contentDocument) {
        newIframe.contentDocument.open();
        newIframe.contentDocument.write(cachedData?.html || '');
        newIframe.contentDocument.close();
      }
    }, 100);
    renderedTab.style.background = theme.accent || `rgb(${accentRgb})`;
    rawTab.style.background = 'transparent';
  });

  rawTab.addEventListener('click', () => {
    viewContainer.innerHTML = '';
    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
      width: '100%', height: '100%', border: 'none', borderRadius: '8px',
      background: theme.codeBg || 'rgba(15,23,42,0.8)', color: theme.codeText || '#e2e8f0',
      fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px', padding: '16px', resize: 'none'
    });
    textarea.value = cachedData?.html || '';
    textarea.readOnly = true;
    viewContainer.appendChild(textarea);
    rawTab.style.background = theme.accent || `rgb(${accentRgb})`;
    renderedTab.style.background = 'transparent';
  });

  tabs.appendChild(renderedTab);
  tabs.appendChild(rawTab);

  content.appendChild(header);
  content.appendChild(tabs);
  content.appendChild(viewContainer);
  modal.appendChild(content);

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/**
 * Inject global CSS styles for NoteStash elements (D23)
 */
function injectGlobalStyles() {
  if (document.getElementById('notestash-global-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'notestash-global-styles';
  style.textContent = `
    /* Custom scrollbars for NoteStash elements */
    [id^="notestash-"] ::-webkit-scrollbar,
    [id^="cleaner-"] ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    [id^="notestash-"] ::-webkit-scrollbar-track,
    [id^="cleaner-"] ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    [id^="notestash-"] ::-webkit-scrollbar-thumb,
    [id^="cleaner-"] ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    [id^="notestash-"] ::-webkit-scrollbar-thumb:hover,
    [id^="cleaner-"] ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.35);
    }

    /* Toast animations */
    @keyframes notestash-toast-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes notestash-toast-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }

    /* Recording pulse */
    @keyframes notestash-recording-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.3); }
      50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
    }

    /* Spin animation */
    @keyframes notestash-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Set up keyboard shortcuts (C24)
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modules.cleanerPopup?.isVisible?.()) {
        modules.cleanerPopup.hide();
      } else if (modules.popup?.isVisible?.()) {
        modules.popup.hide();
      }
      const htmlModal = document.getElementById('notestash-html-modal');
      if (htmlModal) htmlModal.remove();
    }
  });
}

/**
 * Cross-tab session sync (C14)
 */
function setupCrossTabSync() {
  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes['notestash-sessions'] || changes.sessions) {
          if (modules.popup?.isVisible?.()) {
            modules.popup.renderSessionTabs?.();
            modules.popup.render?.();
          }
          if (modules.cleanerPopup?.isVisible?.()) {
            modules.cleanerPopup.render?.();
          }
          updateBadge();
        }
      }
      if (area === 'sync') {
        if (changes.accentColor?.newValue) {
          modules.config?.updateAccentColor?.(changes.accentColor.newValue);
        }
      }
    });
  }
}

/**
 * chrome.runtime.onMessage handler (C25)
 */
function setupRuntimeMessageHandler() {
  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.action) {
        case 'clip':
          modules.clipCapture?.capture?.();
          break;
        case 'updateBadge':
          updateBadge();
          break;
        case 'toggleFloatingButton':
          const container = document.getElementById('notestash-clip');
          if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
          }
          break;
      }
    });
  }
}

/**
 * Validate extension context (C15)
 */
function validateExtensionContext() {
  try {
    if (!chrome.runtime?.id) {
      showRefreshMessage();
    }
  } catch (e) {
    showRefreshMessage();
  }
}

function showRefreshMessage() {
  const msg = document.createElement('div');
  msg.id = 'notestash-refresh-msg';
  Object.assign(msg.style, {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(239, 68, 68, 0.95)', color: 'white', padding: '16px 24px',
    borderRadius: '12px', zIndex: '2147483647', fontFamily: 'system-ui',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '16px'
  });
  msg.innerHTML = '<span>NoteStash extension was updated.</span>';
  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh Page';
  Object.assign(refreshBtn.style, {
    background: 'white', color: '#ef4444', border: 'none', padding: '8px 16px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
  });
  refreshBtn.addEventListener('click', () => window.location.reload());
  msg.appendChild(refreshBtn);
  document.body.appendChild(msg);
}

/**
 * Create the main UI
 */
async function createMainUI() {
  const { floatingButtons, arcMenu, sessionManager } = modules;

  const savedPos = await modules.config?.getSetting('floatingButtonPosition');
  const position = savedPos || { bottom: 20, right: 20 };

  const ui = floatingButtons?.create({
    position,
    onClick: () => {
      modules.clipCapture?.capture();
    },
    onHover: () => {
      clearTimeout(menuHoverTimeout);
      arcMenu?.expand();
      floatingButtons?.showMenuCircle(true);
      eventBus.emit('arc-menu:hover');
    },
    onLeave: () => {
      eventBus.emit('arc-menu:leave');
    }
  });

  if (ui?.container && ui?.mainButton) {

    arcMenu?.create(ui.container);
  }

  await updateBadge();
}

/**
 * Update badge count
 */
  async function updateBadge() {
    try {
      console.log('[NoteStash] === updateBadge() START ===');
      const session = await modules.sessionManager?.getCurrentSession();
      if (session) {
        console.log('[NoteStash] updateBadge() - Session:', session.id, session.name, 'content len:', session.content?.length || 0, 'clipCount:', session.clipCount);
        if (modules.dataProcessor) {
          const clips = modules.dataProcessor.parseClips(session.content);
          const count = clips.length;
          console.log('[NoteStash] updateBadge() - Parsed clips:', count);
          if (count > 0) {
            console.log('[NoteStash] updateBadge() - First clip ID:', clips[0].id, 'Title:', clips[0].title?.substring(0, 50));
          }
          modules.floatingButtons?.updateBadge(count);
          
          try {
            chrome.runtime?.sendMessage?.({ action: 'updateBadge', count });
          } catch (e) {
            console.log('[NoteStash] updateBadge() - Background script not available');
          }
        }
      }
      console.log('[NoteStash] === updateBadge() END ===');
    } catch (err) {
      console.error('[NoteStash] updateBadge() ERROR:', err);
      console.error('[NoteStash] updateBadge() ERROR stack:', err.stack);
    }
  }

/**
 * Destroy all modules
 */
function destroy() {
  Object.values(modules).forEach(module => {
    if (module?.destroy) {
      try {
        module.destroy();
      } catch (err) {
        console.error('[NoteStash] Error destroying module:', err);
      }
    }
  });
  
  console.log('[NoteStash] All modules destroyed');
}

/**
 * Get module by name
 * @param {string} name - Module name
 * @returns {Object|null}
 */
function getModule(name) {
  return modules[name] || null;
}

/**
 * Check if running in modular mode
 * @returns {boolean}
 */
function isModular() {
  return Object.keys(modules).length > 0;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', destroy);

window.NoteStash = {
  modules,
  getModule,
  isModular,
  destroy
};

console.log('[NoteStash] Content script entry point loaded');
