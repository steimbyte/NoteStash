/**
 * Filter Modes Module - lean/strict content filtering
 */

export const createFilterModes = ({ bridge, eventBus, chromeApi, config }) => {
  const leanSelectors = [
    'article', 'main', '[role="main"]',
    '.content', '.post', '.entry'
  ];

  const strictSelectors = [
    'body'
  ];

  function getSelectors(mode) {
    return mode === 'strict' ? strictSelectors : leanSelectors;
  }

  function findContentRoot(document, mode = 'lean') {
    const selectors = getSelectors(mode);
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    return document.body;
  }

  function shouldSkipElement(element, mode = 'lean') {
    if (mode === 'strict') return false;
    
    const skipTags = ['nav', 'header', 'footer', 'aside', 'script', 'style'];
    if (skipTags.includes(element.tagName?.toLowerCase())) {
      return !element.querySelector('article, main');
    }
    
    return false;
  }

  async function init() {
    console.log('[NoteStash] Filter Modes module initialized');
    return true;
  }

  return {
    init,
    getSelectors,
    findContentRoot,
    shouldSkipElement
  };
};
