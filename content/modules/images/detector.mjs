/**
 * Image Detector Module - Multi-layer image extraction system
 * 
 * Features:
 * - 6-layer detection (img tags, lazy attributes, CSS backgrounds, picture sources, meta tags, video posters)
 * - Iframe extraction with retry mechanism
 * - Deduplication and size filtering
 * - Lazy-load attribute support
 */

export const createImageDetector = ({ bridge, eventBus, chromeApi, config, utils }) => {
  let processedUrls = new Set();
  let imageSettings = {};
  
  const LAZY_LOAD_ATTRIBUTES = [
    'data-src', 'data-original', 'data-lazy-src', 'data-lazyload',
    'data-bg', 'data-background', 'data-img-url', 'data-url',
    'data-echo', 'data-defer-src', 'data-actualsrc',
    'data-original-src', 'data-srcset', 'data-lazy',
    'data-ezsrc', 'data-source-url', 'data-hi-res-src',
    'data-zoom-src', 'data-full-src', 'data-large-src'
  ];
  
  const MIN_IMAGE_SIZE = 100;
  const MAX_IMAGES_TOTAL = 50;

  /**
   * Initialize module
   */
  async function init() {
    imageSettings = {
      minImageSize: config?.getSetting?.('minImageSize') || MIN_IMAGE_SIZE,
      maxImagesPerClip: config?.getSetting?.('maxImagesPerClip') || 50,
      scanIframes: config?.getSetting?.('scanIframes') !== false
    };
    
    return true;
  }

  /**
   * Check if URL is a valid image URL
   */
  function isValidImageUrl(url) {
    if (!url || url.startsWith('data:')) return false;
    if (url.toLowerCase().endsWith('.svg')) return false;
    
    if (processedUrls.has(url)) return false;
    
    return true;
  }

  /**
   * Convert URL to absolute URL
   */
  function toAbsoluteUrl(url) {
    try {
      if (url.startsWith('http')) return url;
      return new URL(url, window.location.href).href;
    } catch(e) {
      return null;
    }
  }

  /**
   * Add image to collection with deduplication
   */
  function addImageToCollection(images, src, source, element, alt = '') {
    if (!isValidImageUrl(src)) return;
    
    const absoluteSrc = toAbsoluteUrl(src);
    if (!absoluteSrc) return;
    
    if (processedUrls.has(absoluteSrc)) return;
    processedUrls.add(absoluteSrc);
    
    images.push({
      src: absoluteSrc,
      source: source, // 'img', 'lazy-attr', 'css-bg', 'picture', 'meta', 'video-poster'
      element: element,
      alt: alt || element?.getAttribute?.('alt') || '',
      collected: false // Will be populated with dimensions later
    });
  }

  /**
   * Layer 1: Standard <img> tags (with high-res preference)
   */
  function extractLayer1_StandardImages(element) {
    const images = [];
    
    element.querySelectorAll('img').forEach(img => {
      const highResAttrs = ['data-original', 'data-hi-res-src', 'data-full-src', 'data-src', 'src'];
      let bestSrc = '';
      
      for (const attr of highResAttrs) {
        const val = img.getAttribute(attr);
        if (val && val.length > 10 && !val.includes('placeholder') && !val.includes('base64')) {
          bestSrc = val;
          break;
        }
      }

      const src = bestSrc || img.getAttribute('src');
      if (src) {
        addImageToCollection(images, src, 'img', img, img.getAttribute('alt'));
      }
    });
    
    return images;
  }

  /**
   * Layer 2: Lazy-load attributes on any element
   */
  function extractLayer2_LazyAttributes(element) {
    const images = [];
    
    element.querySelectorAll('*').forEach(el => {
      LAZY_LOAD_ATTRIBUTES.forEach(attr => {
        const url = el.getAttribute(attr);
        if (url) {
          addImageToCollection(images, url, 'lazy-attr', el, el.getAttribute('alt'));
        }
      });
    });
    
    return images;
  }

  /**
   * Layer 3: CSS Background Images
   */
  function extractLayer3_CSSBackgrounds(element) {
    const images = [];
    const seenUrls = new Set();
    
    const elements = [element, ...element.querySelectorAll('*')];
    
    elements.forEach(el => {
      try {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        
        if (bgImage && bgImage !== 'none') {
          const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
          
          if (matches) {
            matches.forEach(match => {
              const url = match.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1');
              if (url && !seenUrls.has(url)) {
                seenUrls.add(url);
                addImageToCollection(images, url, 'css-bg', el);
              }
            });
          }
        }
      } catch (e) {
      }
    });
    
    return images;
  }

  /**
   * Layer 4: Picture element sources
   */
  function extractLayer4_PictureSources(element) {
    const images = [];
    
    element.querySelectorAll('picture source').forEach(source => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const sources = srcset.split(',').map(s => {
          const [url, descriptor] = s.trim().split(/\s+/);
          const width = descriptor ? parseInt(descriptor.replace('w', '')) : 0;
          return { url, width };
        }).sort((a, b) => b.width - a.width);
        
        if (sources.length > 0) {
          addImageToCollection(images, sources[0].url, 'picture', source);
        }
      }
    });
    
    return images;
  }

  /**
   * Layer 5: Meta tags and OpenGraph
   */
  function extractLayer5_MetaImages() {
    const images = [];
    
    const metaSelectors = [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[itemprop="image"]',
      'link[rel="image_src"]'
    ];
    
    metaSelectors.forEach(selector => {
      const meta = document.querySelector(selector);
      if (meta) {
        const url = meta.getAttribute('content') || meta.getAttribute('href');
        if (url) {
          addImageToCollection(images, url, 'meta', meta);
        }
      }
    });
    
    return images;
  }

  /**
   * Layer 6: Video poster images
   */
  function extractLayer6_VideoPosters(element) {
    const images = [];
    
    element.querySelectorAll('video[poster]').forEach(video => {
      const poster = video.getAttribute('poster');
      if (poster) {
        addImageToCollection(images, poster, 'video-poster', video);
      }
    });
    
    return images;
  }

  /**
   * Layer 7: Image links (<a> tags pointing to images)
   */
  function extractLayer7_ImageLinks(element) {
    const images = [];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    
    element.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href) {
        const lowerHref = href.toLowerCase().split('?')[0];
        if (imageExtensions.some(ext => lowerHref.endsWith(ext))) {
          addImageToCollection(images, href, 'link', a, a.getAttribute('title') || a.innerText);
        }
      }
    });
    
    return images;
  }

  /**
   * Layer 8: JSON-LD metadata
   */
  function extractLayer8_JsonLd(element) {
    const images = [];
    
    const scripts = (element === document.body) 
      ? document.querySelectorAll('script[type="application/ld+json"]')
      : element.querySelectorAll('script[type="application/ld+json"]');
      
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        
        const findImages = (obj) => {
          if (!obj) return;
          
          if (typeof obj === 'string') {
            if (obj.match(/^https?:\/\/.*\.(jpg|jpeg|png|webp|gif)/i)) {
              addImageToCollection(images, obj, 'json-ld', script);
            }
            return;
          }
          
          if (Array.isArray(obj)) {
            obj.forEach(findImages);
            return;
          }
          
          if (typeof obj === 'object') {
            if (obj.image) findImages(obj.image);
            if (obj.thumbnailUrl) findImages(obj.thumbnailUrl);
            if (obj.url && obj['@type'] === 'ImageObject') findImages(obj.url);
            
            for (const key in obj) {
              if (key !== 'image' && key !== 'thumbnailUrl' && key !== 'url') {
                findImages(obj[key]);
              }
            }
          }
        };
        
        findImages(data);
      } catch (e) {
      }
    });
    
    return images;
  }

  /**
   * Main extraction function - combines all layers
   */
  function extractImages(element, dLog) {
    processedUrls.clear();
    
    const allImages = [];
    
    if (dLog) dLog('ðŸ”', 'Starting multi-layer image detection...');
    
    const l1 = extractLayer1_StandardImages(element);
    if (dLog && l1.length > 0) dLog('ðŸ“¸', `Layer 1 (img tags): ${l1.length} images`);
    allImages.push(...l1);
    
    const l2 = extractLayer2_LazyAttributes(element);
    if (dLog && l2.length > 0) dLog('ðŸ’¤', `Layer 2 (lazy attributes): ${l2.length} images`);
    allImages.push(...l2);
    
    const l3 = extractLayer3_CSSBackgrounds(element);
    if (dLog && l3.length > 0) dLog('ðŸŽ¨', `Layer 3 (CSS backgrounds): ${l3.length} images`);
    allImages.push(...l3);
    
    const l4 = extractLayer4_PictureSources(element);
    if (dLog && l4.length > 0) dLog('ðŸ–¼ï¸', `Layer 4 (picture sources): ${l4.length} images`);
    allImages.push(...l4);
    
    const l5 = extractLayer5_MetaImages();
    if (dLog && l5.length > 0) dLog('ðŸ·ï¸', `Layer 5 (meta tags): ${l5.length} images`);
    allImages.push(...l5);
    
    const l6 = extractLayer6_VideoPosters(element);
    if (dLog && l6.length > 0) dLog('ðŸŽ¬', `Layer 6 (video posters): ${l6.length} images`);
    allImages.push(...l6);

    const l7 = extractLayer7_ImageLinks(element);
    if (dLog && l7.length > 0) dLog('ðŸ”—', `Layer 7 (image links): ${l7.length} images`);
    allImages.push(...l7);

    const l8 = extractLayer8_JsonLd(element);
    if (dLog && l8.length > 0) dLog('ðŸ“„', `Layer 8 (JSON-LD): ${l8.length} images`);
    allImages.push(...l8);
    
    let index = 0;
    const validImages = [];
    
    allImages.forEach(img => {
      let width = 0, height = 0;
      
      if (img.element) {
        if (img.element.tagName === 'IMG') {
          width = img.element.naturalWidth || img.element.width || 0;
          height = img.element.naturalHeight || img.element.height || 0;
        } else {
          try {
            const rect = img.element.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
          } catch(e) {}
        }
      }
      
      img.width = width;
      img.height = height;
      
      if (width > 0 && height > 0) {
        if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) return;
      }
      
      index++;
      img.marker = `__IMG_${String(index).padStart(3, '0')}__`;
      img.index = index;
      
      validImages.push(img);
    });
    
    if (dLog) {
      dLog('ðŸ“Š', `Multi-Layer Detection: ${validImages.length} valid images (${allImages.length} total found)`);
      if (validImages.length > 0) {
        validImages.slice(0, 5).forEach(img => {
          dLog('  ', `[${img.source}] ${img.src.substring(0, 60)}...`);
        });
        if (validImages.length > 5) dLog('  ', `... and ${validImages.length - 5} more`);
      }
    }
    
    return validImages;
  }

  /**
   * Extract images from iframe with injection fallback
   */
  async function injectAndExtractImages(iframe) {
    return new Promise((resolve) => {
      const requestId = 'notestash-extract-' + Date.now();
      
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'NOTESTASH_IMAGE_RESPONSE' && 
            event.data.requestId === requestId) {
          window.removeEventListener('message', messageHandler);
          clearTimeout(timeout);
          resolve(event.data.images || []);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      const timeout = setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        resolve([]);
      }, 5000);
      
      try {
        iframe.contentWindow.postMessage({
          type: 'NOTESTASH_EXTRACT_IMAGES',
          requestId: requestId
        }, '*');
      } catch (e) {
        resolve([]);
      }
    });
  }

  /**
   * Retry mechanism for iframe extraction
   */
  async function extractImagesFromIframeWithRetry(iframe, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          const images = await extractImagesFromAllFrames(
            iframe.contentDocument.body,
            0,
            5  // Lower max depth for nested iframes
          );
          if (images.length > 0) {
            return { images, method: 'direct', attempts: attempt + 1 };
          }
        }
        
        const injectedImages = await injectAndExtractImages(iframe);
        if (injectedImages && injectedImages.length > 0) {
          return { images: injectedImages, method: 'injection', attempts: attempt + 1 };
        }
        
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
          await new Promise(r => setTimeout(r, delay));
        }
        
      } catch (err) {
        lastError = err;
        console.warn(`[NoteStash] Iframe extraction attempt ${attempt + 1}/${maxRetries} failed:`, err);
        
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 100;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    
    return { images: [], method: 'failed', attempts: maxRetries, error: lastError };
  }

  /**
   * Extract images from all frames recursively
   */
  async function extractImagesFromAllFrames(rootElement = document.body, depth = 0, maxDepth = 10, dLog) {
    if (depth > maxDepth) {
      if (dLog) dLog('âš ï¸', `Max iframe depth (${maxDepth}) reached`);
      return [];
    }
    
    let allImages = [];
    let failedIframes = 0;
    
    const localImages = extractImages(rootElement, dLog);
    if (dLog) dLog('ðŸ”', `Depth ${depth}: Found ${localImages.length} images in current frame`);
    allImages.push(...localImages);
    
    const iframes = rootElement.querySelectorAll('iframe');
    if (dLog && iframes.length > 0) dLog('ðŸ”', `Depth ${depth}: Found ${iframes.length} iframes`);
    
    for (const iframe of iframes) {
      if (allImages.length >= MAX_IMAGES_TOTAL) {
        if (dLog) dLog('âš ï¸', 'Reached max image limit (50)');
        break;
      }
      
      const result = await extractImagesFromIframeWithRetry(iframe, 3);
      
      if (result.images.length > 0) {
        if (dLog) dLog('âœ“', `Extracted ${result.images.length} images from iframe (${result.method}, ${result.attempts} attempts)`);
        allImages.push(...result.images);
      } else if (result.error) {
        console.warn(`[NoteStash] Failed to extract images from iframe after ${result.attempts} attempts`);
        if (dLog) dLog('âŒ', `Failed to extract from iframe after ${result.attempts} attempts`);
        failedIframes++;
      }
    }
    
    if (failedIframes > 0) {
      console.warn(`[NoteStash] ${failedIframes} iframe(s) could not be accessed - some images may be missing`);
      window.notestashIframeWarning = failedIframes;
    }
    
    return allImages.slice(0, MAX_IMAGES_TOTAL);
  }

  /**
   * Get processed URLs (for debugging)
   */
  function getProcessedUrls() {
    return Array.from(processedUrls);
  }

  /**
   * Reset processed URLs
   */
  function reset() {
    processedUrls.clear();
  }

  return {
    init,
    extractImages,
    extractImagesFromAllFrames,
    extractLayer1_StandardImages,
    extractLayer2_LazyAttributes,
    extractLayer3_CSSBackgrounds,
    extractLayer4_PictureSources,
    extractLayer5_MetaImages,
    extractLayer6_VideoPosters,
    extractLayer7_ImageLinks,
    extractLayer8_JsonLd,
    getProcessedUrls,
    reset,
    destroy: () => {
      reset();
    }
  };
};
