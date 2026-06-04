export const CONTENT_FORMAT = {
  CLIP_SEPARATOR: '\n\n---\n\n',
  
  PATTERNS: {
    header: /(?:<!--\s*clip-id:\s*[a-z0-9]+\s*-->\n)?##\s+(.+)\n\n\[([^\]]+)\]\(([^)]+)\)\n\n/,
    clipId: /<!--\s*clip-id:\s*([a-z0-9]+)\s*-->/i,
    snippetId: /\*\*Snippet-ID:\*\*\s*(\S+)/,
    screenshot: /!\[Screenshot[^\]]*\]\(attachments\/screenshot-([^.]+)\.([a-z]+)\)/i,
    linksHeader: /^### Links Found$/m
  },

  buildClipEntry({ clipId, snippetId, title, url, timestamp, markdown, screenshotId, screenshotFormat, links, clipImages }) {
    
    const safeTitle = this.sanitizeTitle(title);
    
    let entry = this.CLIP_SEPARATOR;
    entry += `<!-- clip-id: ${clipId} -->\n`;
    entry += `## ${safeTitle}\n\n`;
    entry += `[${timestamp}](${url})\n\n`;
    
    if (snippetId) {
      entry += `**Snippet-ID:** ${snippetId}\n\n`;
    }
    
    if (screenshotId && screenshotFormat) {
      entry += `![Screenshot](attachments/screenshot-${screenshotId}.${screenshotFormat})\n\n`;
    }
    
    entry += markdown?.trim() || '';
    
    if (clipImages && clipImages.length > 0) {
      clipImages.forEach((img, i) => {
        if (img.fullDataUrl) {
          entry += `\n\n![${img.alt || 'Image'}](attachments/${img.filename})`;
        }
      });
    }
    
    if (links && links.length > 0) {
      entry += '\n\n### Links Found\n\n';
      links.slice(0, 20).forEach(link => {
        entry += `- [${link.text || 'Link'}](${link.href})\n`;
      });
      if (links.length > 20) {
        entry += `\n*...and ${links.length - 20} more links*\n`;
      }
    }
    
    return entry;
  },

  parseClips(content) {
    
    if (!content || typeof content !== 'string') {
      console.warn('[ContentFormat] parseClips() - Invalid content provided');
      return [];
    }
    
    const clips = [];
    const sections = content.split(this.CLIP_SEPARATOR).filter(s => s.trim());
    
    sections.forEach((section, idx) => {
      
      if (this.isHeaderSection(section)) {
        return;
      }
      
      const clip = this.parseSingleClip(section, idx);
      if (clip) {
        clips.push(clip);
      } else {
        console.warn('[ContentFormat] parseClips() - Section', idx, 'failed to parse');
      }
    });
    
    return clips;
  },

  parseSingleClip(section, index) {
    
    const lines = section.trim().split('\n');
    if (lines.length === 0) {
      return null;
    }
    
    const clipIdMatch = section.match(this.PATTERNS.clipId);
    const clipId = clipIdMatch ? clipIdMatch[1] : `clip-${index}`;
    
    const titleMatch = section.match(/^##\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    
    const headerMatch = section.match(this.PATTERNS.header);
    let timestamp = '';
    let url = '';
    
    if (headerMatch) {
      timestamp = headerMatch[2];
      url = headerMatch[3];
    } else {
    }
    
    const snippetIdMatch = section.match(this.PATTERNS.snippetId);
    const snippetId = snippetIdMatch ? snippetIdMatch[1] : null;
    
    const fullText = this.extractContentText(section);
    
    const hasScreenshot = this.PATTERNS.screenshot.test(section);
    
    const result = {
      id: clipId,
      index,
      title,
      url,
      captured: timestamp,
      snippetId,
      preview: this.truncateText(fullText, 300),
      fullText,
      hasScreenshot,
      hasImages: false
    };
    
    return result;
  },

  isHeaderSection(section) {
    const trimmed = section.trim();
    const isHeader = /^#\s+[^#]/.test(trimmed) || 
           (trimmed.includes('# NoteStash') && !trimmed.includes('## '));
    if (isHeader) {
    }
    return isHeader;
  },

  extractContentText(section) {
    let lines = section.split('\n');
    let contentStarted = false;
    let contentLines = [];
    
    for (const line of lines) {
      if (!contentStarted) {
        if (line.match(/^<!--\s*clip-id:/)) continue;
        if (line.match(/^##\s+/)) continue;
        if (line.match(/^\[[^\]]+\]\([^)]+\)$/)) continue;
        if (line.match(/^\*\*Snippet-ID:\*\*/)) continue;
        if (line.trim() === '') continue;
        
        contentStarted = true;
      }
      
      if (line.match(/!\[Screenshot[^\]]*\]\(attachments\/screenshot-/)) continue;
      if (line.match(/^### Links Found$/)) break;
      
      contentLines.push(line);
    }
    
    return contentLines.join('\n').trim();
  },

  buildSessionHeader(name) {
    return `# ${name || 'NoteStash'}\n\nStashed pages collection.`;
  },

  sanitizeTitle(title) {
    if (!title) return 'Untitled';
    return title
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  truncateText(text, maxLength = 300) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  },

  countClips(content) {
    if (!content) return 0;
    return this.parseClips(content).length;
  },

  validateContent(content) {
    const errors = [];
    
    if (!content) {
      errors.push('Content is empty');
      return { valid: false, errors };
    }
    
    if (!content.includes('## ')) {
      errors.push('No clip headers (## ) found');
    }
    
    const clips = this.parseClips(content);
    if (clips.length === 0) {
      errors.push('No valid clips parsed from content');
    }
    
    const result = { valid: errors.length === 0, errors, clipCount: clips.length };
    return result;
  }
};

export default CONTENT_FORMAT;

export const { 
  CLIP_SEPARATOR, 
  PATTERNS, 
  buildClipEntry, 
  parseClips, 
  parseSingleClip,
  buildSessionHeader,
  validateContent
} = CONTENT_FORMAT;

console.log('[ContentFormat] Module loaded');
