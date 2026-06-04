/**
 * Auto Capture Module - Automatic page capture with performance optimizations
 */

export const createAutoCapture = ({ bridge, eventBus, chromeApi, config, state, clipCapture, recordingMode }) => {
  let urlChangeInterval = null;
  let lastUrl = window.location.href;
  let visibilityHandler = null;
  let scrollHandler = null;
  let lastScrollY = window.scrollY;
  let scrollTimeout = null;
  const SCROLL_THRESHOLD = 500; // Minimum 500px scroll change
  const SCROLL_DELAY = 3000; // 3 seconds after scroll stops

  function init() {
    startUrlMonitoring();
    
    setupVisibilityTracking();
    
    setupScrollTracking();
  }
  
  function setupScrollTracking() {
    scrollHandler = () => {
      if (!recordingMode?.isRecording()) return;
      
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);
      
      if (scrollDelta >= SCROLL_THRESHOLD) {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(() => {
          if (recordingMode?.isRecording()) {
            clipCapture?.capture();
            state?.set('lastCaptureTime', Date.now());
            lastScrollY = currentScrollY;
          }
        }, SCROLL_DELAY);
      }
    };
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  function startUrlMonitoring() {
    urlChangeInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        handleUrlChange(currentUrl);
        lastUrl = currentUrl;
      }
    }, 1000);
  }

  async function handleUrlChange(newUrl) {
    if (!recordingMode?.isRecording()) return;

    eventBus?.emit('auto-capture:url-changed', { url: newUrl });

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (window.location.href === newUrl) {
      await clipCapture?.capture();
      state?.set('lastCaptureTime', Date.now());
      
      eventBus?.emit('auto-capture:page-captured', { url: newUrl });
    }
  }

  function setupVisibilityTracking() {
    visibilityHandler = () => {
      if (document.visibilityState === 'visible' && recordingMode?.isRecording()) {
        const lastCapture = state?.get('lastCaptureTime') || 0;
        const timeSinceLastCapture = Date.now() - lastCapture;
        
        if (timeSinceLastCapture > 5000) {
          setTimeout(() => {
            clipCapture?.capture();
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
  }

  function stop() {
    if (urlChangeInterval) {
      clearInterval(urlChangeInterval);
      urlChangeInterval = null;
    }
  }

  function destroy() {
    stop();
    
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
    
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
    }
    
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
  }

  return {
    init,
    stop,
    destroy
  };
};
