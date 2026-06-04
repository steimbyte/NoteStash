/**
 * Thumbnail Grid Component
 * Creates a grid of image thumbnails for clip cards
 * 
 * @module content/modules/ui/components/thumbnail-grid
 * @version 1.0.0
 * @license ISC
 */

export const createThumbnailGrid = ({ bridge, eventBus, chromeApi, config, state, utils }) => {
  const logger = utils?.nsLog || console.log;

  /**
   * Create a thumbnail grid for images
   * @param {Array} images - Array of image objects
   * @param {Object} options - Options
   * @param {Function} options.onImageClick - Callback when image is clicked
   * @param {number} options.maxDisplay - Max images to display before "+N more"
   * @returns {HTMLElement} The thumbnail grid element
   */
  function create(images, options = {}) {
    if (!images || images.length === 0) return null;

    const { onImageClick, maxDisplay = 4 } = options;
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: '8px',
      marginTop: '10px',
      marginBottom: '10px',
      maxHeight: '200px',
      overflow: 'auto'
    });

    const displayImages = images.slice(0, maxDisplay);
    const remainingCount = images.length - maxDisplay;

    displayImages.forEach((img, idx) => {
      const thumb = createThumbnail(img, accentRgb, theme, onImageClick);
      container.appendChild(thumb);
    });

    if (remainingCount > 0) {
      const more = createMoreIndicator(remainingCount, accentRgb, theme);
      if (onImageClick) {
        more.addEventListener('click', () => {
          eventBus?.emit('thumbnail-grid:view-all', { images });
        });
      }
      container.appendChild(more);
    }

    return container;
  }

  /**
   * Create a single thumbnail element
   * @param {Object} img - Image data
   * @param {string} accentRgb - Accent color RGB
   * @param {Object} theme - Theme object
   * @param {Function} onClick - Click handler
   * @returns {HTMLElement}
   */
  function createThumbnail(img, accentRgb, theme, onClick) {
    const thumb = document.createElement('div');
    Object.assign(thumb.style, {
      aspectRatio: '1',
      borderRadius: '8px',
      overflow: 'hidden',
      cursor: 'pointer',
      border: `2px solid rgba(${accentRgb}, 0.3)`,
      backgroundImage: `url(${img.thumbnailDataUrl || img.dataUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transition: 'all 0.2s ease',
      position: 'relative'
    });

    thumb.addEventListener('mouseenter', () => {
      thumb.style.borderColor = `rgba(${accentRgb}, 0.6)`;
      thumb.style.transform = 'scale(1.02)';
    });

    thumb.addEventListener('mouseleave', () => {
      thumb.style.borderColor = `rgba(${accentRgb}, 0.3)`;
      thumb.style.transform = 'scale(1)';
    });

    if (onClick) {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick(img);
      });
    }

    if (img.isScreenshot) {
      const badge = document.createElement('div');
      Object.assign(badge.style, {
        position: 'absolute',
        top: '4px',
        right: '4px',
        background: 'rgba(16, 185, 129, 0.9)',
        color: 'white',
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '4px',
        backdropFilter: 'blur(4px)'
      });
      badge.textContent = 'ðŸ“¸';
      thumb.appendChild(badge);
    }

    return thumb;
  }

  /**
   * Create "+N more" indicator
   * @param {number} count - Number of additional images
   * @param {string} accentRgb - Accent color RGB
   * @param {Object} theme - Theme object
   * @returns {HTMLElement}
   */
  function createMoreIndicator(count, accentRgb, theme) {
    const more = document.createElement('div');
    more.textContent = `+${count}`;
    Object.assign(more.style, {
      aspectRatio: '1',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `rgba(${accentRgb}, 0.15)`,
      color: theme.text || '#e2e8f0',
      fontSize: '14px',
      fontWeight: '600',
      border: `2px solid rgba(${accentRgb}, 0.3)`,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    });

    more.addEventListener('mouseenter', () => {
      more.style.background = `rgba(${accentRgb}, 0.25)`;
      more.style.transform = 'scale(1.02)';
    });

    more.addEventListener('mouseleave', () => {
      more.style.background = `rgba(${accentRgb}, 0.15)`;
      more.style.transform = 'scale(1)';
    });

    return more;
  }

  /**
   * Create compact thumbnail row for inline display
   * @param {Array} images - Array of image objects
   * @param {Object} options - Options
   * @returns {HTMLElement}
   */
  function createCompact(images, options = {}) {
    if (!images || images.length === 0) return null;

    const { onImageClick } = options;
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';

    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      gap: '6px',
      marginTop: '8px',
      flexWrap: 'wrap'
    });

    images.slice(0, 3).forEach(img => {
      const thumb = document.createElement('div');
      Object.assign(thumb.style, {
        width: '60px',
        height: '60px',
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: `2px solid rgba(${accentRgb}, 0.3)`,
        backgroundImage: `url(${img.thumbnailDataUrl || img.dataUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'all 0.2s ease'
      });

      thumb.addEventListener('mouseenter', () => {
        thumb.style.borderColor = `rgba(${accentRgb}, 0.6)`;
        thumb.style.transform = 'scale(1.05)';
      });

      thumb.addEventListener('mouseleave', () => {
        thumb.style.borderColor = `rgba(${accentRgb}, 0.3)`;
        thumb.style.transform = 'scale(1)';
      });

      if (onImageClick) {
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          onImageClick(img);
        });
      }

      container.appendChild(thumb);
    });

    if (images.length > 3) {
      const more = document.createElement('div');
      more.textContent = `+${images.length - 3}`;
      Object.assign(more.style, {
        width: '60px',
        height: '60px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `rgba(${accentRgb}, 0.15)`,
        color: state?.theme?.text || '#e2e8f0',
        fontSize: '12px',
        fontWeight: '600',
        border: `2px solid rgba(${accentRgb}, 0.3)`,
        cursor: 'pointer'
      });
      container.appendChild(more);
    }

    return container;
  }

  function init() {
    logger('[ThumbnailGrid] Initialized');
    eventBus?.emit('module:initialized', { module: 'thumbnailGrid' });
  }

  function destroy() {
    logger('[ThumbnailGrid] Destroyed');
  }

  return {
    init,
    create,
    createCompact,
    destroy
  };
};
