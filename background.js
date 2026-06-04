// Handle extension icon click - open settings in new tab
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('options.html')
  });
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'clip-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'clip' });
      }
    });
  }
});

// Listen for storage changes to instantly toggle floating button visibility
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.showFloatingButton) {
    const show = changes.showFloatingButton.newValue !== false;
    // Send message to all tabs to show/hide the floating button
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'toggleFloatingButton', 
            show: show 
          }).catch(() => {});
        }
      });
    });
  }
});

// Extract text from ALL frames in a tab (including cross-origin)
async function extractTextFromAllFrames(tabId) {
  const results = [];
  
  try {
    // Inject script into ALL frames
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: () => {
        // Get all visible text from this frame
        function getVisibleText() {
          const texts = [];
          const walker = document.createTreeWalker(
            document.body || document.documentElement,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName;
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH'].includes(tag)) {
                  return NodeFilter.FILTER_REJECT;
                }
                const text = node.textContent.trim();
                if (!text) return NodeFilter.FILTER_REJECT;
                
                try {
                  const style = window.getComputedStyle(parent);
                  if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                  }
                } catch(e) {}
                
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );
          
          while (walker.nextNode()) {
            const t = walker.currentNode.textContent.trim();
            if (t) texts.push(t);
          }
          
          return texts.join('\n');
        }
        
        return {
          url: window.location.href,
          text: getVisibleText(),
          title: document.title || ''
        };
      }
    });
    
    // Collect all results
    for (const result of injectionResults) {
      if (result.result && result.result.text && result.result.text.length > 20) {
        results.push(result.result);
      }
    }
  } catch (e) {
    console.log('Frame injection failed:', e);
  }
  
  return results;
}

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
  
  // Capture screenshot
  if (request.action === 'captureScreenshot') {
    // Get screenshot settings
    chrome.storage.sync.get(['screenshotFormat', 'screenshotQuality'], (settings) => {
      const format = settings.screenshotFormat || 'jpeg';
      const quality = settings.screenshotQuality || 80;
      
      const captureOptions = { format: format };
      if (format === 'jpeg') {
        captureOptions.quality = quality;
      }
      
      chrome.tabs.captureVisibleTab(null, captureOptions, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, dataUrl: dataUrl, format: format });
        }
      });
    });
    return true;
  }
  
  // Extract text from all frames
  if (request.action === 'extractAllFrames') {
    (async () => {
      try {
        const results = await extractTextFromAllFrames(sender.tab.id);
        sendResponse({ success: true, results: results });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
  
  // Handle download request
  if (request.action === 'download') {
    const { content, filename } = request;
    
    if (!content || content.length === 0) {
      sendResponse({ success: false, error: 'No content to download' });
      return true;
    }
    
    try {
      // Convert content to base64 data URL directly
      const base64 = btoa(unescape(encodeURIComponent(content)));
      const dataUrl = `data:text/markdown;charset=utf-8;base64,${base64}`;
      
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId: downloadId });
        }
      });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }
  
  // Download screenshot image
  if (request.action === 'downloadScreenshot') {
    const { dataUrl, filename } = request;
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true;
  }
  
  // Download ZIP file
  if (request.action === 'downloadZip') {
    const { url, filename } = request;
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true;
  }
  
  // Legacy: clearNotes / getNotesInfo handlers removed.
  // They used chrome.storage.local directly for noteContent/clipCount,
  // which is no longer the storage path (sessionManager is the source of truth).
  // The new options.js clearNotes handles clearing via sessionManager.

  // Fetch cross-origin image
  if (request.action === 'fetchImage') {
    (async () => {
      try {
        const response = await fetch(request.url, {
          method: 'GET',
          headers: {
            'Accept': 'image/*'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
          sendResponse({
            success: true,
            dataUrl: reader.result
          });
        };

        reader.onerror = () => {
          sendResponse({
            success: false,
            error: 'Failed to read image data'
          });
        };

        reader.readAsDataURL(blob);
      } catch (e) {
        sendResponse({
          success: false,
          error: e.message
        });
      }
    })();
    return true;
  }
});