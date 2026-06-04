import CONTENT_FORMAT from '../content/content-format.mjs';

export const createSessionDataProcessor = ({ bridge, eventBus, chromeApi, config, state, utils }) => {
  const logger = utils?.nsLog || console.log;

  function createSessionData(session) {
    console.log('[SessionDataProcessor] createSessionData() called');
    console.log('[SessionDataProcessor] createSessionData() - Session ID:', session?.id);
    console.log('[SessionDataProcessor] createSessionData() - Session name:', session?.name);
    
    if (!session) {
      console.warn('[SessionDataProcessor] createSessionData() - No session provided');
      return {
        allImages: [],
        imagesByClipId: {},
        screenshots: {},
        cachedHtml: {}
      };
    }

    const allImages = Array.isArray(session.images) ? session.images : Object.values(session.images || {});
    const imagesByClipId = {};
    const screenshots = {};

    console.log('[SessionDataProcessor] createSessionData() - Total images:', allImages.length);
    console.log('[SessionDataProcessor] createSessionData() - Screenshots count:', Object.keys(session.screenshots || {}).length);
    console.log('[SessionDataProcessor] createSessionData() - CachedHtml count:', Object.keys(session.cachedHtml || {}).length);

    allImages.forEach(img => {
      if (img.clipId) {
        if (!imagesByClipId[img.clipId]) {
          imagesByClipId[img.clipId] = [];
        }
        imagesByClipId[img.clipId].push(img);
      }
      
      if (img.isScreenshot) {
        screenshots[img.timestamp] = img;
      }
    });

    const result = {
      allImages,
      imagesByClipId,
      screenshots,
      cachedHtml: session.cachedHtml || {}
    };
    
    console.log('[SessionDataProcessor] createSessionData() - Complete');
    return result;
  }

  function findImageByFilename(allImages, filename) {
    console.log('[SessionDataProcessor] findImageByFilename() - Looking for:', filename);
    if (!allImages || !filename) {
      console.log('[SessionDataProcessor] findImageByFilename() - Invalid params');
      return null;
    }
    const result = allImages.find(img => img.filename === filename) || null;
    console.log('[SessionDataProcessor] findImageByFilename() - Found:', !!result);
    return result;
  }

  function getImagesForClip(sessionData, clipId) {
    console.log('[SessionDataProcessor] getImagesForClip() - clipId:', clipId);
    const result = sessionData?.imagesByClipId?.[clipId] || [];
    console.log('[SessionDataProcessor] getImagesForClip() - Found', result.length, 'images');
    return result;
  }

  function hasScreenshot(sessionData, clipId) {
    console.log('[SessionDataProcessor] hasScreenshot() - clipId:', clipId);
    const result = Object.values(sessionData?.screenshots || {}).some(sc => 
      sc.clipId === clipId || sc.clipId?.toString() === clipId?.toString()
    );
    console.log('[SessionDataProcessor] hasScreenshot() - Result:', result);
    return result;
  }

  function getScreenshotForClip(sessionData, clipId) {
    console.log('[SessionDataProcessor] getScreenshotForClip() - clipId:', clipId);
    const result = Object.values(sessionData?.screenshots || {}).find(sc => 
      sc.clipId === clipId || sc.clipId?.toString() === clipId?.toString()
    ) || null;
    console.log('[SessionDataProcessor] getScreenshotForClip() - Found:', !!result);
    return result;
  }

  function calculateStats(session) {
    console.log('[SessionDataProcessor] calculateStats() called');
    const clips = parseClips(session?.content || '');
    const images = session?.images || [];
    
    const stats = {
      clipCount: clips.length,
      imageCount: images.length,
      screenshotCount: images.filter(img => img.isScreenshot).length,
      totalSize: estimateSize(session)
    };
    console.log('[SessionDataProcessor] calculateStats() - Stats:', stats);
    return stats;
  }

  function parseClips(content) {
    console.log('[SessionDataProcessor] === parseClips() START ===');
    console.log('[SessionDataProcessor] parseClips() - Content type:', typeof content);
    console.log('[SessionDataProcessor] parseClips() - Content length:', content?.length || 0);
    console.log('[SessionDataProcessor] parseClips() - Content preview:', content?.substring(0, 500));
    
    if (!content) {
      console.warn('[SessionDataProcessor] parseClips() - No content to parse');
      return [];
    }
    
    console.log('[SessionDataProcessor] parseClips() - Calling CONTENT_FORMAT.parseClips()...');
    const clips = CONTENT_FORMAT.parseClips(content);
    
    console.log('[SessionDataProcessor] parseClips() - Parsed', clips.length, 'clips');
    if (clips.length > 0) {
      console.log('[SessionDataProcessor] parseClips() - First clip ID:', clips[0].id);
      console.log('[SessionDataProcessor] parseClips() - First clip title:', clips[0].title);
    }
    
    const enrichedClips = clips.map(clip => ({
      ...clip,
      hasImages: false,
      hasScreenshot: clip.hasScreenshot || false
    }));
    
    console.log('[SessionDataProcessor] === parseClips() END - Returning', enrichedClips.length, 'clips ===');
    return enrichedClips;
  }

  function estimateSize(session) {
    console.log('[SessionDataProcessor] estimateSize() called');
    if (!session) {
      console.log('[SessionDataProcessor] estimateSize() - No session, returning 0');
      return 0;
    }
    
    let size = 0;
    size += new Blob([session.content || '']).size;
    
    (session.images || []).forEach(img => {
      if (img.dataUrl) {
        size += img.dataUrl.length * 0.75;
      }
    });
    
    const result = Math.round(size);
    console.log('[SessionDataProcessor] estimateSize() - Estimated:', result, 'bytes');
    return result;
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function init() {
    console.log('[SessionDataProcessor] init() called');
    eventBus?.emit('module:initialized', { module: 'sessionDataProcessor' });
  }

  function destroy() {
    console.log('[SessionDataProcessor] destroy() called');
  }

  console.log('[SessionDataProcessor] Module factory created');
  return {
    init,
    createSessionData,
    findImageByFilename,
    getImagesForClip,
    hasScreenshot,
    getScreenshotForClip,
    calculateStats,
    parseClips,
    estimateSize,
    formatSize,
    destroy
  };
};
