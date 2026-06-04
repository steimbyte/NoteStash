/**
 * Link Extractor Module - Extract links from content
 */

export const createLinkExtractor = ({ bridge, eventBus, chromeApi, utils }) => {
  function extractLinks(element) {
    if (!element) return [];
    
    const links = [];
    const seen = new Set();
    
    const anchorElements = element.querySelectorAll('a[href]');
    
    for (const anchor of anchorElements) {
      const href = anchor.getAttribute('href');
      const text = anchor.textContent?.trim() || '';
      
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        continue;
      }
      
      const key = `${href}|${text}`;
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ url: href, text, title: anchor.title || '' });
      }
    }
    
    return links;
  }

  function formatLinksAsMarkdown(links) {
    if (!links?.length) return '';
    
    return links
      .map(link => `- [${link.text || link.url}](${link.url})`)
      .join('\n');
  }

  async function init() {
    console.log('[NoteStash] Link Extractor module initialized');
    return true;
  }

  return {
    init,
    extract: extractLinks,
    extractLinks,
    formatLinksAsMarkdown
  };
};
