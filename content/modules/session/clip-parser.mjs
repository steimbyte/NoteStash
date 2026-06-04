/**
 * Clip Parser Module - DEPRECATED: Use content-format.mjs instead
 * This module now acts as a thin wrapper around CONTENT_FORMAT
 * 
 * @deprecated Use content/modules/content/content-format.mjs
 * @module content/modules/session/clip-parser
 */

import CONTENT_FORMAT from '../content/content-format.mjs';

export const createClipParser = ({ bridge, eventBus, chromeApi, utils }) => {
  const CLIP_SEPARATOR = CONTENT_FORMAT.CLIP_SEPARATOR;

  /**
   * Parse clips from content
   * @deprecated Use CONTENT_FORMAT.parseClips instead
   */
  function parseClips(content) {
    return CONTENT_FORMAT.parseClips(content);
  }

  /**
   * Parse single clip
   * @deprecated Use CONTENT_FORMAT.parseSingleClip instead  
   */
  function parseSingleClip(rawContent, index) {
    return CONTENT_FORMAT.parseSingleClip(rawContent, index);
  }

  /**
   * Convert clips to markdown
   * Note: This rebuilds from parsed clips, may lose some metadata
   */
  function clipsToMarkdown(clips) {
    return clips.map(clip => {
      return CONTENT_FORMAT.buildClipEntry({
        clipId: clip.id,
        title: clip.title,
        url: clip.url,
        timestamp: clip.captured || new Date().toLocaleString('de-DE'),
        markdown: clip.fullText,
        snippetId: null,
        screenshotId: null,
        screenshotFormat: null,
        links: []
      });
    }).join(CLIP_SEPARATOR);
  }

  /**
   * Format a single clip
   * @deprecated Use CONTENT_FORMAT.buildClipEntry instead
   */
  function formatClip(content, url, title) {
    const timestamp = new Date().toLocaleString('de-DE');
    return CONTENT_FORMAT.buildClipEntry({
      clipId: Date.now().toString(36),
      snippetId: null,
      title: title || 'Untitled',
      url: url || window.location.href,
      timestamp,
      markdown: content,
      screenshotId: null,
      screenshotFormat: null,
      links: []
    });
  }

  async function init() {
    console.log('[NoteStash] Clip Parser module initialized (using CONTENT_FORMAT)');
    return true;
  }

  return {
    init,
    parseClips,
    parseSingleClip,
    clipsToMarkdown,
    formatClip,
    CLIP_SEPARATOR
  };
};
