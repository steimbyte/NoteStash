/**
 * Clip Capture Module - Main appendClip functionality
 * 
 * Features:
 * - Screenshot capture
 * - Multi-method content extraction
 * - Image processing with progress
 * - Session management
 * - UI updates
 */

import CONTENT_FORMAT from '../content/content-format.mjs';

export const createClipCapture = ({ 
  bridge, eventBus, chromeApi, config, state, utils,
  htmlToMarkdown, linkExtractor, filterModes, 
  imageDetector, imageProcessor, sessionManager,
  processingOverlay, toast
}) => {
  let clipping = false;
  let isDragging = false;
  
  const CLIP_SEPARATOR = CONTENT_FORMAT.CLIP_SEPARATOR;
  const MAX_IMAGES_PER_CLIP = 50;

  /**
   * Initialize module
   */
  async function init() {
    console.log('[NoteStash] Clip Capture module initialized');
    return true;
  }

  /**
   * Main clip capture function
   */
  async function capture(options = {}) {
    console.log('[NoteStash Capture] === STARTING CAPTURE ===');
    
    if (clipping || isDragging) {
      console.log('[NoteStash Capture] Already clipping or dragging - aborting');
      return null;
    }
    
    clipping = true;
    
    const { floatingButtons, arcMenu, popup, cleanerPopup } = options;
    
    let debugEnabled = false;
    try {
      const debugSetting = await chromeApi.storage.get(['debugLogging']);
      debugEnabled = debugSetting.debugLogging === true;
    } catch (e) {}
    
    const dLog = (icon, msg) => {
      if (debugEnabled) console.log(`[NoteStash Debug] ${icon} ${msg}`);
    };
    
    dLog('ðŸ”§', 'Debug logging enabled');
    
    if (floatingButtons) {
      floatingButtons.setProcessing(true);
    }
    
    const logger = processingOverlay?.show?.('Capturing page...');
    
    try {
      const url = window.location.href;
      const title = document.title || 'Untitled';
      
      dLog('ðŸ“„', `Starting capture: "${title.substring(0, 50)}"`);
      logger?.log?.('ðŸ“„', 'Scanning page content...');
      
      logger?.log?.('â³', 'Waiting for page to settle...');
      dLog('â³', 'Waiting for page to settle (images + DOM stability)...');
      await waitForPageReady();
      dLog('âœ…', 'Page ready');
      
      let contentFilterMode = 'lean';
      try {
        const settings = await chromeApi.storage.get(['contentFilterMode']);
        contentFilterMode = settings.contentFilterMode || 'lean';
        dLog('âš™ï¸', `Content filter mode: ${contentFilterMode}`);
      } catch (e) {
        dLog('âš ï¸', 'Failed to load content filter settings, using default: lean');
      }
      
      dLog('ðŸ‘»', 'Hiding UI elements for screenshot...');
      const uiVisibilityStates = await hideUIElements();
      await new Promise(r => setTimeout(r, 150));
      
      logger?.log?.('ðŸ“¸', 'Capturing screenshot...');
      dLog('ðŸ“¸', 'Requesting screenshot from background script...');
      const screenshotResult = await captureScreenshot();
      dLog('âœ…', `Screenshot captured: ${screenshotResult.format}, ${screenshotResult.dataUrl ? 'with data' : 'no data'}`);
      
      await restoreUIElements(uiVisibilityStates);
      await new Promise(r => setTimeout(r, 50));
      
      logger?.log?.('ðŸ“', 'Extracting content...');
      dLog('ðŸ“', 'Starting content extraction (4 methods)...');
      const { markdown, extractionMethod, pageImages } = await extractContent(
        logger, 
        contentFilterMode,
        dLog
      );
      dLog('ðŸ“Š', `Content extracted via ${extractionMethod}: ${markdown.length} chars, ${pageImages.length} images found`);
      
      const links = linkExtractor?.extract?.(document.body) || [];
      dLog('ðŸ”—', `Links extracted: ${links.length}`);
      
      const timestamp = new Date().toLocaleString('de-DE');
      const screenshotId = Date.now();
      const clipId = Date.now().toString(36);
      dLog('ðŸ†”', `Clip ID: ${clipId}, Screenshot ID: ${screenshotId}`);
      
      logger?.log?.('ðŸ–¼ï¸', `Processing ${pageImages.length} images...`);
      dLog('ðŸ–¼ï¸', `Processing ${pageImages.length} images (max 50)...`);
      const clipImages = await processImages(
        pageImages, 
        clipId, 
        logger,
        dLog
      );
      dLog('âœ…', `Images processed: ${clipImages.length} successfully saved`);
      
      console.log('[NoteStash Capture] Checking for active session...');
      dLog('ðŸ“‚', 'Checking for active session...');
      let session = await sessionManager?.getCurrentSession?.();
      
      if (!session) {
        console.log('[NoteStash Capture] No session found, auto-creating...');
        dLog('âš ï¸', 'No session found, auto-creating...');
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        const timeStr = now.toLocaleTimeString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const autoName = `Session ${dateStr} ${timeStr}`;
        
        console.log(`[NoteStash Capture] Creating session: "${autoName}"`);
        dLog('ðŸ“', `Creating session: "${autoName}"`);
        session = await sessionManager?.createSession?.(autoName);
        
        if (!session) {
          console.warn('[NoteStash Capture] WARNING: createSession returned null, using emergency fallback');
          dLog('âŒ', 'Failed to auto-create session');
          session = {
            id: 'emergency-' + Date.now(),
            name: autoName,
            content: '',
            clipCount: 0,
            created: Date.now(),
            nextSnippetId: 1,
            screenshots: {},
            images: [],
            cachedHtml: {},
            clipMetadata: {}
          };
          console.log('[NoteStash Capture] Emergency session created:', session.id);
        } else {
          session.clipCount = session.clipCount || 0;
          session.nextSnippetId = session.nextSnippetId || 1;
          console.log(`[NoteStash Capture] Auto-created session: ${session.id}, clipCount: ${session.clipCount}`);
          dLog('âœ…', `Auto-created session: ${session.id}`);
        }
      } else {
        session.clipCount = session.clipCount || 0;
        session.nextSnippetId = session.nextSnippetId || 1;
        console.log(`[NoteStash Capture] Using existing session: ${session.name} (${session.id}), clipCount: ${session.clipCount}`);
        dLog('âœ…', `Using existing session: ${session.name} (${session.id})`);
      }
      
      const snippetId = String((session.nextSnippetId || 1)).padStart(3, '0');
      session.nextSnippetId = (session.nextSnippetId || 1) + 1;
      
      const entry = CONTENT_FORMAT.buildClipEntry({
        clipId,
        snippetId,
        title,
        url,
        timestamp,
        markdown,
        screenshotId,
        screenshotFormat: screenshotResult.format,
        links,
        clipImages
      });
      
      session.content += entry;
      session.clipCount++;
      
      if (screenshotResult.dataUrl) {
        if (!session.screenshots) session.screenshots = {};
        session.screenshots[`screenshot-${screenshotId}`] = {
          dataUrl: screenshotResult.dataUrl,
          clipId: clipId,
          snippetId: snippetId,
          title: title,
          url: url,
          timestamp: timestamp,
          format: screenshotResult.format
        };
      }
      
      if (clipImages.length > 0) {
        if (!Array.isArray(session.images)) session.images = [];
        session.images.push(...clipImages);
        console.log(`[NoteStash Capture] Pushed ${clipImages.length} images to session. Total session images:`, session.images.length);
      } else {
        console.warn('[NoteStash Capture] No images found to push to session');
      }
      
      if (!session.cachedHtml) session.cachedHtml = {};
      const mainContent = document.querySelector('main, article, [role="main"], .content, #content, .post, .article') || document.body;
      session.cachedHtml[clipId] = {
        html: mainContent.outerHTML,
        url: url,
        timestamp: timestamp,
        title: title
      };
      
      if (!session.clipMetadata) session.clipMetadata = {};
      session.clipMetadata[clipId] = {
        timestamp: timestamp,
        title: title,
        url: url,
        imageCount: clipImages.length,
        snippetId: snippetId
      };
      
      console.log(`[NoteStash Capture] Saving session: ${session.clipCount} clips, ${session.content.length} chars...`);
      dLog('ðŸ’¾', `Saving session: ${session.clipCount} clips, ${session.content.length} chars...`);
      
      try {
        await sessionManager?.saveCurrentSession?.(session);
        console.log('[NoteStash Capture] Session saved successfully');
        dLog('âœ…', 'Session saved successfully');
        
        const verifySession = await sessionManager?.getCurrentSession?.();
        if (verifySession && verifySession.clipCount > 0) {
          console.log(`[NoteStash Capture] VERIFIED: ${verifySession.clipCount} clips saved`);
        } else {
          console.error('[NoteStash Capture] WARNING: Session verification failed - clips not found after save!');
        }
      } catch (saveError) {
        console.error('[NoteStash Capture] ERROR saving session:', saveError);
        throw saveError;
      }
      
      updateBadge(session.clipCount);
      const successMsg = `got ${markdown.length} chars and ${clipImages.length} images`;
      console.log(`[NoteStash Capture] ${successMsg}`);
      toast?.show?.(successMsg, 'success');
      
      eventBus?.emit?.('clip:captured', {
        clipId,
        snippetId,
        title,
        imageCount: clipImages.length
      });
      
      logger?.log?.('âœ…', `Clip saved successfully! (${clipImages.length} images)`);
      console.log('[NoteStash Capture] === CLIP SAVED SUCCESSFULLY ===');
      console.log(`[NoteStash Capture] Session: ${session.name} | Clips: ${session.clipCount} | Images: ${clipImages.length} | Size: ${session.content.length} chars`);
      dLog('âœ…', `=== CLIP SAVED ===`);
      dLog('ðŸ“Š', `Total clips in session: ${session.clipCount}`);
      dLog('ðŸ“Š', `Images in this clip: ${clipImages.length}`);
      dLog('ðŸ“Š', `Session size: ${session.content.length} chars`);
      
      return {
        clipId,
        snippetId,
        title,
        imageCount: clipImages.length
      };
      
    } catch (error) {
      console.error('[NoteStash Capture] CRITICAL ERROR:', error);
      console.error('[NoteStash Capture] Error message:', error.message);
      console.error('[NoteStash Capture] Error stack:', error.stack);
      dLog('âŒ', `Capture failed: ${error.message}`);
      dLog('âŒ', `Error stack: ${error.stack}`);
      
      const errorMsg = 'âŒ Capture failed: ' + (error.message || 'Unknown error');
      toast?.show?.(errorMsg, 'error');
      logger?.log?.('âŒ', `Capture failed: ${error.message}`);
      
      eventBus?.emit?.('clip:capture-error', { error: error.message });
      return null;
      
    } finally {
      clipping = false;
      if (floatingButtons) {
        floatingButtons.setProcessing(false);
      }
      processingOverlay?.hide?.();
      console.log('[NoteStash Capture] Cleanup completed');
      dLog('ðŸ”§', 'Capture process completed (cleanup done)');
    }
  }

  /**
   * Hide UI elements for screenshot
   */
  async function hideUIElements() {
    const uiVisibilityStates = new Map();
    
    const selectors = [
      '#notestash-clip',
      '#notestash-popup',
      '#notestash-cleaner-popup',
      '#notestash-toast',
      '#notestash-refresh-msg',
      '#notestash-html-modal',
      '#notestash-floating-buttons',
      '#notestash-arc-menu',
      '#notestash-processing-overlay'
    ];
    
    selectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        uiVisibilityStates.set(el, el.style.display);
        el.style.display = 'none';
      }
    });
    
    return uiVisibilityStates;
  }

  /**
   * Restore UI elements after screenshot
   */
  async function restoreUIElements(uiVisibilityStates) {
    uiVisibilityStates.forEach((originalDisplay, el) => {
      if (el) {
        if (el.id === 'notestash-processing-overlay') {
          el.style.display = 'flex';
        } else if (originalDisplay && originalDisplay !== 'none') {
          el.style.display = originalDisplay;
        }
      }
    });
  }

  /**
   * Capture screenshot via background script
   */
  async function captureScreenshot() {
    try {
      const response = await chromeApi.sendMessage({ action: 'captureScreenshot' });
      if (response && response.success) {
        return {
          dataUrl: response.dataUrl,
          format: response.format === 'png' ? 'png' : 'jpg'
        };
      }
    } catch (e) {
      console.log('Screenshot failed:', e);
    }
    return { dataUrl: null, format: 'jpg' };
  }

  /**
   * Extract content using multiple methods
   */
  async function extractContent(logger, contentFilterMode, dLog) {
    let markdown = '';
    let extractionMethod = '';
    let pageImages = [];
    
    const userSelection = window.getSelection().toString().trim();
    if (userSelection.length > 50) {
      markdown = userSelection;
      extractionMethod = 'user-selection';
      logger?.log?.('âœ“', 'Using user selection');
      dLog('âœ“', `Using user selection: ${userSelection.length} chars`);
    }
    
    if (!markdown || markdown.length < 100) {
      try {
        logger?.log?.('ðŸ“', 'Converting HTML to Markdown...');
        dLog('ðŸ“', 'Starting HTML to Markdown conversion...');
        const mainContent = document.querySelector('main, article, [role="main"], [itemprop="articleBody"], .main-content, .content, #content, .post, .article, .entry-content, .body-text')
                         || document.body;
        
        const settings = await chromeApi.storage.get(['scanIframes']);
        const scanIframes = settings.scanIframes !== false;
        dLog('âš™ï¸', `Iframe scanning: ${scanIframes ? 'enabled' : 'disabled'}`);
        
        if (scanIframes) {
          logger?.log?.('ðŸ”', 'Running multi-layer image detection (including iframes)...');
          dLog('ðŸ”', 'Running multi-layer image detection with iframe support...');
          const multiLayerImages = await imageDetector?.extractImagesFromAllFrames?.(
            mainContent, 0, 10, dLog
          ) || [];
          logger?.log?.('âœ“', `Multi-layer detection found ${multiLayerImages.length} images (max 50)`);
          dLog('âœ“', `Multi-layer detection found ${multiLayerImages.length} images`);
          
          const result = htmlToMarkdown?.convert?.(mainContent, { 
            collectImages: true, 
            contentFilterMode 
          }) || { markdown: '', images: [] };
          
          markdown = result.markdown;
          pageImages = multiLayerImages.length > 0 ? multiLayerImages : result.images;
        } else {
          logger?.log?.('ðŸ”', 'Running multi-layer image detection (iframes disabled)...');
          dLog('ðŸ”', 'Running multi-layer image detection (iframes disabled)...');
          const multiLayerImages = imageDetector?.extractImages?.(mainContent) || [];
          logger?.log?.('âœ“', `Multi-layer detection found ${multiLayerImages.length} images`);
          dLog('âœ“', `Multi-layer detection found ${multiLayerImages.length} images`);
          
          const result = htmlToMarkdown?.convert?.(mainContent, { 
            collectImages: true, 
            contentFilterMode 
          }) || { markdown: '', images: [] };
          
          markdown = result.markdown;
          pageImages = multiLayerImages.length > 0 ? multiLayerImages : result.images;
        }
        
        logger?.log?.('ðŸ“Š', `Using ${pageImages.length} total images for processing`);
        dLog('ðŸ“Š', `Using ${pageImages.length} total images for processing`);
        
        if (markdown.length > 100) {
          extractionMethod = 'html-to-markdown';
        }
        logger?.log?.('âœ“', `Extracted ${markdown.length.toLocaleString()} chars`);
        dLog('âœ“', `Extracted ${markdown.length.toLocaleString()} chars via HTML-to-Markdown`);
      } catch (e) {
        console.log('HTML to Markdown failed:', e);
        dLog('âŒ', `HTML to Markdown failed: ${e.message}`);
      }
    }
    
    if (!markdown || markdown.length < 100) {
      try {
        dLog('ðŸ“', 'Trying all-frames extraction method...');
        const response = await chromeApi.sendMessage({ action: 'extractAllFrames' });
        if (response && response.success && response.results) {
          const allTexts = response.results.map(r => r.text).filter(t => t && t.length > 20);
          if (allTexts.length > 0) {
            allTexts.sort((a, b) => b.length - a.length);
            markdown = allTexts.join('\n\n---\n\n');
            extractionMethod = 'all-frames';
            dLog('âœ“', `All-frames extraction: ${markdown.length} chars from ${allTexts.length} frames`);
          }
        }
      } catch (e) {
        dLog('âŒ', `All-frames extraction failed: ${e.message}`);
      }
    }
    
    if (!markdown || markdown.length < 100) {
      dLog('ðŸ“', 'Using fallback extraction (innerText)...');
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('[id^="notestash-"], [class*="notestash"], script, style, nav, header, footer, aside').forEach(el => el.remove());
      markdown = clone.innerText || '';
      extractionMethod = 'fallback';
      dLog('âœ“', `Fallback extraction: ${markdown.length} chars`);
    }
    
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
    if (markdown.length < 20) markdown = '[No content captured]';
    
    console.log(`[NoteStash] ${markdown.length} chars via ${extractionMethod}`);
    dLog('ðŸ“Š', `Final extraction: ${markdown.length} chars via ${extractionMethod}`);
    
    return { markdown, extractionMethod, pageImages };
  }

  /**
   * Process images with progress
   */
  async function processImages(pageImages, clipId, logger, dLog) {
    const clipImages = [];
    const imagesToProcess = pageImages.slice(0, MAX_IMAGES_PER_CLIP);
    
    let showProgress = true;
    try {
      const settings = await chromeApi.storage.get(['showProgress']);
      showProgress = settings.showProgress !== false;
    } catch (e) {}
    
    if (imagesToProcess.length === 0) {
      dLog('ðŸ–¼ï¸', 'No images to process');
      return clipImages;
    }
    
    logger?.log?.('ðŸ–¼ï¸', `Found ${imagesToProcess.length} images`);
    dLog('ðŸ–¼ï¸', `Processing ${imagesToProcess.length} images (max ${MAX_IMAGES_PER_CLIP})`);
    
    if (pageImages.length > MAX_IMAGES_PER_CLIP) {
      logger?.log?.('âš ï¸', `${pageImages.length - MAX_IMAGES_PER_CLIP} images skipped (limit: ${MAX_IMAGES_PER_CLIP})`);
      dLog('âš ï¸', `${pageImages.length - MAX_IMAGES_PER_CLIP} images skipped (limit: ${MAX_IMAGES_PER_CLIP})`);
    }
    
    if (showProgress && imagesToProcess.length > 1) {
      processingOverlay?.updateProgress?.(0, imagesToProcess.length, 'Processing images...');
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < imagesToProcess.length; i++) {
      const imgInfo = imagesToProcess[i];
      let success = false;
      
      try {
        logger?.log?.('ðŸ”„', `Processing image ${i + 1}/${imagesToProcess.length}...`);
        dLog('ðŸ”„', `Processing image ${i + 1}/${imagesToProcess.length}: ${imgInfo.src?.substring(0, 60)}...`);
        let imgElement = imgInfo.element;
        
        try {
          await imageProcessor?.processLazyImage?.(imgElement, 3000);
        } catch (lazyError) {
          logger?.log?.('âš ï¸', `Lazy load failed for image ${i + 1}, trying anyway...`);
        }
        
        logger?.log?.('ðŸ“¥', `Downloading image ${i + 1}...`);
        const imageResult = await imageProcessor?.downloadImageSmart?.(imgElement, logger);
        
        if (imageResult) {
          logger?.log?.('ðŸ“', 'Creating thumbnail...');
          const thumbnailDataUrl = await imageProcessor?.generateThumbnail?.(
            imageResult.dataUrl, 
            200
          );
          
          const filename = generateContextualFilename(imgInfo, i, clipId);
          
          clipImages.push({
            id: `img_${clipId}_${i}`,
            clipId: clipId,
            originalUrl: imgInfo.src,
            thumbnailDataUrl: thumbnailDataUrl,
            fullDataUrl: imageResult.dataUrl,
            filename: filename,
            alt: imgInfo.alt,
            format: imageResult.format,
            dimensions: {
              width: imageResult.width,
              height: imageResult.height
            },
            hasTransparency: imageResult.hasTransparency,
            capturedAt: Date.now()
          });
          
          success = true;
          successCount++;
          logger?.log?.('âœ“', `Image ${i + 1} saved (${imageResult.format.toUpperCase()})`);
          dLog('âœ“', `Image ${i + 1} saved: ${filename} (${imageResult.format}, ${imageResult.width}x${imageResult.height})`);
          
          if (showProgress && imagesToProcess.length > 1) {
            processingOverlay?.updateProgress?.(
              i + 1, 
              imagesToProcess.length, 
              `Processed ${i + 1} of ${imagesToProcess.length} images...`
            );
          }
        }
      } catch (e) {
        failCount++;
        console.log(`[NoteStash] Failed to process image ${i}:`, e);
        logger?.log?.('âŒ', `Image ${i + 1} failed: ${e.message}`);
        dLog('âŒ', `Image ${i + 1} failed: ${e.message}`);
      }
    }
    
    if (showProgress) {
      processingOverlay?.hideProgress?.();
    }
    
    if (clipImages.length > 0) {
      logger?.log?.('âœ“', `${clipImages.length} images saved successfully`);
    }
    dLog('ðŸ“Š', `Image processing complete: ${successCount} saved, ${failCount} failed`);
    
    return clipImages;
  }

  /**
   * Generate contextual filename for image
   */
  function generateContextualFilename(imgInfo, index, clipId) {
    const hash = utils?.hashString?.(imgInfo.src)?.substring(0, 6) || '000000';
    const extension = imgInfo.src.toLowerCase().includes('.png') ? 'png' : 'jpg';
    
    return `${clipId}-img-${String(index).padStart(3, '0')}-${hash}.${extension}`;
  }

  
  /**
   * Update badge count
   */
  function updateBadge(count) {
    chromeApi.sendMessage({ 
      action: 'updateBadge', 
      count: count 
    }).catch(() => {});
  }

  /**
   * Wait for page to be ready (D24)
   * Combines: minimum delay, image loading, DOM stability
   */
  async function waitForPageReady() {
    let minDelay = 200;
    let imageTimeout = 3000;
    let domStabilityTime = 200;
    try {
      const settings = await chromeApi.storage.get(['minDelay', 'imageTimeout', 'domStabilityTime']);
      if (settings.minDelay) minDelay = settings.minDelay;
      if (settings.imageTimeout) imageTimeout = settings.imageTimeout;
      if (settings.domStabilityTime) domStabilityTime = settings.domStabilityTime;
    } catch (e) {}

    await new Promise(r => setTimeout(r, minDelay));

    await waitForImagesToLoad(document.body, imageTimeout);

    await waitForDomStability(domStabilityTime, 3000);
  }

  /**
   * Wait for all images in container to load
   */
  function waitForImagesToLoad(container, timeout = 3000) {
    return new Promise(resolve => {
      const images = container.querySelectorAll('img');
      const pendingImages = Array.from(images).filter(img => !img.complete && img.src);
      
      if (pendingImages.length === 0) {
        resolve();
        return;
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) { resolved = true; resolve(); }
      }, timeout);

      let loaded = 0;
      const checkDone = () => {
        loaded++;
        if (loaded >= pendingImages.length && !resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve();
        }
      };

      pendingImages.forEach(img => {
        img.addEventListener('load', checkDone, { once: true });
        img.addEventListener('error', checkDone, { once: true });
      });
    });
  }

  /**
   * Wait for DOM to stop changing (MutationObserver-based)
   */
  function waitForDomStability(stableTime = 200, timeout = 3000) {
    return new Promise(resolve => {
      let timer = null;
      let resolved = false;
      
      const timeoutTimer = setTimeout(() => {
        if (!resolved) { resolved = true; observer.disconnect(); resolve(); }
      }, timeout);

      const observer = new MutationObserver(() => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            clearTimeout(timeoutTimer);
            resolve();
          }
        }, stableTime);
      });

      observer.observe(document.body, { childList: true, subtree: true });

      timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          clearTimeout(timeoutTimer);
          resolve();
        }
      }, stableTime);
    });
  }

  /**
   * Check if currently clipping
   */
  function isCapturing() {
    return clipping;
  }

  /**
   * Set dragging state
   */
  function setDragging(dragging) {
    isDragging = dragging;
  }

  return {
    init,
    capture,
    isCapturing,
    setDragging,
    destroy: () => {
      clipping = false;
      isDragging = false;
    }
  };
};
