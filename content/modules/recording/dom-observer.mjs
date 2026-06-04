/**
 * DOM Observer Module - SPA navigation detection
 */

export const createDomObserver = ({ bridge, eventBus, state, recordingMode, clipCapture }) => {
  let observer = null;
  let lastUrl = window.location.href;
  let navigationTimeout = null;

  function init() {
    monitorUrlChanges();
    
    observeDomChanges();
  }

  function monitorUrlChanges() {
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        handleNavigation(currentUrl);
        lastUrl = currentUrl;
      }
    }, 500);

    window.addEventListener('popstate', () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        handleNavigation(currentUrl);
        lastUrl = currentUrl;
      }
    });
  }

  function observeDomChanges() {
    observer = new MutationObserver((mutations) => {
      if (!recordingMode?.isRecording()) return;

      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }

      navigationTimeout = setTimeout(() => {
        const hasSignificantChanges = mutations.some(m => 
          m.addedNodes.length > 0 && 
          !isMinorChange(m)
        );

        if (hasSignificantChanges) {
          eventBus?.emit('dom:significant-change', { url: window.location.href });
        }
      }, 2000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  function handleNavigation(newUrl) {
    eventBus?.emit('navigation:url-changed', { url: newUrl, previousUrl: lastUrl });

    if (recordingMode?.isRecording()) {
      setTimeout(() => {
        clipCapture?.capture();
      }, 1500); // Wait for page to settle
    }
  }

  function isMinorChange(mutation) {
    const minorSelectors = ['.loading', '.spinner', '.tooltip', '[class*="loading"]'];
    
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node;
        if (minorSelectors.some(sel => element.matches?.(sel))) {
          return true;
        }
      }
    }
    
    return false;
  }

  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }
  }

  return {
    init,
    destroy
  };
};
