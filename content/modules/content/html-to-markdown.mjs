/**
 * HTML to Markdown Module - Convert HTML to Markdown with image handling
 * 
 * Features:
 * - Comprehensive HTML to Markdown conversion
 * - Image extraction with sequential markers
 * - Table support
 * - Code block preservation
 * - Smart link handling
 * - Shadow DOM support
 * - NoteStash UI filtering
 * - Content filter modes (lean/strict)
 */

export const createHtmlToMarkdown = ({ bridge, eventBus, chromeApi, config, utils, xpathResolver }) => {
  let imageCounter = 0;
  const extractedImages = [];
  
  const leanSelectors = [
    'nav', 'navigation', 'navbar', 'menu', 'sidebar', 'aside',
    'footer', 'header', 'banner', 'advertisement', 'ad-', 'ads-',
    'cookie', 'consent', 'popup', 'modal', 'overlay',
    'social', 'share', 'like', 'tweet', 'follow',
    'comment', 'comments', 'disqus', 'discussion',
    'related', 'recommendation', 'suggested', 'popular',
    'subscribe', 'newsletter', 'signup', 'login', 'register'
  ];
  
  const strictSelectors = [
    ...leanSelectors,
    'sidebar', 'widget', 'widgets', 'meta', 'metadata',
    'breadcrumb', 'breadcrumbs', 'pagination', 'pager',
    'tag', 'tags', 'category', 'categories', 'taxonomy',
    'author', 'author-box', 'bio', 'about-author'
  ];
  
  const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'NAV', 'HEADER', 'FOOTER', 
                    'ASIDE', 'IFRAME', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];
  
  const notestashIds = ['notestash-clip', 'notestash-popup', 'notestash-cleaner-popup', 
                        'notestash-toast', 'notestash-refresh-msg', 'notestash-html-modal',
                        'notestash-floating-buttons', 'notestash-arc-menu', 'notestash-processing-overlay'];
  
  const notestashPhrases = [
    'saved clips', 'ai note cleaner', 'merge and clean your clips',
    'clean with ai', 'download original', 'original clips', 'cleaned note',
    'api: not checked', 'request: idle', 'buy me a coffee', 'â˜• support',
    'notestash-', 'configure ai settings'
  ];

  /**
   * Initialize module
   */
  async function init() {
    console.log('[NoteStash] HTML to Markdown module initialized');
    return true;
  }

  /**
   * Convert HTML element to Markdown
   * @param {HTMLElement} element - Root element to convert
   * @param {Object} options - Conversion options
   * @returns {Object} { markdown, images }
   */
  function convert(element, options = {}) {
    if (!element) {
      return { markdown: '', images: [], imageCount: 0 };
    }
    
    imageCounter = 0;
    extractedImages.length = 0;

    const { 
      collectImages = true,
      imagePrefix = '',
      contentFilterMode = config?.getSetting?.('contentFilterMode') || 'lean'
    } = options;

    let markdown = processNode(element, 0, { collectImages, imagePrefix, contentFilterMode });

    markdown = cleanupWhitespace(markdown);

    return {
      markdown,
      images: [...extractedImages],
      imageCount: imageCounter
    };
  }

  /**
   * Process a single node recursively
   */
  function processNode(node, depth = 0, options = {}) {
    if (!node || depth > 100) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (xpathResolver?.isLikelyXPath?.(text)) {
        return xpathResolver.resolveAllInText(text);
      }
      return text;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      return processElement(node, depth, options);
    }

    return '';
  }

  /**
   * Check if element should be skipped
   */
  function shouldSkip(element, contentFilterMode = 'lean') {
    if (!element || !element.tagName) return false;
    
    if (skipTags.includes(element.tagName)) return true;
    
    const className = (element.className || '').toString().toLowerCase();
    const id = (element.id || '').toLowerCase();
    const role = (element.getAttribute('role') || '').toLowerCase();
    
    if (notestashIds.includes(id)) return true;
    
    let parent = element;
    while (parent) {
      const parentId = (parent.id || '').toLowerCase();
      if (notestashIds.includes(parentId)) return true;
      const parentClass = (parent.className || '').toString().toLowerCase();
      if (parentClass.includes('notestash')) return true;
      parent = parent.parentElement;
    }
    
    const textContent = (element.textContent || '').slice(0, 200).toLowerCase();
    for (const phrase of notestashPhrases) {
      if (textContent.includes(phrase)) return true;
    }
    
    const navClasses = contentFilterMode === 'strict' ? strictSelectors : leanSelectors;
    
    for (const nav of navClasses) {
      if (className.includes(nav) || id.includes(nav)) return true;
    }
    
    if (['navigation', 'banner', 'complementary', 'contentinfo'].includes(role)) return true;
    
    try {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
    } catch(e) {}
    
    return false;
  }

  /**
   * Process an element node
   */
  function processElement(element, depth, options) {
    const tag = element.tagName;
    const { collectImages, imagePrefix, contentFilterMode } = options;

    if (shouldSkip(element, contentFilterMode)) {
      return '';
    }

    let shadowContent = '';
    if (element.shadowRoot) {
      shadowContent = processNode(element.shadowRoot, depth + 1, options);
    }

    switch (tag) {
      case 'H1': return '\n\n# ' + processChildren(element, depth, options) + '\n\n';
      case 'H2': return '\n\n## ' + processChildren(element, depth, options) + '\n\n';
      case 'H3': return '\n\n### ' + processChildren(element, depth, options) + '\n\n';
      case 'H4': return '\n\n#### ' + processChildren(element, depth, options) + '\n\n';
      case 'H5': return '\n\n##### ' + processChildren(element, depth, options) + '\n\n';
      case 'H6': return '\n\n###### ' + processChildren(element, depth, options) + '\n\n';
      
      case 'STRONG':
      case 'B': return '**' + processChildren(element, depth, options) + '**';
      case 'EM':
      case 'I': return '*' + processChildren(element, depth, options) + '*';
      case 'U': return '<u>' + processChildren(element, depth, options) + '</u>';
      case 'S':
      case 'STRIKE':
      case 'DEL': return '~~' + processChildren(element, depth, options) + '~~';
      case 'CODE': {
        if (element.parentElement?.tagName === 'PRE') {
          return processChildren(element, depth, options);
        }
        return '`' + processChildren(element, depth, options) + '`';
      }
      case 'MARK': return '==' + processChildren(element, depth, options) + '==';
      
      case 'PRE': {
        const code = element.querySelector('code');
        const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
        const text = (code || element).textContent || '';
        return '\n\n```' + lang + '\n' + text.trim() + '\n```\n\n';
      }
      
      case 'UL':
      case 'OL': return '\n' + processList(element, depth, options, tag === 'OL') + '\n';
      case 'LI': {
        const parent = element.parentElement;
        if (parent?.tagName === 'OL') {
          const index = Array.from(parent.children).indexOf(element) + 1;
          return index + '. ' + processChildren(element, depth, options).trim() + '\n';
        }
        return '- ' + processChildren(element, depth, options).trim() + '\n';
      }
      
      case 'A': {
        const href = element.getAttribute('href') || '';
        const text = processChildren(element, depth, options).trim() || '';
        if (href && text && !href.startsWith('javascript:')) {
          try {
            const fullHref = href.startsWith('http') ? href : new URL(href, window.location.href).href;
            return '[' + text + '](' + fullHref + ')';
          } catch(e) {
            return text;
          }
        }
        return text;
      }
      
      case 'IMG': {
        if (!collectImages) return '';
        
        const alt = element.getAttribute('alt') || 'image';
        
        const highResAttrs = [
          'data-original', 'data-hi-res-src', 'data-full-src', 'data-large-src',
          'data-src', 'data-lazy-src', 'data-actualsrc', 'data-srcset', 'data-url', 'src'
        ];
        
        let bestSrc = '';
        for (const attr of highResAttrs) {
          const val = element.getAttribute(attr);
          if (val && val.length > 10 && !val.includes('placeholder') && !val.includes('base64')) {
            bestSrc = val;
            break;
          }
        }
        
        const src = bestSrc || element.getAttribute('src') || '';
        if (!src) return '';
        
        let fullSrc;
        try {
          fullSrc = src.startsWith('http') ? src : new URL(src, window.location.href).href;
        } catch(e) {
          return '';
        }
        
        if (fullSrc.startsWith('data:')) {
          return '![' + alt + '](' + fullSrc + ')';
        }
        
        const width = element.naturalWidth || element.width || 0;
        const height = element.naturalHeight || element.height || 0;
        
        if (width > 0 && height > 0 && (width < 100 || height < 100)) {
          return '';
        }
        
        imageCounter++;
        const marker = imagePrefix + `__IMG_${String(imageCounter).padStart(3, '0')}__`;
        
        extractedImages.push({
          marker: marker,
          src: fullSrc,
          alt: alt,
          index: imageCounter,
          width: width,
          height: height,
          element: element
        });
        
        return '![' + alt + '](' + marker + ')';
      }
      
      case 'TABLE': return processTable(element, options);
      
      case 'P': return '\n\n' + processChildren(element, depth, options) + '\n\n';
      case 'BR': return '\n';
      case 'HR': return '\n\n---\n\n';
      
      case 'BLOCKQUOTE': return '\n\n> ' + processChildren(element, depth, options).trim().replace(/\n/g, '\n> ') + '\n\n';
      
      case 'DIV':
      case 'SPAN':
      case 'SECTION':
      case 'ARTICLE':
      case 'MAIN':
      case 'HEADER':
      case 'FOOTER':
      case 'ASIDE':
      case 'NAV':
        return processChildren(element, depth, options);
      
      default:
        return processChildren(element, depth, options);
    }
  }

  /**
   * Process all children of an element
   */
  function processChildren(element, depth, options) {
    let result = '';
    element.childNodes.forEach(child => {
      result += processNode(child, depth + 1, options);
    });
    return result;
  }

  /**
   * Process a list
   */
  function processList(element, depth, options, isOrdered) {
    let result = '';
    let index = 1;
    
    element.childNodes.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'LI') {
        const prefix = isOrdered ? (index++) + '. ' : '- ';
        const content = processChildren(child, depth, options).trim();
        
        let nestedList = '';
        child.childNodes.forEach(nested => {
          if (nested.nodeType === Node.ELEMENT_NODE && 
              (nested.tagName === 'UL' || nested.tagName === 'OL')) {
            nestedList += '\n' + processList(nested, depth + 1, options, nested.tagName === 'OL');
          }
        });
        
        const indent = '  '.repeat(depth);
        result += indent + prefix + content + nestedList + '\n';
      }
    });
    
    return result;
  }

  /**
   * Process a table
   */
  function processTable(table, options) {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';
    
    let markdown = '\n\n';
    let isFirstRow = true;
    
    rows.forEach((row, rowIdx) => {
      const cells = row.querySelectorAll('th, td');
      const cellTexts = Array.from(cells).map(c => {
        return (c.textContent || '').trim();
      });
      
      markdown += '| ' + cellTexts.join(' | ') + ' |\n';
      
      if (isFirstRow) {
        markdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
        isFirstRow = false;
      }
    });
    
    return markdown + '\n';
  }

  /**
   * Clean up excessive whitespace
   */
  function cleanupWhitespace(text) {
    return text
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .replace(/[ \t]+\n/g, '\n')   // Remove trailing whitespace
      .replace(/\n[ \t]+/g, '\n')   // Remove leading whitespace
      .trim();
  }

  /**
   * Get extracted images
   */
  function getExtractedImages() {
    return [...extractedImages];
  }

  /**
   * Replace image markers with actual URLs/filenames
   */
  function replaceImageMarkers(markdown, imageMap) {
    let result = markdown;
    
    for (const [marker, info] of Object.entries(imageMap)) {
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedMarker}\\)`, 'g');
      result = result.replace(regex, `![${info.alt || 'image'}](${info.filename || info.src || info})`);
    }
    
    return result;
  }

  /**
   * Reset module state
   */
  function reset() {
    imageCounter = 0;
    extractedImages.length = 0;
  }

  return {
    init,
    convert,
    getExtractedImages,
    replaceImageMarkers,
    shouldSkip,
    cleanupWhitespace,
    reset,
    destroy: () => {
      reset();
    }
  };
};
