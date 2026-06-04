/**
 * XPath Resolver Module
 * Detects absolute XPath expressions in text and resolves them
 * to the actual DOM node's text content.
 *
 * Example: "/html/body/div[2]/div[4]/div/section[2]/div/div[3]/div[2]/div[1]/div/ul/li[3]/p/span[2]" â†’ resolves to that
 * element's textContent, replacing the path in the output.
 */

const ABSOLUTE_XPATH_REGEX = /(\/html\/body(?:\/[a-zA-Z][a-zA-Z0-9-]*(?:\[[^\]\n]*\])?)+)/g;

export const createXPathResolver = ({ bridge, eventBus, chromeApi, config, utils }) => {
  const logger = utils?.nsLog || console.log;
  let stats = { detected: 0, resolved: 0, failed: 0 };

  function isLikelyXPath(text) {
    if (!text || typeof text !== 'string') return false;
    if (text.length < 12) return false;
    ABSOLUTE_XPATH_REGEX.lastIndex = 0;
    return ABSOLUTE_XPATH_REGEX.test(text);
  }

  function resolveNode(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (e) {
      return null;
    }
  }

  function resolveText(xpath) {
    const node = resolveNode(xpath);
    if (!node) return '';
    return (node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function resolveAllInText(text) {
    if (!isLikelyXPath(text)) return text;
    ABSOLUTE_XPATH_REGEX.lastIndex = 0;
    const matches = [];
    let m;
    while ((m = ABSOLUTE_XPATH_REGEX.exec(text)) !== null) {
      matches.push({ xpath: m[0], index: m.index });
    }
    if (matches.length === 0) return text;
    stats.detected += matches.length;
    const replacements = [];
    for (const { xpath } of matches) {
      const resolved = resolveText(xpath);
      if (resolved) {
        stats.resolved += 1;
        replacements.push({ xpath, resolved });
      } else {
        stats.failed += 1;
        logger('[XPathResolver] Failed to resolve:', xpath);
      }
    }
    let result = text;
    for (const r of replacements) {
      result = result.split(r.xpath).join(r.resolved);
    }
    return result;
  }

  function getStats() {
    return { ...stats };
  }

  function resetStats() {
    stats = { detected: 0, resolved: 0, failed: 0 };
  }

  async function init() {
    if (utils?.isDebug?.()) {
      logger('[NoteStash] XPath Resolver module initialized');
    }
    return true;
  }

  return {
    init,
    isLikelyXPath,
    resolveNode,
    resolveText,
    resolveAllInText,
    getStats,
    resetStats,
    ABSOLUTE_XPATH_REGEX
  };
};

export default createXPathResolver;
