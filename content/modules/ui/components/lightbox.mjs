/**
 * Lightbox Component
 * Full-screen image viewer with navigation
 * 
 * @module content/modules/ui/components/lightbox
 * @version 1.0.0
 * @license ISC
 */

export const createLightbox = ({ bridge, eventBus, chromeApi, config, state, utils }) => {
  const logger = utils?.nsLog || console.log;
  let lightbox = null;
  let currentImages = [];
  let currentIndex = 0;

  /**
   * Show image in lightbox
   * @param {Object|Array} imageOrImages - Single image or array of images
   * @param {number} startIndex - Starting index if array provided
   */
  function show(imageOrImages, startIndex = 0) {
    if (Array.isArray(imageOrImages)) {
      currentImages = imageOrImages;
      currentIndex = startIndex;
    } else {
      currentImages = [imageOrImages];
      currentIndex = 0;
    }

    createLightboxElement();
    renderImage();
    
    logger('[Lightbox] Showing image', currentIndex + 1, 'of', currentImages.length);
    eventBus?.emit('lightbox:shown', { index: currentIndex, total: currentImages.length });
  }

  /**
   * Create the lightbox DOM element
   */
  function createLightboxElement() {
    if (lightbox) return;

    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';

    lightbox = document.createElement('div');
    lightbox.id = 'notestash-lightbox';
    Object.assign(lightbox.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'zoom-out'
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) hide();
    });

    if (currentImages.length > 1) {
      const prevBtn = createNavButton('â—€', -1, accentRgb);
      const nextBtn = createNavButton('â–¶', 1, accentRgb);
      lightbox.appendChild(prevBtn);
      lightbox.appendChild(nextBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'âœ•';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '20px',
      right: '20px',
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
      transition: 'all 0.3s ease',
      zIndex: '10'
    });
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = `rgba(${accentRgb}, 0.4)`;
      closeBtn.style.transform = 'scale(1.1)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = `rgba(${accentRgb}, 0.2)`;
      closeBtn.style.transform = 'scale(1)';
    });
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hide();
    });
    
    lightbox.appendChild(closeBtn);

    if (currentImages.length > 1) {
      const counter = document.createElement('div');
      counter.id = 'notestash-lightbox-counter';
      Object.assign(counter.style, {
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: `rgba(${accentRgb}, 0.2)`,
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        backdropFilter: 'blur(8px)'
      });
      lightbox.appendChild(counter);
    }

    document.addEventListener('keydown', handleKeydown);

    document.body.appendChild(lightbox);
  }

  /**
   * Create navigation button
   * @param {string} label - Button label
   * @param {number} direction - -1 for prev, 1 for next
   * @param {string} accentRgb - Accent color
   * @returns {HTMLElement}
   */
  function createNavButton(label, direction, accentRgb) {
    const btn = document.createElement('button');
    btn.innerHTML = label;
    Object.assign(btn.style, {
      position: 'absolute',
      [direction === -1 ? 'left' : 'right']: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: `rgba(${accentRgb}, 0.2)`,
      border: `1px solid rgba(${accentRgb}, 0.4)`,
      color: 'white',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      zIndex: '10'
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = `rgba(${accentRgb}, 0.4)`;
      btn.style.transform = 'translateY(-50%) scale(1.1)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = `rgba(${accentRgb}, 0.2)`;
      btn.style.transform = 'translateY(-50%) scale(1)';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(direction);
    });

    return btn;
  }

  /**
   * Render current image
   */
  function renderImage() {
    const img = currentImages[currentIndex];
    if (!img) return;

    const existingImg = lightbox.querySelector('img');
    if (existingImg) existingImg.remove();

    const imgEl = document.createElement('img');
    imgEl.src = img.fullDataUrl || img.dataUrl;
    imgEl.alt = img.alt || 'Image';
    Object.assign(imgEl.style, {
      maxWidth: '90%',
      maxHeight: '85%',
      objectFit: 'contain',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      cursor: 'default'
    });

    imgEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentImages.length > 1) {
        navigate(1);
      }
    });

    const counter = lightbox.querySelector('#notestash-lightbox-counter');
    if (counter) {
      lightbox.insertBefore(imgEl, counter);
    } else {
      lightbox.appendChild(imgEl);
    }

    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
    }
  }

  /**
   * Navigate to next/prev image
   * @param {number} direction - -1 for prev, 1 for next
   */
  function navigate(direction) {
    currentIndex += direction;
    
    if (currentIndex < 0) currentIndex = currentImages.length - 1;
    if (currentIndex >= currentImages.length) currentIndex = 0;
    
    renderImage();
    eventBus?.emit('lightbox:navigate', { index: currentIndex });
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (!lightbox) return;
    
    switch (e.key) {
      case 'Escape':
        hide();
        break;
      case 'ArrowLeft':
        if (currentImages.length > 1) navigate(-1);
        break;
      case 'ArrowRight':
        if (currentImages.length > 1) navigate(1);
        break;
    }
  }

  /**
   * Hide and destroy lightbox
   */
  function hide() {
    if (lightbox) {
      document.removeEventListener('keydown', handleKeydown);
      lightbox.remove();
      lightbox = null;
    }
    currentImages = [];
    currentIndex = 0;
    
    logger('[Lightbox] Hidden');
    eventBus?.emit('lightbox:hidden');
  }

  /**
   * Check if lightbox is visible
   * @returns {boolean}
   */
  function isVisible() {
    return !!lightbox;
  }

  function init() {
    logger('[Lightbox] Initialized');
    eventBus?.emit('module:initialized', { module: 'lightbox' });
  }

  function destroy() {
    hide();
    logger('[Lightbox] Destroyed');
  }

  return {
    init,
    show,
    hide,
    navigate,
    isVisible,
    destroy
  };
};
