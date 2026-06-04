/**
 * Download Export Module - Export notes to files
 * 
 * Supports:
 * - Session export as .md / .txt / .json
 * - Full ZIP export with attachments/ folder (screenshots + images)
 * - Cleaned ZIP export (only referenced images)
 * - Cleaned .md export (plain markdown)
 * 
 * @module content/modules/features/download-export
 * @version 2.0.0
 */

export const createDownloadExport = ({ bridge, eventBus, chromeApi, config, state, utils, sessionManager }) => {
  const logger = utils?.nsLog || console.log;

  /**
   * Helper to prepend default save location to filename
   */
  function getFullPath(filename) {
    const saveLocation = config?.get?.('defaultSaveLocation') || '';
    if (!saveLocation) return filename;
    return `${saveLocation.replace(/\/+$/, '')}/${filename}`;
  }

  /**
   * Export a session as simple file (.md / .txt / .json)
   * @param {string} sessionId - Session ID
   * @param {string} format - 'md', 'txt', or 'json'
   */
  async function exportSession(sessionId, format = 'md') {
    const session = sessionId 
      ? await findSession(sessionId) 
      : await sessionManager?.getCurrentSession?.();

    if (!session) throw new Error('Session not found');

    const prefix = config?.get('prefix') || 'NoteStash';
    const date = new Date().toISOString().split('T')[0];
    const safeName = (session.name || 'export').replace(/[^\w\-]/g, '_');
    const filename = `${prefix}-${safeName}-${date}.${format}`;

    let content = session.content;
    let blob;

    if (format === 'md') {
      blob = new Blob([content], { type: 'text/markdown' });
    } else if (format === 'txt') {
      blob = new Blob([content], { type: 'text/plain' });
    } else if (format === 'json') {
      blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    }

    const fullPath = getFullPath(filename);
    await downloadBlob(blob, fullPath);
    eventBus?.emit('export:session-downloaded', { sessionId: session.id, filename: fullPath, format });
    return fullPath;
  }

  /**
   * Export session as ZIP with all attachments
   * Uses JSZip (expected as global from extension)
   * @param {string} sessionId - Optional session ID (uses current if not provided)
   */
  async function exportSessionZip(sessionId) {
    const session = sessionId 
      ? await findSession(sessionId) 
      : await sessionManager?.getCurrentSession?.();

    if (!session) throw new Error('Session not found');
    if (!session.content || !session.clipCount) throw new Error('No clips');

    const prefix = config?.get('prefix') || 'NoteStash';
    const date = new Date().toISOString().split('T')[0];
    const safeName = (session.name || 'export').replace(/[^\w\-]/g, '_');
    const baseFilename = `${prefix}-${safeName}-${date}`;

    if (typeof JSZip === 'undefined') {
      logger('[DownloadExport] JSZip not available, falling back to .md export');
      return exportSession(session.id, 'md');
    }

    const zip = new JSZip();
    let content = session.content;

    const attachmentsFolder = zip.folder('attachments');

    if (session.screenshots && Object.keys(session.screenshots).length > 0) {
      for (const [name, screenshotData] of Object.entries(session.screenshots)) {
        const dataUrl = typeof screenshotData === 'string' ? screenshotData : screenshotData?.dataUrl;
        if (dataUrl && typeof dataUrl === 'string') {
          const base64Data = dataUrl.split(',')[1];
          const ext = dataUrl.includes('image/jpeg') ? 'jpg' : 'png';
          attachmentsFolder.file(`${name}.${ext}`, base64Data, { base64: true });
        }
      }
    }

    const imageReferences = [];
    if (session.images) {
      const images = Array.isArray(session.images) ? session.images : Object.values(session.images);
      for (const img of images) {
        const dataUrl = img.fullDataUrl || img.dataUrl;
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          attachmentsFolder.file(img.filename, base64Data, { base64: true });

          const description = img.alt || img.filename.replace(/\.[^/.]+$/, '');
        }
      }
    }

    zip.file(`${baseFilename}.md`, content);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const filename = `${baseFilename}.zip`;
    const fullPath = getFullPath(filename);

    try {
      if (chromeApi?.downloads?.download) {
        await chromeApi.downloads.download({
          url: zipUrl,
          filename: fullPath,
          saveAs: true
        });
      } else {
        await chromeApi?.sendMessage?.({ action: 'downloadZip', url: zipUrl, filename: fullPath });
      }
    } catch (err) {
      await downloadBlob(zipBlob, fullPath);
    }

    setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);

    logger('[DownloadExport] Cleaned ZIP exported:', baseFilename);
    return fullPath;
  }

  /**
   * Export cleaned content as ZIP with ONLY referenced images
   * @param {string} cleanedContent - AI-cleaned content
   * @param {Object} session - Session object
   */
  async function exportCleanedZip(cleanedContent, session) {
    if (!cleanedContent) throw new Error('No content');
    if (!session) session = await sessionManager?.getCurrentSession?.();
    if (!session) throw new Error('Session not found');

    const prefix = config?.get('prefix') || 'NoteStash';
    const date = new Date().toISOString().split('T')[0];
    const safeName = (session.name || 'export').replace(/[^\w\-]/g, '_');
    const baseFilename = `${prefix}-${safeName}-Cleaned-${date}`;
    const filename = `${baseFilename}.zip`;

    if (typeof JSZip === 'undefined') return exportCleanedMd(cleanedContent, session);

    const zip = new JSZip();
    const attachmentsFolder = zip.folder('attachments');
    
    const usedImageKeys = getReferencedImages(cleanedContent, session.images);
    const sessionImages = session.images || {};

    usedImageKeys.forEach(key => {
      const img = sessionImages[key];
      if (img && img.filename) {
        const dataUrl = img.fullDataUrl || img.dataUrl;
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          attachmentsFolder.file(img.filename, base64Data, { base64: true });
        }
      }
    });

    zip.file(`${baseFilename}.md`, cleanedContent);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const fullPath = getFullPath(filename);

    try {
      if (chromeApi?.downloads?.download) {
        await chromeApi.downloads.download({ url: zipUrl, filename: fullPath, saveAs: true });
      } else {
        await chromeApi?.sendMessage?.({ action: 'downloadZip', url: zipUrl, filename: fullPath });
      }
    } catch (err) {
      await downloadBlob(zipBlob, fullPath);
    }

    setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);
    return fullPath;
  }

  /**
   * Export cleaned content as plain .md file
   */
  async function exportCleanedMd(cleanedContent, session) {
    if (!cleanedContent) {
      throw new Error('No cleaned content to download');
    }

    if (!session) {
      session = await sessionManager?.getCurrentSession?.();
    }

    const prefix = config?.get('prefix') || 'NoteStash';
    const date = new Date().toISOString().split('T')[0];
    const safeName = (session?.name || 'export').replace(/[^\w\-]/g, '_');
    const filename = `${prefix}-${safeName}-Cleaned-${date}.md`;

    const cleanedMarkdown = `# ${session?.name || 'Notes'} - Cleaned Notes\n\nGenerated: ${new Date().toLocaleString('de-DE')}\n\n---\n\n${cleanedContent}`;
    const blob = new Blob([cleanedMarkdown], { type: 'text/markdown' });
    const fullPath = getFullPath(filename);

    await downloadBlob(blob, fullPath);

    logger('[DownloadExport] Cleaned .md exported:', fullPath);
    return fullPath;
  }

  /**
   * Simple download shortcut for current session
   */
  async function download() {
    try {
      const filename = await exportSessionZip();
      return filename;
    } catch (err) {
      logger('[DownloadExport] Download failed:', err);
      try {
        return await exportSession(null, 'md');
      } catch (err2) {
        logger('[DownloadExport] Fallback download also failed:', err2);
        throw err2;
      }
    }
  }

  /**
   * Get images referenced in content
   * @param {string} content - Markdown content
   * @param {Object} sessionImages - Session images
   * @returns {Set<string>} Set of image keys
   */
  function getReferencedImages(content, sessionImages) {
    const usedImages = new Set();
    const imageRegex = /!\[([^\]]*)\]\(attachments\/([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      const filename = match[2];
      for (const [key, imgData] of Object.entries(sessionImages || {})) {
        if (imgData.filename === filename) {
          usedImages.add(key);
          break;
        }
      }
    }

    return usedImages;
  }

  /**
   * Download a blob with chrome API fallback
   */
  async function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);

    if (chromeApi?.downloads?.download) {
      try {
        await chromeApi.downloads.download({ url, filename, saveAs: true });
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return;
      } catch (err) {
        logger('[DownloadExport] Chrome download failed, trying fallback:', err);
      }
    }

    try {
      await chromeApi?.sendMessage?.({ action: 'downloadZip', url, filename });
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    } catch (err) {
      logger('[DownloadExport] Background download failed, trying anchor:', err);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /**
   * Find session by ID
   */
  async function findSession(sessionId) {
    const sessions = await sessionManager?.getAllSessions?.();
    return sessions?.find(s => s.id === sessionId);
  }

  async function init() {
    logger('[NoteStash] Download Export module initialized (ZIP + Cleaned)');
    return true;
  }

  return {
    init,
    download,
    exportSession,
    exportSessionZip,
    exportCleanedZip,
    exportCleanedMd,
    getReferencedImages,
    downloadBlob
  };
};
