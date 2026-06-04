/**
 * Gallery Component
 * Full image gallery with grid layout
 * 
 * @module content/modules/ui/components/gallery
 * @version 1.0.0
 * @license ISC
 */

export const createGallery = ({ bridge, eventBus, chromeApi, config, state, utils }) => {
  const logger = utils?.nsLog || console.log;
  let gallery = null;

  /**
   * Show image gallery
   * @param {Array} images - Array of image objects
   * @param {Object} options - Options
   */
  function show(images, options = {}) {
    if (!images || images.length === 0) return;

    const { title = `ðŸ“· ${images.length} Images` } = options;
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    createGalleryElement();

    const header = gallery.querySelector('.notestash-gallery-header h2');
    if (header) header.textContent = title;

    const grid = gallery.querySelector('.notestash-gallery-grid');
    grid.innerHTML = '';

    images.forEach((img, idx) => {
      const imgContainer = document.createElement('div');
      Object.assign(imgContainer.style, {
        aspectRatio: '1',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: `2px solid rgba(${accentRgb}, 0.3)`,
        position: 'relative',
        transition: 'all 0.2s ease'
      });

      const imgEl = document.createElement('img');
      imgEl.src = img.thumbnailDataUrl || img.dataUrl;
      Object.assign(imgEl.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: 'transform 0.3s ease'
      });

      imgContainer.addEventListener('mouseenter', () => {
        imgContainer.style.borderColor = `rgba(${accentRgb}, 0.6)`;
        imgContainer.style.transform = 'scale(1.02)';
        imgEl.style.transform = 'scale(1.1)';
      });

      imgContainer.addEventListener('mouseleave', () => {
        imgContainer.style.borderColor = `rgba(${accentRgb}, 0.3)`;
        imgContainer.style.transform = 'scale(1)';
        imgEl.style.transform = 'scale(1)';
      });

      imgContainer.addEventListener('click', () => {
        eventBus?.emit('gallery:image-click', { images, index: idx });
      });

      if (img.isScreenshot) {
        const badge = document.createElement('div');
        Object.assign(badge.style, {
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(16, 185, 129, 0.9)',
          color: 'white',
          fontSize: '11px',
          padding: '4px 8px',
          borderRadius: '6px',
          backdropFilter: 'blur(4px)'
        });
        badge.textContent = 'ðŸ“¸';
        imgContainer.appendChild(badge);
      }

      imgContainer.appendChild(imgEl);
      grid.appendChild(imgContainer);
    });

    document.body.appendChild(gallery);
    
    logger('[Gallery] Showing', images.length, 'images');
    eventBus?.emit('gallery:shown', { imageCount: images.length });
  }

  /**
   * Create the gallery DOM element
   */
  function createGalleryElement() {
    if (gallery) return;

    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    gallery = document.createElement('div');
    gallery.id = 'notestash-gallery';
    Object.assign(gallery.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px'
    });

    const header = document.createElement('div');
    header.className = 'notestash-gallery-header';
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      padding: '0 20px'
    });

    const title = document.createElement('h2');
    Object.assign(title.style, {
      margin: '0',
      color: 'white',
      fontSize: '24px',
      fontWeight: '600'
    });
    title.textContent = 'Gallery';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'âœ•';
    Object.assign(closeBtn.style, {
      background: `rgba(${accentRgb}, 0.2)`,
      border: `1px solid rgba(${accentRgb}, 0.4)`,
      color: 'white',
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    });

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = `rgba(${accentRgb}, 0.4)`;
      closeBtn.style.transform = 'scale(1.1)';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = `rgba(${accentRgb}, 0.2)`;
      closeBtn.style.transform = 'scale(1)';
    });

    closeBtn.addEventListener('click', hide);
    header.appendChild(closeBtn);

    gallery.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'notestash-gallery-grid';
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px',
      overflow: 'auto',
      flex: '1',
      padding: '20px'
    });

    gallery.appendChild(grid);

    gallery.addEventListener('click', (e) => {
      if (e.target === gallery) hide();
    });

    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') hide();
  }

  /**
   * Hide and remove gallery
   */
  function hide() {
    if (gallery) {
      document.removeEventListener('keydown', handleKeydown);
      gallery.remove();
      gallery = null;
    }
    
    logger('[Gallery] Hidden');
    eventBus?.emit('gallery:hidden');
  }

  /**
   * Check if gallery is visible
   * @returns {boolean}
   */
  function isVisible() {
    return !!gallery;
  }

  function init() {
    logger('[Gallery] Initialized');
    eventBus?.emit('module:initialized', { module: 'gallery' });
  }

  function destroy() {
    hide();
    logger('[Gallery] Destroyed');
  }

  return {
    init,
    show,
    hide,
    isVisible,
    destroy
  };
};
