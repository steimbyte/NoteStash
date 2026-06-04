/**
 * Image Processor Module - Download, process and optimize images
 * 
 * Features:
 * - Smart image download with CORS handling
 * - Format detection and conversion
 * - Transparency detection
 * - Thumbnail generation
 * - Lazy-load waiting
 */

export const createImageProcessor = ({ bridge, eventBus, chromeApi, config, utils }) => {
  let settings = {};
  
  /**
   * Initialize module
   */
  async function init() {
    settings = {
      imageTimeout: config?.getSetting?.('imageTimeout') || 3,
      maxRetries: 3,
      thumbnailSize: 200
    };
    
    console.log('[NoteStash] Image Processor initialized');
    return true;
  }

  /**
   * Smart image download with format detection
   * Tries multiple methods: fetch, background script, canvas
   */
  async function downloadImageSmart(imgElement, logger = null) {
    const src = imgElement.src || 
                imgElement.getAttribute('data-src') || 
                imgElement.getAttribute('data-original');
    
    if (!src) {
      throw new Error('No image source');
    }
    
    try {
      if (logger) logger.log('ðŸ“Š', 'Trying direct fetch...');
      const fetchResult = await fetchImageWithCORS(src);
      if (fetchResult) {
        if (logger) logger.log('âœ“', 'Fetch successful');
        return fetchResult;
      }
    } catch (e) {
      if (logger) logger.log('âš ï¸', `Fetch failed: ${e.message}`);
    }
    
    try {
      if (logger) logger.log('ðŸ“Š', 'Trying background fetch...');
      const bgResult = await downloadViaBackground(src);
      if (bgResult) {
        if (logger) logger.log('âœ“', 'Background fetch successful');
        return bgResult;
      }
    } catch (e) {
      if (logger) logger.log('âš ï¸', `Background fetch failed: ${e.message}`);
    }

    try {
      if (logger) logger.log('ðŸ“Š', 'Trying canvas extraction (fallback)...');
      const canvasResult = await downloadViaCanvas(imgElement);
      if (canvasResult) {
        if (logger) logger.log('âœ“', 'Canvas extraction successful');
        return canvasResult;
      }
    } catch (e) {
      if (logger) logger.log('âš ï¸', `Canvas failed: ${e.message}`);
    }
    
    throw new Error('All download methods failed');
  }

  /**
   * Download image via canvas (same-origin only)
   */
  async function downloadViaCanvas(imgElement) {
    return new Promise((resolve, reject) => {
      if (!imgElement.complete || imgElement.naturalWidth === 0) {
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        
        tempImg.onload = () => {
          try {
            const result = extractFromCanvas(tempImg);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        };
        
        tempImg.onerror = () => reject(new Error('Failed to load image'));
        tempImg.src = imgElement.src;
      } else {
        try {
          const result = extractFromCanvas(imgElement);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  /**
   * Extract image data from canvas
   */
  function extractFromCanvas(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const hasTransparency = checkTransparency(canvas);
    const format = hasTransparency ? 'png' : 'jpeg';
    
    const dataUrl = canvas.toDataURL(`image/${format}`, 1.0);
    
    return {
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
      format,
      hasTransparency
    };
  }

  /**
   * Check if image has transparency
   */
  function checkTransparency(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          return true; // Has transparent pixels
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch image with CORS handling
   */
  async function fetchImageWithCORS(url, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'omit',
        headers: {
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      
      const img = await loadImage(dataUrl);
      
      const format = detectFormatFromMime(blob.type) || detectFormatFromUrl(url);
      
      return {
        dataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format,
        hasTransparency: format === 'png' || format === 'webp'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Download via background script (bypasses CORS)
   */
  async function downloadViaBackground(url) {
    try {
      const response = await chromeApi.sendMessage({
        action: 'fetchImage',
        url: url
      });
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Background fetch failed');
      }
      
      const img = await loadImage(response.dataUrl);
      
      return {
        dataUrl: response.dataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: detectFormatFromUrl(url),
        hasTransparency: false // Assume no transparency for cross-origin
      };
    } catch (e) {
      throw new Error(`Background fetch failed: ${e.message}`);
    }
  }

  /**
   * Load image from URL/dataUrl
   */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  /**
   * Convert blob to data URL
   */
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Detect format from MIME type
   */
  function detectFormatFromMime(mimeType) {
    const formats = {
      'image/png': 'png',
      'image/jpeg': 'jpeg',
      'image/jpg': 'jpeg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    };
    return formats[mimeType] || null;
  }

  /**
   * Detect format from URL
   */
  function detectFormatFromUrl(url) {
    if (!url) return 'jpeg';
    
    const ext = url.split('.').pop().toLowerCase().split('?')[0];
    const formats = {
      'png': 'png',
      'jpg': 'jpeg',
      'jpeg': 'jpeg',
      'webp': 'webp',
      'gif': 'gif'
    };
    return formats[ext] || 'jpeg';
  }

  /**
   * Generate thumbnail from image
   */
  async function generateThumbnail(dataUrl, maxSize = 200) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailDataUrl);
        } catch (e) {
          reject(e);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = dataUrl;
    });
  }

  /**
   * Process lazy-loaded image with timeout
   */
  async function processLazyImage(imgElement, timeout = 3000) {
    return new Promise((resolve, reject) => {
      if (imgElement.complete && imgElement.naturalWidth > 0) {
        resolve();
        return;
      }
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Lazy load timeout'));
      }, timeout);
      
      function onLoad() {
        cleanup();
        resolve();
      }
      
      function onError() {
        cleanup();
        reject(new Error('Image failed to load'));
      }
      
      function cleanup() {
        clearTimeout(timeoutId);
        imgElement.removeEventListener('load', onLoad);
        imgElement.removeEventListener('error', onError);
      }
      
      imgElement.addEventListener('load', onLoad);
      imgElement.addEventListener('error', onError);
      
      imgElement.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
  }

  /**
   * Generate filename for image
   */
  function generateImageFilename(imgInfo, index, clipId) {
    const hash = hashString(imgInfo.src).substring(0, 6);
    const extension = imgInfo.format === 'png' ? 'png' : 
                     (imgInfo.format === 'webp' ? 'webp' : 'jpg');
    
    if (clipId) {
      return `${clipId}-img-${String(index).padStart(3, '0')}-${hash}.${extension}`;
    }
    
    return `img-${String(index).padStart(3, '0')}-${hash}.${extension}`;
  }

  /**
   * Simple string hash for filename generation
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get image info from element
   */
  function getImageInfo(imgElement) {
    if (!imgElement) return null;
    
    const src = imgElement.src || 
                imgElement.getAttribute('data-src') || 
                imgElement.getAttribute('data-original');
    
    if (!src) return null;
    
    return {
      src,
      alt: imgElement.alt || '',
      width: imgElement.naturalWidth || imgElement.width || 0,
      height: imgElement.naturalHeight || imgElement.height || 0,
      complete: imgElement.complete,
      format: detectFormatFromUrl(src)
    };
  }

  return {
    init,
    downloadImageSmart,
    downloadViaCanvas,
    fetchImageWithCORS,
    downloadViaBackground,
    generateThumbnail,
    processLazyImage,
    generateImageFilename,
    getImageInfo,
    checkTransparency,
    detectFormatFromUrl,
    detectFormatFromMime,
    loadImage,
    blobToDataUrl,
    destroy: () => {
      settings = {};
    }
  };
};
